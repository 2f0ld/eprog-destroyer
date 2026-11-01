/**
 * Pure account helpers (unit-tested in tests/accounts.test.ts): ETH address check, argon2id password
 * hashes, random tokens, cookies. Uses only node:crypto, so there are no native dependencies (DECISIONS D20).
 */
import { argon2, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { ETH_EMAIL } from '../src/auth/email.ts'

export { ETH_EMAIL }

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  return email.length <= 254 && ETH_EMAIL.test(email) ? email : null
}

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 200

/** Returns an error message, or null if the password is acceptable (NIST 800-63B: length over composition rules). */
export function passwordProblem(pw: unknown, email?: string): string | null {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (pw.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`
  if (email && pw.toLowerCase().includes(email.split('@')[0])) return 'The password must not contain your user name.'
  return null
}

// OWASP Password Storage Cheat Sheet, argon2id minimum: m=19 MiB, t=2, p=1
const ARGON = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 }

function argon2id(password: string, salt: Buffer, p: typeof ARGON): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    argon2('argon2id', { message: password, nonce: salt, memory: p.memory, passes: p.passes, parallelism: p.parallelism, tagLength: p.tagLength }, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

/** PHC string, e.g. `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>` (base64 without padding). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await argon2id(password, salt, ARGON)
  return `$argon2id$v=19$m=${ARGON.memory},t=${ARGON.passes},p=${ARGON.parallelism}$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export async function verifyPassword(password: string, phc: string): Promise<boolean> {
  const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/.exec(phc)
  if (!m) return false
  const expected = Buffer.from(m[5], 'base64url')
  const actual = await argon2id(password, Buffer.from(m[4], 'base64url'), { memory: Number(m[1]), passes: Number(m[2]), parallelism: Number(m[3]), tagLength: expected.length })
  return timingSafeEqual(actual, expected)
}

/** A random token for links and cookies; only its SHA-256 is stored, so a database leak reveals no usable token. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function cookie(name: string, value: string, opts: { maxAge: number; secure: boolean }) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${opts.maxAge}${opts.secure ? '; Secure' : ''}`
}

/** Fixed-window limiter in memory (one server process; M6 can move it to a shared store). */
export class RateLimiter {
  private hits = new Map<string, number[]>()
  private max: number
  private windowMs: number
  constructor(max: number, windowMs: number) {
    this.max = max
    this.windowMs = windowMs
  }
  /** Records an attempt; false if the key is over its limit. */
  take(key: string, now = Date.now()): boolean {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs)
    if (list.length >= this.max) {
      this.hits.set(key, list)
      return false
    }
    list.push(now)
    this.hits.set(key, list)
    if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k)
    return true
  }
  reset(key: string) {
    this.hits.delete(key)
  }
}
