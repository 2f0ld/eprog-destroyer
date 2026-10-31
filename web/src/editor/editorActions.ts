import { monaco } from './monacoSetup'
import { optimizeImports } from '../java/imports'
import { analyze } from '../java/analyzer'
import { currentJavaFiles } from '../ide/liveCheck'
import { showEditorHint } from './hint'
import { quickFixesFor } from '../java/quickfix'
import { useIde } from '../ide/store'
import { pathForUri } from './monacoSetup'

// Alt+Enter: quick fixes for the problems under the caret (problems are decorations, not markers,
// so the provider looks them up in the store instead of using context.markers)
monaco.languages.registerCodeActionProvider('java', {
  provideCodeActions(model, range) {
    const path = pathForUri(model.uri)
    const src = model.getValue()
    const hits = useIde.getState().problems.filter((p) => p.path === path && p.line <= range.endLineNumber && p.endLine >= range.startLineNumber && (p.line !== range.startLineNumber || p.endColumn >= range.startColumn) && (p.endLine !== range.endLineNumber || p.column <= range.endColumn))
    const actions: monaco.languages.CodeAction[] = []
    for (const p of hits) {
      for (const f of quickFixesFor(src, p)) {
        actions.push({
          title: f.title,
          kind: 'quickfix',
          isPreferred: f.isPreferred,
          edit: f.edits.length
            ? {
                edits: f.edits.map((e) => {
                  const a = model.getPositionAt(e.offset)
                  const b = model.getPositionAt(e.offset + e.length)
                  return { resource: model.uri, versionId: model.getVersionId(), textEdit: { range: new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column), text: e.text } }
                }),
              }
            : undefined,
          command: f.command ? { id: f.command, title: f.title } : undefined,
        })
      }
    }
    return { actions, dispose() {} }
  },
})

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
