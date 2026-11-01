import { useEffect, useState } from 'react'
import { useIde } from '../ide/store'
import { Icon } from '../ui/Icon'
import { ToolWindow } from '../ide/components/ToolWindow'
import { ConsoleView } from '../ide/components/ConsoleView'
import { runAction } from '../ide/actions'
import { useDebugger } from './store'
import { children, selectFrame, sendDebugStdin } from './debugClient'
import type { DebugFrame, DebugVariable } from './protocol'
import { openMenuBelow, type MenuItem } from '../ui/Menu'
import { revealPosition } from '../ide/navigation'

/** Stand-in for IntelliJ's Breakpoints dialog: the project's line breakpoints, click to navigate. */
function breakpointsMenu(): MenuItem[] {
  const projectId = useIde.getState().projectId
  const files = useDebugger.getState().breakpoints[projectId] ?? {}
  const items = Object.entries(files).flatMap(([file, lines]) =>
    lines.map<MenuItem>((line) => ({ type: 'item', text: `${file.slice(file.lastIndexOf('/') + 1)}:${line}`, icon: 'breakpoints/breakpoint', run: () => revealPosition(file, line, 1) })),
  )
  if (!items.length) return [{ type: 'item', text: 'No breakpoints', disabled: true, run: () => {} }]
  return [...items, { type: 'separator' }, { type: 'item', text: 'Remove All Breakpoints', run: () => useDebugger.setState((s) => ({ breakpoints: { ...s.breakpoints, [projectId]: {} } })) }]
}

const VAR_ICON: Record<DebugVariable['icon'], string> = {
  primitive: 'debugger/dbPrimitive',
  array: 'debugger/dbArray',
  value: 'debugger/value',
  field: 'nodes/field',
  parameter: 'nodes/parameter',
  enum: 'nodes/enum',
  static: 'nodes/static',
}

/** IntelliJ's frame text: "twice:13, Main" + grey "(com.example)" for packaged classes. */
function FrameRow({ f, selected, onSelect }: { f: DebugFrame; selected: boolean; onSelect: () => void }) {
  const dot = f.className.lastIndexOf('.')
  const cls = f.className.slice(dot + 1)
  const pkg = dot > 0 ? f.className.slice(0, dot) : ''
  return (
    <div className={`ij-tree-row ij-debug-frame${selected ? ' selected' : ''}${f.file ? '' : ' library'}`} onMouseDown={onSelect}>
      <span className="ij-tree-icon">
        <Icon name="debugger/frame" />
      </span>
      <span className="ij-tree-label">
        {f.method}:{f.line < 0 ? '-1' : f.line}, {cls}
      </span>
      {pkg && <span className="ij-tree-secondary">({pkg})</span>}
    </div>
  )
}

function VariableRow({ v, depth, changed, path }: { v: DebugVariable; depth: number; changed: boolean; path: string }) {
  const [open, setOpen] = useState(false)
  const [kids, setKids] = useState<DebugVariable[] | null>(null)
  const selected = useDebugger((s) => s.selectedVariable === path)
  const toggle = async () => {
    if (!v.ref) return
    if (!open && kids === null) setKids(await children(v.ref))
    setOpen((o) => !o)
  }
  return (
    <>
      <div
        className={`ij-tree-row ij-debug-var${selected ? ' selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 20 }}
        onMouseDown={() => useDebugger.setState({ selectedVariable: path })}
        onDoubleClick={toggle}
      >
        <span
          className="ij-tree-chevron"
          onMouseDown={(e) => {
            e.stopPropagation()
            void toggle()
          }}
        >
          {v.ref && <Icon name={open ? 'general/chevronDown' : 'general/chevronRight'} />}
        </span>
        <span className="ij-tree-icon">
          <Icon name={VAR_ICON[v.icon]} />
        </span>
        <span className="ij-tree-label">
          <span className="ij-var-name">{v.name}</span>
          <span> = </span>
          {v.type && <span className="ij-var-type">{`{${v.type}}`}</span>}
          {v.type && v.value && ' '}
          <span className={`ij-var-value ${changed ? 'changed' : v.style}`}>{v.value}</span>
        </span>
      </div>
      {open && kids?.map((k) => <VariableRow key={k.name} v={k} depth={depth + 1} changed={false} path={`${path}/${k.name}`} />)}
      {open && kids?.length === 0 && (
        <div className="ij-tree-row ij-debug-empty" style={{ paddingLeft: 8 + (depth + 1) * 20 + 22 }}>
          {v.icon === 'array' ? 'Array is empty' : 'No fields to display'}
        </div>
      )}
    </>
  )
}

function ThreadsAndVariables() {
  const session = useDebugger((s) => s.session)
  if (!session) return null
  const paused = session.state === 'paused'
  // a fresh tree per pause/frame, so expanded nodes reload their (possibly changed) children
  const treeKey = `${session.frames.length}:${session.selectedFrame}:${session.variables.map((v) => v.value).join()}`
  return (
    <div className="ij-debug-split">
      <div className="ij-debug-frames">
        <div className="ij-debug-thread">
          <Icon name={paused ? 'debugger/threadAtBreakpoint' : 'debugger/threadRunning'} />
          <span>
            "{session.thread}"@1 in group "main": {session.state === 'finished' ? 'ZOMBIE' : 'RUNNING'}
          </span>
          <Icon name="general/chevronDown" />
        </div>
        <div className="ij-tree" tabIndex={0}>
          {session.frames.length ? (
            session.frames.map((f, i) => <FrameRow key={i} f={f} selected={i === session.selectedFrame} onSelect={() => void selectFrame(i)} />)
          ) : (
            <div className="ij-debug-message">Frames are not available</div>
          )}
        </div>
      </div>
      <div className="ij-debug-variables">
        <div className="ij-tree" tabIndex={0} key={treeKey}>
          {paused ? (
            session.variables.length ? (
              session.variables.map((v) => <VariableRow key={v.name} v={v} depth={0} path={v.name} changed={v.name in session.previous && session.previous[v.name] !== `${v.type ?? ''} ${v.value}`} />)
            ) : (
              <div className="ij-debug-message">Variables are not available</div>
            )
          ) : (
            <div className="ij-debug-message">{session.state === 'finished' ? 'Disconnected' : 'The application is running'}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Btn({ action, icon, title, enabled }: { action: string; icon: string; title: string; enabled: boolean }) {
  return (
    <button className="ij-icon-btn" title={title} disabled={!enabled} onClick={() => runAction(action)}>
      <Icon name={icon} />
    </button>
  )
}

export function DebugToolWindow() {
  const session = useDebugger((s) => s.session)
  const tab = useDebugger((s) => s.tab)
  const lines = useDebugger((s) => s.console)
  const muted = useDebugger((s) => s.muted)
  const live = session !== null && session.state !== 'finished'
  const paused = session?.state === 'paused'

  useEffect(() => {
    if (paused) useIde.setState({ bottomTool: 'debug' })
  }, [paused])

  const failed = session?.state === 'finished' && session.exitCode !== null && session.exitCode !== 0
  return (
    <ToolWindow
      title="Debug"
      className="ij-debug"
      onHide={() => useIde.setState({ bottomTool: null })}
      tabs={
        session ? (
          <div className="ij-tw-tab selected">
            <Icon name={failed ? 'run/testFailed' : 'nodes/class'} />
            <span>{session.mainClass}</span>
            <button className="ij-tab-close" title="Close" onClick={() => runAction('CloseDebugSession')}>
              <Icon name="general/closeSmall" />
            </button>
          </div>
        ) : null
      }
    >
      <div className="ij-debug-toolbar">
        <button className={`ij-debug-tab${tab === 'variables' ? ' selected' : ''}`} onClick={() => useDebugger.setState({ tab: 'variables' })}>
          Threads &amp; Variables
        </button>
        <button className={`ij-debug-tab${tab === 'console' ? ' selected' : ''}`} onClick={() => useDebugger.setState({ tab: 'console' })}>
          Console
        </button>
        <div className="ij-run-toolbar-sep vertical" />
        <Btn action="Debug" icon="run/restartDebug" title={`Rerun '${session?.mainClass ?? ''}'  Ctrl+F5`} enabled={session !== null} />
        <Btn action="Stop" icon="run/stop" title="Stop  Ctrl+F2" enabled={live} />
        <Btn action="Resume" icon="run/resume" title="Resume Program  F9" enabled={paused} />
        <Btn action="Pause" icon="run/pause" title="Pause Program" enabled={live && !paused && session?.id != null} />
        <div className="ij-run-toolbar-sep vertical" />
        <Btn action="StepOver" icon="run/stepOver" title="Step Over  F8" enabled={paused} />
        <Btn action="StepInto" icon="run/stepInto" title="Step Into  F7" enabled={paused} />
        <Btn action="StepOut" icon="run/stepOut" title="Step Out  Shift+F8" enabled={paused} />
        <div className="ij-run-toolbar-sep vertical" />
        <button className="ij-icon-btn" title="View Breakpoints...  Ctrl+Shift+F8" onClick={(e) => openMenuBelow(e.currentTarget, breakpointsMenu(), 240)}>
          <Icon name="run/viewBreakpoints" />
        </button>
        <button className={`ij-icon-btn${muted ? ' toggled' : ''}`} title="Mute Breakpoints" onClick={() => runAction('MuteBreakpoints')}>
          <Icon name="run/muteBreakpoints" />
        </button>
      </div>
      <div className="ij-debug-body">
        {tab === 'variables' ? (
          <ThreadsAndVariables />
        ) : (
          <ConsoleView lines={lines} acceptsInput={live && session?.id != null} onInput={(t) => void sendDebugStdin(t)} onClear={() => useDebugger.setState({ console: [] })} />
        )}
      </div>
    </ToolWindow>
  )
}
