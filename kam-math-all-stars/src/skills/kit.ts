import type { Item, Rng, Strat } from './types'

/* Everything a skill generator needs. Import from here only. */
export { fmtN, sym, fracHTML, fracWords, calc, dig, pieces, expand, placesOf, skipList, PLN } from '../engine/util'
export { Q } from '../engine/format'
export { numberLineSVG, groupsHTML, arrayHTML, areaHTML, barHTML, placeTable } from '../engine/visuals'
export type { Gen, Item, Strat, Rng, Difficulty, StrandModule } from './types'

/** Random helpers bound to the seeded generator. Never use Math.random in a skill. */
export function R(rng: Rng) {
  const int = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1))
  return {
    int,
    pick: <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)],
    /** true with probability p */
    chance: (p = 0.5) => rng() < p,
    shuffle: <T,>(xs: readonly T[]): T[] => {
      const a = [...xs]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
  }
}

/** Build a strategy. */
export const strat = (name: string, steps: string[], result: number | string, extra: { line?: number[]; html?: string } = {}): Strat => ({ name, steps, result, ...extra })

/** Wrong numeric answers: keeps whole numbers ≥ 0 that are not the answer, no repeats. Falls back to answer ± 1. */
export function wrongs(answer: number, candidates: number[], allowNegative = false): number[] {
  const out = [...new Set(candidates)].filter((x) => Number.isSafeInteger(x) && x !== answer && (allowNegative || x >= 0))
  return out.length ? out : [answer + 1]
}

/**
 * Finish a multiple-choice item.
 * - Default: pass the wrong options; numbers get sorted smallest to biggest, words get shuffled.
 * - keepOrder: pass ALL the options in the order to show them (e.g. ['<', '=', '>']), answer included.
 */
export function choice(answer: string, others: string[], rng: Rng, keepOrder = false): Pick<Item, 'input' | 'answer' | 'choices' | 'distractors'> {
  let all = [...new Set(keepOrder ? others : [answer, ...others])]
  if (!all.includes(answer)) all.push(answer)
  if (!keepOrder) {
    all = [answer, ...all.filter((x) => x !== answer).slice(0, 4)]
    if (all.every((x) => /^-?[\d,.]+$/.test(x))) all.sort((a, b) => Number(a.replace(/,/g, '')) - Number(b.replace(/,/g, '')))
    else all = R(rng).shuffle(all)
  }
  return { input: 'choice', answer, choices: all, distractors: all.filter((x) => x !== answer) }
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b
/** "3/4" in lowest terms. */
export const frac = (n: number, d: number) => `${n / gcd(n, d)}/${d / gcd(n, d)}`
/** Decimal string without float noise, e.g. dec(0.1 + 0.2) → "0.3". */
export const dec = (x: number, places = 3) => String(Number(x.toFixed(places)))
