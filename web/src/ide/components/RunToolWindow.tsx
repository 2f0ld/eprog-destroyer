import { useEffect, useRef, useState } from 'react'
import { useIde } from '../store'
import { Icon } from '../../ui/Icon'
import { ToolWindow } from './ToolWindow'
import { runAction } from '../actions'
import { sendStdin } from '../runner'
import { revealPosition } from '../navigation'

/** Render text, turning stack trace locations like "(Main.java:12)" into links. */
function Linkified({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const re = /\(([\w$]+\.java):(\d+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    parts.push(text.slice(last, m.index + 1))
    const file = m[1]
    const line = Number(m[2])
    parts.push(
      <a key={m.index} className="ij-console-link" onClick={() => revealPosition(file, line, 1)}>
        {m[1]}:{m[2]}
      </a>,
    )
    parts.push(')')
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

export function RunToolWindow() {
  const lines = useIde((s) => s.console)
  const runState = useIde((s) => s.runState)
  const runConfig = useIde((s) => s.runConfig)
  const exitCode = useIde((s) => s.exitCode)
  const [input, setInput] = useState('')
  const [softWrap, setSoftWrap] = useState(false)
  const [focused, setFocused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)
  const [atEnd, setAtEnd] = useState(true)

  useEffect(() => {
    const el = scrollRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [lines, input])

  useEffect(() => {
    if (runState === 'running') inputRef.current?.focus()
  }, [runState])

  const running = runState !== 'idle'

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (runState === 'running') sendStdin(input + '\n')
      setInput('')
    } else if (e.key === 'd' && e.ctrlKey) {
      e.preventDefault() // Ctrl+D = EOF in IntelliJ console; not supported by the protocol yet
    }
  }

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
      <div className="ij-run">
        <div className="ij-run-toolbar">
          <button className="ij-icon-btn" title={`Rerun '${runConfig}'  Ctrl+F5`} onClick={() => runAction('Run')}>
            <Icon name="run/rerun" />
          </button>
          <button className="ij-icon-btn" title="Stop  Ctrl+F2" disabled={!running} onClick={() => runAction('Stop')}>
            <Icon name="run/stop" />
          </button>
          <div className="ij-run-toolbar-sep" />
          <button className={`ij-icon-btn${softWrap ? ' toggled' : ''}`} title="Soft-Wrap" onClick={() => setSoftWrap((v) => !v)}>
            <Icon name="general/softWrap" />
          </button>
          <button
            className={`ij-icon-btn${atEnd ? ' toggled' : ''}`}
            title="Scroll to the End"
            onClick={() => {
              stick.current = true
              setAtEnd(true)
              const el = scrollRef.current
              if (el) el.scrollTop = el.scrollHeight
            }}
          >
            <Icon name="general/scrollDown" />
          </button>
          <button className="ij-icon-btn" title="Clear All" onClick={() => useIde.getState().clearConsole()}>
            <Icon name="general/delete" />
          </button>
        </div>
        <div
          className={`ij-console${softWrap ? ' wrap' : ''}${focused ? ' focused' : ''}`}
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
            if (stick.current !== atEnd) setAtEnd(stick.current)
          }}
          onMouseUp={() => {
            if (!window.getSelection()?.toString()) inputRef.current?.focus()
          }}
        >
          {lines.map((l, i) => (
            <span key={i} className={`ij-console-${l.type}`}>
              {l.type === 'stderr' ? <Linkified text={l.text} /> : l.text}
            </span>
          ))}
          {runState === 'running' && (
            <span className="ij-console-stdin">
              {input}
              <span className="ij-console-caret" />
            </span>
          )}
          <textarea
            ref={inputRef}
            className="ij-console-input"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\n/g, ''))}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            autoComplete="off"
            aria-label="Console input"
          />
        </div>
      </div>
    </ToolWindow>
  )
}
