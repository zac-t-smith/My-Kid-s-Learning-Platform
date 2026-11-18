import { describe, expect, it } from 'vitest'
import { answerPlacement, board, credit, DAY, difficultyFor, dueReviews, frontier, LADDER, MASTERY, PLACEMENT_LENGTH, placementSeeds, planRound, REVIEW_DAYS, startPlacement, step, stretchOf, suggestions, type Seeds, type Try } from '../src/skills/mastery'
import { SKILL, SKILLS } from '../src/skills/manifest'
import { mulberry32 } from '../src/engine/util'

const T0 = 1_700_000_000_000
const t = (sk: string, i: number, o: Partial<Try> = {}): Try => ({ sk, ts: T0 + i * 60_000, ok: true, first: true, helped: false, ms: 5000, ...o })
const none: Seeds = { unlocked: 0, known: {}, locked: {} }
const run = (tries: Try[]) => tries.reduce<ReturnType<typeof step> | undefined>((s, x) => step(s, x), undefined)!

describe('mastery score', () => {
  it('first try counts most; hints and second tries count less; misses count zero', () => {
    expect(credit(t('x', 0), 5000)).toBe(1)
    expect(credit(t('x', 0, { ms: 20000 }), 5000)).toBe(0.85)
    expect(credit(t('x', 0, { helped: true, first: false }), 0)).toBe(0.5)
    expect(credit(t('x', 0, { first: false }), 0)).toBe(0.4)
    expect(credit(t('x', 0, { ok: false, first: false }), 0)).toBe(0)
  })
  it('stays between 0 and 1 and needs at least 5 answers to master', () => {
    const s4 = run([0, 1, 2, 3].map((i) => t('as.bundle', i)))
    expect(s4.mastered).toBe(false)
    const s5 = step(s4, t('as.bundle', 4))
    expect(s5).toMatchObject({ mastered: true, score: 1 })
    const rng = mulberry32(4)
    let s: ReturnType<typeof step> | undefined
    for (let i = 0; i < 500; i++) {
      s = step(s, t('as.bundle', i, { ok: rng() < 0.7, first: rng() < 0.5, helped: rng() < 0.2 }))
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(1)
    }
  })
  it('4 of 5 first-try masters it; mostly hints does not', () => {
    expect(run([1, 1, 0, 1, 1].map((f, i) => t('as.bundle', i, { first: !!f, ok: !!f }))).mastered).toBe(true)
    expect(run(Array.from({ length: 10 }, (_, i) => t('as.bundle', i, { first: false, helped: true }))).mastered).toBe(false)
  })
})

describe('spaced review', () => {
  const master = () => run([0, 1, 2, 3, 4].map((i) => t('as.bundle', i)))
  it('comes back after 1, 3, 7, 21, 60 days when he keeps getting it', () => {
    let s = master()
    const gaps: number[] = []
    for (let k = 0; k < 6; k++) {
      gaps.push(Math.round((s.due - s.lastTs) / DAY))
      s = step(s, { ...t('as.bundle', 0), ts: s.due + 1000 })
    }
    expect(gaps).toEqual([1, 3, 7, 21, 60, 60])
    expect(REVIEW_DAYS).toEqual([1, 3, 7, 21, 60])
  })
  it('extra practice before it is due does not stretch the gap', () => {
    const s = master()
    expect(step(s, { ...t('as.bundle', 0), ts: s.lastTs + 1000 }).due).toBe(s.due)
  })
  it('a miss shortens the gap', () => {
    let s = master()
    for (let k = 0; k < 3; k++) s = step(s, { ...t('as.bundle', 0), ts: s.due + 1000 }) // now on the 21-day step
    expect(s.step).toBe(3)
    const m = step(s, { ...t('as.bundle', 0), ts: s.lastTs + DAY, ok: false, first: false })
    expect(m.step).toBe(2)
    expect(Math.round((m.due - m.lastTs) / DAY)).toBe(7)
    expect(m.mastered).toBe(true)
  })
  it('review shows as due on the board, and enough misses send it back to learning', () => {
    const tries = [0, 1, 2, 3, 4].map((i) => t('as.tens-jumps', i))
    const b1 = board(tries, none, T0 + 5 * 60_000)
    expect(b1.status['as.tens-jumps']).toBe('mastered')
    expect(board(tries, none, T0 + 2 * DAY).status['as.tens-jumps']).toBe('review')
    expect(dueReviews(board(tries, none, T0 + 2 * DAY))).toEqual(['as.tens-jumps'])
    const slipped = [...tries, ...[10, 11, 12, 13].map((i) => t('as.tens-jumps', i, { ok: false, first: false }))]
    expect(board(slipped, none, T0 + 2 * DAY).status['as.tens-jumps']).toBe('learning')
  })
})

describe('the board: what is open, what is next', () => {
  it('a brand-new player has the first skill open and everything behind it locked', () => {
    const b = board([], none, T0)
    expect(b.status['as.tens-jumps']).toBe('open')
    expect(b.status['as.ones-only']).toBe('locked')
    expect(frontier(b)).toEqual(['as.tens-jumps'])
  })
  it('mastering a skill opens what needs it, across strands, and he gets choices from different strands', () => {
    const tries = ['as.tens-jumps', 'as.ones-only'].flatMap((sk, k) => [0, 1, 2, 3, 4].map((i) => t(sk, k * 10 + i)))
    const b = board(tries, none, T0 + 3_600_000)
    const open = frontier(b)
    for (const id of ['as.tens-ones', 'nv.skip-count', 'nv.even-odd', 'as.doubles', 'me.time-hour-half', 'ge.shapes-2d']) expect(open).toContain(id)
    const pick = suggestions(b, 3)
    expect(pick).toHaveLength(3)
    expect(new Set(pick.map((id) => SKILL[id].strand)).size).toBe(3)
    // a skill he already started comes first
    const b2 = board([...tries, t('ge.shapes-2d', 30)], none, T0 + 3_600_000)
    expect(suggestions(b2, 3)[0]).toBe('ge.shapes-2d')
  })
  it('old unlocked level, placement seeds and parent locks are respected', () => {
    const b = board([], { unlocked: 4, unlockedAt: T0, known: { 'nv.skip-count': T0 }, locked: { 'as.doubles': 1 } }, T0)
    expect(b.status['as.cross-ten']).toBe('mastered')
    expect(b.status['as.bundle']).toBe('open')
    expect(b.status['nv.skip-count']).toBe('mastered')
    expect(b.status['as.doubles']).toBe('locked')
    expect(b.status['me.coins']).toBe('open') // needs nv.skip-count
    // unplayable skills are never offered
    expect(board([], none, T0, (id) => id !== 'as.tens-jumps').status['as.tens-jumps']).toBe('locked')
  })
  it('every skill can be reached: mastering in order opens the whole graph', () => {
    const known: Record<string, number> = {}
    for (let round = 0; round < SKILLS.length; round++) {
      const open = frontier(board([], { unlocked: 0, known, locked: {} }, T0))
      if (!open.length) break
      for (const id of open) known[id] = T0 - 100 * DAY
    }
    expect(Object.keys(known).length).toBe(SKILLS.length)
  })
  it('difficulty follows the score (sweet spot)', () => {
    expect(difficultyFor(undefined)).toBe(1)
    expect(difficultyFor(run([0, 1, 2, 3, 4, 5].map((i) => t('x', i))))).toBe(3)
    expect(difficultyFor(run([0, 1, 2, 3, 4, 5].map((i) => t('x', i, { ok: i % 3 === 0, first: i % 3 === 0 }))))).toBe(1)
  })
})

describe('mixed practice', () => {
  it('a round is about 60% focus, 25% review, 15% stretch, and starts on the focus skill', () => {
    const tries = ['as.tens-jumps', 'as.ones-only', 'as.tens-ones'].flatMap((sk, k) => [0, 1, 2, 3, 4].map((i) => t(sk, k * 10 + i)))
    const b = board(tries, none, T0 + 2 * DAY)
    const rng = mulberry32(8)
    const count = { focus: 0, review: 0, stretch: 0 }
    for (let i = 0; i < 2000; i++) {
      const plan = planRound('as.cross-ten', 10, b, rng)
      expect(plan[0]).toEqual({ sk: 'as.cross-ten', slot: 'focus' })
      expect(plan[1].slot).toBe('focus')
      for (const p of plan.slice(2)) {
        count[p.slot]++
        if (p.slot === 'review') expect(b.states[p.sk].mastered).toBe(true)
        if (p.slot === 'stretch') expect(SKILL[p.sk].prereqs).toContain('as.cross-ten')
      }
    }
    const n = count.focus + count.review + count.stretch
    expect(count.focus / n).toBeGreaterThan(0.55)
    expect(count.focus / n).toBeLessThan(0.65)
    expect(count.review / n).toBeGreaterThan(0.21)
    expect(count.review / n).toBeLessThan(0.29)
    expect(count.stretch / n).toBeGreaterThan(0.12)
    expect(count.stretch / n).toBeLessThan(0.18)
  })
  it('with nothing to review or stretch to, it is all focus', () => {
    const b = board([], none, T0)
    expect(planRound('as.tens-jumps', 10, b, mulberry32(1), (id) => id === 'as.tens-jumps').every((p) => p.sk === 'as.tens-jumps')).toBe(true)
    expect(stretchOf('as.tens-jumps', b, (id) => id === 'as.tens-jumps')).toBe('as.tens-jumps')
  })
})

describe('placement test', () => {
  const play = (level: number, seed: number) => {
    // he gets everything at or below `level` right and misses above it, with a little noise
    const rng = mulberry32(seed)
    // from scratch it starts at the bottom; a player who already has levels starts just below them
    let p = startPlacement(board([], level > 18 ? { unlocked: 12, unlockedAt: T0, known: {}, locked: {} } : none, T0))
    while (!p.done) p = answerPlacement(p, p.at <= level ? rng() < 0.95 : rng() < 0.05)
    return p
  }
  it('every ladder skill exists and the ladder gets harder', () => {
    for (const id of LADDER) expect(SKILL[id], id).toBeTruthy()
    const grades = LADDER.map((id) => SKILL[id].grade)
    expect(grades[grades.length - 1]).toBeGreaterThan(grades[0])
  })
  it('is at most 15 problems and lands near his real level', () => {
    for (const level of [0, 3, 7, 12, 18, 24]) {
      let total = 0
      for (let seed = 0; seed < 200; seed++) {
        const p = play(level, seed)
        expect(p.asked).toBeLessThanOrEqual(PLACEMENT_LENGTH)
        expect(p.passed).toBeLessThanOrEqual(level + 4) // two lucky guesses in a row can happen
        total += p.passed
      }
      const avg = total / 200
      expect(avg, `level ${level} not over-placed`).toBeLessThan(level + 0.5)
      expect(avg, `level ${level}`).toBeGreaterThan(level - 3)
    }
  })
  it('moves up after 2 right and down after 1 miss', () => {
    let p = startPlacement(board([], none, T0))
    p = answerPlacement(p, true)
    expect(p.at).toBe(0)
    p = answerPlacement(p, true)
    expect(p).toMatchObject({ at: 2, passed: 0 })
    p = answerPlacement(p, false)
    expect(p).toMatchObject({ at: 1, run: 0 })
  })
  it('seeds what he passed plus everything those skills need', () => {
    const ids = placementSeeds({ at: 0, asked: 15, run: 0, passed: 11, missed: true, jump: 1, done: true })
    expect(ids).toContain('md.times-tables')
    expect(ids).toContain('as.tens-jumps')
    for (const id of ids) for (const pre of SKILL[id].prereqs) expect(ids).toContain(pre)
    const b = board([], { unlocked: 0, known: Object.fromEntries(ids.map((id) => [id, T0])), locked: {} }, T0)
    expect(b.status['md.times-tables']).toBe('mastered')
    expect(frontier(b)).toContain('md.fair-shares')
    expect(placementSeeds({ at: 0, asked: 15, run: 0, passed: -1, missed: true, jump: 1, done: true })).toEqual([])
  })
  it('MASTERY threshold is what seeded skills get', () => {
    const b = board([], { unlocked: 2, known: {}, locked: {} }, T0)
    expect(b.states['as.tens-jumps'].score).toBe(MASTERY)
  })
})
