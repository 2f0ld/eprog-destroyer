import type { ReactNode } from 'react'
import { Icon } from '../../ui/Icon'

export interface HeaderAction {
  icon: string
  title: string
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

/** Generic tool window chrome: header with title (+ optional tabs) and actions, content below. */
export function ToolWindow({
  title,
  titleDropdown,
  tabs,
  extra,
  actions = [],
  onHide,
  children,
  className = '',
}: {
  title: string
  titleDropdown?: boolean
  tabs?: ReactNode
  /** controls next to the header actions (never shrinks) */
  extra?: ReactNode
  actions?: HeaderAction[]
  onHide: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`ij-toolwindow ${className}`}>
      <div className="ij-tw-header">
        <div className="ij-tw-title">
          {title}
          {titleDropdown && <Icon name="general/chevronDown" />}
        </div>
        {tabs && <div className="ij-tw-tabs">{tabs}</div>}
        <div className="ij-tw-actions">
          {extra}
          {actions.map((a) => (
            <button key={a.title} className="ij-icon-btn" title={a.title} onClick={a.onClick}>
              <Icon name={a.icon} />
            </button>
          ))}
          <button className="ij-icon-btn" title="Options">
            <Icon name="general/moreVertical" />
          </button>
          <button className="ij-icon-btn" title="Hide  Shift+Escape" onClick={onHide}>
            <Icon name="general/hide" />
          </button>
        </div>
      </div>
      <div className="ij-tw-content">{children}</div>
    </div>
  )
}
