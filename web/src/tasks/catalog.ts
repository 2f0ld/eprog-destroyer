import { parseTaskFolder, sortTasks, type Task } from './model'

/**
 * The task catalog, bundled from web/tasks at build time. M4/M5 will load it from the server
 * per user; the folder format stays the same.
 */
const raw = import.meta.glob('../../tasks/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function load(): Task[] {
  const folders = new Map<string, Record<string, string>>()
  for (const [key, content] of Object.entries(raw)) {
    const m = /\.\.\/\.\.\/tasks\/([^/]+)\/(.+)$/.exec(key)
    if (!m) continue
    const f = folders.get(m[1]) ?? {}
    f[m[2]] = content
    folders.set(m[1], f)
  }
  const tasks: Task[] = []
  for (const [id, files] of folders) {
    try {
      tasks.push(parseTaskFolder(id, files))
    } catch (e) {
      console.error(e)
    }
  }
  return sortTasks(tasks)
}

export const TASKS: Task[] = load()
export const taskById = new Map(TASKS.map((t) => [t.id, t]))

export interface Lesson {
  key: string
  week: number
  title: string
  tasks: Task[]
}

/** Tasks grouped into lessons (week + lesson title), in course order. */
export const LESSONS: Lesson[] = (() => {
  const out: Lesson[] = []
  for (const t of TASKS) {
    const key = `${t.week}:${t.lesson}`
    let l = out.find((x) => x.key === key)
    if (!l) out.push((l = { key, week: t.week, title: t.lesson, tasks: [] }))
    l.tasks.push(t)
  }
  return out
})()

export const lessonOf = (t: Task) => LESSONS.find((l) => l.key === `${t.week}:${t.lesson}`)!
