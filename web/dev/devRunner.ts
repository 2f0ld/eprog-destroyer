/**
 * DEV-ONLY Java runner, mounted into the Vite dev server.
 *
 * !!! This executes arbitrary user code on the developer's machine without any
 * !!! sandboxing. It exists so the Run tool window can be built and tested
 * !!! before the real sandboxed execution service (Milestone 3) exists.
 * !!! It is only registered by `vite serve` and must never be deployed.
 *
 * Protocol (kept identical for the future production runner):
 *   POST /api/run              {files: {path: content}, mainClass}  -> NDJSON event stream
 *        events: {type:'compiling'} {type:'compile-error', diagnostics:[...], text}
 *                {type:'started', id} {type:'stdout'|'stderr', data} {type:'exit', code}
 *   POST /api/run/:id/stdin    raw text body, forwarded to the process' stdin
 *   POST /api/run/:id/kill
 */
import type { Plugin } from 'vite'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const MAX_RUNTIME_MS = 10 * 60 * 1000
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024

interface Diagnostic {
  file: string
  line: number
  column: number
  severity: 'error' | 'warning'
  message: string
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (c) => {
      data += c
      if (data.length > 5_000_000) reject(new Error('body too large'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/** Parse javac's default diagnostic output (file:line: error: msg / source line / caret line). */
export function parseJavacOutput(out: string, root: string): Diagnostic[] {
  const lines = out.split(/\r?\n/)
  const diags: Diagnostic[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = /^(.*\.java):(\d+): (error|warning): (.*)$/.exec(lines[i])
    if (!m) continue
    let column = 1
    // the caret line follows the echoed source line
    for (let k = i + 1; k < Math.min(lines.length, i + 4); k++) {
      const caret = /^(\s*)\^\s*$/.exec(lines[k])
      if (caret) {
        column = caret[1].length + 1
        break
      }
    }
    // collect continuation lines ("  symbol:   variable x")
    let message = m[4]
    for (let k = i + 1; k < lines.length && /^\s{2}\S/.test(lines[k]) && !/\^/.test(lines[k]); k++) {
      if (/^\s+(symbol|location|required|found|reason):/.test(lines[k])) message += '\n' + lines[k].trim()
    }
    diags.push({ file: path.relative(root, m[1]).split(path.sep).join('/'), line: Number(m[2]), column, severity: m[3] as 'error' | 'warning', message })
  }
  return diags
}

export function devRunner(): Plugin {
  const procs = new Map<string, ChildProcess>()
  let tmpRoot = ''

  return {
    name: 'eprog-dev-runner',
    apply: 'serve',
    configResolved(cfg) {
      tmpRoot = path.join(cfg.root, '.runner-tmp')
    },
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/run')) return next()
        try {
          const stdinMatch = /^\/api\/run\/([\w-]+)\/(stdin|kill)$/.exec(url)
          if (stdinMatch && req.method === 'POST') {
            const p = procs.get(stdinMatch[1])
            if (!p) {
              res.statusCode = 404
              return res.end()
            }
            if (stdinMatch[2] === 'stdin') {
              const body = await readBody(req)
              p.stdin?.write(body)
            } else {
              p.kill('SIGKILL')
            }
            res.statusCode = 204
            return res.end()
          }
          if (url !== '/api/run' || req.method !== 'POST') return next()

          const { files, mainClass } = JSON.parse(await readBody(req)) as { files: Record<string, string>; mainClass: string }
          if (!/^[\w.$]+$/.test(mainClass)) throw new Error('invalid main class')
          const id = randomUUID()
          const dir = path.join(tmpRoot, id)
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' })
          const send = (ev: object) => res.write(JSON.stringify(ev) + '\n')

          const sources: string[] = []
          for (const [rel, content] of Object.entries(files)) {
            if (!rel.endsWith('.java')) continue
            const target = path.resolve(dir, rel)
            if (!target.startsWith(dir + path.sep)) continue // no path traversal
            await mkdir(path.dirname(target), { recursive: true })
            await writeFile(target, content)
            sources.push(target)
          }
          const cleanup = () => rm(dir, { recursive: true, force: true }).catch(() => {})

          send({ type: 'compiling' })
          const outDir = path.join(dir, 'out')
          await mkdir(outDir, { recursive: true })
          const javac = spawn('javac', ['-encoding', 'UTF-8', '-g', '-d', outDir, ...sources], { cwd: dir })
          let compileOut = ''
          javac.stdout.on('data', (d) => (compileOut += d))
          javac.stderr.on('data', (d) => (compileOut += d))
          const javacCode: number = await new Promise((r) => javac.on('close', (c) => r(c ?? 1)))
          if (javacCode !== 0) {
            send({ type: 'compile-error', text: compileOut, diagnostics: parseJavacOutput(compileOut, dir) })
            res.end()
            return cleanup()
          }

          const java = spawn('java', ['-Dfile.encoding=UTF-8', '-Dsun.stdout.encoding=UTF-8', '-Dsun.stderr.encoding=UTF-8', '-XX:+UseSerialGC', '-Xmx256m', '-cp', outDir, mainClass], { cwd: dir })
          procs.set(id, java)
          send({ type: 'started', id })
          let bytes = 0
          const forward = (type: 'stdout' | 'stderr') => (d: Buffer) => {
            bytes += d.length
            if (bytes > MAX_OUTPUT_BYTES) {
              java.kill('SIGKILL')
              return
            }
            send({ type, data: d.toString('utf8') })
          }
          java.stdout.on('data', forward('stdout'))
          java.stderr.on('data', forward('stderr'))
          const timer = setTimeout(() => java.kill('SIGKILL'), MAX_RUNTIME_MS)
          res.on('close', () => java.kill('SIGKILL'))
          java.on('close', (code, signal) => {
            clearTimeout(timer)
            procs.delete(id)
            send({ type: 'exit', code: code ?? (signal === 'SIGKILL' ? 137 : 130) })
            res.end()
            cleanup()
          })
        } catch (e) {
          if (!res.headersSent) res.statusCode = 400
          res.end(JSON.stringify({ type: 'error', message: String(e) }) + '\n')
        }
      })
    },
  }
}
