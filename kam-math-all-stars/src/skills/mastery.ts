import { LEGACY, legacyLevel, SKILL, SKILLS } from './manifest'
import type { Difficulty, Rng } from './types'

/* Mastery, spaced review, what to practice next, and the placement test. Pure functions over the attempt log. */

export const DAY = 86_400_000
/** A mastered skill comes back after roughly this many days: 1, 3, 7, 21, 60. */
export const REVIEW_DAYS = [1, 3, 7, 21, 60]

/** The parts of an attempt that mastery cares about. */
export interface Try {
  sk: string
  ts: number
  ok: boolean
  first: boolean
  helped: boolean
  ms: number
}
export type Status = 'locked' | 'open' | 'learning' | 'mastered' | 'review'
export interface SkillState {
  /** 0 to 1. Goes up with first-try answers, up less with hints or second tries, down with misses. */
  score: number
  n: number
  first: number
  ms: number
  lastTs: number
  mastered: boolean
  /** Which step of REVIEW_DAYS he is on. */
  step: number
  /** When the next review is due (0 = not scheduled). */
  due: number
  /** Last few first-try results (1/0), newest last. */
  recent: number[]
}
const fresh = (): SkillState => ({ score: 0, n: 0, first: 0, ms: 0, lastTs: 0, mastered: false, step: 0, due: 0, recent: [] })

/**
 * How much one answer is worth (0 to 1).
 * First try with no hint is full credit (a bit less if it took much longer than his usual time on the skill),
 * a hint or a second try is partial credit, a miss is none.
 */
export function credit(t: Try, avgMs: number): number {
  if (!t.ok) return 0
  if (t.helped) return 0.5
  if (!t.first) return 0.4
  return avgMs && t.ms > avgMs * 2.5 ? 0.85 : 1
}
export const MASTERY = 0.8
const MIN_TRIES = 5

/** Fold one answer into a skill's state. */
export function step(prev: SkillState | undefined, t: Try): SkillState {
  const s = { ...(prev ?? fresh()) }
  const x = credit(t, s.n >= 3 ? s.ms / s.n : 0)
  s.n++
  if (t.first) s.first++
  s.ms += Math.min(t.ms, 180_000)
  s.lastTs = t.ts
  s.recent = [...s.recent, t.first ? 1 : 0].slice(-8)
  // plain average for the first few answers, then a moving average that follows recent work
  s.score = s.score + Math.max(0.25, 1 / s.n) * (x - s.score)
  if (!s.mastered) {
    if (s.n >= MIN_TRIES && s.score >= MASTERY) {
      s.mastered = true
      s.step = 0
      s.due = t.ts + REVIEW_DAYS[0] * DAY
    }
  } else if (t.first && !t.helped) {
    // A review done on time moves him to the next, longer gap. Extra practice before it is due changes nothing.
    if (t.ts >= s.due) {
      s.step = Math.min(REVIEW_DAYS.length - 1, s.step + 1)
      s.due = t.ts + REVIEW_DAYS[s.step] * DAY
    }
  } else {
    // A miss shortens the gap. If it has really slipped, it goes back to learning.
    s.step = Math.max(0, s.step - 1)
    s.due = t.ts + REVIEW_DAYS[s.step] * DAY
    if (s.score < 0.5) {
      s.mastered = false
      s.due = 0
    }
  }
  return s
}

export interface Seeds {
  /** Old "highest unlocked level": original levels below it count as known. */
  unlocked: number
  /** When that level was last changed. */
  unlockedAt?: number
  /** Skills marked as known by the placement test or a parent: id → when. */
  known: Record<string, number>
  /** Skills a parent has locked (not offered even if ready). */
  locked: Record<string, 1>
}
export interface Board {
  states: Record<string, SkillState>
  status: Record<string, Status>
}

/** Everything about every skill right now. `tries` must be oldest first. */
export function board(tries: Try[], seeds: Seeds, now: number, playable: (id: string) => boolean = () => true): Board {
  const states: Record<string, SkillState> = {}
  for (const t of tries) if (SKILL[t.sk]) states[t.sk] = step(states[t.sk], t)
  // Seeded skills count as mastered and get a first check-up a few days later.
  const seed = (id: string, ts: number) => {
    const s = (states[id] ??= fresh())
    if (!s.mastered && !(s.n >= MIN_TRIES && s.score < 0.5 && s.lastTs > ts)) {
      s.mastered = true
      s.step = 1
      s.due = Math.max(s.lastTs, ts) + REVIEW_DAYS[1] * DAY
      s.score = Math.max(s.score, MASTERY)
    }
  }
  LEGACY.slice(0, seeds.unlocked).forEach(([id]) => seed(id, seeds.unlockedAt ?? now))
  for (const [id, ts] of Object.entries(seeds.known)) if (SKILL[id]) seed(id, ts)

  const status: Record<string, Status> = {}
  for (const sk of SKILLS) {
    const s = states[sk.id]
    const L = legacyLevel(sk.id)
    const ready = sk.prereqs.every((p) => states[p]?.mastered) || (L >= 0 && L <= seeds.unlocked)
    if (!playable(sk.id) || seeds.locked[sk.id]) status[sk.id] = 'locked'
    else if (s?.mastered) status[sk.id] = s.due && now >= s.due ? 'review' : 'mastered'
    else if (!ready) status[sk.id] = 'locked'
    else status[sk.id] = s?.n ? 'learning' : 'open'
  }
  return { states, status }
}

/** Sweet spot: harder problems as the score goes up, easier when it drops. */
export function difficultyFor(s?: SkillState): Difficulty {
  if (!s || s.n < 3) return 1
  const recent = s.recent.slice(-6)
  const acc = recent.reduce((a, b) => a + b, 0) / recent.length
  const base: Difficulty = s.score < 0.45 ? 1 : s.score < 0.75 ? 2 : 3
  if (acc > 0.9 && base < 3) return (base + 1) as Difficulty
  if (acc < 0.65 && base > 1) return (base - 1) as Difficulty
  return base
}

const order = Object.fromEntries(SKILLS.map((s, i) => [s.id, s.grade * 1000 + i]))
const byOrder = (a: string, b: string) => order[a] - order[b]

/** Skills he can work on now (ready but not mastered), earliest first. */
export const frontier = (b: Board) => SKILLS.map((s) => s.id).filter((id) => b.status[id] === 'open' || b.status[id] === 'learning').sort(byOrder)
/** Mastered skills whose review is due, most overdue first. */
export const dueReviews = (b: Board) =>
  Object.keys(b.status)
    .filter((id) => b.status[id] === 'review')
    .sort((x, y) => b.states[x].due - b.states[y].due)

/**
 * Up to `count` good next choices, from different strands when possible. Skills already started come first,
 * so "he chooses" never means starting over.
 */
export function suggestions(b: Board, count = 3, prefer?: string): string[] {
  const open = frontier(b).sort((x, y) => (b.status[y] === 'learning' ? 1 : 0) - (b.status[x] === 'learning' ? 1 : 0) || byOrder(x, y))
  const out: string[] = prefer && open.includes(prefer) ? [prefer] : []
  for (const id of open) {
    if (out.length >= count) break
    if (!out.includes(id) && !out.some((o) => SKILL[o].strand === SKILL[id].strand)) out.push(id)
  }
  for (const id of open) if (out.length < count && !out.includes(id)) out.push(id)
  return out
}

/** A stretch for this skill: something it leads to (same strand first), else another ready skill. */
export function stretchOf(focus: string, b: Board, playable: (id: string) => boolean = () => true): string {
  const next = SKILLS.filter((s) => s.prereqs.includes(focus) && playable(s.id) && !b.states[s.id]?.mastered)
    .map((s) => s.id)
    .sort((x, y) => (SKILL[x].strand === SKILL[focus].strand ? 0 : 1) - (SKILL[y].strand === SKILL[focus].strand ? 0 : 1) || byOrder(x, y))
  return next[0] ?? frontier(b).find((id) => id !== focus) ?? focus
}

export type Slot = 'focus' | 'review' | 'stretch'
/** Mixed practice: about 60% the skill he is on, 25% review, 15% stretch. */
export function pickSlot(rng: Rng, hasReview: boolean, hasStretch: boolean): Slot {
  const r = rng()
  if (r < 0.25 && hasReview) return 'review'
  if (r >= 0.85 && hasStretch) return 'stretch'
  return 'focus'
}
/** The skills for a round of `n` problems on `focus`, mixed and in order. The first two are always the focus skill. */
export function planRound(focus: string, n: number, b: Board, rng: Rng, playable: (id: string) => boolean = () => true): { sk: string; slot: Slot }[] {
  const reviews = dueReviews(b).filter((id) => id !== focus)
  // nothing due yet? older mastered skills still make good warm-ups
  const pool = reviews.length ? reviews : Object.keys(b.states).filter((id) => b.states[id].mastered && id !== focus && playable(id) && b.status[id] !== 'locked')
  const stretch = stretchOf(focus, b, playable)
  const out: { sk: string; slot: Slot }[] = []
  for (let i = 0; i < n; i++) {
    const slot = i < 2 ? 'focus' : pickSlot(rng, pool.length > 0, stretch !== focus)
    out.push({ slot, sk: slot === 'review' ? pool[Math.floor(rng() * Math.min(pool.length, 4))] : slot === 'stretch' ? stretch : focus })
  }
  return out
}

/* ---------- placement test ---------- */

/** The ladder the placement test climbs: core skills from easiest to hardest. */
export const LADDER = [
  'as.tens-jumps', 'as.ones-only', 'as.tens-ones', 'as.cross-ten', 'as.bundle', 'as.break', 'as.hundreds', 'md.groups', 'as.big-bundles', 'as.big-breaks',
  'md.times-2-5-10', 'md.times-tables', 'md.fair-shares', 'al.two-step', 'nv.round-10-100', 'fr.of-a-number', 'md.big-times', 'al.mystery', 'as.thousands',
  'md.remainders', 'fr.equivalent', 'md.two-by-two', 'fr.add-like', 'md.long-division', 'nv.decimal-add-sub', 'fr.add-unlike', 'al.order-ops', 'al.one-step-add',
]
export const PLACEMENT_LENGTH = 15
export interface Placement {
  /** Position on the ladder of the problem being asked. */
  at: number
  asked: number
  /** Right answers in a row at the current position. */
  run: number
  /** Highest ladder position he has passed (2 right in a row), -1 = none. */
  passed: number
  /** Has he missed one yet? Until then the test takes bigger steps. */
  missed: boolean
  /** How far the last move up was. */
  jump: number
  done: boolean
}
export function startPlacement(b: Board, ladder: string[] = LADDER): Placement {
  // start a little below where he already is, so the first problems feel good
  let top = -1
  ladder.forEach((id, i) => {
    if (b.states[id]?.mastered) top = i
  })
  return { at: Math.max(0, top - 1), asked: 0, run: 0, passed: -1, missed: false, jump: 1, done: false }
}
/** Move up after 2 right in a row, down after 1 miss. Ends after 15 problems (or sooner at the very top). */
export function answerPlacement(p: Placement, firstTry: boolean, ladder: string[] = LADDER): Placement {
  const n = { ...p, asked: p.asked + 1 }
  if (firstTry) {
    n.run++
    if (n.run >= 2) {
      n.passed = Math.max(n.passed, n.at)
      n.run = 0
      // each pass makes the next step up bigger (2, 3, 4); a miss resets it to small steps
      n.jump = Math.min(4, p.jump + 1)
      n.at = Math.min(ladder.length - 1, n.at + n.jump)
      if (n.passed >= ladder.length - 1) n.done = true
    }
  } else {
    n.run = 0
    // a miss after a big step goes back half of that step
    n.at = Math.max(0, n.at - Math.ceil(p.jump / 2))
    n.missed = true
    n.jump = 1
  }
  if (n.asked >= PLACEMENT_LENGTH) n.done = true
  return n
}
/** Skills to mark as known after the test: everything on the ladder up to where he passed, plus what those need first. */
export function placementSeeds(p: Placement, ladder: string[] = LADDER): string[] {
  const out = new Set<string>()
  const add = (id: string) => {
    if (out.has(id)) return
    out.add(id)
    SKILL[id].prereqs.forEach(add)
  }
  ladder.slice(0, p.passed + 1).forEach(add)
  return [...out]
}
