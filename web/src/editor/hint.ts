import { monaco } from './monacoSetup'
import { iconUrl } from '../ui/Icon'
import { useIde } from '../ide/store'
import { uiThemes } from '../theme/uiThemes'

/**
 * IntelliJ's editor hints (HintManager): a small balloon at the caret, e.g. "Cannot perform refactoring"
 * or "Removed 2 imports". Disappears on the next key press, caret move or after a few seconds.
 * Colors: ToolTip.background / ToolTip.foreground / ToolTip.borderColor.
 */
let current: { dispose(): void } | null = null

export function showEditorHint(ed: monaco.editor.ICodeEditor, text: string, kind: 'info' | 'error' = 'info') {
  current?.dispose()
  const pos = ed.getPosition()
  if (!pos) return
  const node = document.createElement('div')
  node.className = `ij-editor-hint ij-editor-hint-${kind}`
  if (kind === 'error') {
    const img = document.createElement('img')
    img.src = iconUrl('status/error', uiThemes[useIde.getState().theme].dark) ?? ''
    img.width = img.height = 16
    node.appendChild(img)
  }
  const span = document.createElement('span')
  span.textContent = text
  node.appendChild(span)
  const widget: monaco.editor.IContentWidget = {
    getId: () => 'ij.editorHint',
    getDomNode: () => node,
    getPosition: () => ({ position: pos, preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE, monaco.editor.ContentWidgetPositionPreference.BELOW] }),
  }
  ed.addContentWidget(widget)
  const timer = window.setTimeout(() => dispose(), 4000)
  const subs: monaco.IDisposable[] = []
  const dispose = () => {
    window.clearTimeout(timer)
    subs.forEach((s) => s.dispose())
    ed.removeContentWidget(widget)
    if (current === handle) current = null
  }
  const handle = { dispose }
  current = handle
  // ignore the events caused by the action that showed the hint
  window.setTimeout(() => {
    if (current !== handle) return
    subs.push(ed.onKeyDown(() => dispose()), ed.onDidChangeCursorPosition(() => dispose()), ed.onDidChangeModel(() => dispose()))
  }, 100)
}
