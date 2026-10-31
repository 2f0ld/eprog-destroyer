import { monaco } from './monacoSetup'
import { optimizeImports } from '../java/imports'
import { analyze } from '../java/analyzer'
import { currentJavaFiles } from '../ide/liveCheck'
import { showEditorHint } from './hint'
import { quickFixesFor } from '../java/quickfix'
import { classAt, generateEdits, type FieldInfo, type GenerateKind } from '../java/generate'
import { openDialog } from '../ui/dialogs'
import { openMenu, type MenuItem } from '../ui/Menu'
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

const GENERATE: { kind: GenerateKind; text: string; title: string }[] = [
  { kind: 'constructor', text: 'Constructor', title: 'Choose Fields to Initialize by Constructor' },
  { kind: 'getter', text: 'Getter', title: 'Select Fields to Generate Getters' },
  { kind: 'setter', text: 'Setter', title: 'Select Fields to Generate Setters' },
  { kind: 'getterAndSetter', text: 'Getter and Setter', title: 'Select Fields to Generate Getters and Setters' },
  { kind: 'equalsHashCode', text: 'equals() and hashCode()', title: 'Choose Fields to Include in equals() and hashCode()' },
  { kind: 'toString', text: 'toString()', title: 'Generate toString()' },
]

/** Code > Generate (Alt+Insert): popup at the caret, then IntelliJ's field chooser. */
export function runGenerate(ed: monaco.editor.ICodeEditor) {
  const model = ed.getModel()
  const pos = ed.getPosition()
  if (!model || !pos || model.getLanguageId() !== 'java') return
  const cls = classAt(model.getValue(), model.getOffsetAt(pos))
  if (!cls) return showEditorHint(ed, 'Caret should be inside a class')
  const coords = ed.getScrolledVisiblePosition(pos)
  const box = ed.getDomNode()!.getBoundingClientRect()
  const choose = (g: (typeof GENERATE)[number]) => {
    const candidates = cls.fields.filter((f) => !f.isStatic && (g.kind !== 'setter' || !f.isFinal))
    const apply = (fields: FieldInfo[]) => {
      const src = model.getValue()
      const edits = generateEdits(src, cls, g.kind, fields)
      ed.pushUndoStop()
      ed.executeEdits('generate', edits.map((e) => {
        const a = model.getPositionAt(e.offset)
        const b = model.getPositionAt(e.offset + e.length)
        return { range: new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column), text: e.text }
      }))
      ed.pushUndoStop()
      ed.focus()
    }
    if (!candidates.length && g.kind !== 'constructor') return showEditorHint(ed, `No fields without ${g.text.toLowerCase()} were found`)
    if (!candidates.length) return apply([])
    openDialog({
      kind: 'choose-members',
      title: g.title,
      items: candidates.map((f) => ({ label: `${f.name}:${f.type}`, icon: 'nodes/field' })),
      onOk: (sel) => apply(sel.map((i) => candidates[i])),
    })
  }
  openMenu({
    x: box.left + (coords?.left ?? 0),
    y: box.top + (coords?.top ?? 0) + (coords?.height ?? 20),
    title: 'Generate',
    items: [
      ...GENERATE.map((g): MenuItem => ({ type: 'item', text: g.text, run: () => choose(g) })),
      { type: 'item', text: 'Override Methods...', shortcut: 'Ctrl+O', disabled: true, run: () => {} },
      { type: 'item', text: 'Delegate Methods...', disabled: true, run: () => {} },
    ],
  })
}

export function installEditorActions(ed: monaco.editor.IStandaloneCodeEditor) {
  ed.addAction({
    id: 'ij.generate',
    label: 'Generate...',
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Insert],
    run: (e) => runGenerate(e),
  })
  ed.addAction({
    id: 'ij.optimizeImports',
    label: 'Optimize Imports',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyO],
    run: (e) => runOptimizeImports(e),
  })
}
