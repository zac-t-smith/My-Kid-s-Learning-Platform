import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { db } from '../db/db'
import { mergeAttempts, mergeGames, mergeProfiles, profilesEqual } from '../db/merge'
import type { GameRecord } from '../game/ballgame'
import { freshFields, type Attempt, type Profile } from '../db/model'
import { applyMerged, getMeta, getState, onLocalChange, setPullCursor, setSync } from '../db/store'

/**
 * Cloud sync. The app is local-first: everything works with no network and no account.
 * When the family is signed in, the attempt log and profile are merged with Supabase in the background.
 * Conflicts: attempts are unioned by id; profile fields merge per field (see db/merge.ts).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null

let running: Promise<void> | null = null
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

export async function initSync() {
  if (!supabase) return
  setSync({ configured: true, status: 'idle' })
  const { data } = await supabase.auth.getSession()
  setSync({ email: data.session?.user.email ?? null })
  supabase.auth.onAuthStateChange((_e, session) => {
    setSync({ email: session?.user.email ?? null })
    if (session) schedule(200)
  })
  onLocalChange(() => schedule(2500))
  window.addEventListener('online', () => schedule(200))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && schedule(200))
  setInterval(() => document.visibilityState === 'visible' && schedule(0), 60_000)
  schedule(500)
}

function schedule(ms: number) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), ms)
}

export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = run()
    .catch((e: unknown) => setSync({ status: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) }))
    .finally(() => {
      running = null
      if (again) {
        again = false
        schedule(300)
      }
    })
  return running
}

type Row = { id: string; ts: number; data: Omit<Attempt, 'synced'>; inserted_at: string }

async function run() {
  if (!supabase) return
  const { data: sess } = await supabase.auth.getSession()
  const user = sess.session?.user
  if (!user) return setSync({ status: 'idle' })
  if (!navigator.onLine) return setSync({ status: 'offline' })
  setSync({ status: 'syncing', error: undefined })

  // 1. Profile: merge the cloud copy with ours, write back whichever side is behind.
  const remote = await supabase.from('family_profile').select('data').eq('family_id', user.id).maybeSingle()
  if (remote.error) throw remote.error
  const local = getState().profile
  const remoteProfile = remote.data?.data as Profile | undefined
  const merged = remoteProfile ? mergeProfiles(local, { fields: { ...freshFields(), ...remoteProfile.fields }, times: remoteProfile.times || {} }) : local
  if (!remoteProfile || !profilesEqual(merged, remoteProfile)) {
    const up = await supabase.from('family_profile').upsert({ family_id: user.id, data: merged, updated_at: new Date().toISOString() })
    if (up.error) throw up.error
  }
  const resetAt = merged.fields.resetAt

  // 2. If a parent erased progress, erase the same attempts in the cloud.
  if (resetAt) {
    const del = await supabase.from('attempts').delete().eq('family_id', user.id).lte('ts', resetAt)
    if (del.error) throw del.error
  }

  const now0 = getState()

  // 3. Upload attempts this device has not sent yet.
  const unsent = (await db.attempts.where('synced').equals(0).toArray()).filter((a) => a.ts > resetAt)
  for (let i = 0; i < unsent.length; i += 500) {
    const chunk = unsent.slice(i, i + 500)
    const rows = chunk.map(({ synced: _s, ...data }) => ({ id: data.id, family_id: user.id, ts: data.ts, data }))
    const up = await supabase.from('attempts').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    if (up.error) throw up.error
    await db.attempts.bulkPut(chunk.map((a) => ({ ...a, synced: 1 as const })))
  }

  // 4. Download attempts other devices have sent since our last pull.
  const cursor = getMeta().pullCursor
  const pulled: Attempt[] = []
  let newest = cursor
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('attempts').select('id, ts, data, inserted_at').eq('family_id', user.id)
    if (cursor) q = q.gte('inserted_at', cursor)
    const page = await q.order('inserted_at').order('id').range(from, from + 999)
    if (page.error) throw page.error
    for (const r of page.data as Row[]) {
      pulled.push({ ...r.data, id: r.id, ts: Number(r.ts), synced: 1 })
      if (r.inserted_at > newest) newest = r.inserted_at
    }
    if (page.data.length < 1000) break
  }

  // 4b. Finished games: small table, so send what is new and fetch them all.
  if (resetAt) {
    const del = await supabase.from('games').delete().eq('family_id', user.id).lte('ts', resetAt)
    if (del.error) throw del.error
  }
  const unsentGames = (await db.games.where('synced').equals(0).toArray()).filter((g) => g.ts > resetAt)
  if (unsentGames.length) {
    const up = await supabase.from('games').upsert(unsentGames.map(({ synced: _s, ...data }) => ({ id: data.id, family_id: user.id, ts: data.ts, data })), { onConflict: 'id', ignoreDuplicates: true })
    if (up.error) throw up.error
  }
  const remoteGames = await supabase.from('games').select('id, ts, data').eq('family_id', user.id)
  if (remoteGames.error) throw remoteGames.error
  const games = mergeGames(
    unsentGames.map((g) => ({ ...g, synced: 1 as const })),
    (remoteGames.data as { id: string; ts: number; data: Omit<GameRecord, 'synced'> }[]).map((r) => ({ ...r.data, id: r.id, ts: Number(r.ts), synced: 1 as const })),
    resetAt,
  )
  const newGames = games.some((g) => !now0.games.find((x) => x.id === g.id && x.synced))

  // 5. Merge everything into the device (union of attempt history).
  const now = getState()
  const mergedNow = mergeProfiles(now.profile, merged)
  if (pulled.length || unsent.length || newGames || !profilesEqual(mergedNow, now.profile)) {
    const sent = unsent.map((a) => ({ ...a, synced: 1 as const }))
    await applyMerged(mergedNow, mergeAttempts(sent, pulled, resetAt), games)
  }
  if (newest !== cursor) await setPullCursor(newest)
  setSync({ status: 'idle', lastAt: Date.now() })
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Cloud sync is not set up for this build.'
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) await setPullCursor('')
  return error?.message ?? null
}
export async function signUp(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Cloud sync is not set up for this build.'
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return error.message
  return data.session ? null : 'Check your email to confirm the account, then sign in.'
}
export async function signOut() {
  await supabase?.auth.signOut()
  await setPullCursor('')
  setSync({ email: null, status: 'idle' })
}
/** Used for "Forgot PIN": prove you are the parent with the family account password. */
export async function checkPassword(password: string): Promise<boolean> {
  const email = getState().sync.email
  if (!supabase || !email) return false
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return !error
}
