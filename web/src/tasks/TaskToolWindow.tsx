import { useEffect, useMemo, useRef, useState } from 'react'
import { useIde } from '../ide/store'
import { ToolWindow } from '../ide/components/ToolWindow'
import { Icon } from '../ui/Icon'
import { monaco } from '../editor/monacoSetup'
import { openDialog } from '../ui/dialogs'
import { renderMarkdown } from './markdown'
import { LESSONS, TASKS, taskById, lessonOf } from './catalog'
import { useTasks, type TaskProgress } from './progress'
import { checkCurrentTask, currentTask, neighbour, nextUnsolved, openTask, resetTask } from './taskActions'
import { textsOf, type CheckOutcome, type Task, type TestResult } from './model'
import { useStrings } from './i18n'
import { MountainView } from './MountainView'

/** Hints and the solution are graded help: the solution unlocks after all hints or a few attempts. */
const PEEK_AFTER_ATTEMPTS = 3

function Markdown({ md }: { md: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const html = useMemo(() => renderMarkdown(md), [md])
  const theme = useIde((s) => s.theme)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // colorize Java code blocks with the editor's lexer and theme
    for (const code of el.querySelectorAll<HTMLElement>('pre[data-lang="java"] code')) {
      const text = code.textContent ?? ''
      void monaco.editor.colorize(text, 'java', { tabSize: 4 }).then((h) => {
        if (code.isConnected) code.innerHTML = h
      })
    }
  }, [html, theme])
  return <div ref={ref} className="ij-md" dangerouslySetInnerHTML={{ __html: html }} />
}

/** What the difficulty dots mean (also shown as a legend in the Course tab). */
export const DIFFICULTY = {
  en: ['Easy: one idea, a few lines', 'Medium: combine several ideas, plan before coding', 'Hard: exam level, split it into steps'],
  de: ['Leicht: eine Idee, wenige Zeilen', 'Mittel: mehrere Ideen kombinieren, vorher planen', 'Schwer: Prüfungsniveau, in Schritte aufteilen'],
}

function Difficulty({ level }: { level: number }) {
  const lang = useTasks((s) => s.lang)
  return (
    <span className="ij-task-difficulty" title={DIFFICULTY[lang][level - 1]}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  )
}

const statusIcon = (p: TaskProgress | undefined) => (p?.status === 'solved' ? 'edu/eduTaskDone' : p?.status === 'attempted' ? 'edu/eduTaskFailed' : 'edu/eduTaskDefault')

export function CourseProgress({ compact }: { compact?: boolean }) {
  const progress = useTasks((s) => s.progress)
  const S = useStrings()
  const solved = TASKS.filter((t) => progress[t.id]?.status === 'solved').length
  const pct = TASKS.length ? Math.round((solved / TASKS.length) * 100) : 0
  return (
    <div className={`ij-course-progress${compact ? ' compact' : ''}`} title={S.solvedOf(solved, TASKS.length)}>
      <div className="ij-course-progress-label">
        <span>{S.practice}</span>
        <span className="ij-muted">
          {solved}/{TASKS.length}
        </span>
      </div>
      <div className="ij-progress-bar">
        <div className="ij-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CourseView({ current }: { current: Task | null }) {
  const progress = useTasks((s) => s.progress)
  const next = nextUnsolved(current?.id)
  const withoutHints = TASKS.filter((t) => progress[t.id]?.status === 'solved' && !progress[t.id]?.hintsAtSolve && !progress[t.id]?.peeked).length
  const solved = TASKS.filter((t) => progress[t.id]?.status === 'solved').length
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const S = useStrings()
  const lang = useTasks((s) => s.lang)
  return (
    <div className="ij-course">
      <CourseProgress />
      <div className="ij-course-stats ij-muted">
        {solved === 0 ? S.startHere : S.stats(solved, withoutHints, LESSONS.filter((l) => l.tasks.every((t) => progress[t.id]?.status === 'solved')).length, LESSONS.length)}
      </div>
      <div className="ij-difficulty-legend" data-tour="difficulty">
        {[1, 2, 3].map((l) => (
          <span key={l} title={DIFFICULTY[lang][l - 1]}>
            <Difficulty level={l} />
            {DIFFICULTY[lang][l - 1].split(':')[0]}
          </span>
        ))}
      </div>
      {next && (
        <button className="ij-button default ij-course-continue" onClick={() => openTask(next.id)}>
          {solved === 0 ? S.start : S.continue}: {textsOf(next, lang).title}
        </button>
      )}
      {LESSONS.map((l, i) => {
        const done = l.tasks.filter((t) => progress[t.id]?.status === 'solved').length
        const open = !collapsed.has(l.key)
        return (
          <div key={l.key} className="ij-lesson">
            <div
              className="ij-tree-row ij-lesson-row"
              onClick={() =>
                setCollapsed((c) => {
                  const n = new Set(c)
                  if (n.has(l.key)) n.delete(l.key)
                  else n.add(l.key)
                  return n
                })
              }
            >
              <span className="ij-tree-chevron">
                <Icon name={open ? 'general/chevronDown' : 'general/chevronRight'} />
              </span>
              <span className="ij-tree-icon">
                <Icon name={done === l.tasks.length ? 'edu/eduLessonDone' : 'edu/eduLessonDefault'} />
              </span>
              <span className="ij-tree-label" title={S.lesson(i + 1, l.week)}>
                {textsOf(l.tasks[0], lang).lesson}
              </span>
              <span className="ij-tree-secondary">
                {done}/{l.tasks.length}
              </span>
            </div>
            {open &&
              l.tasks.map((t) => (
                <div key={t.id} className={`ij-tree-row ij-task-row${current?.id === t.id ? ' selected' : ''}`} onClick={() => openTask(t.id)} title={textsOf(t, lang).concepts.join(', ')}>
                  <span className="ij-tree-icon">
                    <Icon name={statusIcon(progress[t.id])} />
                  </span>
                  <span className="ij-tree-label">{textsOf(t, lang).title}</span>
                  <Difficulty level={t.difficulty} />
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}

function Steps({ task, progress }: { task: Task; progress: TaskProgress }) {
  const S = useStrings()
  const steps = textsOf(task, useTasks((s) => s.lang)).steps
  if (!steps.length) return null
  const checked = progress.steps && progress.steps.length === task.steps.length
  return (
    <div className="ij-task-section">
      <div className="ij-task-section-title">{S.steps}</div>
      <ol className="ij-task-steps">
        {steps.map((s, i) => {
          const ok = checked ? progress.steps![i] : progress.status === 'solved'
          return (
            <li key={i} className={ok ? 'done' : checked ? 'open' : ''}>
              <Icon name={ok ? 'edu/eduTaskDone' : checked ? 'edu/eduTaskFailed' : 'edu/eduTaskDefault'} />
              <span>
                <Markdown md={s.text} />
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Hints({ task, progress }: { task: Task; progress: TaskProgress }) {
  const S = useStrings()
  const hints = textsOf(task, useTasks((s) => s.lang)).hints
  const shown = Math.min(progress.hintsShown, hints.length)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    setOpen(shown > 0 ? shown - 1 : null)
  }, [shown, task.id])
  if (!hints.length) return null
  return (
    <div className="ij-task-section">
      <div className="ij-task-section-title">{S.hints}</div>
      {hints.slice(0, shown).map((h, i) => (
        <div key={i} className={`ij-hint${open === i ? ' open' : ''}`}>
          <div className="ij-hint-header" onClick={() => setOpen(open === i ? null : i)}>
            <Icon name={open === i ? 'general/chevronDown' : 'general/chevronRight'} />
            <Icon name="actions/realIntentionBulb" />
            <span>
              {S.hint(i + 1)} · {h.title}
            </span>
          </div>
          {open === i && (
            <div className="ij-hint-body">
              <Markdown md={h.body} />
            </div>
          )}
        </div>
      ))}
      {shown < hints.length ? (
        <button className="ij-link-button" onClick={() => useTasks.getState().revealHint(task.id)}>
          <Icon name="actions/realIntentionBulb" />
          {shown === 0 ? S.stuck(hints.length) : S.showHint(shown + 1, hints.length)}
        </button>
      ) : (
        <div className="ij-muted ij-hint-note">{S.allHints}</div>
      )}
    </div>
  )
}

function ResultDetails({ r }: { r: TestResult }) {
  const S = useStrings()
  return (
    <div className="ij-check-test">
      <div className="ij-check-message">{r.message}</div>
      {(r.stdin || r.expected !== undefined || r.actual !== undefined) && (
        <div className="ij-check-compare">
          {r.stdin ? (
            <div>
              <div className="ij-check-label">{S.input}</div>
              <pre>{r.stdin}</pre>
            </div>
          ) : null}
          {r.expected !== undefined && (
            <div>
              <div className="ij-check-label">{S.expected}</div>
              <pre>{r.expected || ' '}</pre>
            </div>
          )}
          {r.actual !== undefined && (
            <div>
              <div className="ij-check-label">{S.actual}</div>
              <pre>{r.actual || ' '}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CheckResult({ outcome, task, firstSolve, progress }: { outcome: CheckOutcome; task: Task; firstSolve: boolean; progress: TaskProgress }) {
  const S = useStrings()
  const lang = useTasks((s) => s.lang)
  if (outcome.kind === 'passed') {
    const next = nextUnsolved(task.id)
    const hints = progress.hintsAtSolve ?? 0
    const praise = progress.attemptsAtSolve === 1 && !hints ? S.firstTry : !hints ? S.noHints : S.withHints(hints)
    return (
      <div className={`ij-check-result correct${firstSolve ? ' celebrate' : ''}`}>
        <div className="ij-check-title">
          <Icon name="edu/resultCorrect" />
          <span>{S.congrats}</span>
        </div>
        <div className="ij-check-message">
          {S.allPassed(outcome.results.length)} {firstSolve ? praise : ''}
        </div>
        {next && (
          <button className="ij-button default" onClick={() => openTask(next.id)}>
            {S.next(textsOf(next, lang).title)}
          </button>
        )}
      </div>
    )
  }
  if (outcome.kind === 'failed') {
    const failed = outcome.results.filter((r) => !r.passed)
    const passed = outcome.results.length - failed.length
    return (
      <div className="ij-check-result incorrect">
        <div className="ij-check-title">
          <Icon name="edu/resultIncorrect" />
          <span>{S.incorrect}</span>
          <span className="ij-muted">{S.passedOf(passed, outcome.results.length)}</span>
        </div>
        <ResultDetails r={failed[0]} />
        {failed.length > 1 && <div className="ij-muted">{S.moreFailing(failed.length - 1)}</div>}
      </div>
    )
  }
  return (
    <div className="ij-check-result incorrect">
      <div className="ij-check-title">
        <Icon name="edu/resultIncorrect" />
        <span>{outcome.kind === 'compile-error' ? S.compileFailed : S.checkFailed}</span>
      </div>
      <div className="ij-check-message">{outcome.message}</div>
    </div>
  )
}

function TaskView({ task }: { task: Task }) {
  const S = useStrings()
  const lang = useTasks((s) => s.lang)
  const texts = textsOf(task, lang)
  const progress = useTasks((s) => s.progress[task.id]) ?? { status: 'new', attempts: 0, hintsShown: 0 }
  const check = useTasks((s) => (s.check?.taskId === task.id ? s.check : null))
  const lesson = lessonOf(task)
  const index = lesson.tasks.indexOf(task)
  const prev = neighbour(task.id, -1)
  const next = neighbour(task.id, 1)
  const canPeek = progress.hintsShown >= task.hints.length || progress.attempts >= PEEK_AFTER_ATTEMPTS || progress.status === 'solved'
  const builds = task.requires.map((r) => taskById.get(r)).filter((t): t is Task => !!t)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [task.id])
  return (
    <div className="ij-task">
      <div className="ij-task-nav">
        <span className="ij-muted">
          {S.lessonShort(LESSONS.indexOf(lesson) + 1)} · {texts.lesson}
        </span>
        <span className="ij-task-nav-buttons">
          <button className="ij-icon-btn small" title={prev ? S.previous(textsOf(prev, lang).title) : ''} disabled={!prev} onClick={() => prev && openTask(prev.id)}>
            <Icon name="general/chevronLeft" />
          </button>
          <span className="ij-muted">
            {index + 1}/{lesson.tasks.length}
          </span>
          <button className="ij-icon-btn small" title={next ? S.next(textsOf(next, lang).title) : ''} disabled={!next} onClick={() => next && openTask(next.id)}>
            <Icon name="general/chevronRight" />
          </button>
        </span>
      </div>
      <div className="ij-task-scroll" ref={scrollRef}>
        <div className="ij-task-header">
          <Icon name={statusIcon(progress)} />
          <h1>{texts.title}</h1>
          <Difficulty level={task.difficulty} />
        </div>
        <div className="ij-task-concepts">
          {texts.concepts.map((c) => (
            <span key={c} className="ij-chip">
              {c}
            </span>
          ))}
        </div>
        {builds.length > 0 && (
          <div className="ij-task-builds ij-muted">
            {S.buildsOn}{' '}
            {builds.map((b, i) => (
              <span key={b.id}>
                {i > 0 && ', '}
                <a className="ij-link" onClick={() => openTask(b.id)}>
                  {textsOf(b, lang).title}
                </a>
              </span>
            ))}
          </div>
        )}
        <Markdown md={texts.description} />
        <Steps task={task} progress={progress} />
        <Hints task={task} progress={progress} />
      </div>
      <div className="ij-check-panel">
        {check && !check.running && <CheckResult outcome={check.outcome} task={task} firstSolve={check.firstSolve} progress={progress} />}
        <div className="ij-check-buttons">
          <button className="ij-button default" disabled={!!check?.running} onClick={() => void checkCurrentTask()}>
            {check?.running ? S.checking : S.check}
          </button>
          <button className="ij-icon-btn" title={S.reset} onClick={resetTask}>
            <Icon name="edu/resetTask" />
          </button>
          <span style={{ flex: 1 }} />
          <button
            className="ij-link-button"
            disabled={!canPeek}
            title={canPeek ? S.peekTip : S.peekLocked(PEEK_AFTER_ATTEMPTS)}
            onClick={() => {
              useTasks.getState().markPeeked(task.id)
              openDialog({ kind: 'peek-solution', taskId: task.id })
            }}
          >
            {S.peek}
          </button>
        </div>
      </div>
    </div>
  )
}

/** EN | DE switch for task texts (also in Settings › Appearance). */
function LangSwitch() {
  const lang = useTasks((s) => s.lang)
  return (
    <div className="ij-lang-switch" data-tour="lang" title="Task language / Sprache der Aufgaben">
      {(['en', 'de'] as const).map((l) => (
        <button key={l} className={lang === l ? 'selected' : ''} onClick={() => useTasks.getState().setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export function TaskToolWindow() {
  const projectId = useIde((s) => s.projectId)
  const task = currentTask(projectId)
  const [tab, setTab] = useState<'task' | 'course' | 'mountain'>(task ? 'task' : 'course')
  const S = useStrings()
  useEffect(() => {
    setTab(task ? 'task' : 'course')
  }, [task])
  useEffect(() => {
    const show = () => {
      useIde.setState({ rightTool: 'task' })
      setTab('mountain')
    }
    const course = () => setTab('course')
    window.addEventListener('eprog:show-mountain', show)
    window.addEventListener('eprog:show-course', course)
    return () => {
      window.removeEventListener('eprog:show-mountain', show)
      window.removeEventListener('eprog:show-course', course)
    }
  }, [])
  return (
    <ToolWindow
      title="Task"
      onHide={() => useIde.setState({ rightTool: null })}
      tabs={
        <>
          <div className={`ij-tw-tab${tab === 'task' ? ' selected' : ''}`} onClick={() => setTab('task')}>
            <span>Description</span>
          </div>
          <div className={`ij-tw-tab${tab === 'course' ? ' selected' : ''}`} onClick={() => setTab('course')}>
            <span>Course</span>
          </div>
          <div className={`ij-tw-tab${tab === 'mountain' ? ' selected' : ''}`} onClick={() => setTab('mountain')} data-tour="mountain-tab">
            <span>Mountain</span>
          </div>
          <LangSwitch />
        </>
      }
    >
      {tab === 'mountain' ? (
        <MountainView />
      ) : tab === 'task' && task ? (
        <TaskView task={task} />
      ) : tab === 'task' ? (
        <div className="ij-empty-text">
          {S.noTask} <a className="ij-link" onClick={() => setTab('course')}>{S.courseTab}</a> {S.tab}
        </div>
      ) : (
        <CourseView current={task} />
      )}
    </ToolWindow>
  )
}
