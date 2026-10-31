import { buildHarness, evaluate, HARNESS_CLASS, HARNESS_PATH, type CheckOutcome, type Task } from './model'
import { toProblem, type JavacDiagnostic } from '../java/diagnostics'

const CHECK_TIMEOUT_MS = 30_000

/**
 * Check a solution: compile the student's files together with the generated harness and run it
 * through the run protocol (POST /api/run, see web/dev/devRunner.ts — M3 provides the sandboxed one).
 * The Run tool window is not involved; the result is shown in the Task tool window.
 */
export async function runCheck(task: Task, files: Record<string, string>): Promise<CheckOutcome> {
  const nonce = Math.random().toString(36).slice(2, 10)
  const javaFiles = Object.fromEntries(Object.entries(files).filter(([p]) => p.endsWith('.java') && p !== HARNESS_PATH))
  const all = { ...javaFiles, [HARNESS_PATH]: buildHarness(task, nonce) }
  const abort = new AbortController()
  let runId: string | null = null
  const timer = window.setTimeout(() => {
    if (runId) void fetch(`/api/run/${runId}/kill`, { method: 'POST' }).catch(() => {})
    else abort.abort()
  }, CHECK_TIMEOUT_MS)
  let stdout = ''
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: all, mainClass: HARNESS_CLASS }),
      signal: abort.signal,
    })
    if (!res.ok || !res.body) return { kind: 'error', message: `The checker is not available (HTTP ${res.status}).` }
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
        if (!line.trim()) continue
        const ev = JSON.parse(line) as { type: string; id?: string; data?: string; diagnostics?: JavacDiagnostic[]; text?: string; message?: string }
        if (ev.type === 'started') runId = ev.id ?? null
        else if (ev.type === 'stdout') stdout += ev.data ?? ''
        else if (ev.type === 'compile-error') return compileError(ev.diagnostics ?? [], all, ev.text ?? '')
        else if (ev.type === 'error') return { kind: 'error', message: ev.message ?? 'The checker failed.' }
      }
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { kind: 'error', message: 'The check took too long and was stopped.' }
    return { kind: 'error', message: 'The checker could not be reached. Start the dev server with `npm run dev`.' }
  } finally {
    window.clearTimeout(timer)
  }
  return evaluate(task, files, stdout, nonce)
}

function compileError(diags: JavacDiagnostic[], files: Record<string, string>, text: string): CheckOutcome {
  const errors = diags.filter((d) => d.severity === 'error')
  const mine = errors.find((d) => d.file !== HARNESS_PATH)
  if (mine) {
    const p = toProblem(mine, files[mine.file] ?? '')
    return { kind: 'compile-error', message: `${p.message} (${mine.file.replace(/^src\//, '')}:${mine.line})`, file: mine.file, line: mine.line }
  }
  const h = errors[0]
  if (h) {
    // the harness calls something the student's code doesn't have (renamed method, changed parameters, ...)
    const p = toProblem(h, files[HARNESS_PATH] ?? '')
    return { kind: 'compile-error', message: `The tests could not call your code: ${p.message}. Keep the class, method names and parameter types from the task description.` }
  }
  return { kind: 'compile-error', message: text.split('\n')[0] || 'Compilation failed' }
}
