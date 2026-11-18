import type { Op, Rng } from '../engine/types'
import { calc, pickWith, rndWith, sym } from '../engine/util'

/* Defense challenges for the bottom of each inning. The engine makes them and checks them. */

const OPWORD: Record<Op, string> = { '+': 'plus', '-': 'minus', '×': 'times', '÷': 'divide' }

/** Pitching: Kam builds a problem whose answer lands in the strike zone. */
export interface PitchChallenge {
  kind: 'pitching'
  op: Op
  lo: number
  hi: number
  /** Both numbers must be at least this big (no "45 + 0"). */
  min: number
  /** And no bigger than this. */
  max: number
  prompt: string
  rule: string
  /** One pair that works, shown if he needs it. */
  example: [number, number]
}

export function makePitchChallenge(U: number, rating: number, rng: Rng = Math.random): PitchChallenge {
  const rnd = rndWith(rng),
    pick = pickWith(rng)
  const ops: Op[] = U < 3 ? ['+'] : U < 10 ? ['+', '-'] : ['+', '-', '×']
  const op = pick(ops)
  const width = rating >= 4 ? 5 : 10
  let a: number, b: number, min: number, max: number
  if (op === '×') {
    min = 2
    max = 12
    a = rnd(2, 9)
    b = U < 11 ? pick([2, 5, 10]) : rnd(3, 9)
  } else if (op === '+') {
    min = U < 2 ? 1 : 10
    max = 99
    a = rnd(Math.max(min, 11), 60)
    b = rnd(Math.max(min, 10), 35)
  } else {
    min = U < 2 ? 1 : 10
    max = 99
    b = rnd(Math.max(min, 10), 45)
    a = b + rnd(12, 99 - b - 1)
  }
  const ans = calc(a, op, b)
  const lo = ans - (ans % width)
  const hi = lo + width
  return {
    kind: 'pitching',
    op,
    lo,
    hi,
    min,
    max,
    prompt: `Make a ${OPWORD[op]} problem with an answer between ${lo} and ${hi}.`,
    rule: min > 1 ? `Both numbers must be ${min} or more.` : '',
    example: [a, b],
  }
}

export type PitchCheck = { ok: true; value: number } | { ok: false; value: number; why: 'low' | 'high' | 'small' | 'big' }
export function checkPitch(c: PitchChallenge, a: number, b: number): PitchCheck {
  const value = calc(a, c.op, b)
  if (a < c.min || b < c.min) return { ok: false, value, why: 'small' }
  if (a > c.max || b > c.max) return { ok: false, value, why: 'big' }
  if (value < c.lo) return { ok: false, value, why: 'low' }
  if (value > c.hi) return { ok: false, value, why: 'high' }
  return { ok: true, value }
}
export function pitchHint(c: PitchChallenge, a: number, b: number, r: PitchCheck): string {
  if (r.ok) return ''
  const eq = `${a} ${sym(c.op)} ${b} = ${r.value}.`
  if (r.why === 'small') return `Both numbers need to be ${c.min} or more.`
  if (r.why === 'big') return `Use numbers up to ${c.max}.`
  return r.why === 'low' ? `${eq} That is too low. We need ${c.lo} to ${c.hi}.` : `${eq} That is too high. We need ${c.lo} to ${c.hi}.`
}

/** Fielding: a quick decision with big answer buttons. */
export interface FieldChallenge {
  kind: 'fielding'
  type: 'bases' | 'outs' | 'estimate' | 'lead' | 'feet'
  prompt: string
  choices: string[]
  /** Index of the right choice. */
  answer: number
  /** Said after he answers, right or not. */
  explain: string
}

function numeric(prompt: string, type: FieldChallenge['type'], right: number, options: number[], explain: string): FieldChallenge {
  const set = [...new Set([right, ...options])].filter((x) => x >= 0).sort((x, y) => x - y)
  return { kind: 'fielding', type, prompt, choices: set.map(String), answer: set.indexOf(right), explain }
}

export function makeFieldChallenge(U: number, rating: number, rng: Rng = Math.random): FieldChallenge {
  const rnd = rndWith(rng),
    pick = pickWith(rng)
  const types: FieldChallenge['type'][] = ['bases', 'outs', 'estimate', 'estimate', 'lead']
  if (U >= 4) types.push('feet')
  const type = pick(types)
  if (type === 'bases') {
    const on = rnd(1, 3)
    const where = ['first', 'second', 'third'][on - 1]
    const need = 4 - on
    return numeric(`A runner is on ${where} base. How many more bases to get home?`, type, need, [1, 2, 3, 4], `From ${where}, home is ${need} ${need === 1 ? 'base' : 'bases'} away.`)
  }
  if (type === 'outs') {
    const outs = rnd(0, 2)
    return numeric(`We have ${outs} ${outs === 1 ? 'out' : 'outs'}. How many more outs end the inning?`, type, 3 - outs, [1, 2, 3], `3 outs end the inning. 3 minus ${outs} is ${3 - outs}.`)
  }
  if (type === 'lead') {
    const them = rnd(1, 9),
      ahead = rnd(1, 8),
      us = them + ahead
    return numeric(`We have ${us} runs. They have ${them} runs. How many runs are we ahead?`, type, ahead, [ahead + 1, ahead - 1, ahead + 2, us], `${us} minus ${them} is ${ahead}.`)
  }
  if (type === 'feet') {
    const n = rnd(2, 4)
    const to = ['', '', 'second base', 'third base', 'home plate again'][n]
    return numeric(`The bases are 60 feet apart. How many feet do you run from home plate to ${to}?`, type, 60 * n, [60, 120, 180, 240], `That is ${n} trips of 60 feet. ${n} times 60 is ${60 * n}.`)
  }
  // estimate: is a ± b more or less than a round number?
  const big = U >= 8
  const op: Op = U >= 3 && rng() < 0.4 ? '-' : '+'
  const step = big ? 100 : 10
  const gap = rating >= 4 ? (big ? 12 : 2) : big ? 25 : 4
  for (;;) {
    let a = big ? rnd(120, 480) : rnd(14, 58),
      b = big ? rnd(110, 380) : rnd(12, 39)
    if (op === '-' && a < b) [a, b] = [b, a]
    const s = calc(a, op, b)
    const t = Math.round(s / step) * step
    if (t <= 0 || Math.abs(s - t) < gap || s <= 0) continue
    const more = s > t
    return {
      kind: 'fielding',
      type,
      prompt: `Quick! Is ${a} ${sym(op)} ${b} more or less than ${t}?`,
      choices: ['More', 'Less'],
      answer: more ? 0 : 1,
      explain: `${a} ${sym(op)} ${b} = ${s}. That is ${more ? 'more' : 'less'} than ${t}.`,
    }
  }
}
