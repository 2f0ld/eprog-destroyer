import { monaco } from './monacoSetup'
import { optimizeImports } from '../java/imports'
import { analyze } from '../java/analyzer'
import { currentJavaFiles } from '../ide/liveCheck'
import { showEditorHint } from './hint'

/** Replace `model`'s text with `next`, touching only the changed middle part (keeps caret and undo sane). */
export function applyMinimalEdit(ed: monaco.editor.ICodeEditor, next: string, source = 'ij') {
  const model = ed.getModel()
  if (!model) return false
  const cur = model.getValue()
  if (cur === next) return false
  let s = 0
  while (s < cur.length && s < next.length && cur[s] === next[s]) s++
  let e = 0
  while (e < cur.length - s && e < next.length - s && cur[cur.length - 1 - e] === next[next.length - 1 - e]) e++
  const a = model.getPositionAt(s)
  const b = model.getPositionAt(cur.length - e)
  ed.pushUndoStop()
  ed.executeEdits(source, [{ range: new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column), text: next.slice(s, next.length - e) }])
  ed.pushUndoStop()
  return true
}

/** Code > Optimize Imports (Ctrl+Alt+O). */
export function runOptimizeImports(ed: monaco.editor.ICodeEditor) {
  const model = ed.getModel()
  if (!model || model.getLanguageId() !== 'java') return
  const projectClasses = Object.values(currentJavaFiles()).flatMap((c) => analyze(c).classes.map((k) => k.name))
  const r = optimizeImports(model.getValue(), projectClasses)
  const changed = applyMinimalEdit(ed, r.text, 'optimizeImports')
  if (!changed || (r.removed === 0 && r.added === 0)) return showEditorHint(ed, 'Unused imports not found')
  const parts = [r.removed && `Removed ${r.removed} import${r.removed === 1 ? '' : 's'}`, r.added && `added ${r.added} import${r.added === 1 ? '' : 's'}`].filter(Boolean)
  showEditorHint(ed, parts.length ? parts.join(', ') : 'Imports optimized')
}

export function installEditorActions(ed: monaco.editor.IStandaloneCodeEditor) {
  ed.addAction({
    id: 'ij.optimizeImports',
    label: 'Optimize Imports',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyO],
    run: (e) => runOptimizeImports(e),
  })
}
