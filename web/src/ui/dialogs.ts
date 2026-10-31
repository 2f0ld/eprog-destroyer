import { create } from 'zustand'

/** Which modal dialog / popup is currently open. Only one at a time, like IntelliJ. */
export type Dialog =
  | { kind: 'new-class'; dir: string }
  | { kind: 'new-file'; dir: string }
  | { kind: 'new-dir'; dir: string }
  | { kind: 'rename'; path: string }
  | { kind: 'settings' }
  | { kind: 'about' }
  | { kind: 'peek-solution'; taskId: string }
  | { kind: 'choose-members'; title: string; items: { label: string; icon: string }[]; onOk: (selected: number[]) => void }
  | { kind: 'recent-files' }
  | { kind: 'search'; tab: 'all' | 'classes' | 'files' | 'symbols' | 'actions' }

export const useDialog = create<{ dialog: Dialog | null }>(() => ({ dialog: null }))

export const openDialog = (dialog: Dialog) => useDialog.setState({ dialog })
export const closeDialog = () => useDialog.setState({ dialog: null })
