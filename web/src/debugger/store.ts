import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConsoleLine } from '../ide/store'
import type { DebugFrame, DebugVariable } from './protocol'
import { toggleLine } from './inline'
import { syncedStorage } from '../account/serverStorage'

export interface DebugSessionState {
  /** runner process id, known after the `started` event */
  id: string | null
  mainClass: string
  state: 'compiling' | 'running' | 'paused' | 'finished'
  thread: string
  frames: DebugFrame[]
  selectedFrame: number
  /** variables of the selected frame */
  variables: DebugVariable[]
  /** values of the previous pause (top frame), to highlight changed values like IntelliJ */
  previous: Record<string, string>
  exitCode: number | null
}

interface DebuggerState {
  /** projectId -> file -> breakpoint lines (1-based), persisted */
  breakpoints: Record<string, Record<string, number[]>>
  /** 'file:line' -> status reported by the running session */
  bpStatus: Record<string, 'verified' | 'invalid'>
  session: DebugSessionState | null
  console: ConsoleLine[]
  tab: 'variables' | 'console'
  /** Mute Breakpoints: the session runs without stopping */
  muted: boolean
  /** selected row of the Variables tree (path of names) */
  selectedVariable: string | null
  toggleBreakpoint(projectId: string, file: string, line: number): void
  setFileBreakpoints(projectId: string, file: string, lines: number[]): void
  appendConsole(line: ConsoleLine): void
  update(p: Partial<DebugSessionState>): void
}

export const useDebugger = create<DebuggerState>()(
  persist(
    (set) => ({
      breakpoints: {},
      bpStatus: {},
      session: null,
      console: [],
      tab: 'console',
      muted: false,
      selectedVariable: null,
      toggleBreakpoint: (projectId, file, line) =>
        set((s) => {
          const project = s.breakpoints[projectId] ?? {}
          return { breakpoints: { ...s.breakpoints, [projectId]: { ...project, [file]: toggleLine(project[file] ?? [], line) } } }
        }),
      setFileBreakpoints: (projectId, file, lines) =>
        set((s) => {
          const project = { ...(s.breakpoints[projectId] ?? {}) }
          if (lines.length) project[file] = lines
          else delete project[file]
          return { breakpoints: { ...s.breakpoints, [projectId]: project } }
        }),
      appendConsole: (line) =>
        set((s) => {
          // same merging as the Run console (ide/store.ts)
          const c = s.console.slice()
          const last = c[c.length - 1]
          if (last && last.type === line.type && !last.text.endsWith('\n') && (line.type === 'stdout' || line.type === 'stderr')) c[c.length - 1] = { ...last, text: last.text + line.text }
          else c.push(line)
          return { console: c.length > 5000 ? c.slice(-5000) : c }
        }),
      update: (p) => set((s) => (s.session ? { session: { ...s.session, ...p } } : s)),
    }),
    { name: 'eprog-debugger', version: 1, storage: syncedStorage, partialize: (s) => ({ breakpoints: s.breakpoints }) },
  ),
)

/** Breakpoints of a project as protocol objects. */
export function breakpointList(projectId: string) {
  if (useDebugger.getState().muted) return []
  const files = useDebugger.getState().breakpoints[projectId] ?? {}
  return Object.entries(files).flatMap(([file, lines]) => lines.map((line) => ({ file, line })))
}

export const isDebugging = () => {
  const s = useDebugger.getState().session
  return s !== null && s.state !== 'finished'
}
