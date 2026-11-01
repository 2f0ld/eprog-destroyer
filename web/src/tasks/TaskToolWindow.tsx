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
import type { CheckOutcome, Task, TestResult } from './model'
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
  const solved = TASKS.filter((t) => progress[t.id]?.status === 'solved').length
  const pct = TASKS.length ? Math.round((solved / TASKS.length) * 100) : 0
  return (
    <div className={`ij-course-progress${compact ? ' compact' : ''}`} title={`${solved} of ${TASKS.length} tasks solved`}>
      <div className="ij-course-progress-label">
        <span>EProg Practice</span>
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
  return (
    <div className="ij-course">
      <CourseProgress />
      <div className="ij-course-stats ij-muted">
        {solved === 0 ? 'Start with the first task — each one builds on the ones before.' : `${solved} solved · ${withoutHints} without hints · ${LESSONS.filter((l) => l.tasks.every((t) => progress[t.id]?.status === 'solved')).length} of ${LESSONS.length} lessons completed`}
      </div>
      <div className="ij-difficulty-legend" data-tour="difficulty">
        {[1, 2, 3].map((l) => (
          <span key={l} title={DIFFICULTY[useTasks.getState().lang][l - 1]}>
            <Difficulty level={l} />
            {DIFFICULTY[useTasks.getState().lang][l - 1].split(':')[0]}
          </span>
        ))}
      </div>
      {next && (
        <button className="ij-button default ij-course-continue" onClick={() => openTask(next.id)}>
          {solved === 0 ? 'Start' : 'Continue'}: {next.title}
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
              <span className="ij-tree-label" title={`Lesson ${i + 1} · Week ${l.week}`}>
                {l.title}
              </span>
              <span className="ij-tree-secondary">
                {done}/{l.tasks.length}
              </span>
            </div>
            {open &&
              l.tasks.map((t) => (
                <div key={t.id} className={`ij-tree-row ij-task-row${current?.id === t.id ? ' selected' : ''}`} onClick={() => openTask(t.id)} title={t.concepts.join(', ')}>
                  <span className="ij-tree-icon">
                    <Icon name={statusIcon(progress[t.id])} />
                  </span>
                  <span className="ij-tree-label">{t.title}</span>
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
  if (!task.steps.length) return null
  const checked = progress.steps && progress.steps.length === task.steps.length
  return (
    <div className="ij-task-section">
      <div className="ij-task-section-title">Steps</div>
      <ol className="ij-task-steps">
        {task.steps.map((s, i) => {
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
  const shown = Math.min(progress.hintsShown, task.hints.length)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    setOpen(shown > 0 ? shown - 1 : null)
  }, [shown, task.id])
  if (!task.hints.length) return null
  return (
    <div className="ij-task-section">
      <div className="ij-task-section-title">Hints</div>
      {task.hints.slice(0, shown).map((h, i) => (
        <div key={i} className={`ij-hint${open === i ? ' open' : ''}`}>
          <div className="ij-hint-header" onClick={() => setOpen(open === i ? null : i)}>
            <Icon name={open === i ? 'general/chevronDown' : 'general/chevronRight'} />
            <Icon name="actions/realIntentionBulb" />
            <span>
              Hint {i + 1} · {h.title}
            </span>
          </div>
          {open === i && (
            <div className="ij-hint-body">
              <Markdown md={h.body} />
            </div>
          )}
        </div>
      ))}
      {shown < task.hints.length ? (
        <button className="ij-link-button" onClick={() => useTasks.getState().revealHint(task.id)}>
          <Icon name="actions/realIntentionBulb" />
          {shown === 0 ? `Stuck? Show hint 1 of ${task.hints.length}` : `Show hint ${shown + 1} of ${task.hints.length}`}
        </button>
      ) : (
        <div className="ij-muted ij-hint-note">All hints are shown. Still stuck? Re-read the steps, then try one small change at a time and Run.</div>
      )}
    </div>
  )
}

function ResultDetails({ r }: { r: TestResult }) {
  return (
    <div className="ij-check-test">
      <div className="ij-check-message">{r.message}</div>
      {(r.stdin || r.expected !== undefined || r.actual !== undefined) && (
        <div className="ij-check-compare">
          {r.stdin ? (
            <div>
              <div className="ij-check-label">Input</div>
              <pre>{r.stdin}</pre>
            </div>
          ) : null}
          {r.expected !== undefined && (
            <div>
              <div className="ij-check-label">Expected</div>
              <pre>{r.expected || ' '}</pre>
            </div>
          )}
          {r.actual !== undefined && (
            <div>
              <div className="ij-check-label">Actual</div>
              <pre>{r.actual || ' '}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CheckResult({ outcome, task, firstSolve, progress }: { outcome: CheckOutcome; task: Task; firstSolve: boolean; progress: TaskProgress }) {
  if (outcome.kind === 'passed') {
    const next = nextUnsolved(task.id)
    const hints = progress.hintsAtSolve ?? 0
    const praise = progress.attemptsAtSolve === 1 && !hints ? 'First try, no hints — excellent!' : !hints ? 'Solved without hints.' : `You used ${hints} hint${hints === 1 ? '' : 's'} — that is what they are for.`
    return (
      <div className={`ij-check-result correct${firstSolve ? ' celebrate' : ''}`}>
        <div className="ij-check-title">
          <Icon name="edu/resultCorrect" />
          <span>Congratulations!</span>
        </div>
        <div className="ij-check-message">
          All {outcome.results.length} tests passed. {firstSolve ? praise : ''}
        </div>
        {next && (
          <button className="ij-button default" onClick={() => openTask(next.id)}>
            Next: {next.title}
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
          <span>Incorrect</span>
          <span className="ij-muted">
            {passed} of {outcome.results.length} tests passed
          </span>
        </div>
        <ResultDetails r={failed[0]} />
        {failed.length > 1 && <div className="ij-muted">{failed.length - 1} more failing test{failed.length > 2 ? 's' : ''}. Fix this one first.</div>}
      </div>
    )
  }
  return (
    <div className="ij-check-result incorrect">
      <div className="ij-check-title">
        <Icon name="edu/resultIncorrect" />
        <span>{outcome.kind === 'compile-error' ? 'Compilation Failed' : 'Check Failed'}</span>
      </div>
      <div className="ij-check-message">{outcome.message}</div>
    </div>
  )
}

function TaskView({ task }: { task: Task }) {
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
          Lesson {LESSONS.indexOf(lesson) + 1} · {lesson.title}
        </span>
        <span className="ij-task-nav-buttons">
          <button className="ij-icon-btn small" title={prev ? `Previous: ${prev.title}` : 'Previous'} disabled={!prev} onClick={() => prev && openTask(prev.id)}>
            <Icon name="general/chevronLeft" />
          </button>
          <span className="ij-muted">
            {index + 1}/{lesson.tasks.length}
          </span>
          <button className="ij-icon-btn small" title={next ? `Next: ${next.title}` : 'Next'} disabled={!next} onClick={() => next && openTask(next.id)}>
            <Icon name="general/chevronRight" />
          </button>
        </span>
      </div>
      <div className="ij-task-scroll" ref={scrollRef}>
        <div className="ij-task-header">
          <Icon name={statusIcon(progress)} />
          <h1>{task.title}</h1>
          <Difficulty level={task.difficulty} />
        </div>
        <div className="ij-task-concepts">
          {task.concepts.map((c) => (
            <span key={c} className="ij-chip">
              {c}
            </span>
          ))}
        </div>
        {builds.length > 0 && (
          <div className="ij-task-builds ij-muted">
            Builds on:{' '}
            {builds.map((b, i) => (
              <span key={b.id}>
                {i > 0 && ', '}
                <a className="ij-link" onClick={() => openTask(b.id)}>
                  {b.title}
                </a>
              </span>
            ))}
          </div>
        )}
        <Markdown md={task.description} />
        <Steps task={task} progress={progress} />
        <Hints task={task} progress={progress} />
      </div>
      <div className="ij-check-panel">
        {check && !check.running && <CheckResult outcome={check.outcome} task={task} firstSolve={check.firstSolve} progress={progress} />}
        <div className="ij-check-buttons">
          <button className="ij-button default" disabled={!!check?.running} onClick={() => void checkCurrentTask()}>
            {check?.running ? 'Checking…' : 'Check'}
          </button>
          <button className="ij-icon-btn" title="Reset Content" onClick={resetTask}>
            <Icon name="edu/resetTask" />
          </button>
          <span style={{ flex: 1 }} />
          <button
            className="ij-link-button"
            disabled={!canPeek}
            title={canPeek ? "Compare your code with the author's solution" : `Available after all hints or ${PEEK_AFTER_ATTEMPTS} checks — the struggle is where the learning happens.`}
            onClick={() => {
              useTasks.getState().markPeeked(task.id)
              openDialog({ kind: 'peek-solution', taskId: task.id })
            }}
          >
            Peek Solution
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
          No task is open. Pick one in the <a className="ij-link" onClick={() => setTab('course')}>Course</a> tab.
        </div>
      ) : (
        <CourseView current={task} />
      )}
    </ToolWindow>
  )
}
