import { useMemo, useRef } from 'react'
import { useIde, fileName, parentOf } from '../store'
import { Icon, fileIconName } from '../../ui/Icon'
import { ToolWindow } from './ToolWindow'
import { openMenu, type MenuItem } from '../../ui/Menu'
import { openDialog } from '../../ui/dialogs'
import { mainClassForFile, runMain } from '../runner'
import { runAction } from '../actions'

interface Row {
  id: string
  depth: number
  label: string
  secondary?: string
  icon: string
  overlay?: 'runnable'
  bold?: boolean
  expandable: boolean
  expanded: boolean
  path?: string // project path for files/dirs
  isDir?: boolean
}

const VIRTUAL_EXT = '#ext'
const VIRTUAL_JDK = '#ext/jdk'
const VIRTUAL_SCRATCH = '#scratch'

function sortEntries(a: string, b: string) {
  return a.localeCompare(b, 'en', { sensitivity: 'base' })
}

export function ProjectView() {
  const files = useIde((s) => s.files)
  const dirs = useIde((s) => s.dirs)
  const expanded = useIde((s) => s.expanded)
  const selected = useIde((s) => s.selectedNode)
  const projectName = useIde((s) => s.projectName)
  const { toggleExpanded, select, openFile } = useIde.getState()
  const listRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => {
    const out: Row[] = []
    const allDirs = new Set(dirs)
    for (const p of Object.keys(files)) for (let d = parentOf(p); d; d = parentOf(d)) allDirs.add(d)
    const exp = new Set(expanded)

    const walk = (dir: string, depth: number) => {
      const childDirs = [...allDirs].filter((d) => parentOf(d) === dir && d !== dir).sort(sortEntries)
      const childFiles = Object.keys(files).filter((f) => parentOf(f) === dir).sort((a, b) => sortEntries(fileName(a), fileName(b)))
      for (const d of childDirs) {
        const isExp = exp.has(d)
        out.push({ id: d, depth, label: fileName(d), icon: d === 'src' ? 'nodes/sourceRoot' : 'nodes/folder', expandable: true, expanded: isExp, path: d, isDir: true })
        if (isExp) walk(d, depth + 1)
      }
      for (const f of childFiles) {
        const isJava = f.endsWith('.java')
        const runnable = isJava && mainClassForFile(f, files[f]) !== null
        out.push({ id: f, depth, label: isJava ? fileName(f).slice(0, -5) : fileName(f), icon: fileIconName(f, files[f]), overlay: runnable ? 'runnable' : undefined, expandable: false, expanded: false, path: f })
      }
    }

    const rootExp = exp.has('')
    out.push({ id: '', depth: 0, label: projectName, secondary: `~/IdeaProjects/${projectName}`, icon: 'nodes/folder', bold: true, expandable: true, expanded: rootExp, path: '', isDir: true })
    if (rootExp) walk('', 1)
    const extExp = exp.has(VIRTUAL_EXT)
    out.push({ id: VIRTUAL_EXT, depth: 0, label: 'External Libraries', icon: 'nodes/library', expandable: true, expanded: extExp })
    if (extExp) out.push({ id: VIRTUAL_JDK, depth: 1, label: '< 25 >', secondary: '/usr/lib/jvm/java-25-openjdk', icon: 'nodes/jdk', expandable: false, expanded: false })
    out.push({ id: VIRTUAL_SCRATCH, depth: 0, label: 'Scratches and Consoles', icon: 'fileTypes/scratches', expandable: false, expanded: false })
    return out
  }, [files, dirs, expanded, projectName])

  const activate = (r: Row) => {
    if (r.expandable) toggleExpanded(r.id)
    else if (r.path !== undefined && r.path in files) openFile(r.path)
  }

  const contextMenu = (e: React.MouseEvent, r: Row) => {
    e.preventDefault()
    select(r.id)
    if (r.path === undefined) return
    const dir = r.isDir ? r.path : parentOf(r.path)
    const items: MenuItem[] = [
      {
        type: 'submenu',
        text: 'New',
        items: [
          { type: 'item', text: 'Java Class', icon: 'nodes/class', run: () => openDialog({ kind: 'new-class', dir }) },
          { type: 'item', text: 'File', icon: 'fileTypes/text', run: () => openDialog({ kind: 'new-file', dir }) },
          { type: 'item', text: 'Directory', icon: 'nodes/folder', run: () => openDialog({ kind: 'new-dir', dir }) },
        ],
      },
      { type: 'separator' },
      { type: 'item', text: 'Copy Path/Reference...', shortcut: 'Ctrl+Shift+C', run: () => navigator.clipboard?.writeText(`/home/student/IdeaProjects/${projectName}/${r.path}`) },
      { type: 'separator' },
      { type: 'item', text: 'Rename...', shortcut: 'Shift+F6', disabled: r.path === '', run: () => openDialog({ kind: 'rename', path: r.path! }) },
      {
        type: 'item',
        text: 'Delete...',
        icon: 'general/delete',
        shortcut: 'Delete',
        disabled: r.path === '',
        run: () => {
          if (confirm(`Delete ${r.isDir ? 'directory' : 'file'} "${fileName(r.path!)}"?`)) useIde.getState().deletePath(r.path!)
        },
      },
    ]
    if (!r.isDir && r.path.endsWith('.java')) {
      const main = mainClassForFile(r.path, files[r.path])
      if (main) items.push({ type: 'separator' }, { type: 'item', text: `Run '${main}.main()'`, icon: 'run/run', shortcut: 'Ctrl+Shift+F10', run: () => runMain(main) })
    }
    openMenu({ x: e.clientX, y: e.clientY, items })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = rows.findIndex((r) => r.id === selected)
    const cur = rows[idx]
    const go = (i: number) => {
      const r = rows[Math.max(0, Math.min(rows.length - 1, i))]
      select(r.id)
      listRef.current?.querySelector(`[data-row="${CSS.escape(r.id)}"]`)?.scrollIntoView({ block: 'nearest' })
    }
    if (e.key === 'ArrowDown') go(idx + 1)
    else if (e.key === 'ArrowUp') go(idx - 1)
    else if (e.key === 'ArrowRight' && cur) {
      if (cur.expandable && !cur.expanded) toggleExpanded(cur.id, true)
      else go(idx + 1)
    } else if (e.key === 'ArrowLeft' && cur) {
      if (cur.expandable && cur.expanded) toggleExpanded(cur.id, false)
      else {
        for (let k = idx - 1; k >= 0; k--) if (rows[k].depth < cur.depth) return go(k)
      }
    } else if (e.key === 'Enter' && cur) activate(cur)
    else if (e.key === 'F4' && cur) activate(cur)
    else if (e.key === 'Delete' && cur?.path) {
      if (confirm(`Delete "${fileName(cur.path)}"?`)) useIde.getState().deletePath(cur.path)
    } else if (e.key === 'F6' && e.shiftKey && cur?.path) openDialog({ kind: 'rename', path: cur.path })
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <ToolWindow
      title="Project"
      titleDropdown
      onHide={() => useIde.setState({ leftTool: null })}
      actions={[
        { icon: 'general/locate', title: 'Select Opened File  Alt+F1', onClick: () => runAction('SelectInProjectView') },
        {
          icon: 'general/expandAll',
          title: 'Expand All  Ctrl+NumPad +',
          onClick: () => {
            const all = new Set([...useIde.getState().dirs, '', VIRTUAL_EXT])
            for (const p of Object.keys(files)) for (let d = parentOf(p); d; d = parentOf(d)) all.add(d)
            useIde.setState({ expanded: [...all] })
          },
        },
        { icon: 'general/collapseAll', title: 'Collapse All  Ctrl+NumPad -', onClick: () => useIde.setState({ expanded: [] }) },
      ]}
    >
      <div className="ij-tree" tabIndex={0} ref={listRef} onKeyDown={onKeyDown}>
        {rows.map((r) => (
          <div
            key={r.id}
            data-row={r.id}
            className={`ij-tree-row${selected === r.id ? ' selected' : ''}`}
            style={{ paddingLeft: 8 + r.depth * 20 }}
            onMouseDown={() => select(r.id)}
            onDoubleClick={() => activate(r)}
            onContextMenu={(e) => contextMenu(e, r)}
          >
            <span
              className="ij-tree-chevron"
              onMouseDown={(e) => {
                if (r.expandable) {
                  e.stopPropagation()
                  select(r.id)
                  toggleExpanded(r.id)
                }
              }}
            >
              {r.expandable && <Icon name={r.expanded ? 'general/chevronDown' : 'general/chevronRight'} />}
            </span>
            <span className="ij-tree-icon">
              <Icon name={r.icon} />
              {r.overlay === 'runnable' && <Icon name="nodes/runnableMark" className="ij-tree-overlay" />}
            </span>
            <span className={`ij-tree-label${r.bold ? ' bold' : ''}`}>{r.label}</span>
            {r.secondary && <span className="ij-tree-secondary">{r.secondary}</span>}
          </div>
        ))}
      </div>
    </ToolWindow>
  )
}
