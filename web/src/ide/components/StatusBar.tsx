import { useMemo } from 'react'
import { useIde, fileName } from '../store'
import { Icon, fileIconName } from '../../ui/Icon'
import { analyze } from '../../java/analyzer'
import { revealPosition } from '../navigation'

interface Crumb {
  label: string
  icon?: string
  onClick?: () => void
}

export function StatusBar() {
  const projectName = useIde((s) => s.projectName)
  const active = useIde((s) => s.activeTab)
  const content = useIde((s) => (s.activeTab ? s.files[s.activeTab] : undefined))
  const caret = useIde((s) => s.caret)
  const runState = useIde((s) => s.runState)

  const crumbs = useMemo<Crumb[]>(() => {
    const out: Crumb[] = [{ label: projectName, icon: 'nodes/folder' }]
    if (!active) return out
    const parts = active.split('/')
    parts.slice(0, -1).forEach((d, i) => out.push({ label: d, icon: i === 0 && d === 'src' ? 'nodes/sourceRoot' : 'nodes/folder' }))
    if (active.endsWith('.java') && content !== undefined) {
      const a = analyze(content)
      // innermost class/member around the caret (members are in source order)
      const line0 = caret.line - 1
      const cls = [...a.classes].filter((c) => c.name && c.line <= line0).pop() ?? a.classes.find((c) => c.name)
      if (cls) {
        out.push({ label: cls.name, icon: fileIconName(active, content), onClick: () => revealPosition(active, cls.line + 1, cls.col + 1) })
        const member = [...cls.members].filter((m) => m.kind !== 'field' && m.line <= line0).pop()
        if (member) out.push({ label: member.name, icon: 'nodes/method', onClick: () => revealPosition(active, member.line + 1, member.col + 1) })
      } else out.push({ label: fileName(active).replace(/\.java$/, ''), icon: fileIconName(active, content) })
    } else out.push({ label: fileName(active), icon: fileIconName(active) })
    return out
  }, [projectName, active, content, caret.line])

  return (
    <div className="ij-status-bar">
      <div className="ij-breadcrumbs">
        {crumbs.map((c, i) => (
          <span key={i} className="ij-crumb-wrap">
            {i > 0 && <Icon name="general/chevronRight" className="ij-crumb-sep" />}
            <span className="ij-crumb" onClick={c.onClick}>
              {c.icon && <Icon name={c.icon} />}
              {c.label}
            </span>
          </span>
        ))}
      </div>
      <div className="ij-status-right">
        {runState !== 'idle' && <span className="ij-status-widget ij-status-progress">{runState === 'compiling' ? 'Building...' : 'Running...'}</span>}
        {active && (
          <>
            <span className="ij-status-widget" title="Go to Line/Column  Ctrl+G">
              {caret.line}:{caret.column}
              {caret.selection > 0 ? ` (${caret.selection} chars)` : ''}
            </span>
            <span className="ij-status-widget" title="Line Separator: \n">
              LF
            </span>
            <span className="ij-status-widget" title="File Encoding: UTF-8">
              UTF-8
            </span>
            <span className="ij-status-widget" title="Indent: 4 spaces">
              4 spaces
            </span>
            <span className="ij-status-widget" title="Make file read-only">
              <Icon name="general/unlocked" />
            </span>
          </>
        )}
      </div>
    </div>
  )
}
