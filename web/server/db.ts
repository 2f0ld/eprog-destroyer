/**
 * Account storage in SQLite via the built-in node:sqlite (no native dependency). Data minimisation: we keep
 * the e-mail address, a password hash, timestamps and the user's IDE state, nothing else.
 */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

export interface User {
  id: number
  email: string
  password_hash: string
  created_at: number
  verified_at: number | null
}

export type TokenKind = 'verify' | 'reset'

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_state (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);
`

export class AccountDb {
  db: DatabaseSync

  constructor(file: string) {
    if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true })
    this.db = new DatabaseSync(file)
    if (file !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL;')
    this.db.exec(SCHEMA)
  }

  userByEmail(email: string) {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined
  }
  userById(id: number) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined
  }
  createUser(email: string, passwordHash: string, now = Date.now()) {
    const r = this.db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)').run(email, passwordHash, now)
    return Number(r.lastInsertRowid)
  }
  setPassword(userId: number, passwordHash: string) {
    this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId)
  }
  markVerified(userId: number, now = Date.now()) {
    this.db.prepare('UPDATE users SET verified_at = COALESCE(verified_at, ?) WHERE id = ?').run(now, userId)
  }
  deleteUser(userId: number) {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  }

  createSession(tokenHash: string, userId: number, ttlMs: number, now = Date.now()) {
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, now, now + ttlMs)
  }
  sessionUser(tokenHash: string, now = Date.now()) {
    return this.db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').get(tokenHash, now) as User | undefined
  }
  deleteSession(tokenHash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
  }
  deleteSessionsOf(userId: number) {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
  }

  /** Stores a single-use token; earlier unused tokens of the same kind stop working. */
  createToken(tokenHash: string, userId: number, kind: TokenKind, ttlMs: number, now = Date.now()) {
    this.db.prepare('DELETE FROM tokens WHERE user_id = ? AND kind = ?').run(userId, kind)
    this.db.prepare('INSERT INTO tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, kind, now + ttlMs)
  }
  /** Marks the token used and returns its user id; 'expired'/'invalid' otherwise. */
  consumeToken(tokenHash: string, kind: TokenKind, now = Date.now()): number | 'expired' | 'invalid' {
    const row = this.db.prepare('SELECT user_id, expires_at, used_at FROM tokens WHERE token_hash = ? AND kind = ?').get(tokenHash, kind) as { user_id: number; expires_at: number; used_at: number | null } | undefined
    if (!row || row.used_at !== null) return 'invalid'
    if (row.expires_at <= now) return 'expired'
    const r = this.db.prepare('UPDATE tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL').run(now, tokenHash)
    return r.changes === 1 ? row.user_id : 'invalid'
  }

  getState(userId: number) {
    return this.db.prepare('SELECT key, value, updated_at FROM user_state WHERE user_id = ?').all(userId) as { key: string; value: string; updated_at: number }[]
  }
  stateSize(userId: number, exceptKey: string) {
    const r = this.db.prepare('SELECT COALESCE(SUM(LENGTH(value)), 0) AS n FROM user_state WHERE user_id = ? AND key != ?').get(userId, exceptKey) as { n: number }
    return r.n
  }
  putState(userId: number, key: string, value: string, now = Date.now()) {
    this.db.prepare('INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').run(userId, key, value, now)
  }

  /** Housekeeping: expired sessions and tokens, accounts never verified within a week. */
  purge(now = Date.now()) {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now)
    this.db.prepare('DELETE FROM tokens WHERE expires_at <= ? OR used_at IS NOT NULL').run(now - 24 * 3600_000)
    this.db.prepare('DELETE FROM users WHERE verified_at IS NULL AND created_at <= ?').run(now - 7 * 24 * 3600_000)
  }
}
