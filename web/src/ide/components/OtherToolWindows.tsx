import { useMemo } from 'react'
import { useIde, fileName } from '../store'
import { Icon } from '../../ui/Icon'
import { ToolWindow } from './ToolWindow'
import { analyze, type OutlineMember } from '../../java/analyzer'
import { revealPosition } from '../navigation'

function memberIcon(m: OutlineMember) {
  if (m.kind === 'field') return m.isStatic && m.isFinal ? 'nodes/constant' : 'nodes/field'
  return 'nodes/method'
}

export function StructureView() {
  const active = useIde((s) => s.activeTab)
  const content = useIde((s) => (s.activeTab ? s.files[s.activeTab] : undefined))
  const analysis = useMemo(() => (active?.endsWith('.java') && content !== undefined ? analyze(content) : null), [active, content])

  return (
    <ToolWindow title="Structure" onHide={() => useIde.setState({ leftTool: null })}>
      <div className="ij-tree" tabIndex={0}>
        {!analysis || analysis.classes.length === 0 ? (
          <div className="ij-empty-text">{active ? 'No structure' : 'Nothing to show'}</div>
        ) : (
          analysis.classes
            .filter((c) => c.name)
            .map((c) => (
              <div key={`${c.name}${c.line}`}>
                <div className="ij-tree-row" style={{ paddingLeft: 8 }} onDoubleClick={() => revealPosition(active!, c.line + 1, c.col + 1)} onClick={() => revealPosition(active!, c.line + 1, c.col + 1)}>
                  <span className="ij-tree-chevron">
                    <Icon name="general/chevronDown" />
                  </span>
                  <span className="ij-tree-icon">
                    <Icon name={c.kind === 'interface' ? 'nodes/interface' : c.kind === 'enum' ? 'nodes/enum' : c.kind === 'record' ? 'nodes/record' : c.isAbstract ? 'nodes/classAbstract' : 'nodes/class'} />
                    {c.hasMain && <Icon name="nodes/runnableMark" className="ij-tree-overlay" />}
                  </span>
                  <span className="ij-tree-label">{c.name}</span>
                </div>
                {c.members.map((m) => (
                  <div key={`${m.name}${m.line}${m.col}`} className="ij-tree-row" style={{ paddingLeft: 28 }} onClick={() => revealPosition(active!, m.line + 1, m.col + 1)}>
                    <span className="ij-tree-chevron" />
                    <span className="ij-tree-icon">
                      <Icon name={memberIcon(m)} />
                    </span>
                    <span className="ij-tree-label">
                      {m.name}
                      {m.kind !== 'field' ? <span className="ij-tree-secondary-inline">{m.detail}</span> : <span className="ij-tree-secondary-inline">: {m.detail}</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))
        )}
      </div>
    </ToolWindow>
  )
}

export function ProblemsView() {
  const problems = useIde((s) => s.problems)
  const byFile = useMemo(() => {
    const m = new Map<string, typeof problems>()
    for (const p of problems) m.set(p.path, [...(m.get(p.path) ?? []), p])
    return [...m.entries()]
  }, [problems])
  return (
    <ToolWindow
      title="Problems"
      onHide={() => useIde.setState({ bottomTool: null })}
      tabs={
        <>
          <div className="ij-tw-tab selected">
            <span>Project Errors</span>
          </div>
        </>
      }
    >
      <div className="ij-tree" tabIndex={0}>
        {problems.length === 0 ? (
          <div className="ij-empty-text">No problems found</div>
        ) : (
          byFile.map(([path, list]) => (
            <div key={path}>
              <div className="ij-tree-row" style={{ paddingLeft: 8 }}>
                <span className="ij-tree-chevron">
                  <Icon name="general/chevronDown" />
                </span>
                <span className="ij-tree-icon">
                  <Icon name="nodes/class" />
                </span>
                <span className="ij-tree-label">{fileName(path)}</span>
                <span className="ij-tree-secondary">
                  {list.length} problem{list.length === 1 ? '' : 's'}
                </span>
              </div>
              {list.map((p, i) => (
                <div key={i} className="ij-tree-row" style={{ paddingLeft: 48 }} onDoubleClick={() => revealPosition(p.path, p.line, p.column)} onClick={() => revealPosition(p.path, p.line, p.column)}>
                  <span className="ij-tree-icon">
                    <Icon name={p.severity === 'error' ? 'status/error' : 'status/warning'} />
                  </span>
                  <span className="ij-tree-label">{p.message.split('\n')[0]}</span>
                  <span className="ij-tree-secondary">
                    :{p.line}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </ToolWindow>
  )
}

export function TerminalView() {
  const projectName = useIde((s) => s.projectName)
  return (
    <ToolWindow
      title="Terminal"
      onHide={() => useIde.setState({ bottomTool: null })}
      tabs={
        <div className="ij-tw-tab selected">
          <span>Local</span>
        </div>
      }
    >
      <div className="ij-console">
        <span className="ij-console-system">
          student@eprog:~/IdeaProjects/{projectName}$ <span className="ij-console-caret" />
        </span>
        {'\n\n'}
        <span className="ij-console-system ij-muted">The terminal is not available in the web environment. Use the Run button (Shift+F10) to compile and run your program.</span>
      </div>
    </ToolWindow>
  )
}

export function CommitView() {
  return (
    <ToolWindow title="Commit" onHide={() => useIde.setState({ leftTool: null })}>
      <div className="ij-empty-text">Version control is not used in this environment.</div>
    </ToolWindow>
  )
}

export function NotificationsView() {
  const notifications = useIde((s) => s.notifications)
  return (
    <ToolWindow title="Notifications" onHide={() => useIde.setState({ rightTool: null })} actions={[{ icon: 'general/delete', title: 'Clear All', onClick: () => useIde.setState({ notifications: [] }) }]}>
      <div className="ij-notifications">
        {notifications.length === 0 ? (
          <div className="ij-empty-text">No new notifications</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="ij-notification-item">
              <Icon name={n.kind === 'error' ? 'status/error' : n.kind === 'warning' ? 'status/warning' : 'status/info'} />
              <div>
                <div className="ij-notification-title">{n.title}</div>
                <div className="ij-notification-body">{n.body}</div>
                <div className="ij-notification-time">{new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </ToolWindow>
  )
}
