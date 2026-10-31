import { useEffect, useRef, useState } from 'react'
import { useIde, fileName } from '../store'
import { Icon, fileIconName } from '../../ui/Icon'
import { openMenu, type MenuItem } from '../../ui/Menu'
import { monaco, modelFor, pathForUri } from '../../editor/monacoSetup'
import { setActiveEditor } from '../../editor/editorRef'
import { DARK_EDITOR_THEME, LIGHT_EDITOR_THEME } from '../../theme/editorThemes'
import { uiThemes } from '../../theme/uiThemes'
import { analysisFor } from '../../java/semantic'
import { runMain } from '../runner'
import { runAction } from '../actions'
import { applyProblems, gotoProblem } from '../../editor/problemDecorations'
import { scheduleCheck } from '../liveCheck'
import { installInplaceRename } from '../../editor/rename'

function EditorTabs() {
  const openTabs = useIde((s) => s.openTabs)
  const activeTab = useIde((s) => s.activeTab)
  const files = useIde((s) => s.files)
  const { openFile, closeTab, closeOtherTabs, closeAllTabs } = useIde.getState()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector('.ij-editor-tab.selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeTab])

  const menu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    const items: MenuItem[] = [
      { type: 'item', text: 'Close', shortcut: 'Ctrl+F4', run: () => closeTab(path) },
      { type: 'item', text: 'Close Other Tabs', run: () => closeOtherTabs(path) },
      { type: 'item', text: 'Close All Tabs', run: () => closeAllTabs() },
      { type: 'separator' },
      { type: 'action', id: 'SelectInProjectView' },
    ]
    openMenu({ x: e.clientX, y: e.clientY, items })
  }

  return (
    <div className="ij-editor-tabs" ref={ref}>
      {openTabs.map((p) => (
        <div
          key={p}
          className={`ij-editor-tab${p === activeTab ? ' selected' : ''}`}
          title={`~/IdeaProjects/${useIde.getState().projectName}/${p}`}
          onMouseDown={(e) => {
            if (e.button === 0) openFile(p)
            if (e.button === 1) {
              e.preventDefault()
              closeTab(p)
            }
          }}
          onContextMenu={(e) => menu(e, p)}
        >
          <Icon name={fileIconName(p, files[p])} />
          <span className="ij-editor-tab-name">{fileName(p)}</span>
          <button
            className="ij-tab-close"
            title="Close  Ctrl+F4"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              closeTab(p)
            }}
          >
            <Icon name="general/closeSmall" />
          </button>
        </div>
      ))}
    </div>
  )
}

function EmptyEditor() {
  const rows: [string, string][] = [
    ['Search Everywhere', 'Double Shift'],
    ['Go to File', 'Ctrl+Shift+N'],
    ['Recent Files', 'Ctrl+E'],
    ['Navigation Bar', 'Alt+Home'],
    ['Drop files here to open them', ''],
  ]
  return (
    <div className="ij-editor-empty">
      <div>
        {rows.map(([t, k]) => (
          <div key={t} className="ij-editor-empty-row">
            <span>{t}</span>
            {k && <span className="ij-editor-empty-key">{k}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function InspectionWidget({ editor }: { editor: monaco.editor.IStandaloneCodeEditor | null }) {
  const active = useIde((s) => s.activeTab)
  const allProblems = useIde((s) => s.problems)
  const problems = allProblems.filter((p) => p.path === active)
  if (!active || !editor) return null
  const errors = problems.filter((p) => p.severity === 'error').length
  const warnings = problems.length - errors
  return (
    <div className="ij-inspection-widget">
      {problems.length === 0 ? (
        <span title="No problems found" className="ij-inspection-item">
          <Icon name="general/inspections/inspectionsOK" />
        </span>
      ) : (
        <>
          {errors > 0 && (
            <span className="ij-inspection-item" title={`${errors} error(s)`}>
              <Icon name="status/error" />
              {errors}
            </span>
          )}
          {warnings > 0 && (
            <span className="ij-inspection-item" title={`${warnings} warning(s)`}>
              <Icon name="status/warning" />
              {warnings}
            </span>
          )}
          <button className="ij-icon-btn small" title="Previous Highlighted Error  Shift+F2" onClick={() => gotoProblem(editor, allProblems, -1)}>
            <Icon name="general/chevronUp" />
          </button>
          <button className="ij-icon-btn small" title="Next Highlighted Error  F2" onClick={() => gotoProblem(editor, allProblems, 1)}>
            <Icon name="general/chevronDown" />
          </button>
        </>
      )}
    </div>
  )
}

export function EditorArea() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const activeTab = useIde((s) => s.activeTab)
  const theme = useIde((s) => s.theme)
  const problems = useIde((s) => s.problems)
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>())
  const runDecorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)

  // create the editor once
  useEffect(() => {
    const ed = monaco.editor.create(hostRef.current!, {
      model: null,
      theme: uiThemes[useIde.getState().theme].dark ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME,
      automaticLayout: true,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 20,
      fontLigatures: false,
      letterSpacing: 0,
      minimap: { enabled: false },
      glyphMargin: false,
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 22,
      folding: true,
      showFoldingControls: 'mouseover',
      renderLineHighlight: 'line',
      renderLineHighlightOnlyWhenFocus: false,
      cursorWidth: 2,
      cursorBlinking: 'blink',
      cursorSmoothCaretAnimation: 'off',
      rulers: [120],
      scrollBeyondLastLine: true,
      smoothScrolling: false,
      stickyScroll: { enabled: true, maxLineCount: 5 },
      guides: { indentation: true, highlightActiveIndentation: true, bracketPairs: false },
      bracketPairColorization: { enabled: false },
      matchBrackets: 'always',
      occurrencesHighlight: 'singleFile',
      selectionHighlight: true,
      renderWhitespace: 'none',
      tabCompletion: 'on',
      quickSuggestions: { other: true, comments: false, strings: false },
      quickSuggestionsDelay: 50,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      wordBasedSuggestions: 'off',
      // IntelliJ: Enter inserts, Tab replaces the rest of the identifier; the status bar hosts the lookup's advertiser line
      suggest: { showWords: false, preview: false, insertMode: 'insert', showStatusBar: true, filterGraceful: true, localityBonus: true, showInlineDetails: true },
      parameterHints: { enabled: true },
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoIndent: 'full',
      formatOnPaste: false,
      'semanticHighlighting.enabled': true,
      overviewRulerBorder: false,
      overviewRulerLanes: 2,
      hideCursorInOverviewRuler: true,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false, verticalSliderSize: 8, horizontalSliderSize: 8 },
      padding: { top: 6 },
      fixedOverflowWidgets: true,
      contextmenu: false,
      links: false,
      lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.OnCode },
      unicodeHighlight: { ambiguousCharacters: false },
      inlayHints: { enabled: 'off' },
      dragAndDrop: true,
      mouseWheelZoom: false,
      emptySelectionClipboard: true, // IntelliJ copies the whole line with no selection
    })
    setActiveEditor(ed)
    setEditor(ed)

    // IntelliJ-specific editing actions
    ed.addAction({
      id: 'ij.completeStatement',
      label: 'Complete Current Statement',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: (e) => completeStatement(e),
    })
    ed.addAction({
      id: 'ij.startNewLine',
      label: 'Start New Line',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: (e) => {
        const pos = e.getPosition()!
        const model = e.getModel()!
        e.setPosition({ lineNumber: pos.lineNumber, column: model.getLineMaxColumn(pos.lineNumber) })
        e.trigger('ij', 'type', { text: '\n' })
      },
    })
    // lookup: Ctrl+. chooses the selected item and inserts a dot (advertised in the popup's footer)
    ed.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period,
      () => {
        ed.trigger('ij', 'acceptSelectedSuggestion', null)
        ed.trigger('ij', 'type', { text: '.' })
      },
      'suggestWidgetVisible',
    )
    ed.addAction({
      id: 'ij.nextHighlightedError',
      label: 'Next Highlighted Error',
      keybindings: [monaco.KeyCode.F2],
      run: (e) => gotoProblem(e, useIde.getState().problems, 1),
    })
    ed.addAction({
      id: 'ij.previousHighlightedError',
      label: 'Previous Highlighted Error',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F2],
      run: (e) => gotoProblem(e, useIde.getState().problems, -1),
    })
    ed.addAction({
      id: 'ij.startNewLineBefore',
      label: 'Start New Line Before Current',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.Enter],
      run: (e) => e.trigger('ij', 'editor.action.insertLineBefore', null),
    })

    const disposeRename = installInplaceRename(ed)

    const cursorSub = ed.onDidChangeCursorSelection((ev) => {
      const sel = ev.selection
      const model = ed.getModel()
      const len = model && !sel.isEmpty() ? model.getValueInRange(sel).length : 0
      useIde.getState().setCaret({ line: sel.positionLineNumber, column: sel.positionColumn, selection: len })
    })

    let writeTimer: number | undefined
    const contentSub = ed.onDidChangeModelContent(() => {
      const model = ed.getModel()
      if (!model) return
      const path = pathForUri(model.uri)
      window.clearTimeout(writeTimer)
      if (model.getLanguageId() === 'java') scheduleCheck()
      writeTimer = window.setTimeout(() => useIde.getState().writeFile(path, model.getValue()), 250)
      updateRunGutter()
    })

    const updateRunGutter = () => {
      const model = ed.getModel()
      if (!model || model.getLanguageId() !== 'java') {
        runDecorations.current?.clear()
        return
      }
      const a = analysisFor(model)
      const decos: monaco.editor.IModelDeltaDecoration[] = []
      for (const c of a.classes) {
        if (!c.hasMain || !c.name) continue
        decos.push({ range: new monaco.Range(c.line + 1, 1, c.line + 1, 1), options: { linesDecorationsClassName: 'ij-gutter-run', linesDecorationsTooltip: 'Run' } })
        const main = c.members.find((m) => m.isMain)
        if (main) decos.push({ range: new monaco.Range(main.line + 1, 1, main.line + 1, 1), options: { linesDecorationsClassName: 'ij-gutter-run', linesDecorationsTooltip: 'Run' } })
      }
      if (!runDecorations.current) runDecorations.current = ed.createDecorationsCollection(decos)
      else runDecorations.current.set(decos)
    }
    const modelSub = ed.onDidChangeModel(updateRunGutter)

    const mouseSub = ed.onMouseDown((e) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS) return
      const el = e.target.element
      if (!el?.classList.contains('ij-gutter-run')) return
      const model = ed.getModel()
      if (!model) return
      const a = analysisFor(model)
      const c = a.classes.find((x) => x.hasMain)
      if (!c) return
      const fqn = a.packageName ? `${a.packageName}.${c.name}` : c.name
      const r = el.getBoundingClientRect()
      openMenu({
        x: r.left,
        y: r.bottom + 2,
        items: [
          { type: 'item', text: `Run '${fqn}.main()'`, icon: 'run/run', shortcut: 'Ctrl+Shift+F10', run: () => runMain(fqn) },
          { type: 'item', text: `Debug '${fqn}.main()'`, icon: 'run/debug', run: () => runAction('Debug') },
          { type: 'item', text: `Run '${fqn}.main()' with Coverage`, icon: 'run/runWithCoverage', disabled: true, run: () => {} },
          { type: 'separator' },
          { type: 'item', text: `Modify Run Configuration...`, disabled: true, run: () => {} },
        ],
      })
    })

    // editor context menu, IntelliJ style
    const ctxSub = ed.onContextMenu((e) => {
      e.event.preventDefault()
      const model = ed.getModel()
      const items: MenuItem[] = [
        { type: 'action', id: 'ShowIntentionActions' },
        { type: 'submenu', text: 'Go To', items: [{ type: 'action', id: 'GotoDeclaration' }, { type: 'action', id: 'GotoLine' }] },
        { type: 'separator' },
        { type: 'action', id: 'Cut' },
        { type: 'action', id: 'Copy' },
        { type: 'action', id: 'Paste' },
        { type: 'separator' },
        { type: 'submenu', text: 'Folding', items: [{ type: 'action', id: 'CollapseAll' }, { type: 'action', id: 'ExpandAll' }] },
        { type: 'action', id: 'ReformatCode' },
        { type: 'action', id: 'CommentByLineComment' },
      ]
      if (model && model.getLanguageId() === 'java' && analysisFor(model).classes.some((c) => c.hasMain)) {
        items.push({ type: 'separator' }, { type: 'action', id: 'RunClass' })
      }
      openMenu({ x: e.event.posx, y: e.event.posy, items })
    })

    return () => {
      disposeRename()
      cursorSub.dispose()
      contentSub.dispose()
      modelSub.dispose()
      mouseSub.dispose()
      ctxSub.dispose()
      setActiveEditor(null)
      ed.dispose()
    }
  }, [])

  // switch models when the active tab changes
  useEffect(() => {
    if (!editor) return
    const prev = editor.getModel()
    if (prev) viewStates.current.set(pathForUri(prev.uri), editor.saveViewState())
    if (!activeTab) {
      editor.setModel(null)
      return
    }
    const content = useIde.getState().files[activeTab] ?? ''
    const model = modelFor(activeTab, content)
    if (editor.getModel() !== model) {
      editor.setModel(model)
      const vs = viewStates.current.get(activeTab)
      if (vs) editor.restoreViewState(vs)
      editor.focus()
    }
  }, [editor, activeTab])

  // keep models in sync with the store: dispose deleted files, apply external changes (e.g. project reset).
  // Editor typing reaches the store via the debounced writeFile above, so the values match then.
  useEffect(
    () =>
      useIde.subscribe((s, prev) => {
        if (s.files === prev.files) return
        for (const m of monaco.editor.getModels()) {
          if (m.uri.scheme !== 'file') continue
          const p = pathForUri(m.uri)
          if (!(p in s.files)) m.dispose()
          else if (s.files[p] !== prev.files[p] && s.files[p] !== m.getValue()) {
            m.pushEditOperations([], [{ range: m.getFullModelRange(), text: s.files[p] }], () => null)
          }
        }
      }),
    [],
  )

  // theme
  useEffect(() => {
    monaco.editor.setTheme(uiThemes[theme].dark ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME)
  }, [theme])

  // compiler errors and inspections -> decorations (see editor/problemDecorations.ts)
  useEffect(() => applyProblems(problems), [problems, activeTab])

  return (
    <div className="ij-editor-island">
      <EditorTabs />
      <div className="ij-editor-body">
        <div ref={hostRef} className="ij-monaco-host" style={{ visibility: activeTab ? 'visible' : 'hidden' }} />
        {!activeTab && <EmptyEditor />}
        <InspectionWidget editor={activeTab ? editor : null} />
      </div>
    </div>
  )
}

/** IntelliJ's Ctrl+Shift+Enter: finish the current statement and move to the next line. */
function completeStatement(e: monaco.editor.ICodeEditor) {
  const model = e.getModel()
  const pos = e.getPosition()
  if (!model || !pos) return
  const line = model.getLineContent(pos.lineNumber)
  const trimmed = line.trimEnd()
  const end = model.getLineMaxColumn(pos.lineNumber)
  // balance unclosed parentheses first
  let open = 0
  for (const ch of trimmed) {
    if (ch === '(') open++
    else if (ch === ')') open--
  }
  let insert = open > 0 ? ')'.repeat(open) : ''
  const t = trimmed.trim()
  const isBlockHeader = /^(if|for|while|switch|else if|catch|synchronized)\b/.test(t) || /^(public|private|protected|static|final|abstract|class|interface|enum|record|void|[A-Z][\w<>,\s[\]]*\s+\w+\s*\()/.test(t) && /\)\s*$/.test(t + insert) && !/;$/.test(t) && !/=/.test(t)
  if (/[;{}]$/.test(t)) insert = ''
  else if (/^(else|try|do|finally)$/.test(t) || isBlockHeader || /\b(class|interface|enum|record)\s+\w+/.test(t)) insert += ' {'
  else if (t.length) insert += ';'
  if (insert.endsWith('{')) {
    const indent = /^\s*/.exec(line)![0]
    insert += `\n${indent}}`
  }
  e.executeEdits('ij', [{ range: new monaco.Range(pos.lineNumber, end, pos.lineNumber, end), text: insert }])
  e.setPosition({ lineNumber: pos.lineNumber, column: model.getLineMaxColumn(pos.lineNumber) })
  e.trigger('ij', 'type', { text: '\n' })
}
