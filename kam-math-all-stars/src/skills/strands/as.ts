import { R, strat, wrongs, choice, fmtN, Q, dig, pieces, PLN, type Gen, type Item, type Strat } from '../kit'

/* Add & Subtract: the skills that extend the original levels. */

const KIDS = ['Mia', 'Leo', 'Sam', 'Ava', 'Ben', 'Zoe', 'Max', 'Eli', 'Ivy', 'Jon'] as const
const tensOf = (n: number) => n - (n % 10)
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const places = (n: number) => {
  const out: number[] = []
  for (let pl = 1; pl <= Math.max(n, 1); pl *= 10) out.push(pl)
  return out
}
/** Join column steps two at a time when there are many columns, so a strategy stays short. */
const pack = (steps: string[]) => {
  if (steps.length <= 4) return steps
  const out: string[] = []
  for (let i = 0; i < steps.length; i += 2) out.push(steps.slice(i, i + 2).join(' '))
  return out
}

/** Written addition, one column at a time. The sum is built from the digits. */
function colAdd(a: number, b: number): { result: number; steps: string[] } {
  let carry = 0
  let result = 0
  const steps: string[] = []
  for (const pl of places(Math.max(a, b))) {
    const x = dig(a, pl)
    const y = dig(b, pl)
    const t = x + y + carry
    steps.push(`${PLN[pl]}: ${x} + ${y}${carry ? ' + 1' : ''} = ${t}.${t >= 10 ? ` Write ${t % 10}, carry 1.` : ''}`)
    result += (t % 10) * pl
    carry = t >= 10 ? 1 : 0
    if (carry && pl * 10 > Math.max(a, b)) {
      result += pl * 10
      steps[steps.length - 1] = `${PLN[pl]}: ${x} + ${y}${t - x - y ? ' + 1' : ''} = ${t}. Write ${t}.`
    }
  }
  return { result, steps: pack(steps) }
}
/** Written subtraction (a ≥ b), one column at a time, trading when the top digit is too small. */
function colSub(a: number, b: number): { result: number; steps: string[] } {
  let gave = 0
  let result = 0
  const steps: string[] = []
  for (const pl of places(a)) {
    const left = dig(a, pl) - gave
    const y = dig(b, pl)
    const trade = left < y
    const top = trade ? left + 10 : left
    const pre = trade ? (gave ? `1 was traded away. Trade again to get ${top}. ` : `${left} is too small. Trade to get ${top}. `) : gave ? `1 was traded away, so ${left} is left. ` : ''
    steps.push(`${PLN[pl]}: ${pre}${top} − ${y} = ${top - y}.`)
    result += (top - y) * pl
    gave = trade ? 1 : 0
  }
  return { result, steps: pack(steps) }
}
/** The classic slip: take the smaller digit from the bigger one in every column. */
const digitGap = (a: number, b: number) => sum(places(Math.max(a, b)).map((pl) => Math.abs(dig(a, pl) - dig(b, pl)) * pl))
/** The classic slip: add each column and drop every carry. */
const noCarry = (a: number, b: number) => sum(places(Math.max(a, b)).map((pl) => ((dig(a, pl) + dig(b, pl)) % 10) * pl))

/** Hop up from `from` to `to` by friendly stops (next ten, next hundred, ...). */
function countUp(from: number, to: number): { pts: number[]; hops: number[]; total: number } {
  const pts = [from]
  let p = from
  for (const u of [10, 100, 1000, 10000, 100000]) {
    const nxt = Math.ceil(p / u) * u
    if (nxt > p && nxt <= to) {
      pts.push(nxt)
      p = nxt
    }
  }
  if (p < to) pts.push(to)
  const hops = pts.slice(1).map((v, i) => v - pts[i])
  return { pts, hops, total: sum(hops) }
}
const countUpStrat = (name: string, from: number, to: number): Strat => {
  const c = countUp(from, to)
  return strat(
    name,
    [`Start at ${fmtN(from)}. Hop up to ${fmtN(to)}.`, c.hops.length > 1 ? `Add the hops: ${c.hops.map(fmtN).join(' + ')} = ${fmtN(c.total)}` : `That is one hop of ${fmtN(c.hops[0])}.`],
    c.total,
    { line: c.pts },
  )
}
/** Add k to start one place-piece at a time (biggest piece first). */
function hopAdd(start: number, k: number) {
  const pts = [start]
  const steps: string[] = []
  let cur = start
  for (const p of pieces(k)) {
    steps.push(`${fmtN(cur)} + ${fmtN(p)} = ${fmtN(cur + p)}`)
    cur += p
    pts.push(cur)
  }
  return { pts, steps, end: cur }
}
function hopSub(start: number, k: number) {
  const pts = [start]
  const steps: string[] = []
  let cur = start
  for (const p of pieces(k)) {
    steps.push(`${fmtN(cur)} − ${fmtN(p)} = ${fmtN(cur - p)}`)
    cur -= p
    pts.push(cur)
  }
  return { pts, steps, end: cur }
}
/** Tens with tens, ones with ones (two-digit style; works for any size by pieces of place value). */
function byPlace(a: number, b: number): { steps: string[]; result: number } {
  const steps: string[] = []
  const parts: number[] = []
  for (const pl of places(Math.max(a, b)).reverse()) {
    const x = dig(a, pl) * pl
    const y = dig(b, pl) * pl
    if (!x && !y) continue
    steps.push(`${PLN[pl]}: ${fmtN(x)} + ${fmtN(y)} = ${fmtN(x + y)}`)
    parts.push(x + y)
  }
  if (parts.length > 1) steps.push(`${parts.map(fmtN).join(' + ')} = ${fmtN(sum(parts))}`)
  else steps.unshift('Add each place by itself.')
  return { steps, result: sum(parts) }
}

/** A written problem stacked the school way. */
const stackHTML = (a: number, b: number, op: '+' | '−', ans: number) =>
  `<div style="text-align:center"><div style="display:inline-block;text-align:right;font:700 30px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#1d2b36"><div>${fmtN(a)}</div><div><span style="color:#d84315;margin-right:14px">${op}</span>${fmtN(b)}</div><div style="border-top:4px solid #37474f;color:#2e7d32">${fmtN(ans)}</div></div></div>`

/** Number bond: the whole on top, the two parts below. `hide` (0 whole, 1 left, 2 right) is drawn as "?". */
const bondSVG = (whole: number, p1: number, p2: number, hide: number) => {
  const node = (x: number, y: number, v: number, i: number) =>
    `<circle cx="${x}" cy="${y}" r="30" fill="${i === hide ? '#fff3c4' : '#e3f2fd'}" stroke="#37474f" stroke-width="3"/><text x="${x}" y="${y + 8}" text-anchor="middle" font-size="24" font-weight="700" fill="#1d2b36">${i === hide ? '?' : v}</text>`
  return `<svg viewBox="0 0 260 170" style="width:100%;max-width:260px;display:block;margin:0 auto" role="img" aria-label="number bond"><line x1="130" y1="40" x2="60" y2="125" stroke="#37474f" stroke-width="3"/><line x1="130" y1="40" x2="200" y2="125" stroke="#37474f" stroke-width="3"/>${node(130, 40, whole, 0)}${node(60, 125, p1, 1)}${node(200, 125, p2, 2)}<text x="130" y="165" text-anchor="middle" font-size="14" fill="#546e7a">whole on top, parts below</text></svg>`
}

/** Two bars to compare. The gap between them is marked; "?" sits on the unknown piece (0 long bar, 1 short bar, 2 gap). */
const barsSVG = (big: number, small: number, hide: number) => {
  const W = 300
  const wb = W
  const ws = Math.max(50, Math.min(W - 46, Math.round((small / big) * W)))
  const lab = (v: number, i: number) => (i === hide ? '?' : fmtN(v))
  return `<svg viewBox="0 0 340 130" style="width:100%;max-width:420px;display:block;margin:0 auto" role="img" aria-label="two bars to compare"><rect x="20" y="10" width="${wb}" height="40" rx="8" fill="#bbdefb" stroke="#37474f" stroke-width="2.5"/><text x="${20 + wb / 2}" y="37" text-anchor="middle" font-size="20" font-weight="700" fill="#1d2b36">${lab(big, 0)}</text><rect x="20" y="66" width="${ws}" height="40" rx="8" fill="#c8e6c9" stroke="#37474f" stroke-width="2.5"/><text x="${20 + ws / 2}" y="93" text-anchor="middle" font-size="20" font-weight="700" fill="#1d2b36">${lab(small, 1)}</text><rect x="${20 + ws}" y="66" width="${wb - ws}" height="40" rx="8" fill="#fff3c4" stroke="#d84315" stroke-width="2.5" stroke-dasharray="7 5"/><text x="${20 + ws + (wb - ws) / 2}" y="93" text-anchor="middle" font-size="20" font-weight="700" fill="#d84315">${lab(big - small, 2)}</text><text x="170" y="125" text-anchor="middle" font-size="14" fill="#546e7a">the dashed part is the gap</text></svg>`
}

/* ------------------------------------------------------------------ */

const doubles: Gen = (rng, d) => {
  const r = R(rng)
  const near = d === 1 ? false : r.chance(d === 2 ? 0.7 : 0.8)
  const a = d === 1 ? r.int(2, 10) : d === 2 ? r.int(3, 9) : r.int(6, 15)
  const b = near ? a + 1 : a
  const [x, y] = near && r.chance() ? [b, a] : [a, b]
  const ans = x + y
  const strategies: Strat[] = []
  if (!near) {
    if (a > 5) {
      const base = a > 10 ? 10 : 5
      const rest = a - base
      strategies.push(strat('Break It Apart', [`Break ${a} into ${base} and ${rest}.`, `${base} + ${base} = ${2 * base}`, `${rest} + ${rest} = ${2 * rest}`, `${2 * base} + ${2 * rest} = ${2 * base + 2 * rest}`], 2 * base + 2 * rest))
    } else {
      const pts = [a]
      for (let i = 0; i < a; i++) pts.push(pts[pts.length - 1] + 1)
      strategies.push(strat('Count On', [`Start at ${a}. Hop ${a} more, one at a time.`, `You land on ${pts[pts.length - 1]}.`], pts[pts.length - 1], { line: pts }))
    }
    strategies.push(strat('Use a Smaller Double', [`You know ${a - 1} + ${a - 1} = ${2 * (a - 1)}`, `Each ${a - 1} grew by 1 to make ${a}. That is 2 more.`, `${2 * (a - 1)} + 2 = ${2 * (a - 1) + 2}`], 2 * (a - 1) + 2))
  } else {
    strategies.push(strat('Double and One More', [`${b} is 1 more than ${a}.`, `Double the small one: ${a} + ${a} = ${2 * a}`, `Add the 1 more: ${2 * a} + 1 = ${2 * a + 1}`], 2 * a + 1))
    strategies.push(strat('Double and One Less', [`${a} is 1 less than ${b}.`, `Double the big one: ${b} + ${b} = ${2 * b}`, `Take the 1 away: ${2 * b} − 1 = ${2 * b - 1}`], 2 * b - 1))
    if (b < 10 && a + b > 10) {
      const give = 10 - b
      strategies.push(strat('Make Ten', [`${b} needs ${give} to make 10. Take ${give} from ${a}.`, `${a} − ${give} = ${a - give}`, `10 + ${a - give} = ${10 + a - give}`], 10 + (a - give), { line: [b, 10, 10 + a - give] }))
    }
  }
  return {
    prompt: `What is ${x} plus ${y}?`,
    eq: `${x} + ${y} = ${Q}`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies,
    // near double: stopped at the double; double: off by one or two
    distractors: near ? wrongs(ans, [2 * a, 2 * b, ans - 2, ans + 2]) : wrongs(ans, [ans + 1, ans - 1, ans - 2, a + 2]),
    operands: [x, y],
    difficulty: d,
  }
}

const factFamilies: Gen = (rng, d) => {
  const r = R(rng)
  let a = 0
  let b = 0
  do {
    a = d === 1 ? r.int(2, 6) : d === 2 ? r.int(4, 9) : r.int(5, 12)
    b = d === 1 ? r.int(2, 6) : r.int(4, 9)
  } while (a + b > 20 || (d > 1 && a + b < 11))
  const c = a + b
  // form: [known fact, question, missing value, which number-bond spot is hidden]
  const forms = {
    takePart: { known: `${a} + ${b} = ${c}`, ask: `${c} − ${a} = ${Q}`, say: `${c} − ${a}`, miss: b, other: a, whole: false },
    addUp: { known: `${c} − ${a} = ${b}`, ask: `${b} + ${Q} = ${c}`, say: `${b} + what number = ${c}`, miss: a, other: b, whole: false },
    takeWhat: { known: `${a} + ${b} = ${c}`, ask: `${c} − ${Q} = ${a}`, say: `${c} − what number = ${a}`, miss: b, other: a, whole: false },
    findWhole: { known: `${c} − ${a} = ${b}`, ask: `${Q} − ${b} = ${a}`, say: `what number − ${b} = ${a}`, miss: c, other: a, whole: true },
  }
  const f = forms[d === 1 ? 'takePart' : d === 2 ? r.pick(['takePart', 'addUp', 'takeWhat'] as const) : r.pick(['addUp', 'takeWhat', 'findWhole'] as const)]
  const ans = f.miss
  // the family member that is not already in the question
  const fromFamily = f.whole ? a + b + c - a - b : a + b + c - c - f.other
  const family = strat(
    'Use the Fact Family',
    [`The family is ${a}, ${b} and ${c}. ${c} is the whole. ${a} and ${b} are the parts.`, `Every fact in the family uses the same three numbers.`, `The question has ${f.whole ? `${a} and ${b}` : `${c} and ${f.other}`}. So ${fromFamily} is missing.`],
    fromFamily,
    { html: bondSVG(c, a, b, f.whole ? 0 : f.miss === a ? 1 : 2) },
  )
  let second: Strat
  if (f.whole) {
    const give = 10 - a
    second =
      a < 10 && c > 10 && give < b
        ? strat('Put the Parts Together', [`The whole is both parts put together: ${a} and ${b}.`, `Make ten first: ${a} + ${give} = 10`, `Then the rest: 10 + ${b - give} = ${10 + b - give}`], 10 + b - give, { line: [a, 10, 10 + b - give] })
        : strat('Put the Parts Together', [`The whole is both parts put together.`, `${a} + ${b} = ${a + b}`], a + b, { line: [a, a + b] })
  } else {
    const p = f.other
    second =
      p < 10 && c > 10
        ? strat('Count Up', [`Start at ${p}. Hop ${10 - p} to get to 10.`, `Hop ${c - 10} more to get to ${c}.`, `${10 - p} + ${c - 10} = ${10 - p + (c - 10)}`], 10 - p + (c - 10), { line: [p, 10, c] })
        : strat('Count Up', [`Start at ${p}. Count up to ${c}.`, `That is ${c - p} hops.`], c - p, { line: [p, c] })
  }
  return {
    prompt: `You know ${f.known}. Use it to find the missing number.`,
    eq: f.ask,
    input: 'number',
    answer: ans,
    strategies: [family, second],
    // wrote a number already in the question, added when it should be the gap, off by one
    distractors: f.whole ? wrongs(ans, [Math.abs(a - b), ans - 1, ans + 1, ans - 10]) : wrongs(ans, [c + f.other, f.other, ans + 1, ans - 1]),
    operands: [a, b, c],
    difficulty: d,
  }
}

const make100: Gen = (rng, d) => {
  const r = R(rng)
  const a = d === 1 ? r.int(1, 9) * 10 : d === 2 ? r.int(1, 19) * 5 : r.int(11, 89)
  const ans = 100 - a
  const toTen = (10 - (a % 10)) % 10
  const flat = a - (a % 10)
  return {
    prompt: `${a} plus what number makes 100?`,
    eq: `${a} + ${Q} = 100`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies: [
      toTen
        ? strat('Count Up', [`Start at ${a}. Hop ${toTen} to get to ${a + toTen}.`, `Then hop ${100 - a - toTen} more to 100.`, `${toTen} + ${100 - a - toTen} = ${toTen + (100 - a - toTen)}`], toTen + (100 - a - toTen), { line: [a, a + toTen, 100] })
        : strat('Count Up by Tens', [`Start at ${a} and count by tens to 100.`, `That is ${(100 - a) / 10} tens.`, `${(100 - a) / 10} × 10 = ${((100 - a) / 10) * 10}`], ((100 - a) / 10) * 10, { line: [a, 100] }),
      strat('Take It Away', [`100 − ${a} is the missing number.`, `100 − ${flat} = ${100 - flat}`, ...(a % 10 ? [`${100 - flat} − ${a % 10} = ${100 - flat - (a % 10)}`] : [])], 100 - flat - (a % 10)),
    ],
    // tens add to 100 AND ones add to 10 (a classic), off by ten, off by one
    distractors: wrongs(ans, [a % 10 ? ans + 10 : ans + 1, ans - 10, ans + 1]),
    operands: [a, 100],
    difficulty: d,
  }
}

const threeAddends: Gen = (rng, d) => {
  const r = R(rng)
  let nums: number[]
  if (d === 1) {
    const x = r.int(1, 9)
    nums = r.shuffle([x, 10 - x, r.int(2, 9)])
  } else {
    const hiT = d === 2 ? 3 : 2
    const any = () => r.int(11, hiT * 10 + 9)
    nums = [any(), any(), any()]
    if (d === 3) nums.push(any())
    if (r.chance(0.6)) {
      const n1 = r.int(1, hiT) * 10 + r.int(1, 9)
      nums[0] = n1
      nums[1] = r.int(1, hiT) * 10 + (10 - (n1 % 10))
    }
    nums = r.shuffle(nums)
  }
  const ans = sum(nums)
  const strategies: Strat[] = []
  // friends: two numbers whose ones make a ten
  let fi = -1
  let fj = -1
  for (let i = 0; i < nums.length && fi < 0; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] % 10 && (nums[i] % 10) + (nums[j] % 10) === 10) [fi, fj] = fi < 0 ? [i, j] : [fi, fj]
  if (fi >= 0) {
    const p = nums[fi]
    const q = nums[fj]
    const rest = nums.filter((_, i) => i !== fi && i !== fj)
    const steps = [p + q === 10 ? `Look for two numbers that make 10: ${p} and ${q}.` : `${p} and ${q} are friends. Their ones make a ten.`, `${p} + ${q} = ${p + q}`]
    let cur = p + q
    for (const n of rest) {
      steps.push(`${cur} + ${n} = ${cur + n}`)
      cur += n
    }
    strategies.push(strat(p + q === 10 ? 'Make Ten First' : 'Find Friends', steps, cur))
  }
  if (d > 1) {
    const T = nums.map((n) => tensOf(n))
    const O = nums.map((n) => n % 10)
    strategies.push(strat('Tens and Ones', [`Tens: ${T.join(' + ')} = ${sum(T)}`, `Ones: ${O.join(' + ')} = ${sum(O)}`, `${sum(T)} + ${sum(O)} = ${sum(T) + sum(O)}`], sum(T) + sum(O)))
  }
  {
    const pts = [nums[0]]
    const steps: string[] = []
    for (const n of nums.slice(1)) {
      const cur = pts[pts.length - 1]
      steps.push(`${cur} + ${n} = ${cur + n}`)
      pts.push(cur + n)
    }
    strategies.push(strat('Add in Order', steps, pts[pts.length - 1], { line: pts }))
  }
  const onesSum = sum(nums.map((n) => n % 10))
  return {
    prompt: `What is ${nums.join(' plus ')}?`,
    eq: `${nums.join(' + ')} = ${Q}`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies,
    // dropped the carried tens, skipped the last number, off by ten or one
    distractors: wrongs(ans, [onesSum >= 10 && d > 1 ? sum(nums.map(tensOf)) + (onesSum % 10) : ans - 1, ans - nums[nums.length - 1], ans + 10, ans - 10, ans + 1]),
    operands: nums,
    difficulty: d,
  }
}

const CMP = [
  { past: 'hit', base: 'hit', noun: 'balls' },
  { past: 'found', base: 'find', noun: 'shells' },
  { past: 'caught', base: 'catch', noun: 'waves' },
  { past: 'did', base: 'do', noun: 'jumps' },
  { past: 'used', base: 'use', noun: 'bricks' },
  { past: 'got', base: 'get', noun: 'stickers' },
  { past: 'threw', base: 'throw', noun: 'pitches' },
  { past: 'read', base: 'read', noun: 'pages' },
] as const

/** Subtraction strategies shared by the story skills: count up, or take away in parts. */
const gapStrats = (big: number, small: number, lead: string, html?: string): Strat[] => {
  const t = hopSub(big, small)
  return [countUpStrat('Count Up', small, big), strat('Take Away in Parts', [lead, ...t.steps], t.end, html ? { html } : {})]
}
const joinStrats = (base: number, k: number, html?: string): Strat[] => {
  const p = byPlace(base, k)
  const h = hopAdd(base, k)
  return [strat('Tens and Ones', p.steps, p.result, html ? { html } : {}), strat('Hop on a Number Line', [`Start at ${fmtN(base)}. Hop ${fmtN(k)} more.`, ...h.steps], h.end, { line: h.pts })]
}

const wordCompare: Gen = (rng, d) => {
  const r = R(rng)
  const c = r.pick(CMP)
  const [o1, o2] = r.shuffle(KIDS)
  const [A, B] = r.chance(0.5) ? ['{n}', o1] : r.chance(0.5) ? [o1, '{n}'] : [o1, o2]
  const type = d === 1 ? r.pick(['more', 'fewer'] as const) : d === 2 ? r.pick(['more', 'fewer', 'bigger', 'smaller'] as const) : r.pick(['more', 'bigger', 'smaller', 'tricky', 'tricky'] as const)
  let big: number
  let small: number
  if (d === 1) {
    big = r.int(8, 20)
    small = r.int(2, big - 2)
  } else {
    big = r.int(d === 2 ? 30 : 41, d === 2 ? 80 : 100)
    small = r.int(d === 2 ? 11 : 13, big - (d === 2 ? 6 : 12))
  }
  const k = big - small
  let prompt: string
  let ans: number
  let strategies: Strat[]
  let distractors: number[]
  let operands: number[]
  if (type === 'more' || type === 'fewer') {
    // A has big, B has small; the gap is unknown
    prompt = `${A} ${c.past} ${big} ${c.noun}. ${B} ${c.past} ${small} ${c.noun}. ` + (type === 'more' ? `How many more ${c.noun} did ${A} ${c.base} than ${B}?` : `How many fewer ${c.noun} did ${B} ${c.base} than ${A}?`)
    ans = big - small
    strategies = gapStrats(big, small, `The gap is the big number take away the small number.`, barsSVG(big, small, 2))
    distractors = wrongs(ans, [big + small, digitGap(big, small), ans + 10, ans - 10, big].filter((x) => x > 0))
    operands = [big, small]
  } else if (type === 'bigger') {
    prompt = `${B} ${c.past} ${small} ${c.noun}. ${A} ${c.past} ${k} more ${c.noun} than ${B}. How many ${c.noun} did ${A} ${c.base}?`
    ans = small + k
    strategies = joinStrats(small, k, barsSVG(big, small, 0))
    distractors = wrongs(ans, [Math.abs(small - k), noCarry(small, k), ans + 10, small])
    operands = [small, k]
  } else {
    prompt =
      type === 'smaller'
        ? `${A} ${c.past} ${big} ${c.noun}. ${B} ${c.past} ${k} fewer ${c.noun} than ${A}. How many ${c.noun} did ${B} ${c.base}?`
        : `${A} ${c.past} ${big} ${c.noun}. That is ${k} more than ${B} ${c.past}. How many ${c.noun} did ${B} ${c.base}?`
    ans = big - k
    strategies = gapStrats(big, k, type === 'smaller' ? `Fewer means take away. Take ${k} from ${big}.` : `${big} is the bigger pile. The other pile is ${k} smaller. Take ${k} from ${big}.`, barsSVG(big, small, 1))
    // "more" does not always mean add
    distractors = wrongs(ans, [big + k, digitGap(big, k), ans + 10, ans - 10].filter((x) => x > 0))
    operands = [big, k]
  }
  return { prompt, input: 'number', answer: ans, strategies, distractors, operands, difficulty: d }
}

const mental: Gen = (rng, d) => {
  const r = R(rng)
  const plus = r.chance()
  let n = 0
  let k = 0
  const mode = d === 1 ? r.pick(['ten', 'hundred'] as const) : d === 2 ? r.pick(['crossTen', 'tens', 'hundred'] as const) : r.pick(['crossTens', 'crossTens', 'hundreds'] as const)
  const o = r.int(0, 9)
  if (mode === 'ten') {
    k = 10
    n = r.int(1, 9) * 100 + r.int(1, 8) * 10 + o
  } else if (mode === 'hundred') {
    k = 100
    n = (plus ? r.int(1, 8) : r.int(d === 1 ? 2 : 1, 9)) * 100 + r.int(0, 9) * 10 + o
  } else if (mode === 'crossTen') {
    k = 10
    n = plus ? r.int(1, 8) * 100 + 90 + o : r.int(1, 9) * 100 + o
  } else if (mode === 'tens') {
    const kt = r.int(2, 5)
    k = kt * 10
    const t = plus ? r.int(0, 9 - kt) : r.int(kt, 9)
    n = r.int(1, 9) * 100 + t * 10 + o
  } else if (mode === 'crossTens') {
    const kt = r.int(2, 9)
    k = kt * 10
    const t = plus ? r.int(10 - kt, 9) : r.int(0, kt - 1)
    n = (plus ? r.int(1, 8) : r.int(1, 9)) * 100 + t * 10 + o
  } else {
    const kh = r.int(2, 5)
    k = kh * 100
    n = (plus ? r.int(1, 9 - kh) : r.int(kh, 9)) * 100 + r.int(0, 9) * 10 + o
  }
  const s = plus ? 1 : -1
  const ans = n + s * k
  const sg = plus ? '+' : '−'
  const H = Math.floor(n / 100)
  const td = dig(n, 10)
  const crossing = k < 100 && Math.floor(ans / 100) !== H
  const strategies: Strat[] = []
  if (k >= 100) {
    const H2 = H + s * (k / 100)
    strategies.push(strat('Change One Digit', [`Only the hundreds change. ${n} has ${H} hundred${H === 1 ? '' : 's'}.`, `${H} ${sg} ${k / 100} = ${H2}`, `The tens and ones stay the same. You get ${fmtN(H2 * 100 + (n % 100))}.`], H2 * 100 + (n % 100)))
    const pts = [n]
    for (let i = 0; i < k / 100; i++) pts.push(pts[pts.length - 1] + s * 100)
    strategies.push(strat('Count by Hundreds', [`Start at ${n}. Count ${plus ? 'up' : 'back'} by hundreds, ${k / 100} time${k > 100 ? 's' : ''}.`, `${pts.join(', ')}`], pts[pts.length - 1], { line: pts }))
  } else {
    if (!crossing) {
      const td2 = td + s * (k / 10)
      strategies.push(strat('Change One Digit', [`Only the tens change. The tens digit of ${n} is ${td}.`, `${td} ${sg} ${k / 10} = ${td2}`, `The other digits stay the same. You get ${H * 100 + td2 * 10 + (n % 10)}.`], H * 100 + td2 * 10 + (n % 10)))
      strategies.push(strat('Number Line', [`Start at ${n}.`, `Hop ${plus ? 'up' : 'back'} ${k}: ${n} ${sg} ${k} = ${n + s * k}`], n + s * k, { line: [n, n + s * k] }))
    } else {
      const T = Math.floor(n / 10)
      const T2 = T + s * (k / 10)
      strategies.push(strat('Count the Tens', [`${n} is ${T} tens and ${n % 10} ones.`, `${T} ${sg} ${k / 10} = ${T2}`, `${T2} tens and ${n % 10} ones is ${T2 * 10 + (n % 10)}.`], T2 * 10 + (n % 10)))
      const first = plus ? 100 - (n % 100) : n % 100
      const stop = plus ? n + first : n - first
      if (first > 0 && first < k) {
        const end = stop + s * (k - first)
        strategies.push(strat('Hop Through the Hundred', [`Hop ${first} ${plus ? 'up' : 'back'} to ${stop}.`, `You need ${k} in all. ${k} − ${first} = ${k - first} more.`, `${stop} ${sg} ${k - first} = ${end}`], end, { line: [n, stop, end] }))
      } else strategies.push(strat('Number Line', [`Start at ${n}.`, `Hop ${plus ? 'up' : 'back'} ${k}: ${n} ${sg} ${k} = ${n + s * k}`], n + s * k, { line: [n, n + s * k] }))
    }
  }
  const wrap = H * 100 + ((((td + s * (k / 10)) % 10) + 10) % 10) * 10 + (n % 10)
  return {
    prompt: `What is ${k} ${plus ? 'more' : 'less'} than ${n}?`,
    eq: `${n} ${sg} ${k} = ${Q}`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies,
    // changed the wrong place, went the wrong way, forgot the new hundred
    distractors: wrongs(ans, [k >= 100 ? n + (s * k) / 10 : n + s * k * 10, n - s * k, ...(crossing ? [wrap] : []), k >= 100 ? ans + 10 : n + (s * k) / 10].filter((x) => x <= 1999)),
    operands: [n, k],
    difficulty: d,
  }
}

const EST_ADD = [
  (a: number, b: number) => [`A team got ${a} hits in May and ${b} hits in June.`, 'About how many hits in all?'],
  (a: number, b: number) => [`{n} has ${a} red bricks and ${b} blue bricks.`, 'About how many bricks in all?'],
  (a: number, b: number) => [`${a} kids came to the game on Friday. ${b} kids came on Sunday.`, 'About how many kids in all?'],
  (a: number, b: number) => [`A surf shop sold ${a} boards last year and ${b} boards this year.`, 'About how many boards in all?'],
] as const
const EST_SUB = [
  (a: number, b: number) => [`{n} had ${a} cards and gave away ${b}.`, 'About how many cards are left?'],
  (a: number, b: number) => [`A box had ${a} bricks. {n} used ${b} of them.`, 'About how many bricks are left?'],
  (a: number, b: number) => [`The park has ${a} seats. ${b} seats are full.`, 'About how many seats are empty?'],
  (a: number, b: number) => [`A dance show has ${a} tickets. ${b} are sold.`, 'About how many tickets are left?'],
] as const

const estimate: Gen = (rng, d) => {
  const r = R(rng)
  const unit = d === 1 ? 10 : d === 2 ? (r.chance(0.6) ? 10 : 100) : r.chance(0.7) ? 100 : 10
  const plus = d === 1 ? true : r.chance()
  const round = (n: number) => Math.floor(n / unit) * unit + ((n % unit) * 2 >= unit ? unit : 0)
  const ok = (n: number) => n % unit !== 0 && (d === 3 || (n % unit) * 2 !== unit)
  let a = 0
  let b = 0
  for (;;) {
    if (unit === 10 && d < 3) {
      a = r.int(11, d === 1 ? 49 : 98)
      b = r.int(11, d === 1 ? 49 : 98)
    } else if (unit === 10) {
      a = r.int(111, 889)
      b = r.int(12, 98)
    } else {
      a = r.int(101, d === 2 ? 589 : 899)
      b = r.int(101, d === 2 ? 389 : 899)
    }
    if (!plus && a < b) [a, b] = [b, a]
    if (!ok(a) || !ok(b)) continue
    if (plus ? round(a) + round(b) <= (unit === 10 && d < 3 ? 190 : 1500) : round(a) - round(b) >= unit) break
  }
  const sg = plus ? '+' : '−'
  const s = plus ? 1 : -1
  const uw = unit === 10 ? 'ten' : 'hundred'
  const ans = round(a) + s * round(b)
  // way 1: the rounding rule (look at the digit to the right)
  const ruleRound = (n: number) => {
    const dg = dig(n, unit / 10)
    const up = dg >= 5
    const flat = n - (n % unit)
    return { v: up ? flat + unit : flat, text: `${fmtN(n)}: the ${unit === 10 ? 'ones' : 'tens'} digit is ${dg}. ${up ? '5 or more, so round up' : 'Less than 5, so round down'} to ${fmtN(up ? flat + unit : flat)}.` }
  }
  // way 2: which friendly number is closer
  const nearRound = (n: number) => {
    const lo = n - (n % unit)
    const hi = lo + unit
    const v = n - lo < hi - n ? lo : hi
    return { v, text: `${fmtN(n)} is ${n - lo} from ${fmtN(lo)} and ${hi - n} from ${fmtN(hi)}. ${n - lo === hi - n ? `It is in the middle, so go up to ${fmtN(hi)}.` : `${fmtN(v)} is closer.`}` }
  }
  const [ra, rb] = [ruleRound(a), ruleRound(b)]
  const [na, nb] = [nearRound(a), nearRound(b)]
  const cnt = na.v / unit + s * (nb.v / unit)
  const story = r.chance(d === 1 ? 0.4 : 0.5) ? r.pick(plus ? EST_ADD : EST_SUB)(a, b) : null
  return {
    prompt: story ? `${story[0]} Round each number to the nearest ${uw}. ${story[1]}` : `Round each number to the nearest ${uw}. Then ${plus ? 'add' : 'subtract'}. About how much is ${fmtN(a)} ${sg} ${fmtN(b)}?`,
    eq: `${fmtN(a)} ${sg} ${fmtN(b)} is about ${Q}`,
    input: 'number',
    answer: ans,
    strategies: [
      strat('Round by the Digit', [ra.text, rb.text, `${fmtN(ra.v)} ${sg} ${fmtN(rb.v)} = ${fmtN(ra.v + s * rb.v)}`], ra.v + s * rb.v),
      strat('Which Is Closer?', [na.text, nb.text, `Think in ${uw}s: ${na.v / unit} ${sg} ${nb.v / unit} = ${cnt}`, `${cnt} ${uw}${cnt === 1 ? '' : 's'} is ${fmtN(cnt * unit)}.`], cnt * unit),
    ],
    // did not round, rounded both down, rounded both up, off by one ten/hundred
    distractors: wrongs(ans, [a + s * b, a - (a % unit) + s * (b - (b % unit)), a - (a % unit) + unit + s * (b - (b % unit) + unit), ans + unit, ans - unit]),
    operands: [a, b, unit],
    difficulty: d,
  }
}

const compensation: Gen = (rng, d) => {
  const r = R(rng)
  let a = 0
  let b = 0
  let plus = true
  if (d === 1) {
    b = r.int(1, 3) * 10 + r.pick([8, 9])
    a = r.int(12, 99 - b)
  } else if (d === 2) {
    plus = r.chance()
    b = r.int(1, 4) * 10 + r.pick([8, 9, 9])
    a = plus ? r.int(113, 880) : r.int(b + 12, 98)
  } else {
    plus = r.chance()
    b = r.int(1, 3) * 100 - r.pick([1, 1, 2, 3])
    a = plus ? r.int(114, 995 - b) : r.int(b + 15, 990)
  }
  if (a % 10 === 0) a += r.int(1, 7)
  const k = (d === 3 ? 100 : 10) - (b % (d === 3 ? 100 : 10))
  const Rb = b + k
  const ans = plus ? a + b : a - b
  const col = plus ? colAdd(a, b) : colSub(a, b)
  const strategies = plus
    ? [
        strat('Make It Friendly', [`${b} is close to ${Rb}. Add ${Rb}: ${a} + ${Rb} = ${fmtN(a + Rb)}`, `That was ${k} too many. Take ${k} back.`, `${fmtN(a + Rb)} − ${k} = ${fmtN(a + Rb - k)}`], a + Rb - k, { line: [a, a + Rb, a + Rb - k] }),
        strat('Give and Take', [`Move ${k} from ${a} over to ${b}. The total stays the same.`, `${a} − ${k} = ${a - k} and ${b} + ${k} = ${Rb}`, `${a - k} + ${Rb} = ${fmtN(a - k + Rb)}`], a - k + Rb),
        strat('Line Up the Places', col.steps, col.result, { html: stackHTML(a, b, '+', col.result) }),
      ]
    : [
        strat('Make It Friendly', [`${b} is close to ${Rb}. Take away ${Rb}: ${a} − ${Rb} = ${a - Rb}`, `That took ${k} too many. Put ${k} back.`, `${a - Rb} + ${k} = ${a - Rb + k}`], a - Rb + k, { line: [a, a - Rb, a - Rb + k] }),
        strat('Slide Both Numbers', [`Add ${k} to both numbers. The gap between them stays the same.`, `${a} + ${k} = ${a + k} and ${b} + ${k} = ${Rb}`, `${a + k} − ${Rb} = ${a + k - Rb}`], a + k - Rb),
        strat('Line Up the Places', col.steps, col.result, { html: stackHTML(a, b, '−', col.result) }),
      ]
  return {
    prompt: `What is ${a} ${plus ? 'plus' : 'minus'} ${b}?`,
    eq: `${a} ${plus ? '+' : '−'} ${b} = ${Q}`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies,
    // fixed it the wrong way, forgot to fix it, off by ten
    distractors: plus ? wrongs(ans, [a + Rb + k, a + Rb, ans - 10, noCarry(a, b)]) : wrongs(ans, [a - Rb - k, a - Rb, ans + 10, digitGap(a, b)]),
    operands: [a, b],
    difficulty: d,
  }
}

const checkOpposite: Gen = (rng, d) => {
  const r = R(rng)
  let p = 0
  let q = 0
  do {
    if (d < 3) {
      p = r.int(12, 59)
      q = r.int(12, 99 - p - 1 < 12 ? 12 : Math.min(59, 99 - p))
    } else {
      p = r.int(105, 560)
      q = r.int(38, 390)
    }
  } while (p === q || p + q > 999 || (d < 3 && p + q > 99) || p % 10 === 0 || q % 10 === 0)
  const big = p + q
  const type = d === 1 ? 'which' : d === 2 ? r.pick(['agree', 'find'] as const) : r.pick(['which', 'agree', 'find'] as const)
  const sub = r.chance(0.6) // the fact being checked is a subtraction
  const f = fmtN
  if (type === 'which') {
    const back = q + p // undo: start from the answer and put p back
    const cands = sub ? [`${f(q)} + ${f(p)} = ${f(back)}`, `${f(big)} + ${f(p)} = ${f(big + p)}`, `${f(big)} + ${f(q)} = ${f(big + q)}`, `${f(q)} + ${f(q)} = ${f(q + q)}`] : [`${f(big)} − ${f(q)} = ${f(big - q)}`, `${f(big)} + ${f(q)} = ${f(big + q)}`, `${f(big)} + ${f(p)} = ${f(big + p)}`, `${f(Math.max(p, q))} − ${f(Math.min(p, q))} = ${f(Math.abs(p - q))}`]
    const ch = choice(cands[0], cands.slice(1), rng)
    // way 2: the only choice built from the same three numbers
    const fam = [p, q, big].map(f).sort().join('|')
    const same = ch.choices!.filter((c) => (c.match(/[\d,]+/g) || []).sort().join('|') === fam)
    return {
      prompt: sub ? `${f(big)} − ${f(p)} = ${f(q)}. Which addition fact checks it?` : `${f(p)} + ${f(q)} = ${f(big)}. Which subtraction fact checks it?`,
      ...ch,
      strategies: [
        sub
          ? strat('Undo It', [`Taking away ${f(p)} can be undone by adding ${f(p)}.`, `Start with the answer, ${f(q)}. Add ${f(p)} back.`, `If you land on ${f(big)}, the fact checks out.`], `${f(q)} + ${f(p)} = ${f(back)}`)
          : strat('Undo It', [`Adding ${f(q)} can be undone by taking away ${f(q)}.`, `Start with the total, ${f(big)}. Take ${f(q)} away.`, `If you land on ${f(p)}, the fact checks out.`], `${f(big)} − ${f(q)} = ${f(big - q)}`),
        strat('Same Three Numbers', [`A check uses the same three numbers: ${f(p)}, ${f(q)} and ${f(big)}.`, `${f(big)} is the whole. ${f(p)} and ${f(q)} are the parts.`, `Only one choice uses all three, with the opposite sign.`], same.length === 1 ? same[0] : ''),
      ],
      operands: [big, p, q],
      difficulty: d,
    }
  }
  if (type === 'agree') {
    const N = r.pick(KIDS)
    const real = sub ? q : big
    const isTrue = r.chance(0.4)
    const slips = sub ? [real + 10, real - 10, digitGap(big, p), real + 1] : [real - 10, real + 10, noCarry(p, q), real - 1]
    const shown = isTrue ? real : r.pick(slips.filter((x) => x !== real && x > 0))
    const yn = (t: boolean) => (t ? 'Yes' : 'No')
    let s1: Strat
    let s2: Strat
    if (sub) {
      const back = colAdd(shown, p).result
      s1 = strat('Add It Back', [`If ${N} is right, ${f(shown)} plus ${f(p)} makes ${f(big)}.`, `${f(shown)} + ${f(p)} = ${f(shown + p)}`, back === big ? `That is ${f(big)}. It checks out. Yes!` : `That is not ${f(big)}, so no. Try again to get ${f(big - p)}.`], yn(back === big))
      const c = countUp(p, big)
      s2 = strat('Solve It Yourself', [`Count up from ${f(p)} to ${f(big)}.`, c.hops.length > 1 ? `Add the hops: ${c.hops.map(f).join(' + ')} = ${f(c.total)}` : `That is one hop of ${f(c.total)}.`, `${N} said ${f(shown)}. ${c.total === shown ? 'It matches. Yes!' : 'It does not match, so no.'}`], yn(c.total === shown), { line: c.pts })
    } else {
      const back = shown - q
      s1 = strat('Take It Back Off', [`If ${N} is right, ${f(shown)} take away ${f(q)} leaves ${f(p)}.`, `${f(shown)} − ${f(q)} = ${f(back)}`, back === p ? `That is ${f(p)}. It checks out. Yes!` : `That is not ${f(p)}, so no. Try again to get ${f(p + q)}.`], yn(back === p))
      const bp = byPlace(p, q)
      s2 = strat('Solve It Yourself', [...bp.steps, `${N} said ${f(shown)}. ${bp.result === shown ? 'It matches. Yes!' : 'It does not match, so no.'}`], yn(bp.result === shown))
    }
    return {
      prompt: sub ? `${N} says ${f(big)} − ${f(p)} = ${f(shown)}. Check it with addition. Is ${N} right?` : `${N} says ${f(p)} + ${f(q)} = ${f(shown)}. Check it with subtraction. Is ${N} right?`,
      ...choice(yn(isTrue), ['Yes', 'No'], rng, true),
      strategies: [s1, s2],
      operands: [big, p, q, shown],
      difficulty: d,
    }
  }
  // find the start number with the opposite operation
  if (sub) {
    const bp = byPlace(q, p)
    const h = hopAdd(q, p)
    return {
      prompt: `A number minus ${f(p)} equals ${f(q)}. Use the opposite to find the number.`,
      eq: `${Q} − ${f(p)} = ${f(q)}`,
      input: 'number',
      answer: big,
      strategies: [strat('Do the Opposite', [`The opposite of taking away ${f(p)} is adding ${f(p)}. Add it back to ${f(q)}.`, ...bp.steps], bp.result), strat('Hop It Back', [`Start at ${f(q)}. Hop up ${f(p)} to get back to the start.`, ...h.steps], h.end, { line: h.pts })],
      // took away again, dropped the carry, off by ten
      distractors: wrongs(big, [Math.abs(q - p), noCarry(p, q), big - 10, big + 10]),
      operands: [big, p, q],
      difficulty: d,
    }
  }
  const t = hopSub(big, p)
  const cu = countUpStrat('Count Up', p, big)
  return {
    prompt: `A number plus ${f(p)} equals ${f(big)}. Use the opposite to find the number.`,
    eq: `${Q} + ${f(p)} = ${f(big)}`,
    input: 'number',
    answer: q,
    strategies: [strat('Do the Opposite', [`The opposite of adding ${f(p)} is taking away ${f(p)}. Take it from ${f(big)}.`, ...t.steps], t.end, { line: t.pts }), cu],
    // added again, took small digits from big digits, off by ten
    distractors: wrongs(q, [big + p, digitGap(big, p), q + 10, q - 10]),
    operands: [big, p, q],
    difficulty: d,
  }
}

const subtractZeros: Gen = (rng, d) => {
  const r = R(rng)
  let a = 0
  let b = 0
  if (d === 1) {
    a = r.int(1, 9) * 100
    b = r.int(1, 9) * 10 + r.int(1, 9)
  } else if (d === 2) {
    if (r.chance()) {
      a = r.int(2, 9) * 100
      b = r.int(101, a - 11)
      if (b % 10 === 0) b += r.int(1, 9)
    } else {
      const y = r.int(1, 8)
      a = r.int(2, 9) * 100 + y
      b = r.int(1, Math.floor(a / 100) - 1) * 100 + r.int(1, 9) * 10 + r.int(y + 1, 9)
    }
  } else {
    a = r.int(1, 5) * 1000
    b = a > 1000 && r.chance(0.4) ? r.int(1, a / 1000 - 1) * 1000 + r.int(101, 989) : r.int(101, 989)
    if (b % 10 === 0) b += r.int(1, 9)
  }
  const ans = a - b
  const k = (a % 10) + 1
  const col = colSub(a, b)
  return {
    prompt: `What is ${fmtN(a)} minus ${fmtN(b)}?`,
    eq: `${fmtN(a)} − ${fmtN(b)} = ${Q}`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies: [
      countUpStrat('Count Up', b, a),
      strat('Slide Both Numbers', [`Take ${k} from both numbers. The gap between them stays the same.`, `${fmtN(a)} − ${k} = ${fmtN(a - k)} and ${fmtN(b)} − ${k} = ${fmtN(b - k)}`, `Now there are no trades: ${fmtN(a - k)} − ${fmtN(b - k)} = ${fmtN(a - k - (b - k))}`], a - k - (b - k)),
      strat('Trade Across the Zeros', col.steps, col.result, { html: stackHTML(a, b, '−', col.result) }),
    ],
    // small digit from big digit in each column, a zero became 10 not 9, forgot the hundred that was traded
    distractors: wrongs(ans, [digitGap(a, b), ans + 10, ans + 100, ans - 10]),
    operands: [a, b],
    difficulty: d,
  }
}

const NOUNS = ['cards', 'bricks', 'shells', 'stickers', 'marbles', 'coins'] as const
const GOALS = [
  { need: (N: number) => `The team needs ${N} runs to win a prize.`, got: (a: number, b: number) => `The team got ${a} runs in May and ${b} runs in June.`, ask: 'How many more runs does the team need?' },
  { need: (N: number) => `{n} needs ${N} bricks to build a tower.`, got: (a: number, b: number) => `{n} has ${a} red bricks and ${b} blue bricks.`, ask: 'How many more bricks does {n} need?' },
  { need: (N: number) => `A dance class wants to learn ${N} moves.`, got: (a: number, b: number) => `The class knows ${a} moves and learns ${b} more.`, ask: 'How many moves are left to learn?' },
  { need: (N: number) => `{n} wants to jump ${N} times at the park.`, got: (a: number, b: number) => `{n} jumps ${a} times, then ${b} more times.`, ask: 'How many jumps are left?' },
] as const

const wordTwoStep: Gen = (rng, d) => {
  const r = R(rng)
  const noun = r.pick(NOUNS)
  const [o1, o2] = r.shuffle(KIDS)
  const S = r.chance(0.6) ? '{n}' : o1
  const kind = d === 1 ? r.pick(['addSub', 'subSub', 'addAdd'] as const) : d === 2 ? r.pick(['addSub', 'subSub', 'addAdd', 'both', 'goal'] as const) : r.pick(['addSub', 'subSub', 'subAdd', 'both', 'goal'] as const)
  let a = d === 1 ? r.int(8, 15) : d === 2 ? r.int(25, 60) : r.int(110, 250)
  const b = d === 1 ? r.int(3, 9) : d === 2 ? r.int(11, 30) : r.int(25, 90)
  let c = d === 1 ? r.int(2, 7) : d === 2 ? r.int(5, 24) : r.int(15, 80)
  if (c === b) c += 1
  if (kind === 'subSub' && a < b + c + 2) a = b + c + r.int(2, 9)
  if (kind === 'subAdd' && a < b + 2) a = b + r.int(2, 9)
  let prompt: string
  let ans: number
  let strategies: Strat[]
  let distractors: number[]
  let operands = [a, b, c]
  const f = fmtN
  if (kind === 'addSub') {
    prompt = `${S} had ${a} ${noun}. ${S} got ${b} more. Then ${S} gave away ${c}. How many ${noun} does ${S} have now?`
    ans = a + b - c
    const net = b >= c ? strat('Put the Changes Together', [`Got ${b}, then gave away ${c}.`, `${b} − ${c} = ${b - c} more in the end.`, `${a} + ${b - c} = ${a + (b - c)}`], a + (b - c)) : strat('Put the Changes Together', [`Got ${b}, then gave away ${c}.`, `${c} − ${b} = ${c - b} fewer in the end.`, `${a} − ${c - b} = ${a - (c - b)}`], a - (c - b))
    strategies = [strat('One Step at a Time', [`First: ${a} + ${b} = ${a + b}`, `Then: ${a + b} − ${c} = ${a + b - c}`], a + b - c, { line: [a, a + b, a + b - c] }), net]
    distractors = wrongs(ans, [a + b, a + b + c, a - c, ans + 10])
  } else if (kind === 'subSub') {
    prompt = `${S} had ${a} ${noun}. ${S} lost ${b}. Then ${S} gave ${c} to a friend. How many ${noun} are left?`
    ans = a - b - c
    strategies = [strat('One Step at a Time', [`First: ${a} − ${b} = ${a - b}`, `Then: ${a - b} − ${c} = ${a - b - c}`], a - b - c, { line: [a, a - b, a - b - c] }), strat('Put the Changes Together', [`${b} + ${c} = ${b + c} are gone in all.`, `${a} − ${b + c} = ${a - (b + c)}`], a - (b + c))]
    distractors = wrongs(ans, [a - b, a - b + c, a - c, b + c])
  } else if (kind === 'addAdd') {
    prompt = `${S} had ${a} ${noun}. ${S} got ${b} on Monday and ${c} on Friday. How many ${noun} does ${S} have now?`
    ans = a + b + c
    strategies = [strat('One Step at a Time', [`First: ${a} + ${b} = ${a + b}`, `Then: ${a + b} + ${c} = ${a + b + c}`], a + b + c, { line: [a, a + b, a + b + c] }), strat('Put the Changes Together', [`${b} + ${c} = ${b + c} new ones in all.`, `${a} + ${b + c} = ${a + (b + c)}`], a + (b + c))]
    distractors = wrongs(ans, [a + b, b + c, a + c, ans - 10])
  } else if (kind === 'subAdd') {
    prompt = `${S} had ${a} ${noun}. ${S} gave away ${b}. Then ${S} got ${c} more. How many ${noun} does ${S} have now?`
    ans = a - b + c
    const net = c >= b ? strat('Put the Changes Together', [`Gave away ${b}, then got ${c}.`, `${c} − ${b} = ${c - b} more in the end.`, `${a} + ${c - b} = ${a + (c - b)}`], a + (c - b)) : strat('Put the Changes Together', [`Gave away ${b}, then got ${c}.`, `${b} − ${c} = ${b - c} fewer in the end.`, `${a} − ${b - c} = ${a - (b - c)}`], a - (b - c))
    strategies = [strat('One Step at a Time', [`First: ${a} − ${b} = ${a - b}`, `Then: ${a - b} + ${c} = ${a - b + c}`], a - b + c, { line: [a, a - b, a - b + c] }), net]
    distractors = wrongs(ans, [a - b, a - b - c, a + b + c, ans + 10])
  } else if (kind === 'both') {
    const x = d === 2 ? r.int(12, 40) : r.int(45, 140)
    const k = d === 2 ? r.int(4, 15) : r.int(12, 40)
    prompt = `${o1} has ${x} ${noun}. ${o2} has ${k} more than ${o1}. How many ${noun} do they have in all?`
    ans = x + x + k
    strategies = [strat('One Step at a Time', [`First find the second pile: ${x} + ${k} = ${x + k}`, `Then add both piles: ${x} + ${x + k} = ${f(x + (x + k))}`], x + (x + k)), strat('Double It', [`Pretend both have ${x}: ${x} + ${x} = ${f(2 * x)}`, `One pile has ${k} more, so add ${k}.`, `${f(2 * x)} + ${k} = ${f(2 * x + k)}`], 2 * x + k)]
    distractors = wrongs(ans, [x + k, 2 * x, ans - 10, ans + k])
    operands = [x, k]
  } else {
    const g = r.pick(GOALS)
    const N = a + b + (d === 2 ? r.int(6, 30) : r.int(20, 120))
    prompt = `${g.need(N)} ${g.got(a, b)} ${g.ask}`
    ans = N - a - b
    strategies = [strat('Add, Then Take Away', [`So far: ${a} + ${b} = ${f(a + b)}`, `Still to go: ${f(N)} − ${f(a + b)} = ${N - (a + b)}`], N - (a + b)), strat('Take Away Twice', [`First: ${f(N)} − ${a} = ${f(N - a)}`, `Then: ${f(N - a)} − ${b} = ${N - a - b}`], N - a - b, { line: [N, N - a, N - a - b] })]
    distractors = wrongs(ans, [N - a, a + b, N - b, ans + 10])
    operands = [N, a, b]
  }
  return { prompt, input: 'number', answer: ans, strategies, distractors, operands, difficulty: d }
}

const multiDigit: Gen = (rng, d) => {
  const r = R(rng)
  const plus = r.chance()
  let a = 0
  let b = 0
  do {
    if (d === 1) {
      a = r.int(plus ? 1200 : 2400, plus ? 7999 : 9999)
      b = r.int(1100, plus ? 9998 - a : a - 150)
    } else if (d === 2) {
      a = r.int(12000, plus ? 79999 : 99999)
      b = r.chance(0.4) ? r.int(1100, 9999) : r.int(10100, plus ? 99998 - a : a - 1500)
    } else {
      a = r.int(120000, plus ? 799999 : 999999)
      b = r.chance(0.4) ? r.int(11000, 99999) : r.int(101000, plus ? 999998 - a : a - 15000)
    }
  } while (b % 1000 === 0 || a % 1000 === 0 || (!plus && b >= a))
  const ans = plus ? a + b : a - b
  const col = plus ? colAdd(a, b) : colSub(a, b)
  const [aT, aR, bT, bR] = [a - (a % 1000), a % 1000, b - (b % 1000), b % 1000]
  const f = fmtN
  const parts = hopSub(a, b)
  return {
    prompt: `What is ${f(a)} ${plus ? 'plus' : 'minus'} ${f(b)}?`,
    eq: `${f(a)} ${plus ? '+' : '−'} ${f(b)} = ${Q}`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies: [
      strat(plus ? 'Line Up and Carry' : 'Line Up and Trade', col.steps, col.result, { html: stackHTML(a, b, plus ? '+' : '−', col.result) }),
      plus
        ? strat('Thousands and the Rest', [`Thousands: ${f(aT)} + ${f(bT)} = ${f(aT + bT)}`, `The rest: ${f(aR)} + ${f(bR)} = ${f(aR + bR)}`, `${f(aT + bT)} + ${f(aR + bR)} = ${f(aT + bT + (aR + bR))}`], aT + bT + (aR + bR))
        : strat('Take Away in Parts', parts.steps, parts.end, { line: parts.pts }),
    ],
    // dropped the carries / small digit from big digit, off by one thousand, hundred or ten
    distractors: wrongs(ans, [plus ? noCarry(a, b) : digitGap(a, b), ans + 1000, ans - 1000, ans + 100, ans - 10]),
    operands: [a, b],
    difficulty: d,
  }
}

/* ------------------------------------------------------------------ */

export const gens: Record<string, Gen> = {
  'as.doubles': doubles,
  'as.fact-families': factFamilies,
  'as.make-100': make100,
  'as.three-addends': threeAddends,
  'as.word-compare': wordCompare,
  'as.mental-10-100': mental,
  'as.estimate': estimate,
  'as.compensation': compensation,
  'as.check-opposite': checkOpposite,
  'as.subtract-zeros': subtractZeros,
  'as.word-two-step': wordTwoStep,
  'as.multi-digit': multiDigit,
}

export const teach: Record<string, string> = {
  'as.doubles': 'A double is a number plus itself, like 6 + 6. If the numbers are one apart, use the double and then fix it by 1.',
  'as.fact-families': 'Three numbers make a family: two parts and a whole. One adding fact tells you the taking-away facts too.',
  'as.make-100': 'Partners of 100 are two numbers that add up to 100. Count up to the next ten, then on to 100.',
  'as.three-addends': 'You can add in any order. Look for friends that make a ten first. Then the rest is easy.',
  'as.word-compare': 'To compare two amounts, find the gap between them. Count up from the small one to the big one. Watch out: "more" does not always mean add.',
  'as.mental-10-100': 'Adding 10 only changes the tens. Adding 100 only changes the hundreds. The other digits stay put, unless you cross into a new hundred.',
  'as.estimate': 'About how many? Round each number to a friendly number first. Then add or subtract the friendly numbers in your head.',
  'as.compensation': 'Numbers like 29 or 198 are almost friendly. Use 30 or 200 instead, then fix the little bit you changed.',
  'as.check-opposite': 'Adding and taking away undo each other. After you subtract, add back. If you land where you started, you got it.',
  'as.subtract-zeros': 'Zeros have nothing to trade. Count up from the small number, or slide both numbers down a little so there are no zeros.',
  'as.word-two-step': 'Some stories have two steps. Do one step, write the new number, then do the next step with it.',
  'as.multi-digit': 'Big numbers work just like small ones. Line up the places. Start at the ones, and carry or trade as you go.',
}

const num = (it: Item) => it.input === 'number' && typeof it.answer === 'number'
export const limits: Record<string, (it: Item) => boolean> = {
  'as.doubles': (it) => num(it) && it.operands.length === 2 && it.operands.every((x) => x >= 2 && x <= 16) && Math.abs(it.operands[0] - it.operands[1]) <= 1 && it.answer === it.operands[0] + it.operands[1],
  'as.fact-families': (it) => num(it) && it.operands.length === 3 && it.operands[0] + it.operands[1] === it.operands[2] && it.operands[2] <= 20 && it.operands.includes(+it.answer),
  'as.make-100': (it) => it.input === 'number' && it.operands[0] >= 1 && it.operands[0] <= 99 && +it.answer >= 1 && +it.answer <= 99,
  'as.three-addends': (it) => num(it) && (it.operands.length === 3 || it.operands.length === 4) && it.operands.every((x) => x >= 1 && x <= 39) && it.answer === sum(it.operands) && +it.answer <= 120,
  'as.word-compare': (it) => num(it) && it.operands.length === 2 && it.operands.every((x) => x >= 1 && x <= 100) && +it.answer >= 1 && +it.answer <= 100 && (it.answer === it.operands[0] + it.operands[1] || it.answer === it.operands[0] - it.operands[1]),
  'as.mental-10-100': (it) => num(it) && it.operands[0] >= 100 && it.operands[0] <= 999 && it.operands[1] % 10 === 0 && it.operands[1] >= 10 && it.operands[1] <= 500 && +it.answer >= 0 && +it.answer <= 999 && Math.abs(+it.answer - it.operands[0]) === it.operands[1],
  'as.estimate': (it) => num(it) && (it.operands[2] === 10 || it.operands[2] === 100) && +it.answer % it.operands[2] === 0 && it.operands[0] <= 999 && it.operands[1] <= 999 && +it.answer >= 10 && +it.answer <= 1800,
  'as.compensation': (it) => num(it) && it.operands[0] <= 999 && [7, 8, 9].includes(it.operands[1] % 10) && +it.answer >= 1 && +it.answer <= 999 && (it.answer === it.operands[0] + it.operands[1] || it.answer === it.operands[0] - it.operands[1]),
  'as.check-opposite': (it) => (it.input === 'number' || it.input === 'choice') && it.operands[1] + it.operands[2] === it.operands[0] && it.operands[0] <= 999 && (it.input === 'choice' || it.answer === it.operands[0] || it.answer === it.operands[2]),
  'as.subtract-zeros': (it) => num(it) && it.operands[0] <= 5000 && dig(it.operands[0], 10) === 0 && it.operands[0] % 1000 < 910 && (it.operands[0] >= 1000 ? it.operands[0] % 1000 === 0 : true) && it.operands[1] < it.operands[0] && it.answer === it.operands[0] - it.operands[1],
  'as.word-two-step': (it) => num(it) && it.operands.length >= 2 && it.operands.every((x) => x >= 1 && x <= 500) && +it.answer >= 1 && +it.answer <= 500,
  'as.multi-digit': (it) => num(it) && it.operands[0] >= 1000 && it.operands.every((x) => x >= 1000 && x < 1000000) && +it.answer > 0 && +it.answer < 1000000 && (it.answer === it.operands[0] + it.operands[1] || it.answer === it.operands[0] - it.operands[1]),
}
