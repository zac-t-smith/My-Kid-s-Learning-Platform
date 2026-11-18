import { describe, expect, it } from 'vitest'
import { applyHit, applyOut, defenseKind, fmtAvg, hitBases, isQuick, newGame, oppHitBases, ordinal, playerCard, resume, result, RUN_LIMIT, toRecord, total, OPPONENTS, type Game } from '../src/game/ballgame'
import { checkPitch, makeFieldChallenge, makePitchChallenge, pitchHint } from '../src/game/challenges'
import { makeProblem, TOP } from '../src/engine/generate'
import { mulberry32, calc } from '../src/engine/util'

const game = (innings = 3): Game => newGame({ id: 'g', ts: 1, innings, team: { name: 'All-Stars', color: '#c00' }, stadium: 'sandlot', opp: OPPONENTS[0] })

describe('hits and baserunning', () => {
  it('pitch sets the bases; quick adds one; a second swing takes one away', () => {
    expect(hitBases('fastball', false, false)).toBe(1)
    expect(hitBases('fastball', true, false)).toBe(2)
    expect(hitBases('fastball', false, true)).toBe(1) // still a hit
    expect(hitBases('curveball', false, true)).toBe(1)
    expect(hitBases('slider', true, false)).toBe(4)
    expect(hitBases('meatball', true, false)).toBe(4)
    expect(hitBases('meatball', false, true)).toBe(3)
  })
  it('exit velocity uses his own average, and needs some history first', () => {
    expect(isQuick(3000, undefined)).toBe(false)
    expect(isQuick(3000, { att: 2, ms: 20000 })).toBe(false)
    expect(isQuick(3000, { att: 10, ms: 50000 })).toBe(true)
    expect(isQuick(6000, { att: 10, ms: 50000 })).toBe(false)
  })
  it('runners advance and score', () => {
    const g = game()
    expect(applyHit(g, 1)).toBe(0)
    expect(g.bases).toEqual([true, false, false])
    expect(applyHit(g, 2)).toBe(0)
    expect(g.bases).toEqual([false, true, true])
    expect(applyHit(g, 1, true)).toBe(1)
    expect(g.bases).toEqual([true, false, true])
    expect(applyHit(g, 4)).toBe(3) // home run clears the bases
    expect(g.bases).toEqual([false, false, false])
    expect(g.us).toEqual([4])
    expect(g.bat).toMatchObject({ ab: 4, h: 4, first: 1, hr: 1, rbi: 4, tb: 8 })
  })
  it('three outs end the half and runners are left on', () => {
    const g = game()
    applyHit(g, 1)
    applyOut(g); applyOut(g)
    expect(g.phase).toBe('pick')
    applyOut(g)
    expect(g).toMatchObject({ half: 'bottom', phase: 'break', outs: 0, bases: [false, false, false], them: [0], ended: 'outs' })
    resume(g)
    expect(g.phase).toBe('defense')
    expect(defenseKind(g)).toBe('pitching')
  })
  it('the run limit ends a half so no inning lasts forever', () => {
    const g = game()
    for (let i = 0; i < RUN_LIMIT; i++) applyHit(g, 4)
    expect(g.us).toEqual([RUN_LIMIT])
    expect(g).toMatchObject({ half: 'bottom', ended: 'limit' })
  })
  it('home team skips the last bottom half when ahead, and can walk it off', () => {
    const g = game(1)
    for (let i = 0; i < 3; i++) applyOut(g)
    resume(g)
    applyHit(g, 4) // they score in the last inning and lead
    expect(g).toMatchObject({ phase: 'final', ended: 'walkoff' })
    expect(result(g)).toBe('L')
  })
  it('a tie goes to extra innings, at most two', () => {
    const g = game(1)
    for (let half = 0; half < 6; half++) {
      expect(g.phase).not.toBe('final')
      for (let i = 0; i < 3; i++) applyOut(g)
      resume(g)
    }
    expect(g.phase).toBe('final')
    expect(g.inning).toBe(3)
    expect(result(g)).toBe('T')
  })
  it('helpers', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st'])
    expect(fmtAvg(0.75)).toBe('.750')
    expect(fmtAvg(1)).toBe('1.000')
    expect(oppHitBases(1)).toBe(1)
    expect(oppHitBases(5)).toBe(2)
  })
})

describe('whole games', () => {
  it('2,000 random games of every length finish with a consistent box score (no dead ends)', () => {
    const rng = mulberry32(42)
    for (let n = 0; n < 2000; n++) {
      const innings = [3, 6, 9][n % 3]
      const g = game(innings)
      const skill = rng()
      let steps = 0
      while (g.phase !== 'final') {
        if (++steps > 2000) throw new Error('game never ended')
        if (g.phase === 'break') resume(g)
        else if (rng() < skill) g.half === 'top' ? applyHit(g, 1 + Math.floor(rng() * 4), rng() < 0.5) : applyOut(g)
        else g.half === 'top' ? applyOut(g) : applyHit(g, oppHitBases(g.opp.rating, rng))
        if ((g.phase as string) !== 'final' && (g.outs > 2 || g.halfRuns >= RUN_LIMIT)) throw new Error('half did not end')
      }
      expect(g.inning).toBeGreaterThanOrEqual(innings)
      expect(g.inning).toBeLessThanOrEqual(innings + 2)
      expect(g.us.length).toBe(g.inning)
      expect(total(g.us)).toBe(g.bat.rbi)
      expect(g.bat.ab).toBe(g.bat.h + g.bat.k)
      expect(g.bat.first).toBeLessThanOrEqual(g.bat.h)
      for (const r of [...g.us, ...g.them]) expect(r).toBeLessThanOrEqual(RUN_LIMIT + 3)
      const rec = toRecord(g)
      expect(rec.result).toBe(result(g))
    }
  })
  it('player card adds up games', () => {
    const g = game()
    applyHit(g, 2, true); applyHit(g, 4, false); applyOut(g); applyOut(g)
    const c = playerCard([{ ...toRecord(g), result: 'W' }], g)
    expect(c).toMatchObject({ games: 1, w: 1, ab: 8, h: 4, first: 2, hr: 2, tb: 12 })
    expect(c.avg).toBe(0.25)
    expect(c.slg).toBe(1.5)
  })
})

describe('defense challenges', () => {
  it('every pitching challenge can be solved, and the checker agrees with the math', () => {
    const rng = mulberry32(9)
    for (let i = 0; i < 20000; i++) {
      const U = i % 18, rating = 1 + (i % 5)
      const c = makePitchChallenge(U, rating, rng)
      const [a, b] = c.example
      const r = checkPitch(c, a, b)
      if (!r.ok) throw new Error(`example fails: ${JSON.stringify(c)}`)
      expect(calc(a, c.op, b)).toBe(r.value)
      expect(c.hi - c.lo).toBe(rating >= 4 ? 5 : 10)
      expect(c.lo).toBeGreaterThanOrEqual(c.op === '×' ? 0 : 10)
      if (U < 3) expect(c.op).toBe('+')
      if (U < 10) expect(c.op).not.toBe('×')
      // wrong pitches are caught, with a kind hint
      for (const [x, y] of [[c.max, c.max], [c.min, c.min], [0, a]] as const) {
        const w = checkPitch(c, x, y)
        const v = calc(x, c.op, y)
        expect(w.ok).toBe(x >= c.min && y >= c.min && v >= c.lo && v <= c.hi)
        if (!w.ok) expect(pitchHint(c, x, y, w).length).toBeGreaterThan(5)
      }
    }
  })
  it('every fielding challenge has exactly one right answer that matches its explanation', () => {
    const rng = mulberry32(10)
    const seen = new Set<string>()
    for (let i = 0; i < 20000; i++) {
      const c = makeFieldChallenge(i % 18, 1 + (i % 5), rng)
      seen.add(c.type)
      expect(c.choices.length).toBeGreaterThanOrEqual(2)
      expect(new Set(c.choices).size).toBe(c.choices.length)
      expect(c.answer).toBeGreaterThanOrEqual(0)
      const right = c.choices[c.answer]
      if (c.type === 'estimate') {
        const m = /Is (\d+) ([+−]) (\d+) more or less than (\d+)/.exec(c.prompt)!
        const s = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]
        expect(s).not.toBe(+m[4])
        expect(right).toBe(s > +m[4] ? 'More' : 'Less')
        expect(c.explain).toContain(`= ${s}.`)
      } else {
        // the explanation ends by stating the answer
        expect(c.explain.replace(/\.$/, '').split(' ')).toContain(right)
      }
    }
    expect([...seen].sort()).toEqual(['bases', 'estimate', 'feet', 'lead', 'outs'])
  })
  it('pitch formats: fastballs are plain problems, curveballs are the tricky kinds', () => {
    const rng = mulberry32(3)
    for (let L = 0; L <= TOP; L++)
      for (let i = 0; i < 200; i++) {
        if (L !== 16) expect(makeProblem(L, undefined, rng, ['solve']).fmt).toBe('solve')
        const c = makeProblem(L, undefined, rng, ['story', 'agree', 'missing']).fmt
        expect(c).not.toBe('solve')
      }
  })
})
