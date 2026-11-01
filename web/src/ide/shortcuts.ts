import { runAction } from './actions'
import { useDialog } from '../ui/dialogs'
import { useMenu } from '../ui/Menu'
import { getActiveEditor } from '../editor/editorRef'

/**
 * Global (IDE-level) shortcuts from IntelliJ's default Windows/Linux keymap.
 * Editor-level shortcuts are Monaco keybindings (editor/monacoSetup.ts).
 *
 * Note: browsers reserve some combos (Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Shift+N, Ctrl+F4,
 * Ctrl+Tab); pages never receive them. See docs/DECISIONS.md.
 */
const GLOBAL: Record<string, string> = {
  'Shift+F10': 'Run',
  'Ctrl+F5': 'Run',
  'Ctrl+Shift+F10': 'RunClass',
  'Ctrl+F2': 'Stop',
  'Shift+F9': 'Debug',
  F9: 'Resume',
  F8: 'StepOver',
  F7: 'StepInto',
  'Shift+F8': 'StepOut',
  'Ctrl+F8': 'ToggleLineBreakpoint',
  'Alt+5': 'ActivateDebugToolWindow',
  'Ctrl+F9': 'BuildProject',
  'Alt+1': 'ActivateProjectToolWindow',
  'Alt+0': 'ActivateCommitToolWindow',
  'Alt+4': 'ActivateRunToolWindow',
  'Alt+6': 'ActivateProblemsViewToolWindow',
  'Alt+7': 'ActivateStructureToolWindow',
  'Alt+F12': 'ActivateTerminalToolWindow',
  'Shift+Escape': 'HideActiveWindow',
  'Ctrl+Shift+F12': 'HideAllWindows',
  'Ctrl+E': 'RecentFiles',
  'Ctrl+Shift+A': 'GotoAction',
  'Ctrl+N': 'GotoClass',
  'Ctrl+Shift+N': 'GotoFile',
  'Alt+F1': 'SelectInProjectView',
  'Ctrl+Alt+S': 'ShowSettings',
  'Ctrl+S': 'SaveAll',
  'Ctrl+F4': 'CloseContent',
  'Alt+ArrowLeft': 'PreviousTab',
  'Alt+ArrowRight': 'NextTab',
}

/** Browser defaults we suppress so a stray keypress doesn't print/reload/bookmark. */
const SUPPRESS = new Set(['Ctrl+R', 'Ctrl+P', 'Ctrl+D', 'Ctrl+G', 'Ctrl+B', 'Ctrl+F', 'Ctrl+J', 'Ctrl+K', 'Ctrl+H', 'Ctrl+U', 'Ctrl+O', 'Ctrl+Shift+O', 'Ctrl+Shift+B', 'F3', 'F7', 'Ctrl+Shift+Delete'])

export function comboOf(e: KeyboardEvent) {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  let k = e.key
  if (k.length === 1) k = k.toUpperCase()
  if (/^Digit\d$/.test(e.code)) k = e.code.slice(5) // Alt+1 on keyboards where key differs
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) parts.push(k)
  return parts.join('+')
}

export function installGlobalShortcuts() {
  // double Shift: two Shift taps within 400ms with no other key in between or while held
  let lastShiftUp = 0
  let shiftClean = false

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      if (!e.repeat) shiftClean = true
    } else {
      shiftClean = false
      lastShiftUp = 0
    }
    if (useDialog.getState().dialog || useMenu.getState().menu) return // popups handle their own keys
    const combo = comboOf(e)
    const action = GLOBAL[combo]
    if (action) {
      e.preventDefault()
      e.stopPropagation()
      runAction(action)
      return
    }
    if (combo === 'Escape') {
      // Escape in a tool window returns focus to the editor
      const t = e.target as HTMLElement
      if (!t.closest('.monaco-editor')) getActiveEditor()?.focus()
      return
    }
    if (SUPPRESS.has(combo) && !(e.target as HTMLElement).closest('.monaco-editor')) e.preventDefault()
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== 'Shift') return
    if (!shiftClean) return
    shiftClean = false
    const now = performance.now()
    if (now - lastShiftUp < 400) {
      lastShiftUp = 0
      if (!useDialog.getState().dialog) runAction('SearchEverywhere')
    } else lastShiftUp = now
  }

  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  return () => {
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
  }
}
