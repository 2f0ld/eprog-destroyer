import { monaco, pathForUri } from './monacoSetup'
import type { Problem } from '../java/diagnostics'

/**
 * Problems are drawn as decorations, not Monaco markers, because IntelliJ uses three different looks:
 * a red wave for errors (ERRORS_ATTRIBUTES), red text without underline for unresolved references
 * (WRONG_REFERENCES_ATTRIBUTES) and grey text for unused code (NOT_USED_ELEMENT_ATTRIBUTES).
 * Each problem also gets an error-stripe mark in the overview ruler and a hover tooltip.
 */

const ids = new WeakMap<monaco.editor.ITextModel, string[]>()

const escapeMd = (s: string) => s.replace(/[\\`*_{}[\]()#+\-.!<>|]/g, '\\$&')

function options(p: Problem): monaco.editor.IModelDecorationOptions {
  const error = { id: 'editorOverviewRuler.errorForeground' }
  const warning = { id: 'editorOverviewRuler.warningForeground' }
  const base = {
    hoverMessage: { value: escapeMd(p.message).replace(/\n/g, '  \n') },
    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    overviewRuler: { color: p.severity === 'error' ? error : warning, position: monaco.editor.OverviewRulerLane.Right },
  }
  switch (p.highlight) {
    case 'wrongRef':
      return { ...base, inlineClassName: 'ij-wrong-ref', className: 'ij-problem' }
    case 'unused':
      return { ...base, inlineClassName: 'ij-unused', className: 'ij-problem' }
    case 'warning':
      return { ...base, className: 'squiggly-warning ij-problem' }
    default:
      return { ...base, className: 'squiggly-error ij-problem', zIndex: 10 }
  }
}

/** Replace the problem decorations of every open model. */
export function applyProblems(problems: Problem[]) {
  const byPath = new Map<string, Problem[]>()
  for (const p of problems) byPath.set(p.path, [...(byPath.get(p.path) ?? []), p])
  for (const m of monaco.editor.getModels()) {
    if (m.uri.scheme !== 'file' || m.isDisposed()) continue
    const list = byPath.get(pathForUri(m.uri)) ?? []
    const decos = list.map((p) => {
      const line = Math.min(p.line, m.getLineCount())
      const endLine = Math.min(p.endLine, m.getLineCount())
      return { range: new monaco.Range(line, p.column, endLine, Math.min(p.endColumn, m.getLineMaxColumn(endLine))), options: options(p) }
    })
    ids.set(m, m.deltaDecorations(ids.get(m) ?? [], decos))
  }
}

/** F2 / Shift+F2: IntelliJ's Next/Previous Highlighted Error (errors first, then warnings). */
export function gotoProblem(editor: monaco.editor.ICodeEditor, problems: Problem[], dir: 1 | -1) {
  const model = editor.getModel()
  const pos = editor.getPosition()
  if (!model || !pos) return
  const path = pathForUri(model.uri)
  // use the live decoration ranges: they follow edits made since the last check
  const ranges = (ids.get(model) ?? []).map((id) => model.getDecorationRange(id)).filter((r): r is monaco.Range => !!r)
  const mine = problems.filter((p) => p.path === path)
  const withRange = mine.map((p, i) => ({ p, r: ranges[i] ?? new monaco.Range(p.line, p.column, p.endLine, p.endColumn) }))
  const errors = withRange.filter((x) => x.p.severity === 'error')
  const pool = (errors.length ? errors : withRange).sort((a, b) => a.r.startLineNumber - b.r.startLineNumber || a.r.startColumn - b.r.startColumn)
  if (!pool.length) return
  const after = (r: monaco.Range) => r.startLineNumber > pos.lineNumber || (r.startLineNumber === pos.lineNumber && r.startColumn > pos.column)
  const before = (r: monaco.Range) => r.startLineNumber < pos.lineNumber || (r.startLineNumber === pos.lineNumber && r.startColumn < pos.column)
  const target = dir === 1 ? (pool.find((x) => after(x.r)) ?? pool[0]) : ([...pool].reverse().find((x) => before(x.r)) ?? pool[pool.length - 1])
  editor.setPosition({ lineNumber: target.r.startLineNumber, column: target.r.startColumn })
  editor.revealPositionInCenterIfOutsideViewport({ lineNumber: target.r.startLineNumber, column: target.r.startColumn })
  editor.focus()
  window.setTimeout(() => editor.trigger('ij', 'editor.action.showHover', null), 50)
}
