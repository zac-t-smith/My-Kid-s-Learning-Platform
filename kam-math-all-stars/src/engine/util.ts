import type { Op, Rng } from './types'

export const rndWith = (rng: Rng) => (a: number, b: number) => a + Math.floor(rng() * (b - a + 1))
export const pickWith = (rng: Rng) => <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

/** Small seeded generator so tests are reproducible. */
export function mulberry32(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export const fmtN = (n: number) => Number(n).toLocaleString('en-US')
export const sym = (op: Op) => (op === '-' ? '−' : op)
export const OPW: Record<Op, string> = { '+': 'plus', '-': 'minus', '×': 'times', '÷': 'divided by' }
export const FRW: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['fourth', 'fourths'],
  5: ['fifth', 'fifths'],
  10: ['tenth', 'tenths'],
}
export const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export function calc(a: number, op: Op, b: number): number {
  return op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b
}
export const fracWords = (n: number, d: number) => `${NUMW[n]} ${FRW[d][n > 1 ? 1 : 0]}`
export const fracHTML = (n: number, d: number) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`

export const PLN: Record<number, string> = {
  1: 'Ones',
  10: 'Tens',
  100: 'Hundreds',
  1000: 'Thousands',
  10000: 'Ten thousands',
  100000: 'Hundred thousands',
  1000000: 'Millions',
}
export function placesOf(n: number): number[] {
  const out: number[] = []
  for (let pl = 1; pl <= Math.max(n, 1); pl *= 10) out.unshift(pl)
  return out
}
export const dig = (x: number, pl: number) => Math.floor(x / pl) % 10
export function pieces(n: number): number[] {
  const out = placesOf(n)
    .map((pl) => dig(n, pl) * pl)
    .filter((x) => x)
  return out.length ? out : [0]
}
export const expand = (n: number) => pieces(n).map(fmtN).join(' + ')
export function skipList(k: number, n: number): string {
  const s: number[] = []
  for (let i = 1; i <= n; i++) s.push(k * i)
  return s.join(', ')
}
