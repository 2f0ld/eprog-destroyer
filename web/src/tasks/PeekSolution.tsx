import { useEffect, useRef, useState } from 'react'
import { monaco } from '../editor/monacoSetup'
import { DARK_EDITOR_THEME, LIGHT_EDITOR_THEME } from '../theme/editorThemes'
import { uiThemes } from '../theme/uiThemes'
import { useIde } from '../ide/store'
import { closeDialog } from '../ui/dialogs'
import { getActiveEditor } from '../editor/editorRef'
import { currentJavaFiles } from '../ide/liveCheck'
import { fileName } from '../ide/store'
import { taskById } from './catalog'
import { useTasks } from './progress'
import { textsOf } from './model'

/** EduTools' "Peek Solution": a diff window, your code on the left, the author's solution on the right. */
export function PeekSolutionDialog({ taskId }: { taskId: string }) {
  const task = taskById.get(taskId)
  const files = Object.keys(task?.solution ?? {})
  const [file, setFile] = useState(files.includes(task?.openFile ?? '') ? task!.openFile : files[0])
  const host = useRef<HTMLDivElement>(null)
  const close = () => {
    closeDialog()
    getActiveEditor()?.focus()
  }
  useEffect(() => {
    if (!task || !host.current || !file) return
    const dark = uiThemes[useIde.getState().theme].dark
    const diff = monaco.editor.createDiffEditor(host.current, {
      readOnly: true,
      originalEditable: false,
      automaticLayout: true,
      renderSideBySide: true,
      theme: dark ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderOverviewRuler: false,
    })
    const original = monaco.editor.createModel(currentJavaFiles()[file] ?? '', 'java')
    const modified = monaco.editor.createModel(task.solution[file], 'java')
    diff.setModel({ original, modified })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      diff.dispose()
      original.dispose()
      modified.dispose()
    }
  }, [task, file])
  if (!task) return null
  const de = useTasks.getState().lang === 'de'
  return (
    <div className="ij-overlay dim" onMouseDown={close}>
      <div className="ij-dialog ij-diff-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ij-dialog-title">
          {de ? 'Lösung ansehen' : 'Peek Solution'}: {textsOf(task, useTasks.getState().lang).title}
        </div>
        <div className="ij-diff-header">
          {files.length > 1 ? (
            <select className="ij-select" value={file} onChange={(e) => setFile(e.target.value)}>
              {files.map((f) => (
                <option key={f} value={f}>
                  {fileName(f)}
                </option>
              ))}
            </select>
          ) : (
            <span>{fileName(file)}</span>
          )}
          <span className="ij-diff-sides">
            <span>{de ? 'Dein Code' : 'Your code'}</span>
            <span>{de ? 'Musterlösung' : "Author's solution"}</span>
          </span>
        </div>
        <div className="ij-diff-host" ref={host} />
        <div className="ij-dialog-footer">
          <span className="ij-muted" style={{ flex: 1 }}>
            {de ? 'Lesen, schliessen, dann selbst schreiben — Abschreiben bringt nichts.' : 'Read it, close it, then write the solution yourself — copying teaches nothing.'}
          </span>
          <button className="ij-button default" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
