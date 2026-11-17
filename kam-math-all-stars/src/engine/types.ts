export type Op = '+' | '-' | '×' | '÷'
export type Kind = 'basic' | 'two' | 'frac'
export type Fmt = 'solve' | 'story' | 'agree' | 'missing'
export type Rng = () => number

/** Raw numbers for a problem, before a format (solve/story/agree/missing) is chosen. */
export interface Nums {
  /** Level index the numbers were generated for (18 = Super Rungs). */
  L: number
  a: number
  b: number
  op: Op
  ans: number
  c?: number
  op2?: Op
  /** Fraction numerator (kind === 'frac'; `a` is the denominator, `b` the whole). */
  num?: number
  kind: Kind
}

export interface Problem extends Nums {
  fmt: Fmt
  /** agree/disagree: is the shown equation true, and what answer is shown. */
  isTrue?: boolean
  shown?: number
  /** missing-number: which operand is hidden. */
  miss?: 'a' | 'b'
  /** The number Kam has to enter. */
  target: number
  /** Theme key the story was written for (story is filled in by content layer). */
  storyKey?: string
  story?: string
  bonus?: boolean
}

export interface Strategy {
  name: string
  steps: string[]
  /** Points for an animated number line. */
  line?: number[]
  /** Pre-built visual (groups / array / area model / fraction bar) as trusted HTML. */
  html?: string
  /** The value this strategy's own arithmetic arrives at. Must equal the problem target. */
  result: number
}
