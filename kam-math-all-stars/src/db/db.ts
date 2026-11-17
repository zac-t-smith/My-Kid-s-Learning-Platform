import Dexie, { type Table } from 'dexie'
import type { Attempt, Profile } from './model'

export interface Meta {
  deviceId: string
  /** Server time of the newest cloud attempt we have pulled. */
  pullCursor: string
}
interface KV {
  key: string
  value: unknown
}

class AppDB extends Dexie {
  attempts!: Table<Attempt, string>
  kv!: Table<KV, string>
  constructor() {
    super('kam-math-allstars-v2')
    this.version(1).stores({ attempts: 'id, ts, synced', kv: 'key' })
  }
}
export const db = new AppDB()

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}
export const kvSet = (key: string, value: unknown) => db.kv.put({ key, value })
export const loadProfile = () => kvGet<Profile>('profile')
export const saveProfile = (p: Profile) => kvSet('profile', p)

export const uuid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ ((Math.random() * 16) >> (+c / 4))).toString(16))

export async function loadMeta(): Promise<Meta> {
  let m = await kvGet<Meta>('meta')
  if (!m) {
    m = { deviceId: uuid(), pullCursor: '' }
    await kvSet('meta', m)
  }
  return m
}
