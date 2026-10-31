import { useIde, type BottomTool, type LeftTool, type RightTool } from '../store'
import { Icon } from '../../ui/Icon'

interface StripeButton {
  id: string
  title: string
  icon: string
  shortcut?: string
  active: boolean
  onClick: () => void
}

function Btn({ b }: { b: StripeButton }) {
  return (
    <button className={`ij-stripe-btn${b.active ? ' selected' : ''}`} title={b.shortcut ? `${b.title}  ${b.shortcut}` : b.title} onClick={b.onClick}>
      <Icon name={`${b.icon}@20x20`} size={20} />
    </button>
  )
}

export function LeftStripe() {
  const leftTool = useIde((s) => s.leftTool)
  const bottomTool = useIde((s) => s.bottomTool)
  const toggleLeft = useIde((s) => s.toggleLeft)
  const toggleBottom = useIde((s) => s.toggleBottom)
  const runState = useIde((s) => s.runState)
  const problems = useIde((s) => s.problems.length)

  const left = (id: LeftTool, title: string, icon: string, shortcut: string): StripeButton => ({ id, title, icon, shortcut, active: leftTool === id, onClick: () => toggleLeft(id) })
  const bottom = (id: BottomTool, title: string, icon: string, shortcut: string): StripeButton => ({ id, title, icon, shortcut, active: bottomTool === id, onClick: () => toggleBottom(id) })

  return (
    <div className="ij-stripe ij-stripe-left">
      <div className="ij-stripe-group">
        <Btn b={left('project', 'Project', 'toolwindows/project', 'Alt+1')} />
        <Btn b={left('commit', 'Commit', 'toolwindows/commit', 'Alt+0')} />
        <Btn b={left('structure', 'Structure', 'toolwindows/structure', 'Alt+7')} />
        <div className="ij-stripe-sep" />
      </div>
      <div className="ij-stripe-group">
        <div className="ij-stripe-badge-wrap">
          <Btn b={bottom('run', 'Run', 'toolwindows/run', 'Alt+4')} />
          {runState !== 'idle' && <span className="ij-stripe-running-dot" />}
        </div>
        <Btn b={bottom('terminal', 'Terminal', 'toolwindows/terminal', 'Alt+F12')} />
        <div className="ij-stripe-badge-wrap">
          <Btn b={bottom('problems', 'Problems', 'toolwindows/problems', 'Alt+6')} />
          {problems > 0 && <span className="ij-stripe-error-dot" />}
        </div>
      </div>
    </div>
  )
}

export function RightStripe() {
  const rightTool = useIde((s) => s.rightTool)
  const toggleRight = useIde((s) => s.toggleRight)
  const unread = useIde((s) => s.notifications.length)
  const right = (id: RightTool, title: string, icon: string): StripeButton => ({ id, title, icon, active: rightTool === id, onClick: () => toggleRight(id) })
  return (
    <div className="ij-stripe ij-stripe-right">
      <div className="ij-stripe-group">
        <div className="ij-stripe-badge-wrap">
          <Btn b={right('notifications', 'Notifications', 'toolwindows/notifications')} />
          {unread > 0 && <span className="ij-stripe-notif-dot" />}
        </div>
      </div>
    </div>
  )
}
