import { useEffect } from 'react'
import { useIde } from './store'
import { MainToolbar } from './components/MainToolbar'
import { LeftStripe, RightStripe } from './components/Stripes'
import { ProjectView } from './components/ProjectView'
import { EditorArea } from './components/EditorArea'
import { RunToolWindow } from './components/RunToolWindow'
import { StructureView, ProblemsView, TerminalView, CommitView, NotificationsView } from './components/OtherToolWindows'
import { StatusBar } from './components/StatusBar'
import { MenuHost } from '../ui/Menu'
import { DialogHost } from '../ui/DialogHost'
import { installGlobalShortcuts } from './shortcuts'

/** Thin drag handle between islands. */
function Splitter({ dir, onDrag }: { dir: 'v' | 'h'; onDrag: (delta: number) => void }) {
  return (
    <div
      className={`ij-splitter ij-splitter-${dir}`}
      onMouseDown={(e) => {
        e.preventDefault()
        let last = dir === 'v' ? e.clientX : e.clientY
        document.body.classList.add(dir === 'v' ? 'ij-resizing-v' : 'ij-resizing-h')
        const move = (ev: MouseEvent) => {
          const cur = dir === 'v' ? ev.clientX : ev.clientY
          onDrag(cur - last)
          last = cur
        }
        const up = () => {
          document.body.classList.remove('ij-resizing-v', 'ij-resizing-h')
          window.removeEventListener('mousemove', move)
          window.removeEventListener('mouseup', up)
        }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
      }}
    />
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function IdeWindow() {
  const leftTool = useIde((s) => s.leftTool)
  const bottomTool = useIde((s) => s.bottomTool)
  const rightTool = useIde((s) => s.rightTool)
  const leftWidth = useIde((s) => s.leftWidth)
  const rightWidth = useIde((s) => s.rightWidth)
  const bottomHeight = useIde((s) => s.bottomHeight)
  const setSize = useIde((s) => s.setSize)

  useEffect(() => installGlobalShortcuts(), [])

  return (
    <div className="ij-window">
      <MainToolbar />
      <div className="ij-middle">
        <LeftStripe />
        <div className="ij-islands">
          <div className="ij-islands-top">
            {leftTool && (
              <>
                <div className="ij-island" style={{ width: leftWidth }}>
                  {leftTool === 'project' && <ProjectView />}
                  {leftTool === 'structure' && <StructureView />}
                  {leftTool === 'commit' && <CommitView />}
                </div>
                <Splitter dir="v" onDrag={(d) => setSize('leftWidth', clamp(useIde.getState().leftWidth + d, 160, window.innerWidth * 0.6))} />
              </>
            )}
            <EditorArea />
            {rightTool && (
              <>
                <Splitter dir="v" onDrag={(d) => setSize('rightWidth', clamp(useIde.getState().rightWidth - d, 200, window.innerWidth * 0.5))} />
                <div className="ij-island" style={{ width: rightWidth }}>
                  <NotificationsView />
                </div>
              </>
            )}
          </div>
          {bottomTool && (
            <>
              <Splitter dir="h" onDrag={(d) => setSize('bottomHeight', clamp(useIde.getState().bottomHeight - d, 100, window.innerHeight * 0.75))} />
              <div className="ij-island ij-island-bottom" style={{ height: bottomHeight }}>
                {bottomTool === 'run' && <RunToolWindow />}
                {bottomTool === 'problems' && <ProblemsView />}
                {bottomTool === 'terminal' && <TerminalView />}
              </div>
            </>
          )}
        </div>
        <RightStripe />
      </div>
      <StatusBar />
      <MenuHost />
      <DialogHost />
    </div>
  )
}
