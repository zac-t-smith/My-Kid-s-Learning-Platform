import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import { derive, mastered } from '../src/db/derive'
import { mergeAttempts, mergeProfiles, profilesEqual } from '../src/db/merge'
import { freshProfile, type Attempt, type Profile } from '../src/db/model'
import { addAttempt, eraseProgress, exportBackup, getState, importBackup, initStore, update } from '../src/db/store'

const att = (id: string, ts: number, over: Partial<Attempt> = {}): Attempt => ({ id, ts, L: 0, mode: 'round', fmt: 'solve', q: '54 − 20', target: 34, ok: true, first: true, tries: 1, helped: false, ms: 3000, device: 'd', synced: 0, ...over })
const prof = (fields: Partial<Profile['fields']>, t: number): Profile => {
  const p = freshProfile()
  Object.assign(p.fields, fields)
  for (const k of Object.keys(fields)) p.times[k as keyof Profile['fields']] = t
  return p
}

describe('merging two devices', () => {
  it('keeps the union of attempt history', () => {
    const a = [att('1', 10), att('2', 20)]
    const b = [att('2', 20, { synced: 1 }), att('3', 15)]
    const m = mergeAttempts(a, b)
    expect(m.map((x) => x.id)).toEqual(['1', '3', '2'])
    expect(m.find((x) => x.id === '2')!.synced).toBe(1)
  })
  it('drops attempts the parent erased', () => {
    expect(mergeAttempts([att('1', 10)], [att('2', 30)], 20).map((x) => x.id)).toEqual(['2'])
  })
  it('takes the newest setting, field by field', () => {
    const m = mergeProfiles(prof({ theme: 'surf', rate: 1.1 }, 100), prof({ theme: 'dance' }, 200))
    expect(m.fields.theme).toBe('dance')
    expect(m.fields.rate).toBe(1.1)
  })
  it('never loses an unlock earned offline on another device', () => {
    const m = mergeProfiles(prof({ unlocked: 6, climbBest: 9 }, 100), prof({ unlocked: 4, climbBest: 12 }, 200))
    expect(m.fields.unlocked).toBe(6)
    expect(m.fields.climbBest).toBe(12)
  })
  it('lets a parent lower the unlocked level or erase, and that wins over older progress', () => {
    const parent = prof({ unlocked: 2, parentAt: 300 }, 300)
    const stale = prof({ unlocked: 6 }, 100)
    expect(mergeProfiles(parent, stale).fields.unlocked).toBe(2)
    expect(mergeProfiles(stale, parent).fields.unlocked).toBe(2)
    // progress earned after the parent change counts again
    expect(mergeProfiles(parent, prof({ unlocked: 3 }, 400)).fields.unlocked).toBe(3)
  })
  it('is the same whichever device goes first, and merging twice changes nothing', () => {
    const a = prof({ theme: 'surf', unlocked: 3, seenLesson: { 0: 1 } }, 100)
    const b = prof({ name: 'Kam', unlocked: 5, seenLesson: { 2: 1 } }, 200)
    const ab = mergeProfiles(a, b)
    expect(profilesEqual(ab, mergeProfiles(b, a))).toBe(true)
    expect(profilesEqual(ab, mergeProfiles(ab, b))).toBe(true)
    expect(ab.fields.seenLesson).toEqual({ 0: 1, 2: 1 })
  })
})

describe('stats from the attempt log', () => {
  it('mastery is 5 of the last 6 on the first try', () => {
    expect(mastered([1, 1, 1, 1, 1])).toBe(false)
    expect(mastered([1, 1, 0, 1, 1, 1])).toBe(true)
    expect(mastered([1, 1, 1, 1, 0, 0])).toBe(false)
    expect(mastered([0, 0, 1, 1, 1, 1, 1, 0])).toBe(true)
  })
  it('counts tries, first-try accuracy, time and misses per level', () => {
    const d = derive([att('1', 1), att('2', 2, { first: false, tries: 2 }), att('3', 3, { ok: false, first: false, L: 4 })])
    expect(d.stats[0]).toEqual({ att: 2, first: 1, correct: 2, ms: 6000 })
    expect(d.recent[0]).toEqual([1, 0])
    expect(d.missed.map((m) => m.id)).toEqual(['3', '2'])
  })
})

describe('saved progress on the device', () => {
  it('writes every answer to IndexedDB right away and reloads it', async () => {
    await initStore()
    update({ theme: 'surf', unlocked: 3 })
    const a = addAttempt({ L: 3, mode: 'round', fmt: 'solve', q: '25 − 9', target: 16, ok: true, first: true, tries: 1, helped: false, ms: 4000 })
    addAttempt({ L: 3, mode: 'round', fmt: 'solve', q: '31 − 7', target: 24, ok: false, first: false, tries: 2, helped: false, ms: 9000 })
    await new Promise((r) => setTimeout(r, 50))
    expect(await db.attempts.count()).toBe(2)
    expect((await db.attempts.get(a.id))!.q).toBe('25 − 9')
    expect(((await db.kv.get('profile'))!.value as Profile).fields.theme).toBe('surf')
    expect(getState().derived.stats[3].att).toBe(2)
  })

  it('export then erase then import brings everything back', async () => {
    const backup = JSON.parse(JSON.stringify(exportBackup()))
    expect(backup.attempts).toHaveLength(2)
    await eraseProgress()
    expect(getState().attempts).toHaveLength(0)
    expect(getState().profile.fields.unlocked).toBe(0)
    expect(await db.attempts.count()).toBe(0)
    expect(getState().profile.fields.theme).toBe('surf') // settings are kept
    // Importing an old backup after an erase must not resurrect erased answers...
    expect(await importBackup(backup)).toBe(0)
    // ...but a fresh device (no erase) gets all of it.
    const p = getState().profile
    p.fields.resetAt = 0
    p.fields.parentAt = 0
    expect(await importBackup(backup)).toBe(2)
    expect(await db.attempts.count()).toBe(2)
    await expect(importBackup({ hello: 'world' })).rejects.toThrow()
  })
})
