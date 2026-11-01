import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ETH_EMAIL } from './email'

/**
 * Auth pages (served from auth.html, outside the login wall). Deliberately plain and neutral, not IDE-styled
 * and without ETH branding. Routes: /login /signup /verify /forgot /reset /account and /dev/mail (dev only).
 */

const PASSWORD_MIN = 10 // server/auth.ts PASSWORD_MIN

async function post(url: string, body: object): Promise<{ status: number; data: { error?: string; message?: string; email?: string } }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: res.status, data: await res.json().catch(() => ({})) }
  } catch {
    return { status: 0, data: { message: 'The server cannot be reached. Check your connection and try again.' } }
  }
}

const query = new URLSearchParams(location.search)
/** read a one-time token from the URL and remove it, so it does not linger in history or Referer headers */
function takeToken() {
  const token = query.get('token') ?? ''
  if (token) history.replaceState(null, '', location.pathname)
  return token
}

function go(path: string) {
  location.href = path
}

function Card({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    document.title = `${title} · EProg Practice`
  }, [title])
  return (
    <main className={`auth-card${wide ? ' wide' : ''}`}>
      <div className="auth-brand">
        <span className="auth-logo" aria-hidden>
          {'{ }'}
        </span>
        EProg Practice
      </div>
      <h1>{title}</h1>
      {children}
    </main>
  )
}

function Field({ label, hint, ...props }: { label: string; hint?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  )
}

function Notice({ kind, children }: { kind: 'error' | 'info' | 'success'; children: ReactNode }) {
  return (
    <p className={`auth-notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}

function useForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

const emailHint = 'Your ETH address, e.g. jdoe@student.ethz.ch'

function Login() {
  const [email, setEmail] = useState(query.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)
  const f = useForm()
  const submit = f.run(async () => {
    const r = await post('/api/auth/login', { email, password })
    if (r.status === 200) return go('/')
    setUnverified(r.data.error === 'unverified')
    f.setError(r.data.message ?? 'Login failed.')
  })
  return (
    <Card title="Log in">
      {query.has('verified') && <Notice kind="success">Your e-mail address is confirmed. You can log in now.</Notice>}
      {query.has('reset') && <Notice kind="success">Your password was changed. Log in with the new password.</Notice>}
      {query.has('deleted') && <Notice kind="info">Your account and all its data were deleted.</Notice>}
      <form onSubmit={submit} className="auth-form">
        <Field label="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={!email} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus={!!email} />
        {f.error && <Notice kind="error">{f.error}</Notice>}
        {unverified &&
          (resent ? (
            <Notice kind="info">We sent you a new confirmation link.</Notice>
          ) : (
            <button type="button" className="auth-link-btn" onClick={() => void post('/api/auth/resend', { email }).then(() => setResent(true))}>
              Send the confirmation link again
            </button>
          ))}
        <button className="auth-primary" disabled={f.busy}>
          {f.busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <nav className="auth-links">
        <a href="/forgot">Forgot your password?</a>
        <a href="/signup">Create an account</a>
      </nav>
    </Card>
  )
}

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [resent, setResent] = useState(false)
  const f = useForm()
  const submit = f.run(async () => {
    if (!ETH_EMAIL.test(email.trim())) return f.setError('Use your ETH address (…@ethz.ch or e.g. …@student.ethz.ch).')
    if (password.length < PASSWORD_MIN) return f.setError(`Use at least ${PASSWORD_MIN} characters for the password.`)
    const r = await post('/api/auth/signup', { email, password })
    if (r.status === 200) setSent(true)
    else f.setError(r.data.message ?? 'Sign-up failed.')
  })
  if (sent)
    return (
      <Card title="Check your inbox">
        <p>
          We sent a confirmation link to <strong>{email.trim().toLowerCase()}</strong>. Open it to finish creating your account. The link is valid for 24 hours.
        </p>
        {resent ? (
          <Notice kind="info">Sent again. It can take a minute to arrive; check your spam folder too.</Notice>
        ) : (
          <button className="auth-link-btn" onClick={() => void post('/api/auth/resend', { email }).then(() => setResent(true))}>
            Didn't get it? Send it again
          </button>
        )}
        <nav className="auth-links">
          <a href="/login">Back to log in</a>
        </nav>
      </Card>
    )
  return (
    <Card title="Create your account">
      <p className="auth-lead">Practice Java for Introduction to Programming in a browser IDE that looks and feels like the one you use in the exam. Accounts are for ETH members.</p>
      <form onSubmit={submit} className="auth-form">
        <Field label="ETH e-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} hint={emailHint} autoFocus />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} value={password} onChange={(e) => setPassword(e.target.value)} hint={`At least ${PASSWORD_MIN} characters. A passphrase is easiest to remember.`} />
        {f.error && <Notice kind="error">{f.error}</Notice>}
        <button className="auth-primary" disabled={f.busy}>
          {f.busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth-small">We store only your e-mail address, a hash of your password and your practice projects. You can delete your account at any time.</p>
      <nav className="auth-links">
        <span>
          Already registered? <a href="/login">Log in</a>
        </span>
      </nav>
    </Card>
  )
}

let verifying: ReturnType<typeof post> | null = null

function Verify() {
  const [token] = useState(takeToken)
  const [state, setState] = useState<'checking' | 'ok' | 'expired' | 'invalid'>('checking')
  const [email, setEmail] = useState('')
  const [resent, setResent] = useState(false)
  useEffect(() => {
    // the token is single-use: never send it twice (StrictMode runs effects twice in development)
    verifying ??= post('/api/auth/verify', { token })
    void verifying.then((r) => {
      if (r.status === 200) {
        setEmail(r.data.email ?? '')
        setState('ok')
      } else setState(r.data.error === 'expired' ? 'expired' : 'invalid')
    })
  }, [token])
  return (
    <Card title="Confirm e-mail address">
      {state === 'checking' && <p>Checking your link…</p>}
      {state === 'ok' && (
        <>
          <Notice kind="success">Your e-mail address is confirmed.</Notice>
          <a className="auth-primary" href={`/login?verified&email=${encodeURIComponent(email)}`}>
            Log in
          </a>
        </>
      )}
      {state === 'invalid' && <Notice kind="error">This link is not valid. It may have been used already — try to log in.</Notice>}
      {state === 'expired' && <Notice kind="error">This link has expired.</Notice>}
      {(state === 'expired' || state === 'invalid') &&
        (resent ? (
          <Notice kind="info">If the address belongs to an unconfirmed account, a new link is on its way.</Notice>
        ) : (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault()
              void post('/api/auth/resend', { email }).then(() => setResent(true))
            }}
          >
            <Field label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} hint="Get a new confirmation link" />
            <button className="auth-secondary">Send new link</button>
          </form>
        ))}
      <nav className="auth-links">
        <a href="/login">Log in</a>
      </nav>
    </Card>
  )
}

function Forgot() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const f = useForm()
  const submit = f.run(async () => {
    const r = await post('/api/auth/forgot', { email })
    if (r.status === 200) setSent(true)
    else f.setError(r.data.message ?? 'Something went wrong.')
  })
  return (
    <Card title="Reset password">
      {sent ? (
        <Notice kind="info">If an account exists for {email.trim().toLowerCase()}, we sent a link to reset the password. It is valid for one hour.</Notice>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <Field label="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} hint={emailHint} autoFocus />
          {f.error && <Notice kind="error">{f.error}</Notice>}
          <button className="auth-primary" disabled={f.busy}>
            Send reset link
          </button>
        </form>
      )}
      <nav className="auth-links">
        <a href="/login">Back to log in</a>
      </nav>
    </Card>
  )
}

function Reset() {
  const [token] = useState(takeToken)
  const [password, setPassword] = useState('')
  const f = useForm()
  const submit = f.run(async () => {
    const r = await post('/api/auth/reset', { token, password })
    if (r.status === 200) return go(`/login?reset&email=${encodeURIComponent(r.data.email ?? '')}`)
    f.setError(r.data.error === 'expired' ? 'This link has expired. Request a new one.' : r.data.error === 'invalid' ? 'This link is not valid or was already used. Request a new one.' : (r.data.message ?? 'Something went wrong.'))
  })
  return (
    <Card title="Choose a new password">
      <form onSubmit={submit} className="auth-form">
        <Field label="New password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} value={password} onChange={(e) => setPassword(e.target.value)} hint={`At least ${PASSWORD_MIN} characters.`} autoFocus />
        {f.error && <Notice kind="error">{f.error}</Notice>}
        <button className="auth-primary" disabled={f.busy || !token}>
          Set password
        </button>
      </form>
      <nav className="auth-links">
        <a href="/forgot">Request a new link</a>
      </nav>
    </Card>
  )
}

function Account() {
  const [email, setEmail] = useState<string | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [changed, setChanged] = useState(false)
  const [delPassword, setDelPassword] = useState('')
  const [confirm, setConfirm] = useState(false)
  const pw = useForm()
  const del = useForm()
  useEffect(() => {
    void fetch('/api/auth/me').then(async (r) => (r.ok ? setEmail((await r.json()).email) : go('/login')))
  }, [])
  if (!email) return null
  return (
    <Card title="Your account" wide>
      <p>
        Logged in as <strong>{email}</strong>
      </p>
      <nav className="auth-links row">
        <a href="/">Back to the IDE</a>
        <button className="auth-link-btn" onClick={() => void post('/api/auth/logout', {}).then(() => go('/login'))}>
          Log out
        </button>
      </nav>
      <h2>Change password</h2>
      <form
        className="auth-form"
        onSubmit={pw.run(async () => {
          const r = await post('/api/auth/password', { current, password: next })
          if (r.status === 200) {
            setChanged(true)
            setCurrent('')
            setNext('')
          } else pw.setError(r.data.message ?? 'Something went wrong.')
        })}
      >
        <Field label="Current password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Field label="New password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} value={next} onChange={(e) => setNext(e.target.value)} hint={`At least ${PASSWORD_MIN} characters. Other devices are logged out.`} />
        {pw.error && <Notice kind="error">{pw.error}</Notice>}
        {changed && <Notice kind="success">Password changed.</Notice>}
        <button className="auth-secondary" disabled={pw.busy}>
          Change password
        </button>
      </form>
      <h2>Delete account</h2>
      <p className="auth-small">This permanently deletes your account, your saved projects and your task progress. It cannot be undone.</p>
      <form
        className="auth-form"
        onSubmit={del.run(async () => {
          const r = await post('/api/auth/delete', { password: delPassword })
          if (r.status === 200) {
            for (const k of Object.keys(localStorage)) if (k.startsWith('eprog-')) localStorage.removeItem(k)
            return go('/login?deleted')
          }
          del.setError(r.data.message ?? 'Something went wrong.')
        })}
      >
        <Field label="Password" type="password" autoComplete="current-password" required value={delPassword} onChange={(e) => setDelPassword(e.target.value)} />
        <label className="auth-check">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I understand that my data will be deleted
        </label>
        {del.error && <Notice kind="error">{del.error}</Notice>}
        <button className="auth-danger" disabled={del.busy || !confirm}>
          Delete my account
        </button>
      </form>
    </Card>
  )
}

interface Mail {
  to: string
  subject: string
  text: string
  link?: string
  at: number
}

/** Development stand-in for a real mailbox. */
function DevMail() {
  const [mails, setMails] = useState<Mail[] | null>(null)
  useEffect(() => {
    const load = () => void fetch('/api/dev/outbox').then(async (r) => setMails(r.ok ? (await r.json()).mails : []))
    load()
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <Card title="Dev mail outbox" wide>
      <p className="auth-small">Development only: mails the server would send. Newest first, refreshes automatically.</p>
      {mails?.length === 0 && <p>No mails yet.</p>}
      {mails?.map((m) => (
        <article key={m.at + m.to + m.subject} className="dev-mail">
          <header>
            <strong>{m.subject}</strong>
            <span>
              to {m.to} · {new Date(m.at).toLocaleTimeString()}
            </span>
          </header>
          {m.link && (
            <a className="dev-mail-link" href={m.link}>
              {m.link}
            </a>
          )}
          <pre>{m.text}</pre>
        </article>
      ))}
    </Card>
  )
}

const PAGES: Record<string, () => ReactNode> = {
  '/login': Login,
  '/signup': Signup,
  '/verify': Verify,
  '/forgot': Forgot,
  '/reset': Reset,
  '/account': Account,
  '/dev/mail': DevMail,
}

export function AuthApp() {
  const Page = PAGES[location.pathname] ?? Login
  return (
    <div className="auth-page">
      <Page />
      <footer className="auth-footer">A practice environment by students, for students.</footer>
    </div>
  )
}
