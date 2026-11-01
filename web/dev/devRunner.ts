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
 *   POST /api/compile          {files}  -> {diagnostics:[...]}   (background error highlighting, no execution)
 *
 * Debugging (see src/debugger/protocol.ts for the types, DECISIONS D19):
 *   POST /api/debug            {files, mainClass, breakpoints:[{file, line}]} -> NDJSON stream with all run events plus
 *        {type:'attached', address}    debugger connected (before the program starts)
 *        {type:'paused', reason:'breakpoint'|'step'|'pause', thread, frames:[{method, className, file, line, startLine}],
 *                        frame, variables:[{name, type?, value, style, icon, ref?, inline}]}   variables of frames[frame]
 *        {type:'resumed'}
 *        {type:'breakpoint', file, line, status:'verified'|'invalid'}
 *   POST /api/run/:id/debug    {cmd:'resume'|'pause'|'stepOver'|'stepInto'|'stepOut'|'stop'} -> 204
 *                              {cmd:'frame', frame:n}                                    -> {variables}
 *                              {cmd:'children', ref}                                     -> {variables}
 *                              {cmd:'breakpoints', breakpoints:[{file, line}]}           -> 204 (live update)
 *   /stdin and /kill work for debug sessions as well.
 *
 * Diagnostics: {file, line, column, severity, message, code?, args?}. `code`/`args` are javac's raw
 * diagnostic key and arguments (e.g. "compiler.err.cant.resolve.location", ["kindname.variable", "y", ...]);
 * the frontend turns them into IntelliJ's wording (src/java/diagnostics.ts) and falls back to `message`.
 */
import type { Plugin } from 'vite'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DebugSession, compiledClasses } from './debugSession.ts'
import type { DebugBreakpoint, DebugCommand } from '../src/debugger/protocol.ts'

const MAX_RUNTIME_MS = 10 * 60 * 1000
const MAX_DEBUG_MS = 30 * 60 * 1000
const JAVA_FLAGS = ['-Dfile.encoding=UTF-8', '-Dsun.stdout.encoding=UTF-8', '-Dsun.stderr.encoding=UTF-8', '-XX:+UseSerialGC', '-Xmx256m']
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024

interface Diagnostic {
  file: string
  line: number
  column: number
  severity: 'error' | 'warning'
  message: string
  code?: string
  args?: string[]
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

/** Split javac's raw diagnostic arguments on top-level commas ("a, (b, c), d" -> ["a", "(b, c)", "d"]). */
export function splitRawArgs(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim() || out.length) out.push(cur.trim())
  return out
}

/** Parse `javac -XDrawDiagnostics` output ("Main.java:3:13: compiler.err.key: arg, arg"). */
export function parseRawJavacOutput(out: string): { line: number; column: number; code: string; args: string[] }[] {
  const res = []
  for (const l of out.split(/\r?\n/)) {
    const m = /^.*?\.java:(\d+):(\d+): (compiler\.(?:err|warn)\.[\w.-]+)(?::\s?(.*))?$/.exec(l)
    if (m) res.push({ line: Number(m[1]), column: Number(m[2]), code: m[3], args: m[4] ? splitRawArgs(m[4]) : [] })
  }
  return res
}

const JAVAC_FLAGS = ['-encoding', 'UTF-8', '-g', '-proc:none', '-Xlint:none']

/**
 * Compile `sources` into `outDir`. javac runs twice in parallel: once normally (human-readable messages,
 * also shown in the console) and once with -XDrawDiagnostics (stable keys for IntelliJ-style messages).
 * Both runs report the same diagnostics in the same order, so they are zipped by index.
 */
async function compile(dir: string, sources: string[], outDir: string): Promise<{ ok: boolean; text: string; diagnostics: Diagnostic[] }> {
  const run = (extra: string[], out: string) =>
    new Promise<{ code: number; out: string }>((resolve) => {
      const p = spawn('javac', [...JAVAC_FLAGS, ...extra, '-d', out, ...sources], { cwd: dir })
      let text = ''
      p.stdout.on('data', (d) => (text += d))
      p.stderr.on('data', (d) => (text += d))
      p.on('error', (e) => resolve({ code: 1, out: String(e) }))
      p.on('close', (c) => resolve({ code: c ?? 1, out: text }))
    })
  await mkdir(outDir, { recursive: true })
  const rawOut = outDir + '-raw'
  await mkdir(rawOut, { recursive: true })
  const [human, raw] = await Promise.all([run([], outDir), run(['-XDrawDiagnostics'], rawOut)])
  const diagnostics = parseJavacOutput(human.out, dir)
  const keys = parseRawJavacOutput(raw.out)
  if (keys.length === diagnostics.length) {
    diagnostics.forEach((d, i) => {
      if (keys[i].line === d.line) Object.assign(d, { code: keys[i].code, args: keys[i].args, column: keys[i].column })
    })
  }
  return { ok: human.code === 0, text: human.out, diagnostics }
}

/** Write the submitted files below `dir` (no path traversal) and return the .java paths. */
async function writeSources(dir: string, files: Record<string, string>) {
  const sources: string[] = []
  for (const [rel, content] of Object.entries(files)) {
    if (!rel.endsWith('.java')) continue
    const target = path.resolve(dir, rel)
    if (!target.startsWith(dir + path.sep)) continue
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
    sources.push(target)
  }
  return sources
}

export function devRunner(): Plugin {
  const procs = new Map<string, ChildProcess>()
  const sessions = new Map<string, DebugSession>()
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
        if (!url.startsWith('/api/run') && !url.startsWith('/api/compile') && url !== '/api/debug') return next()
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
          const debugMatch = /^\/api\/run\/([\w-]+)\/debug$/.exec(url)
          if (debugMatch && req.method === 'POST') {
            const session = sessions.get(debugMatch[1])
            const command = JSON.parse(await readBody(req)) as DebugCommand
            if (!session) {
              res.statusCode = 404
              return res.end()
            }
            const json = (v: object) => {
              res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
              res.end(JSON.stringify(v))
            }
            switch (command.cmd) {
              case 'resume':
                await session.resume()
                break
              case 'pause':
                await session.suspend()
                break
              case 'stepOver':
              case 'stepInto':
              case 'stepOut':
                await session.step(command.cmd)
                break
              case 'stop':
                session.kill()
                break
              case 'frame':
                return json({ variables: await session.frameVariablesAt(command.frame) })
              case 'children':
                return json({ variables: await session.children(command.ref) })
              case 'breakpoints':
                await session.setBreakpoints(command.breakpoints)
                break
            }
            res.statusCode = 204
            return res.end()
          }
          if (url === '/api/compile' && req.method === 'POST') {
            const { files } = JSON.parse(await readBody(req)) as { files: Record<string, string> }
            const dir = path.join(tmpRoot, 'check-' + randomUUID())
            try {
              const sources = await writeSources(dir, files)
              const result = sources.length ? await compile(dir, sources, path.join(dir, 'out')) : { diagnostics: [] }
              res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
              return res.end(JSON.stringify({ diagnostics: result.diagnostics }))
            } finally {
              rm(dir, { recursive: true, force: true }).catch(() => {})
            }
          }
          const debug = url === '/api/debug'
          if ((url !== '/api/run' && !debug) || req.method !== 'POST') return next()

          const { files, mainClass, breakpoints = [] } = JSON.parse(await readBody(req)) as { files: Record<string, string>; mainClass: string; breakpoints?: DebugBreakpoint[] }
          if (!/^[\w.$]+$/.test(mainClass)) throw new Error('invalid main class')
          const id = randomUUID()
          const dir = path.join(tmpRoot, id)
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' })
          const send = (ev: object) => res.write(JSON.stringify(ev) + '\n')

          const sources = await writeSources(dir, files)
          const cleanup = () => rm(dir, { recursive: true, force: true }).catch(() => {})

          send({ type: 'compiling' })
          const outDir = path.join(dir, 'out')
          const result = await compile(dir, sources, outDir)
          if (!result.ok) {
            send({ type: 'compile-error', text: result.text, diagnostics: result.diagnostics })
            res.end()
            return cleanup()
          }

          let bytes = 0
          let java: ChildProcess
          const forward = (type: 'stdout' | 'stderr') => (d: Buffer) => {
            bytes += d.length
            if (bytes > MAX_OUTPUT_BYTES) {
              java.kill('SIGKILL')
              return
            }
            send({ type, data: d.toString('utf8') })
          }
          if (debug) {
            send({ type: 'started', id })
            const session = await DebugSession.start({
              cwd: dir,
              classpath: outDir,
              mainClass,
              javaArgs: JAVA_FLAGS,
              userClasses: await compiledClasses(outDir),
              projectFiles: Object.keys(files),
              breakpoints,
              send,
              onStdout: forward('stdout'),
            })
            java = session.proc
            sessions.set(id, session)
          } else {
            java = spawn('java', [...JAVA_FLAGS, '-cp', outDir, mainClass], { cwd: dir })
            java.stdout!.on('data', forward('stdout'))
            send({ type: 'started', id })
          }
          procs.set(id, java)
          java.stderr!.on('data', forward('stderr'))
          const timer = setTimeout(() => java.kill('SIGKILL'), debug ? MAX_DEBUG_MS : MAX_RUNTIME_MS)
          res.on('close', () => java.kill('SIGKILL'))
          java.on('close', (code, signal) => {
            clearTimeout(timer)
            procs.delete(id)
            sessions.get(id)?.kill()
            sessions.delete(id)
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
