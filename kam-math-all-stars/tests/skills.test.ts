import { describe, expect, it } from 'vitest'
import { countChecked, falseSteps, isCorrect, sameValue, validateItem } from '../src/skills/check'
import { GENS, LIMITS, makeItem, TEACH } from '../src/skills/graph'
import { choice } from '../src/skills/kit'
import { buildScenes } from '../src/skills/lesson'
import { LEGACY, SKILL, SKILLS } from '../src/skills/manifest'
import { mulberry32 } from '../src/engine/util'
import type { Difficulty } from '../src/skills/types'

/* Property tests for every skill in the graph.
   Run one strand while writing it:   STRAND=fr npx vitest run tests/skills.test.ts
   Fewer problems for a quick look:    N=500 STRAND=fr npx vitest run tests/skills.test.ts */
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env
const STRAND = env.STRAND
const N = Number(env.N || 10_000)
const legacy = new Set(LEGACY.map((l) => l[0]))

describe('checker', () => {
  it('reads whole numbers, decimals and fractions exactly', () => {
    expect(falseSteps(['Tens: 40 + 20 = 60', '1,200 − 300 = 900', '0.3 + 0.4 = 0.7', '1/4 + 2/4 = 3/4', '3 + 4 × 2 = 11', '6 ÷ 4 = 1.5 = 3/2', '0.1 + 0.2 = 0.3'])).toEqual([])
    expect(countChecked(['Tens: 40 + 20 = 60', '0.3 + 0.4 = 0.7', '1/4 + 2/4 = 3/4'])).toBe(3)
    expect(falseSteps(['40 + 20 = 70']).length).toBe(1)
    expect(falseSteps(['1/4 + 1/4 = 2/8']).length).toBe(1)
    expect(falseSteps(['0.5 + 0.25 = 0.7']).length).toBe(1)
    // things it must leave alone
    expect(countChecked(['? × 7 = 56', '12 − ? = 5', '(3 + 4) × 2 = 14', '$1.25 + $0.50 = $1.75', '3:15 + 20 = 3:35', '−3 + 5 = 2', 'x + 5 = 12'])).toBe(0)
  })
  it('compares answers by value', () => {
    expect(sameValue('0.50', '1/2')).toBe(true)
    expect(isCorrect({ input: 'fraction', answer: '1/2' }, '2/4')).toBe(true)
    expect(isCorrect({ input: 'fraction', answer: '1/2', exact: true }, '2/4')).toBe(false)
    expect(isCorrect({ input: 'decimal', answer: '0.5' }, '.50')).toBe(true)
    expect(isCorrect({ input: 'number', answer: 12 }, '12')).toBe(true)
    expect(isCorrect({ input: 'choice', answer: '>' }, '<')).toBe(false)
  })
  it('choice helper', () => {
    const rng = mulberry32(1)
    expect(choice('12', ['10', '14', '8'], rng).choices).toEqual(['8', '10', '12', '14'])
    expect(choice('<', ['<', '=', '>'], rng, true).choices).toEqual(['<', '=', '>'])
    expect(choice('<', ['<', '=', '>'], rng, true).distractors).toEqual(['=', '>'])
  })
})

describe('skill graph', () => {
  it('ids are unique, prerequisites exist, and there are no loops', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length)
    for (const s of SKILLS) for (const p of s.prereqs) if (!SKILL[p]) throw new Error(`${s.id} needs unknown skill ${p}`)
    const state: Record<string, number> = {}
    const visit = (id: string, path: string[]) => {
      if (state[id] === 2) return
      if (state[id] === 1) throw new Error(`loop: ${[...path, id].join(' → ')}`)
      state[id] = 1
      for (const p of SKILL[id].prereqs) visit(p, [...path, id])
      state[id] = 2
    }
    for (const s of SKILLS) visit(s.id, [])
    expect(SKILLS.length).toBeGreaterThanOrEqual(150)
  })
  it('a skill never needs something from a much later grade', () => {
    for (const s of SKILLS) for (const p of s.prereqs) if (SKILL[p].grade > s.grade + 1) throw new Error(`${s.id} (grade ${s.grade}) needs ${p} (grade ${SKILL[p].grade})`)
  })
})

const todo = SKILLS.filter((s) => (STRAND ? s.strand === STRAND && !legacy.has(s.id) : true))
describe(`every skill: ${N.toLocaleString()} random problems each`, () => {
  for (const s of todo) {
    const isLegacy = legacy.has(s.id)
    // A strand that is not written yet is reported by the "all skills have generators" test below.
    if (!isLegacy && !GENS[s.id]) continue
    it(`${s.id} (${s.name})`, () => {
      const rng = mulberry32(7 + s.id.length * 131 + s.id.charCodeAt(3))
      const seen = new Set<string>()
      const answers = new Set<string>()
      for (let i = 0; i < N; i++) {
        const d = ((i % 3) + 1) as Difficulty
        const item = makeItem(s.id, { rng, d })
        const errs = validateItem(item)
        if (!isLegacy) {
          if (item.difficulty !== d) errs.push(`asked for difficulty ${d}, got ${item.difficulty}`)
          if (!LIMITS[s.id]) errs.push('no limits function')
          else if (!LIMITS[s.id](item)) errs.push('outside the skill limits')
        }
        if (errs.length) throw new Error(`${s.id}: ${errs.join('; ')}\n${JSON.stringify(item, null, 1).slice(0, 1500)}`)
        seen.add(item.prompt + '|' + (item.eq || ''))
        answers.add(String(item.answer))
      }
      if (N >= 500) {
        expect(seen.size, 'variety of problems').toBeGreaterThanOrEqual(12)
        expect(answers.size, 'variety of answers').toBeGreaterThanOrEqual(2)
      }
      if (!isLegacy) {
        // same seed, same problem (no Math.random hiding in a generator)
        const a = makeItem(s.id, { rng: mulberry32(99), d: 2 }),
          b = makeItem(s.id, { rng: mulberry32(99), d: 2 })
        expect(JSON.stringify(a)).toBe(JSON.stringify(b))
        // the lesson: the big idea, a worked example, two ways, the answer
        const scenes = buildScenes(s.id, 'Kam')
        if (scenes.length < 6 || scenes.length > 20) throw new Error(`${s.id}: lesson has ${scenes.length} scenes`)
        if (scenes.some((sc) => !sc.say || /NaN|undefined|\{n\}/.test(sc.say))) throw new Error(`${s.id}: lesson has a broken line`)
        const words = scenes.reduce((n, sc) => n + sc.say.split(/\s+/).length, 0)
        if (words > 300) throw new Error(`${s.id}: lesson is ${words} words, too long for 2 minutes`)
        const t = TEACH[s.id]
        if (!t || t.length < 20 || t.length > 260) throw new Error(`${s.id}: needs a "teach" line of 20 to 260 characters`)
      }
    })
  }
})

describe.skipIf(!!STRAND)('coverage', () => {
  it('every skill in the graph has a generator, limits and a teach line', () => {
    const missing = SKILLS.filter((s) => !legacy.has(s.id) && !(GENS[s.id] && LIMITS[s.id] && TEACH[s.id])).map((s) => s.id)
    expect(missing).toEqual([])
    const extra = Object.keys(GENS).filter((id) => !SKILL[id])
    expect(extra).toEqual([])
  })
})
