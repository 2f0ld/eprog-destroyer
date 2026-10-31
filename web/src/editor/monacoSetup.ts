/**
 * One-time Monaco bootstrap: features, workers, IntelliJ themes, Java support,
 * IntelliJ keymap. Import `monaco` from here, never from 'monaco-editor' directly,
 * so we only bundle what we use.
 */
import * as monaco from 'monaco-editor/editor/editor.api'
import 'monaco-editor/features/register.all'
// register.all only wires *range* semantic tokens; we provide whole-document tokens
import 'monaco-editor/editor/contrib/semanticTokens/browser/documentSemanticTokens'
import 'monaco-editor/languages/definitions/xml/register'
import 'monaco-editor/languages/definitions/markdown/register'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'

import { defineEditorThemes } from '../theme/editorThemes'
import { registerJava } from '../java/language'
import { registerJavaSemanticTokens, analysisFor } from '../java/semantic'
import { registerJavaCompletion } from '../java/completion'
import { formatJava } from '../java/format'
import { analyze, type OutlineClass } from '../java/analyzer'
import { useIde } from '../ide/store'

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
}

defineEditorThemes(monaco)
registerJava(monaco)
registerJavaSemanticTokens(monaco)

// project-wide class index for completion (cheap enough for student-sized projects)
let classCache: { files: Record<string, string>; classes: OutlineClass[] } | null = null
registerJavaCompletion(monaco, {
  classes() {
    const files = useIde.getState().files
    if (classCache?.files !== files) {
      classCache = { files, classes: Object.entries(files).filter(([p]) => p.endsWith('.java')).flatMap(([, c]) => analyze(c).classes) }
    }
    return classCache.classes
  },
})

monaco.languages.registerDocumentFormattingEditProvider('java', {
  provideDocumentFormattingEdits(model) {
    const formatted = formatJava(model.getValue())
    return [{ range: model.getFullModelRange(), text: formatted }]
  },
})

// Ctrl+B / Ctrl+Click: go to declaration within the file (fields, methods, locals, classes)
monaco.languages.registerDefinitionProvider('java', {
  provideDefinition(model, position) {
    const word = model.getWordAtPosition(position)
    if (!word) return null
    const a = analysisFor(model)
    const uri = model.uri
    for (const c of a.classes) {
      if (c.name === word.word) return { uri, range: new monaco.Range(c.line + 1, c.col + 1, c.line + 1, c.col + 1 + c.name.length) }
      for (const m of c.members) {
        if (m.name === word.word) return { uri, range: new monaco.Range(m.line + 1, m.col + 1, m.line + 1, m.col + 1 + m.name.length) }
      }
    }
    // other files in the project
    for (const other of monaco.editor.getModels()) {
      if (other === model || other.getLanguageId() !== 'java') continue
      for (const c of analysisFor(other).classes) {
        if (c.name === word.word) return { uri: other.uri, range: new monaco.Range(c.line + 1, c.col + 1, c.line + 1, c.col + 1 + c.name.length) }
      }
    }
    // nearest preceding local declaration "Type name"
    const text = model.getValue()
    const offset = model.getOffsetAt(position)
    const re = new RegExp(`\\b[\\w<>\\[\\],?]+\\s+(${word.word})\\s*[=;,:)]`, 'g')
    let best: number | null = null
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) && m.index < offset) best = m.index + m[0].indexOf(word.word, m[0].length - word.word.length - 3)
    if (best !== null) {
      const p = model.getPositionAt(best)
      return { uri, range: new monaco.Range(p.lineNumber, p.column, p.lineNumber, p.column + word.word.length) }
    }
    return null
  },
})

// "Identifier under caret" highlighting: IntelliJ highlights usages of identifiers only, never keywords
monaco.languages.registerDocumentHighlightProvider('java', {
  provideDocumentHighlights(model, position) {
    const offset = model.getOffsetAt(position)
    const { tokens } = analysisFor(model)
    const at = tokens.find((t) => t.kind === 'ident' && t.offset <= offset && offset <= t.offset + t.text.length)
    if (!at) return []
    return tokens
      .filter((t) => t.kind === 'ident' && t.text === at.text)
      .map((t) => ({ range: new monaco.Range(t.line + 1, t.col + 1, t.line + 1, t.col + 1 + t.text.length), kind: monaco.languages.DocumentHighlightKind.Read }))
  },
})

// IntelliJ IDEA default keymap (Windows/Linux) for editor-level actions.
// Global IDE shortcuts (Run, tool windows, ...) live in ide/shortcuts.ts.
const { KeyMod: M, KeyCode: K } = monaco
monaco.editor.addKeybindingRules([
  { keybinding: M.CtrlCmd | K.KeyD, command: 'editor.action.copyLinesDownAction' }, // Duplicate Line or Selection
  { keybinding: M.CtrlCmd | K.KeyY, command: 'editor.action.deleteLines' }, // Delete Line
  { keybinding: M.CtrlCmd | M.Shift | K.Slash, command: 'editor.action.blockComment' },
  { keybinding: M.CtrlCmd | M.Alt | K.KeyL, command: 'editor.action.formatDocument' }, // Reformat Code
  { keybinding: M.Shift | M.Alt | K.UpArrow, command: 'editor.action.moveLinesUpAction' }, // Move Line Up
  { keybinding: M.Shift | M.Alt | K.DownArrow, command: 'editor.action.moveLinesDownAction' },
  { keybinding: M.CtrlCmd | M.Shift | K.UpArrow, command: 'editor.action.moveLinesUpAction' }, // Move Statement Up (approx.)
  { keybinding: M.CtrlCmd | M.Shift | K.DownArrow, command: 'editor.action.moveLinesDownAction' },
  { keybinding: M.CtrlCmd | K.KeyW, command: 'editor.action.smartSelect.expand' }, // Extend Selection
  { keybinding: M.CtrlCmd | M.Shift | K.KeyW, command: 'editor.action.smartSelect.shrink' },
  { keybinding: M.CtrlCmd | M.Shift | K.KeyJ, command: 'editor.action.joinLines' },
  { keybinding: M.CtrlCmd | M.Shift | K.KeyU, command: 'editor.action.transformToUppercase' }, // Toggle Case (approx.)
  { keybinding: M.Alt | K.KeyJ, command: 'editor.action.addSelectionToNextFindMatch' }, // Add Selection for Next Occurrence
  { keybinding: M.CtrlCmd | M.Alt | M.Shift | K.KeyJ, command: 'editor.action.selectHighlights' }, // Select All Occurrences
  { keybinding: M.Shift | M.Alt | K.KeyJ, command: 'cursorUndo' },
  { keybinding: M.CtrlCmd | K.KeyR, command: 'editor.action.startFindReplaceAction' }, // Replace
  { keybinding: M.CtrlCmd | K.KeyG, command: 'editor.action.gotoLine' },
  { keybinding: M.CtrlCmd | K.KeyB, command: 'editor.action.revealDefinition' }, // Go to Declaration
  { keybinding: M.CtrlCmd | K.KeyP, command: 'editor.action.triggerParameterHints' }, // Parameter Info
  { keybinding: M.CtrlCmd | K.KeyQ, command: 'editor.action.showHover' }, // Quick Documentation
  { keybinding: K.F2, command: null }, // Next Highlighted Error: ij.nextHighlightedError (EditorArea)
  { keybinding: M.Shift | K.F2, command: null },
  { keybinding: M.CtrlCmd | K.Minus, command: 'editor.fold' }, // Collapse
  { keybinding: M.CtrlCmd | K.Equal, command: 'editor.unfold' }, // Expand
  { keybinding: M.CtrlCmd | K.NumpadSubtract, command: 'editor.fold' },
  { keybinding: M.CtrlCmd | K.NumpadAdd, command: 'editor.unfold' },
  { keybinding: M.CtrlCmd | M.Shift | K.Minus, command: 'editor.foldAll' },
  { keybinding: M.CtrlCmd | M.Shift | K.Equal, command: 'editor.unfoldAll' },
  { keybinding: M.CtrlCmd | M.Shift | K.NumpadSubtract, command: 'editor.foldAll' },
  { keybinding: M.CtrlCmd | M.Shift | K.NumpadAdd, command: 'editor.unfoldAll' },
  { keybinding: M.Alt | K.Enter, command: 'editor.action.quickFix' }, // Show Context Actions
  // completion popup: Tab replaces the identifier tail, Enter inserts (IntelliJ semantics)
  { keybinding: K.Tab, command: 'acceptAlternativeSuggestion', when: 'suggestWidgetHasFocusedSuggestion && suggestWidgetVisible && textInputFocus' },
  { keybinding: M.Shift | K.Enter, command: null, when: 'suggestWidgetVisible' },
  // remove VS Code defaults that conflict with IntelliJ muscle memory
  { keybinding: M.CtrlCmd | K.KeyL, command: null }, // VS Code: expand line selection
  { keybinding: M.CtrlCmd | M.Shift | K.KeyK, command: null }, // VS Code: delete line
  { keybinding: M.CtrlCmd | K.KeyH, command: null }, // VS Code: replace (IntelliJ: type hierarchy)
  { keybinding: M.Alt | K.UpArrow, command: null }, // VS Code: move line (IntelliJ: previous method)
  { keybinding: M.Alt | K.DownArrow, command: null },
  { keybinding: M.CtrlCmd | M.Shift | K.KeyL, command: null },
])

export { monaco }

export function languageFor(path: string) {
  if (path.endsWith('.java')) return 'java'
  if (path.endsWith('.xml') || path.endsWith('.iml')) return 'xml'
  if (path.endsWith('.md')) return 'markdown'
  return 'plaintext'
}

export function uriFor(path: string) {
  return monaco.Uri.parse(`file:///project/${path}`)
}

export function pathForUri(uri: monaco.Uri) {
  return uri.path.replace(/^\/project\//, '')
}

/** Get (or lazily create) the model for a project file. */
export function modelFor(path: string, content: string) {
  const uri = uriFor(path)
  let model = monaco.editor.getModel(uri)
  if (!model) {
    model = monaco.editor.createModel(content, languageFor(path), uri)
    model.updateOptions({ tabSize: 4, insertSpaces: true })
  }
  return model
}
