import { useIde } from './store'
import { analyze } from '../java/analyzer'

/**
 * Client side of the run protocol (see web/dev/devRunner.ts for the server).
 * Produces console output that mirrors IntelliJ's Run tool window.
 */

const FAKE_JAVA = '/usr/lib/jvm/java-25-openjdk/bin/java'

let current: { id: string | null; abort: AbortController } | null = null

export interface MainClassInfo {
  fqn: string
  path: string
}

/** All classes with a main method in the project. */
export function findMainClasses(files: Record<string, string>): MainClassInfo[] {
  const out: MainClassInfo[] = []
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith('.java')) continue
    const a = analyze(content)
    for (const c of a.classes) if (c.hasMain && c.name) out.push({ fqn: a.packageName ? `${a.packageName}.${c.name}` : c.name, path })
  }
  return out
}

export function mainClassForFile(path: string, content: string): string | null {
  const a = analyze(content)
  const c = a.classes.find((x) => x.hasMain && x.name)
  if (!c) return null
  void path
  return a.packageName ? `${a.packageName}.${c.name}` : c.name
}

export async function runMain(mainClass: string) {
  const ide = useIde.getState()
  if (current) await stopRun()
  ide.clearConsole()
  ide.setRunConfig(mainClass)
  ide.setProblems([])
  if (useIde.getState().bottomTool !== 'run') useIde.setState({ bottomTool: 'run' })
  ide.setRunState('compiling')

  const abort = new AbortController()
  current = { id: null, abort }
  const project = ide.projectName
  const files = Object.fromEntries(Object.entries(ide.files).filter(([p]) => p.endsWith('.java')))

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, mainClass }),
      signal: abort.signal,
    })
    if (!res.ok || !res.body) throw new Error(`Runner unavailable (HTTP ${res.status})`)
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
    let buf = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += value
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl)
        buf = buf.slice(nl + 1)
        if (line.trim()) handleEvent(JSON.parse(line), project, mainClass)
      }
    }
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      useIde.getState().appendConsole({ type: 'stderr', text: `Error: ${(e as Error).message}\n` })
      useIde.getState().notify({ kind: 'error', title: 'Run failed', body: 'The Java runner could not be reached. Start the dev server with `npm run dev`.' })
    }
  } finally {
    if (current?.abort === abort) current = null
    useIde.getState().setRunState('idle')
  }
}

interface RunEvent {
  type: string
  id?: string
  data?: string
  code?: number
  text?: string
  message?: string
  diagnostics?: { file: string; line: number; column: number; severity: 'error' | 'warning'; message: string }[]
}

function handleEvent(ev: RunEvent, project: string, mainClass: string) {
  const ide = useIde.getState()
  switch (ev.type) {
    case 'started':
      if (current) current.id = ev.id ?? null
      ide.setRunState('running')
      ide.appendConsole({
        type: 'system',
        text: `${FAKE_JAVA} -javaagent:/opt/idea/lib/idea_rt.jar=${40000 + Math.floor(Math.random() * 9999)} -Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8 -classpath /home/student/IdeaProjects/${project}/out/production/${project} ${mainClass}\n`,
      })
      break
    case 'stdout':
    case 'stderr':
      ide.appendConsole({ type: ev.type, text: ev.data ?? '' })
      break
    case 'exit':
      ide.appendConsole({ type: 'exit', text: `\nProcess finished with exit code ${ev.code}\n` })
      ide.setExitCode(ev.code ?? 0)
      break
    case 'compile-error': {
      const diags = ev.diagnostics ?? []
      ide.setProblems(diags.map((d) => ({ path: d.file, line: d.line, column: d.column, message: d.message, severity: d.severity })))
      // IntelliJ shows these in the Build tool window; we print them javac-style in the console
      ide.appendConsole({ type: 'stderr', text: diags.length ? '' : (ev.text ?? '') })
      for (const d of diags) {
        ide.appendConsole({ type: 'stderr', text: `${d.file}:${d.line}:${d.column}\njava: ${d.message}\n` })
      }
      ide.appendConsole({ type: 'exit', text: `\nCompilation failed: ${diags.filter((d) => d.severity === 'error').length} error(s)\n` })
      ide.notify({ kind: 'error', title: 'Build failed', body: `${diags.length} problem(s) found` })
      break
    }
    case 'error':
      ide.appendConsole({ type: 'stderr', text: `${ev.message}\n` })
      break
  }
}

export async function sendStdin(text: string) {
  if (!current?.id) return
  useIde.getState().appendConsole({ type: 'stdin', text })
  await fetch(`/api/run/${current.id}/stdin`, { method: 'POST', body: text })
}

export async function stopRun() {
  const c = current
  if (!c) return
  if (c.id) await fetch(`/api/run/${c.id}/kill`, { method: 'POST' }).catch(() => {})
  else c.abort.abort()
}

export function isRunning() {
  return current !== null
}
