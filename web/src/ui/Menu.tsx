import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { ACTIONS, actionText } from '../ide/actions'
import { Icon } from './Icon'

export type MenuItem =
  | { type: 'action'; id: string; text?: string }
  | { type: 'item'; text: string; icon?: string; shortcut?: string; disabled?: boolean; checked?: boolean; run: () => void }
  | { type: 'separator' }
  | { type: 'submenu'; text: string; icon?: string; items: MenuItem[] }

interface OpenMenu {
  x: number
  y: number
  items: MenuItem[]
  /** element that opened the menu; clicks on it toggle instead of reopening */
  anchor?: HTMLElement | null
  minWidth?: number
  /** popup title, e.g. "Generate" */
  title?: string
}

export const useMenu = create<{ menu: OpenMenu | null }>(() => ({ menu: null }))
export const openMenu = (m: OpenMenu) => useMenu.setState({ menu: m })
export const closeMenu = () => useMenu.setState({ menu: null })

/** Open a menu below an element (toggle if it's already open from that element). */
export function openMenuBelow(el: HTMLElement, items: MenuItem[], minWidth?: number) {
  const cur = useMenu.getState().menu
  if (cur?.anchor === el) return closeMenu()
  const r = el.getBoundingClientRect()
  openMenu({ x: r.left, y: r.bottom + 4, items, anchor: el, minWidth })
}

interface Resolved {
  kind: 'item' | 'separator' | 'submenu'
  text: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  checked?: boolean
  run?: () => void
  items?: MenuItem[]
}

function resolve(item: MenuItem): Resolved {
  switch (item.type) {
    case 'separator':
      return { kind: 'separator', text: '' }
    case 'submenu':
      return { kind: 'submenu', text: item.text, icon: item.icon, items: item.items }
    case 'item':
      return { kind: 'item', ...item }
    case 'action': {
      const a = ACTIONS[item.id]
      if (!a) return { kind: 'item', text: `<${item.id}>`, disabled: true }
      return { kind: 'item', text: item.text ?? actionText(a), icon: a.icon, shortcut: a.shortcut, disabled: a.enabled ? !a.enabled() : false, run: a.run }
    }
  }
}

function MenuPanel({ items, x, y, minWidth, onClose, depth, parentRect, title }: { items: MenuItem[]; x: number; y: number; minWidth?: number; onClose: () => void; depth: number; parentRect?: DOMRect; title?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [active, setActive] = useState(-1)
  const [sub, setSub] = useState<{ index: number; rect: DOMRect } | null>(null)
  const resolved = items.map(resolve)
  const hasIcons = resolved.some((r) => r.icon || r.checked !== undefined)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let nx = x
    let ny = y
    if (nx + r.width > window.innerWidth - 4) nx = parentRect ? parentRect.left - r.width + 4 : window.innerWidth - r.width - 4
    if (ny + r.height > window.innerHeight - 4) ny = Math.max(4, window.innerHeight - r.height - 4)
    setPos({ x: Math.max(4, nx), y: ny })
  }, [x, y, parentRect])

  useEffect(() => {
    if (depth > 0) return
    const onKey = (e: KeyboardEvent) => {
      const selectable = resolved.map((r, i) => (r.kind !== 'separator' && !r.disabled ? i : -1)).filter((i) => i >= 0)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        if (!selectable.length) return
        const k = selectable.indexOf(active)
        const n = e.key === 'ArrowDown' ? selectable[(k + 1) % selectable.length] : selectable[(k - 1 + selectable.length) % selectable.length]
        setActive(n)
      } else if (e.key === 'Enter' && active >= 0) {
        e.preventDefault()
        e.stopPropagation()
        const r = resolved[active]
        if (r.kind === 'item' && !r.disabled) {
          onClose()
          r.run?.()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <>
      <div ref={ref} className="ij-menu" style={{ left: pos.x, top: pos.y, minWidth }} onMouseDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
        {title && <div className="ij-menu-title">{title}</div>}
        {resolved.map((r, i) =>
          r.kind === 'separator' ? (
            <div key={i} className="ij-menu-sep" />
          ) : (
            <div
              key={i}
              className={`ij-menu-item${active === i ? ' active' : ''}${r.disabled ? ' disabled' : ''}`}
              onMouseEnter={(e) => {
                setActive(i)
                if (r.kind === 'submenu') setSub({ index: i, rect: e.currentTarget.getBoundingClientRect() })
                else setSub(null)
              }}
              onClick={(e) => {
                if (r.disabled) return
                if (r.kind === 'submenu') {
                  setSub({ index: i, rect: e.currentTarget.getBoundingClientRect() })
                  return
                }
                onClose()
                r.run?.()
              }}
            >
              {hasIcons && <span className="ij-menu-icon">{r.checked ? <Icon name="general/greenCheckmark" /> : r.icon ? <Icon name={r.icon} /> : null}</span>}
              <span className="ij-menu-text">{r.text}</span>
              {r.shortcut && <span className="ij-menu-shortcut">{r.shortcut}</span>}
              {r.kind === 'submenu' && <Icon name="general/chevronRight" className="ij-menu-chevron" />}
            </div>
          ),
        )}
      </div>
      {sub && resolved[sub.index]?.items && (
        <MenuPanel items={resolved[sub.index].items!} x={sub.rect.right - 2} y={sub.rect.top - 6} onClose={onClose} depth={depth + 1} parentRect={sub.rect} />
      )}
    </>
  )
}

export function MenuHost() {
  const menu = useMenu((s) => s.menu)
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (menu.anchor && menu.anchor.contains(e.target as Node)) return
      closeMenu()
    }
    const onBlur = () => closeMenu()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onBlur)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onBlur)
    }
  }, [menu])
  if (!menu) return null
  return <MenuPanel key={`${menu.x},${menu.y}`} items={menu.items} x={menu.x} y={menu.y} minWidth={menu.minWidth} onClose={closeMenu} depth={0} title={menu.title} />
}
