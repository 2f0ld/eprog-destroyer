import { useIde } from '../ide/store'
import { FAKE_JAVA, stopRun, isRunning } from '../ide/runner'
import { currentJavaFiles, problemsFromRun } from '../ide/liveCheck'
import { revealPosition } from '../ide/navigation'
import type { JavacDiagnostic } from '../java/diagnostics'
import { breakpointList, useDebugger } from './store'
import type { DebugCommand, DebugEvent, DebugVariable } from './protocol'

/**
 * Client side of the debug protocol (server: web/dev/debugSession.ts, documented in web/dev/devRunner.ts).
 * Mirrors IntelliJ's Debug tool window behaviour: Console first, Threads & Variables once paused.
 */

let current: { abort: AbortController; address: string } | null = null
let resumeTimer: number | undefined
let unsubscribeBreakpoints: (() => void) | null = null

export async function startDebug(mainClass: string) {
  const ide = useIde.getState()
  if (current) await stopDebug()
  if (isRunning()) await stopRun()
  ide.setRunConfig(mainClass)
  useDebugger.setState({
    session: { id: null, mainClass, state: 'compiling', thread: 'main', frames: [], selectedFrame: 0, variables: [], previous: {}, exitCode: null },
    console: [],
    bpStatus: {},
    tab: 'console',
  })
  useIde.setState({ bottomTool: 'debug' })

  const abort = new AbortController()
  current = { abort, address: '' }
  const projectId = ide.projectId
  const project = ide.projectName
  try {
    const res = await fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: currentJavaFiles(), mainClass, breakpoints: breakpointList(projectId) }),
      signal: abort.signal,
    })
    if (!res.ok || !res.body) throw new Error(`Runner unavailable (HTTP ${res.status})`)
    // breakpoints toggled during the session are sent to the VM right away, like IntelliJ
    unsubscribeBreakpoints = useDebugger.subscribe((s, prev) => {
      if (s.breakpoints !== prev.breakpoints || s.muted !== prev.muted) void command({ cmd: 'breakpoints', breakpoints: breakpointList(projectId) })
    })
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
      useDebugger.getState().appendConsole({ type: 'stderr', text: `Error: ${(e as Error).message}\n` })
      useIde.getState().notify({ kind: 'error', title: 'Debug failed', body: 'The Java runner could not be reached. Start the dev server with `npm run dev`.' })
    }
  } finally {
    unsubscribeBreakpoints?.()
    unsubscribeBreakpoints = null
    if (current?.abort === abort) current = null
    window.clearTimeout(resumeTimer)
    const s = useDebugger.getState().session
    if (s && s.state !== 'finished') useDebugger.getState().update({ state: 'finished', frames: [], variables: [] })
  }
}

type RunnerEvent = DebugEvent | { type: 'compiling' | 'started' | 'stdout' | 'stderr' | 'exit' | 'compile-error' | 'error'; id?: string; data?: string; code?: number; text?: string; message?: string; diagnostics?: JavacDiagnostic[] }

function handleEvent(ev: RunnerEvent, project: string, mainClass: string) {
  const dbg = useDebugger.getState()
  switch (ev.type) {
    case 'started':
      dbg.update({ id: ev.id ?? null, state: 'running' })
      break
    case 'attached':
      if (current) current.address = ev.address
      dbg.appendConsole({
        type: 'system',
        text: `${FAKE_JAVA} -agentlib:jdwp=transport=dt_socket,address=${ev.address},suspend=y,server=n -javaagent:/opt/idea/plugins/java/lib/rt/debugger-agent.jar -Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8 -classpath /home/student/IdeaProjects/${project}/out/production/${project} ${mainClass}\n`,
      })
      dbg.appendConsole({ type: 'system', text: `Connected to the target VM, address: '${ev.address}', transport: 'socket'\n` })
      break
    case 'stdout':
    case 'stderr':
      dbg.appendConsole({ type: ev.type, text: ev.data ?? '' })
      break
    case 'paused': {
      window.clearTimeout(resumeTimer)
      const prevSession = dbg.session
      const prevFrame = prevSession?.frames[prevSession.selectedFrame]
      const frame = ev.frames[ev.frame]
      const previous = prevFrame && frame && sameMethod(prevFrame, frame) ? valuesOf(prevSession!.variables) : {}
      dbg.update({ state: 'paused', thread: ev.thread, frames: ev.frames, selectedFrame: ev.frame, variables: ev.variables, previous })
      useDebugger.setState({ tab: 'variables' })
      useIde.setState({ bottomTool: 'debug' })
      if (frame?.file) revealPosition(frame.file, frame.line, 1)
      break
    }
    case 'resumed':
      dbg.update({ state: 'running' })
      // a step pauses again within milliseconds; keep frames/variables meanwhile to avoid flicker
      window.clearTimeout(resumeTimer)
      resumeTimer = window.setTimeout(() => {
        if (useDebugger.getState().session?.state === 'running') useDebugger.getState().update({ frames: [], variables: [] })
      }, 300)
      break
    case 'breakpoint':
      useDebugger.setState((s) => ({ bpStatus: { ...s.bpStatus, [`${ev.file}:${ev.line}`]: ev.status } }))
      break
    case 'exit':
      window.clearTimeout(resumeTimer)
      if (current?.address) dbg.appendConsole({ type: 'system', text: `Disconnected from the target VM, address: '${current.address}', transport: 'socket'\n` })
      dbg.appendConsole({ type: 'exit', text: `\nProcess finished with exit code ${ev.code}\n` })
      dbg.update({ state: 'finished', exitCode: ev.code ?? 0, frames: [], variables: [] })
      useDebugger.setState({ tab: 'console' })
      break
    case 'compile-error': {
      const diags = ev.diagnostics ?? []
      problemsFromRun(diags)
      dbg.appendConsole({ type: 'stderr', text: diags.length ? '' : (ev.text ?? '') })
      for (const d of diags) dbg.appendConsole({ type: 'stderr', text: `${d.file}:${d.line}:${d.column}\njava: ${d.message}\n` })
      dbg.appendConsole({ type: 'exit', text: `\nCompilation failed: ${diags.filter((d) => d.severity === 'error').length} error(s)\n` })
      dbg.update({ state: 'finished' })
      useIde.getState().notify({ kind: 'error', title: 'Build failed', body: `${diags.length} problem(s) found` })
      break
    }
    case 'error':
      dbg.appendConsole({ type: 'stderr', text: `${ev.message}\n` })
      break
  }
}

const sameMethod = (a: { method: string; className: string }, b: { method: string; className: string }) => a.method === b.method && a.className === b.className
const valuesOf = (vars: DebugVariable[]) => Object.fromEntries(vars.map((v) => [v.name, `${v.type ?? ''} ${v.value}`]))

/** Send a command to the running session; returns the JSON reply for frame/children. */
export async function command(cmd: DebugCommand): Promise<{ variables?: DebugVariable[] } | null> {
  const id = useDebugger.getState().session?.id
  if (!id) return null
  const res = await fetch(`/api/run/${id}/debug`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) }).catch(() => null)
  if (!res || res.status !== 200) return null
  return res.json()
}

export function isPaused() {
  return useDebugger.getState().session?.state === 'paused'
}

export async function selectFrame(index: number) {
  const s = useDebugger.getState().session
  if (!s || s.state !== 'paused' || !s.frames[index]) return
  useDebugger.getState().update({ selectedFrame: index, previous: {} })
  const f = s.frames[index]
  if (f.file) revealPosition(f.file, f.line, 1)
  const reply = await command({ cmd: 'frame', frame: index })
  if (useDebugger.getState().session?.selectedFrame === index) useDebugger.getState().update({ variables: reply?.variables ?? [] })
}

export async function children(ref: string): Promise<DebugVariable[]> {
  return (await command({ cmd: 'children', ref }))?.variables ?? []
}

export async function sendDebugStdin(text: string) {
  const id = useDebugger.getState().session?.id
  if (!id) return
  useDebugger.getState().appendConsole({ type: 'stdin', text })
  await fetch(`/api/run/${id}/stdin`, { method: 'POST', body: text })
}

export async function stopDebug() {
  const c = current
  if (!c) return
  const id = useDebugger.getState().session?.id
  if (id) await fetch(`/api/run/${id}/kill`, { method: 'POST' }).catch(() => {})
  else c.abort.abort()
}

export function isDebugActive() {
  return current !== null
}
