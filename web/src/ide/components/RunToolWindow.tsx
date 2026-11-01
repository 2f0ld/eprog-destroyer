import { useIde } from '../store'
import { Icon } from '../../ui/Icon'
import { ToolWindow } from './ToolWindow'
import { runAction } from '../actions'
import { sendStdin } from '../runner'
import { ConsoleView } from './ConsoleView'

export function RunToolWindow() {
  const lines = useIde((s) => s.console)
  const runState = useIde((s) => s.runState)
  const runConfig = useIde((s) => s.runConfig)
  const exitCode = useIde((s) => s.exitCode)
  const running = runState !== 'idle'
  const status = running ? null : exitCode === null ? null : exitCode === 0 ? 'ok' : 'err'

  return (
    <ToolWindow
      title="Run"
      onHide={() => useIde.setState({ bottomTool: null })}
      tabs={
        runConfig && (lines.length > 0 || running) ? (
          <div className="ij-tw-tab selected">
            <Icon name={status === 'err' ? 'run/testFailed' : 'nodes/class'} />
            <span>{runConfig}</span>
            <button className="ij-tab-close" title="Close" onClick={() => useIde.getState().clearConsole()}>
              <Icon name="general/closeSmall" />
            </button>
          </div>
        ) : null
      }
    >
      <ConsoleView
        lines={lines}
        acceptsInput={runState === 'running'}
        onInput={(text) => void sendStdin(text)}
        onClear={() => useIde.getState().clearConsole()}
        toolbar={
          <>
            <button className="ij-icon-btn" title={`Rerun '${runConfig}'  Ctrl+F5`} onClick={() => runAction('Run')}>
              <Icon name="run/rerun" />
            </button>
            <button className="ij-icon-btn" title="Stop  Ctrl+F2" disabled={!running} onClick={() => runAction('Stop')}>
              <Icon name="run/stop" />
            </button>
            <div className="ij-run-toolbar-sep" />
          </>
        }
      />
    </ToolWindow>
  )
}
