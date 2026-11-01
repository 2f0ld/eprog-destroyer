import './debugger.css'
import { monaco, pathForUri } from '../editor/monacoSetup'
import { useIde } from '../ide/store'
import { iconUrl } from '../ui/Icon'
import { useDebugger } from './store'
import { inlineValues } from './inline'

/**
 * Debugger look in the editor (New UI): breakpoints are drawn over the line numbers (click toggles, hover
 * previews), breakpoint lines get BREAKPOINT_ATTRIBUTES, the paused line EXECUTIONPOINT_ATTRIBUTES (or
 * NOT_TOP_FRAME_ATTRIBUTES for a selected caller frame) and executed lines show inline values
 * (DEBUGGER_INLINED_VALUES*). Colours: see docs/RESEARCH.md.
 */

let styleInstalled = false
function installStyles() {
  if (styleInstalled) return
  styleInstalled = true
  const rule = (cls: string, icon: string) =>
    `[data-theme='dark'] .monaco-editor .line-numbers.${cls} { background-image: url("${iconUrl(icon, true)}"); }\n` +
    `[data-theme='light'] .monaco-editor .line-numbers.${cls} { background-image: url("${iconUrl(icon, false)}"); }\n`
  const style = document.createElement('style')
  style.textContent = rule('ij-bp', 'breakpoints/breakpoint') + rule('ij-bp-valid', 'breakpoints/breakpointValid') + rule('ij-bp-invalid', 'breakpoints/breakpointInvalid') + rule('ij-bp-muted', 'breakpoints/breakpointMuted') + rule('ij-bp-hover', 'breakpoints/breakpoint')
  document.head.appendChild(style)
}

const projectId = () => useIde.getState().projectId

export function toggleBreakpointAtCaret(ed: monaco.editor.ICodeEditor) {
  const model = ed.getModel()
  const pos = ed.getPosition()
  if (!model || !pos) return
  useDebugger.getState().toggleBreakpoint(projectId(), pathForUri(model.uri), pos.lineNumber)
}

export function installDebuggerEditor(ed: monaco.editor.IStandaloneCodeEditor) {
  installStyles()
  const breakpoints = ed.createDecorationsCollection()
  const hover = ed.createDecorationsCollection()
  const execution = ed.createDecorationsCollection()
  const dom = ed.getContainerDomNode()

  const currentPath = () => {
    const m = ed.getModel()
    return m && m.uri.scheme === 'file' ? pathForUri(m.uri) : null
  }
  const lineAt = (e: MouseEvent) => {
    const t = ed.getTargetAtClientPoint(e.clientX, e.clientY)
    return t && t.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS && t.position ? t.position.lineNumber : null
  }

  const render = () => {
    const path = currentPath()
    const dbg = useDebugger.getState()
    const lines = path ? (dbg.breakpoints[projectId()]?.[path] ?? []) : []
    const session = dbg.session
    const frame = session?.state === 'paused' ? session.frames[session.selectedFrame] : undefined
    const execLine = frame && frame.file === path ? frame.line : -1
    const live = session !== null && session.state !== 'finished'
    const dark = useIde.getState().theme === 'islands-dark'
    breakpoints.set(
      lines.map((line) => {
        const status = live ? dbg.bpStatus[`${path}:${line}`] : undefined
        return {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            lineNumberClassName: `ij-bp${dbg.muted ? ' ij-bp-muted' : status === 'verified' ? ' ij-bp-valid' : status === 'invalid' ? ' ij-bp-invalid' : ''}`,
            className: line === execLine ? undefined : 'ij-bp-line',
            isWholeLine: true,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            // BREAKPOINT_ATTRIBUTES error stripe colour
            overviewRuler: { color: dark ? '#8C5B65' : '#FFC8C8', position: monaco.editor.OverviewRulerLane.Left },
          },
        }
      }),
    )
    const model = ed.getModel()
    if (!frame || execLine < 0 || !model) {
      execution.clear()
      return
    }
    const top = session!.selectedFrame === 0
    const decos: monaco.editor.IModelDeltaDecoration[] = [
      { range: new monaco.Range(execLine, 1, execLine, model.getLineMaxColumn(execLine)), options: { className: top ? 'ij-exec-line' : 'ij-frame-line', inlineClassName: top ? 'ij-exec-text' : undefined, isWholeLine: true } },
    ]
    const changed = session!.previous
    for (const [line, vars] of inlineValues(model.getValue(), frame.startLine, execLine, session!.variables)) {
      if (line > model.getLineCount()) continue
      const end = model.getLineMaxColumn(line)
      vars.forEach((v, i) => {
        const cur = session!.variables.find((x) => x.name === v.name)
        const modified = cur && v.name in changed && changed[v.name] !== `${cur.type ?? ''} ${cur.value}`
        decos.push({
          range: new monaco.Range(line, end, line, end),
          options: { showIfCollapsed: true, after: { content: (i === 0 ? '    ' : '   ') + v.text, inlineClassName: modified ? 'ij-inline-value modified' : line === execLine && top ? 'ij-inline-value exec' : 'ij-inline-value' } },
        })
      })
    }
    execution.set(decos)
  }

  // keep breakpoints on their lines while editing (decorations move with the text)
  const contentSub = ed.onDidChangeModelContent(() => {
    const path = currentPath()
    if (!path) return
    const stored = useDebugger.getState().breakpoints[projectId()]?.[path] ?? []
    const now = [...new Set(breakpoints.getRanges().map((r) => r.startLineNumber))].sort((a, b) => a - b)
    if (now.join() !== stored.join()) useDebugger.getState().setFileBreakpoints(projectId(), path, now)
    else render()
  })
  const modelSub = ed.onDidChangeModel(() => {
    hover.clear()
    render()
  })
  const unsubDebugger = useDebugger.subscribe(render)
  const unsubIde = useIde.subscribe((s, p) => {
    if (s.projectId !== p.projectId || s.theme !== p.theme) render()
  })

  // clicks on line numbers toggle breakpoints; capture them before Monaco starts a line selection
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    const line = lineAt(e)
    const path = currentPath()
    if (line === null || !path) return
    e.preventDefault()
    e.stopPropagation()
    hover.clear()
    useDebugger.getState().toggleBreakpoint(projectId(), path, line)
  }
  const onMouseMove = (e: MouseEvent) => {
    const line = lineAt(e)
    const path = currentPath()
    const has = line !== null && path !== null && (useDebugger.getState().breakpoints[projectId()]?.[path] ?? []).includes(line)
    if (line === null || has) hover.clear()
    else hover.set([{ range: new monaco.Range(line, 1, line, 1), options: { lineNumberClassName: 'ij-bp-hover' } }])
  }
  const onMouseLeave = () => hover.clear()
  dom.addEventListener('mousedown', onMouseDown, true)
  dom.addEventListener('mousemove', onMouseMove)
  dom.addEventListener('mouseleave', onMouseLeave)

  render()
  return () => {
    contentSub.dispose()
    modelSub.dispose()
    unsubDebugger()
    unsubIde()
    dom.removeEventListener('mousedown', onMouseDown, true)
    dom.removeEventListener('mousemove', onMouseMove)
    dom.removeEventListener('mouseleave', onMouseLeave)
  }
}
