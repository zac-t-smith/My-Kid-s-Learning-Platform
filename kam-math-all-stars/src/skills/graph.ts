import { storyFor, THEMES, type Theme } from '../content/themes'
import { eqHTML, speechFor, subline } from '../engine/format'
import { distractors, makeProblem } from '../engine/generate'
import { strategies } from '../engine/strategies'
import type { Fmt, Problem } from '../engine/types'
import { wrongs } from './kit'
import { LEGACY, legacyLevel, SKILL, SKILLS } from './manifest'
import type { Difficulty, Gen, Item, Rng, StrandModule } from './types'

/* Joins the manifest with the generators. Strand files in ./strands register themselves by existing. */
const modules = import.meta.glob<StrandModule>('./strands/*.ts', { eager: true })
export const GENS: Record<string, Gen> = {}
export const TEACH: Record<string, string> = {}
export const LIMITS: Record<string, (it: Item) => boolean> = {}
for (const m of Object.values(modules)) {
  Object.assign(GENS, m.gens)
  Object.assign(TEACH, m.teach)
  Object.assign(LIMITS, m.limits)
}

/** Turn one of the original level problems into an item. */
export function fromProblem(p: Problem): Item {
  const story = p.fmt === 'story'
  const wrong =
    p.fmt === 'missing' ? wrongs(p.target, [p.ans, p.target + 1, p.target - 1, p.target + 10]) : wrongs(p.target, distractors(p))
  return {
    prompt: speechFor(p),
    eq: story ? undefined : eqHTML(p),
    eqOnly: !story,
    sub: subline(p),
    input: 'number',
    answer: p.target,
    strategies: strategies(p).map((s) => ({ ...s })),
    distractors: wrong,
    operands: [p.a, p.b, ...(p.c !== undefined ? [p.c] : [])],
    difficulty: 2,
    agree: p.fmt === 'agree' ? { shown: p.shown!, isTrue: !!p.isTrue } : undefined,
  }
}

export interface MakeOpts {
  rng?: Rng
  d?: Difficulty
  /** Original levels only: story theme and which formats are allowed. */
  theme?: Theme
  name?: string
  only?: Fmt[]
  /** Original levels past the top (Super Rungs). */
  rung?: number
}
/** Make one problem for a skill. */
export function makeItem(id: string, o: MakeOpts = {}): Item {
  const rng = o.rng ?? Math.random
  const L = legacyLevel(id)
  let it: Item
  if (L >= 0 || id === 'super') {
    const p = makeProblem(L >= 0 ? L : LEGACY.length, o.rung, rng, o.only)
    if (p.fmt === 'story') p.story = storyFor(p, o.name ?? '{n}', o.theme ?? THEMES.baseball, rng)
    it = fromProblem(p)
  } else {
    const gen = GENS[id]
    if (!gen) throw new Error(`no generator for skill ${id}`)
    it = gen(rng, o.d ?? 1)
  }
  it.skill = id
  return it
}
export const hasGen = (id: string) => legacyLevel(id) >= 0 || !!GENS[id]
/** Skills that can be played right now (their generator exists). */
export const PLAYABLE = SKILLS.filter((s) => hasGen(s.id))
export { SKILL, SKILLS }
