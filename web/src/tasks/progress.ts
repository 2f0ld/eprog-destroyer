import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CheckOutcome } from './model'

export interface TaskProgress {
  status: 'new' | 'attempted' | 'solved'
  attempts: number
  /** number of graded hints revealed so far */
  hintsShown: number
  solvedAt?: number
  /** hints revealed when the task was first solved */
  hintsAtSolve?: number
  attemptsAtSolve?: number
  peeked?: boolean
  /** which steps passed in the last check */
  steps?: boolean[]
}

export type CheckState = { taskId: string; running: true } | { taskId: string; running: false; outcome: CheckOutcome; at: number; firstSolve: boolean }

interface TasksState {
  progress: Record<string, TaskProgress>
  /** last check (not persisted) */
  check: CheckState | null
  get(id: string): TaskProgress
  revealHint(id: string): void
  markPeeked(id: string): void
  setCheck(c: CheckState | null): void
  record(id: string, solved: boolean, steps: boolean[]): { firstSolve: boolean }
  resetAll(): void
}

const EMPTY: TaskProgress = { status: 'new', attempts: 0, hintsShown: 0 }

export const useTasks = create<TasksState>()(
  persist(
    (set, get) => ({
      progress: {},
      check: null,
      get: (id) => get().progress[id] ?? EMPTY,
      revealHint: (id) => set((s) => ({ progress: { ...s.progress, [id]: { ...(s.progress[id] ?? EMPTY), hintsShown: (s.progress[id]?.hintsShown ?? 0) + 1 } } })),
      markPeeked: (id) => set((s) => ({ progress: { ...s.progress, [id]: { ...(s.progress[id] ?? EMPTY), peeked: true } } })),
      setCheck: (check) => set({ check }),
      record: (id, solved, steps) => {
        const cur = get().progress[id] ?? EMPTY
        const firstSolve = solved && cur.status !== 'solved'
        const next: TaskProgress = {
          ...cur,
          attempts: cur.attempts + 1,
          steps,
          status: solved || cur.status === 'solved' ? 'solved' : 'attempted',
          ...(firstSolve ? { solvedAt: Date.now(), hintsAtSolve: cur.hintsShown, attemptsAtSolve: cur.attempts + 1 } : {}),
        }
        set((s) => ({ progress: { ...s.progress, [id]: next } }))
        return { firstSolve }
      },
      resetAll: () => set({ progress: {}, check: null }),
    }),
    { name: 'eprog-tasks', version: 1, partialize: (s) => ({ progress: s.progress }) },
  ),
)
