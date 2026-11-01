import { useEffect, useState } from 'react'
import { closeDialog } from './dialogs'
import { getActiveEditor } from '../editor/editorRef'
import { useTasks } from '../tasks/progress'

type Step = 'ask' | 'sure' | 'fair' | 'know'

const TEXT = {
  en: {
    title: 'Pasted code',
    ask: ['🤖', 'That is a nice chunk of code you just pasted. Did an AI write it?'],
    sure: ['🤨', 'Are you sure? Like… sure sure?'],
    fair: ['🙂', 'Fair enough. Just make sure you understand every line — there is no AI in the exam.'],
    know: ['👀', 'We know you have.'],
    no: 'No, it did not',
    yes: 'Yes, it did',
    sureSure: 'Yes, sure sure',
    confess: 'Okay… it was AI',
    ok: 'Got it',
    busted: 'Busted',
  },
  de: {
    title: 'Eingefügter Code',
    ask: ['🤖', 'Das ist ein ordentliches Stück Code, das du da eingefügt hast. Hat das eine KI geschrieben?'],
    sure: ['🤨', 'Bist du sicher? So richtig sicher?'],
    fair: ['🙂', 'Fair. Stell nur sicher, dass du jede Zeile verstehst — an der Prüfung gibt es keine KI.'],
    know: ['👀', 'Wir wissen, dass es eine war.'],
    no: 'Nein',
    yes: 'Ja, war es',
    sureSure: 'Ja, ganz sicher',
    confess: 'Okay… es war KI',
    ok: 'Verstanden',
    busted: 'Erwischt',
  },
}

/** The tongue-in-cheek "did you use AI?" dialog (see editor/pasteCheck.ts). */
export function AiCheckDialog() {
  const lang = useTasks((s) => s.lang)
  const t = TEXT[lang]
  const [step, setStep] = useState<Step>('ask')
  const close = () => {
    closeDialog()
    getActiveEditor()?.focus()
  }
  useEffect(() => {
    // Escape is not an answer to this question
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [])
  const [icon, text] = t[step]
  const buttons: [string, () => void, boolean][] =
    step === 'ask'
      ? [[t.yes, () => setStep('fair'), false], [t.no, () => setStep('sure'), true]]
      : step === 'sure'
        ? [[t.confess, () => setStep('fair'), false], [t.sureSure, () => setStep('know'), true]]
        : [[step === 'know' ? t.busted : t.ok, close, true]]
  return (
    <div className="ij-overlay dim">
      <div className="ij-dialog ij-ai-check" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ij-dialog-title">{t.title}</div>
        <div className={`ij-ai-check-body step-${step}`}>
          <span className="ij-ai-check-icon">{icon}</span>
          <p>{text}</p>
        </div>
        <div className="ij-dialog-footer">
          {buttons.map(([label, run, primary]) => (
            <button key={label} className={`ij-button${primary ? ' default' : ''}`} onClick={run}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
