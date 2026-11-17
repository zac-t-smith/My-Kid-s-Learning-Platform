import { useSyncExternalStore } from 'react'
import { db, loadMeta, loadProfile, saveProfile, uuid, type Meta } from './db'
import { derive, type Derived } from './derive'
import { mergeAttempts, mergeProfiles } from './merge'
import { freshFields, freshProfile, type Attempt, type Backup, type Fields, type Profile } from './model'

export interface State {
  ready: boolean
  profile: Profile
  attempts: Attempt[]
  derived: Derived
  sync: { configured: boolean; email: string | null; status: 'off' | 'idle' | 'syncing' | 'error' | 'offline'; lastAt: number; error?: string }
}

let state: State = {
  ready: false,
  profile: freshProfile(),
  attempts: [],
  derived: derive([]),
  sync: { configured: false, email: null, status: 'off', lastAt: 0 },
}
let meta: Meta = { deviceId: 'pending', pullCursor: '' }
const subs = new Set<() => void>()
const changeHooks = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  subs.forEach((f) => f())
}
export const getState = () => state
export const S = () => state.profile.fields
export const getMeta = () => meta
export function useStore(): State {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
  )
}
/** Called whenever local data changes, so sync can schedule an upload. */
export const onLocalChange = (f: () => void) => (changeHooks.add(f), () => changeHooks.delete(f))
const changed = () => changeHooks.forEach((f) => f())

export async function initStore() {
  if (state.ready) return
  meta = await loadMeta()
  const stored = await loadProfile()
  const profile = stored ? { fields: { ...freshFields(), ...stored.fields }, times: stored.times || {} } : await migrateV1()
  const attempts = (await db.attempts.orderBy('ts').toArray()).filter((a) => a.ts > profile.fields.resetAt)
  set({ ready: true, profile, attempts, derived: derive(attempts) })
  // Ask the browser not to evict our data when the iPad gets low on space.
  try {
    void navigator.storage?.persist?.()
  } catch {
    /* not supported */
  }
}

/** First run: carry over settings from the old single-file prototype if it was used on this device. */
async function migrateV1(): Promise<Profile> {
  const p = freshProfile()
  try {
    const old = JSON.parse(localStorage.getItem('kam-math-allstars-v1') || 'null')
    if (old) {
      const now = Date.now()
      for (const k of ['name', 'theme', 'unlocked', 'current', 'seenLesson', 'voice', 'rate', 'autoRead', 'sfx', 'climbBest'] as const)
        if (old[k] !== undefined) {
          ;(p.fields as unknown as Record<string, unknown>)[k] = old[k]
          p.times[k] = now
        }
    }
  } catch {
    /* ignore a broken old save */
  }
  await saveProfile(p)
  return p
}

/** Change profile fields (settings, unlocks, ...). Saved to the device right away. */
export function update(patch: Partial<Fields>) {
  const now = Date.now()
  const profile: Profile = { fields: { ...state.profile.fields, ...patch }, times: { ...state.profile.times } }
  for (const k of Object.keys(patch) as (keyof Fields)[]) profile.times[k] = now
  set({ profile })
  void saveProfile(profile).then(changed)
}

export type NewAttempt = Omit<Attempt, 'id' | 'ts' | 'device' | 'synced'>
/** Record one answer. Written to IndexedDB the moment it happens. */
export function addAttempt(a: NewAttempt): Attempt {
  const last = state.attempts[state.attempts.length - 1]
  const full: Attempt = { ...a, id: uuid(), ts: Math.max(Date.now(), (last?.ts ?? 0) + 1), device: meta.deviceId, synced: 0 }
  const attempts = [...state.attempts, full]
  set({ attempts, derived: derive(attempts) })
  void db.attempts.put(full).then(changed)
  return full
}

/**
 * Fold merged data (from a sync or an import) into this device.
 * Never drops an answer recorded while the merge was running: the result is re-unioned with what is in memory.
 */
export async function applyMerged(profile: Profile, incoming: Attempt[]) {
  const resetAt = profile.fields.resetAt
  await db.transaction('rw', db.attempts, db.kv, async () => {
    if (resetAt) await db.attempts.where('ts').belowOrEqual(resetAt).delete()
    await db.attempts.bulkPut(incoming.filter((a) => a.ts > resetAt))
    await db.kv.put({ key: 'profile', value: profile })
  })
  const attempts = mergeAttempts(state.attempts, incoming, resetAt)
  set({ profile, attempts, derived: derive(attempts) })
}

export function setSync(patch: Partial<State['sync']>) {
  set({ sync: { ...state.sync, ...patch } })
}
export async function setPullCursor(c: string) {
  meta = { ...meta, pullCursor: c }
  await db.kv.put({ key: 'meta', value: meta })
}

/** Parent: erase progress but keep settings. The erase itself syncs to other devices. */
export async function eraseProgress() {
  const last = state.attempts[state.attempts.length - 1]
  const now = Math.max(Date.now(), last?.ts ?? 0)
  const f = state.profile.fields
  const profile: Profile = {
    fields: { ...f, unlocked: 0, current: 0, seenLesson: {}, climbBest: 0, resetAt: now, parentAt: now },
    times: { ...state.profile.times, unlocked: now, current: now, seenLesson: now, climbBest: now, resetAt: now, parentAt: now },
  }
  await applyMerged(profile, [])
  changed()
}

export function exportBackup(): Backup {
  return { app: 'kams-math-all-stars', version: 1, exportedAt: Date.now(), profile: state.profile, attempts: state.attempts }
}

/** Parent: merge a backup file into this device. Nothing already here is lost. */
export async function importBackup(raw: unknown): Promise<number> {
  const b = raw as Backup
  if (!b || b.app !== 'kams-math-all-stars' || !b.profile?.fields || !Array.isArray(b.attempts)) throw new Error('That file is not a Math All-Stars backup.')
  const incoming = b.attempts.filter((a) => a && typeof a.id === 'string' && typeof a.ts === 'number' && typeof a.L === 'number').map((a) => ({ ...a, synced: 0 as const }))
  const profile = mergeProfiles(state.profile, { fields: { ...freshFields(), ...b.profile.fields }, times: b.profile.times || {} })
  const before = state.attempts.length
  await applyMerged(profile, incoming)
  changed()
  return state.attempts.length - before
}
