import { monaco, pathForUri } from './monacoSetup'
import { applyRename, buildSymbols, findRenameTarget, isValidIdentifier, type RenameTarget } from '../java/symbols'
import { currentJavaFiles } from '../ide/liveCheck'
import { useIde, fileName, parentOf } from '../ide/store'
import { showEditorHint } from './hint'

/**
 * IntelliJ's in-place Rename (Shift+F6): every occurrence in the editor is boxed and edited together
 * (multi-cursor), Enter applies the rename to the rest of the project (and renames the file of a public
 * class), Escape restores the old name. Moving the caret out of the boxes also applies it.
 */

interface Session {
  model: monaco.editor.ITextModel
  path: string
  target: RenameTarget
  files: Record<string, string>
  primary: string
  ids: string[]
  restoreQuickSuggestions: monaco.editor.IEditorOptions['quickSuggestions']
}

let session: Session | null = null

export function installInplaceRename(ed: monaco.editor.IStandaloneCodeEditor) {
  const active = ed.createContextKey<boolean>('ijInplaceRename', false)

  const finish = (commit: boolean) => {
    const s = session
    if (!s) return
    session = null
    active.set(false)
    ed.updateOptions({ quickSuggestions: s.restoreQuickSuggestions })
    const range = s.model.getDecorationRange(s.primary)
    const newName = range ? s.model.getValueInRange(range) : s.target.name
    const ranges = s.ids.map((id) => s.model.getDecorationRange(id)).filter((r): r is monaco.Range => !!r)
    s.model.deltaDecorations(s.ids, [])
    const revert = () => {
      if (newName === s.target.name) return
      s.model.pushEditOperations([], ranges.map((r) => ({ range: r, text: s.target.name })), () => null)
    }
    if (!commit) return revert()
    if (newName === s.target.name) return
    if (!isValidIdentifier(newName)) {
      revert()
      return showEditorHint(ed, `'${newName}' is not a valid identifier`, 'error')
    }
    const ide = useIde.getState()
    const others: RenameTarget = { ...s.target, occurrences: s.target.occurrences.filter((o) => o.path !== s.path) }
    const result = applyRename(s.files, others, newName)
    if (result.moved && result.moved.from !== result.moved.to && result.moved.to in ide.files) {
      revert()
      return showEditorHint(ed, `Class '${newName}' already exists`, 'error')
    }
    ide.writeFile(s.path, s.model.getValue())
    for (const [p, content] of Object.entries(result.files)) if (p !== s.path && content !== s.files[p]) ide.writeFile(p, content)
    if (result.moved && result.moved.from !== result.moved.to) {
      const pos = ed.getPosition()
      ide.renamePath(result.moved.from, result.moved.to)
      if (result.moved.from === s.path && pos) requestAnimationFrame(() => ed.setPosition(pos))
    }
  }

  const start = () => {
    if (session) return finish(true)
    const model = ed.getModel()
    const pos = ed.getPosition()
    if (!model || !pos) return
    if (model.getLanguageId() !== 'java') return ed.trigger('ij', 'editor.action.changeAll', null)
    const path = pathForUri(model.uri)
    const files = currentJavaFiles()
    const offset = model.getOffsetAt(pos)
    const target = findRenameTarget(files, path, offset)
    if (!target) return showEditorHint(ed, 'Cannot perform refactoring.\nCaret should be positioned at the name of element to be refactored.', 'error')
    const local = target.occurrences.filter((o) => o.path === path)
    if (!local.length) return
    const toRange = (o: { offset: number; length: number }) => {
      const a = model.getPositionAt(o.offset)
      const b = model.getPositionAt(o.offset + o.length)
      return new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column)
    }
    const primaryOcc = local.find((o) => o.offset <= offset && offset <= o.offset + o.length) ?? local[0]
    const ordered = [primaryOcc, ...local.filter((o) => o !== primaryOcc)]
    const ids = model.deltaDecorations(
      [],
      ordered.map((o, i) => ({
        range: toRange(o),
        options: {
          className: i === 0 ? 'ij-rename-primary' : 'ij-rename-other',
          stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
        },
      })),
    )
    session = { model, path, target, files, primary: ids[0], ids, restoreQuickSuggestions: ed.getOption(monaco.editor.EditorOption.quickSuggestions) }
    ed.updateOptions({ quickSuggestions: false })
    active.set(true)
    ed.setSelections(ordered.map((o) => {
      const r = toRange(o)
      return new monaco.Selection(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn)
    }))
  }

  ed.addAction({ id: 'ij.renameElement', label: 'Rename...', keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F6], run: start })
  ed.addCommand(monaco.KeyCode.Enter, () => finish(true), 'ijInplaceRename && !suggestWidgetVisible')
  ed.addCommand(monaco.KeyCode.Escape, () => finish(false), 'ijInplaceRename && !suggestWidgetVisible')

  const subs = [
    ed.onDidChangeCursorPosition((e) => {
      const s = session
      if (!s || e.source === 'api' && e.reason === monaco.editor.CursorChangeReason.NotSet) return
      const ranges = s.ids.map((id) => s.model.getDecorationRange(id))
      const inside = ed.getSelections()?.every((sel) => ranges.some((r) => r && r.startLineNumber === sel.positionLineNumber && r.startColumn <= sel.positionColumn && sel.positionColumn <= r.endColumn))
      if (!inside) finish(true)
    }),
    ed.onDidChangeModel(() => {
      if (session) {
        session.model.deltaDecorations(session.ids, [])
        session = null
        active.set(false)
      }
    }),
    ed.onDidBlurEditorText(() => finish(true)),
  ]
  return () => subs.forEach((d) => d.dispose())
}

/**
 * Renaming a .java file in the Project view renames its top-level class and all references to it,
 * like IntelliJ's Rename Class refactoring.
 */
export function renameJavaFile(oldPath: string, newFileName: string) {
  const ide = useIde.getState()
  const newPath = `${parentOf(oldPath) ? parentOf(oldPath) + '/' : ''}${newFileName}`
  const oldClass = fileName(oldPath).replace(/\.java$/, '')
  const newClass = newFileName.replace(/\.java$/, '')
  const files = currentJavaFiles()
  const src = files[oldPath]
  if (src !== undefined && newFileName.endsWith('.java') && isValidIdentifier(newClass)) {
    const table = buildSymbols(src)
    const cls = table.symbols.find((s) => s.kind === 'class' && s.name === oldClass && s.owner === '')
    if (cls) {
      const target = findRenameTarget(files, oldPath, table.tokens[cls.decl].offset)
      if (target) {
        const { files: next } = applyRename(files, { ...target, renameFile: undefined }, newClass)
        for (const [p, content] of Object.entries(next)) if (content !== files[p]) ide.writeFile(p, content)
      }
    }
  }
  ide.renamePath(oldPath, newPath)
}
