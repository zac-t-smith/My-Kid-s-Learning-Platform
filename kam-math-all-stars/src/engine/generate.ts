import type { Fmt, Nums, Op, Problem, Rng, Kind } from './types'
import { calc, pickWith, rndWith } from './util'

/** Index of the last regular level. Anything above is a Super Rung (Climb only). */
export const TOP = 17

/** Ported 1:1 from the prototype's genNums. `rung` only matters for Super Rungs. */
export function genNums(L: number, rung?: number, rng: Rng = Math.random): Nums {
  const rnd = rndWith(rng)
  const pick = pickWith(rng)
  let a = 0,
    b = 0,
    op: Op = '+',
    c: number | undefined,
    op2: Op | undefined,
    num: number | undefined,
    kind: Kind = 'basic'
  switch (L) {
    case 0:
      op = rng() < 0.55 ? '-' : '+'
      if (op === '-') {
        a = rnd(21, 99)
        b = rnd(1, Math.floor(a / 10) - 1) * 10
      } else {
        a = rnd(11, 79)
        b = rnd(1, 9 - Math.floor(a / 10)) * 10
      }
      break
    case 1:
      op = rng() < 0.55 ? '-' : '+'
      if (op === '-') {
        do a = rnd(11, 99)
        while (a % 10 < 2)
        b = rnd(1, a % 10)
      } else {
        do a = rnd(10, 98)
        while (a % 10 > 7)
        b = rnd(1, 9 - (a % 10))
      }
      break
    case 2:
      op = rng() < 0.55 ? '-' : '+'
      if (op === '-') {
        const aT = rnd(2, 9),
          bT = rnd(1, aT - 1),
          aO = rnd(1, 9),
          bO = rnd(0, aO)
        a = aT * 10 + aO
        b = bT * 10 + bO
      } else {
        const aT = rnd(1, 7),
          bT = rnd(1, 8 - aT),
          aO = rnd(0, 8),
          bO = rnd(1, 9 - aO)
        a = aT * 10 + aO
        b = bT * 10 + bO
      }
      break
    case 3:
      op = rng() < 0.55 ? '-' : '+'
      if (op === '-') {
        do a = rnd(12, 98)
        while (a % 10 > 8)
        b = rnd((a % 10) + 1, 9)
      } else {
        do a = rnd(12, 89)
        while (a % 10 < 2)
        b = rnd(10 - (a % 10), 9)
      }
      break
    case 4: {
      op = '+'
      const aO = rnd(2, 9),
        bO = rnd(10 - aO, 9),
        aT = rnd(1, 7),
        bT = rnd(1, 8 - aT)
      a = aT * 10 + aO
      b = bT * 10 + bO
      break
    }
    case 5: {
      op = '-'
      const aT = rnd(2, 9),
        bT = rnd(1, aT - 1),
        aO = rnd(0, 8),
        bO = rnd(aO + 1, 9)
      a = aT * 10 + aO
      b = bT * 10 + bO
      break
    }
    case 6: {
      const k = rnd(0, 3)
      if (k === 0) {
        op = '+'
        const h = rnd(1, 8),
          t = rnd(0, 7)
        a = h * 100 + t * 10
        b = rnd(1, 9 - t) * 10
      } else if (k === 1) {
        op = '-'
        const h = rnd(3, 9),
          t = rnd(0, 9)
        a = h * 100 + t * 10
        b = rnd(1, h - 1) * 100
      } else if (k === 2) {
        op = '+'
        const h = rnd(1, 7)
        a = h * 100 + rnd(0, 5) * 10 + rnd(0, 5)
        b = rnd(1, 8 - h) * 100
      } else {
        op = '-'
        const h = rnd(1, 9),
          t = rnd(2, 9),
          o = rnd(0, 9)
        a = h * 100 + t * 10 + o
        b = rnd(1, t - 1) * 10
      }
      break
    }
    case 7:
      op = '×'
      a = rnd(2, 5)
      b = rnd(2, 5)
      break
    case 8:
      op = '+'
      do {
        a = rnd(110, 780)
        b = rnd(110, 999 - a)
      } while (!((a % 10) + (b % 10) >= 10 || (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) >= 10))
      break
    case 9:
      op = '-'
      do {
        a = rng() < 0.25 ? rnd(3, 9) * 100 + rnd(0, 1) * rnd(1, 9) : rnd(300, 999)
        b = rnd(101, a - 40)
      } while (!(a % 10 < b % 10 || Math.floor(a / 10) % 10 < Math.floor(b / 10) % 10))
      break
    case 10: {
      op = '×'
      const f = pick([2, 5, 10]),
        g = rnd(2, 10)
      ;[a, b] = rng() < 0.5 ? [f, g] : [g, f]
      break
    }
    case 11: {
      op = '×'
      const f = pick([3, 4, 6, 7, 8, 9]),
        g = rnd(3, 10)
      ;[a, b] = rng() < 0.5 ? [f, g] : [g, f]
      break
    }
    case 12:
      op = '÷'
      b = rnd(2, 9)
      a = b * rnd(2, 10)
      break
    case 13:
      kind = 'two'
      do {
        a = rnd(20, 80)
        b = rnd(11, 49)
        c = rnd(5, 39)
        op = pick(['+', '-'] as const)
        op2 = pick(['+', '-'] as const)
      } while (
        calc(a, op, b) <= 0 ||
        calc(calc(a, op, b), op2, c) <= 0 ||
        calc(a, op, b) > 199 ||
        calc(calc(a, op, b), op2, c) > 199
      )
      break
    case 14:
      kind = 'frac'
      a = pick([2, 3, 4, 5, 10])
      b = a * rnd(2, 10)
      num = a > 2 && rng() < 0.4 ? rnd(2, a - 1) : 1
      break
    case 15:
      op = '×'
      a = rnd(12, 79)
      if (a % 10 === 0) a++
      b = rnd(2, 9)
      break
    case 16: {
      const t = rnd(0, 3)
      if (t === 0) {
        op = '×'
        a = rnd(3, 9)
        b = rnd(3, 9)
      } else if (t === 1) {
        op = '÷'
        b = rnd(3, 9)
        a = b * rnd(3, 10)
      } else if (t === 2) {
        op = '+'
        a = rnd(120, 600)
        b = rnd(45, 350)
      } else {
        op = '-'
        a = rnd(100, 900)
        b = rnd(25, a - 20)
      }
      break
    }
    case 17:
      op = rng() < 0.5 ? '+' : '-'
      if (op === '+') {
        a = rnd(1100, 7800)
        b = rnd(1100, 9999 - a)
      } else {
        a = rnd(2100, 9999)
        b = rnd(1001, a - 500)
      }
      break
    default: {
      // Super Rungs: keeps growing forever
      const tier = Math.max(0, (rung ?? TOP + 1) - TOP - 1)
      const t = rnd(0, 2)
      if (t === 0) {
        const D = Math.min(7, 4 + Math.floor(tier / 3))
        op = rng() < 0.5 ? '+' : '-'
        const lo = Math.pow(10, D - 1),
          hi = Math.pow(10, D) - 1
        if (op === '+') {
          a = rnd(lo, Math.floor(hi * 0.6))
          b = rnd(lo, hi - a)
        } else {
          a = rnd(lo * 2, hi)
          b = rnd(lo, a - lo)
        }
      } else if (t === 1) {
        op = '×'
        if (tier < 3) {
          a = rnd(51, 99)
          b = rnd(6, 9)
        } else if (tier < 6) {
          a = rnd(12, 49)
          b = rnd(11, 29)
        } else {
          a = rnd(101, 499)
          b = rnd(12, 49)
        }
      } else {
        op = '÷'
        if (tier < 4) {
          b = rnd(3, 9)
          a = b * rnd(11, 99)
        } else {
          b = rnd(11, 25)
          a = b * rnd(11, 60)
        }
      }
    }
  }
  let ans: number
  if (kind === 'two') ans = calc(calc(a, op, b), op2!, c!)
  else if (kind === 'frac') ans = (b / a) * num!
  else ans = calc(a, op, b)
  return { L, a, b, op, ans, c, op2, num, kind }
}

/** The classic "work each column on its own" mistake: no carrying, smaller-from-bigger. */
export function digitsBug(a: number, b: number, op: Op): number {
  let r = 0,
    place = 1
  while (a > 0 || b > 0) {
    const x = a % 10,
      y = b % 10
    r += (op === '+' ? (x + y) % 10 : Math.abs(x - y)) * place
    a = Math.floor(a / 10)
    b = Math.floor(b / 10)
    place *= 10
  }
  return r
}

/** Wrong answers that model real mistakes. Never includes the right answer. */
export function distractors(p: Nums): number[] {
  const { a, b, op, ans } = p
  const c: number[] = []
  if (p.kind === 'two') c.push(calc(a, op, b), ans + 10, ans - 10, ans + 1)
  else if (p.kind === 'frac') c.push(p.b / p.a, ans + p.b / p.a, ans + 1, ans - 1)
  else if (op === '+' || op === '-') {
    const bug = digitsBug(a, b, op)
    if (bug !== ans) c.push(bug, bug)
    c.push(ans + 10, ans - 10, ans + 1, ans - 1)
    if (ans >= 100) c.push(ans + 100, ans - 100)
  } else if (op === '×') {
    c.push(ans + a, ans - a, ans + b, ans - b)
    if (a <= 10 && b <= 10) c.push(a + b)
  } else c.push(ans + 1, ans - 1, ans + 2)
  const ok = c.filter((x) => x > 0 && x !== ans && Number.isInteger(x))
  return ok.length ? ok : [ans + 1]
}
export const wrongGuess = (p: Nums, rng: Rng = Math.random) => pickWith(rng)(distractors(p))

const FMTS: Record<number, Fmt[]> = {
  7: ['solve', 'solve', 'story', 'agree'],
  13: ['story', 'story', 'solve', 'agree'],
  14: ['solve', 'solve', 'agree'],
  15: ['solve', 'solve', 'story', 'agree'],
  16: ['missing'],
  18: ['solve', 'solve', 'agree', 'story'],
}
const FMT_DEFAULT: Fmt[] = ['solve', 'solve', 'solve', 'story', 'story', 'agree', 'agree', 'missing']

/** Numbers + a format. The story text is added by the content layer (it needs the theme). */
export function makeProblem(L: number, rung?: number, rng: Rng = Math.random, only?: Fmt[]): Problem {
  const pick = pickWith(rng)
  const n = genNums(L, rung, rng)
  const all = FMTS[L] || FMT_DEFAULT
  // `only` narrows the formats (Ballgame pitches); a level that has none of them keeps its own.
  const allowed = only ? all.filter((f) => only.includes(f)) : all
  const p: Problem = { ...n, fmt: pick(allowed.length ? allowed : all), target: n.ans }
  if (p.fmt === 'agree') {
    p.isTrue = rng() < 0.45
    p.shown = p.isTrue ? p.ans : wrongGuess(p, rng)
  }
  if (p.fmt === 'missing') {
    p.miss = L === 16 ? pick(['a', 'b'] as const) : 'b'
    p.target = p[p.miss]
  }
  return p
}
