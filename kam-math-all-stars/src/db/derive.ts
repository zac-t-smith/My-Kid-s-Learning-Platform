import type { Attempt } from './model'

export interface LevelStat {
  att: number
  first: number
  correct: number
  ms: number
}
export interface Derived {
  stats: Record<number, LevelStat>
  /** Last 8 first-try results per level (1 = first try, no hint). */
  recent: Record<number, number[]>
  /** Most recent problems that were not first-try, newest first. */
  missed: Attempt[]
}

/** Everything the screens need, computed from the attempt log (sorted oldest first). */
export function derive(attempts: Attempt[]): Derived {
  const stats: Record<number, LevelStat> = {}
  const recent: Record<number, number[]> = {}
  const missed: Attempt[] = []
  for (const a of attempts) {
    if (!a.first) missed.push(a)
    // Defense challenges are logged, but they are not practice on a level.
    if (a.fmt === 'pitch' || a.fmt === 'field') continue
    const st = (stats[a.L] ||= { att: 0, first: 0, correct: 0, ms: 0 })
    st.att++
    if (a.first) st.first++
    if (a.ok) st.correct++
    st.ms += Math.min(a.ms, 180000)
    const rec = (recent[a.L] ||= [])
    rec.push(a.first ? 1 : 0)
    if (rec.length > 8) rec.shift()
  }
  return { stats, recent, missed: missed.reverse().slice(0, 30) }
}

/** Mastery rule: 5 of the last 6 right on the first try, no hint. */
export function mastered(recent: number[] | undefined): boolean {
  const r = (recent || []).slice(-6)
  return r.length >= 6 && r.reduce((x, y) => x + y, 0) >= 5
}

export function howText(a: Attempt): string {
  return a.ok ? (a.helped ? 'got it after a hint' : 'got it on 2nd try') : 'missed'
}
