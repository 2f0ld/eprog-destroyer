import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/**
 * zustand `persist` storage that keeps the persisted stores (IDE workspaces, task progress, breakpoints) on
 * the server per user (PUT /api/state/:key) instead of localStorage. Values are cached in memory: the
 * bootstrap (account/bootstrap.ts) loads them before the IDE renders and rehydrates the stores; writes are
 * debounced. Before the bootstrap ran, writes are ignored so default state never overwrites saved state.
 *
 * Without an accounts server (static `vite preview`) the storage falls back to localStorage ("local" mode).
 */

const SAVE_DELAY_MS = 800
const RETRY_MS = 5000

const cache = new Map<string, string>()
const pending = new Map<string, string>()
let mode: 'off' | 'server' | 'local' = 'off'
let timer: number | undefined
let saving: Promise<void> | null = null
let onError: (message: string) => void = () => {}

const raw: StateStorage = {
  getItem: (name) => (mode === 'local' ? localStorage.getItem(name) : (cache.get(name) ?? null)),
  setItem: (name, value) => {
    if (mode === 'local') return localStorage.setItem(name, value)
    if (mode !== 'server' || cache.get(name) === value) return
    cache.set(name, value)
    pending.set(name, value)
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void flushState(), SAVE_DELAY_MS)
  },
  removeItem: (name) => {
    if (mode === 'local') localStorage.removeItem(name)
    else cache.delete(name)
  },
}

/** Use as `storage` in persist options of every store that belongs to the user. */
export const syncedStorage = createJSONStorage(() => raw)

export function startServerStorage(values: Record<string, string>, reportError: (message: string) => void) {
  for (const [k, v] of Object.entries(values)) cache.set(k, v)
  onError = reportError
  mode = 'server'
}

export function startLocalStorage() {
  mode = 'local'
}

async function put(key: string, value: string, keepalive = false) {
  const res = await fetch(`/api/state/${encodeURIComponent(key)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: value, keepalive })
  if (res.status === 401) location.href = '/login'
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? `HTTP ${res.status}`)
}

/** Send all pending changes now (also used before logging out). */
export async function flushState(): Promise<void> {
  window.clearTimeout(timer)
  if (saving) await saving
  if (!pending.size) return
  saving = (async () => {
    for (const [key, value] of [...pending]) {
      pending.delete(key)
      try {
        await put(key, value)
      } catch (e) {
        if (!pending.has(key)) pending.set(key, value)
        onError((e as Error).message)
        timer = window.setTimeout(() => void flushState(), RETRY_MS)
        return
      }
    }
  })()
  await saving
  saving = null
}

/** Best effort when the tab closes: small payloads survive the unload via keepalive. */
export function flushOnUnload() {
  for (const [key, value] of pending) if (value.length < 60_000) void put(key, value, true).catch(() => {})
}

export const hasPendingChanges = () => pending.size > 0
