import type { Item } from './types'

/* Deterministic checking of items: exact fraction arithmetic, no floating point. */

export type Frac = [number, number]
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const norm = ([n, d]: Frac): Frac => {
  if (d === 0) return [NaN, 1]
  const g = gcd(n, d) || 1
  return d < 0 ? [-n / g, -d / g] : [n / g, d / g]
}
/** Parse "12", "1,234", "0.75", "3/4", "-5" or "−5" into an exact fraction. */
export function parseNum(s: string | number): Frac | null {
  const t = String(s).replace(/,/g, '').replace('−', '-').trim()
  let m = /^(-?\d+)\/(\d+)$/.exec(t)
  if (m) return +m[2] ? norm([+m[1], +m[2]]) : null
  m = /^(-?)(\d*)\.(\d+)$/.exec(t)
  if (m) return norm([(m[1] ? -1 : 1) * Number((m[2] || '0') + m[3]), 10 ** m[3].length])
  return /^-?\d+$/.test(t) ? [Number(t), 1] : null
}
export const sameValue = (a: string | number, b: string | number): boolean => {
  const x = parseNum(a),
    y = parseNum(b)
  return !!x && !!y && x[0] === y[0] && x[1] === y[1]
}

/** Is `given` a right answer for this item? Used by the app and by the tests. */
export function isCorrect(it: Pick<Item, 'input' | 'answer' | 'exact'>, given: string | number): boolean {
  if (it.input === 'choice') return String(given) === String(it.answer)
  if (it.input === 'fraction' && it.exact) return String(given).replace(/\s/g, '') === String(it.answer)
  return sameValue(given, it.answer)
}

const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\/\d+|\d*\.\d+|\d+)`
const SIDE = String.raw`${NUM}(?:\s*[+−×÷]\s*${NUM})*`
// An equation written inside a step, e.g. "40 + 12 = 52" or "1/4 + 2/4 = 3/4" or "0.3 + 0.4 = 0.7 = 7/10".
// Skipped when it touches "?", brackets, "$", ":" or a longer expression we cannot read.
const EQ = new RegExp(String.raw`(?<!:)(?<![\d,./?+−×÷($-]\s*)(${SIDE}(?:\s*=\s*${SIDE})+)(?![\d,/:]|\.\d|\s*[+−×÷?(%])`, 'g')

function evalSide(s: string): Frac {
  const toks = s.match(new RegExp(`${NUM}|[+−×÷]`, 'g'))!
  const mul = (a: Frac, b: Frac): Frac => norm([a[0] * b[0], a[1] * b[1]])
  const add = (a: Frac, b: Frac): Frac => norm([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
  const terms: Frac[] = [parseNum(toks[0])!]
  const ops: string[] = []
  for (let i = 1; i < toks.length; i += 2) {
    const v = parseNum(toks[i + 1])!
    if (toks[i] === '×') terms[terms.length - 1] = mul(terms[terms.length - 1], v)
    else if (toks[i] === '÷') terms[terms.length - 1] = mul(terms[terms.length - 1], [v[1], v[0]])
    else {
      ops.push(toks[i])
      terms.push(v)
    }
  }
  return terms.slice(1).reduce((acc, v, i) => add(acc, ops[i] === '+' ? v : [-v[0], v[1]]), terms[0])
}

/** Every equation written in these steps must be true. Returns the false ones (empty = all good). */
export function falseSteps(steps: string[]): string[] {
  const bad: string[] = []
  for (const st of steps)
    for (const m of st.matchAll(EQ)) {
      const sides = m[1].split('=').map(evalSide)
      if (sides.some((x, i) => i > 0 && (x[0] !== sides[0][0] || x[1] !== sides[0][1] || Number.isNaN(x[0])))) bad.push(st)
    }
  return bad
}
/** How many equations the checker can read in these steps (for tests of the checker itself). */
export const countChecked = (steps: string[]) => steps.reduce((n, st) => n + [...st.matchAll(EQ)].length, 0)

/** Everything that must hold for any item of any skill. Returns a list of problems (empty = valid). */
export function validateItem(it: Item): string[] {
  const errs: string[] = []
  const bad = (m: string) => errs.push(m)
  const texts = [it.prompt, it.eq || '', ...it.strategies.flatMap((s) => [s.name, ...s.steps])]
  if (!it.prompt || it.prompt.length < 6) bad('prompt missing')
  if (it.prompt.length > 260) bad('prompt too long')
  if (texts.some((t) => /NaN|undefined|Infinity|\[object/.test(t))) bad('broken text')
  const valid = (v: number | string): boolean =>
    it.input === 'number'
      ? typeof v === 'number' && Number.isSafeInteger(v) && (it.signed || v >= 0)
      : it.input === 'decimal'
        ? typeof v === 'string' && /^-?\d+(\.\d{1,3})?$/.test(v)
        : it.input === 'fraction'
          ? typeof v === 'string' && /^\d+\/[1-9]\d*$/.test(v)
          : typeof v === 'string' && v.length > 0
  if (!valid(it.answer)) bad(`answer ${JSON.stringify(it.answer)} is not a valid ${it.input}`)
  if (it.input === 'choice') {
    const c = it.choices || []
    if (c.length < 2 || c.length > 5) bad('choices must have 2 to 5 options')
    if (new Set(c).size !== c.length) bad('duplicate choices')
    if (c.filter((x) => x === it.answer).length !== 1) bad('answer must be in choices exactly once')
    if (it.distractors.some((d) => !c.includes(String(d)))) bad('choice distractors must be among the choices')
  } else if (it.choices) bad('choices only belong on choice items')
  if (it.strategies.length < 2) bad('needs at least 2 strategies')
  if (new Set(it.strategies.map((s) => s.name)).size !== it.strategies.length) bad('strategy names must differ')
  for (const s of it.strategies) {
    if (s.steps.length < 2) bad(`strategy "${s.name}" needs at least 2 steps`)
    if (s.steps.some((t) => t.length > 170)) bad(`strategy "${s.name}" has a step that is too long`)
    if (!isCorrect(it, s.result)) bad(`strategy "${s.name}" lands on ${s.result}, not ${it.answer}`)
    for (const f of falseSteps(s.steps)) bad(`false arithmetic in "${s.name}": ${f}`)
    if (s.line && (s.line.length < 2 || s.line.some((v) => !Number.isFinite(v)))) bad(`bad number line in "${s.name}"`)
  }
  if (!it.distractors.length) bad('needs at least 1 distractor')
  for (const d of it.distractors) {
    if (!valid(d)) bad(`distractor ${JSON.stringify(d)} is not a valid ${it.input}`)
    else if (isCorrect(it, d) || (it.input !== 'choice' && it.input !== 'number' && sameValue(d, it.answer))) bad(`distractor ${d} equals the answer`)
  }
  if (!it.operands.length || it.operands.some((x) => !Number.isFinite(x))) bad('operands missing or not numbers')
  if (![1, 2, 3].includes(it.difficulty)) bad('difficulty must be 1, 2 or 3')
  return errs
}
