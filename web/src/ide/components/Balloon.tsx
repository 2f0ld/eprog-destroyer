import { useEffect } from 'react'
import { useIde } from '../store'
import { Icon } from '../../ui/Icon'

const ICON = { info: 'status/info', warning: 'status/warning', error: 'status/error', success: 'edu/resultCorrect' } as const

/** IntelliJ's notification balloon (bottom right, above the status bar), hidden after a few seconds. */
export function Balloon() {
  const n = useIde((s) => s.balloon)
  // keep clear of an open right tool window (e.g. the Task window's Check button)
  const right = useIde((s) => (s.rightTool ? s.rightWidth + 64 : 56))
  useEffect(() => {
    if (!n) return
    const t = window.setTimeout(() => useIde.setState({ balloon: null }), n.actions?.length ? 10000 : 6000)
    return () => window.clearTimeout(t)
  }, [n])
  if (!n) return null
  return (
    <div className={`ij-balloon ij-balloon-${n.kind}`} key={n.id} style={{ right }}>
      <Icon name={ICON[n.kind]} />
      <div className="ij-balloon-content">
        <div className="ij-balloon-title">{n.title}</div>
        <div className="ij-balloon-body">{n.body}</div>
        {n.actions?.length ? (
          <div className="ij-balloon-actions">
            {n.actions.map((a) => (
              <a
                key={a.text}
                className="ij-link"
                onClick={() => {
                  useIde.setState({ balloon: null })
                  a.run()
                }}
              >
                {a.text}
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <button className="ij-icon-btn small" title="Close" onClick={() => useIde.setState({ balloon: null })}>
        <Icon name="general/closeSmall" />
      </button>
    </div>
  )
}
