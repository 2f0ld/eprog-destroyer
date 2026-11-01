import { create } from 'zustand'
import { useIde } from '../ide/store'
import { useTasks } from '../tasks/progress'
import { useDebugger } from '../debugger/store'
import { flushOnUnload, flushState, startLocalStorage, startServerStorage } from './serverStorage'

/** Persisted stores that live on the server per user; the names are their `persist` keys. */
const SYNCED: { key: string; rehydrate: () => unknown }[] = [
  { key: 'eprog-ide', rehydrate: () => useIde.persist.rehydrate() },
  { key: 'eprog-tasks', rehydrate: () => useTasks.persist.rehydrate() },
  { key: 'eprog-debugger', rehydrate: () => useDebugger.persist.rehydrate() },
]

export const useAccount = create<{ email: string | null; offline: boolean }>(() => ({ email: null, offline: false }))

/**
 * Runs before the IDE renders: checks the session (no session -> /login), loads the user's saved state and
 * migrates data a browser kept in localStorage before accounts existed (first login only: the server copy
 * wins once it exists). Returns false when the page is being redirected.
 */
export async function bootstrapAccount(): Promise<boolean> {
  let me: Response | null = null
  try {
    me = await fetch('/api/auth/me', { cache: 'no-store' })
  } catch {
    /* no server */
  }
  if (me?.status === 401) {
    location.replace('/login')
    return false
  }
  if (!me?.ok || !me.headers.get('content-type')?.includes('json')) {
    // static hosting without the accounts API (e.g. `vite preview`): keep everything in this browser
    startLocalStorage()
    useAccount.setState({ offline: true })
    for (const s of SYNCED) await s.rehydrate()
    return true
  }
  const { email } = await me.json()
  const { state } = (await (await fetch('/api/state', { cache: 'no-store' })).json()) as { state: Record<string, string> }

  for (const { key } of SYNCED) {
    const local = localStorage.getItem(key)
    if (local === null) continue
    if (!(key in state)) {
      const res = await fetch(`/api/state/${key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: local })
      if (!res.ok) continue // keep the local copy and try again next time
      state[key] = local
    }
    localStorage.removeItem(key) // the account is the only copy from now on (shared computers!)
  }

  startServerStorage(state, (message) => useIde.getState().notify({ kind: 'error', title: 'Could not save your changes', body: `${message}. Retrying…` }))
  for (const s of SYNCED) await s.rehydrate()
  useAccount.setState({ email })
  addEventListener('pagehide', flushOnUnload)
  return true
}

export async function logOut() {
  await flushState()
  await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {})
  location.href = '/login'
}
