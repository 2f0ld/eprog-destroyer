import { useIde, PLAYGROUND, playgroundWorkspace, type Workspace } from '../ide/store'
import { DEFAULT_IML } from '../ide/defaultProject'
import { currentJavaFiles, checkNow } from '../ide/liveCheck'
import { getActiveEditor } from '../editor/editorRef'
import { pathForUri } from '../editor/monacoSetup'
import { TASKS, taskById, lessonOf, LESSONS } from './catalog'
import { useTasks } from './progress'
import { runCheck } from './checker'
import { completedSteps, textsOf, type Task } from './model'
import { revealPosition } from '../ide/navigation'
import { newlyUnlocked } from './mountain'

export const taskProjectId = (id: string) => `task:${id}`

/** The task whose project is open, if any. */
export function currentTask(projectId = useIde.getState().projectId): Task | null {
  return projectId.startsWith('task:') ? (taskById.get(projectId.slice(5)) ?? null) : null
}

/** Write what is in the editor to the store before switching projects. */
function flushEditor() {
  const m = getActiveEditor()?.getModel()
  if (m && !m.isDisposed()) useIde.getState().writeFile(pathForUri(m.uri), m.getValue())
}

function taskWorkspace(t: Task, files = t.files): Workspace {
  const name = t.project
  return {
    projectName: name,
    files: {
      ...files,
      '.gitignore': 'out/\n.idea/workspace.xml\n',
      [`${name}.iml`]: DEFAULT_IML,
      '.idea/misc.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<project version="4">\n  <component name="ProjectRootManager" version="2" languageLevel="JDK_25" default="true" project-jdk-name="25" project-jdk-type="JavaSDK">\n    <output url="file://$PROJECT_DIR$/out" />\n  </component>\n</project>\n`,
    },
    dirs: ['.idea', 'src'],
    openTabs: [t.openFile],
    activeTab: t.openFile,
    recent: [t.openFile],
    expanded: ['', 'src'],
    selectedNode: t.openFile,
    runConfig: t.mainClass,
  }
}

/** Open a task as its own project (like opening a course task in IntelliJ). */
export function openTask(id: string) {
  const t = taskById.get(id)
  if (!t) return
  flushEditor()
  useTasks.getState().setCheck(null)
  useIde.getState().openProject(taskProjectId(id), () => taskWorkspace(t))
  // the task description needs more room than the default right tool window width
  useIde.setState((s) => ({ rightTool: 'task', rightWidth: Math.max(s.rightWidth, 400) }))
  void checkNow()
}

export function openPlayground() {
  flushEditor()
  useTasks.getState().setCheck(null)
  useIde.getState().openProject(PLAYGROUND, playgroundWorkspace)
}

/** Reset Content: back to the starter files (progress is kept). */
export function resetTask() {
  const t = currentTask()
  if (!t) return
  const de = useTasks.getState().lang === 'de'
  const title = textsOf(t, useTasks.getState().lang).title
  if (!confirm(de ? `"${title}" auf den Startcode zurücksetzen? Deine Änderungen an den Dateien gehen verloren.` : `Reset "${title}" to the starter code? Your changes to the files will be lost.`)) return
  const ws = taskWorkspace(t)
  useIde.setState({ files: ws.files, dirs: ws.dirs, openTabs: ws.openTabs, activeTab: ws.activeTab })
  useTasks.getState().setCheck(null)
  void checkNow()
}

/** The next task in course order that is not solved yet (after `from`, wrapping around). */
export function nextUnsolved(from?: string): Task | null {
  const progress = useTasks.getState().progress
  const start = from ? TASKS.findIndex((t) => t.id === from) + 1 : 0
  for (let k = 0; k < TASKS.length; k++) {
    const t = TASKS[(start + k) % TASKS.length]
    if (t.id !== from && progress[t.id]?.status !== 'solved') return t
  }
  return null
}

export function neighbour(id: string, dir: 1 | -1): Task | null {
  const i = TASKS.findIndex((t) => t.id === id)
  return TASKS[i + dir] ?? null
}

export async function checkCurrentTask() {
  const t = currentTask()
  const tasks = useTasks.getState()
  if (!t || tasks.check?.running) return
  flushEditor()
  tasks.setCheck({ taskId: t.id, running: true })
  const outcome = await runCheck(t, currentJavaFiles())
  if (currentTask()?.id !== t.id) return // project switched while checking
  const results = outcome.kind === 'passed' || outcome.kind === 'failed' ? outcome.results : []
  const solved = outcome.kind === 'passed'
  const { firstSolve } = outcome.kind === 'error' ? { firstSolve: false } : tasks.record(t.id, solved, completedSteps(t, results))
  useTasks.getState().setCheck({ taskId: t.id, running: false, outcome, at: Date.now(), firstSolve })
  if (outcome.kind === 'compile-error' && outcome.file && outcome.line) revealPosition(outcome.file, outcome.line, 1)
  if (firstSolve) celebrate(t)
}

function celebrate(t: Task) {
  const ide = useIde.getState()
  const progress = useTasks.getState().progress
  const lang = useTasks.getState().lang
  const de = lang === 'de'
  const title = (x: Task) => textsOf(x, lang).title
  const solvedCount = TASKS.filter((x) => progress[x.id]?.status === 'solved').length
  const lesson = lessonOf(t)
  const lessonDone = lesson.tasks.every((x) => progress[x.id]?.status === 'solved')
  const next = nextUnsolved(t.id)
  const actions = next ? [{ text: de ? `Weiter: ${title(next)}` : `Next: ${title(next)}`, run: () => openTask(next.id) }] : []
  // the mountain: what did this block reveal?
  const dug = newlyUnlocked(solvedCount, TASKS.length)
  const extras = [
    ...dug.finds.map((f) => (de ? `Gefunden: ${f.icon} ${f.name.de}!` : `You dug up: ${f.icon} ${f.name.en}!`)),
    ...(dug.tool ? [de ? `Neues Werkzeug: ${dug.tool.icon} ${dug.tool.name.de}` : `New tool: ${dug.tool.icon} ${dug.tool.name.en}`] : []),
  ].join(' ')
  const mountain = { text: de ? 'Zum Berg' : 'Show mountain', run: () => window.dispatchEvent(new CustomEvent('eprog:show-mountain')) }
  if (extras) actions.push(mountain)
  const tally = de ? `${solvedCount} von ${TASKS.length} Aufgaben gelöst.` : `${solvedCount} of ${TASKS.length} tasks solved.`
  if (solvedCount === TASKS.length) {
    ide.notify({ kind: 'success', title: de ? '💥 Der Berg ist weg!' : '💥 The mountain is gone!', body: `${de ? `Du hast alle ${TASKS.length} Aufgaben gelöst und dich durch ganz EProg gegraben.` : `You solved all ${TASKS.length} practice tasks and dug through all of EProg.`} ${extras}`.trim(), actions: [mountain] })
  } else if (lessonDone) {
    const lessonNo = LESSONS.indexOf(lesson) + 1
    const name = textsOf(lesson.tasks[0], lang).lesson
    ide.notify({ kind: 'success', title: de ? `Lektion abgeschlossen: ${name}` : `Lesson completed: ${name}`, body: `${de ? `Alle ${lesson.tasks.length} Aufgaben von Lektion ${lessonNo} gelöst` : `All ${lesson.tasks.length} tasks of lesson ${lessonNo} solved`} · ${tally} ${extras}`.trim(), actions })
  } else {
    ide.notify({ kind: 'success', title: de ? 'Aufgabe gelöst' : 'Task solved', body: `${title(t)} · ${tally} ${extras}`.trim(), actions })
  }
}
