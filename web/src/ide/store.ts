import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeId } from '../theme/uiThemes'
import type { Problem } from '../java/diagnostics'
import { DEFAULT_DIRS, DEFAULT_FILES, DEFAULT_IML, DEFAULT_PROJECT_NAME } from './defaultProject'

export type LeftTool = 'project' | 'structure' | 'commit'
export type BottomTool = 'run' | 'terminal' | 'problems'
export type RightTool = 'notifications'

export interface ConsoleLine {
  text: string
  type: 'system' | 'stdout' | 'stderr' | 'stdin' | 'exit'
}

export type RunState = 'idle' | 'compiling' | 'running'

export interface Notification {
  id: number
  title: string
  body: string
  kind: 'info' | 'warning' | 'error'
  time: number
}

interface IdeState {
  projectName: string
  files: Record<string, string>
  dirs: string[]
  openTabs: string[]
  activeTab: string | null
  /** recently activated files, most recent first (Ctrl+E) */
  recent: string[]
  expanded: string[]
  selectedNode: string | null

  theme: ThemeId
  /** Settings > Editor (IntelliJ defaults: JetBrains Mono 13, line height 1.2 scaled to 20px here) */
  editorSettings: { fontSize: number; softWraps: boolean; showWhitespaces: boolean }
  leftTool: LeftTool | null
  bottomTool: BottomTool | null
  rightTool: RightTool | null
  leftWidth: number
  bottomHeight: number
  rightWidth: number

  caret: { line: number; column: number; selection: number }
  runConfig: string | null // main class, e.g. "Main"
  runState: RunState
  console: ConsoleLine[]
  exitCode: number | null
  notifications: Notification[]
  /** compiler errors + inspections for all files (see ide/liveCheck.ts) */
  problems: Problem[]

  // file system
  writeFile(path: string, content: string): void
  createFile(path: string, content?: string): void
  createDir(path: string): void
  deletePath(path: string): void
  renamePath(from: string, to: string): void
  // tabs
  openFile(path: string): void
  closeTab(path: string): void
  closeOtherTabs(path: string): void
  closeAllTabs(): void
  // tree
  toggleExpanded(path: string, open?: boolean): void
  select(path: string | null): void
  // layout
  setTheme(t: ThemeId): void
  setEditorSettings(p: Partial<IdeState['editorSettings']>): void
  toggleLeft(t: LeftTool): void
  toggleBottom(t: BottomTool): void
  toggleRight(t: RightTool): void
  setSize(which: 'leftWidth' | 'bottomHeight' | 'rightWidth', px: number): void
  setCaret(c: IdeState['caret']): void
  // run
  setRunConfig(main: string | null): void
  setRunState(s: RunState): void
  clearConsole(): void
  appendConsole(line: ConsoleLine): void
  setExitCode(c: number | null): void
  setProblems(p: IdeState['problems']): void
  notify(n: Omit<Notification, 'id' | 'time'>): void
  dismissNotification(id: number): void
  resetProject(): void
}

const initialFiles = (name: string): Record<string, string> => ({
  ...DEFAULT_FILES,
  '.gitignore': 'out/\n.idea/workspace.xml\n',
  [`${name}.iml`]: DEFAULT_IML,
  '.idea/.gitignore': '# Default ignored files\n/shelf/\n/workspace.xml\n',
  '.idea/misc.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<project version="4">\n  <component name="ProjectRootManager" version="2" languageLevel="JDK_25" default="true" project-jdk-name="25" project-jdk-type="JavaSDK">\n    <output url="file://$PROJECT_DIR$/out" />\n  </component>\n</project>\n`,
  '.idea/modules.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<project version="4">\n  <component name="ProjectModuleManager">\n    <modules>\n      <module fileurl="file://$PROJECT_DIR$/${name}.iml" filepath="$PROJECT_DIR$/${name}.iml" />\n    </modules>\n  </component>\n</project>\n`,
})

const parentOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')

let notificationId = 1

export const useIde = create<IdeState>()(
  persist(
    (set, get) => ({
      projectName: DEFAULT_PROJECT_NAME,
      files: initialFiles(DEFAULT_PROJECT_NAME),
      dirs: DEFAULT_DIRS,
      openTabs: ['src/Main.java'],
      activeTab: 'src/Main.java',
      recent: ['src/Main.java'],
      expanded: ['', 'src'],
      selectedNode: 'src/Main.java',

      theme: 'islands-dark',
      editorSettings: { fontSize: 13, softWraps: false, showWhitespaces: false },
      leftTool: 'project',
      bottomTool: null,
      rightTool: null,
      leftWidth: 280,
      bottomHeight: 260,
      rightWidth: 320,

      caret: { line: 1, column: 1, selection: 0 },
      runConfig: 'Main',
      runState: 'idle',
      console: [],
      exitCode: null,
      notifications: [],
      problems: [],

      writeFile: (path, content) => set((s) => (s.files[path] === content ? s : { files: { ...s.files, [path]: content } })),
      createFile: (path, content = '') =>
        set((s) => {
          const dirs = new Set(s.dirs)
          for (let p = parentOf(path); p; p = parentOf(p)) dirs.add(p)
          return { files: { ...s.files, [path]: content }, dirs: [...dirs], expanded: [...new Set([...s.expanded, ...dirs])] }
        }),
      createDir: (path) => set((s) => ({ dirs: [...new Set([...s.dirs, path])] })),
      deletePath: (path) =>
        set((s) => {
          const isUnder = (p: string) => p === path || p.startsWith(path + '/')
          const files = Object.fromEntries(Object.entries(s.files).filter(([p]) => !isUnder(p)))
          const openTabs = s.openTabs.filter((p) => !isUnder(p))
          return {
            files,
            dirs: s.dirs.filter((d) => !isUnder(d)),
            openTabs,
            activeTab: s.activeTab && isUnder(s.activeTab) ? (openTabs[openTabs.length - 1] ?? null) : s.activeTab,
            recent: s.recent.filter((p) => !isUnder(p)),
          }
        }),
      renamePath: (from, to) =>
        set((s) => {
          const map = (p: string) => (p === from ? to : p.startsWith(from + '/') ? to + p.slice(from.length) : p)
          return {
            files: Object.fromEntries(Object.entries(s.files).map(([p, c]) => [map(p), c])),
            dirs: s.dirs.map(map),
            openTabs: s.openTabs.map(map),
            activeTab: s.activeTab && map(s.activeTab),
            recent: s.recent.map(map),
            selectedNode: s.selectedNode && map(s.selectedNode),
          }
        }),

      openFile: (path) =>
        set((s) => {
          if (!(path in s.files)) return s
          const openTabs = s.openTabs.includes(path) ? s.openTabs : [...s.openTabs, path]
          return { openTabs, activeTab: path, recent: [path, ...s.recent.filter((p) => p !== path)].slice(0, 30) }
        }),
      closeTab: (path) =>
        set((s) => {
          const idx = s.openTabs.indexOf(path)
          if (idx < 0) return s
          const openTabs = s.openTabs.filter((p) => p !== path)
          let activeTab = s.activeTab
          if (activeTab === path) {
            // IntelliJ activates the most recently used remaining tab
            activeTab = s.recent.find((p) => openTabs.includes(p)) ?? openTabs[Math.min(idx, openTabs.length - 1)] ?? null
          }
          return { openTabs, activeTab }
        }),
      closeOtherTabs: (path) => set({ openTabs: [path], activeTab: path }),
      closeAllTabs: () => set({ openTabs: [], activeTab: null }),

      toggleExpanded: (path, open) =>
        set((s) => {
          const isOpen = s.expanded.includes(path)
          const want = open ?? !isOpen
          if (want === isOpen) return s
          return { expanded: want ? [...s.expanded, path] : s.expanded.filter((p) => p !== path) }
        }),
      select: (path) => set({ selectedNode: path }),

      setTheme: (theme) => set({ theme }),
      setEditorSettings: (p) => set((s) => ({ editorSettings: { ...s.editorSettings, ...p } })),
      toggleLeft: (t) => set((s) => ({ leftTool: s.leftTool === t ? null : t })),
      toggleBottom: (t) => set((s) => ({ bottomTool: s.bottomTool === t ? null : t })),
      toggleRight: (t) => set((s) => ({ rightTool: s.rightTool === t ? null : t })),
      setSize: (which, px) => set({ [which]: px } as Partial<IdeState>),
      setCaret: (caret) => set({ caret }),

      setRunConfig: (runConfig) => set({ runConfig }),
      setRunState: (runState) => set({ runState }),
      clearConsole: () => set({ console: [], exitCode: null }),
      appendConsole: (line) =>
        set((s) => {
          // merge consecutive chunks of the same stream into lines like a real console
          const c = s.console.slice()
          const last = c[c.length - 1]
          if (last && last.type === line.type && !last.text.endsWith('\n') && (line.type === 'stdout' || line.type === 'stderr')) {
            c[c.length - 1] = { ...last, text: last.text + line.text }
          } else c.push(line)
          return { console: c.length > 5000 ? c.slice(-5000) : c }
        }),
      setExitCode: (exitCode) => set({ exitCode }),
      setProblems: (problems) => set({ problems }),
      notify: (n) => set((s) => ({ notifications: [{ ...n, id: notificationId++, time: Date.now() }, ...s.notifications].slice(0, 50) })),
      dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      resetProject: () => {
        const name = get().projectName
        set({ files: initialFiles(name), dirs: DEFAULT_DIRS, openTabs: ['src/Main.java'], activeTab: 'src/Main.java', recent: ['src/Main.java'], expanded: ['', 'src'] })
      },
    }),
    {
      name: 'eprog-ide',
      version: 1,
      partialize: (s) => ({
        projectName: s.projectName,
        files: s.files,
        dirs: s.dirs,
        openTabs: s.openTabs,
        activeTab: s.activeTab,
        recent: s.recent,
        expanded: s.expanded,
        theme: s.theme,
        editorSettings: s.editorSettings,
        leftTool: s.leftTool,
        bottomTool: s.bottomTool === 'run' ? null : s.bottomTool,
        rightTool: s.rightTool,
        leftWidth: s.leftWidth,
        bottomHeight: s.bottomHeight,
        rightWidth: s.rightWidth,
        runConfig: s.runConfig,
      }),
    },
  ),
)

export const fileName = (p: string) => p.slice(p.lastIndexOf('/') + 1)
export { parentOf }
