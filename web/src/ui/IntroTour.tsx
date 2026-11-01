import { useEffect, useLayoutEffect, useState } from 'react'
import { create } from 'zustand'
import { useIde } from '../ide/store'
import { useTasks } from '../tasks/progress'

/**
 * Skippable intro tour in IntelliJ's "Got It" tooltip style (GotItTooltip.* theme keys):
 * a spotlight on one part of the window and a blue bubble with the explanation.
 */

interface Step {
  /** `data-tour` anchor; none = centred welcome bubble */
  target?: string
  /** prepare the UI before showing the step (e.g. open the Task window) */
  before?: () => void
  title: { en: string; de: string }
  body: { en: string; de: string }
}

const openTaskWindow = (tab?: 'course' | 'mountain') => () => {
  useIde.setState((s) => ({ rightTool: 'task', rightWidth: Math.max(s.rightWidth, 400) }))
  if (tab) window.setTimeout(() => window.dispatchEvent(new CustomEvent(tab === 'mountain' ? 'eprog:show-mountain' : 'eprog:show-course')), 0)
}

const STEPS: Step[] = [
  {
    title: { en: 'Welcome to EProg Destroyer', de: 'Willkommen bei EProg Destroyer' },
    body: {
      en: 'This IDE looks and works like IntelliJ IDEA — the one you use in the exam. Here is a one-minute tour of what matters.',
      de: 'Diese IDE sieht aus und funktioniert wie IntelliJ IDEA — wie an der Prüfung. Hier eine Tour von einer Minute durch das Wichtigste.',
    },
  },
  {
    target: 'stripe-project',
    title: { en: 'Tool windows', de: 'Toolfenster' },
    body: {
      en: 'The stripes on the left and right open tool windows. **Project** (Alt+1) shows your files; Run (Alt+4) and Problems (Alt+6) sit at the bottom.',
      de: 'Die Leisten links und rechts öffnen Toolfenster. **Project** (Alt+1) zeigt deine Dateien; Run (Alt+4) und Problems (Alt+6) sind unten.',
    },
  },
  {
    target: 'editor',
    title: { en: 'The editor helps while you type', de: 'Der Editor hilft beim Tippen' },
    body: {
      en: 'Red wave = error, red text = unknown name, grey = unused. **Alt+Enter** offers fixes, **Ctrl+Space** completes code, **F2** jumps to the next error.',
      de: 'Rote Welle = Fehler, roter Text = unbekannter Name, grau = unbenutzt. **Alt+Enter** schlägt Korrekturen vor, **Ctrl+Space** vervollständigt, **F2** springt zum nächsten Fehler.',
    },
  },
  {
    target: 'run',
    title: { en: 'Run your program', de: 'Programm ausführen' },
    body: {
      en: 'Click Run or press **Shift+F10**. Output and input appear in the Run tool window at the bottom.',
      de: 'Klicke auf Run oder drücke **Shift+F10**. Ausgabe und Eingabe erscheinen unten im Run-Fenster.',
    },
  },
  {
    target: 'stripe-task',
    before: openTaskWindow('course'),
    title: { en: 'Practice tasks', de: 'Übungsaufgaben' },
    body: {
      en: 'The **Task** window lists the course. Each task opens as its own project with steps, graded hints and a **Check** button that tests your solution.',
      de: 'Das **Task**-Fenster zeigt den Kurs. Jede Aufgabe öffnet sich als eigenes Projekt mit Schritten, gestuften Hinweisen und einem **Check**-Knopf, der deine Lösung testet.',
    },
  },
  {
    target: 'difficulty',
    before: openTaskWindow('course'),
    title: { en: 'Difficulty dots', de: 'Schwierigkeitspunkte' },
    body: {
      en: 'One dot: one idea, a few lines. Two: combine ideas, plan first. Three: exam level — split it into steps. Tasks build on each other, so go in order.',
      de: 'Ein Punkt: eine Idee, wenige Zeilen. Zwei: Ideen kombinieren, zuerst planen. Drei: Prüfungsniveau — in Schritte aufteilen. Die Aufgaben bauen aufeinander auf.',
    },
  },
  {
    target: 'mountain-tab',
    before: openTaskWindow('mountain'),
    title: { en: 'Destroy the mountain', de: 'Zerstöre den Berg' },
    body: {
      en: 'EProg is a mountain. Every solved task digs a block away — you get better tools and dig up finds on the way down.',
      de: 'EProg ist ein Berg. Jede gelöste Aufgabe gräbt einen Block weg — unterwegs bekommst du bessere Werkzeuge und Fundstücke.',
    },
  },
  {
    target: 'lang',
    before: openTaskWindow('course'),
    title: { en: 'Deutsch or English', de: 'Deutsch oder Englisch' },
    body: {
      en: 'Switch the task texts between English and German here, any time.',
      de: 'Hier kannst du die Aufgabentexte jederzeit zwischen Deutsch und Englisch umschalten.',
    },
  },
  {
    target: 'search',
    title: { en: 'Lost? Search everything', de: 'Verloren? Alles durchsuchen' },
    body: {
      en: 'Press **Shift** twice to search files, classes and actions. The tour is in the main menu under Help.',
      de: 'Drücke zweimal **Shift**, um Dateien, Klassen und Aktionen zu suchen. Die Tour findest du im Hauptmenü unter Help.',
    },
  },
]

export const useTour = create<{ step: number | null }>(() => ({ step: null }))
export const startTour = () => useTour.setState({ step: 0 })

const finish = () => {
  useTour.setState({ step: null })
  useIde.setState({ tourDone: true })
}

/** Inline **bold** only — tour texts are ours, but keep them out of innerHTML anyway. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
    </>
  )
}

export function IntroTour() {
  const step = useTour((s) => s.step)
  const lang = useTasks((s) => s.lang)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // first visit: start automatically (not in automated browsers, e.g. the smoke test)
  useEffect(() => {
    if (!useIde.getState().tourDone && !navigator.webdriver) window.setTimeout(startTour, 800)
  }, [])

  const visible = step === null ? [] : STEPS
  const s = step === null ? null : visible[step]

  useLayoutEffect(() => {
    if (!s) return
    s.before?.()
    let tries = 0
    const find = () => {
      const el = s.target ? document.querySelector(`[data-tour="${s.target}"]`) : null
      if (s.target && !el && tries++ < 10) return void window.setTimeout(find, 60)
      if (s.target && !el) {
        // anchor not available (e.g. a hidden window): skip this step
        if (step! + 1 < STEPS.length) useTour.setState({ step: step! + 1 })
        else finish()
        return
      }
      setRect(el ? el.getBoundingClientRect() : null)
    }
    find()
    const onResize = () => find()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [s, step])

  useEffect(() => {
    if (step === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (step + 1 < STEPS.length) useTour.setState({ step: step + 1 })
        else finish()
      }
      else if (e.key === 'ArrowLeft' && step > 0) useTour.setState({ step: step - 1 })
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [step])

  if (step === null || !s) return null
  const last = step === STEPS.length - 1
  const t = (en: string, de: string) => (lang === 'de' ? de : en)

  // bubble placement: beside the target, on the side with more room
  const W = 320
  let style: React.CSSProperties
  if (!s.target || !rect) style = { left: `calc(50% - ${W / 2}px)`, top: '30%' }
  else {
    const right = rect.left + rect.width / 2 < window.innerWidth / 2
    const top = Math.max(12, Math.min(window.innerHeight - 220, rect.top + rect.height / 2 - 60))
    style = right ? { left: Math.min(rect.right + 14, window.innerWidth - W - 12), top } : { left: Math.max(12, rect.left - W - 14), top }
    if (rect.width > window.innerWidth * 0.5) style = { left: rect.left + rect.width / 2 - W / 2, top: Math.min(rect.top + 80, window.innerHeight - 220) }
  }
  return (
    <div className="ij-tour" onMouseDown={(e) => e.stopPropagation()}>
      {s.target && rect ? <div className="ij-tour-spot" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} /> : <div className="ij-tour-dim" />}
      <div className="ij-gotit" style={{ ...style, width: W }} role="dialog" aria-label={s.title[lang]}>
        <div className="ij-gotit-header">
          <span>{s.title[lang]}</span>
          <span className="ij-gotit-step">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div className="ij-gotit-body">
          <Rich text={s.body[lang]} />
        </div>
        <div className="ij-gotit-actions">
          <button className="ij-gotit-button" onClick={() => (last ? finish() : useTour.setState({ step: step + 1 }))} autoFocus>
            {last ? t('Got It', 'Verstanden') : step === 0 ? t('Start Tour', 'Tour starten') : t('Next', 'Weiter')}
          </button>
          {step > 0 && (
            <a className="ij-gotit-link" onClick={() => useTour.setState({ step: step - 1 })}>
              {t('Back', 'Zurück')}
            </a>
          )}
          {!last && (
            <a className="ij-gotit-link skip" onClick={finish}>
              {t('Skip tour', 'Tour überspringen')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
