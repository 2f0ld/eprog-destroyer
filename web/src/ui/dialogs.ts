import { create } from 'zustand'

/** Which modal dialog / popup is currently open. Only one at a time, like IntelliJ. */
export type Dialog =
  | { kind: 'new-class'; dir: string }
  | { kind: 'new-file'; dir: string }
  | { kind: 'new-dir'; dir: string }
  | { kind: 'rename'; path: string }
  | { kind: 'settings' }
  | { kind: 'about' }
  | { kind: 'recent-files' }
  | { kind: 'search'; tab: 'all' | 'classes' | 'files' | 'symbols' | 'actions' }

export const useDialog = create<{ dialog: Dialog | null }>(() => ({ dialog: null }))

export const openDialog = (dialog: Dialog) => useDialog.setState({ dialog })
export const closeDialog = () => useDialog.setState({ dialog: null })
