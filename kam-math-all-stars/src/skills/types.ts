export type Rng = () => number
export type Difficulty = 1 | 2 | 3

/** One way to solve an item. `result` is what the strategy's own arithmetic arrives at. */
export interface Strat {
  name: string
  /** Short lines a 2nd grader can follow. Any "a + b = c" written here must be true. */
  steps: string[]
  /** Points for an animated number line (optional). */
  line?: number[]
  /** A picture for this strategy: trusted HTML/SVG from kit helpers or inline-styled markup (optional). */
  html?: string
  result: number | string
}

export type Input = 'number' | 'decimal' | 'fraction' | 'choice'

/** One generated problem. */
export interface Item {
  /** The whole question in plain words. This is what is read aloud. `{n}` is replaced by the kid's name. */
  prompt: string
  /** Big math line, e.g. `47 + 38 = ${Q}` (HTML from kit helpers). Optional. */
  eq?: string
  /** A picture that is part of the question (clock, coins, graph, shape). Trusted HTML/SVG. Optional. */
  visual?: string
  /** true = the equation says it all, do not show the prompt text (it is still read aloud). */
  eqOnly?: boolean
  input: Input
  /**
   * number: an integer. decimal: a string like "0.75" or "12.5". fraction: a string like "3/4" (use "7/4" for mixed numbers).
   * choice: the label of the right choice.
   */
  answer: number | string
  /** choice only: 2 to 5 labels, the answer exactly once. */
  choices?: string[]
  /** number only: the answer can be below zero (shows a +/− key). */
  signed?: boolean
  /** fraction only: must be typed exactly this way (simplest form); otherwise any equal fraction counts. */
  exact?: boolean
  /** Shown after the answer box, e.g. "cm", "¢", "feet". */
  unit?: string
  /** At least 2. Each one must land on the answer. */
  strategies: Strat[]
  /** At least 1 wrong answer that comes from a real mistake. Same type as the answer, never equal to it. */
  distractors: (number | string)[]
  /** The numbers the problem is built from. */
  operands: number[]
  difficulty: Difficulty
  /* ---- set by the app, not by generators ---- */
  /** Small helper line under the equation. */
  sub?: string
  /** Agree/disagree format: an answer is shown and he says if it is right; if not, he gives the real one. */
  agree?: { shown: number; isTrue: boolean }
  /** Which skill made this item. */
  skill?: string
}

export type Gen = (rng: Rng, d: Difficulty) => Item

export type Strand = 'nv' | 'as' | 'md' | 'fr' | 'me' | 'ge' | 'al' | 'ps' | 'ca'
export const STRANDS: Record<Strand, { name: string; icon: string }> = {
  nv: { name: 'Numbers & Place Value', icon: '🔢' },
  as: { name: 'Add & Subtract', icon: '➕' },
  md: { name: 'Multiply & Divide', icon: '✖️' },
  fr: { name: 'Fractions', icon: '🥧' },
  me: { name: 'Measurement & Data', icon: '📏' },
  ge: { name: 'Geometry', icon: '🔷' },
  al: { name: 'Algebra Thinking', icon: '🕵️' },
  ps: { name: 'Problem Solving', icon: '🧩' },
  ca: { name: 'Calculus Ideas', icon: '🚀' },
}

export interface SkillMeta {
  id: string
  name: string
  strand: Strand
  /** Grade the skill usually belongs to (1-7). */
  grade: number
  prereqs: string[]
  /** Alabama Course of Study / Common Core tag, or "enrichment". */
  standard: string
}

/** What each strand file exports. */
export interface StrandModule {
  gens: Record<string, Gen>
  /** The big idea in 1-2 short spoken sentences, used to open the lesson. */
  teach: Record<string, string>
  /** What an item of this skill is allowed to look like (number sizes, answer range). */
  limits: Record<string, (it: Item) => boolean>
}
