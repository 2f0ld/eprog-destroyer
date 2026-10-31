import { useIde, fileName } from './store'
import { findMainClasses, mainClassForFile, runMain, stopRun } from './runner'
import { getActiveEditor } from '../editor/editorRef'
import { openDialog } from '../ui/dialogs'

/**
 * Central action registry, like IntelliJ's ActionManager. Menus, keyboard
 * shortcuts and (later) Find Action all go through these ids.
 */

export interface Action {
  id: string
  text: string | (() => string)
  /** IntelliJ default keymap (Windows/Linux), display form */
  shortcut?: string
  icon?: string
  enabled?: () => boolean
  run: () => void
}

const editorAction = (id: string) => () => {
  const ed = getActiveEditor()
  if (!ed) return
  ed.focus()
  ed.trigger('menu', id, null)
}

const activeJavaMain = () => {
  const s = useIde.getState()
  if (!s.activeTab || !s.activeTab.endsWith('.java')) return null
  return mainClassForFile(s.activeTab, s.files[s.activeTab] ?? '')
}

export const ACTIONS: Record<string, Action> = {
  // ---- Run ----
  Run: {
    id: 'Run',
    text: () => `Run '${useIde.getState().runConfig ?? 'Main'}'`,
    shortcut: 'Shift+F10',
    icon: 'run/run',
    run: () => {
      const s = useIde.getState()
      const mains = findMainClasses(s.files)
      const cfg = s.runConfig && mains.some((m) => m.fqn === s.runConfig) ? s.runConfig : (activeJavaMain() ?? mains[0]?.fqn)
      if (cfg) runMain(cfg)
      else s.notify({ kind: 'warning', title: 'Nothing to run', body: 'No class with a main method was found in the project.' })
    },
  },
  RunClass: {
    id: 'RunClass',
    text: () => {
      const m = activeJavaMain()
      return m ? `Run '${m}.main()'` : 'Run Context Configuration'
    },
    shortcut: 'Ctrl+Shift+F10',
    icon: 'run/run',
    enabled: () => activeJavaMain() !== null,
    run: () => {
      const m = activeJavaMain()
      if (m) runMain(m)
    },
  },
  Stop: { id: 'Stop', text: 'Stop', shortcut: 'Ctrl+F2', icon: 'run/stop', enabled: () => useIde.getState().runState !== 'idle', run: () => void stopRun() },
  Debug: {
    id: 'Debug',
    text: () => `Debug '${useIde.getState().runConfig ?? 'Main'}'`,
    shortcut: 'Shift+F9',
    icon: 'run/debug',
    run: () => useIde.getState().notify({ kind: 'info', title: 'Debugger', body: 'The debugger is planned for a later milestone. Running without debugging instead.' }),
  },
  BuildProject: {
    id: 'BuildProject',
    text: 'Build Project',
    shortcut: 'Ctrl+F9',
    icon: 'toolwindows/build',
    run: () => ACTIONS.Run.run(),
  },

  // ---- Code ----
  ReformatCode: { id: 'ReformatCode', text: 'Reformat Code', shortcut: 'Ctrl+Alt+L', run: editorAction('editor.action.formatDocument') },
  CommentByLineComment: { id: 'CommentByLineComment', text: 'Comment with Line Comment', shortcut: 'Ctrl+/', run: editorAction('editor.action.commentLine') },
  CommentByBlockComment: { id: 'CommentByBlockComment', text: 'Comment with Block Comment', shortcut: 'Ctrl+Shift+/', run: editorAction('editor.action.blockComment') },
  CodeCompletion: { id: 'CodeCompletion', text: 'Basic', shortcut: 'Ctrl+Space', run: editorAction('editor.action.triggerSuggest') },
  ShowIntentionActions: { id: 'ShowIntentionActions', text: 'Show Context Actions', shortcut: 'Alt+Enter', run: editorAction('editor.action.quickFix') },
  MoveLineUp: { id: 'MoveLineUp', text: 'Move Line Up', shortcut: 'Alt+Shift+Up', run: editorAction('editor.action.moveLinesUpAction') },
  MoveLineDown: { id: 'MoveLineDown', text: 'Move Line Down', shortcut: 'Alt+Shift+Down', run: editorAction('editor.action.moveLinesDownAction') },
  CollapseAll: { id: 'CollapseAll', text: 'Collapse All', shortcut: 'Ctrl+Shift+Minus', run: editorAction('editor.foldAll') },
  ExpandAll: { id: 'ExpandAll', text: 'Expand All', shortcut: 'Ctrl+Shift+Plus', run: editorAction('editor.unfoldAll') },

  // ---- Edit ----
  Undo: { id: 'Undo', text: 'Undo', shortcut: 'Ctrl+Z', icon: 'general/undo', run: editorAction('undo') },
  Redo: { id: 'Redo', text: 'Redo', shortcut: 'Ctrl+Shift+Z', icon: 'general/redo', run: editorAction('redo') },
  Cut: { id: 'Cut', text: 'Cut', shortcut: 'Ctrl+X', icon: 'general/cut', run: editorAction('editor.action.clipboardCutAction') },
  Copy: { id: 'Copy', text: 'Copy', shortcut: 'Ctrl+C', icon: 'general/copy', run: editorAction('editor.action.clipboardCopyAction') },
  Paste: { id: 'Paste', text: 'Paste', shortcut: 'Ctrl+V', icon: 'general/paste', run: editorAction('editor.action.clipboardPasteAction') },
  Duplicate: { id: 'Duplicate', text: 'Duplicate Line or Selection', shortcut: 'Ctrl+D', run: editorAction('editor.action.copyLinesDownAction') },
  DeleteLine: { id: 'DeleteLine', text: 'Delete Line', shortcut: 'Ctrl+Y', run: editorAction('editor.action.deleteLines') },
  SelectAll: { id: 'SelectAll', text: 'Select All', shortcut: 'Ctrl+A', run: editorAction('editor.action.selectAll') },
  Find: { id: 'Find', text: 'Find...', shortcut: 'Ctrl+F', icon: 'general/search', run: editorAction('actions.find') },
  Replace: { id: 'Replace', text: 'Replace...', shortcut: 'Ctrl+R', run: editorAction('editor.action.startFindReplaceAction') },
  GotoLine: { id: 'GotoLine', text: 'Line/Column...', shortcut: 'Ctrl+G', run: editorAction('editor.action.gotoLine') },
  GotoDeclaration: { id: 'GotoDeclaration', text: 'Declaration or Usages', shortcut: 'Ctrl+B', run: editorAction('editor.action.revealDefinition') },

  // ---- File ----
  NewClass: { id: 'NewClass', text: 'Java Class', icon: 'nodes/class', run: () => openDialog({ kind: 'new-class', dir: 'src' }) },
  NewFile: { id: 'NewFile', text: 'File', icon: 'fileTypes/text', run: () => openDialog({ kind: 'new-file', dir: 'src' }) },
  NewDir: { id: 'NewDir', text: 'Directory', icon: 'nodes/folder', run: () => openDialog({ kind: 'new-dir', dir: '' }) },
  ShowSettings: { id: 'ShowSettings', text: 'Settings...', shortcut: 'Ctrl+Alt+S', icon: 'general/settings', run: () => openDialog({ kind: 'settings' }) },
  SaveAll: {
    id: 'SaveAll',
    text: 'Save All',
    shortcut: 'Ctrl+S',
    run: () => {
      /* everything is saved automatically, like IntelliJ */
    },
  },
  CloseContent: {
    id: 'CloseContent',
    text: 'Close Tab',
    shortcut: 'Ctrl+F4',
    run: () => {
      const s = useIde.getState()
      if (s.activeTab) s.closeTab(s.activeTab)
    },
  },
  CloseAllEditors: { id: 'CloseAllEditors', text: 'Close All Tabs', run: () => useIde.getState().closeAllTabs() },
  ResetProject: {
    id: 'ResetProject',
    text: 'Reset Sample Project...',
    run: () => {
      if (confirm('Reset the project to the sample files? Your changes will be lost.')) useIde.getState().resetProject()
    },
  },

  // ---- Navigate / tabs ----
  NextTab: {
    id: 'NextTab',
    text: 'Select Next Tab',
    shortcut: 'Alt+Right',
    run: () => {
      const s = useIde.getState()
      if (!s.activeTab || s.openTabs.length < 2) return
      s.openFile(s.openTabs[(s.openTabs.indexOf(s.activeTab) + 1) % s.openTabs.length])
    },
  },
  PreviousTab: {
    id: 'PreviousTab',
    text: 'Select Previous Tab',
    shortcut: 'Alt+Left',
    run: () => {
      const s = useIde.getState()
      if (!s.activeTab || s.openTabs.length < 2) return
      s.openFile(s.openTabs[(s.openTabs.indexOf(s.activeTab) - 1 + s.openTabs.length) % s.openTabs.length])
    },
  },
  RecentFiles: { id: 'RecentFiles', text: 'Recent Files', shortcut: 'Ctrl+E', run: () => openDialog({ kind: 'recent-files' }) },
  SearchEverywhere: { id: 'SearchEverywhere', text: 'Search Everywhere', shortcut: 'Double Shift', icon: 'general/search', run: () => openDialog({ kind: 'search', tab: 'all' }) },
  GotoFile: { id: 'GotoFile', text: 'File...', shortcut: 'Ctrl+Shift+N', run: () => openDialog({ kind: 'search', tab: 'files' }) },
  GotoClass: { id: 'GotoClass', text: 'Class...', shortcut: 'Ctrl+N', run: () => openDialog({ kind: 'search', tab: 'classes' }) },
  GotoAction: { id: 'GotoAction', text: 'Find Action...', shortcut: 'Ctrl+Shift+A', run: () => openDialog({ kind: 'search', tab: 'actions' }) },
  SelectInProjectView: {
    id: 'SelectInProjectView',
    text: 'Select in Project View',
    shortcut: 'Alt+F1',
    run: () => {
      const s = useIde.getState()
      if (!s.activeTab) return
      const parts = s.activeTab.split('/')
      for (let i = 1; i < parts.length; i++) s.toggleExpanded(parts.slice(0, i).join('/'), true)
      s.toggleExpanded('', true)
      s.select(s.activeTab)
      useIde.setState({ leftTool: 'project' })
    },
  },

  // ---- View / tool windows ----
  ActivateProjectToolWindow: { id: 'ActivateProjectToolWindow', text: 'Project', shortcut: 'Alt+1', icon: 'toolwindows/project', run: () => useIde.getState().toggleLeft('project') },
  ActivateCommitToolWindow: { id: 'ActivateCommitToolWindow', text: 'Commit', shortcut: 'Alt+0', icon: 'toolwindows/commit', run: () => useIde.getState().toggleLeft('commit') },
  ActivateStructureToolWindow: { id: 'ActivateStructureToolWindow', text: 'Structure', shortcut: 'Alt+7', icon: 'toolwindows/structure', run: () => useIde.getState().toggleLeft('structure') },
  ActivateRunToolWindow: { id: 'ActivateRunToolWindow', text: 'Run', shortcut: 'Alt+4', icon: 'toolwindows/run', run: () => useIde.getState().toggleBottom('run') },
  ActivateProblemsViewToolWindow: { id: 'ActivateProblemsViewToolWindow', text: 'Problems', shortcut: 'Alt+6', icon: 'toolwindows/problems', run: () => useIde.getState().toggleBottom('problems') },
  ActivateTerminalToolWindow: { id: 'ActivateTerminalToolWindow', text: 'Terminal', shortcut: 'Alt+F12', icon: 'toolwindows/terminal', run: () => useIde.getState().toggleBottom('terminal') },
  ActivateNotificationsToolWindow: { id: 'ActivateNotificationsToolWindow', text: 'Notifications', icon: 'toolwindows/notifications', run: () => useIde.getState().toggleRight('notifications') },
  HideActiveWindow: {
    id: 'HideActiveWindow',
    text: 'Hide Active Tool Window',
    shortcut: 'Shift+Escape',
    run: () => {
      const s = useIde.getState()
      if (s.bottomTool) useIde.setState({ bottomTool: null })
      else if (s.leftTool) useIde.setState({ leftTool: null })
      else if (s.rightTool) useIde.setState({ rightTool: null })
    },
  },
  HideAllWindows: {
    id: 'HideAllWindows',
    text: 'Hide All Tool Windows',
    shortcut: 'Ctrl+Shift+F12',
    run: () => {
      const s = useIde.getState()
      if (s.leftTool || s.bottomTool || s.rightTool) useIde.setState({ leftTool: null, bottomTool: null, rightTool: null })
      else useIde.setState({ leftTool: 'project' })
    },
  },
  ToggleTheme: {
    id: 'ToggleTheme',
    text: () => (useIde.getState().theme === 'islands-dark' ? 'Switch to Islands Light' : 'Switch to Islands Dark'),
    run: () => {
      const s = useIde.getState()
      s.setTheme(s.theme === 'islands-dark' ? 'islands-light' : 'islands-dark')
    },
  },
  About: {
    id: 'About',
    text: 'About',
    run: () => openDialog({ kind: 'about' }),
  },
  Keymap: { id: 'Keymap', text: 'Keyboard Shortcuts PDF', run: () => window.open('https://resources.jetbrains.com/storage/products/intellij-idea/docs/IntelliJIDEA_ReferenceCard.pdf', '_blank', 'noopener') },
}

export const actionText = (a: Action) => (typeof a.text === 'function' ? a.text() : a.text)

export function runAction(id: string) {
  const a = ACTIONS[id]
  if (!a) return
  if (a.enabled && !a.enabled()) return
  a.run()
}

export { fileName }
