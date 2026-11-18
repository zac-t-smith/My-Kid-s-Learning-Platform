import { R, strat, wrongs, choice, Q, gcd, lcm, frac, fracHTML, type Gen, type Item } from '../kit'

/* Fractions strand: equal parts through unlike denominators, fraction × fraction, unit-fraction division, percents.
   Every answer is built from whole-number tops and bottoms. No floating point touches an answer. */

/* ------------------------------------------------------------------ words ------------------------------------------------------------------ */

const DW: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['fourth', 'fourths'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'],
  8: ['eighth', 'eighths'],
  9: ['ninth', 'ninths'],
  10: ['tenth', 'tenths'],
  11: ['eleventh', 'elevenths'],
  12: ['twelfth', 'twelfths'],
  100: ['hundredth', 'hundredths'],
}
/** "3 eighths", "1 half" (for prompts that are only heard). */
const parts = (n: number, d: number) => `${n} ${DW[d][n === 1 ? 0 : 1]}`
const s = (n: number, word = 's') => (n === 1 ? '' : word)
/** Mixed number in words: 7/4 → "1 and 3/4". */
const mx = (n: number, d: number) => (n < d ? `${n}/${d}` : n % d === 0 ? `${n / d}` : `${Math.floor(n / d)} and ${n % d}/${d}`)
/** The "type an improper fraction" hint, with an example that is never the answer. */
const hint = (n: number, d: number) => `Type it as a fraction like ${n * 4 === 7 * d ? '5/3' : '7/4'}.`
const sign = (x: number, y: number) => (x > y ? '>' : x < y ? '<' : '=')
const fv = (v: number | string): [number, number] => {
  const [a, b] = String(v).split('/').map(Number)
  return [a, b]
}
/** Stacked fraction with a "?" in it. */
const fq = (top: number | string, bot: number | string) => `<span class="fr"><span>${top}</span><span>${bot}</span></span>`
/** Mixed number as HTML: whole followed by a stacked fraction. */
const mxHTML = (w: number, n: number, d: number) => `${w || ''}${fracHTML(n, d)}`

/** Wrong fraction answers from real mistakes: valid, never equal in value to the answer, no repeats. */
function fwr(n: number, d: number, cands: [number, number][]): string[] {
  const out: string[] = []
  for (const [a, b] of cands) {
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 1 || b < 1) continue
    if (a * d === n * b) continue
    const t = `${a}/${b}`
    if (!out.includes(t)) out.push(t)
  }
  return out.length ? out.slice(0, 4) : [`${n + 1}/${d}`]
}
/** n/d as a decimal string, for bottoms that go into 100. Integer math only. */
function decStr(n: number, d: number): string {
  const h = (n * 1000) / d
  const whole = Math.floor(h / 1000)
  const rem = String(h % 1000).padStart(3, '0').replace(/0+$/, '')
  return rem ? `${whole}.${rem}` : `${whole}`
}
/** Wrong decimal answers: valid strings that are not the answer's value. */
function dwr(ans: string, cands: string[]): string[] {
  const out: string[] = []
  for (const c of cands) if (/^\d+(\.\d{1,3})?$/.test(c) && Number(c) !== Number(ans) && !out.includes(c)) out.push(c)
  return out.length ? out.slice(0, 4) : [decStr(Math.round(Number(ans) * 100) + 1, 100)]
}

/* ----------------------------------------------------------------- pictures ---------------------------------------------------------------- */

const INK = '#37474f'
const ORANGE = '#ffb74d'
const BLUE = '#4fc3f7'
const GREEN = '#66bb6a'
const OFF = '#ffffff'
const rnd = (x: number) => Math.round(x * 100) / 100
const svg = (w: number, h: number, body: string, label: string) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" style="display:block;width:100%;max-width:${w}px;margin:8px auto">${body}</svg>`

function barRow(x: number, y: number, w: number, h: number, d: number, fill: (i: number) => string, wts?: number[]): string {
  const ws = wts ?? Array.from({ length: d }, () => 1)
  const tot = ws.reduce((p, c) => p + c, 0)
  let out = ''
  let cx = x
  ws.forEach((wt, i) => {
    const pw = (w * wt) / tot
    out += `<rect x="${rnd(cx)}" y="${y}" width="${rnd(pw)}" height="${h}" fill="${fill(i)}" stroke="${INK}" stroke-width="2"/>`
    cx += pw
  })
  return out
}
/** One bar cut into d parts; `on(i)` says which parts are colored. `wts` makes unequal parts. */
function barPic(d: number, on: (i: number) => boolean, wts?: number[]): string {
  return svg(368, 64, barRow(4, 4, 360, 56, d, (i) => (on(i) ? ORANGE : OFF), wts), `a bar cut into ${d} parts`)
}
interface Row {
  n: number
  d: number
  label?: string
  color?: string
  /** more parts in blue after the first n */
  n2?: number
}
/** Bars of the same length, one under the other. */
function stackPic(rows: Row[], label: string): string {
  const LW = rows.some((r) => r.label) ? 78 : 4
  const W = 300
  const H = 36
  const G = 10
  let out = ''
  rows.forEach((r, i) => {
    const y = 4 + i * (H + G)
    if (r.label) out += `<text x="${LW - 10}" y="${y + H / 2 + 6}" text-anchor="end" font-size="18" font-weight="700" fill="${INK}">${r.label}</text>`
    out += barRow(LW, y, W, H, r.d, (j) => (j < r.n ? r.color ?? ORANGE : j < r.n + (r.n2 ?? 0) ? BLUE : OFF))
  })
  return svg(LW + W + 4, rows.length * (H + G), out, label)
}
function pieAt(cx: number, cy: number, r: number, d: number, fill: (i: number) => string, wts?: number[]): string {
  const ws = wts ?? Array.from({ length: d }, () => 1)
  if (ws.length === 1) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill(0)}" stroke="${INK}" stroke-width="2"/>`
  const tot = ws.reduce((p, c) => p + c, 0)
  const pt = (deg: number) => `${rnd(cx + r * Math.cos((deg * Math.PI) / 180))} ${rnd(cy + r * Math.sin((deg * Math.PI) / 180))}`
  let ang = -90
  let out = ''
  ws.forEach((w, i) => {
    const a2 = ang + (360 * w) / tot
    out += `<path d="M${cx} ${cy} L${pt(ang)} A${r} ${r} 0 ${a2 - ang > 180 ? 1 : 0} 1 ${pt(a2)} Z" fill="${fill(i)}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
    ang = a2
  })
  return out
}
/** `count` circles, each cut into d slices; `fill(k, i)` colors slice i of circle k. */
function piesPic(count: number, d: number, fill: (k: number, i: number) => string, wts?: number[]): string {
  const cols = Math.min(count, 5)
  const rows = Math.ceil(count / 5)
  const big = count === 1
  const r = big ? 60 : 36
  const step = 2 * r + 12
  let out = ''
  for (let k = 0; k < count; k++) out += pieAt(6 + r + (k % 5) * step, 6 + r + Math.floor(k / 5) * step, r, d, (i) => fill(k, i), wts)
  return svg(cols * step, rows * step, out, `${count} circle${s(count)} cut into ${d} parts`)
}
/** n of the d-ths colored, across as many whole circles as it takes. */
const shadedPies = (n: number, d: number, wholes?: number) => piesPic(wholes ?? Math.max(1, Math.ceil(n / d)), d, (k, i) => (k * d + i < n ? ORANGE : OFF))
/** A row of d round things, n colored. */
function dotsPic(n: number, d: number): string {
  let out = ''
  for (let i = 0; i < d; i++) out += `<circle cx="${20 + i * 34}" cy="20" r="14" fill="${i < n ? ORANGE : OFF}" stroke="${INK}" stroke-width="2"/>`
  return svg(d * 34 + 6, 40, out, `${d} things, ${n} colored`)
}
/** Number line from 0 to max, cut into d-ths. mark and hop are counted in d-ths. */
function nlinePic(o: { d: number; max?: number; mark?: number; all?: boolean; hop?: [number, number] }): string {
  const max = o.max ?? 1
  const T = o.d * max
  const x0 = 28
  const x1 = 392
  const y = 52
  const X = (i: number) => rnd(x0 + ((x1 - x0) * i) / T)
  const all = !!o.all && T <= 12
  let out = `<line x1="${x0 - 14}" y1="${y}" x2="${x1 + 14}" y2="${y}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
  for (let i = 0; i <= T; i++) {
    const whole = i % o.d === 0
    out += `<line x1="${X(i)}" y1="${y - (whole ? 14 : 8)}" x2="${X(i)}" y2="${y + (whole ? 14 : 8)}" stroke="${INK}" stroke-width="${whole ? 3 : 2}"/>`
    if (whole) out += `<text x="${X(i)}" y="${y + 36}" text-anchor="middle" font-size="20" font-weight="700" fill="${INK}">${i / o.d}</text>`
    else if (all) out += `<text x="${X(i)}" y="${y + (T > 8 && i % 2 ? 44 : 28)}" text-anchor="middle" font-size="14" font-weight="700" fill="#546e7a">${i}/${o.d}</text>`
  }
  if (o.hop) {
    const [a, b] = o.hop
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    for (let i = lo; i < hi; i++) out += `<path d="M${X(i)} ${y - 16} Q ${rnd((X(i) + X(i + 1)) / 2)} ${y - 50} ${X(i + 1)} ${y - 16}" fill="none" stroke="${b < a ? '#1976d2' : '#ff7043'}" stroke-width="3" stroke-linecap="round"/>`
  }
  if (o.mark !== undefined) out += `<circle cx="${X(o.mark)}" cy="${y}" r="9" fill="#e53935" stroke="#ffffff" stroke-width="2"/>`
  return svg(420, 104, out, `number line from 0 to ${max} cut into ${DW[o.d]?.[1] ?? 'equal parts'}`)
}
/** Area grid: `cols` columns with `cOn` colored, `rows` rows with `rOn` marked. The overlap is green. */
function gridPic(cols: number, rows: number, cOn: number, rOn: number): string {
  const c = Math.min(40, Math.floor(320 / Math.max(cols, rows)))
  let out = ''
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      out += `<rect x="${4 + j * c}" y="${4 + i * c}" width="${c}" height="${c}" fill="${i < rOn && j < cOn ? GREEN : j < cOn ? '#ffe082' : i < rOn ? '#b3e5fc' : OFF}" stroke="${INK}" stroke-width="2"/>`
  return svg(cols * c + 8, rows * c + 8, out, `a grid with ${rows} rows and ${cols} columns`)
}
/** 10 by 10 grid with the first n squares colored, row by row. */
function hundredPic(n: number): string {
  let out = ''
  for (let i = 0; i < 100; i++) out += `<rect x="${4 + (i % 10) * 22}" y="${4 + Math.floor(i / 10) * 22}" width="22" height="22" fill="${i < n ? ORANGE : OFF}" stroke="${INK}" stroke-width="1.5"/>`
  return svg(228, 228, out, `a grid of 100 squares with ${n} colored`)
}

const ROUND = ['pizza', 'cookie', 'pie', 'pancake'] as const
const RECT = ['granola bar', 'sandwich', 'flag', 'dance mat', 'beach towel', 'brownie'] as const

/* ---------------------------------------------------------------- generators --------------------------------------------------------------- */

/** Shared by add-unlike and sub-unlike. */
function unlike(rng: () => number, d: 1 | 2 | 3, op: '+' | '−'): Item {
  const r = R(rng)
  const add = op === '+'
  let a = 1
  let b = 2
  let c = 1
  let e = 4
  for (let guard = 0; guard < 200; guard++) {
    if (d === 1) {
      b = r.pick([2, 3, 4, 5])
      e = b * r.pick(b <= 4 ? [2, 3] : [2])
    } else if (d === 2) [b, e] = r.pick([[2, 3], [2, 5], [3, 4], [3, 5], [2, 7], [4, 5]] as const)
    else [b, e] = r.pick([[4, 6], [6, 8], [6, 9], [4, 10], [8, 12], [6, 10], [9, 12], [3, 8], [5, 6], [4, 9]] as const)
    if (r.chance()) [b, e] = [e, b]
    a = r.int(1, b - 1)
    c = r.int(1, e - 1)
    if (!add && a * e < c * b) [a, b, c, e] = [c, e, a, b]
    if (!add && a * e === c * b) continue
    if (add && d < 3 && a * e + c * b > b * e) continue
    break
  }
  const L = lcm(b, e)
  const m1 = L / b
  const m2 = L / e
  const A1 = a * m1
  const A2 = c * m2
  const N = add ? A1 + A2 : A1 - A2
  const over = N > L
  const T = add ? a * e + c * b : a * e - c * b
  const word = add ? 'plus' : 'minus'
  const story = r.chance(0.45)
  const tail = over ? ` ${hint(N, L)}` : ''
  const prompt = !story
    ? `What is ${a}/${b} ${word} ${c}/${e}?${tail}`
    : add
      ? r.pick([
          ...(over ? [] : [`{n} ate ${a}/${b} of a pizza. A friend ate ${c}/${e} of the same pizza. How much of the pizza did they eat in all?`]),
          `{n} walked ${a}/${b} of a mile to the park. Then {n} walked ${c}/${e} of a mile to the field. How far is that in all?${tail}`,
          `A snack mix has ${a}/${b} of a cup of nuts and ${c}/${e} of a cup of raisins. How many cups is that in all?${tail}`,
        ])
      : r.pick([
          `{n} had ${a}/${b} of a pizza. Then {n} ate ${c}/${e} of a whole pizza. How much pizza is left?`,
          `A rope is ${a}/${b} of a yard long. {n} cuts off ${c}/${e} of a yard. How much rope is left?`,
          `The water jug was ${a}/${b} full. The team drank ${c}/${e} of the jug. How full is the jug now?`,
        ])
  const scale = (n: number, den: number, m: number) => (m > 1 ? `Times ${m} on top and bottom: ${n}/${den} = ${n * m}/${L}` : `${n}/${den} already has ${L} on the bottom.`)
  const s1 = [`Make the bottoms the same. ${b} and ${e} both go into ${L}.`, scale(a, b, m1), scale(c, e, m2), `${A1}/${L} ${op} ${A2}/${L} = ${N}/${L}`]
  if (gcd(N, L) > 1) s1.push(`${N}/${L} is the same as ${frac(N, L) === '1/1' ? '1 whole' : frac(N, L)}. Both are right.`)
  else if (over) s1.push(`${N}/${L} is ${mx(N, L)}.`)
  const strategies = [
    strat('Same Bottom Number', s1, `${N}/${L}`, {
      html: stackPic([{ n: A1, d: L, label: `${a}/${b}` }, { n: A2, d: L, label: `${c}/${e}`, color: BLUE }], `${a}/${b} and ${c}/${e} cut into ${L} parts`),
    }),
    strat(
      'Butterfly',
      [
        `Multiply on a slant, like butterfly wings: ${a} × ${e} = ${a * e} and ${c} × ${b} = ${c * b}`,
        `${add ? 'Add' : 'Subtract'} them for the top: ${a * e} ${op} ${c * b} = ${T}`,
        `Multiply the bottoms: ${b} × ${e} = ${b * e}`,
        b * e === L ? `So the answer is ${T}/${b * e}.` : `That gives ${T}/${b * e}. Make it simpler: ${T}/${b * e} = ${N}/${L}`,
      ],
      `${T}/${b * e}`,
    ),
  ]
  // List equal fractions until the bottoms match (found by searching, not by the LCM formula).
  if (m1 <= 5 && m2 <= 5) {
    let i = 1
    while ((b * i) % e !== 0) i++
    const j = (b * i) / e
    const list = (n: number, den: number, upTo: number) => Array.from({ length: upTo }, (_, k) => `${n * (k + 1)}/${den * (k + 1)}`).join(', ')
    const top = add ? a * i + c * j : a * i - c * j
    strategies.push(
      strat('List Equal Fractions', [`Fractions equal to ${a}/${b}: ${list(a, b, i)}`, `Fractions equal to ${c}/${e}: ${list(c, e, j)}`, `Stop when the bottoms match: ${a * i}/${b * i} and ${c * j}/${e * j}.`, `${a * i}/${b * i} ${op} ${c * j}/${e * j} = ${top}/${b * i}`], `${top}/${b * i}`),
    )
  }
  return {
    prompt,
    eq: `${fracHTML(a, b)} ${op} ${fracHTML(c, e)} = ${Q}`,
    eqOnly: !story && !over,
    input: 'fraction',
    answer: `${N}/${L}`,
    strategies,
    // top with top and bottom with bottom; forgot to change the tops; kept the bigger bottom; did the other operation
    distractors: fwr(N, L, add ? [[a + c, b + e], [a + c, L], [a + c, Math.max(b, e)], [a + c, b * e]] : [[Math.abs(a - c), Math.abs(b - e)], [Math.abs(a - c), L], [A1 + A2, L], [Math.abs(a - c), Math.max(b, e)], [a, L]]),
    operands: [a, b, c, e],
    difficulty: d,
  }
}

export const gens: Record<string, Gen> = {
  /* ---------- Grade 2: equal parts ---------- */
  'fr.equal-parts': (rng, d) => {
    const r = R(rng)
    const round = r.chance()
    const obj = round ? r.pick(ROUND) : r.pick(RECT)
    const type = d === 1 ? r.pick(['count', 'fair'] as const) : d === 2 ? r.pick(['name', 'fair', 'count'] as const) : r.pick(['name', 'parts', 'fair'] as const)
    const k = type === 'count' ? r.int(2, d === 1 ? 4 : 8) : type === 'fair' ? r.int(2, d === 1 ? 4 : 6) : type === 'parts' ? r.pick([2, 3, 4, 6, 8]) : r.int(2, 4)
    const even = Array.from({ length: k }, () => 1)
    const pic = (wts: number[]) => (round ? piesPic(1, k, () => '#ffe0b2', wts) : barPic(k, () => false, wts))
    if (type === 'fair') {
      const equal = r.chance()
      const big = r.int(0, k - 1)
      const wts = equal ? even : even.map((w, i) => (i === big ? (k === 2 ? 2 : 2.4) : w))
      const yes = (b: boolean) => (b ? 'Yes' : 'No')
      return {
        prompt: `This ${obj} is cut into ${k} parts. Are all the parts the same size?`,
        visual: pic(wts),
        ...choice(yes(equal), ['Yes', 'No'], rng, true),
        strategies: [
          strat('Look at Each Part', equal ? [`Look at each part of the ${obj}.`, `Every part is just as big as the others.`, `So yes, these are equal parts.`] : [`Look at each part of the ${obj}.`, `One part is bigger than the others.`, `So no, these are not equal parts.`], yes(wts.every((w) => w === wts[0]))),
          strat('Fair Share Test', [`Pretend ${k} friends each take one part.`, equal ? `Everyone gets the same amount. That is fair.` : `One friend gets more. That is not fair.`, `Fair shares are equal parts. The answer is ${equal ? 'yes' : 'no'}.`], yes(Math.max(...wts) === Math.min(...wts))),
        ],
        operands: [k],
        difficulty: d,
      }
    }
    if (type === 'count') {
      const counted = Array.from({ length: k }, (_, i) => i + 1)
      return {
        prompt: `This ${obj} is cut into equal parts. How many equal parts are there?`,
        visual: pic(even),
        input: 'number',
        answer: k,
        strategies: [
          strat('Count Them', [`Touch each part and count.`, `${counted.join(', ')}`, `There are ${k} equal parts.`], counted.length),
          round
            ? strat('Count the Lines', [`Count the lines that go from the middle to the edge: ${k}.`, `In a circle, each line starts one new slice.`, `So there are ${k} slices.`], k)
            : strat('Count the Lines', [`Count the lines inside the shape: ${k - 1}.`, `There is always 1 more part than lines.`, `${k - 1} + 1 = ${k}`], k - 1 + 1),
        ],
        distractors: wrongs(k, [k - 1, k + 1, 1]),
        operands: [k],
        difficulty: d,
      }
    }
    const NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths', 6: 'sixths', 8: 'eighths' }
    if (type === 'name')
      return {
        prompt: `This ${obj} is cut into ${k} equal parts. What are the parts called?`,
        visual: pic(even),
        ...choice(NAMES[k], ['halves', 'thirds', 'fourths'], rng, true),
        strategies: [
          strat('Count and Name', [`Count the equal parts: ${k}.`, `2 equal parts are halves. 3 are thirds. 4 are fourths.`, `${k} equal parts are called ${NAMES[k]}.`], NAMES[k]),
          strat('Think of Sharing', [`${k} friends can share this ${obj} the fair way.`, `Each friend gets one ${DW[k][0]}.`, `So the parts are ${DW[k][1]}.`], DW[k][1]),
        ],
        operands: [k],
        difficulty: d,
      }
    return {
      prompt: `{n} cuts a ${obj} into ${NAMES[k]}. How many equal parts is that?`,
      input: 'number',
      answer: k,
      strategies: [
        strat('Know the Name', [`The word "${NAMES[k]}" tells how many equal parts.`, `${NAMES[k][0].toUpperCase() + NAMES[k].slice(1)} means ${k} equal parts.`], k, { html: pic(even) }),
        strat('Fair Shares', [`${NAMES[k][0].toUpperCase() + NAMES[k].slice(1)} are fair shares for ${k} friends.`, `Each friend gets 1 part.`, `${k} friends get ${k} parts.`], even.reduce((p, c) => p + c, 0)),
      ],
      distractors: wrongs(k, [k + 1, k - 1, k === 2 ? 4 : 2]),
      operands: [k],
      difficulty: d,
    }
  },

  /* ---------- Grade 3 ---------- */
  'fr.unit': (rng, d) => {
    const r = R(rng)
    const den = d === 1 ? r.int(2, 4) : d === 2 ? r.int(2, 8) : r.pick([3, 5, 6, 8, 10, 12])
    const type = d === 1 ? r.pick(['pic', 'story'] as const) : r.pick(['pic', 'story', 'build'] as const)
    const round = r.chance()
    const obj = round ? r.pick(ROUND) : r.pick(RECT)
    const at = r.int(0, den - 1)
    const pic = round ? piesPic(1, den, (_, i) => (i === at ? ORANGE : OFF)) : barPic(den, (i) => i === at)
    if (type === 'build')
      return {
        prompt: `How many pieces the size of 1/${den} make 1 whole?`,
        eq: `${fq('?', den)} = 1`,
        input: 'number',
        answer: den,
        strategies: [
          strat('Read the Bottom Number', [`The bottom number tells how many equal parts are in 1 whole.`, `The bottom of 1/${den} is ${den}.`, `So ${den} pieces make 1 whole: ${den}/${den} = 1`], den, { html: barPic(den, () => true) }),
          strat('Count Them Up', [`Count ${DW[den][1]} until the whole is full.`, Array.from({ length: den }, (_, i) => `${i + 1}/${den}`).join(', '), `${den}/${den} is the whole. That took ${den} pieces.`], Array.from({ length: den }, () => 1).length, { html: nlinePic({ d: den, all: true, hop: [0, den] }) }),
        ],
        distractors: wrongs(den, [1, den + 1, den - 1]),
        operands: [den],
        difficulty: d,
      }
    const who = r.pick(['{n}', 'Coach', 'A friend'])
    const prompt =
      type === 'pic'
        ? `This ${obj} is cut into ${den} equal parts. 1 part is orange. What fraction is orange?`
        : r.pick([
            `${who} cuts a ${obj} into ${den} equal parts and eats 1 part. What fraction of the ${obj} is that?`,
            `${den} friends share one ${obj} the fair way. What fraction of the ${obj} does each friend get?`,
          ])
    return {
      prompt,
      visual: type === 'pic' ? pic : undefined,
      input: 'fraction',
      answer: `1/${den}`,
      strategies: [
        strat('Top and Bottom', [`The bottom number is how many equal parts in all: ${den}.`, `The top number is how many parts we are talking about: 1.`, `So the fraction is 1/${den}. We say "one ${DW[den][0]}".`], `1/${den}`, type === 'pic' ? {} : { html: pic }),
        strat('Build the Whole', [`It takes ${den} of these parts to fill the whole ${obj}.`, `So each part is one ${DW[den][0]} of the whole.`, `Check: ${den} × 1/${den} = 1`], `${den - (den - 1)}/${den}`),
      ],
      // flipped; counted only the other parts; named the other parts
      distractors: fwr(1, den, [[den, 1], ...(den > 2 ? [[1, den - 1] as [number, number], [den - 1, den] as [number, number]] : []), [1, den + 1]]),
      operands: [den],
      difficulty: d,
    }
  },

  'fr.name': (rng, d) => {
    const r = R(rng)
    const den = d === 1 ? r.int(3, 6) : d === 2 ? r.int(3, 8) : r.pick([5, 6, 8, 10, 12])
    const n = r.int(2, den - 1)
    const type = d === 1 ? r.pick(['pic', 'pic', 'set'] as const) : d === 2 ? r.pick(['pic', 'set', 'not'] as const) : r.pick(['pic', 'set', 'not', 'not'] as const)
    const round = den <= 8 && r.chance()
    const obj = round ? r.pick(ROUND) : r.pick(RECT)
    const thing = r.pick(['bricks', 'balls', 'caps', 'surfboards', 'bats'])
    const pic = type === 'set' ? dotsPic(n, den) : round ? shadedPies(n, den) : barPic(den, (i) => i < n)
    const top = type === 'not' ? den - n : n
    const prompt =
      type === 'pic'
        ? `This ${obj} is cut into ${den} equal parts. ${n} parts are orange. What fraction is orange?`
        : type === 'set'
          ? `There are ${den} ${thing}. ${n} of them are orange. What fraction of the ${thing} are orange?`
          : `This ${obj} has ${den} equal parts. ${n} parts are orange. What fraction is NOT orange?`
    let built = 0
    for (let i = 0; i < top; i++) built += 1
    return {
      prompt,
      visual: pic,
      input: 'fraction',
      answer: `${top}/${den}`,
      strategies: [
        strat(
          'Top and Bottom',
          type === 'not'
            ? [`The bottom number is all the equal parts: ${den}.`, `Count the parts that are not orange: ${den} − ${n} = ${den - n}`, `That is the top number. The fraction is ${den - n}/${den}.`]
            : [`The bottom number is how many ${type === 'set' ? thing : 'equal parts'} in all: ${den}.`, `The top number is how many are orange: ${n}.`, `So the fraction is ${n}/${den}.`],
          `${type === 'not' ? den - n : n}/${den}`,
        ),
        strat('Count Unit Pieces', [`Each ${type === 'set' ? 'one' : 'part'} is 1/${den} of the whole.`, `Count the ones we want: ${top}.`, `${top} × 1/${den} = ${top}/${den}`], `${built}/${den}`, top <= 8 ? { html: nlinePic({ d: den, all: true, hop: [0, top], mark: top }) } : {}),
      ],
      // flipped; orange over not-orange; counted the other parts
      distractors: fwr(top, den, [[den, top], [top, den - top], [den - top, den], [top, den + top]]),
      operands: [n, den],
      difficulty: d,
    }
  },

  'fr.number-line': (rng, d) => {
    const r = R(rng)
    const max = d === 3 && r.chance(0.65) ? 2 : 1
    const den = d === 1 ? r.pick([2, 3, 4]) : d === 2 ? r.pick([3, 4, 5, 6, 8]) : max === 2 ? r.pick([2, 3, 4, 5, 6]) : r.pick([6, 8, 10, 12])
    const n = max === 1 ? r.int(1, den - 1) : r.int(den + 1, 2 * den - 1)
    const jumps = d >= 2 && n >= 2 && r.chance(0.3)
    const seq = Array.from({ length: n }, (_, i) => `${i + 1}/${den}`)
    if (jumps)
      return {
        prompt: `Each jump on this line is 1/${den}. How many jumps is it from 0 to ${n}/${den}?`,
        visual: nlinePic({ d: den, max }),
        input: 'number',
        answer: n,
        strategies: [
          strat('Read the Top Number', [`The bottom number says each jump is 1/${den}.`, `The top number says how many jumps.`, `${n}/${den} is ${n} jump${s(n)} from 0.`], n, { html: nlinePic({ d: den, max, mark: n, hop: [0, n], all: true }) }),
          strat('Skip Count', [`Count the jumps one at a time.`, n <= 9 ? seq.join(', ') : `${seq.slice(0, 4).join(', ')} and so on up to ${n}/${den}`, `That was ${n} jump${s(n)}.`], seq.length),
        ],
        distractors: wrongs(n, [den, n + 1, n - 1, Math.abs(den - n)].filter((v) => v > 0)),
        operands: [n, den, max],
        difficulty: d,
      }
    const who = r.pick(['A frog', 'A ball', 'A bug', 'A runner'])
    return {
      prompt: `${who} sits on the red dot. ${max === 1 ? `The line from 0 to 1 is cut into ${den} equal jumps.` : `Each whole is cut into ${den} equal jumps.`} What fraction is the dot at?${max === 2 ? ` ${hint(n, den)}` : ''}`,
      visual: nlinePic({ d: den, max, mark: n }),
      input: 'fraction',
      answer: `${n}/${den}`,
      strategies: [
        strat('Count the Jumps', [`Each whole is cut into ${den} equal jumps, so each jump is 1/${den}.`, `Count the jumps from 0 to the dot: ${n}.`, `${n} × 1/${den} = ${n}/${den}`], `${seq.length}/${den}`, { html: nlinePic({ d: den, max, mark: n, hop: [0, n], all: true }) }),
        n < den
          ? strat('Count Back from 1', [`1 whole is ${den}/${den}.`, `The dot is ${den - n} jump${s(den - n)} before 1.`, `${den}/${den} − ${den - n}/${den} = ${n}/${den}`], `${den - (den - n)}/${den}`, { html: nlinePic({ d: den, max, mark: n, hop: [den, n] }) })
          : strat('Start at 1', [`1 whole is ${den}/${den}.`, `The dot is ${n - den} jump${s(n - den)} past 1.`, `${den}/${den} + ${n - den}/${den} = ${n}/${den}`], `${den + (n - den)}/${den}`, { html: nlinePic({ d: den, max, mark: n, hop: [den, n] }) }),
      ],
      // counted the marks, not the jumps; flipped; forgot the first whole; used all the jumps on the line as the bottom
      distractors: fwr(n, den, max === 1 ? [[n, den + 1], [n + 1, den + 1], [den, n], [n, den - n]] : [[n - den, den], [n, 2 * den], [n + 1, den + 1], [den, n]]),
      operands: [n, den, max],
      difficulty: d,
    }
  },

  'fr.compare-same': (rng, d) => {
    const r = R(rng)
    const sameDen = d === 1 ? true : d === 2 ? false : r.chance()
    const hi = d === 3 ? 12 : 8
    let a: number, b: number, c: number, e: number
    if (sameDen) {
      b = e = r.int(d === 1 ? 3 : 5, hi)
      a = r.int(1, b - 1)
      c = r.int(1, b - 1)
      const same = r.chance(0.1)
      while (!same && c === a) c = r.int(1, b - 1)
      if (same) c = a
    } else {
      a = c = r.int(1, d === 2 ? 3 : 5)
      b = r.int(a + 1, hi)
      e = r.int(a + 1, hi)
      const same = r.chance(0.1)
      while (!same && e === b) e = r.int(a + 1, hi)
      if (same) e = b
    }
    const ans = sign(a * e, c * b)
    const [A, C] = [`${a}/${b}`, `${c}/${e}`]
    const bigger = ans === '>' ? A : C
    const last = `${A} ${ans} ${C}`
    return {
      prompt: `Which sign goes between ${A} and ${C}? Is ${A} bigger, smaller, or the same?`,
      eq: `${fracHTML(a, b)} ${Q} ${fracHTML(c, e)}`,
      ...choice(ans, ['<', '=', '>'], rng, true),
      strategies: [
        sameDen
          ? strat('Same Size Pieces', [`Both bottom numbers are ${b}, so all the pieces are the same size.`, `Just compare how many pieces: ${a} and ${c}.`, a === c ? `They are the same amount. Use =.` : `${Math.max(a, c)} pieces is more than ${Math.min(a, c)} pieces, so ${bigger} is bigger.`, last], sign(a, c))
          : strat(
              'Think About Piece Size',
              b === e
                ? [`Both top numbers are ${a} and both bottom numbers are ${b}.`, `These are the very same fraction. Use =.`, last]
                : [`Both top numbers are ${a}, so each has ${a} piece${s(a)}.`, `A bigger bottom number means more cuts, so each piece is smaller.`, `${DW[Math.max(b, e)][1][0].toUpperCase() + DW[Math.max(b, e)][1].slice(1)} are smaller than ${DW[Math.min(b, e)][1]}, so ${bigger} is bigger.`, last],
              sign(e, b),
            ),
        strat('Draw Two Bars', [b === e ? `Draw two bars the same size. Cut each one into ${b} equal parts.` : `Draw two bars the same size. Cut one into ${b} equal parts and the other into ${e}.`, `Color ${a} part${s(a)} of the first bar and ${c} of the second.`, ans === '=' ? `The same amount is colored. Use =.` : `The bar for ${bigger} has more color.`, last], sign(a * e, c * b), {
          html: stackPic([{ n: a, d: b, label: A }, { n: c, d: e, label: C, color: BLUE }], `bars for ${A} and ${C}`),
        }),
      ],
      operands: [a, b, c, e],
      difficulty: d,
    }
  },

  'fr.equivalent': (rng, d) => {
    const r = R(rng)
    const b0 = d === 1 ? r.int(2, 4) : r.int(2, 6)
    let a0 = r.int(1, b0 - 1)
    while (gcd(a0, b0) > 1) a0 = r.int(1, b0 - 1)
    const k = d === 1 ? r.int(2, 3) : d === 2 ? r.int(2, 5) : r.int(2, 6)
    const [A, B] = [a0 * k, b0 * k]
    const type = d === 1 ? 'upTop' : d === 2 ? r.pick(['upTop', 'upBot'] as const) : r.pick(['upTop', 'upBot', 'downTop', 'downBot'] as const)
    const up = type === 'upTop' || type === 'upBot'
    const top = type === 'upTop' || type === 'downTop'
    // left fraction p/q is known; right fraction x/y has one missing number
    const [p, q, x, y] = up ? [a0, b0, A, B] : [A, B, a0, b0]
    const ans = top ? x : y
    const fill = up ? 'Multiply' : 'Divide'
    const o = up ? '×' : '÷'
    const kFound = top ? (up ? y / q : q / y) : up ? x / p : p / x
    let counted = 0
    if (up) for (let i = 0; i < (top ? p : q); i++) counted += kFound
    // grouping the small parts k at a time (down direction): count the groups
    let groups = 0
    if (!up) for (let i = top ? p : q; i > 0; i -= kFound) groups++
    const strategies = [
      strat(
        `${fill} Top and Bottom`,
        top
          ? [`Look at the bottoms. ${q} ${o} what number gives ${y}?`, `${q} ${o} ${kFound} = ${y}`, `Do the same thing to the top: ${p} ${o} ${kFound} = ${x}`, `${p}/${q} = ${x}/${y}`]
          : [`Look at the tops. ${p} ${o} what number gives ${x}?`, `${p} ${o} ${kFound} = ${x}`, `Do the same thing to the bottom: ${q} ${o} ${kFound} = ${y}`, `${p}/${q} = ${x}/${y}`],
        top ? (up ? p * kFound : p / kFound) : up ? q * kFound : q / kFound,
      ),
      strat(
        'Fraction Bars',
        up
          ? [`Draw a bar with ${q} equal parts. Color ${p}.`, `Cut every part into ${k} smaller parts.`, `Now the bar has ${y} small parts and ${x} are colored.`, `The same amount is colored, so ${p}/${q} = ${x}/${y}`]
          : [`Draw a bar with ${q} small parts. Color ${p}.`, `Put the small parts in groups of ${k}.`, `That makes ${y} big parts, and ${x} of them ${x === 1 ? 'is' : 'are'} colored.`, `The same amount is colored, so ${p}/${q} = ${x}/${y}`],
        up ? counted : groups,
        { html: stackPic([{ n: p, d: q, label: `${p}/${q}` }, { n: x, d: y, label: top ? `?/${y}` : `${x}/?`, color: BLUE }], `two bars with the same amount colored`) },
      ),
    ]
    if (d >= 2)
      strategies.push(
        strat(
          'Cross Check',
          top
            ? [`Equal fractions match when you multiply on a slant.`, `${p} × ${y} = ${p * y}`, `So ${q} times the missing top must be ${p * y} too.`, `${p * y} ÷ ${q} = ${x}`]
            : [`Equal fractions match when you multiply on a slant.`, `${q} × ${x} = ${q * x}`, `So ${p} times the missing bottom must be ${q * x} too.`, `${q * x} ÷ ${p} = ${y}`],
          top ? (p * y) / q : (q * x) / p,
        ),
      )
    const known = top ? p : q
    const far = top ? y - q : x - p
    return {
      prompt: top ? `${p} over ${q} equals what number over ${y}? Find the missing top number.` : `${p} over ${q} equals ${x} over what number? Find the missing bottom number.`,
      eq: `${fracHTML(p, q)} = ${top ? fq('?', y) : fq(x, '?')}`,
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies,
      // added the same amount instead of multiplying; left it the same; wrote the multiplier; copied the other number
      distractors: wrongs(ans, [known + far, known, k, top ? y : x]),
      operands: [p, q, top ? y : x, k],
      difficulty: d,
    }
  },

  'fr.whole-numbers': (rng, d) => {
    const r = R(rng)
    const type = d === 1 ? r.pick(['toWhole', 'toFrac'] as const) : d === 2 ? r.pick(['toWhole', 'toFrac'] as const) : r.pick(['toWhole', 'toFrac', 'over1'] as const)
    const den = d === 1 ? r.int(2, 4) : d === 2 ? r.int(2, 8) : r.pick([2, 3, 4, 5, 6, 8, 10])
    const k = d === 1 ? r.int(1, 3) : d === 2 ? r.int(1, 5) : r.int(2, 9)
    const kd = k * den
    if (type === 'over1')
      return {
        prompt: `Write ${k} as a fraction with 1 on the bottom. What is the top number?`,
        eq: `${k} = ${fq('?', 1)}`,
        input: 'number',
        answer: k,
        strategies: [
          strat('Divide by 1', [`A fraction bar means divide.`, `Any number divided by 1 stays the same: ${k} ÷ 1 = ${k}`, `So ${k}/1 = ${k}`], k / 1),
          strat('Wholes That Are Not Cut', [`A bottom number of 1 means each whole is just 1 part. It is not cut.`, `${k} wholes make ${k} parts.`, `So the top number is ${k}.`], Array.from({ length: k }, () => 1).length, { html: shadedPies(k, 1, k) }),
        ],
        distractors: wrongs(k, [1, k + 1, 10 * k]),
        operands: [k, 1],
        difficulty: d,
      }
    if (type === 'toWhole') {
      const list: number[] = []
      for (let v = den; v <= kd; v += den) list.push(v)
      return {
        prompt: `How many wholes is ${kd}/${den}?`,
        eq: `${fracHTML(kd, den)} = ${Q}`,
        input: 'number',
        answer: k,
        strategies: [
          strat('Make Wholes', [`${den}/${den} makes 1 whole.`, k === 1 ? `${kd}/${den} is all ${den} parts of one whole.` : `Count by ${den}s up to ${kd}: ${list.join(', ')}.`, `That is ${k} whole${s(k)}.`], list.length, { html: shadedPies(kd, den) }),
          strat('Divide', [`A fraction bar means divide the top by the bottom.`, `${kd} ÷ ${den} = ${k}`, `So ${kd}/${den} = ${k}`], kd / den),
        ],
        // wrote the bottom; wrote the top; subtracted
        distractors: wrongs(k, [den, kd, kd - den, k + 1]),
        operands: [k, den],
        difficulty: d,
      }
    }
    let total = 0
    for (let i = 0; i < k; i++) total += den
    return {
      prompt: `${k} whole${s(k)} ${k === 1 ? 'is' : 'are'} how many ${DW[den][1]}?`,
      eq: `${k} = ${fq('?', den)}`,
      input: 'number',
      answer: kd,
      strategies: [
        strat(
          'Each Whole Has the Same Parts',
          k === 1 ? [`1 whole cut into ${DW[den][1]} has ${den} parts.`, `So 1 = ${den}/${den}`] : [`1 whole is ${den}/${den}.`, k <= 5 ? `${k} wholes: ${Array.from({ length: k }, () => den).join(' + ')} = ${kd}` : `${k} wholes: count by ${den}s, ${k} times. You land on ${kd}.`, `So ${k} = ${kd}/${den}`],
          total,
          { html: shadedPies(kd, den) },
        ),
        strat('Multiply', [`Multiply the wholes by the bottom number.`, `${k} × ${den} = ${kd}`, `Check by dividing: ${kd} ÷ ${den} = ${k}`], k * den),
      ],
      // wrote the whole number; wrote the bottom; added
      distractors: wrongs(kd, [k, den, k + den, kd + den].filter((v) => v !== kd)),
      operands: [k, den],
      difficulty: d,
    }
  },

  /* ---------- Grade 4 ---------- */
  'fr.simplify': (rng, d) => {
    const r = R(rng)
    const q = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 6) : r.int(3, 9)
    let p = r.int(1, q - 1)
    while (gcd(p, q) > 1) p = r.int(1, q - 1)
    const g = d === 1 ? r.pick([2, 3]) : d === 2 ? r.pick([2, 3, 4, 5, 6]) : r.pick([4, 6, 8, 9, 10, 12])
    const [n, dd] = [p * g, q * g]
    const G = gcd(n, dd)
    const steps: string[] = []
    let [cn, cd] = [n, dd]
    for (const pr of [2, 3, 5, 7])
      while (cn % pr === 0 && cd % pr === 0) {
        steps.push(`Both ${cn} and ${cd} can be divided by ${pr}: ${cn} ÷ ${pr} = ${cn / pr} and ${cd} ÷ ${pr} = ${cd / pr}`)
        cn /= pr
        cd /= pr
      }
    steps.push(`Only 1 goes into both ${cn} and ${cd} now. So ${n}/${dd} = ${cn}/${cd}`)
    return {
      prompt: `Write ${n}/${dd} in simplest form. Use the smallest numbers you can.`,
      eq: `${fracHTML(n, dd)} = ${Q}`,
      input: 'fraction',
      exact: true,
      answer: `${p}/${q}`,
      strategies: [
        strat('Biggest Common Factor', [`Find the biggest number that goes into both ${n} and ${dd}. It is ${G}.`, `Divide the top: ${n} ÷ ${G} = ${n / G}`, `Divide the bottom: ${dd} ÷ ${G} = ${dd / G}`, `${n}/${dd} = ${n / G}/${dd / G}`], `${n / G}/${dd / G}`, dd <= 24 ? { html: stackPic([{ n, d: dd, label: `${n}/${dd}` }, { n: p, d: q, label: `${p}/${q}`, color: BLUE }], `the same amount with bigger parts`) } : {}),
        strat('Small Steps', steps, `${cn}/${cd}`),
      ],
      // divided only the top; divided only the bottom; subtracted the same number from both; flipped
      distractors: fwr(p, q, [[p, dd], [n, q], [n - g, dd - g], [q, p]]),
      operands: [n, dd, g],
      difficulty: d,
    }
  },

  'fr.compare-any': (rng, d) => {
    const r = R(rng)
    let a = 1
    let b = 2
    let c = 1
    let e = 3
    for (let guard = 0; guard < 300; guard++) {
      if (d === 1) {
        if (r.chance()) {
          b = r.int(2, 4)
          e = b * r.int(2, 3)
          a = r.int(1, b - 1)
          c = r.int(1, e - 1)
        } else {
          // one on each side of one half
          b = r.int(3, 8)
          e = r.int(3, 8)
          a = r.int(1, Math.floor((b - 1) / 2))
          c = r.int(Math.floor(e / 2) + 1, e - 1)
        }
        if (r.chance()) [a, b, c, e] = [c, e, a, b]
      } else if (d === 2) {
        b = r.int(2, 8)
        e = r.int(2, 8)
        a = r.int(1, b - 1)
        c = r.int(1, e - 1)
      } else {
        b = r.int(3, 12)
        e = r.int(3, 12)
        a = r.int(1, b - 1)
        if (r.chance(0.12) && (a * e) % b === 0) c = (a * e) / b
        else c = Math.round((a * e) / b) + r.pick([-1, 0, 0, 1])
      }
      if (b === e || c < 1 || c >= e || a < 1 || a >= b) continue
      if (d < 3 && a === c) continue
      if (d === 1 && a * e === c * b) continue
      break
    }
    const ans = sign(a * e, c * b)
    const [A, C] = [`${a}/${b}`, `${c}/${e}`]
    const L = lcm(b, e)
    const [x, y] = [(a * L) / b, (c * L) / e]
    const same = (n: number, den: number, t: number) => (den === L ? `${n}/${den} already has ${L} on the bottom.` : `${n}/${den} = ${t}/${L}`)
    const strategies = [
      strat('Same Bottom Number', [`Make the bottoms the same. ${b} and ${e} both go into ${L}.`, same(a, b, x), same(c, e, y), `Compare the tops: ${x} ${sign(x, y)} ${y}. So ${A} ${sign(x, y)} ${C}`], sign(x, y), L <= 24 ? { html: stackPic([{ n: a, d: b, label: A }, { n: c, d: e, label: C, color: BLUE }], `bars for ${A} and ${C}`) } : {}),
      strat('Cross Multiply', [`First top times second bottom: ${a} × ${e} = ${a * e}`, `Second top times first bottom: ${c} × ${b} = ${c * b}`, `${a * e} ${sign(a * e, c * b)} ${c * b}, so ${A} ${sign(a * e, c * b)} ${C}`], sign(a * e, c * b)),
    ]
    const lessHalf = (n: number, den: number) => 2 * n < den
    const moreHalf = (n: number, den: number) => 2 * n > den
    if ((lessHalf(a, b) && moreHalf(c, e)) || (moreHalf(a, b) && lessHalf(c, e))) {
      const say = (n: number, den: number) => `${n}/${den} is ${lessHalf(n, den) ? 'less' : 'more'} than 1/2, because ${n} × 2 = ${2 * n} and that is ${lessHalf(n, den) ? 'less' : 'more'} than ${den}.`
      strategies.push(strat('Use One Half', [say(a, b), say(c, e), `So ${A} ${lessHalf(a, b) ? '<' : '>'} ${C}`], lessHalf(a, b) ? '<' : '>'))
    }
    return {
      prompt: `Which sign goes between ${A} and ${C}? Is ${A} bigger, smaller, or the same?`,
      eq: `${fracHTML(a, b)} ${Q} ${fracHTML(c, e)}`,
      ...choice(ans, ['<', '=', '>'], rng, true),
      strategies,
      operands: [a, b, c, e],
      difficulty: d,
    }
  },

  'fr.add-like': (rng, d) => {
    const r = R(rng)
    const den = d === 1 ? r.int(3, 6) : d === 2 ? r.int(4, 10) : r.pick([4, 5, 6, 8, 10, 12])
    let a: number, b: number
    if (d === 3) {
      a = r.int(2, den - 1)
      b = r.int(den - a + 1, den - 1)
    } else {
      a = r.int(1, den - (d === 1 ? 2 : 1))
      b = r.int(1, den - a - (d === 1 && a < den - 1 ? 1 : 0) || 1)
    }
    const sum = a + b
    const over = sum > den
    const story = r.chance(0.5)
    const tail = over ? ` ${hint(sum, den)}` : ''
    const prompt = !story
      ? over
        ? `Add ${a}/${den} and ${b}/${den}. The answer is more than 1 whole.${tail}`
        : `What is ${parts(a, den)} plus ${parts(b, den)}?`
      : over
        ? r.pick([
            `{n} ran ${a}/${den} of a mile. Then {n} ran ${b}/${den} of a mile more. How far did {n} run in all?${tail}`,
            `{n} drank ${a}/${den} of a cup of water, then ${b}/${den} of a cup more. How many cups is that?${tail}`,
            `Dance class was ${a}/${den} of an hour. Warm up was ${b}/${den} of an hour. How many hours in all?${tail}`,
          ])
        : r.pick([
            `{n} ate ${a}/${den} of a pizza. Then {n} ate ${b}/${den} more. How much of the pizza did {n} eat in all?`,
            `${a}/${den} of a wall is red bricks. ${b}/${den} of the wall is blue bricks. What fraction of the wall is red or blue?`,
            `The team filled ${a}/${den} of the water jug. Then they filled ${b}/${den} more. How full is the jug now?`,
            `{n} ran ${a}/${den} of a mile. Then {n} ran ${b}/${den} of a mile more. How far did {n} run in all?`,
          ])
    let land = a
    for (let i = 0; i < b; i++) land++
    const s1 = [`Both fractions are ${DW[den][1]}. The pieces are the same size.`, `Add the tops: ${a} + ${b} = ${sum}`, `The bottom stays ${den}: ${a}/${den} + ${b}/${den} = ${sum}/${den}`]
    if (over) s1.push(`${sum}/${den} is ${mx(sum, den)}.`)
    else if (sum === den) s1.push(`${sum}/${den} is 1 whole.`)
    return {
      prompt,
      eq: `${fracHTML(a, den)} + ${fracHTML(b, den)} = ${Q}`,
      eqOnly: !story && !over,
      input: 'fraction',
      answer: `${sum}/${den}`,
      strategies: [
        strat('Count the Pieces', s1, `${a + b}/${den}`, { html: over ? stackPic([{ n: a, d: den, label: `${a}/${den}` }, { n: b, d: den, label: `${b}/${den}`, color: BLUE }], `two bars`) : stackPic([{ n: a, n2: b, d: den }], `${a} orange parts and ${b} blue parts of ${den}`) }),
        strat('Hop on a Number Line', [`The line is cut into ${DW[den][1]}. Start at ${a}/${den}.`, `Hop ${b} more ${DW[den][b === 1 ? 0 : 1]}.`, `You land on ${sum}/${den}.`], `${land}/${den}`, { html: nlinePic({ d: den, max: over ? 2 : 1, hop: [a, sum], mark: sum, all: true }) }),
      ],
      // added the bottoms too; multiplied the tops; multiplied the bottoms
      distractors: fwr(sum, den, [[sum, den + den], [a * b, den], [sum, den * den], [sum + 1, den]]),
      operands: [a, b, den],
      difficulty: d,
    }
  },

  'fr.sub-like': (rng, d) => {
    const r = R(rng)
    const den = d === 1 ? r.int(3, 6) : d === 2 ? r.int(4, 10) : r.pick([4, 5, 6, 8, 10, 12])
    const whole = d === 3 && r.chance(0.5)
    const a = whole ? den : d === 3 ? r.int(den + 1, 2 * den - 1) : r.int(2, den - 1)
    const b = r.int(1, Math.min(a, den) - 1)
    const diff = a - b
    const over = diff > den
    const story = whole || (a <= den && r.chance(0.5))
    const tail = over ? ` ${hint(diff, den)}` : ''
    const prompt = whole
      ? r.pick([
          `{n} has 1 whole pizza and eats ${b}/${den} of it. What fraction of the pizza is left?`,
          `The water jug is full. The team drinks ${b}/${den} of it. What fraction of the jug is left?`,
          `A whole wall needs paint. {n} paints ${b}/${den} of it. What fraction still needs paint?`,
          `What is 1 minus ${b}/${den}?`,
        ])
      : !story
        ? a > den
          ? `Take ${b}/${den} away from ${a}/${den}. What is left?${tail}`
          : `What is ${parts(a, den)} minus ${parts(b, den)}?`
        : r.pick([
              `${a}/${den} of a pizza is left. {n} eats ${b}/${den} of the pizza. How much of the pizza is left now?`,
              `The water jug was ${a}/${den} full. The team drank ${b}/${den} of the jug. How full is it now?`,
              `{n} has ${a}/${den} of a pan of brownies and gives away ${b}/${den} of the pan. How much is left?`,
          ])
    let up = 0
    for (let v = b; v < a; v++) up++
    return {
      prompt,
      eq: `${whole ? '1' : fracHTML(a, den)} − ${fracHTML(b, den)} = ${Q}`,
      eqOnly: !story && a <= den,
      input: 'fraction',
      answer: `${diff}/${den}`,
      strategies: [
        strat(
          'Take Away Pieces',
          [whole ? `1 whole is ${den}/${den}.` : `Both fractions are ${DW[den][1]}. The pieces are the same size.`, `Subtract the tops: ${a} − ${b} = ${diff}`, `The bottom stays ${den}: ${a}/${den} − ${b}/${den} = ${diff}/${den}`, ...(over ? [`${diff}/${den} is ${mx(diff, den)}.`] : [])],
          `${a - b}/${den}`,
          a <= den ? { html: stackPic([{ n: diff, n2: b, d: den }], `${a} parts, the ${b} blue ones are taken away`) } : { html: nlinePic({ d: den, max: 2, hop: [a, diff], mark: diff, all: true }) },
        ),
        strat('Count Up', [`Start at ${b}/${den}. Count up to ${whole ? `1 whole, which is ${a}/${den}` : `${a}/${den}`}.`, `${b} + ${up} = ${a}`, `You counted ${up} piece${s(up)}. The answer is ${up}/${den}.`], `${up}/${den}`, a <= den ? { html: nlinePic({ d: den, hop: [b, a], all: true }) } : {}),
      ],
      // added; wrote what was taken; whole number minus the top; off by one piece
      distractors: fwr(diff, den, whole ? [[b, den], [1, den], [diff + 1, den], [den - b, den + den]] : [[a + b, den], [b, den], [diff, den + den], [diff + 1, den]]),
      operands: [a, b, den],
      difficulty: d,
    }
  },

  'fr.mixed': (rng, d) => {
    const r = R(rng)
    const den = d === 1 ? r.int(2, 4) : d === 2 ? r.int(2, 6) : r.pick([3, 4, 5, 6, 8, 10])
    const w = d === 1 ? r.int(1, 2) : d === 2 ? r.int(1, 4) : r.int(2, 6)
    const nn = r.int(1, den - 1)
    const N = w * den + nn
    const type = d === 1 ? r.pick(['toImp', 'wholes'] as const) : r.pick(['toImp', 'toImp', 'wholes', 'left'] as const)
    const pic = { html: shadedPies(N, den) }
    if (type === 'toImp') {
      let top = 0
      for (let i = 0; i < w; i++) top += den
      top += nn
      return {
        prompt: `Write ${w} and ${nn}/${den} as one fraction. ${hint(N, den)}`,
        eq: `${mxHTML(w, nn, den)} = ${Q}`,
        input: 'fraction',
        answer: `${N}/${den}`,
        strategies: [
          strat('Cut the Wholes', [`Each whole is ${den}/${den}.`, `${w} whole${s(w)}: ${w} × ${den} = ${w * den} ${DW[den][1]}`, `Add the ${nn} extra: ${w * den} + ${nn} = ${N}`, `So it is ${N}/${den}.`], `${w * den + nn}/${den}`, pic),
          strat('Add It Piece by Piece', [`Write each whole as ${den}/${den}, then add the extra part.`, w <= 4 ? `${Array.from({ length: w }, () => `${den}/${den}`).join(' + ')} + ${nn}/${den} = ${N}/${den}` : `${w * den}/${den} + ${nn}/${den} = ${N}/${den}`], `${top}/${den}`),
        ],
        // added whole and top; pushed the digits together; forgot the extra part; multiplied whole and top
        distractors: fwr(N, den, [[w + nn, den], [Number(`${w}${nn}`), den], [w * den, den], [w * nn, den]]),
        operands: [w, nn, den],
        difficulty: d,
      }
    }
    const subs: string[] = []
    let left = N
    let took = 0
    while (left >= den) {
      if (took < 3) subs.push(`${left} − ${den} = ${left - den}`)
      left -= den
      took++
    }
    const takeSteps = [`Each whole uses ${den} ${DW[den][1]}. Take out ${den} at a time.`, took <= 3 ? subs.join(' and ') : `${subs.join(' and ')} and keep going.`, `You took out ${took} whole${s(took)}. ${left}/${den} is left.`]
    if (type === 'wholes')
      return {
        prompt: `How many wholes can you make from ${N}/${den}?`,
        eq: fracHTML(N, den),
        input: 'number',
        answer: w,
        strategies: [
          strat('Groups of the Bottom Number', [`It takes ${den} ${DW[den][1]} to make 1 whole.`, `How many ${den}s fit in ${N}? ${w} × ${den} = ${w * den}`, `${N} − ${w * den} = ${nn} left over.`, `So ${N}/${den} is ${w} whole${s(w)} and ${nn}/${den}.`], Math.floor(N / den), pic),
          strat('Take Out Wholes', takeSteps, took),
        ],
        // wrote the top; wrote the leftover; rounded up; wrote the bottom
        distractors: wrongs(w, [N, nn, w + 1, den]),
        operands: [w, nn, den],
        difficulty: d,
      }
    return {
      prompt: `${N}/${den} is ${w} whole${s(w)} and how many ${DW[den][1]} left over?`,
      eq: `${fracHTML(N, den)} = ${w} and ${fq('?', den)}`,
      input: 'number',
      answer: nn,
      strategies: [
        strat('Use the Wholes', [`Each whole is ${den} ${DW[den][1]}.`, `${w} whole${s(w)}: ${w} × ${den} = ${w * den}`, `Left over: ${N} − ${w * den} = ${nn}`, `So ${N}/${den} is ${w} and ${nn}/${den}.`], N - w * den, pic),
        strat('Take Out Wholes', takeSteps, left),
      ],
      distractors: wrongs(nn, [w, N - w, den - nn, N]),
      operands: [w, nn, den],
      difficulty: d,
    }
  },

  'fr.add-mixed': (rng, d) => {
    const r = R(rng)
    const den = d === 1 ? r.int(3, 6) : d === 2 ? r.int(3, 8) : r.int(4, 10)
    const mode = d === 1 ? 'add' : d === 2 ? r.pick(['addR', 'sub'] as const) : r.pick(['subR', 'subR', 'addR'] as const)
    let w1: number, w2: number, n1: number, n2: number
    if (mode === 'add') {
      n1 = r.int(1, den - 2)
      n2 = r.int(1, den - 1 - n1)
      w1 = r.int(1, 3)
      w2 = r.int(1, 3)
    } else if (mode === 'addR') {
      n1 = r.int(2, den - 1)
      n2 = r.int(den - n1 + 1, den - 1)
      w1 = r.int(1, d === 3 ? 5 : 3)
      w2 = r.int(1, d === 3 ? 5 : 3)
    } else if (mode === 'sub') {
      n1 = r.int(2, den - 1)
      n2 = r.int(1, n1 - 1)
      w2 = r.int(1, 3)
      w1 = w2 + r.int(0, 3)
    } else {
      n2 = r.int(2, den - 1)
      n1 = r.int(1, n2 - 1)
      w2 = r.int(1, 4)
      w1 = w2 + r.int(1, 4)
    }
    const add = mode === 'add' || mode === 'addR'
    const op = add ? '+' : '−'
    const [N1, N2] = [w1 * den + n1, w2 * den + n2]
    const N = add ? N1 + N2 : N1 - N2
    const [m1, m2] = [`${w1} and ${n1}/${den}`, `${w2} and ${n2}/${den}`]
    const h = N > den ? ` ${hint(N, den)}` : ''
    const story = r.chance(0.4)
    const prompt = !story
      ? `What is ${m1} ${add ? 'plus' : 'minus'} ${m2}?${h}`
      : add
        ? r.pick([`{n} ran ${m1} miles on Saturday and ${m2} miles on Sunday. How many miles in all?${h}`, `A snack mix needs ${m1} cups of oats and ${m2} cups of nuts. How many cups in all?${h}`, `One board is ${m1} feet long. Another is ${m2} feet long. How long are they end to end?${h}`])
        : r.pick([`There were ${m1} pizzas. The team ate ${m2} pizzas. How much pizza is left?${h}`, `A rope is ${m1} feet long. {n} cuts off ${m2} feet. How long is the rope now?${h}`, `{n} had ${m1} cups of juice and drank ${m2} cups. How many cups are left?${h}`])
    // Strategy 1: wholes and parts
    const s1: string[] = []
    let W: number, rr: number
    if (add) {
      W = w1 + w2
      rr = n1 + n2
      s1.push(`Add the wholes: ${w1} + ${w2} = ${W}`, `Add the parts: ${n1}/${den} + ${n2}/${den} = ${rr}/${den}`)
      if (rr > den) {
        s1.push(`${rr}/${den} is 1 whole and ${rr - den}/${den}. Now there are ${W + 1} wholes and ${rr - den}/${den}.`)
        W += 1
        rr -= den
      }
    } else if (mode === 'sub') {
      W = w1 - w2
      rr = n1 - n2
      s1.push(`Subtract the wholes: ${w1} − ${w2} = ${W}`, `Subtract the parts: ${n1}/${den} − ${n2}/${den} = ${rr}/${den}`)
    } else {
      W = w1 - 1 - w2
      rr = n1 + den - n2
      s1.push(`${n1}/${den} is too small to take ${n2}/${den} from. Trade 1 whole for ${den}/${den}.`, `Now the first number is ${w1 - 1} whole${s(w1 - 1)} and ${n1 + den}/${den}.`, `Parts: ${n1 + den}/${den} − ${n2}/${den} = ${rr}/${den}`, `Wholes: ${w1 - 1} − ${w2} = ${W}`)
    }
    s1.push(W === 0 ? `No wholes are left. The answer is ${rr}/${den}.` : `Make one fraction: ${W} × ${den} + ${rr} = ${W * den + rr}. That is ${W * den + rr}/${den}.`)
    const digits = Number(`${W}${rr}`)
    return {
      prompt,
      eq: `${mxHTML(w1, n1, den)} ${op} ${mxHTML(w2, n2, den)} = ${Q}`,
      input: 'fraction',
      answer: `${N}/${den}`,
      strategies: [
        strat('Wholes and Parts', s1, `${W * den + rr}/${den}`, { html: shadedPies(N, den) }),
        strat('Make Them All Fractions', [`${m1}: ${w1} × ${den} + ${n1} = ${N1}. That is ${N1}/${den}.`, `${m2}: ${w2} × ${den} + ${n2} = ${N2}. That is ${N2}/${den}.`, `${N1}/${den} ${op} ${N2}/${den} = ${N}/${den}`, ...(N > den ? [`${N}/${den} is ${mx(N, den)}.`] : [])], `${add ? N1 + N2 : N1 - N2}/${den}`),
      ],
      distractors: fwr(
        N,
        den,
        add
          ? // pushed the mixed number's digits together; added the bottoms too; forgot the wholes; forgot to carry the new whole
            [[digits, den], [(w1 + w2) * 2 * den + n1 + n2, 2 * den], [n1 + n2, den], [(w1 + w2) * den + ((n1 + n2) % den), den]]
          : // took the small part from the big part; pushed digits together; added; forgot the wholes
            [[(w1 - w2) * den + Math.abs(n1 - n2), den], [digits, den], [N1 + N2, den], [Math.abs(n1 - n2), den]],
      ),
      operands: [w1, n1, w2, n2, den],
      difficulty: d,
    }
  },

  'fr.times-whole': (rng, d) => {
    const r = R(rng)
    let den = 4
    let a = 1
    let k = 3
    for (let guard = 0; guard < 200; guard++) {
      den = d === 1 ? r.int(3, 8) : d === 2 ? r.int(3, 8) : r.pick([3, 4, 5, 6, 8, 10, 12])
      a = d === 1 ? 1 : r.int(2, den - 1)
      k = d === 1 ? r.int(2, den - 1) : d === 2 ? r.int(2, 5) : r.int(3, 9)
      if ((k * a) % den !== 0) break
    }
    const ka = k * a
    const over = ka > den
    const h = over ? ` ${hint(ka, den)}` : ''
    const F = `${a}/${den}`
    const prompt = r.chance(0.5)
      ? `What is ${k} times ${F}?${h}`
      : r.pick([
          `Each lap is ${F} of a mile. {n} runs ${k} laps. How many miles is that?${h}`,
          `{n} drinks ${F} of a bottle of water each inning. How many bottles is that in ${k} innings?${h}`,
          `Each brick is ${F} of a foot tall. How many feet tall is a stack of ${k} bricks?${h}`,
          `{n} dances for ${F} of an hour each day. How many hours is that in ${k} days?${h}`,
        ])
    let total = 0
    const counts: number[] = []
    for (let i = 0; i < k; i++) {
      total += a
      counts.push(total)
    }
    const max = Math.max(1, Math.ceil(ka / den))
    return {
      prompt,
      eq: `${k} × ${fracHTML(a, den)} = ${Q}`,
      input: 'fraction',
      answer: `${ka}/${den}`,
      strategies: [
        strat('Add It Again and Again', [`${k} × ${F} means add ${F} ${k} times.`, k <= 5 ? `${Array.from({ length: k }, () => F).join(' + ')} = ${ka}/${den}` : `Count the tops by ${a}s, ${k} times: ${counts.join(', ')}.`, `The answer is ${ka}/${den}.`], `${total}/${den}`, den * max <= 24 && max <= 2 ? { html: nlinePic({ d: den, max, hop: [0, ka], mark: ka }) } : {}),
        strat('Multiply the Top', [`Each piece is 1/${den}. There are ${k} groups of ${a} piece${s(a)}.`, `${k} × ${a} = ${ka} pieces`, `The pieces are still ${DW[den][1]}, so the bottom stays ${den}: ${ka}/${den}.`, ...(over ? [`${ka}/${den} is ${mx(ka, den)}.`] : [])], `${k * a}/${den}`),
      ],
      // multiplied the bottom too; multiplied only the bottom; added the whole number to the top
      distractors: fwr(ka, den, [[ka, k * den], [a, k * den], [k + a, den], [ka, den + k]]),
      operands: [k, a, den],
      difficulty: d,
    }
  },

  'fr.decimal-link': (rng, d) => {
    const r = R(rng)
    let n: number, den: number
    if (d === 1) [n, den] = [r.int(1, 9), 10]
    else if (d === 2) {
      const kind = r.pick(['hund', 'hund', 'half', 'tenths'] as const)
      if (kind === 'hund') {
        den = 100
        n = r.int(1, 99)
        if (n % 10 === 0) n += r.int(1, 9)
      } else if (kind === 'half') [n, den] = [1, 2]
      else {
        den = 10
        n = r.int(11, 29)
        if (n % 10 === 0) n += r.int(1, 9)
      }
    } else {
      const kind = r.pick(['quarter', 'quarter', 'fifth', 'fifth', 'half'] as const)
      if (kind === 'quarter') [n, den] = [r.pick([1, 3, 5, 7]), 4]
      else if (kind === 'fifth') [n, den] = [r.pick([1, 2, 3, 4, 6, 7]), 5]
      else [n, den] = [r.pick([1, 3]), 2]
    }
    const toDec = r.chance(0.5)
    const dec = decStr(n, den)
    const h = (n * 100) / den // hundredths
    const places = h % 10 === 0 ? 1 : 2
    const [top, base] = places === 1 ? [h / 10, 10] : [h, 100]
    const unit = (t: number, b: number) => DW[b][t === 1 ? 0 : 1]
    const money = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`
    if (toDec) {
      const m = 10 % den === 0 ? 10 / den : 100 / den
      const [sc, bs] = [n * m, den * m]
      const cents = n * (100 / den)
      const s1 =
        den === bs
          ? [`${n}/${den} means ${n} ${unit(n, den)}.`, `${den === 10 ? 'Tenths go 1 place' : 'Hundredths go 2 places'} after the dot.${den === 100 && n < 10 ? ' Put a 0 in the tenths place to hold the spot.' : ''}`, `${n}/${den} = ${dec}`]
          : [`Make the bottom ${bs}: ${den} × ${m} = ${bs}`, `Do the same to the top: ${n} × ${m} = ${sc}`, `${n}/${den} = ${sc}/${bs}`, `${sc} ${unit(sc, bs)} is written ${dec}.`]
      return {
        prompt: `Write ${n}/${den} as a decimal.`,
        eq: `${fracHTML(n, den)} = ${Q}`,
        input: 'decimal',
        answer: dec,
        strategies: [
          strat(den === bs ? 'Place Value' : 'Make Tenths or Hundredths', s1, decStr(sc, bs), den === 10 && n < 10 ? { html: nlinePic({ d: 10, mark: n, hop: [0, n] }) } : n <= den && bs === 100 ? { html: hundredPic(h) } : {}),
          strat('Think Money', [`Think of 1 whole as 1 dollar. That is 100 cents.`, `1/${den} of a dollar is ${100 / den} cent${s(100 / den)}.`, `${n} × ${100 / den} = ${cents} cents`, `${cents} cents is $${money(cents)}. So the decimal is ${dec}.`], decStr(cents, 100)),
        ],
        // top dot bottom; put the bottom after the dot; wrong place
        distractors: dwr(dec, den === 10 ? [decStr(n, 100), `${n}`, decStr(n, 1000)] : den === 100 ? [decStr(n, 10), `${n}`, decStr(n, 1000)] : [`${n}.${den}`, `0.${den}`, `0.${n}${den}`, `${den}.${n}`]),
        operands: [n, den],
        difficulty: d,
      }
    }
    const s1 = [`${dec} has ${places === 1 ? '1 digit' : '2 digits'} after the dot. That means ${places === 1 ? 'tenths' : 'hundredths'}.`, `Read it as ${top} ${unit(top, base)}: ${dec} = ${top}/${base}`]
    if (top !== n) s1.push(`Make it simpler: ${top}/${base} = ${n}/${den}`)
    const s2 = [h > 100 ? `Think of dollars. ${dec} dollars is ${h} cents.` : `Think of dollars. ${dec} of a dollar is ${h} cent${s(h)}.`, `1 dollar is 100 cents, so that is ${h}/100 of a dollar.`]
    const per = 100 / den // cents in one 1/den of a dollar
    if (den === 2) s2.push(`50 cents is half of a dollar. So ${h} cents is ${n}/2 of a dollar.`)
    else if (den === 4) s2.push(`25 cents is 1 quarter, and 4 quarters make 1 dollar. So ${h} cents is ${n}/4 of a dollar.`)
    else if (den === 5) s2.push(`20 cents is 1/5 of a dollar, because 5 × 20 = 100. So ${h} cents is ${n}/5 of a dollar.`)
    else if (den === 10) s2.push(`Divide top and bottom by 10: ${h}/100 = ${n}/10`)
    return {
      prompt: `Write ${dec} as a fraction.${n > den ? ` ${hint(n, den)}` : ''}`,
      eq: `${dec} = ${Q}`,
      input: 'fraction',
      answer: `${n}/${den}`,
      strategies: [strat('Say It Out Loud', s1, `${top}/${base}`, h <= 100 ? { html: hundredPic(h) } : {}), strat('Think Money', s2, `${h / per}/${100 / per}`)],
      // wrong place value; flipped; 1 over the digits
      distractors: fwr(n, den, [[top, base === 10 ? 100 : 10], [base, top], [1, top], [top, 1]]),
      operands: [n, den],
      difficulty: d,
    }
  },

  /* ---------- Grade 5 ---------- */
  'fr.add-unlike': (rng, d) => unlike(rng, d, '+'),
  'fr.sub-unlike': (rng, d) => unlike(rng, d, '−'),

  'fr.as-division': (rng, d) => {
    const r = R(rng)
    let a = 3
    let b = 4
    for (let guard = 0; guard < 200; guard++) {
      b = d === 1 ? r.int(2, 6) : d === 2 ? r.int(3, 10) : r.int(2, 8)
      a = d === 1 ? r.int(1, Math.min(3, b - 1)) : d === 2 ? r.int(2, b - 1) : r.int(b + 1, 3 * b - 1)
      if (a % b !== 0) break
    }
    const over = a > b
    const h = over ? ` ${hint(a, b)}` : ''
    const plain = d >= 2 && r.chance(0.3)
    const [thing, things, who] = plain
      ? (['whole', 'wholes', 'friends'] as const)
      : r.pick([
          ['pizza', 'pizzas', 'kids'],
          ['pie', 'pies', 'friends'],
          ['granola bar', 'granola bars', 'players'],
          ['pancake', 'pancakes', 'kids'],
          ['brownie', 'brownies', 'dancers'],
        ] as const)
    const prompt = plain ? `What is ${a} ÷ ${b} as a fraction?${h}` : `${b} ${who} share ${a} ${a === 1 ? thing : things} the fair way. What fraction of a ${thing} does each one get?${h}`
    let got = 0
    for (let i = 0; i < a; i++) got += 1
    return {
      prompt,
      eq: `${a} ÷ ${b} = ${Q}`,
      eqOnly: plain && !over,
      input: 'fraction',
      answer: `${a}/${b}`,
      strategies: [
        strat('Share Each One', [`${plain ? `Think of ${a} whole${s(a)} shared by ${b} friends. ` : ''}Cut every ${thing} into ${b} equal parts. Each part is 1/${b}.`, `Each of the ${who} takes 1 part from every ${thing}.`, `That is ${a} part${s(a)}: ${a} × 1/${b} = ${a}/${b}`, ...(over ? [`${a}/${b} is ${mx(a, b)} ${things}.`] : [])], `${got}/${b}`, a <= 10 ? { html: piesPic(a, b, (_, i) => (i === 0 ? ORANGE : OFF)) } : {}),
        strat('Division Makes a Fraction', [`Sharing is dividing: ${a} ÷ ${b}.`, `The number being shared goes on top. The number of sharers goes on the bottom.`, `${a} ÷ ${b} = ${a}/${b}`, `Check: ${b} × ${a}/${b} = ${a}`], `${a}/${b}`),
      ],
      // flipped; one part only; added for the bottom
      distractors: fwr(a, b, [[b, a], [1, b], [a, a + b], ...(a > 1 ? [[1, a] as [number, number]] : [])]),
      operands: [a, b],
      difficulty: d,
    }
  },

  'fr.times-fraction': (rng, d) => {
    const r = R(rng)
    const b = d === 1 ? r.int(2, 4) : d === 2 ? r.int(2, 5) : r.int(3, 8)
    const dd = d === 1 ? r.int(2, 5) : d === 2 ? r.int(3, 6) : r.int(3, 8)
    let a = d === 3 ? r.int(2, b - 1) : 1
    let c = d === 1 ? 1 : r.int(2, dd - 1)
    if (d === 2 && r.chance(0.3) && b > 2) [a, c] = [r.int(2, b - 1), 1]
    const [ac, bd] = [a * c, b * dd]
    const [F1, F2] = [`${a}/${b}`, `${c}/${dd}`]
    const prompt = r.chance(0.5)
      ? `What is ${F1} of ${F2}? Multiply the two fractions.`
      : r.pick([
          `{n} has ${F2} of a pizza. {n} eats ${F1} of what is there. What fraction of a whole pizza did {n} eat?`,
          `${F2} of the field is grass. ${F1} of the grass is wet. What fraction of the whole field is wet grass?`,
          `${F2} of a wall is built. ${F1} of the built part is red. What fraction of the whole wall is red?`,
        ])
    let both = 0
    for (let i = 0; i < b; i++) for (let j = 0; j < dd; j++) if (i < a && j < c) both++
    const s1 = [`Multiply the tops: ${a} × ${c} = ${ac}`, `Multiply the bottoms: ${b} × ${dd} = ${bd}`, `${F1} × ${F2} = ${ac}/${bd}`]
    if (gcd(ac, bd) > 1) s1.push(`${ac}/${bd} is the same as ${frac(ac, bd)}. Both are right.`)
    return {
      prompt,
      eq: `${fracHTML(a, b)} × ${fracHTML(c, dd)} = ${Q}`,
      input: 'fraction',
      answer: `${ac}/${bd}`,
      strategies: [
        strat('Tops Together, Bottoms Together', s1, `${a * c}/${b * dd}`),
        strat('Draw a Grid', [`Draw a box. Cut it into ${dd} columns and color ${c}. That shows ${F2}.`, `Now cut it into ${b} rows and mark ${a}. That takes ${F1} of it.`, `The box has ${b} × ${dd} = ${bd} small squares.`, `${both} square${s(both)} got both colors (green). That is ${both}/${bd}.`], `${both}/${b * dd}`, { html: gridPic(dd, b, c, a) }),
      ],
      // added tops and bottoms; cross multiplied; added the bottoms; added the tops
      distractors: fwr(ac, bd, [[a + c, b + dd], [a * dd, b * c], [ac, b + dd], [a + c, bd]]),
      operands: [a, b, c, dd],
      difficulty: d,
    }
  },

  'fr.divide-unit': (rng, d) => {
    const r = R(rng)
    const wholeFirst = d === 1 ? true : r.chance(0.5)
    if (wholeFirst) {
      const w = d === 1 ? r.int(1, 4) : d === 2 ? r.int(2, 6) : r.int(3, 9)
      const den = d === 1 ? r.int(2, 4) : d === 2 ? r.int(2, 6) : r.pick([3, 4, 5, 6, 8, 10])
      const ans = w * den
      const U = `1/${den}`
      const prompt = d === 3 && r.chance(0.3)
        ? `What is ${w} ÷ ${U}? How many ${DW[den][1]} fit in ${w}?`
        : r.pick([
            `{n} has ${w} cup${s(w)} of rice. Each scoop holds ${U} of a cup. How many scoops is that?`,
            `A rope is ${w} ${w === 1 ? 'foot' : 'feet'} long. {n} cuts it into pieces ${U} of a foot long. How many pieces?`,
            `There ${w === 1 ? 'is' : 'are'} ${w} pizza${s(w)}. Each kid gets ${U} of a pizza. How many kids can eat?`,
            `{n} runs ${w} mile${s(w)}. Each lap is ${U} of a mile. How many laps is that?`,
          ])
      let count = 0
      for (let i = 0; i < w; i++) count += den
      let x = 1
      while (x !== w * den) x++
      return {
        prompt,
        eq: `${w} ÷ ${fracHTML(1, den)} = ${Q}`,
        input: 'number',
        answer: ans,
        strategies: [
          strat('Count the Pieces in Each Whole', [`Each whole has ${den} pieces of size ${U}.`, `There ${w === 1 ? 'is 1 whole' : `are ${w} wholes`}.`, `${w} × ${den} = ${ans}`], count, w <= 6 ? { html: stackPic(Array.from({ length: w }, () => ({ n: den, d: den })), `${w} bars each cut into ${den} parts`) } : {}),
          strat('Think Times', [`Ask: how many ${DW[den][1]} make ${w}?`, `Try ${ans}: ${ans} × ${U} = ${ans}/${den} = ${w}`, `It works. So ${w} ÷ ${U} = ${ans}`], x),
        ],
        // divided the whole number by the bottom; wrote the bottom; added; wrote the whole number
        distractors: wrongs(ans, [w % den === 0 ? w / den : den, den, w + den, w].filter((v) => v !== ans)),
        operands: [w, den],
        difficulty: d,
      }
    }
    const den = d === 2 ? r.int(2, 4) : r.int(2, 6)
    const w = d === 2 ? r.int(2, 4) : r.int(2, 6)
    const dw = den * w
    const U = `1/${den}`
    const prompt = d === 3 && r.chance(0.3)
      ? `What is ${U} ÷ ${w}? Cut ${U} into ${w} equal parts.`
      : r.pick([
          `${U} of a pizza is left. ${w} kids share it the fair way. What fraction of a whole pizza does each kid get?`,
          `{n} has ${U} of a pan of brownies. {n} cuts it into ${w} equal pieces. What fraction of the whole pan is each piece?`,
          `A path is ${U} of a mile long. It is split into ${w} equal parts. What fraction of a mile is each part?`,
        ])
    let x = 1
    while (x !== den * w) x++
    return {
      prompt,
      eq: `${fracHTML(1, den)} ÷ ${w} = ${Q}`,
      input: 'fraction',
      answer: `1/${dw}`,
      strategies: [
        strat('Cut the Piece', [`Start with a whole cut into ${den} equal parts. One part is ${U}.`, `Cut every part into ${w} smaller pieces.`, `Now the whole has ${den} × ${w} = ${dw} small pieces.`, `Each share is 1 of them: 1/${dw}.`], `1/${den * w}`, { html: stackPic([{ n: 1, d: den, label: U }, { n: 1, d: dw, label: `1/${dw}`, color: BLUE }], `one part of ${den} cut into ${w} smaller pieces`) }),
        strat('Check by Multiplying', [`${w} equal shares must add up to ${U}.`, `Try 1/${dw}: ${w} × 1/${dw} = ${w}/${dw}`, `${w}/${dw} = ${U}`, `It works. Each share is 1/${dw}.`], `1/${x}`),
      ],
      // multiplied instead; flipped the wrong way; added the bottoms; left it the same
      distractors: fwr(1, dw, [[w, den], [1, den + w], [dw, 1], [1, den]]),
      operands: [w, den],
      difficulty: d,
    }
  },

  /* ---------- Grade 6 ---------- */
  'fr.percent': (rng, d) => {
    const r = R(rng)
    const type = d === 1 ? r.pick(['grid', 'of', 'of', 'toFrac'] as const) : d === 2 ? r.pick(['grid', 'of', 'of', 'toFrac', 'fromFrac', 'toDec'] as const) : r.pick(['of', 'of', 'fromFrac', 'toDec', 'fromDec', 'toFrac'] as const)
    if (type === 'grid') {
      const p = d === 1 ? r.pick([10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]) : r.int(1, 99)
      const [rows, ones] = [Math.floor(p / 10), p % 10]
      return {
        prompt: d === 1 ? `This grid has 100 squares. ${p} squares are orange. What percent of the grid is orange?` : `This grid has 100 small squares. What percent of the grid is orange?`,
        visual: hundredPic(p),
        input: 'number',
        unit: '%',
        answer: p,
        strategies: [
          strat('Percent Means Out of 100', [`Percent means "out of 100".`, `Count the orange squares: ${rows} full row${s(rows)} of 10${ones ? ` and ${ones} more` : ''}. That is ${p}.`, `${p} out of 100 is ${p}%.`], rows * 10 + ones),
          strat('Count the White Squares', [`${100 - p} squares are white.`, `100 − ${100 - p} = ${p}`, `So ${p} squares are orange. That is ${p}%.`], 100 - (100 - p)),
        ],
        // counted the white ones; counted rows only; off by a row
        distractors: wrongs(p, [100 - p, rows, p + 10, ones].filter((v) => v > 0)),
        operands: [p, 100],
        difficulty: d,
      }
    }
    if (type === 'of') {
      const p = d === 1 ? r.pick([50, 50, 100]) : d === 2 ? r.pick([10, 25, 50]) : r.pick([10, 25, 75, 75])
      const N = p === 50 ? 2 * r.int(d === 1 ? 2 : 6, d === 1 ? 10 : d === 2 ? 30 : 60) : p === 100 ? r.int(5, 50) : p === 10 ? 10 * r.int(d === 2 ? 2 : 11, d === 2 ? 20 : 50) : 4 * r.int(d === 2 ? 2 : 6, d === 2 ? 10 : 25)
      const ans = (N * p) / 100
      const prompt = r.chance(0.35)
        ? `What is ${p}% of ${N}?`
        : r.pick([
            `{n} threw ${N} pitches. ${p}% were strikes. How many strikes is that?`,
            `A box has ${N} bricks. ${p}% of them are red. How many bricks are red?`,
            `${N} kids are at dance class. ${p}% of them wear blue. How many kids wear blue?`,
            `The team has ${N} baseballs. ${p}% of them are new. How many are new?`,
          ])
      const q = N / 4
      const s1 =
        p === 50
          ? strat('Use a Fraction', [`50% is half, because 50/100 = 1/2`, `Half of ${N}: ${N} ÷ 2 = ${ans}`], N / 2)
          : p === 25
            ? strat('Use a Fraction', [`25% is one fourth, because 25/100 = 1/4`, `One fourth of ${N}: ${N} ÷ 4 = ${ans}`], N / 4)
            : p === 10
              ? strat('Use a Fraction', [`10% is one tenth, because 10/100 = 1/10`, `One tenth of ${N}: ${N} ÷ 10 = ${ans}`], N / 10)
              : p === 75
                ? strat('Use a Fraction', [`75% is three fourths, because 75/100 = 3/4`, `One fourth of ${N}: ${N} ÷ 4 = ${q}`, `Three fourths: 3 × ${q} = ${ans}`], 3 * q)
                : strat('Use a Fraction', [`100% means all of it, because 100/100 = 1`, `All of ${N} is ${N}.`], N)
      const s2 =
        p === 50
          ? strat('Check by Doubling', [`Two halves make the whole.`, `${ans} + ${ans} = ${N}`, `So 50% of ${N} is ${ans}.`], N - N / 2)
          : p === 25
            ? strat('Half, Then Half Again', [`50% is half: ${N} ÷ 2 = ${N / 2}`, `25% is half of that: ${N / 2} ÷ 2 = ${ans}`], N / 2 / 2)
            : p === 10
              ? strat('Groups of Ten', [`10% means 1 out of every 10.`, `${N} makes ${N / 10} groups of 10.`, `Take 1 from each group. That is ${N / 10}.`], Array.from({ length: N / 10 }, () => 1).length)
              : p === 75
                ? strat('Take Away 25%', [`75% is all of it but 25%.`, `25% of ${N}: ${N} ÷ 4 = ${q}`, `${N} − ${q} = ${ans}`], N - q)
                : strat('Out of 100', [`100% means 100 out of every 100.`, `That is every single one. None are left out.`, `So the answer is all ${N}.`], (N * 100) / 100)
      return {
        prompt,
        eq: `${p}% of ${N} = ${Q}`,
        input: 'number',
        answer: ans,
        strategies: [s1, s2],
        // wrote the percent; subtracted the percent; found the other part; divided by the percent number
        distractors: wrongs(ans, [p, N - p, N - ans, N % p === 0 ? N / p : -1, p === 100 ? 1 : N, p === 50 ? N * 2 : -1].filter((v) => v > 0)),
        operands: [p, N],
        difficulty: d,
      }
    }
    if (type === 'toFrac' || type === 'toDec') {
      const p = d === 1 ? r.pick([10, 25, 50, 75, 30, 70, 90]) : d === 2 ? r.pick([10, 20, 25, 40, 50, 60, 75, 80, 7, 3, 9, 13, 31, 47]) : r.int(1, 99)
      const g = gcd(p, 100)
      const pad = String(p).padStart(2, '0')
      if (type === 'toFrac') {
        const s1 = [`Percent means "out of 100".`, `${p}% is ${p} out of 100. That is ${p}/100.`]
        if (g > 1) s1.push(`Make it simpler. Divide top and bottom by ${g}: ${p}/100 = ${frac(p, 100)}`)
        return {
          prompt: `Write ${p}% as a fraction.`,
          eq: `${p}% = ${Q}`,
          input: 'fraction',
          answer: frac(p, 100),
          strategies: [
            strat('Out of 100', s1, `${p}/100`, { html: hundredPic(p) }),
            strat('Think Money', [`A dollar is 100 cents. ${p}% of a dollar is ${p} cent${s(p)}.`, `${p} cent${s(p)} out of 100 cents is ${p}/100 of a dollar.`, ...(g > 1 ? [`${p}/100 = ${frac(p, 100)}`] : [])], frac(p, 100)),
          ],
          // out of 10; 1 over the number; flipped
          distractors: fwr(p, 100, [[p, 10], [1, p], [100, p], [p, 1]]),
          operands: [p, 100],
          difficulty: d,
        }
      }
      const dec = decStr(p, 100)
      return {
        prompt: `Write ${p}% as a decimal.`,
        eq: `${p}% = ${Q}`,
        input: 'decimal',
        answer: dec,
        strategies: [
          strat('Out of 100', [`Percent means "out of 100". ${p}% is ${p}/100.`, `${p} hundredth${s(p)} is written with 2 places after the dot.`, `${p}/100 = ${dec}`], decStr(p, 100), { html: hundredPic(p) }),
          strat('Think Money', [`A dollar is 100 cents. ${p}% of a dollar is ${p} cent${s(p)}.`, `${p} cent${s(p)} is written $0.${pad}.`, `So ${p}% is ${dec}.`], decStr(Number(pad), 100)),
        ],
        // just dropped the sign; moved only one place; moved the wrong way
        distractors: dwr(dec, [`${p}`, decStr(p, 10), decStr(p, 1000), p < 10 ? `0.${p}` : `${p}.0`]),
        operands: [p, 100],
        difficulty: d,
      }
    }
    if (type === 'fromFrac') {
      const [n, den] = d === 2 ? r.pick([[1, 2], [1, 4], [3, 4], [r.int(1, 9), 10], [r.int(1, 9), 10], [r.int(1, 99), 100]] as [number, number][]) : r.pick([[1, 4], [3, 4], [r.int(1, 4), 5], [r.int(1, 4), 5], [r.int(1, 9), 10], [r.int(1, 19), 20], [r.int(1, 24), 25]] as [number, number][])
      const m = 100 / den
      const ans = n * m
      return {
        prompt: `${n}/${den} is what percent?`,
        eq: `${fracHTML(n, den)} = ${Q}%`,
        input: 'number',
        unit: '%',
        answer: ans,
        strategies: [
          den === 100
            ? strat('Out of 100', [`Percent means "out of 100".`, `${n}/100 is ${n} out of 100.`, `That is ${n}%.`], n, { html: hundredPic(n) })
            : strat('Make the Bottom 100', [`Percent means "out of 100", so make the bottom 100: ${den} × ${m} = 100`, `Do the same to the top: ${n} × ${m} = ${ans}`, `${n}/${den} = ${ans}/100`, `${ans} out of 100 is ${ans}%.`], n * m, { html: hundredPic(ans) }),
          strat('Think Money', [`Think of 1 whole as 1 dollar, or 100 cents.`, `1/${den} of a dollar is ${m} cent${s(m)}.`, `${n} × ${m} = ${n * (100 / den)} cents`, `${ans} cents out of 100 cents is ${ans}%.`], n * (100 / den)),
        ],
        // wrote the top; wrote the bottom; pushed the digits together; times ten only
        distractors: wrongs(ans, [n, den, Number(`${n}${den}`), n * 10]),
        operands: [n, den],
        difficulty: d,
      }
    }
    // fromDec
    const p = r.chance(0.4) ? 10 * r.int(1, 9) : r.int(1, 99)
    const dec = decStr(p, 100)
    return {
      prompt: `${dec} is what percent?`,
      eq: `${dec} = ${Q}%`,
      input: 'number',
      unit: '%',
      answer: p,
      strategies: [
        strat('Write It as Hundredths', [`Percent means "out of 100".`, `${dec} = ${p}/100`, `${p} out of 100 is ${p}%.`], p, { html: hundredPic(p) }),
        strat('Times 100', [`To turn a decimal into a percent, multiply by 100.`, `${dec} × 100 = ${p}`, `So ${dec} is ${p}%.`], (p * 100) / 100),
      ],
      // read only the first digit; moved one place; moved too far
      distractors: wrongs(p, [p % 10 === 0 ? p / 10 : Math.floor(p / 10), p * 10, p < 10 ? p * 10 : p + 10, 100 - p].filter((v) => v > 0)),
      operands: [p, 100],
      difficulty: d,
    }
  },
}

/* ------------------------------------------------------------------ teach ------------------------------------------------------------------ */

export const teach: Record<string, string> = {
  'fr.equal-parts': 'Equal parts are all the same size, like fair shares. Two equal parts are halves, three are thirds, and four are fourths.',
  'fr.unit': 'Cut a whole into equal parts and take just one. That one part is a unit fraction. The bottom number tells how many parts make the whole.',
  'fr.name': 'A fraction has two numbers. The bottom tells how many equal parts are in the whole. The top tells how many parts we are counting.',
  'fr.number-line': 'Fractions live on the number line too. Cut the space from 0 to 1 into equal jumps. The bottom number is the jumps in one whole. The top is how many jumps you took.',
  'fr.compare-same': 'Same bottom number? More pieces is bigger. Same top number? The smaller bottom wins, because fewer cuts make bigger pieces.',
  'fr.equivalent': 'Equal fractions are the same amount with a different number of cuts. Multiply or divide the top and the bottom by the same number.',
  'fr.whole-numbers': 'Whole numbers can be fractions too. When the top and the bottom match, that is 1 whole. Divide the top by the bottom to count the wholes.',
  'fr.simplify': 'Simplest form uses the smallest numbers you can. Divide the top and the bottom by the same number until only 1 goes into both.',
  'fr.compare-any': 'To compare any two fractions, give them the same bottom number, then compare the tops. One half is a handy number to check against.',
  'fr.add-like': 'When the bottom numbers match, the pieces are the same size. Just add the tops. The bottom stays the same.',
  'fr.sub-like': 'When the bottom numbers match, the pieces are the same size. Just subtract the tops. The bottom stays the same.',
  'fr.mixed': 'A mixed number is wholes and a part, like 1 and 3/4. Cut each whole into pieces to write it as one fraction, like 7/4.',
  'fr.add-mixed': 'With mixed numbers, work with the wholes and the parts one at a time. If the parts make a new whole, trade it. Or turn both into fractions first.',
  'fr.times-whole': 'A whole number times a fraction is adding the fraction again and again. Multiply the top. The size of the pieces, the bottom, stays the same.',
  'fr.decimal-link': 'Decimals are fractions with 10 or 100 on the bottom. Seven tenths is 0.7. One fourth is 25 hundredths, so it is 0.25, just like a quarter.',
  'fr.add-unlike': 'Different bottom numbers mean pieces of different sizes. First change them to pieces of the same size. Then add the tops.',
  'fr.sub-unlike': 'Different bottom numbers mean pieces of different sizes. First change them to pieces of the same size. Then subtract the tops.',
  'fr.as-division': 'A fraction is a division problem. 3 pizzas shared by 4 kids is 3 divided by 4, and each kid gets 3/4 of a pizza.',
  'fr.times-fraction': 'A fraction times a fraction means a part of a part. Multiply the tops, then multiply the bottoms. The answer gets smaller.',
  'fr.divide-unit': 'Dividing by a unit fraction asks how many small pieces fit. Each whole holds lots of pieces, so the answer gets bigger. Sharing a piece makes smaller pieces.',
  'fr.percent': 'Percent means out of 100. So 50% is half, 25% is one fourth, and 10% is one tenth. 100% is all of it.',
}

/* ------------------------------------------------------------------ limits ----------------------------------------------------------------- */

const isInt = (x: number) => Number.isSafeInteger(x)
const properFrac = (it: Item, maxDen: number) => {
  const [n, den] = fv(it.answer)
  return it.input === 'fraction' && n >= 1 && den >= 2 && den <= maxDen
}
const fourOps = (it: Item, maxDen: number) => {
  const [a, b, c, e] = it.operands
  return [a, b, c, e].every(isInt) && a >= 1 && c >= 1 && b >= 2 && e >= 2 && b <= maxDen && e <= maxDen
}

export const limits: Record<string, (it: Item) => boolean> = {
  'fr.equal-parts': (it) => {
    const k = it.operands[0]
    return k >= 2 && k <= 8 && (it.input === 'number' ? it.answer === k : it.input === 'choice' && ['Yes', 'No', 'halves', 'thirds', 'fourths'].includes(String(it.answer)))
  },
  'fr.unit': (it) => {
    const den = it.operands[0]
    return den >= 2 && den <= 12 && (it.input === 'number' ? it.answer === den : it.input === 'fraction' && it.answer === `1/${den}`)
  },
  'fr.name': (it) => {
    const [n, den] = it.operands
    const [top, bot] = fv(it.answer)
    return it.input === 'fraction' && den >= 3 && den <= 12 && n >= 1 && n < den && bot === den && (top === n || top === den - n)
  },
  'fr.number-line': (it) => {
    const [n, den, max] = it.operands
    if (!(den >= 2 && den <= 12 && (max === 1 || max === 2) && n >= 1 && n < max * den && n % den !== 0)) return false
    return it.input === 'number' ? it.answer === n : it.input === 'fraction' && it.answer === `${n}/${den}`
  },
  'fr.compare-same': (it) => {
    const [a, b, c, e] = it.operands
    return it.input === 'choice' && fourOps(it, 12) && a < b && c < e && (a === c || b === e) && ['<', '=', '>'].includes(String(it.answer))
  },
  'fr.equivalent': (it) => {
    const [p, q, known, k] = it.operands
    return it.input === 'number' && p >= 1 && p < q && q <= 36 && k >= 2 && k <= 6 && known >= 1 && known <= 36 && +it.answer >= 1 && +it.answer <= 36
  },
  'fr.whole-numbers': (it) => {
    const [k, den] = it.operands
    return it.input === 'number' && k >= 1 && k <= 9 && den >= 1 && den <= 10 && (it.answer === k || it.answer === k * den)
  },
  'fr.simplify': (it) => {
    const [n, dd, g] = it.operands
    const [p, q] = fv(it.answer)
    return it.input === 'fraction' && it.exact === true && g >= 2 && n < dd && dd <= 108 && gcd(n, dd) === g && gcd(p, q) === 1 && p * g === n && q * g === dd
  },
  'fr.compare-any': (it) => {
    const [a, b, c, e] = it.operands
    return it.input === 'choice' && fourOps(it, 12) && a < b && c < e && b !== e && ['<', '=', '>'].includes(String(it.answer))
  },
  'fr.add-like': (it) => {
    const [a, b, den] = it.operands
    return properFrac(it, 12) && a >= 1 && b >= 1 && a < den && b < den && a + b < 2 * den && it.answer === `${a + b}/${den}`
  },
  'fr.sub-like': (it) => {
    const [a, b, den] = it.operands
    return properFrac(it, 12) && b >= 1 && b < a && a < 2 * den && it.answer === `${a - b}/${den}`
  },
  'fr.mixed': (it) => {
    const [w, nn, den] = it.operands
    const ok = w >= 1 && w <= 6 && den >= 2 && den <= 10 && nn >= 1 && nn < den
    return ok && (it.input === 'fraction' ? it.answer === `${w * den + nn}/${den}` : it.input === 'number' && (it.answer === w || it.answer === nn))
  },
  'fr.add-mixed': (it) => {
    const [w1, n1, w2, n2, den] = it.operands
    const [top, bot] = fv(it.answer)
    return it.input === 'fraction' && den >= 3 && den <= 10 && w1 >= 1 && w2 >= 1 && w1 <= 8 && w2 <= 5 && n1 >= 1 && n1 < den && n2 >= 1 && n2 < den && bot === den && top >= 1 && top % den !== 0 && top <= 12 * den
  },
  'fr.times-whole': (it) => {
    const [k, a, den] = it.operands
    return properFrac(it, 12) && k >= 2 && k <= 9 && a >= 1 && a < den && (k * a) % den !== 0 && it.answer === `${k * a}/${den}`
  },
  'fr.decimal-link': (it) => {
    const [n, den] = it.operands
    return [2, 4, 5, 10, 100].includes(den) && n >= 1 && n < 3 * den && (it.input === 'decimal' ? Number(it.answer) > 0 && Number(it.answer) < 3 : it.input === 'fraction' && it.answer === `${n}/${den}`)
  },
  'fr.add-unlike': (it) => {
    const [a, b, c, e] = it.operands
    return properFrac(it, 72) && fourOps(it, 12) && b !== e && a < b && c < e
  },
  'fr.sub-unlike': (it) => {
    const [a, b, c, e] = it.operands
    return properFrac(it, 72) && fourOps(it, 12) && b !== e && a < b && c < e && a * e > c * b
  },
  'fr.as-division': (it) => {
    const [a, b] = it.operands
    return it.input === 'fraction' && a >= 1 && a <= 23 && b >= 2 && b <= 10 && a % b !== 0 && it.answer === `${a}/${b}`
  },
  'fr.times-fraction': (it) => {
    const [a, b, c, dd] = it.operands
    return it.input === 'fraction' && a >= 1 && a < b && c >= 1 && c < dd && b <= 8 && dd <= 8 && it.answer === `${a * c}/${b * dd}`
  },
  'fr.divide-unit': (it) => {
    const [w, den] = it.operands
    return w >= 1 && w <= 9 && den >= 2 && den <= 10 && (it.input === 'number' ? it.answer === w * den : it.input === 'fraction' && it.answer === `1/${w * den}`)
  },
  'fr.percent': (it) => {
    const [x, y] = it.operands
    if (it.input === 'number') return isInt(+it.answer) && +it.answer >= 1 && +it.answer <= 500 && x >= 1 && y >= 1 && y <= 500
    if (it.input === 'fraction') return x >= 1 && x <= 99 && fv(it.answer)[1] <= 100
    return it.input === 'decimal' && x >= 1 && x <= 99 && Number(it.answer) > 0 && Number(it.answer) < 1
  },
}
