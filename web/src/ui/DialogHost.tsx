import { useEffect, useMemo, useRef, useState } from 'react'
import { useDialog, closeDialog, type Dialog } from './dialogs'
import { useIde, fileName, parentOf } from '../ide/store'
import { Icon, fileIconName } from './Icon'
import { ACTIONS, actionText, runAction } from '../ide/actions'
import { analyze } from '../java/analyzer'
import { revealPosition } from '../ide/navigation'
import { getActiveEditor } from '../editor/editorRef'
import { renameJavaFile } from '../editor/rename'

function useEscape(onEsc: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onEsc()
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [onEsc])
}

const close = () => {
  closeDialog()
  getActiveEditor()?.focus()
}

/** IntelliJ's small "New ..." popups: title, one text field, optional kind list. */
function NamePopup({ title, initial = '', kinds, validate, onSubmit }: { title: string; initial?: string; kinds?: { id: string; label: string; icon: string }[]; validate: (name: string) => string | null; onSubmit: (name: string, kind?: string) => void }) {
  const [name, setName] = useState(initial)
  const [kind, setKind] = useState(0)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEscape(close)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const dot = initial.lastIndexOf('.')
    el.setSelectionRange(0, dot > 0 ? dot : initial.length)
  }, [initial])
  const error = touched ? validate(name.trim()) : null
  const submit = () => {
    setTouched(true)
    if (validate(name.trim())) return
    onSubmit(name.trim(), kinds?.[kind]?.id)
    closeDialog()
  }
  return (
    <div className="ij-overlay" onMouseDown={close}>
      <div className="ij-name-popup" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ij-popup-title">{title}</div>
        <div className="ij-popup-body">
          <input
            ref={inputRef}
            className={`ij-input${error ? ' error' : ''}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setTouched(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              else if (kinds && e.key === 'ArrowDown') {
                e.preventDefault()
                setKind((k) => (k + 1) % kinds.length)
              } else if (kinds && e.key === 'ArrowUp') {
                e.preventDefault()
                setKind((k) => (k - 1 + kinds.length) % kinds.length)
              }
            }}
            spellCheck={false}
          />
          {error && <div className="ij-input-error">{error}</div>}
          {kinds && (
            <div className="ij-kind-list">
              {kinds.map((k, i) => (
                <div key={k.id} className={`ij-list-row${i === kind ? ' selected' : ''}`} onMouseDown={() => setKind(i)} onDoubleClick={submit}>
                  <Icon name={k.icon} />
                  {k.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const JAVA_KINDS = [
  { id: 'class', label: 'Class', icon: 'nodes/class' },
  { id: 'interface', label: 'Interface', icon: 'nodes/interface' },
  { id: 'record', label: 'Record', icon: 'nodes/record' },
  { id: 'enum', label: 'Enum', icon: 'nodes/enum' },
  { id: 'annotation', label: 'Annotation', icon: 'nodes/annotation' },
  { id: 'exception', label: 'Exception', icon: 'nodes/exception' },
]

function javaTemplate(name: string, kind: string, pkg: string | null) {
  const head = pkg ? `package ${pkg};\n\n` : ''
  switch (kind) {
    case 'interface':
      return `${head}public interface ${name} {\n}\n`
    case 'record':
      return `${head}public record ${name}() {\n}\n`
    case 'enum':
      return `${head}public enum ${name} {\n}\n`
    case 'annotation':
      return `${head}public @interface ${name} {\n}\n`
    case 'exception':
      return `${head}public class ${name} extends Exception {\n}\n`
    default:
      return `${head}public class ${name} {\n}\n`
  }
}

/** package name for a directory under src/ */
function packageFor(dir: string) {
  if (!dir.startsWith('src')) return null
  const rest = dir.slice(4)
  return rest ? rest.replace(/\//g, '.') : null
}

function NewClassDialog({ dir }: { dir: string }) {
  const files = useIde((s) => s.files)
  const targetDir = dir.startsWith('src') ? dir : 'src'
  return (
    <NamePopup
      title="New Java Class"
      kinds={JAVA_KINDS}
      validate={(n) => {
        if (!n) return 'Name cannot be empty'
        const parts = n.split('.')
        if (!parts.every((p) => /^[A-Za-z_$][\w$]*$/.test(p))) return `'${n}' is not a valid Java qualified name`
        const path = `${targetDir}/${parts.join('/')}.java`
        if (path in files) return `Class '${parts[parts.length - 1]}' already exists`
        return null
      }}
      onSubmit={(n, kind = 'class') => {
        const parts = n.split('.')
        const cls = parts.pop()!
        const d = [targetDir, ...parts].join('/')
        const path = `${d}/${cls}.java`
        const s = useIde.getState()
        s.createFile(path, javaTemplate(cls, kind, packageFor(d)))
        s.openFile(path)
        s.select(path)
        // put the caret inside the class body, like IntelliJ
        requestAnimationFrame(() => {
          const ed = getActiveEditor()
          const model = ed?.getModel()
          if (!ed || !model) return
          const lines = model.getLineCount()
          ed.setPosition({ lineNumber: Math.max(1, lines - 1), column: model.getLineMaxColumn(Math.max(1, lines - 1)) })
          ed.focus()
        })
      }}
    />
  )
}

function SettingsDialog() {
  const theme = useIde((s) => s.theme)
  const [page, setPage] = useState<'appearance' | 'keymap' | 'about'>('appearance')
  useEscape(close)
  return (
    <div className="ij-overlay dim" onMouseDown={close}>
      <div className="ij-dialog ij-settings" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ij-dialog-title">Settings</div>
        <div className="ij-settings-body">
          <div className="ij-settings-nav">
            <div className="ij-settings-group">Appearance &amp; Behavior</div>
            <div className={`ij-list-row indent${page === 'appearance' ? ' selected' : ''}`} onClick={() => setPage('appearance')}>
              Appearance
            </div>
            <div className={`ij-list-row${page === 'keymap' ? ' selected' : ''}`} onClick={() => setPage('keymap')}>
              Keymap
            </div>
            <div className={`ij-list-row${page === 'about' ? ' selected' : ''}`} onClick={() => setPage('about')}>
              Advanced Settings
            </div>
          </div>
          <div className="ij-settings-page">
            {page === 'appearance' && (
              <>
                <div className="ij-settings-crumb">Appearance &amp; Behavior › Appearance</div>
                <label className="ij-form-row">
                  <span>Theme:</span>
                  <select className="ij-select" value={theme} onChange={(e) => useIde.getState().setTheme(e.target.value as typeof theme)}>
                    <option value="islands-dark">Islands Dark</option>
                    <option value="islands-light">Islands Light</option>
                  </select>
                </label>
              </>
            )}
            {page === 'keymap' && (
              <>
                <div className="ij-settings-crumb">Keymap</div>
                <div className="ij-form-row">
                  <span>Keymap:</span>
                  <select className="ij-select" disabled>
                    <option>Windows</option>
                  </select>
                </div>
                <div className="ij-keymap-list">
                  {Object.values(ACTIONS)
                    .filter((a) => a.shortcut)
                    .map((a) => (
                      <div key={a.id} className="ij-keymap-row">
                        <span>{actionText(a)}</span>
                        <span className="ij-shortcut-chip">{a.shortcut}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
            {page === 'about' && (
              <>
                <div className="ij-settings-crumb">Advanced Settings</div>
                <p className="ij-muted">Some browser shortcuts cannot be overridden by web pages (for example Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Shift+N). Use the main menu for those actions, or install the page as an app / use full screen.</p>
              </>
            )}
          </div>
        </div>
        <div className="ij-dialog-footer">
          <button className="ij-button" onClick={close}>
            Cancel
          </button>
          <button className="ij-button default" onClick={close}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

function AboutDialog() {
  useEscape(close)
  return (
    <div className="ij-overlay dim" onMouseDown={close}>
      <div className="ij-dialog ij-about" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ij-dialog-title">About</div>
        <div className="ij-about-body">
          <div className="ij-about-name">EProg Web IDE</div>
          <p>A practice environment for “Einführung in die Programmierung” at ETH Zürich that looks and behaves like IntelliJ IDEA.</p>
          <p className="ij-muted">Not affiliated with JetBrains. IntelliJ icons © JetBrains s.r.o., Apache License 2.0. Editor powered by Monaco (MIT).</p>
        </div>
        <div className="ij-dialog-footer">
          <button className="ij-button default" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function RecentFiles() {
  const recent = useIde((s) => s.recent)
  const files = useIde((s) => s.files)
  const list = recent.filter((p) => p in files)
  const [idx, setIdx] = useState(list.length > 1 ? 1 : 0)
  useEscape(close)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || (e.key === 'e' && e.ctrlKey)) setIdx((i) => (i + 1) % Math.max(1, list.length))
      else if (e.key === 'ArrowUp') setIdx((i) => (i - 1 + list.length) % Math.max(1, list.length))
      else if (e.key === 'Enter' && list[idx]) {
        useIde.getState().openFile(list[idx])
        closeDialog()
      } else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [idx, list])
  const tools: [string, string, string][] = [
    ['Project', 'toolwindows/project', 'ActivateProjectToolWindow'],
    ['Structure', 'toolwindows/structure', 'ActivateStructureToolWindow'],
    ['Run', 'toolwindows/run', 'ActivateRunToolWindow'],
    ['Problems', 'toolwindows/problems', 'ActivateProblemsViewToolWindow'],
    ['Terminal', 'toolwindows/terminal', 'ActivateTerminalToolWindow'],
    ['Notifications', 'toolwindows/notifications', 'ActivateNotificationsToolWindow'],
  ]
  return (
    <div className="ij-overlay" onMouseDown={close}>
      <div className="ij-recent-popup" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ij-popup-title">Recent Files</div>
        <div className="ij-recent-body">
          <div className="ij-recent-tools">
            {tools.map(([t, icon, action]) => (
              <div
                key={t}
                className="ij-list-row"
                onClick={() => {
                  closeDialog()
                  runAction(action)
                }}
              >
                <Icon name={icon} />
                {t}
              </div>
            ))}
          </div>
          <div className="ij-recent-files">
            {list.map((p, i) => (
              <div
                key={p}
                className={`ij-list-row${i === idx ? ' selected' : ''}`}
                onMouseEnter={() => setIdx(i)}
                onClick={() => {
                  useIde.getState().openFile(p)
                  closeDialog()
                }}
              >
                <Icon name={fileIconName(p, files[p])} />
                {fileName(p)}
              </div>
            ))}
          </div>
        </div>
        <div className="ij-popup-footer">{parentOf(list[idx] ?? '') ? `~/IdeaProjects/${useIde.getState().projectName}/${list[idx]}` : ''}</div>
      </div>
    </div>
  )
}

type SearchTab = Extract<Dialog, { kind: 'search' }>['tab']
interface SearchResult {
  key: string
  icon: string
  label: string
  secondary?: string
  shortcut?: string
  group: string
  run: () => void
}

function SearchEverywhere({ initialTab }: { initialTab: SearchTab }) {
  const [tab, setTab] = useState<SearchTab>(initialTab)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const files = useIde((s) => s.files)
  const inputRef = useRef<HTMLInputElement>(null)
  useEscape(close)
  useEffect(() => inputRef.current?.focus(), [])

  const results = useMemo(() => {
    const ql = q.toLowerCase()
    const match = (s: string) => {
      if (!ql) return true
      const sl = s.toLowerCase()
      if (sl.includes(ql)) return true
      // CamelHumps: "HW" matches "HelloWorld"
      const caps = s.replace(/[^A-Z]/g, '').toLowerCase()
      return caps.startsWith(ql)
    }
    const out: SearchResult[] = []
    const want = (g: SearchTab) => tab === 'all' || tab === g
    if (want('classes') || want('symbols')) {
      for (const [p, c] of Object.entries(files)) {
        if (!p.endsWith('.java')) continue
        const a = analyze(c)
        for (const cls of a.classes) {
          if (!cls.name) continue
          if (want('classes') && match(cls.name)) out.push({ key: `c:${p}:${cls.name}`, icon: fileIconName(p, c), label: cls.name, secondary: a.packageName ?? '(default package)', group: 'Classes', run: () => revealPosition(p, cls.line + 1, cls.col + 1) })
          if (want('symbols') && ql)
            for (const m of cls.members) if (match(m.name)) out.push({ key: `s:${p}:${m.name}:${m.line}`, icon: m.kind === 'field' ? 'nodes/field' : 'nodes/method', label: m.kind === 'field' ? m.name : `${m.name}${m.detail.replace(/:.*$/, '')}`, secondary: cls.name, group: 'Symbols', run: () => revealPosition(p, m.line + 1, m.col + 1) })
        }
      }
    }
    if (want('files')) {
      for (const p of Object.keys(files)) if (match(fileName(p))) out.push({ key: `f:${p}`, icon: fileIconName(p, files[p]), label: fileName(p), secondary: parentOf(p) || useIde.getState().projectName, group: 'Files', run: () => useIde.getState().openFile(p) })
    }
    if (want('actions') && (ql || tab === 'actions')) {
      for (const a of Object.values(ACTIONS)) {
        const t = actionText(a)
        if (match(t)) out.push({ key: `a:${a.id}`, icon: a.icon ?? '', label: t, shortcut: a.shortcut, group: 'Actions', run: () => runAction(a.id) })
      }
    }
    return out.slice(0, 200)
  }, [q, tab, files])

  useEffect(() => setIdx(0), [q, tab])

  const choose = (r: SearchResult | undefined) => {
    if (!r) return
    closeDialog()
    r.run()
  }

  const tabs: [SearchTab, string][] = [
    ['all', 'All'],
    ['classes', 'Classes'],
    ['files', 'Files'],
    ['symbols', 'Symbols'],
    ['actions', 'Actions'],
  ]

  return (
    <div className="ij-overlay" onMouseDown={close}>
      <div className="ij-search-popup" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ij-search-tabs">
          {tabs.map(([id, label]) => (
            <div key={id} className={`ij-search-tab${tab === id ? ' selected' : ''}`} onClick={() => setTab(id)}>
              {label}
            </div>
          ))}
        </div>
        <div className="ij-search-field">
          <Icon name="general/search" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'actions' ? 'Type action name' : ''}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setIdx((i) => Math.min(results.length - 1, i + 1))
              else if (e.key === 'ArrowUp') setIdx((i) => Math.max(0, i - 1))
              else if (e.key === 'Enter') choose(results[idx])
              else if (e.key === 'Tab') {
                const k = tabs.findIndex(([id]) => id === tab)
                setTab(tabs[(k + (e.shiftKey ? tabs.length - 1 : 1)) % tabs.length][0])
              } else return
              e.preventDefault()
            }}
            spellCheck={false}
          />
        </div>
        <div className="ij-search-results">
          {results.length === 0 ? (
            <div className="ij-empty-text">{q ? 'Nothing found.' : 'Type to search'}</div>
          ) : (
            results.map((r, i) => (
              <div key={r.key}>
                {tab === 'all' && (i === 0 || results[i - 1].group !== r.group) && <div className="ij-search-group">{r.group}</div>}
                <div className={`ij-list-row${i === idx ? ' selected' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => choose(r)}>
                  {r.icon ? <Icon name={r.icon} /> : <span style={{ width: 16 }} />}
                  <span>{r.label}</span>
                  {r.secondary && <span className="ij-list-secondary">{r.secondary}</span>}
                  {r.shortcut && <span className="ij-menu-shortcut">{r.shortcut}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function DialogHost() {
  const dialog = useDialog((s) => s.dialog)
  const files = useIde((s) => s.files)
  if (!dialog) return null
  switch (dialog.kind) {
    case 'new-class':
      return <NewClassDialog dir={dialog.dir} />
    case 'new-file':
      return (
        <NamePopup
          title="New File"
          validate={(n) => (!n ? 'Name cannot be empty' : `${dialog.dir ? dialog.dir + '/' : ''}${n}` in files ? 'A file with this name already exists' : /[\\:*?"<>|]/.test(n) ? 'Invalid file name' : null)}
          onSubmit={(n) => {
            const p = `${dialog.dir ? dialog.dir + '/' : ''}${n}`
            useIde.getState().createFile(p, '')
            useIde.getState().openFile(p)
          }}
        />
      )
    case 'new-dir':
      return (
        <NamePopup
          title="New Directory"
          validate={(n) => (!n ? 'Name cannot be empty' : /[\\:*?"<>|]/.test(n) ? 'Invalid directory name' : null)}
          onSubmit={(n) => {
            const p = `${dialog.dir ? dialog.dir + '/' : ''}${n}`
            useIde.getState().createDir(p)
            useIde.getState().toggleExpanded(dialog.dir, true)
          }}
        />
      )
    case 'rename': {
      const old = dialog.path
      const isJava = old.endsWith('.java')
      return (
        <NamePopup
          title={isJava ? 'Rename Class' : 'Rename'}
          initial={fileName(old)}
          validate={(n) => {
            if (!n) return 'Name cannot be empty'
            const p = `${parentOf(old) ? parentOf(old) + '/' : ''}${n}`
            if (p !== old && (p in files || useIde.getState().dirs.includes(p))) return 'A file with this name already exists'
            return null
          }}
          onSubmit={(n) => {
            const p = `${parentOf(old) ? parentOf(old) + '/' : ''}${n}`
            if (p === old) return
            // renaming a Java file renames the top-level class and its references, like IntelliJ's refactoring
            if (isJava) renameJavaFile(old, n)
            else useIde.getState().renamePath(old, p)
          }}
        />
      )
    }
    case 'settings':
      return <SettingsDialog />
    case 'about':
      return <AboutDialog />
    case 'recent-files':
      return <RecentFiles />
    case 'search':
      return <SearchEverywhere initialTab={dialog.tab} />
  }
}
