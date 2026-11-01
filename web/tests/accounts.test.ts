import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { ETH_EMAIL, RateLimiter, hashPassword, normalizeEmail, parseCookies, passwordProblem, verifyPassword } from '../server/auth.ts'
import { AccountDb } from '../server/db.ts'
import { DevMailer } from '../server/mailer.ts'
import { createAccounts } from '../server/api.ts'
import { initials } from '../src/account/initials.ts'

test('only ETH addresses (incl. subdomains) are accepted', () => {
  for (const ok of ['jdoe@ethz.ch', 'Jane.Doe@student.ethz.ch', 'a+b@inf.ethz.ch', 'x@sub.dept.ethz.ch', 'JDOE@ETHZ.CH']) assert.ok(ETH_EMAIL.test(ok), ok)
  for (const bad of ['jdoe@fooethz.ch', 'jdoe@ethz.ch.evil.com', 'jdoe@ethz.com', 'jdoe@ethzch', 'jdoe@.ethz.ch', 'jdoe@student..ethz.ch', 'jdoe@evil.com@ethz.ch', 'j doe@ethz.ch', '@ethz.ch', 'jdoe@eth_z.ethz.ch', 'jdoe@ethz.ch\n']) assert.ok(!ETH_EMAIL.test(bad), bad)
  assert.equal(normalizeEmail('  Jane@Student.ETHZ.ch '), 'jane@student.ethz.ch')
  assert.equal(normalizeEmail(42), null)
})

test('passwords: argon2id hashes verify and rules are length-based', async () => {
  const h = await hashPassword('correct horse battery')
  assert.match(h, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
  assert.ok(await verifyPassword('correct horse battery', h))
  assert.ok(!(await verifyPassword('correct horse batterz', h)))
  assert.ok(!(await verifyPassword('x', 'garbage')))
  assert.ok(passwordProblem('short'))
  assert.ok(passwordProblem('jdoe-is-my-password', 'jdoe@ethz.ch'))
  assert.equal(passwordProblem('a long enough passphrase'), null)
})

test('helpers: cookies, rate limiter, initials', () => {
  assert.deepEqual(parseCookies('a=1; eprog_session=x%3Dy'), { a: '1', eprog_session: 'x=y' })
  const rl = new RateLimiter(2, 1000)
  assert.ok(rl.take('k', 0) && rl.take('k', 1))
  assert.ok(!rl.take('k', 2))
  assert.ok(rl.take('k', 1500))
  assert.equal(initials('jane.doe@student.ethz.ch'), 'JD')
  assert.equal(initials('jdoe@ethz.ch'), 'JD')
})

// ---- API against a real HTTP server with an in-memory database

let server: http.Server
let base = ''
let db: AccountDb
const mailer = new DevMailer(() => {})

before(async () => {
  db = new AccountDb(':memory:')
  const accounts = createAccounts({ db, mailer, secureCookies: false, dev: true })
  server = http.createServer(async (req, res) => {
    if (await accounts.handle(req, res)) return
    const page = accounts.page(req)
    if (page && 'redirect' in page) return void res.writeHead(302, { Location: page.redirect }).end()
    if (page) return void res.writeHead(200).end(page.serve)
    res.writeHead(200).end('runner') // stands in for the dev runner behind the wall
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
after(() => server.close())

async function call(path: string, body?: object, cookie = '', method = body ? 'POST' : 'GET', extra: Record<string, string> = {}) {
  const res = await fetch(base + path, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', Cookie: cookie, ...extra }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text)
  } catch {
    data = { text }
  }
  return { status: res.status, data, cookie: (res.headers.get('set-cookie') ?? '').split(';')[0], location: res.headers.get('location') }
}
const lastLink = (to: string) => mailer.outbox.find((m) => m.to === to && m.link)!.link!
const tokenOf = (link: string) => new URL(link).searchParams.get('token')!

test('sign-up, verification, login, logout and the login wall', async () => {
  const email = 'ana@student.ethz.ch'
  const password = 'a long enough passphrase'
  assert.equal((await call('/api/auth/signup', { email: 'ana@fooethz.ch', password })).status, 400)
  assert.equal((await call('/api/auth/signup', { email, password: 'short' })).status, 400)
  assert.equal((await call('/api/auth/signup', { email, password })).status, 200)

  // unverified: correct password gives 403, wrong password 401 (no hint whether the account exists)
  assert.equal((await call('/api/auth/login', { email, password })).data.error, 'unverified')
  assert.equal((await call('/api/auth/login', { email, password: 'wrong wrong wrong' })).status, 401)
  assert.equal((await call('/api/auth/login', { email: 'nobody@ethz.ch', password })).status, 401)

  const token = tokenOf(lastLink(email))
  assert.equal((await call('/api/auth/verify', { token })).status, 200)
  assert.equal((await call('/api/auth/verify', { token })).data.error, 'invalid', 'tokens are single-use')

  // the wall: pages redirect, API answers 401, runner routes are not reached
  assert.equal((await call('/')).location, '/login')
  assert.equal((await call('/api/run', {})).status, 401)
  assert.equal((await call('/api/auth/me')).status, 401)
  assert.equal((await call('/login')).data.text, 'auth')

  const login = await call('/api/auth/login', { email: 'ANA@student.ethz.ch', password })
  assert.equal(login.status, 200)
  assert.match(login.cookie, /^eprog_session=/)
  assert.equal((await call('/api/auth/me', undefined, login.cookie)).data.email, email)
  assert.equal((await call('/', undefined, login.cookie)).data.text, 'ide')
  assert.equal((await call('/login', undefined, login.cookie)).location, '/')
  assert.equal((await call('/api/run', {}, login.cookie)).data.text, 'runner')

  // CSRF: a foreign Origin is refused even with a valid cookie
  assert.equal((await call('/api/run', {}, login.cookie, 'POST', { Origin: 'https://evil.example' })).status, 403)

  await call('/api/auth/logout', {}, login.cookie)
  assert.equal((await call('/api/auth/me', undefined, login.cookie)).status, 401)
})

test('verification tokens expire', async () => {
  const email = 'late@ethz.ch'
  await call('/api/auth/signup', { email, password: 'another passphrase' })
  const token = tokenOf(lastLink(email))
  db.db.prepare("UPDATE tokens SET expires_at = 0 WHERE kind = 'verify'").run()
  assert.equal((await call('/api/auth/verify', { token })).data.error, 'expired')
})

test('password reset, per-user state and account deletion', async () => {
  const email = 'ben@inf.ethz.ch'
  await call('/api/auth/signup', { email, password: 'first passphrase!' })
  await call('/api/auth/verify', { token: tokenOf(lastLink(email)) })
  const first = (await call('/api/auth/login', { email, password: 'first passphrase!' })).cookie

  // state is stored per user and validated
  const put = (key: string, body: string, cookie: string) => fetch(`${base}/api/state/${key}`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body })
  assert.equal((await put('eprog-ide', '{"state":{"files":{}},"version":1}', first)).status, 200)
  assert.equal((await put('not-ours', '{}', first)).status, 400)
  assert.equal((await put('eprog-ide', '{broken', first)).status, 400)
  assert.equal((await put('eprog-ide', '{}', '')).status, 401)
  assert.deepEqual((await call('/api/state', undefined, first)).data.state, { 'eprog-ide': '{"state":{"files":{}},"version":1}' })

  // forgot -> reset: new password works, old sessions end, the token is single-use
  assert.equal((await call('/api/auth/forgot', { email: 'unknown@ethz.ch' })).status, 200)
  await call('/api/auth/forgot', { email })
  const token = tokenOf(lastLink(email))
  assert.equal((await call('/api/auth/reset', { token, password: 'second passphrase!' })).status, 200)
  assert.equal((await call('/api/auth/reset', { token, password: 'third passphrase!!' })).data.error, 'invalid')
  assert.equal((await call('/api/auth/me', undefined, first)).status, 401)
  assert.equal((await call('/api/auth/login', { email, password: 'first passphrase!' })).status, 401)
  const second = (await call('/api/auth/login', { email, password: 'second passphrase!' })).cookie

  // deletion needs the password and removes everything
  assert.equal((await call('/api/auth/delete', { password: 'nope nope nope' }, second)).status, 401)
  assert.equal((await call('/api/auth/delete', { password: 'second passphrase!' }, second)).status, 200)
  assert.equal(db.userByEmail(email), undefined)
  assert.equal((db.db.prepare('SELECT COUNT(*) AS n FROM user_state').get() as { n: number }).n, 0)
  assert.equal((await call('/api/auth/me', undefined, second)).status, 401)
})

test('signing up again for a verified address sends a notice, not a second account', async () => {
  const email = 'cleo@ethz.ch'
  assert.equal((await call('/api/auth/signup', { email, password: 'my passphrase 1x' })).data.message, undefined)
  await call('/api/auth/verify', { token: tokenOf(lastLink(email)) })
  assert.equal((await call('/api/auth/signup', { email, password: 'other passphrase 2' })).status, 200)
  assert.match(mailer.outbox[0].subject, /already have/)
  assert.equal((await call('/api/auth/login', { email, password: 'my passphrase 1x' })).status, 200)
})
