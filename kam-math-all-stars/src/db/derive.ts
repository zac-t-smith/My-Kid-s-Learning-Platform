import { board, type Board, type Seeds, type Try } from '../skills/mastery'
import { LEGACY } from '../skills/manifest'
import { hasGen } from '../skills/graph'
import type { Attempt, Fields } from './model'

export interface LevelStat {
  att: number
  first: number
  correct: number
  ms: number
}
export interface Derived {
  /** Per original level (kept for The Climb and old reports). */
  stats: Record<number, LevelStat>
  /** Every skill: mastery score, review schedule, and whether it is open. */
  board: Board
  /** Most recent problems that were not first-try, newest first. */
  missed: Attempt[]
}

/** Skill id for an attempt (older records only know their level number). */
export const skillOf = (a: Pick<Attempt, 'sk' | 'L'>): string => a.sk ?? (a.L >= 0 && a.L < LEGACY.length ? LEGACY[a.L][0] : 'super')

export const seedsOf = (f: Pick<Fields, 'unlocked' | 'known' | 'lockedSkills'>, unlockedAt?: number): Seeds => ({ unlocked: f.unlocked, unlockedAt, known: f.known || {}, locked: f.lockedSkills || {} })

/** Everything the screens need, computed from the attempt log (sorted oldest first). */
export function derive(attempts: Attempt[], seeds: Seeds = { unlocked: 0, known: {}, locked: {} }, now = Date.now()): Derived {
  const stats: Record<number, LevelStat> = {}
  const missed: Attempt[] = []
  const tries: Try[] = []
  for (const a of attempts) {
    if (!a.first) missed.push(a)
    // Defense challenges and placement questions are logged, but they are not practice on a skill.
    if (a.fmt === 'pitch' || a.fmt === 'field') continue
    tries.push({ sk: skillOf(a), ts: a.ts, ok: a.ok, first: a.first, helped: a.helped, ms: a.ms })
    if (a.L < 0) continue
    const st = (stats[a.L] ||= { att: 0, first: 0, correct: 0, ms: 0 })
    st.att++
    if (a.first) st.first++
    if (a.ok) st.correct++
    st.ms += Math.min(a.ms, 180000)
  }
  return { stats, board: board(tries, seeds, now, hasGen), missed: missed.reverse().slice(0, 30) }
}

export function howText(a: Attempt): string {
  return a.ok ? (a.helped ? 'got it after a hint' : 'got it on 2nd try') : 'missed'
}
