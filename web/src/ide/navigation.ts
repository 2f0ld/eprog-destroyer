import { useIde, fileName } from './store'
import { getActiveEditor } from '../editor/editorRef'

/**
 * Open a file and put the caret at line/column (1-based).
 * `file` may be a project path ("src/Main.java") or a bare file name ("Main.java").
 */
export function revealPosition(file: string, line: number, column: number) {
  const s = useIde.getState()
  const path = file in s.files ? file : Object.keys(s.files).find((p) => fileName(p) === file || p.endsWith('/' + file))
  if (!path) return
  s.openFile(path)
  // the editor swaps models on the next render
  requestAnimationFrame(() => {
    const ed = getActiveEditor()
    if (!ed) return
    ed.setPosition({ lineNumber: line, column })
    ed.revealLineInCenterIfOutsideViewport(line)
    ed.focus()
  })
}
