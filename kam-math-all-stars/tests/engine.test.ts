import { describe, expect, it } from 'vitest'
import { distractors, genNums, makeProblem, TOP } from '../src/engine/generate'
import { strategies } from '../src/engine/strategies'
import { calc, fmtN, mulberry32 } from '../src/engine/util'
import type { Nums, Problem } from '../src/engine/types'
import { speechFor, plainEq, eqHTML } from '../src/engine/format'

const N = 10_000
const tens = (x: number) => Math.floor(x / 10) % 10

/** Per-level limits: what a problem at this level is allowed to look like. */
const LIMITS: Record<number, (p: Nums) => boolean> = {
  0: (p) => p.b % 10 === 0 && p.b >= 10 && p.a < 100 && p.ans > 0 && p.ans < 100 && p.ans % 10 === p.a % 10,
  1: (p) => p.b >= 1 && p.b <= 9 && p.a < 100 && tens(p.ans) === tens(p.a) && p.ans >= 10,
  2: (p) => p.a < 100 && p.b >= 10 && p.ans >= 10 && p.ans < 100 && (p.op === '+' ? (p.a % 10) + (p.b % 10) <= 9 : p.a % 10 >= p.b % 10),
  3: (p) => p.b <= 9 && p.a < 100 && p.ans > 0 && p.ans < 100 && (p.op === '+' ? (p.a % 10) + p.b >= 10 : p.a % 10 < p.b),
  4: (p) => p.op === '+' && p.a < 100 && p.b < 100 && p.ans < 100 && (p.a % 10) + (p.b % 10) >= 10,
  5: (p) => p.op === '-' && p.a < 100 && p.b >= 10 && p.ans > 0 && p.a % 10 < p.b % 10,
  6: (p) => p.a >= 100 && p.a <= 999 && p.ans >= 100 && p.ans <= 999 && (p.b % 100 === 0 || (p.b % 10 === 0 && p.b < 100)),
  7: (p) => p.op === '×' && p.a >= 2 && p.a <= 5 && p.b >= 2 && p.b <= 5,
  8: (p) => p.op === '+' && p.a >= 110 && p.b >= 110 && p.ans <= 999,
  9: (p) => p.op === '-' && p.a <= 999 && p.b >= 101 && p.ans >= 40,
  10: (p) => p.op === '×' && [2, 5, 10].some((f) => p.a === f || p.b === f) && Math.max(p.a, p.b) <= 10 && Math.min(p.a, p.b) >= 2,
  11: (p) => p.op === '×' && p.a >= 3 && p.a <= 10 && p.b >= 3 && p.b <= 10,
  12: (p) => p.op === '÷' && p.b >= 2 && p.b <= 9 && p.ans >= 2 && p.ans <= 10,
  13: (p) => p.kind === 'two' && p.ans > 0 && p.ans <= 199 && calc(p.a, p.op, p.b) > 0,
  14: (p) => p.kind === 'frac' && p.num! >= 1 && p.num! < p.a && p.b % p.a === 0 && p.ans <= p.b,
  15: (p) => p.op === '×' && p.a >= 12 && p.a <= 79 && p.b >= 2 && p.b <= 9,
  16: (p) => p.a > 0 && p.b > 0 && p.ans > 0 && p.ans <= 950,
  17: (p) => p.a >= 1100 && p.a <= 9999 && p.b >= 1001 && p.ans >= 500 && p.ans <= 9999,
}

const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)`
const SIDE = String.raw`${NUM}(?:\s*[+−×÷]\s*${NUM})*`
// An equation inside a step, e.g. "40 + 12 = 52". Skips anything touching a "?" or a longer expression.
const EQ = new RegExp(String.raw`(?<![\d,/?+−×÷]\s*)(${SIDE})\s*=\s*(${SIDE})(?![\d,]|\s*[+−×÷?])`, 'g')

function evalSide(s: string): number {
  const toks = s.replace(/,/g, '').match(/\d+|[+−×÷]/g)!
  // × and ÷ first, then + and −
  const terms: number[] = [Number(toks[0])]
  const ops: string[] = []
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i],
      v = Number(toks[i + 1])
    if (op === '×') terms[terms.length - 1] *= v
    else if (op === '÷') terms[terms.length - 1] /= v
    else {
      ops.push(op)
      terms.push(v)
    }
  }
  return terms.slice(1).reduce((acc, v, i) => (ops[i] === '+' ? acc + v : acc - v), terms[0])
}

/** Every "x op y = z" written in a step must actually be true. Returns how many it checked. */
function checkStepArithmetic(steps: string[], ctx: string): number {
  let n = 0
  for (const st of steps)
    for (const m of st.matchAll(EQ)) {
      n++
      if (evalSide(m[1]) !== evalSide(m[2])) throw new Error(`false step "${st}" in ${ctx}`)
    }
  return n
}

function checkProblem(p: Problem) {
  const ctx = `L${p.L} ${plainEq(p)}`
  if (!Number.isInteger(p.ans) || !Number.isInteger(p.target) || p.target <= 0) throw new Error(`bad answer in ${ctx}`)
  // independent recomputation of the answer
  const expect =
    p.kind === 'two' ? calc(calc(p.a, p.op, p.b), p.op2!, p.c!) : p.kind === 'frac' ? (p.b / p.a) * p.num! : calc(p.a, p.op, p.b)
  if (expect !== p.ans) throw new Error(`answer mismatch in ${ctx}`)
  if (p.fmt === 'missing' && calc(p.miss === 'a' ? p.target : p.a, p.op, p.miss === 'b' ? p.target : p.b) !== p.ans)
    throw new Error(`mystery number wrong in ${ctx}`)
  if (p.fmt === 'agree') {
    if (p.isTrue !== (p.shown === p.ans)) throw new Error(`agree flag wrong in ${ctx}`)
    if (!Number.isInteger(p.shown) || p.shown! <= 0) throw new Error(`bad shown answer in ${ctx}`)
  }
  for (const d of distractors(p)) if (d === p.ans || d <= 0 || !Number.isInteger(d)) throw new Error(`bad distractor ${d} in ${ctx}`)
  const ss = strategies(p)
  if (!ss.length) throw new Error(`no strategies for ${ctx}`)
  for (const s of ss) {
    const sctx = `${ctx} [${s.name}]`
    if (s.result !== p.target) throw new Error(`strategy lands on ${s.result}, not ${p.target}: ${sctx}`)
    checkStepArithmetic(s.steps, sctx)
    const tail = s.steps.slice(-2).join(' ')
    if (!tail.replace(/,/g, '').match(new RegExp(`(?<!\\d)${p.target}(?!\\d)`))) throw new Error(`last steps never show ${fmtN(p.target)}: ${sctx}`)
    if (s.line) {
      if (s.line.some((v) => !Number.isInteger(v) || v < 0)) throw new Error(`bad number line: ${sctx}`)
    }
    if (s.steps.some((t) => /NaN|undefined|Infinity/.test(t))) throw new Error(`broken text: ${sctx}`)
  }
  for (const t of [speechFor({ ...p, story: 'x' }), plainEq(p), eqHTML(p)]) if (/NaN|undefined/.test(t)) throw new Error(`broken text in ${ctx}`)
}

describe('step checker', () => {
  it('catches a false equation and accepts true ones', () => {
    expect(checkStepArithmetic(['Tens: 40 + 20 = 60', 'Break a ten: 54 = 40 + 14', '1,200 − 300 = 900 ✓'], 't')).toBe(3)
    expect(() => checkStepArithmetic(['40 + 20 = 70'], 't')).toThrow()
    expect(() => checkStepArithmetic(['20 × 4 + 3 × 4 = 93'], 't')).toThrow()
    // mystery-number equations are not arithmetic claims
    expect(checkStepArithmetic(['56 ÷ 7 means ? × 7 = 56', '? + 5 = 12', '12 − ? = 5'], 't')).toBe(0)
  })
})

describe('math engine: 10,000 random problems per level', () => {
  for (let L = 0; L <= TOP; L++) {
    it(`level ${L + 1} stays in its limits and every strategy lands on the answer`, () => {
      const rng = mulberry32(1000 + L)
      const fmts = new Set<string>()
      for (let i = 0; i < N; i++) {
        const p = makeProblem(L, undefined, rng)
        if (!LIMITS[L](p)) throw new Error(`out of limits: L${L} ${JSON.stringify(p)}`)
        checkProblem(p)
        fmts.add(p.fmt)
      }
      expect(fmts.size).toBeGreaterThan(0)
    })
  }

  it('Super Rungs (The Climb past level 18) stay correct as they grow', () => {
    const rng = mulberry32(77)
    for (let rung = TOP + 1; rung <= TOP + 40; rung++)
      for (let i = 0; i < 500; i++) {
        const p = makeProblem(TOP + 1, rung, rng)
        if (p.a > 9_999_999 || p.ans <= 0) throw new Error(`out of limits: ${JSON.stringify(p)}`)
        checkProblem(p)
      }
  })

  it('answers never depend on the format', () => {
    const rng = mulberry32(5)
    for (let L = 0; L <= TOP; L++) for (let i = 0; i < 200; i++) expect(Number.isInteger(genNums(L, undefined, rng).ans)).toBe(true)
  })
})
