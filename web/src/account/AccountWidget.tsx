import './account.css'
import { openMenuBelow } from '../ui/Menu'
import { logOut, useAccount } from './bootstrap'
import { flushState } from './serverStorage'
import { initials } from './initials'

/** Account avatar at the right end of the main toolbar, like the JetBrains account widget. */
export function AccountWidget() {
  const email = useAccount((s) => s.email)
  if (!email) return null
  return (
    <button
      className="ij-tb-icon ij-account-widget"
      title={email}
      aria-label="Account"
      onClick={(e) =>
        openMenuBelow(
          e.currentTarget,
          [
            { type: 'item', text: email, disabled: true, run: () => {} },
            { type: 'separator' },
            {
              type: 'item',
              text: 'Manage Account...',
              run: () => void flushState().then(() => (location.href = '/account')),
            },
            { type: 'item', text: 'Log Out', icon: 'general/exit', run: () => void logOut() },
          ],
          220,
        )
      }
    >
      <span className="ij-account-avatar">{initials(email)}</span>
    </button>
  )
}
