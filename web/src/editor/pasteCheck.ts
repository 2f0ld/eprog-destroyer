import { monaco } from './monacoSetup'
import { openDialog, useDialog } from '../ui/dialogs'

/**
 * Tongue-in-cheek "did you use AI?" check: when a code snippet is pasted into the editor that was not
 * copied inside the IDE (editor or task description), we ask. Not a real detector — a nudge.
 */

const internal: string[] = [] // recently copied inside the IDE
const asked = new Set<string>()
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Looks like a chunk of code rather than a word or a number. */
export function looksLikeCode(text: string) {
  const lines = text.split('\n').filter((l) => l.trim()).length
  return (lines >= 3 || text.trim().length >= 80) && /[;{}()=]/.test(text)
}

export function installPasteCheck(ed: monaco.editor.IStandaloneCodeEditor) {
  const remember = (e: ClipboardEvent) => {
    const t = e.clipboardData?.getData('text/plain') || window.getSelection()?.toString() || ''
    if (!t) return
    internal.push(norm(t))
    if (internal.length > 30) internal.shift()
  }
  // bubble phase: Monaco has already put its selection into clipboardData
  window.addEventListener('copy', remember)
  window.addEventListener('cut', remember)
  const sub = ed.onDidPaste((e) => {
    const model = ed.getModel()
    if (!model) return
    const text = model.getValueInRange(e.range)
    const key = norm(text)
    if (!looksLikeCode(text) || asked.has(key)) return
    if (internal.some((c) => c === key || c.includes(key))) return
    asked.add(key)
    if (!useDialog.getState().dialog) window.setTimeout(() => openDialog({ kind: 'ai-check' }), 150)
  })
  return () => {
    sub.dispose()
    window.removeEventListener('copy', remember)
    window.removeEventListener('cut', remember)
  }
}
