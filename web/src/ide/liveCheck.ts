import { useIde } from './store'
import { collectProblems, type JavacDiagnostic } from '../java/diagnostics'
import { monaco, pathForUri } from '../editor/monacoSetup'

/**
 * On-the-fly error highlighting, like IntelliJ's daemon: shortly after the user stops typing,
 * the whole project is compiled in the background (POST /api/compile, no execution) and the
 * diagnostics replace the current problems. Unused-symbol inspections run locally and keep
 * working when no compiler is reachable (e.g. a static build without the runner).
 */

const DELAY_MS = 350 // IntelliJ's daemon reacts ~300 ms after the last keystroke

let timer: number | undefined
let generation = 0
let inflight: AbortController | null = null
let compilerAvailable = true

/** Current project sources: store files overlaid with (possibly newer) editor models. */
export function currentJavaFiles(): Record<string, string> {
  const files: Record<string, string> = {}
  for (const [p, c] of Object.entries(useIde.getState().files)) if (p.endsWith('.java')) files[p] = c
  for (const m of monaco.editor.getModels()) {
    if (m.uri.scheme !== 'file' || m.isDisposed()) continue
    const p = pathForUri(m.uri)
    if (p in files) files[p] = m.getValue()
  }
  return files
}

export function scheduleCheck(delay = DELAY_MS) {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void checkNow(), delay)
}

export async function checkNow() {
  const gen = ++generation
  inflight?.abort()
  const abort = new AbortController()
  inflight = abort
  const files = currentJavaFiles()
  // local inspections first, so greying shows up even while javac runs
  const keepCompiler = useIde.getState().problems.filter((p) => p.highlight !== 'unused' && files[p.path] !== undefined)
  useIde.getState().setProblems([...keepCompiler, ...collectProblems([], files)])

  let diagnostics: JavacDiagnostic[] = []
  if (compilerAvailable && Object.keys(files).length) {
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
        signal: abort.signal,
      })
      if (res.status === 404) compilerAvailable = false
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      diagnostics = ((await res.json()) as { diagnostics: JavacDiagnostic[] }).diagnostics
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  if (gen !== generation) return
  inflight = null
  // the sources may have changed while javac ran; only apply if they are still current
  const now = currentJavaFiles()
  if (Object.keys(files).some((p) => now[p] !== files[p]) || Object.keys(now).length !== Object.keys(files).length) return
  useIde.getState().setProblems(collectProblems(diagnostics, files))
}

/** Problems for a compile-error event from the run protocol (same translation as live checks). */
export function problemsFromRun(diags: JavacDiagnostic[]) {
  const files = currentJavaFiles()
  useIde.getState().setProblems(collectProblems(diags, files))
}

/** Start checking: on load, and whenever files are created, deleted or renamed. */
export function installLiveCheck() {
  scheduleCheck(50)
  return useIde.subscribe((s, prev) => {
    if (s.files === prev.files) return
    const a = Object.keys(s.files)
    const b = Object.keys(prev.files)
    if (a.length !== b.length || a.some((p) => !(p in prev.files))) scheduleCheck()
  })
}
