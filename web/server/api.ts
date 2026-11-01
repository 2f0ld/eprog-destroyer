/**
 * Accounts API (M4), framework-free so the same handler runs as Vite middleware in development
 * (devPlugin.ts) and in the production server (main.ts). DECISIONS D20/D21.
 *
 *   POST /api/auth/signup   {email, password}   always 200 (no account enumeration); sends a verification mail
 *   POST /api/auth/resend   {email}             new verification mail for an unverified account
 *   POST /api/auth/verify   {token}             single-use, 24 h; does not log in (link scanners may open it)
 *   POST /api/auth/login    {email, password}   sets the HTTP-only session cookie; 403 {error:'unverified'}
 *   POST /api/auth/logout
 *   GET  /api/auth/me       -> {email} | 401
 *   POST /api/auth/forgot   {email}             always 200; sends a reset mail (single-use, 1 h)
 *   POST /api/auth/reset    {token, password}   sets the password, ends all sessions
 *   POST /api/auth/password {current, password} change password (other sessions end)
 *   POST /api/auth/delete   {password}          deletes the account and all its data
 *   GET  /api/state         -> {state: {key: json}}  per-user IDE state (workspaces, task progress, breakpoints)
 *   PUT  /api/state/:key    raw JSON body (key `eprog-*`)
 *   GET  /api/dev/outbox    (development only) mails "sent" so far
 *
 * Every other /api/* route (runner, compile, debug) needs a session: `requireUser` answers 401 otherwise.
 * State-changing requests must come from our own origin (Origin header check) on top of SameSite=Lax cookies.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { AccountDb, type User } from './db.ts'
import type { Mailer } from './mailer.ts'
import { DevMailer } from './mailer.ts'
import { RateLimiter, cookie, hashPassword, hashToken, newToken, normalizeEmail, parseCookies, passwordProblem, verifyPassword } from './auth.ts'

export const SESSION_COOKIE = 'eprog_session'
const SESSION_TTL = 30 * 24 * 3600_000
const VERIFY_TTL = 24 * 3600_000
const RESET_TTL = 3600_000
const MAX_STATE_BYTES = 20 * 1024 * 1024
const STATE_KEY = /^eprog-[a-z0-9-]{1,40}$/

/** Pages of the auth app (auth.html); everything else is the IDE behind the login wall. */
export const AUTH_PAGES = ['/login', '/signup', '/verify', '/forgot', '/reset', '/account', '/dev/mail']

export interface AccountsOptions {
  db: AccountDb
  mailer: Mailer
  /** origin used in mail links; development derives it from the Host header */
  publicUrl?: string
  secureCookies: boolean
  dev: boolean
}

class HttpError extends Error {
  status: number
  body: object
  constructor(status: number, body: object) {
    super(String(status))
    this.status = status
    this.body = body
  }
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) {
        reject(new HttpError(413, { error: 'too-large' }))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  try {
    const v = JSON.parse(await readBody(req, 64 * 1024))
    return v && typeof v === 'object' ? v : {}
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(400, { error: 'bad-json' })
  }
}

function json(res: ServerResponse, status: number, body: object, headers: Record<string, string | string[]> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

const clientIp = (req: IncomingMessage) => req.socket.remoteAddress ?? '?'

export function createAccounts(opts: AccountsOptions) {
  const { db, mailer } = opts
  const signupLimit = new RateLimiter(20, 3600_000) // per IP
  const mailLimit = new RateLimiter(3, 15 * 60_000) // per address
  const loginLimit = new RateLimiter(10, 15 * 60_000) // failed attempts per address + IP

  const origin = (req: IncomingMessage) => opts.publicUrl ?? `${opts.secureCookies ? 'https' : 'http'}://${req.headers.host}`

  function userOf(req: IncomingMessage): User | undefined {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    return token ? db.sessionUser(hashToken(token)) : undefined
  }

  function startSession(res: ServerResponse, userId: number) {
    const { token, hash } = newToken()
    db.createSession(hash, userId, SESSION_TTL)
    res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL / 1000, secure: opts.secureCookies }))
  }
  const clearCookie = () => ({ 'Set-Cookie': cookie(SESSION_COOKIE, '', { maxAge: 0, secure: opts.secureCookies }) })

  async function sendVerification(req: IncomingMessage, user: { id: number; email: string }) {
    if (!mailLimit.take(user.email)) return
    const { token, hash } = newToken()
    db.createToken(hash, user.id, 'verify', VERIFY_TTL)
    const link = `${origin(req)}/verify?token=${token}`
    await mailer.send({
      to: user.email,
      subject: 'Confirm your e-mail address for EProg Practice',
      text: `Hello,\n\nplease confirm your e-mail address to finish creating your EProg Practice account:\n\n${link}\n\nThe link is valid for 24 hours and can be used once. If you did not sign up, ignore this mail.\n`,
      link,
    })
  }

  async function sendReset(req: IncomingMessage, user: User) {
    if (!mailLimit.take(user.email)) return
    const { token, hash } = newToken()
    db.createToken(hash, user.id, 'reset', RESET_TTL)
    const link = `${origin(req)}/reset?token=${token}`
    await mailer.send({
      to: user.email,
      subject: 'Reset your EProg Practice password',
      text: `Hello,\n\nsomeone (hopefully you) asked to reset the password of your EProg Practice account:\n\n${link}\n\nThe link is valid for one hour and can be used once. If you did not ask for this, ignore this mail; your password stays the same.\n`,
      link,
    })
  }

  /** Session check for the IDE's API routes (runner, compile, debug, state). */
  function requireUser(req: IncomingMessage): User {
    const user = userOf(req)
    if (!user) throw new HttpError(401, { error: 'login-required' })
    return user
  }

  function checkOrigin(req: IncomingMessage) {
    if (req.method === 'GET' || req.method === 'HEAD') return
    const o = req.headers.origin
    if (o && o !== origin(req)) throw new HttpError(403, { error: 'bad-origin' })
  }

  const routes: Record<string, (req: IncomingMessage, res: ServerResponse) => Promise<void>> = {
    'POST /api/auth/signup': async (req, res) => {
      const body = await readJson(req)
      const email = normalizeEmail(body.email)
      if (!email) return json(res, 400, { error: 'email', message: 'Use your ETH address (…@ethz.ch or e.g. …@student.ethz.ch).' })
      const problem = passwordProblem(body.password, email)
      if (problem) return json(res, 400, { error: 'password', message: problem })
      if (!signupLimit.take(clientIp(req))) return json(res, 429, { error: 'rate', message: 'Too many sign-ups from your network. Try again later.' })
      const existing = db.userByEmail(email)
      const hash = await hashPassword(body.password as string)
      if (!existing) {
        await sendVerification(req, { id: db.createUser(email, hash), email })
      } else if (!existing.verified_at) {
        db.setPassword(existing.id, hash) // the latest sign-up wins until the address is confirmed
        await sendVerification(req, existing)
      } else if (mailLimit.take(email)) {
        await mailer.send({
          to: email,
          subject: 'You already have an EProg Practice account',
          text: `Hello,\n\nsomeone tried to sign up with your address, but you already have an account. Log in at ${origin(req)}/login or reset your password at ${origin(req)}/forgot.\n`,
        })
      }
      json(res, 200, { ok: true })
    },
    'POST /api/auth/resend': async (req, res) => {
      const email = normalizeEmail((await readJson(req)).email)
      const user = email ? db.userByEmail(email) : undefined
      if (user && !user.verified_at) await sendVerification(req, user)
      json(res, 200, { ok: true })
    },
    'POST /api/auth/verify': async (req, res) => {
      const token = (await readJson(req)).token
      const r = typeof token === 'string' ? db.consumeToken(hashToken(token), 'verify') : 'invalid'
      if (typeof r !== 'number') return json(res, 400, { error: r })
      db.markVerified(r)
      json(res, 200, { ok: true, email: db.userById(r)?.email })
    },
    'POST /api/auth/login': async (req, res) => {
      const body = await readJson(req)
      const email = normalizeEmail(body.email)
      const key = `${email}|${clientIp(req)}`
      if (!loginLimit.take(key)) return json(res, 429, { error: 'rate', message: 'Too many attempts. Wait a few minutes and try again.' })
      const user = email ? db.userByEmail(email) : undefined
      // hash even for unknown users so response times do not reveal which addresses exist
      const ok = user ? await verifyPassword(String(body.password ?? ''), user.password_hash) : (await hashPassword('x'), false)
      if (!user || !ok) return json(res, 401, { error: 'credentials', message: 'Incorrect e-mail address or password.' })
      if (!user.verified_at) return json(res, 403, { error: 'unverified', message: 'Please confirm your e-mail address first.' })
      loginLimit.reset(key)
      startSession(res, user.id)
      json(res, 200, { email: user.email })
    },
    'POST /api/auth/logout': async (req, res) => {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
      if (token) db.deleteSession(hashToken(token))
      json(res, 200, { ok: true }, clearCookie())
    },
    'GET /api/auth/me': async (req, res) => {
      const user = requireUser(req)
      json(res, 200, { email: user.email })
    },
    'POST /api/auth/forgot': async (req, res) => {
      const email = normalizeEmail((await readJson(req)).email)
      const user = email ? db.userByEmail(email) : undefined
      if (user) await sendReset(req, user)
      json(res, 200, { ok: true })
    },
    'POST /api/auth/reset': async (req, res) => {
      const body = await readJson(req)
      const tokenHash = typeof body.token === 'string' ? hashToken(body.token) : ''
      const peek = db.db.prepare('SELECT u.email FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ?').get(tokenHash) as { email: string } | undefined
      const problem = passwordProblem(body.password, peek?.email)
      if (problem) return json(res, 400, { error: 'password', message: problem })
      const r = db.consumeToken(tokenHash, 'reset')
      if (typeof r !== 'number') return json(res, 400, { error: r })
      db.setPassword(r, await hashPassword(body.password as string))
      db.markVerified(r) // the reset link proves access to the mailbox
      db.deleteSessionsOf(r)
      json(res, 200, { ok: true, email: db.userById(r)?.email })
    },
    'POST /api/auth/password': async (req, res) => {
      const user = requireUser(req)
      const body = await readJson(req)
      if (!(await verifyPassword(String(body.current ?? ''), user.password_hash))) return json(res, 401, { error: 'credentials', message: 'The current password is not correct.' })
      const problem = passwordProblem(body.password, user.email)
      if (problem) return json(res, 400, { error: 'password', message: problem })
      db.setPassword(user.id, await hashPassword(body.password as string))
      db.deleteSessionsOf(user.id)
      startSession(res, user.id)
      json(res, 200, { ok: true })
    },
    'POST /api/auth/delete': async (req, res) => {
      const user = requireUser(req)
      const body = await readJson(req)
      if (!(await verifyPassword(String(body.password ?? ''), user.password_hash))) return json(res, 401, { error: 'credentials', message: 'The password is not correct.' })
      db.deleteUser(user.id) // sessions, tokens and saved state go with it (ON DELETE CASCADE)
      json(res, 200, { ok: true }, clearCookie())
    },
    'GET /api/state': async (req, res) => {
      const user = requireUser(req)
      json(res, 200, { state: Object.fromEntries(db.getState(user.id).map((r) => [r.key, r.value])) })
    },
    'GET /api/dev/outbox': async (_req, res) => {
      if (!opts.dev || !(mailer instanceof DevMailer)) return json(res, 404, { error: 'not-found' })
      json(res, 200, { mails: mailer.outbox })
    },
  }

  async function putState(req: IncomingMessage, res: ServerResponse, key: string) {
    const user = requireUser(req)
    if (!STATE_KEY.test(key)) return json(res, 400, { error: 'key' })
    const value = await readBody(req, 8 * 1024 * 1024)
    try {
      JSON.parse(value)
    } catch {
      return json(res, 400, { error: 'bad-json' })
    }
    if (db.stateSize(user.id, key) + value.length > MAX_STATE_BYTES) return json(res, 413, { error: 'quota', message: 'Your saved projects exceed the storage limit.' })
    db.putState(user.id, key, value)
    json(res, 200, { ok: true })
  }

  /**
   * Handles account routes and guards the rest of /api. Returns true if the request was answered;
   * false lets the caller continue (an authenticated request for the runner, or a non-API URL).
   */
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = (req.url ?? '/').split('?')[0]
    if (!url.startsWith('/api/')) return false
    try {
      checkOrigin(req)
      const route = routes[`${req.method} ${url}`]
      if (route) {
        await route(req, res)
        return true
      }
      const stateMatch = /^\/api\/state\/([^/]+)$/.exec(url)
      if (stateMatch && req.method === 'PUT') {
        await putState(req, res, decodeURIComponent(stateMatch[1]))
        return true
      }
      if (url.startsWith('/api/auth/') || url === '/api/state') {
        json(res, 404, { error: 'not-found' })
        return true
      }
      requireUser(req) // runner, compile, debug: logged-in users only
      return false
    } catch (e) {
      if (e instanceof HttpError) json(res, e.status, e.body)
      else {
        console.error(e)
        json(res, 500, { error: 'server' })
      }
      return true
    }
  }

  /** Login wall for pages: which HTML a GET for `path` gets (null = not a page we route). */
  function page(req: IncomingMessage): { redirect: string } | { serve: 'auth' | 'ide' } | null {
    const url = (req.url ?? '/').split('?')[0]
    if (req.method !== 'GET' && req.method !== 'HEAD') return null
    if (AUTH_PAGES.includes(url)) {
      if (url === '/dev/mail' && !opts.dev) return null
      if ((url === '/login' || url === '/signup') && userOf(req)) return { redirect: '/' }
      return { serve: 'auth' }
    }
    if (url === '/' || url === '/index.html') return userOf(req) ? { serve: 'ide' } : { redirect: '/login' }
    return null
  }

  return { handle, page, userOf }
}

export type Accounts = ReturnType<typeof createAccounts>
