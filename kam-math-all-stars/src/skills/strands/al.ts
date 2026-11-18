import { R, strat, wrongs, choice, fmtN, Q, gcd, type Gen, type Item, type Strat } from '../kit'

/* Algebra Thinking: balance, patterns, rules, order of operations, letters for numbers, equations, ratios. */

type Rand = ReturnType<typeof R>
type Op = '+' | '−' | '×' | '÷'
const LET = ['n', 'k', 'm', 'p', 'y'] as const
const INK = '#1d2b36'

/* ---------------------------------------------------------------- pictures */

const svgOpen = (w: number, h: number, label: string) =>
  `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px;display:block;margin:6px auto" role="img" aria-label="${label}">`

/** A balance scale with a label on each pan. tilt: -1 left side is heavier, 0 level, 1 right side is heavier. */
function scaleSVG(left: string, right: string, tilt = 0): string {
  const pan = (cx: number, t: string) =>
    `<line x1="${cx}" y1="50" x2="${cx - 58}" y2="112" stroke="#546e7a" stroke-width="2"/><line x1="${cx}" y1="50" x2="${cx + 58}" y2="112" stroke="#546e7a" stroke-width="2"/>` +
    `<path d="M${cx - 66} 112 Q ${cx} 136 ${cx + 66} 112 Z" fill="#90a4ae"/>` +
    `<rect x="${cx - 56}" y="74" width="112" height="38" rx="8" fill="#fff3c4" stroke="#f9a825" stroke-width="2"/>` +
    `<text x="${cx}" y="100" text-anchor="middle" font-size="${t.length > 8 ? 17 : 22}" font-weight="700" fill="${INK}">${t}</text>`
  return (
    svgOpen(360, 170, `balance scale: ${left} on one side, ${right} on the other side`) +
    `<polygon points="180,48 162,152 198,152" fill="#8d6e63"/><rect x="128" y="150" width="104" height="12" rx="4" fill="#5d4037"/>` +
    `<g transform="rotate(${tilt * 5} 180 50)"><rect x="80" y="46" width="200" height="8" rx="4" fill="#37474f"/>${pan(90, left)}${pan(270, right)}</g>` +
    `<circle cx="180" cy="50" r="7" fill="#37474f"/></svg>`
  )
}

/** A table. head 'top': first row is the header. head 'left': first column is the header. "?" cells glow green. */
function tableHTML(rows: string[][], head: 'top' | 'left'): string {
  const cell = (t: string, h: boolean) => {
    const q = t === '?'
    return `<td style="border:2px solid #37474f;padding:6px 14px;text-align:center;font-size:20px;font-weight:700;color:${q ? '#1b5e20' : INK};background:${q ? '#c8e6c9' : h ? '#ffe082' : '#ffffff'}">${t}</td>`
  }
  return `<table style="border-collapse:collapse;margin:6px auto">${rows.map((r, i) => `<tr>${r.map((t, j) => cell(t, head === 'top' ? i === 0 : j === 0)).join('')}</tr>`).join('')}</table>`
}

/** In-and-out machine: the rule on a dark tag (when it is known) above an In | Out table. */
const machineHTML = (rule: string, rows: string[][]) =>
  `<div style="text-align:center">${rule ? `<div style="display:inline-block;padding:6px 16px;border-radius:12px;background:#37474f;color:#ffffff;font-size:20px;font-weight:700">Rule: ${rule}</div>` : ''}${tableHTML([['In', 'Out'], ...rows], 'top')}</div>`

/** Tape diagram: boxes in a row with one label under all of them. */
function tapeSVG(cells: string[], total: string): string {
  const w = 320 / cells.length
  return (
    svgOpen(360, 112, `tape diagram: ${cells.join(', ')} make ${total}`) +
    cells
      .map(
        (c, i) =>
          `<rect x="${20 + i * w}" y="14" width="${w}" height="44" fill="${c === '?' ? '#c8e6c9' : '#bbdefb'}" stroke="#37474f" stroke-width="2"/><text x="${20 + i * w + w / 2}" y="43" text-anchor="middle" font-size="${cells.length > 8 ? 15 : 20}" font-weight="700" fill="${INK}">${c}</text>`,
      )
      .join('') +
    `<path d="M20 68 v10 h320 v-10" fill="none" stroke="#37474f" stroke-width="2"/><text x="180" y="102" text-anchor="middle" font-size="19" font-weight="700" fill="${INK}">${total}</text></svg>`
  )
}

/** Number line of whole numbers: green dots work, empty dots do not. */
function ineqSVG(lo: number, hi: number, works: (v: number) => boolean): string {
  const x = (v: number) => 30 + ((v - lo) / (hi - lo)) * 320
  let s = svgOpen(380, 92, 'number line. The green dots are the numbers that work') + `<line x1="14" y1="40" x2="366" y2="40" stroke="#37474f" stroke-width="3" stroke-linecap="round"/>`
  for (let v = lo; v <= hi; v++) {
    const ok = works(v)
    s += `<circle cx="${x(v)}" cy="40" r="10" fill="${ok ? '#2e7d32' : '#fffdf5'}" stroke="${ok ? '#2e7d32' : '#90a4ae'}" stroke-width="3"/><text x="${x(v)}" y="76" text-anchor="middle" font-size="16" font-weight="700" fill="${ok ? '#1b5e20' : '#546e7a'}">${v}</text>`
  }
  return s + '</svg>'
}

/** Rows of dots, one row per kind of thing. */
const dotsHTML = (rows: [string, number, string][]) =>
  `<div style="margin:6px auto;max-width:420px">${rows
    .map(
      ([name, n, color]) =>
        `<div style="display:flex;align-items:center;margin:4px 0"><span style="min-width:120px;font-size:17px;font-weight:700;color:${INK}">${name}</span><span>${`<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${color};margin:2px"></span>`.repeat(n)}</span></div>`,
    )
    .join('')}</div>`

/* ---------------------------------------------------------------- small helpers */

/** `count` different whole numbers from lo..hi (times `mult`), smallest first. */
function distinct(r: Rand, lo: number, hi: number, count: number, mult = 1): number[] {
  const s = new Set<number>()
  while (s.size < count) s.add(r.int(lo, hi) * mult)
  return [...s].sort((a, b) => a - b)
}

/** Friendly hops from `start` by `delta` (tens first, then through the next ten). Returns every landing spot. */
function jump(start: number, delta: number): number[] {
  const pts = [start]
  const s = Math.sign(delta)
  let left = Math.abs(delta)
  let cur = start
  const tens = Math.floor(left / 10) * 10
  if (tens) {
    cur += s * tens
    pts.push(cur)
    left -= tens
  }
  if (left) {
    const toTen = s > 0 ? (10 - (cur % 10)) % 10 : cur % 10
    if (toTen && toTen < left) {
      cur += s * toTen
      pts.push(cur)
      left -= toTen
    }
    cur += s * left
    pts.push(cur)
  }
  return pts
}
const hopText = (pts: number[]) =>
  pts
    .slice(1)
    .map((p, i) => `Hop ${p > pts[i] ? 'up' : 'back'} ${Math.abs(p - pts[i])} to ${p}.`)
    .join(' ')

/** "How far from a up to b?" as a strategy. The result is the sum of the hops. */
function countUpStrat(name: string, from: number, to: number, intro: string, outro: (far: number) => string): Strat {
  const pts = [from]
  const t1 = Math.ceil(from / 10) * 10
  if (from % 10 && t1 < to) pts.push(t1)
  const t2 = Math.floor(to / 10) * 10
  if (t2 > pts[pts.length - 1] && to % 10) pts.push(t2)
  if (to !== pts[pts.length - 1]) pts.push(to)
  const hops = pts.slice(1).map((p, i) => p - pts[i])
  const far = hops.reduce((a, b) => a + b, 0)
  return strat(name, [intro, hopText(pts), hops.length > 1 ? `${hops.join(' + ')} = ${far}` : `That is one hop of ${far}.`, outro(far)], far, { line: pts })
}

/** A second way to multiply: repeated adding for small numbers, break apart for bigger ones. */
function mulAlt(a: number, b: number, groupsFirst = false): { steps: string[]; value: number } {
  const k = groupsFirst && a <= 6 ? a : Math.min(a, b),
    g = groupsFirst && a <= 6 ? b : Math.max(a, b)
  if (k === 1) return { steps: [`1 group of ${g} is just ${g}.`], value: g }
  if (k <= 5) {
    let t = 0
    for (let i = 0; i < k; i++) t += g
    return { steps: [`${a} × ${b} is ${k} groups of ${g}: ${Array(k).fill(g).join(' + ')} = ${t}`], value: t }
  }
  const part = g > 10 ? 10 : 5
  const x = k * part,
    y = k * (g - part)
  return { steps: [`Break ${g} into ${part} and ${g - part}: ${k} × ${part} = ${x} and ${k} × ${g - part} = ${y}`, `Put them together: ${x} + ${y} = ${x + y}`], value: x + y }
}

/* ---- flat expressions (no parentheses) ---- */
interface Flat {
  nums: number[]
  ops: Op[]
}
const MD: Op[] = ['×', '÷']
const VERB: Record<Op, string> = { '+': 'add', '−': 'subtract', '×': 'multiply', '÷': 'divide' }
const flatStr = (f: Flat) => f.nums.map((n, i) => (i ? `${f.ops[i - 1]} ${n}` : `${n}`)).join(' ')
const ap = (a: number, op: Op, b: number) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b)
/** Work the expression out, doing the `first` operations before the others (left to right inside each pass). */
function reduce(f: Flat, first: Op[]) {
  const nums = [...f.nums],
    ops = [...f.ops]
  const log: { a: number; op: Op; b: number; v: number; after: string }[] = []
  let ok = true
  while (ops.length) {
    let i = ops.findIndex((o) => first.includes(o))
    if (i < 0) i = 0
    const v = ap(nums[i], ops[i], nums[i + 1])
    if (!Number.isInteger(v) || v < 0) ok = false
    const step = { a: nums[i], op: ops[i], b: nums[i + 1], v, after: '' }
    nums.splice(i, 2, v)
    ops.splice(i, 1)
    step.after = flatStr({ nums, ops })
    log.push(step)
  }
  return { value: nums[0], ok, log }
}
const stepLines = (f: Flat) => {
  const { log } = reduce(f, MD)
  return log.map((l, i) => `${i === 0 ? `First ${VERB[l.op]}` : i === log.length - 1 ? `Last, ${VERB[l.op]}` : `Next ${VERB[l.op]}`}: ${l.a} ${l.op} ${l.b} = ${l.v}` + (i < log.length - 1 ? `. Now it reads ${l.after}.` : ''))
}

/* ---- machine rules ---- */
type RuleKind = 'add' | 'sub' | 'mul' | 'div' | 'two'
interface Rule {
  kind: RuleKind
  k: number
  b: number
  label: string
  words: string
  f: (x: number) => number
}
const mkRule = (kind: RuleKind, k: number, b = 0): Rule => ({
  kind,
  k,
  b,
  label: kind === 'add' ? `+ ${k}` : kind === 'sub' ? `− ${k}` : kind === 'mul' ? `× ${k}` : kind === 'div' ? `÷ ${k}` : `× ${k}, then + ${b}`,
  words: kind === 'add' ? `add ${k}` : kind === 'sub' ? `take away ${k}` : kind === 'mul' ? `times ${k}` : kind === 'div' ? `divide by ${k}` : `times ${k}, then add ${b}`,
  f: (x) => (kind === 'add' ? x + k : kind === 'sub' ? x - k : kind === 'mul' ? x * k : kind === 'div' ? x / k : x * k + b),
})
const RSYM: Record<RuleKind, Op> = { add: '+', sub: '−', mul: '×', div: '÷', two: '×' }

/** Find an Out number from a row you already know (how the table grows). */
function rowOut(name: string, rule: Rule, x3: number, xq: number): Strat {
  const y3 = rule.f(x3),
    diff = xq - x3
  const head = [`You know this row: ${x3} goes in, ${y3} comes out.`, `${xq} is ${diff} more than ${x3}.`]
  if (rule.kind === 'add' || rule.kind === 'sub') return strat(name, [...head, `So the Out number is ${diff} more too: ${y3} + ${diff} = ${y3 + diff}`], y3 + diff)
  if (rule.kind === 'div') {
    const up = diff / rule.k
    return strat(name, [...head, `Every ${rule.k} more going in makes 1 more coming out: ${diff} ÷ ${rule.k} = ${up}`, `${y3} + ${up} = ${y3 + up}`], y3 + up)
  }
  const up = diff * rule.k
  return strat(name, [...head, `Each 1 more going in makes ${rule.k} more coming out: ${diff} × ${rule.k} = ${up}`, `${y3} + ${up} = ${y3 + up}`], y3 + up)
}

const TF = ['True', 'False']

/* ================================================================ generators */

export const gens: Record<string, Gen> = {
  /* ---------------------------------------------------------------- al.equal-sign */
  'al.equal-sign': (rng, d) => {
    const r = R(rng)
    const hi = d === 1 ? 9 : d === 2 ? 15 : 30
    if (r.chance(0.3)) {
      // true or false number sentence
      const a = r.int(2, hi),
        b = r.int(2, hi)
      const S = a + b
      const kind = r.pick(['true', 'true', 'off', 'trap'] as const)
      let c: number, e: number
      if (kind === 'trap') {
        // 8 + 5 = 13 + 2: the total is written right after the equal sign
        c = S
        e = r.int(1, 5)
      } else {
        do c = r.int(1, S - 2)
        while (c === a || c === b)
        e = S - c + (kind === 'off' ? r.pick([-1, 1]) : 0)
      }
      const T = c + e
      const ans = S === T ? 'True' : 'False'
      const da = c - a,
        db = e - b
      const cmp = (x: number, y: number) => (x === y ? `${x} is the same as ${y}.` : `${x} is ${Math.abs(x - y)} ${x > y ? 'more' : 'less'} than ${y}.`)
      return {
        prompt: `True or false? ${a} + ${b} is the same as ${c} + ${e}.`,
        eq: `${a} + ${b} = ${c} + ${e}`,
        ...choice(ans, TF, rng, true),
        strategies: [
          strat(
            'Find Both Sides',
            [`Left side: ${a} + ${b} = ${S}`, `Right side: ${c} + ${e} = ${T}`, S === T ? `Both sides make ${S}. The scale is balanced, so it is true.` : `${S} and ${T} are not the same. The scale tips, so it is false.`],
            S === T ? 'True' : 'False',
            { html: scaleSVG(`${a} + ${b}`, `${c} + ${e}`, Math.sign(T - S)) },
          ),
          Math.abs(da) <= 5
            ? strat(
                'Compare the Parts',
                [
                  `Look at the first numbers. ${cmp(c, a)}`,
                  `Look at the second numbers. ${cmp(e, b)}`,
                  da + db === 0 ? `One part went up ${Math.abs(da)} and the other went down ${Math.abs(da)}. That cancels out. True!` : `The changes do not cancel out, so the sides are not the same. False.`,
                ],
                da + db === 0 ? 'True' : 'False',
              )
            : strat(
                'Find the Missing Partner',
                [`The left side makes ${S}. What must go with ${c} to make ${S} too?`, `${S} − ${c} = ${S - c}`, S - c === e ? `The number there is ${e}. It matches, so it is true.` : `It should be ${S - c}, but the number there is ${e}. So it is false.`],
                S - c === e ? 'True' : 'False',
              ),
        ],
        operands: [a, b, c, e],
        difficulty: d,
      }
    }
    const sub = d === 3 && r.chance(0.5)
    let a: number, b: number
    if (sub) {
      a = r.int(12, 40)
      b = r.int(2, a - 4)
    } else {
      a = r.int(2, hi)
      b = r.int(2, hi)
    }
    const S = sub ? a - b : a + b
    let c: number
    do c = r.int(1, S - 1)
    while (!sub && c === b && S > 3)
    const ans = S - c
    const known = `${a} ${sub ? '−' : '+'} ${b}`
    const blankFirst = d === 1 || r.chance(0.5)
    const side = (q: string) => (blankFirst ? `${q} + ${c}` : `${c} + ${q}`)
    const knownLeft = d === 1 || r.chance(0.5)
    const spoken = (knownLeft ? `${known} = ${side('what number')}` : `${side('what number')} = ${known}`).replace('=', 'is the same as').replace('−', 'minus').replace(/\+/g, 'plus')
    const diff = c - b
    const strategies: Strat[] = [
      strat('Find Both Sides', [`Do the side with no mystery: ${known} = ${S}`, `The other side must make ${S} too.`, `${S} − ${c} = ${ans}`, `Check: ${blankFirst ? `${ans} + ${c}` : `${c} + ${ans}`} = ${S}`], S - c, {
        html: scaleSVG(known, side(`${ans}`)),
      }),
    ]
    if (!sub && diff !== 0 && Math.abs(diff) <= 4)
      strategies.push(
        strat(
          'Balance the Parts',
          [`${c} is ${Math.abs(diff)} ${diff > 0 ? 'more' : 'less'} than ${b}.`, `To stay balanced, the mystery number must be ${Math.abs(diff)} ${diff > 0 ? 'less' : 'more'} than ${a}.`, `${a} ${diff > 0 ? '−' : '+'} ${Math.abs(diff)} = ${a - diff}`],
          a - diff,
        ),
      )
    strategies.push(countUpStrat('Count Up', c, S, `One side makes ${S}. Start at ${c} and count up to ${S}.`, (far) => `So ${far} goes with ${c} to make ${S}.`))
    return {
      prompt: `What number makes both sides the same? ${spoken}.`,
      eq: knownLeft ? `${known} = ${side(Q)}` : `${side(Q)} = ${known}`,
      eqOnly: true,
      visual: knownLeft ? scaleSVG(known, side('?')) : scaleSVG(side('?'), known),
      input: 'number',
      answer: ans,
      strategies,
      // wrote the total after the equal sign; added everything; added instead of balancing
      distractors: wrongs(ans, [S, S + c, sub ? a + b : a + b + c, ans + 1]),
      operands: [a, b, c],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.patterns-number */
  'al.patterns-number': (rng, d) => {
    const r = R(rng)
    const step = d === 1 ? r.pick([2, 3, 4, 5, 10]) : d === 2 ? r.int(3, 9) : r.pick([11, 12, 15, 20, 25, 30, 50, r.int(11, 19)])
    const up = d === 1 || r.chance(0.6)
    const start = up ? r.int(d === 1 ? 0 : 1, d === 1 ? 20 : d === 2 ? 40 : 150) : 4 * step + r.int(0, d === 2 ? 30 : 100)
    const sg = up ? 1 : -1
    const t = [0, 1, 2, 3, 4].map((i) => start + sg * i * step)
    const idx = d === 1 || r.chance(d === 2 ? 0.7 : 0.6) ? 4 : r.pick([2, 3])
    const ans = t[idx]
    const jumpLine = up ? `${t[1]} − ${t[0]} = ${step}` : `${t[0]} − ${t[1]} = ${step}`
    const pm = up ? '+' : '−'
    if (idx === 4) {
      const shown = t.slice(0, 4)
      return {
        prompt: `Look at the pattern: ${shown.join(', ')}. What number comes next?`,
        eq: `${shown.join(', ')}, ${Q}`,
        eqOnly: true,
        input: 'number',
        answer: ans,
        strategies: [
          strat('Find the Jump', [`How big is each jump? ${jumpLine}`, `Every jump is ${up ? 'plus' : 'minus'} ${step}.`, `Jump one more time: ${t[3]} ${pm} ${step} = ${t[3] + sg * step}`], t[3] + sg * step, { line: [t[1], t[2], t[3], t[3] + sg * step] }),
          strat('Count the Jumps', [`Each jump is ${step}. From ${t[0]} to the mystery number is 4 jumps.`, `4 × ${step} = ${4 * step}`, `${t[0]} ${pm} ${4 * step} = ${t[0] + sg * 4 * step}`], t[0] + sg * 4 * step),
        ],
        // counted by ones, jumped the wrong way, jump off by one
        distractors: wrongs(ans, [t[3] + sg, t[3] - sg * step, ans + 1, ans - 1, t[3] + sg * 10]),
        operands: [start, step, idx],
        difficulty: d,
      }
    }
    const shown = t.map((v, i) => (i === idx ? '?' : `${v}`))
    return {
      prompt: `One number is missing in this pattern: ${shown.join(', ').replace('?', 'blank')}. What is the missing number?`,
      eq: t.map((v, i) => (i === idx ? Q : `${v}`)).join(', '),
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies: [
        strat('Jump Forward', [`How big is each jump? ${jumpLine}`, `Every jump is ${up ? 'plus' : 'minus'} ${step}.`, `Jump from ${t[idx - 1]}: ${t[idx - 1]} ${pm} ${step} = ${t[idx - 1] + sg * step}`], t[idx - 1] + sg * step, {
          line: [t[idx - 2], t[idx - 1], t[idx - 1] + sg * step],
        }),
        strat('Jump Back', [`Go backward from the number after the blank. Going backward, do the opposite.`, `${t[idx + 1]} ${up ? '−' : '+'} ${step} = ${t[idx + 1] - sg * step}`, `Both ways land on the same number. It fits!`], t[idx + 1] - sg * step),
      ],
      distractors: wrongs(ans, [t[idx - 1] + sg, t[idx + 1] - sg, ans + 1, ans - 1, t[idx - 1] + sg * 10]),
      operands: [start, step, idx],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.in-out */
  'al.in-out': (rng, d) => {
    const r = R(rng)
    const kind: RuleKind = d === 1 ? r.pick(['add', 'mul']) : d === 2 ? r.pick(['add', 'sub', 'mul', 'mul']) : r.pick(['mul', 'sub', 'two', 'two'])
    const k = kind === 'add' ? (d === 1 ? r.int(1, 10) : r.int(5, 30)) : kind === 'sub' ? r.int(d === 2 ? 1 : 5, d === 2 ? 12 : 25) : kind === 'two' ? r.int(2, 5) : d === 1 ? r.pick([2, 5, 10]) : d === 2 ? r.pick([2, 3, 4, 5, 10]) : r.int(3, 9)
    const b = kind === 'two' ? r.int(1, 9) : 0
    const rule = mkRule(kind, k, b)
    const [lo, hi] = kind === 'add' ? (d === 1 ? [1, 20] : [5, 50]) : kind === 'sub' ? [k, k + 20] : d === 3 ? [2, 12] : [1, 10]
    const ins = distinct(r, lo, hi, 4)
    const [x3, xq] = [ins[2], ins[3]]
    const y3 = rule.f(x3),
      yq = rule.f(xq)
    const findIn = d > 1 && r.chance(d === 2 ? 0.4 : 0.5)
    const rows = ins.map((x, i) => (i < 3 ? [`${x}`, `${rule.f(x)}`] : findIn ? ['?', `${yq}`] : [`${xq}`, '?']))
    const visual = machineHTML(rule.label, rows)
    const slope = kind === 'add' || kind === 'sub' ? 1 : k
    if (!findIn) {
      const s1 =
        kind === 'two'
          ? strat('Use the Rule', [`The rule has two steps. First times ${k}: ${xq} × ${k} = ${xq * k}`, `Then add ${b}: ${xq * k} + ${b} = ${xq * k + b}`], xq * k + b)
          : strat('Use the Rule', [`The rule is "${rule.words}". Do that to ${xq}.`, `${xq} ${RSYM[kind]} ${k} = ${ap(xq, RSYM[kind], k)}`], ap(xq, RSYM[kind], k))
      return {
        prompt: `The machine's rule is: ${rule.words}. ${xq} goes in. What number comes out?`,
        visual,
        input: 'number',
        answer: yq,
        strategies: [s1, rowOut('Use a Row You Know', rule, x3, xq)],
        distractors: wrongs(
          yq,
          kind === 'mul' ? [xq + k, y3 + k, yq - k] : kind === 'add' ? [y3 + 1, xq, xq * k > 200 ? yq + 1 : xq * k] : kind === 'sub' ? [xq + k, xq, y3 + 1] : [xq * k, (xq + b) * k, xq + k + b],
        ),
        operands: [xq, k, b],
        difficulty: d,
      }
    }
    const back =
      kind === 'add'
        ? { lines: [`The opposite of adding is taking away: ${yq} − ${k} = ${yq - k}`, `Check: ${yq - k} + ${k} = ${yq}`], v: yq - k }
        : kind === 'sub'
          ? { lines: [`The opposite of taking away is adding: ${yq} + ${k} = ${yq + k}`, `Check: ${yq + k} − ${k} = ${yq}`], v: yq + k }
          : kind === 'mul'
            ? { lines: [`The opposite of times is divide: ${yq} ÷ ${k} = ${yq / k}`, `Check: ${yq / k} × ${k} = ${yq}`], v: yq / k }
            : { lines: [`Undo the last step first: ${yq} − ${b} = ${yq - b}`, `Then undo the times: ${yq - b} ÷ ${k} = ${(yq - b) / k}`, `Check: ${(yq - b) / k} × ${k} + ${b} = ${yq}`], v: (yq - b) / k }
    const dy = yq - y3
    const s2 =
      slope === 1
        ? strat('Use a Row You Know', [`You know this row: ${x3} goes in, ${y3} comes out.`, `${yq} is ${dy} more than ${y3}.`, `So the In number is ${dy} more too: ${x3} + ${dy} = ${x3 + dy}`], x3 + dy)
        : strat('Use a Row You Know', [`You know this row: ${x3} goes in, ${y3} comes out.`, `${yq} is ${dy} more than ${y3}.`, `Every ${k} more coming out means 1 more going in: ${dy} ÷ ${k} = ${dy / k}`, `${x3} + ${dy / k} = ${x3 + dy / k}`], x3 + dy / k)
    return {
      prompt: `The machine's rule is: ${rule.words}. ${yq} comes out. What number went in?`,
      visual,
      input: 'number',
      answer: xq,
      strategies: [strat('Go Backward', [`Go backward through the machine. Do the opposite of "${rule.words}".`, ...back.lines], back.v), s2],
      // used the rule forward instead of backward, stopped after one undo
      distractors: wrongs(xq, kind === 'add' ? [yq + k, xq + 1, x3 + 1] : kind === 'sub' ? [yq - k, xq - 1, x3 + 1] : kind === 'mul' ? [yq * k, yq - k, x3 + 1] : [yq - b, yq * k + b, xq + 1]),
      operands: [xq, k, b],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.patterns-rule */
  'al.patterns-rule': (rng, d) => {
    const r = R(rng)
    const roll = r.int(1, 100)
    if (d === 3 && roll > 65) {
      // growing pattern that multiplies
      const k = r.int(2, 5),
        s = r.int(1, 5)
      const t = [0, 1, 2, 3, 4].map((i) => s * k ** i)
      let sum = 0
      for (let i = 0; i < k; i++) sum += t[3]
      const f = (i: number) => fmtN(t[i])
      return {
        prompt: `Look at the pattern: ${t.slice(0, 4).map(fmtN).join(', ')}. Find the rule. What number comes next?`,
        eq: `${t.slice(0, 4).map(fmtN).join(' &nbsp; ')} &nbsp; ${Q}`,
        input: 'number',
        answer: t[4],
        strategies: [
          strat('Find the Rule', [`The jumps get bigger each time, so it is not a plus rule.`, `Try times: ${f(1)} ÷ ${f(0)} = ${k} and ${f(2)} ÷ ${f(1)} = ${k}`, `The rule is times ${k}. Use it: ${f(3)} × ${k} = ${fmtN(t[3] * k)}`], t[3] * k),
          strat('Add It Up', [`Each number is ${k} times the number before it.`, `So add ${f(3)} to itself ${k} times: ${Array(k).fill(f(3)).join(' + ')} = ${fmtN(sum)}`], sum),
        ],
        // kept adding the last jump, added the rule number, used the jump before
        distractors: wrongs(t[4], [t[3] + (t[3] - t[2]), t[3] + k, t[3] + t[2], t[3] * (k + 1)]),
        operands: [s, k, 4],
        difficulty: d,
      }
    }
    const kind: RuleKind = d === 1 ? r.pick(['add', 'mul']) : r.pick(['add', 'sub', 'mul', 'div'])
    const k = kind === 'add' || kind === 'sub' ? (d === 1 ? r.int(2, 12) : d === 2 ? r.int(3, 20) : r.int(10, 50)) : kind === 'mul' ? (d === 1 ? r.pick([2, 3, 4, 5, 10]) : d === 2 ? r.int(2, 9) : r.int(3, 12)) : d === 2 ? r.int(2, 5) : r.int(2, 10)
    const rule = mkRule(kind, k)
    const ins = kind === 'div' ? distinct(r, 1, 10, 4, k) : kind === 'sub' ? distinct(r, k, k + 20, 4) : kind === 'add' ? distinct(r, 1, 20, 4) : distinct(r, 1, d === 3 ? 12 : 10, 4)
    const outs = ins.map(rule.f)
    const sym = RSYM[kind]
    if (roll <= (d === 1 ? 50 : d === 2 ? 40 : 30)) {
      // every row is filled in: which rule is it?
      const order = r.shuffle([0, 1, 2, 3])
      const xs = order.map((i) => ins[i]),
        ys = order.map((i) => outs[i])
      const [x1, y1, x2, y2] = [xs[0], ys[0], xs[1], ys[1]]
      const cand: Rule[] =
        kind === 'mul'
          ? [mkRule('add', y1 - x1), mkRule('mul', k + 1), mkRule('mul', k - 1), mkRule('add', k)]
          : kind === 'add'
            ? [mkRule('mul', y1 % x1 === 0 ? y1 / x1 : 2), mkRule('add', k + 1), mkRule('sub', k), mkRule('add', k - 1)]
            : kind === 'sub'
              ? [mkRule('add', k), mkRule('sub', k + 1), mkRule('div', y1 > 0 && x1 % y1 === 0 ? x1 / y1 : 2), mkRule('sub', k - 1)]
              : [mkRule('sub', x1 - y1), mkRule('div', k + 1), mkRule('mul', k), mkRule('sub', k)]
      const fits = (c: Rule) => xs.every((x, i) => c.f(x) === ys[i])
      const opts = [rule, ...cand.filter((c) => c.k >= 1 && !(c.k === 1 && (c.kind === 'mul' || c.kind === 'div')) && !fits(c))]
      const picked = choice(rule.label, opts.slice(1).map((c) => c.label), rng)
      const byTest = opts.filter((c) => picked.choices!.includes(c.label) && fits(c))[0].label
      // work the rule out from the numbers alone
      const gaps = ys.map((y, i) => y - xs[i])
      const sameGap = gaps.every((g) => g === gaps[0])
      const derived = sameGap ? (gaps[0] > 0 ? `+ ${gaps[0]}` : `− ${-gaps[0]}`) : ys[0] > xs[0] ? `× ${ys[0] / xs[0]}` : `÷ ${xs[0] / ys[0]}`
      const grow =
        kind === 'add'
          ? [`How much bigger is Out than In? ${y1} − ${x1} = ${k} and ${y2} − ${x2} = ${k}`, `Out is always ${k} more than In. That is a plus rule: + ${k}.`]
          : kind === 'sub'
            ? [`How much smaller is Out than In? ${x1} − ${y1} = ${k} and ${x2} − ${y2} = ${k}`, `Out is always ${k} less than In. That is a minus rule: − ${k}.`]
            : kind === 'mul'
              ? [`Out is bigger than In, but not by the same amount each time (${gaps[0]}, then ${gaps[1]}). So it is not a plus rule.`, `Try dividing: ${y1} ÷ ${x1} = ${k} and ${y2} ÷ ${x2} = ${k}`, `Out is always ${k} times In. The rule is × ${k}.`]
              : [`Out is smaller than In, but not by the same amount each time (${-gaps[0]}, then ${-gaps[1]}). So it is not a minus rule.`, `Try dividing: ${x1} ÷ ${y1} = ${k} and ${x2} ÷ ${y2} = ${k}`, `In is always ${k} times Out. The rule is ÷ ${k}.`]
      return {
        prompt: `Look at the In and Out numbers. Which rule works for every row?`,
        visual: machineHTML('?', xs.map((x, i) => [`${x}`, `${ys[i]}`])),
        ...picked,
        strategies: [
          strat('Test Every Row', [`A rule must work for every row, not just the first one.`, `Try ${rule.label} on each row.`, ...xs.slice(0, 3).map((x, i) => `${x} ${sym} ${k} = ${ys[i]}`), `It works every time. The rule is ${byTest}.`], byTest),
          strat('Look for What Stays the Same', grow, derived),
        ],
        operands: [k, ...xs],
        difficulty: d,
      }
    }
    // table with one Out number missing, rule not shown
    const [x1, x2, x3, xq] = ins
    const ans = rule.f(xq)
    return {
      prompt: `Find the machine's rule. Then tell what number comes out when ${xq} goes in.`,
      visual: machineHTML('?', ins.map((x, i) => [`${x}`, i < 3 ? `${outs[i]}` : '?'])),
      input: 'number',
      answer: ans,
      strategies: [
        strat('Find the Rule First', [`Look at the first row: ${x1} goes in, ${outs[0]} comes out. Maybe the rule is "${rule.words}".`, `Test it on other rows: ${x2} ${sym} ${k} = ${outs[1]} and ${x3} ${sym} ${k} = ${outs[2]}`, `It works. Now use it: ${xq} ${sym} ${k} = ${ap(xq, sym, k)}`], ap(xq, sym, k)),
        rowOut('Watch the Table Grow', rule, x3, xq),
      ],
      // used + when it was ×, kept the last jump, mixed up the rule
      distractors: wrongs(ans, kind === 'mul' ? [xq + (outs[0] - x1), xq + k, outs[2] + k] : kind === 'add' ? [outs[2] + 1, xq * 2, xq + k + 1] : kind === 'sub' ? [xq + k, outs[2] + 1, ans + 1] : [xq - (x1 - outs[0]), outs[2] + 1, xq * k]),
      operands: [k, xq, x3],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.order-ops */
  'al.order-ops': (rng, d) => {
    const r = R(rng)
    const i = r.int
    const make = (): Flat => {
      const b = i(2, d === 1 ? 5 : 9),
        c = i(2, d === 1 ? 5 : 9),
        g = i(2, 6),
        q = i(2, 9)
      if (d === 1) return r.chance(0.6) ? { nums: [i(1, 12), b, c], ops: ['+', '×'] } : { nums: [b * c + i(1, 10), b, c], ops: ['−', '×'] }
      if (d === 2) {
        const t = i(0, 4)
        if (t === 0) return { nums: [i(2, 20), g * q, g], ops: ['+', '÷'] }
        if (t === 1) return { nums: [q + i(1, 15), g * q, g], ops: ['−', '÷'] }
        if (t === 2) return { nums: [i(1, 15), i(2, 6), i(2, 6), i(1, 9)], ops: ['+', '×', '−'] }
        if (t === 3) return { nums: [i(2, 6), i(2, 6), i(2, 6), i(2, 6)], ops: ['×', '+', '×'] }
        return { nums: [b * c + i(1, 20), b, c], ops: ['−', '×'] }
      }
      const t = i(0, 3)
      if (t === 0) return { nums: [i(4, 9), i(4, 9), i(2, 5), i(2, 5)], ops: ['×', '−', '×'] }
      if (t === 1) return { nums: [i(1, 20), b, c, g * q, g], ops: ['+', '×', '−', '÷'] }
      if (t === 2) return { nums: [q + i(1, 20), g * q, g, b, c], ops: ['−', '÷', '+', '×'] }
      return { nums: [g * q, g, b, c], ops: ['÷', '+', '×'] }
    }
    let f = make()
    for (let t = 0; t < 40 && !(reduce(f, MD).ok && reduce(f, []).value !== reduce(f, MD).value); t++) f = make()
    if (!reduce(f, MD).ok) f = { nums: [2, 3, 4], ops: ['+', '×'] }
    const std = reduce(f, MD)
    const show = flatStr(f)
    // teams: the × and ÷ parts
    const terms: Flat[] = [{ nums: [f.nums[0]], ops: [] }]
    const signs: Op[] = []
    f.ops.forEach((o, j) => {
      if (o === '×' || o === '÷') {
        terms[terms.length - 1].nums.push(f.nums[j + 1])
        terms[terms.length - 1].ops.push(o)
      } else {
        signs.push(o)
        terms.push({ nums: [f.nums[j + 1]], ops: [] })
      }
    })
    const teamVals = terms.map((t) => reduce(t, MD).value)
    const reduced: Flat = { nums: teamVals, ops: signs }
    const teamResult = reduce(reduced, []).value
    const strategies: Strat[] = [
      strat('Step by Step', stepLines(f), std.log[std.log.length - 1].v),
      strat(
        'Circle the Teams',
        [`The × and ÷ parts stick together like teams. Do each team first.`, ...terms.filter((t) => t.ops.length).map((t) => `Team: ${flatStr(t)} = ${reduce(t, MD).value}`), `Now go left to right: ${flatStr(reduced)} = ${teamResult}`],
        teamResult,
      ),
    ]
    const mi = f.ops.indexOf('×')
    if (f.ops.filter((o) => o === '×' || o === '÷').length === 1 && mi >= 0 && Math.min(f.nums[mi], f.nums[mi + 1]) <= 5) {
      const times = Math.min(f.nums[mi], f.nums[mi + 1]),
        each = Math.max(f.nums[mi], f.nums[mi + 1])
      const sg: Op = mi > 0 && f.ops[mi - 1] === '−' ? '−' : '+'
      const ex: Flat = {
        nums: [...f.nums.slice(0, mi), ...Array<number>(times).fill(each), ...f.nums.slice(mi + 2)],
        ops: [...f.ops.slice(0, mi), ...Array<Op>(times - 1).fill(sg), ...f.ops.slice(mi + 1)],
      }
      strategies.push(strat('Stretch It Out', [`${f.nums[mi]} × ${f.nums[mi + 1]} means ${times} groups of ${each}.`, `Write the groups out: ${flatStr(ex)} = ${reduce(ex, []).value}`], reduce(ex, []).value))
    }
    return {
      prompt: `What is ${show}? Remember: multiply and divide before you add and subtract.`,
      eq: `${show} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: std.value,
      strategies,
      // went left to right; did + and − first
      distractors: wrongs(std.value, [reduce(f, []).value, reduce(f, ['+', '−']).value, std.value + f.nums[1], Math.abs(std.value - f.nums[2])]),
      operands: f.nums,
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.parentheses */
  'al.parentheses': (rng, d) => {
    const r = R(rng)
    const i = r.int
    const hi = d === 1 ? 6 : 9
    const t = d === 1 ? r.pick([1, 2, 3]) : d === 2 ? r.pick([1, 2, 4, 5, 6, 10]) : r.pick([7, 8, 9, 5, 6, 10])
    let show: string, v: number, s1: string[], s2: Strat, wrong: number[], ops: number[]
    if (t === 1) {
      const a = i(1, hi), b = i(1, hi), c = i(2, d === 1 ? 5 : 9)
      const s = a + b
      show = `(${a} + ${b}) × ${c}`
      v = s * c
      s1 = [`Parentheses first: ${a} + ${b} = ${s}`, `Then multiply: ${s} × ${c} = ${v}`]
      s2 = strat('Break It Apart', [`Each number inside the parentheses gets multiplied by ${c}.`, `${a} × ${c} = ${a * c} and ${b} × ${c} = ${b * c}`, `${a * c} + ${b * c} = ${a * c + b * c}`], a * c + b * c)
      wrong = [a + b * c, s, a * c + b]
      ops = [a, b, c]
    } else if (t === 2) {
      const a = i(2, d === 1 ? 5 : 9), b = i(1, hi), c = i(1, hi)
      const s = b + c
      show = `${a} × (${b} + ${c})`
      v = a * s
      s1 = [`Parentheses first: ${b} + ${c} = ${s}`, `Then multiply: ${a} × ${s} = ${v}`]
      s2 = strat('Break It Apart', [`${a} multiplies each number inside the parentheses.`, `${a} × ${b} = ${a * b} and ${a} × ${c} = ${a * c}`, `${a * b} + ${a * c} = ${a * b + a * c}`], a * b + a * c)
      wrong = [a * b + c, s, a + b + c]
      ops = [a, b, c]
    } else if (t === 3) {
      const b = i(1, 9), c = i(1, 9)
      const a = b + c + i(1, 12)
      const s = b + c
      show = `${a} − (${b} + ${c})`
      v = a - s
      s1 = [`Parentheses first: ${b} + ${c} = ${s}`, `Then subtract: ${a} − ${s} = ${v}`]
      s2 = strat('One at a Time', [`Taking away ${b} and ${c} together is the same as taking them away one at a time.`, `${a} − ${b} = ${a - b}`, `${a - b} − ${c} = ${a - b - c}`], a - b - c)
      wrong = [a - b + c, a + b + c, s]
      ops = [a, b, c]
    } else if (t === 4) {
      const c = i(2, 6), x = i(1, 9), y = i(1, 9)
      const a = c * x, b = c * y
      const s = a + b
      show = `(${a} + ${b}) ÷ ${c}`
      v = s / c
      s1 = [`Parentheses first: ${a} + ${b} = ${s}`, `Then divide: ${s} ÷ ${c} = ${v}`]
      s2 = strat('Share Each Part', [`Divide each number inside the parentheses by ${c}.`, `${a} ÷ ${c} = ${x} and ${b} ÷ ${c} = ${y}`, `${x} + ${y} = ${x + y}`], x + y)
      wrong = [a + y, x + b, s]
      ops = [a, b, c]
    } else if (t === 5) {
      const a = i(2, 9), c = i(1, 8), b = c + i(1, 9)
      const p = b - c
      show = `${a} × (${b} − ${c})`
      v = a * p
      s1 = [`Parentheses first: ${b} − ${c} = ${p}`, `Then multiply: ${a} × ${p} = ${v}`]
      s2 = strat('Break It Apart', [`${a} multiplies each number inside the parentheses.`, `${a} × ${b} = ${a * b} and ${a} × ${c} = ${a * c}`, `${a * b} − ${a * c} = ${a * b - a * c}`], a * b - a * c)
      wrong = [a * b - c, p, a * b]
      ops = [a, b, c]
    } else if (t === 6) {
      const b = i(1, 9), a = b + i(1, 9), c = i(2, 9)
      const p = a - b
      show = `(${a} − ${b}) × ${c}`
      v = p * c
      s1 = [`Parentheses first: ${a} − ${b} = ${p}`, `Then multiply: ${p} × ${c} = ${v}`]
      s2 = strat('Break It Apart', [`Each number inside the parentheses gets multiplied by ${c}.`, `${a} × ${c} = ${a * c} and ${b} × ${c} = ${b * c}`, `${a * c} − ${b * c} = ${a * c - b * c}`], a * c - b * c)
      wrong = [a - b * c, a * c - b, p]
      ops = [a, b, c]
    } else if (t === 10) {
      const c = i(1, 9), b = c + i(1, 9), a = b + i(1, 15)
      const p = b - c
      show = `${a} − (${b} − ${c})`
      v = a - p
      s1 = [`Parentheses first: ${b} − ${c} = ${p}`, `Then subtract: ${a} − ${p} = ${v}`]
      s2 = strat('Take Away, Then Give Back', [`Taking away all ${b} is ${c} too many. So take away ${b}, then give ${c} back.`, `Take away ${b}: ${a} − ${b} = ${a - b}`, `Give back ${c}: ${a - b} + ${c} = ${a - b + c}`], a - b + c)
      wrong = [a - b - c, a - b, p]
      ops = [a, b, c]
    } else if (t === 7) {
      const a = i(1, 9), b = i(1, 9), e = i(1, 7), c = e + i(2, 6)
      const s = a + b, p = c - e
      show = `(${a} + ${b}) × (${c} − ${e})`
      v = s * p
      s1 = [`First parentheses: ${a} + ${b} = ${s}`, `Second parentheses: ${c} − ${e} = ${p}`, `Then multiply: ${s} × ${p} = ${v}`]
      s2 = strat('Break It Apart', [`Do the second parentheses: ${c} − ${e} = ${p}`, `Now multiply each number in the first parentheses by ${p}.`, `${a} × ${p} = ${a * p} and ${b} × ${p} = ${b * p}`, `${a * p} + ${b * p} = ${a * p + b * p}`], a * p + b * p)
      wrong = [a + b * c - e, s * c - e, s + p]
      ops = [a, b, c, e]
    } else if (t === 8) {
      const a = i(2, 9), b = i(1, 9), c = i(1, 9)
      const s = b + c, m = a * s
      const e = i(1, Math.min(m - 1, 20))
      show = `${a} × (${b} + ${c}) − ${e}`
      v = m - e
      s1 = [`Parentheses first: ${b} + ${c} = ${s}`, `Next multiply: ${a} × ${s} = ${m}`, `Last, subtract: ${m} − ${e} = ${v}`]
      s2 = strat('Break It Apart', [`${a} multiplies each number inside the parentheses.`, `${a} × ${b} + ${a} × ${c} = ${a * b + a * c}`, `Then take away ${e}: ${a * b + a * c} − ${e} = ${a * b + a * c - e}`], a * b + a * c - e)
      wrong = [a * b + c - e, a * (b + c - e), m]
      ops = [a, b, c, e]
    } else {
      const a = i(1, 20), b = i(2, 9), e = i(1, 7), c = e + i(1, 8)
      const p = c - e, m = b * p
      show = `${a} + ${b} × (${c} − ${e})`
      v = a + m
      s1 = [`Parentheses first: ${c} − ${e} = ${p}`, `Next multiply: ${b} × ${p} = ${m}`, `Last, add: ${a} + ${m} = ${v}`]
      s2 = strat('Break It Apart', [`${b} multiplies each number inside the parentheses.`, `${b} × ${c} = ${b * c} and ${b} × ${e} = ${b * e}`, `${b * c} − ${b * e} = ${b * c - b * e}`, `Then add ${a}: ${a} + ${b * c - b * e} = ${a + b * c - b * e}`], a + b * c - b * e)
      wrong = [(a + b) * p, a + b * c - e, m]
      ops = [a, b, c, e]
    }
    const last = s1[s1.length - 1]
    return {
      prompt: `What is ${show}? Do the part inside the parentheses first.`,
      eq: `${show} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: v,
      strategies: [strat('Parentheses First', s1, Number(last.slice(last.lastIndexOf('=') + 1))), s2],
      // skipped the parentheses, stopped early
      distractors: wrongs(v, [...wrong, v + 1]).slice(0, 4),
      operands: ops,
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.expressions */
  'al.expressions': (rng, d) => {
    const r = R(rng)
    const hi = d === 1 ? 5 : d === 2 ? 9 : 12
    interface T {
      words: { w: string; keys: string[]; ask?: string }[]
      expr: string
      value: number
      wrong: [string, number][]
      calc: string[]
      calcValue: number
      s2: Strat
      ops: number[]
    }
    const make = (): T => {
      const a = r.int(2, hi), b = r.int(2, hi), c = r.int(2, hi)
      const t = r.int(1, 8)
      if (t === 1 || t === 7) {
        const P = a * b
        const m = mulAlt(a, b)
        return {
          words:
            t === 7
              ? [{ w: `{n} has ${a} packs of cards. Each pack has ${b} cards. Then he gets ${c} more cards. Which one shows how many cards he has?`, keys: [`${a} packs of ${b} cards is ${a} × ${b}.`, `"${c} more cards" means + ${c} at the end.`] }]
              : [
                  { w: `Multiply ${a} and ${b}. Then add ${c}.`, keys: [`"Multiply ${a} and ${b}" is ${a} × ${b}.`, `"Then add ${c}" puts + ${c} after it.`], ask: `Multiply ${a} and ${b}. Then add ${c}. What do you get?` },
                  { w: `${c} more than ${a} times ${b}`, keys: [`"${a} times ${b}" is ${a} × ${b}.`, `"${c} more than" means add ${c} to it.`], ask: `What is ${c} more than ${a} times ${b}?` },
                ],
          expr: `${a} × ${b} + ${c}`,
          value: a * b + c,
          wrong: [[`${a} × (${b} + ${c})`, a * (b + c)], [`${a} + ${b} + ${c}`, a + b + c], [`(${a} + ${c}) × ${b}`, (a + c) * b]],
          calc: [`Multiply: ${a} × ${b} = ${P}`, `Add: ${P} + ${c} = ${P + c}`],
          calcValue: P + c,
          s2: strat('Build It', [...m.steps, `Then add ${c}: ${m.value} + ${c} = ${m.value + c}`], m.value + c),
          ops: [a, b, c],
        }
      }
      if (t === 2 || t === 8) {
        const s = a + b
        return {
          words:
            t === 8
              ? [{ w: `${c} friends go to the game. Each one pays $${a} for a ticket and $${b} for a snack. Which one shows all the money they pay?`, keys: [`One friend pays ${a} + ${b}.`, `There are ${c} friends, so all of that is multiplied by ${c}.`] }]
              : [
                  { w: `Add ${a} and ${b}. Then multiply by ${c}.`, keys: [`"Add ${a} and ${b}" is ${a} + ${b}. It comes first, so it goes in parentheses.`, `"Then multiply by ${c}" puts × ${c} after it.`], ask: `Add ${a} and ${b}. Then multiply by ${c}. What do you get?` },
                  ...(d > 1 ? [{ w: `${c} times the sum of ${a} and ${b}`, keys: [`"The sum of ${a} and ${b}" is ${a} + ${b}. Keep it together in parentheses.`, `"${c} times" multiplies all of it by ${c}.`], ask: `What is ${c} times the sum of ${a} and ${b}?` }] : []),
                ],
          expr: `(${a} + ${b}) × ${c}`,
          value: s * c,
          wrong: [[`${a} + ${b} × ${c}`, a + b * c], [`${a} × ${b} + ${c}`, a * b + c], [`${a} + ${b} + ${c}`, a + b + c]],
          calc: [`Add: ${a} + ${b} = ${s}`, `Multiply: ${s} × ${c} = ${s * c}`],
          calcValue: s * c,
          s2: strat('Break It Apart', [`Multiply each part by ${c}: ${a} × ${c} = ${a * c} and ${b} × ${c} = ${b * c}`, `${a * c} + ${b * c} = ${a * c + b * c}`], a * c + b * c),
          ops: [a, b, c],
        }
      }
      if (t === 3) {
        const P = a * b
        const e = r.int(1, Math.min(P - 1, hi + 3))
        const m = mulAlt(a, b)
        return {
          words: [
            { w: `Multiply ${a} and ${b}. Then take away ${e}.`, keys: [`"Multiply ${a} and ${b}" is ${a} × ${b}.`, `"Then take away ${e}" puts − ${e} after it.`], ask: `Multiply ${a} and ${b}. Then take away ${e}. What do you get?` },
            { w: `${e} less than ${a} times ${b}`, keys: [`"${a} times ${b}" is ${a} × ${b}. Start with that.`, `"${e} less than" means take ${e} away from it.`], ask: `What is ${e} less than ${a} times ${b}?` },
          ],
          expr: `${a} × ${b} − ${e}`,
          value: P - e,
          wrong: [[`${e} − ${a} × ${b}`, e - P], [`${a} × (${b} − ${e})`, a * (b - e)], [`${a} + ${b} − ${e}`, a + b - e]],
          calc: [`Multiply: ${a} × ${b} = ${P}`, `Take away: ${P} − ${e} = ${P - e}`],
          calcValue: P - e,
          s2: strat('Build It', [...m.steps, `Then take away ${e}: ${m.value} − ${e} = ${m.value - e}`], m.value - e),
          ops: [a, b, e],
        }
      }
      if (t === 4) {
        const big = b + r.int(1, hi)
        const p = big - b
        return {
          words: [
            { w: `Take ${b} away from ${big}. Then multiply by ${c}.`, keys: [`"Take ${b} away from ${big}" is ${big} − ${b}. It comes first, so it goes in parentheses.`, `"Then multiply by ${c}" puts × ${c} after it.`], ask: `Take ${b} away from ${big}. Then multiply by ${c}. What do you get?` },
            { w: `Subtract ${b} from ${big}. Then multiply by ${c}.`, keys: [`"Subtract ${b} from ${big}" starts with ${big}: ${big} − ${b}. Put it in parentheses.`, `"Then multiply by ${c}" puts × ${c} after it.`], ask: `Subtract ${b} from ${big}. Then multiply by ${c}. What do you get?` },
          ],
          expr: `(${big} − ${b}) × ${c}`,
          value: p * c,
          wrong: [[`(${b} − ${big}) × ${c}`, (b - big) * c], [`${big} − ${b} × ${c}`, big - b * c], [`${big} × ${c} − ${b}`, big * c - b]],
          calc: [`Take away: ${big} − ${b} = ${p}`, `Multiply: ${p} × ${c} = ${p * c}`],
          calcValue: p * c,
          s2: strat('Break It Apart', [`Multiply each part by ${c}: ${big} × ${c} = ${big * c} and ${b} × ${c} = ${b * c}`, `${big * c} − ${b * c} = ${big * c - b * c}`], big * c - b * c),
          ops: [big, b, c],
        }
      }
      if (t === 5) {
        const s = a + b
        return {
          words: [
            { w: `Add ${a} and ${b}. Then double it.`, keys: [`"Add ${a} and ${b}" is ${a} + ${b}. It comes first, so it goes in parentheses.`, `"Double it" means 2 times all of it.`], ask: `Add ${a} and ${b}. Then double it. What do you get?` },
            ...(d > 1 ? [{ w: `Double the sum of ${a} and ${b}`, keys: [`"The sum of ${a} and ${b}" is ${a} + ${b}. Keep it together in parentheses.`, `"Double" means 2 times all of it.`], ask: `What is double the sum of ${a} and ${b}?` }] : []),
          ],
          expr: `2 × (${a} + ${b})`,
          value: 2 * s,
          wrong: [[`2 × ${a} + ${b}`, 2 * a + b], [`${a} + ${b} + 2`, s + 2], [`${a} + 2 × ${b}`, a + 2 * b]],
          calc: [`Add: ${a} + ${b} = ${s}`, `Double: ${s} + ${s} = ${s + s}`],
          calcValue: s + s,
          s2: strat('Double Each Part', [`Double each part: ${a} + ${a} = ${2 * a} and ${b} + ${b} = ${2 * b}`, `${2 * a} + ${2 * b} = ${2 * a + 2 * b}`], 2 * a + 2 * b),
          ops: [a, b, 2],
        }
      }
      const x = 2 * a, y = 2 * b
      const s = x + y
      return {
        words: [
          { w: `Add ${x} and ${y}. Then cut it in half.`, keys: [`"Add ${x} and ${y}" is ${x} + ${y}. It comes first, so it goes in parentheses.`, `"Cut it in half" means divide all of it by 2.`], ask: `Add ${x} and ${y}. Then cut it in half. What do you get?` },
          ...(d > 1 ? [{ w: `Half of the sum of ${x} and ${y}`, keys: [`"The sum of ${x} and ${y}" is ${x} + ${y}. Keep it together in parentheses.`, `"Half of" means divide all of it by 2.`], ask: `What is half of the sum of ${x} and ${y}?` }] : []),
        ],
        expr: `(${x} + ${y}) ÷ 2`,
        value: s / 2,
        wrong: [[`${x} + ${y} ÷ 2`, x + b], [`${x} ÷ 2 + ${y}`, a + y], [`(${x} + ${y}) × 2`, s * 2]],
        calc: [`Add: ${x} + ${y} = ${s}`, `Half: ${s} ÷ 2 = ${s / 2}`],
        calcValue: s / 2,
        s2: strat('Half of Each Part', [`Take half of each part: ${x} ÷ 2 = ${a} and ${y} ÷ 2 = ${b}`, `${a} + ${b} = ${a + b}`], a + b),
        ops: [x, y, 2],
      }
    }
    let T = make()
    for (let n = 0; n < 20 && T.wrong.filter(([, v]) => v !== T.value).length < 2; n++) T = make()
    const W = r.pick(T.words)
    const wrong = T.wrong.filter(([, v]) => v !== T.value)
    if (W.ask && r.chance(0.5)) {
      return {
        prompt: W.ask,
        input: 'number',
        answer: T.value,
        strategies: [strat('Write It, Then Solve', [`Write the words as math: ${T.expr}`, ...T.calc], T.calcValue), T.s2],
        // did the steps in the wrong order
        distractors: wrongs(T.value, [...wrong.map(([, v]) => v), T.value + 1]).slice(0, 4),
        operands: T.ops,
        difficulty: d,
      }
    }
    const opts: [string, number][] = [[T.expr, T.value], ...wrong]
    const picked = choice(T.expr, wrong.map(([l]) => l), rng)
    const byValue = opts.filter(([l, v]) => picked.choices!.includes(l) && v === T.calcValue)[0][0]
    return {
      prompt: W.ask ? `Which one matches the words? ${W.w}` : W.w,
      ...picked,
      strategies: [
        strat('Words to Math', [...W.keys, `So it is ${T.expr}.`], T.expr),
        strat('Check with the Numbers', [`Do what the words say, one step at a time.`, ...T.calc, `Only ${byValue} makes ${T.calcValue}.`], byValue),
      ],
      operands: T.ops,
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.variables */
  'al.variables': (rng, d) => {
    const r = R(rng)
    const L = r.pick(LET)
    if (r.chance(0.35)) {
      // write it with a letter
      const a = r.int(2, d === 1 ? 5 : 9)
      type O = { label: string; f: (n: number) => number }
      const o = (label: string, f: (n: number) => number): O => ({ label, f })
      const plus = o(`${L} + ${a}`, (n) => n + a),
        minus = o(`${L} − ${a}`, (n) => n - a),
        rminus = o(`${a} − ${L}`, (n) => a - n),
        times = o(`${a}${L}`, (n) => a * n),
        div = o(`${L} ÷ ${a}`, (n) => n / a),
        rdiv = o(`${a} ÷ ${L}`, (n) => a / n)
      const forms: { p: string; ok: O; no: O[]; keys: string[]; say: (t: number, v: number) => string }[] = [
        { p: `Which one means "${a} more than ${L}"?`, ok: plus, no: [times, minus, rminus], keys: [`"More than" means add.`, `Start with ${L} and add ${a}.`], say: (t, v) => `${a} more than ${t} is ${v}.` },
        { p: `{n} has ${L} baseball cards. He gets ${a} more. Which one shows how many cards he has now?`, ok: plus, no: [times, minus, rminus], keys: [`He starts with ${L} cards. Getting more means add.`, `Start with ${L} and add ${a}.`], say: (t, v) => `${t} cards and ${a} more makes ${v} cards.` },
        { p: `Which one means "${a} less than ${L}"?`, ok: minus, no: [rminus, plus, times], keys: [`"Less than" means take away.`, `Start with ${L}. Take ${a} away from it. ${L} goes first.`], say: (t, v) => `${a} less than ${t} is ${v}.` },
        { p: `{n} has ${L} stickers. He gives ${a} away. Which one shows how many he has left?`, ok: minus, no: [rminus, plus, times], keys: [`He starts with ${L} stickers. Giving away means take away.`, `Start with ${L} and take away ${a}. ${L} goes first.`], say: (t, v) => `${t} stickers take away ${a} leaves ${v}.` },
        { p: `Which one means "${a} times ${L}"?`, ok: times, no: [plus, div, o(`${L} + ${L}`, (n) => n + n)].slice(0, a === 2 ? 2 : 3), keys: [`"Times" means multiply.`, `A number right next to a letter means multiply. ${a} times ${L} is written ${a}${L}.`], say: (t, v) => `${a} times ${t} is ${v}.` },
        { p: `One pack has ${L} cards. {n} has ${a} packs. Which one shows how many cards he has?`, ok: times, no: [plus, div, minus], keys: [`${a} packs with ${L} cards in each is ${a} groups of ${L}. That is multiply.`, `${a} times ${L} is written ${a}${L}.`], say: (t, v) => `${a} packs of ${t} cards is ${v} cards.` },
        { p: `${L} snacks are shared by ${a} friends. Each friend gets the same. Which one shows how many each friend gets?`, ok: div, no: [rdiv, times, minus], keys: [`Sharing into equal groups means divide.`, `The ${L} snacks get split up, so ${L} goes first.`], say: (t, v) => `${t} snacks shared by ${a} friends is ${v} each.` },
        ...(d > 1
          ? [
              { p: `Which one means "double ${L}, then add ${a}"?`, ok: o(`2${L} + ${a}`, (n) => 2 * n + a), no: [o(`${L} + 2 + ${a}`, (n) => n + 2 + a), o(`2 × (${L} + ${a})`, (n) => 2 * (n + a)), o(`${a}${L} + 2`, (n) => a * n + 2)], keys: [`"Double ${L}" is 2 times ${L}. Write 2${L}.`, `"Then add ${a}" puts + ${a} after it.`], say: (t: number, v: number) => `Double ${t} is ${2 * t}. Add ${a} to get ${v}.` },
            ]
          : []),
      ]
      const F = r.pick(forms)
      const all = [F.ok, ...F.no]
      const picked = choice(F.ok.label, F.no.map((x) => x.label), rng)
      // a test number that makes every choice come out different from the right one
      let t = a * 2
      for (const c of [a * 2, a * 3, a * 4, a * 5, a * 6]) {
        if (all.every((x) => Number.isInteger(x.f(c))) && F.no.every((x) => x.f(c) !== F.ok.f(c))) {
          t = c
          break
        }
      }
      const V = F.ok.f(t)
      const found = all.filter((x) => picked.choices!.includes(x.label) && x.f(t) === V)[0].label
      return {
        prompt: `The letter ${L} stands for a mystery number. ${F.p}`,
        ...picked,
        strategies: [
          strat('Words to Math', [...F.keys, `So it is ${F.ok.label}.`], F.ok.label),
          strat('Try a Number', [`Pretend ${L} is ${t} and see which choice fits.`, F.say(t, V), `When ${L} is ${t}, only ${found} makes ${V}.`], found),
        ],
        operands: [a],
        difficulty: d,
      }
    }
    const form = d === 1 ? r.pick(['add', 'subL', 'subA', 'mulx'] as const) : d === 2 ? r.pick(['mul', 'mulAdd', 'div', 'mulSub'] as const) : r.pick(['mulAdd', 'mulSub', 'subMul', 'paren', 'div'] as const)
    const n = d === 1 ? r.int(1, 10) : d === 2 ? r.int(2, 9) : r.int(3, 12)
    const a = r.int(2, d === 3 ? 6 : 5)
    const b = r.int(1, 9)
    let show: string, v: number, s1: string[], s2: Strat, wrong: number[], note = ''
    const swap = `${L} is ${n}. Put ${n} in the place of ${L}.`
    if (form === 'add') {
      show = `${L} + ${b}`
      v = n + b
      s1 = [swap, `${n} + ${b} = ${v}`]
      const pts = jump(n, b)
      s2 = strat('Number Line', [`Start at ${n}, the number ${L} stands for. Go up ${b}.`, hopText(pts)], pts[pts.length - 1], { line: pts })
      wrong = [n * b, Math.abs(n - b), n * 10 + b]
    } else if (form === 'subL') {
      const top = n + r.int(1, 10)
      show = `${top} − ${L}`
      v = top - n
      s1 = [swap, `${top} − ${n} = ${v}`]
      const pts = jump(top, -n)
      s2 = strat('Number Line', [`Start at ${top}. Go back ${n}, the number ${L} stands for.`, hopText(pts)], pts[pts.length - 1], { line: pts })
      wrong = [top + n, top, n]
    } else if (form === 'subA') {
      const m = n + b
      show = `${L} − ${b}`
      v = n
      s1 = [`${L} is ${m}. Put ${m} in the place of ${L}.`, `${m} − ${b} = ${m - b}`]
      const pts = jump(m, -b)
      s2 = strat('Number Line', [`Start at ${m}, the number ${L} stands for. Go back ${b}.`, hopText(pts)], pts[pts.length - 1], { line: pts })
      wrong = [m + b, m, b]
      return varItem(L, m, show, v, s1, s2, wrong, '', [m, b], d)
    } else if (form === 'mulx' || form === 'mul') {
      show = form === 'mulx' ? `${a} × ${L}` : `${a}${L}`
      if (form === 'mul') note = ` ${a}${L} means ${a} times ${L}.`
      v = a * n
      s1 = [swap, `${a} × ${n} = ${v}`]
      const m = mulAlt(a, n, true)
      s2 = strat('Build It', [`${show} means ${a} groups of ${L}, and ${L} is ${n}.`, ...m.steps], m.value, a <= 6 ? { html: tapeSVG(Array(a).fill(`${n}`), `${a} groups of ${n}`) } : {})
      wrong = [a + n, a * 10 + n, v + a]
    } else if (form === 'mulAdd') {
      show = `${a}${L} + ${b}`
      note = ` ${a}${L} means ${a} times ${L}.`
      v = a * n + b
      s1 = [swap, `Multiply first: ${a} × ${n} = ${a * n}`, `Then add: ${a * n} + ${b} = ${v}`]
      const m = mulAlt(a, n, true)
      s2 = strat('Build It', [...m.steps, `Then add ${b}: ${m.value} + ${b} = ${m.value + b}`], m.value + b)
      wrong = [a * (n + b), a + n + b, a * 10 + n + b]
    } else if (form === 'mulSub') {
      const e = r.int(1, Math.min(a * n - 1, 9))
      show = `${a}${L} − ${e}`
      note = ` ${a}${L} means ${a} times ${L}.`
      v = a * n - e
      s1 = [swap, `Multiply first: ${a} × ${n} = ${a * n}`, `Then subtract: ${a * n} − ${e} = ${v}`]
      const m = mulAlt(a, n, true)
      s2 = strat('Build It', [...m.steps, `Then take away ${e}: ${m.value} − ${e} = ${m.value - e}`], m.value - e)
      wrong = [a * (n - e), a + n - e, a * n + e]
      return varItem(L, n, show, v, s1, s2, wrong, note, [n, a, e], d)
    } else if (form === 'subMul') {
      const top = a * n + r.int(1, 20)
      show = `${top} − ${a}${L}`
      note = ` ${a}${L} means ${a} times ${L}.`
      v = top - a * n
      s1 = [swap, `Multiply first: ${a} × ${n} = ${a * n}`, `Then subtract: ${top} − ${a * n} = ${v}`]
      let cur = top
      for (let j = 0; j < a; j++) cur -= n
      s2 = strat('Take Away Groups', [`${a}${L} is ${a} groups of ${n}. Take away ${n}, ${a} times.`, `${top}${` − ${n}`.repeat(a)} = ${cur}`], cur)
      wrong = [(top - a) * n, top - a - n, top - n]
      return varItem(L, n, show, v, s1, s2, wrong, note, [n, a, top], d)
    } else if (form === 'paren') {
      show = `${a} × (${L} + ${b})`
      v = a * (n + b)
      s1 = [swap, `Parentheses first: ${n} + ${b} = ${n + b}`, `Then multiply: ${a} × ${n + b} = ${v}`]
      s2 = strat('Break It Apart', [`${a} multiplies each number inside the parentheses.`, `${a} × ${n} = ${a * n} and ${a} × ${b} = ${a * b}`, `${a * n} + ${a * b} = ${a * n + a * b}`], a * n + a * b)
      wrong = [a * n + b, a + n + b, n + b]
    } else {
      const m = a * n
      show = `${L} ÷ ${a}`
      v = n
      s1 = [`${L} is ${m}. Put ${m} in the place of ${L}.`, `${m} ÷ ${a} = ${m / a}`]
      let q = 1
      while (q * a < m) q++
      s2 = strat('Think Times', [`${m} ÷ ${a} asks: what number times ${a} makes ${m}?`, `${q} × ${a} = ${m}`, `So the answer is ${q}.`], q)
      wrong = [m - a, m * a > 300 ? n + 1 : m * a, m + a]
      return varItem(L, m, show, v, s1, s2, wrong, '', [m, a], d)
    }
    return varItem(L, n, show, v, s1, s2, wrong, note, [n, a, b], d)
  },

  /* ---------------------------------------------------------------- al.like-terms */
  'al.like-terms': (rng, d) => {
    const r = R(rng)
    const L = r.pick(LET)
    type Tok = { k: number; isL: boolean }
    const lt = (k: number): Tok => ({ k, isL: true })
    const num = (k: number): Tok => ({ k, isL: false })
    const show = (ts: Tok[]) => ts.map((t, i) => (i ? (t.k < 0 ? ' − ' : ' + ') : '') + (t.isL ? (Math.abs(t.k) === 1 ? L : `${Math.abs(t.k)}${L}`) : `${t.k}`)).join('')
    const valueExpr = (ts: Tok[], t: number) => ts.map((x, i) => (i ? (x.k < 0 ? ' − ' : ' + ') : '') + (x.isL ? `${Math.abs(x.k)} × ${t}` : `${x.k}`)).join('')
    const valueAt = (ts: Tok[], t: number) => ts.reduce((s, x) => s + (x.isL ? x.k * t : x.k), 0)

    if (d === 3 && r.chance(0.45)) {
      // which expression is the same?
      for (let tries = 0; tries < 30; tries++) {
        const a = r.int(2, 6), b = r.int(1, 6), c = r.int(1, 9), e = r.int(1, 9)
        const four = r.chance(0.5)
        const ts = four ? [lt(a), num(c), lt(b), num(e)] : r.chance(0.5) ? [lt(a), num(c), lt(b)] : [num(c), lt(a), lt(b)]
        const coef = a + b, K = four ? c + e : c
        type O = { label: string; c: number; K: number }
        const o = (cc: number, kk: number): O => ({ label: kk ? `${cc}${L} + ${kk}` : `${cc}${L}`, c: cc, K: kk })
        const ok = o(coef, K)
        const no = (four ? [o(a + c, b + e), o(coef + K, 0), o(coef, c), o(a * b, K)] : [o(coef + K, 0), o(a + c, b), o(a * b, c), o(coef, 0)]).filter((x) => x.label !== ok.label && !(x.c === ok.c && x.K === ok.K))
        const picked = choice(ok.label, [...new Set(no.map((x) => x.label))], rng)
        const shownOpts = [ok, ...no].filter((x, i, arr) => picked.choices!.includes(x.label) && arr.findIndex((y) => y.label === x.label) === i)
        const t = [2, 3, 4, 5, 6, 7].find((tt) => shownOpts.filter((x) => x.c * tt + x.K === valueAt(ts, tt)).length === 1)
        if (!t) continue
        const V = valueAt(ts, t)
        const found = shownOpts.filter((x) => x.c * t + x.K === V)[0]
        return {
          prompt: `The letter ${L} stands for a number. Which one is the same as ${show(ts)}?`,
          eq: show(ts),
          ...picked,
          strategies: [
            strat('Sort the Teams', [`Put the ${L}'s together: ${a} + ${b} = ${coef}. That makes ${coef}${L}.`, four ? `Put the plain numbers together: ${c} + ${e} = ${K}` : `The plain number ${c} has no ${L}. It stays by itself.`, `So it is ${coef}${L} + ${K}.`], `${coef}${L} + ${K}`),
            strat('Try a Number', [`Pretend ${L} is ${t}: ${valueExpr(ts, t)} = ${V}`, `Test each choice with ${L} as ${t}.`, `Only ${found.label} works: ${found.c} × ${t} + ${found.K} = ${V}`], found.label),
          ],
          operands: [a, b, c, ...(four ? [e] : [])],
          difficulty: d,
        }
      }
    }
    let ts: Tok[]
    const a = r.int(2, d === 1 ? 6 : 9), b = r.int(2, d === 1 ? 6 : 9)
    if (d === 1) ts = r.chance(0.2) ? [lt(1), lt(1), lt(1)] : [lt(a), lt(b)]
    else if (d === 2) {
      const f = r.int(0, 3)
      ts = f === 0 ? [lt(a + b), lt(-b)] : f === 1 ? (r.chance(0.5) ? [lt(a), lt(1)] : [lt(1), lt(a)]) : f === 2 ? [lt(a), lt(b), lt(r.int(1, 5))] : [lt(a), lt(b)]
    } else {
      const f = r.int(0, 2)
      const c = r.int(1, 9)
      ts = f === 0 ? [lt(a), num(c), lt(b)] : f === 1 ? [lt(a), lt(b), lt(-r.int(1, a + b - 2))] : [num(c), lt(a), lt(1)]
    }
    const Ls = ts.filter((t) => t.isL)
    const K = ts.filter((t) => !t.isL).reduce((s, t) => s + t.k, 0)
    const coef = Ls.reduce((s, t) => s + t.k, 0)
    const coefExpr = Ls.map((t, i) => (i ? (t.k < 0 ? ' − ' : ' + ') : '') + Math.abs(t.k)).join('')
    const lone = Ls.some((t) => Math.abs(t.k) === 1)
    const t = r.pick([2, 5, 10].filter((x) => !ts.some((y) => Math.abs(y.k) === x)))
    const V = valueAt(ts, t)
    const allPlus = Ls.every((x) => x.k > 0)
    return {
      prompt: `The letter ${L} stands for a number. Put the ${L}'s together: ${show(ts)}. How many ${L}'s is that in all?`,
      eq: `${show(ts)} = ${Q}${L}${K ? ` + ${K}` : ''}`,
      input: 'number',
      answer: coef,
      unit: `${L}'s`,
      strategies: [
        strat(
          `Count the ${L}'s`,
          [
            `The number in front tells how many ${L}'s.${lone ? ` ${L} by itself is 1 ${L}.` : ''}`,
            `${allPlus ? 'Put them together' : 'Add and take away'}: ${coefExpr} = ${coef}`,
            ...(K ? [`The plain number ${K} has no ${L}. It stays by itself.`] : []),
            `So there are ${coef} ${L}'s. Write ${coef}${L}${K ? ` + ${K}` : ''}.`,
          ],
          coef,
          allPlus && coef <= 12 ? { html: tapeSVG(Array(coef).fill(L), `${coef} ${L}'s`) } : {},
        ),
        strat('Try a Number', [`Pretend ${L} is ${t} and work it out.`, `${valueExpr(ts, t)} = ${V}`, ...(K ? [`Take away the plain number: ${V} − ${K} = ${V - K}`] : []), `How many ${t}s is that? ${V - K} ÷ ${t} = ${(V - K) / t}. So it is ${(V - K) / t}${L}.`], (V - K) / t),
      ],
      // multiplied the numbers, forgot that a lone letter counts as 1, added when it said subtract, added the plain number too
      distractors: wrongs(coef, [Ls.reduce((s, x) => s * Math.abs(x.k), 1), lone ? coef - 1 : coef + 1, Ls.reduce((s, x) => s + Math.abs(x.k), 0), coef + K, Ls.length === 2 ? Math.abs(Ls[0].k) * 10 + Math.abs(Ls[1].k) : coef + 2]).slice(0, 4),
      operands: ts.map((x) => x.k),
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.one-step-add */
  'al.one-step-add': (rng, d) => {
    const r = R(rng)
    const L = r.pick(LET)
    const form = d === 1 ? r.pick(['add', 'add2', 'sub'] as const) : d === 2 ? r.pick(['add', 'add2', 'sub', 'sub'] as const) : r.pick(['add', 'sub', 'rsub', 'rsub'] as const)
    const a = d === 1 ? r.int(1, 9) : d === 2 ? r.int(5, 40) : r.int(10, 99)
    const n = d === 1 ? r.int(1, 12) : d === 2 ? r.int(5, 60) : r.int(10, 150)
    const intro = `The letter ${L} stands for a mystery number.`
    if (form === 'add' || form === 'add2') {
      const c = n + a
      const eq = form === 'add' ? `${L} + ${a} = ${c}` : `${a} + ${L} = ${c}`
      return {
        prompt: `${intro} ${eq}. What is ${L}?`,
        eq,
        visual: scaleSVG(form === 'add' ? `${L} + ${a}` : `${a} + ${L}`, `${c}`),
        input: 'number',
        answer: n,
        strategies: [
          strat('Undo It', [`${a} was added to ${L}. To undo adding, take away. Do it to both sides to stay balanced.`, `${c} − ${a} = ${c - a}`, `Check: ${form === 'add' ? `${c - a} + ${a}` : `${a} + ${c - a}`} = ${c}`], c - a, { html: scaleSVG(L, `${c} − ${a}`) }),
          countUpStrat('Count Up', a, c, `${a} and ${L} make ${c}. Start at ${a} and count up to ${c}.`, (far) => `So ${L} is ${far}.`),
        ],
        // added instead of undoing, wrote the total, off by one
        distractors: wrongs(n, [c + a, c, n + 1, n - 1, d > 1 ? n + 10 : n + 2]).slice(0, 4),
        operands: [a, c],
        difficulty: d,
      }
    }
    if (form === 'sub') {
      const whole = n + a // L is the whole; L − a = n
      const eq = `${L} − ${a} = ${n}`
      const pts = jump(n, a)
      return {
        prompt: `${intro} ${eq}. What is ${L}?`,
        eq,
        input: 'number',
        answer: whole,
        strategies: [
          strat('Undo It', [`${a} was taken away from ${L}. To undo taking away, add. Do it to both sides.`, `${n} + ${a} = ${n + a}`, `Check: ${n + a} − ${a} = ${n}`], n + a),
          strat('Draw a Tape', [`${L} is the whole thing. ${a} was taken away and ${n} is left. Put the two parts back together.`, `Start at ${n}. ${hopText(pts)}`, `So ${L} is ${pts[pts.length - 1]}.`], pts[pts.length - 1], { html: tapeSVG([`${a}`, `${n}`], `${L} is all of it`), line: pts }),
        ],
        // subtracted again, wrote a number from the problem, off by one
        distractors: wrongs(whole, [Math.abs(n - a), n, whole + 1, whole - 1, d > 1 ? whole - 10 : whole + 2]).slice(0, 4),
        operands: [a, n],
        difficulty: d,
      }
    }
    const top = n + a // top − L = a
    const eq = `${top} − ${L} = ${a}`
    return {
      prompt: `${intro} ${eq}. What is ${L}?`,
      eq,
      input: 'number',
      answer: n,
      strategies: [
        strat('Fact Family', [`${top} is the whole. ${L} and ${a} are the two parts.`, `Take away the part you know: ${top} − ${a} = ${top - a}`, `Check: ${top} − ${top - a} = ${a}`], top - a, { html: tapeSVG([L, `${a}`], `${top}`) }),
        countUpStrat('Count Up', a, top, `${a} is left after taking ${L} away from ${top}. Count up from ${a} to ${top}.`, (far) => `So ${L} is ${far}.`),
      ],
      distractors: wrongs(n, [top + a, top, n + 1, n - 1, n + 10]).slice(0, 4),
      operands: [a, top],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.one-step-mult */
  'al.one-step-mult': (rng, d) => {
    const r = R(rng)
    const L = r.pick(LET)
    const form = d === 1 ? r.pick(['mul', 'mul', 'div'] as const) : d === 2 ? r.pick(['mul', 'div'] as const) : r.pick(['mul', 'div', 'rdiv'] as const)
    const a = d === 1 ? r.pick([2, 3, 5, 10]) : d === 2 ? r.int(2, 9) : r.int(3, 12)
    const n = d === 1 ? r.int(1, 10) : d === 2 ? r.int(2, 12) : r.int(4, 20)
    const c = a * n
    const intro = `The letter ${L} stands for a mystery number.`
    const skip = (by: number, to: number): { steps: string[]; count: number; line?: number[] } => {
      const list: number[] = []
      for (let x = by; x <= to; x += by) list.push(x)
      return { steps: [`Count by ${by}s until you get to ${to}.`, list.length <= 12 ? list.join(', ') : `${list.slice(0, 4).join(', ')} … ${list.slice(-2).join(', ')}`, `That took ${list.length} counts.`], count: list.length, line: list.length <= 10 ? [0, ...list] : undefined }
    }
    if (form === 'mul') {
      const lhs = d === 1 ? `${a} × ${L}` : `${a}${L}`
      const eq = `${lhs} = ${c}`
      const sk = skip(a, c)
      return {
        prompt: `${intro} ${eq}. ${d === 1 ? '' : `${a}${L} means ${a} times ${L}. `}What is ${L}?`,
        eq,
        visual: a <= 6 ? scaleSVG(Array(a).fill(L).join(' + '), `${c}`) : undefined,
        input: 'number',
        answer: n,
        strategies: [
          strat('Undo It', [`${L} was multiplied by ${a}. To undo times, divide. Do it to both sides to stay balanced.`, `${c} ÷ ${a} = ${c / a}`, `Check: ${a} × ${c / a} = ${c}`], c / a, a <= 10 ? { html: tapeSVG(Array(a).fill(L), `${c} in all`) } : {}),
          strat('Skip Count', [...sk.steps, `So ${a} times ${sk.count} is ${c}. ${L} is ${sk.count}.`], sk.count, sk.line ? { line: sk.line } : {}),
        ],
        // subtracted instead of dividing, multiplied again, off by one
        distractors: wrongs(n, [c - a, c * a > 500 ? c + a : c * a, n + 1, n - 1]).slice(0, 4),
        operands: [a, c],
        difficulty: d,
      }
    }
    if (form === 'div') {
      // L ÷ a = n, so L = a × n
      const eq = `${L} ÷ ${a} = ${n}`
      const m = mulAlt(a, n, true)
      return {
        prompt: `${intro} ${eq}. What is ${L}?`,
        eq,
        input: 'number',
        answer: c,
        strategies: [
          strat('Undo It', [`${L} was split into ${a} equal groups. To undo dividing, multiply. Do it to both sides.`, `${n} × ${a} = ${n * a}`, `Check: ${n * a} ÷ ${a} = ${n}`], n * a),
          strat('Build the Groups', [`${L} is split into ${a} groups with ${n} in each group. Put the groups back together.`, ...m.steps, `So ${L} is ${m.value}.`], m.value, a <= 10 ? { html: tapeSVG(Array(a).fill(`${n}`), `${L} is all of it`) } : {}),
        ],
        // divided again, added, off by one group
        distractors: wrongs(c, [n % a === 0 ? n / a : n + a, n + a, c + a, c - n, Math.abs(n - a)]).slice(0, 4),
        operands: [a, n],
        difficulty: d,
      }
    }
    // c ÷ L = a, so L = c ÷ a = n
    const eq = `${c} ÷ ${L} = ${a}`
    const sk = skip(a, c)
    return {
      prompt: `${intro} ${eq}. What is ${L}?`,
      eq,
      input: 'number',
      answer: n,
      strategies: [
        strat('Fact Family', [`${c} split into ${L} groups gives ${a} in each group. So ${L} groups of ${a} make ${c}.`, `${c} ÷ ${a} = ${c / a}`, `Check: ${c} ÷ ${c / a} = ${a}`], c / a),
        strat('Skip Count', [...sk.steps, `So ${sk.count} groups of ${a} make ${c}. ${L} is ${sk.count}.`], sk.count, sk.line ? { line: sk.line } : {}),
      ],
      distractors: wrongs(n, [c - a, c * a > 500 ? c + a : c * a, n + 1, n - 1]).slice(0, 4),
      operands: [a, c],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.inequalities */
  'al.inequalities': (rng, d) => {
    const r = R(rng)
    const L = r.pick(LET)
    const form = d === 1 ? 'add' : d === 2 ? r.pick(['add', 'sub', 'mul'] as const) : r.pick(['sub', 'mul', 'mul'] as const)
    const gt = r.chance(0.6)
    const a = form === 'mul' ? r.int(2, d === 2 ? 5 : 9) : d === 1 ? r.int(1, 9) : r.int(3, 30)
    let c: number
    if (form === 'add') c = a + r.int(2, d === 1 ? 10 : 40)
    else if (form === 'sub') c = r.int(gt ? 1 : 2, d === 2 ? 15 : 40)
    else c = d === 2 ? a * r.int(gt ? 1 : 2, 10) : a * r.int(gt ? 1 : 2, 10) + r.int(1, a - 1) // d3: not a multiple, so the edge is in between
    const lhsV = (v: number) => (form === 'add' ? v + a : form === 'sub' ? v - a : a * v)
    const sym: Op = form === 'add' ? '+' : form === 'sub' ? '−' : '×'
    const calcLine = (v: number) => (form === 'mul' ? `${a} × ${v} = ${a * v}` : `${v} ${sym} ${a} = ${lhsV(v)}`)
    const lhs = form === 'mul' ? `${a}${L}` : `${L} ${sym} ${a}`
    const works = (v: number) => (form === 'sub' && v < a ? false : gt ? lhsV(v) > c : lhsV(v) < c)
    const sign = gt ? '>' : '<'
    const word = gt ? 'greater than' : 'less than'
    // by searching
    let best = gt ? 0 : 400
    if (gt) while (!works(best)) best++
    else while (!works(best)) best--
    // by finding the edge
    const exact = form !== 'mul' || c % a === 0
    const edge = form === 'add' ? c - a : form === 'sub' ? c + a : Math.floor(c / a)
    const viaEdge = exact ? edge + (gt ? 1 : -1) : gt ? edge + 1 : edge
    const edgeSteps = exact
      ? [
          `First find the number that makes both sides the same.`,
          form === 'add' ? `${c} − ${a} = ${edge}` : form === 'sub' ? `${c} + ${a} = ${edge}` : `${c} ÷ ${a} = ${edge}`,
          `${edge} makes the left side exactly ${c}. That is not ${word} ${c}. So ${edge} does not work.`,
          gt ? `Go up one: ${edge} + 1 = ${edge + 1}` : `Go down one: ${edge} − 1 = ${edge - 1}`,
        ]
      : [`Count by ${a}s to get close to ${c}.`, `${a} × ${edge} = ${a * edge} and ${a} × ${edge + 1} = ${a * (edge + 1)}`, `${a * edge} is less than ${c}. ${a * (edge + 1)} is greater than ${c}.`, gt ? `So ${L} must be ${edge + 1} or more.` : `So ${L} can be ${edge} or less.`]
    const html = ineqSVG(Math.max(form === 'sub' ? a : 0, best - 4), Math.max(form === 'sub' ? a : 0, best - 4) + 8, works)
    const noteMul = form === 'mul' ? ` ${a}${L} means ${a} times ${L}.` : ''
    if (r.chance(0.35)) {
      // which number works?
      const ans = gt ? best + r.int(0, 2) : Math.max(form === 'sub' ? a : 0, best - r.int(0, 2))
      const no = (gt ? [best - 1, best - 2, best - 4] : [best + 1, best + 2, best + 4]).filter((x) => x >= (form === 'sub' ? a : 0))
      const picked = choice(`${ans}`, no.map(String), rng)
      const tested = picked.choices!.map(Number)
      const byTest = tested.filter(works)[0]
      const byEdge = tested.filter((x) => (gt ? x >= viaEdge : x <= viaEdge))[0]
      return {
        prompt: `The letter ${L} stands for a number.${noteMul} ${lhs} is ${word} ${c}. Which number can ${L} be?`,
        eq: `${lhs} ${sign} ${c}`,
        ...picked,
        strategies: [
          strat('Test Each One', [...tested.map((x) => `Try ${x}: ${calcLine(x)}. Is ${lhsV(x)} ${word} ${c}? ${works(x) ? 'Yes!' : 'No.'}`), `Only ${byTest} works.`], `${byTest}`),
          strat('Find the Edge', [...edgeSteps.slice(0, 3), gt ? `So ${L} must be ${viaEdge} or more. Only ${byEdge} fits.` : `So ${L} must be ${viaEdge} or less. Only ${byEdge} fits.`], `${byEdge}`, { html }),
        ],
        operands: [a, c],
        difficulty: d,
      }
    }
    const near = gt ? [best - 1, best] : [best + 1, best]
    return {
      prompt: `The letter ${L} stands for a whole number.${noteMul} ${lhs} is ${word} ${c}. What is the ${gt ? 'smallest' : 'biggest'} number ${L} can be?`,
      eq: `${lhs} ${sign} ${c}`,
      input: 'number',
      answer: best,
      strategies: [
        strat('Find the Edge', exact ? edgeSteps : [...edgeSteps, `The ${gt ? 'smallest' : 'biggest'} one is ${viaEdge}.`], viaEdge, { html }),
        strat(
          'Try Numbers',
          [
            ...near.filter((x) => x >= (form === 'sub' ? a : 0)).map((x) => `Try ${x}: ${calcLine(x)}. Is ${lhsV(x)} ${word} ${c}? ${works(x) ? 'Yes!' : 'No.'}`),
            `${best} is the ${gt ? 'smallest' : 'biggest'} whole number that works.`,
          ],
          best,
        ),
      ],
      // the number that only makes it equal, went the wrong way, used the same operation
      distractors: wrongs(best, [exact ? edge : gt ? edge : edge + 1, gt ? best - 2 : best + 2, form === 'add' ? c + a : form === 'sub' ? Math.abs(c - a) : c - a, c]).slice(0, 4),
      operands: [a, c],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.two-step-eq */
  'al.two-step-eq': (rng, d) => {
    const r = R(rng)
    const L = r.pick(LET)
    const a = d === 1 ? r.pick([2, 2, 3, 5, 10]) : d === 2 ? r.int(2, 6) : r.int(3, 9)
    const n = d === 1 ? r.int(1, 6) : d === 2 ? r.int(2, 10) : r.int(3, 12)
    const form = d === 1 ? 'plus' : d === 2 ? r.pick(['plus', 'minus'] as const) : r.pick(['plus', 'minus', 'div'] as const)
    const intro = `The letter ${L} stands for a mystery number.`
    if (form === 'div') {
      // L ÷ a + b = c
      const b = r.int(1, 12)
      const m = a * n
      const c = n + b
      const eq = `${L} ÷ ${a} + ${b} = ${c}`
      const rows: string[] = []
      let g = Math.max(a, m - 2 * a)
      let hit = -1
      for (let t = 0; t < 3; t++, g += a) {
        rows.push(`Try ${g}: ${g} ÷ ${a} + ${b} = ${g / a + b}${g / a + b === c ? '. Yes!' : `. Too ${g / a + b < c ? 'small' : 'big'}.`}`)
        if (g / a + b === c) {
          hit = g
          break
        }
      }
      return {
        prompt: `${intro} ${eq}. What is ${L}?`,
        eq,
        input: 'number',
        answer: m,
        strategies: [
          strat('Undo It Backward', [`Undo the last thing first. ${b} was added, so take away ${b}: ${c} − ${b} = ${c - b}`, `Now ${L} ÷ ${a} is ${c - b}. Undo dividing by multiplying: ${c - b} × ${a} = ${(c - b) * a}`, `Check: ${(c - b) * a} ÷ ${a} + ${b} = ${c}`], (c - b) * a),
          strat('Guess and Check', [`Pick numbers that ${a} divides evenly. Test each one.`, ...rows], hit),
        ],
        // stopped after one step, undid in the wrong order
        distractors: wrongs(m, [c - b, c * a, (c + b) * a, c * a - b]).slice(0, 4),
        operands: [a, b, c],
        difficulty: d,
      }
    }
    const plus = form === 'plus'
    const b = plus ? r.int(1, d === 1 ? 6 : 12) : r.int(1, Math.min(a * n - 1, 12))
    const c = plus ? a * n + b : a * n - b
    const eq = `${a}${L} ${plus ? '+' : '−'} ${b} = ${c}`
    const mid = plus ? c - b : c + b
    // guess and check near the answer
    const rows: string[] = []
    let hit = -1
    for (let g = Math.max(1, n - 2); g <= n + 1 && hit < 0; g++) {
      const v = plus ? a * g + b : a * g - b
      if (v < 0) continue
      rows.push(`Try ${g}: ${a} × ${g} ${plus ? '+' : '−'} ${b} = ${v}${v === c ? '. Yes!' : `. Too ${v < c ? 'small' : 'big'}.`}`)
      if (v === c) hit = g
    }
    return {
      prompt: `${intro} ${a}${L} means ${a} times ${L}. ${eq}. What is ${L}?`,
      eq,
      visual: plus && a <= 4 ? scaleSVG(`${Array(a).fill(L).join(' + ')} + ${b}`, `${c}`) : undefined,
      input: 'number',
      answer: n,
      strategies: [
        strat(
          'Undo It Backward',
          [
            plus ? `Undo the last thing first. ${b} was added, so take away ${b}: ${c} − ${b} = ${mid}` : `Undo the last thing first. ${b} was taken away, so add ${b}: ${c} + ${b} = ${mid}`,
            `Now ${a}${L} is ${mid}. Undo times by dividing: ${mid} ÷ ${a} = ${mid / a}`,
            `Check: ${a} × ${mid / a} ${plus ? '+' : '−'} ${b} = ${c}`,
          ],
          mid / a,
          plus && a <= 8 ? { html: tapeSVG([...Array(a).fill(L), `${b}`], `${c} in all`) } : {},
        ),
        strat('Guess and Check', [`Pick a number for ${L}. Test it. Go up if it is too small.`, ...rows], hit),
      ],
      // stopped after one step, undid in the wrong order, did not undo
      distractors: wrongs(n, [mid, Number.isInteger(c / a) ? c / a : n + 1, plus ? c + b : Math.abs(c - b), n - 1]).slice(0, 4),
      operands: [a, b, c],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.ratios */
  'al.ratios': (rng, d) => {
    const r = R(rng)
    const CTX = [
      { A: 'bats', B: 'balls', all: 'bats and balls', ca: '#8d6e63', cb: '#e53935' },
      { A: 'hot dogs', B: 'drinks', all: 'snacks', ca: '#ef6c00', cb: '#1e88e5' },
      { A: 'red caps', B: 'blue caps', all: 'caps', ca: '#e53935', cb: '#1e88e5' },
      { A: 'gloves', B: 'helmets', all: 'things', ca: '#8d6e63', cb: '#3949ab' },
      { A: 'big bricks', B: 'small bricks', all: 'bricks', ca: '#43a047', cb: '#fdd835' },
      { A: 'surfboards', B: 'kites', all: 'toys', ca: '#00897b', cb: '#d81b60' },
    ]
    const C = r.pick(CTX)
    if (d === 3 && r.chance(0.5)) {
      // "for every p … how many …" (shrink the ratio)
      const g = r.int(2, 5)
      let p = r.int(1, 5), q = r.int(1, 6)
      while (gcd(p, q) !== 1 || p === q) {
        p = r.int(1, 5)
        q = r.int(1, 6)
      }
      const a = g * p, b = g * q
      const k = a / p
      let each = 0
      while (k * each < b) each++
      return {
        prompt: `There are ${a} ${C.A} and ${b} ${C.B}. {n} makes equal groups. Each group has ${p} ${p === 1 ? C.A.replace(/s$/, '') : C.A}. How many ${C.B} are in each group?`,
        input: 'number',
        answer: q,
        strategies: [
          strat('Shrink Both the Same Way', [`${a} ${C.A} became ${p}. What did we divide by? ${a} ÷ ${p} = ${k}`, `Do the same to the ${C.B}: ${b} ÷ ${k} = ${b / k}`, `The ratio ${a} to ${b} is the same as ${p} to ${b / k}.`], b / k, { html: tableHTML([[C.A, `${a}`, `${p}`], [C.B, `${b}`, '?']], 'left') }),
          strat('Make the Groups', [`${k} groups with ${p} ${C.A} each uses all of them: ${k} × ${p} = ${a}`, `Deal the ${b} ${C.B} to the ${k} groups. Each group gets ${each}, since ${k} × ${each} = ${b}`], each),
        ],
        // took the same amount away from both, forgot to shrink, gave the number of groups
        distractors: wrongs(q, [b - (a - p), b, k, q + 1]).slice(0, 4),
        operands: [a, b, p],
        difficulty: d,
      }
    }
    const hi = d === 1 ? 9 : d === 2 ? 12 : 20
    let a = r.int(2, hi), b = r.int(2, hi)
    while (a === b) b = r.int(2, hi)
    const kind = d === 1 ? 'parts' : r.pick(['parts', 'whole', 'rest', 'rest'] as const)
    if (kind === 'rest') {
      const S = r.pick([
        { say: (t: number, h: number) => `{n} had ${t} at-bats. He got ${h} hits. The rest were outs.`, A: 'hits', B: 'outs', T: 'at-bats' },
        { say: (t: number, h: number) => `The team played ${t} games. They won ${h}. They lost the rest.`, A: 'wins', B: 'losses', T: 'games' },
        { say: (t: number, h: number) => `{n} threw ${t} pitches. ${h} were strikes. The rest were balls.`, A: 'strikes', B: 'balls', T: 'pitches' },
      ])
      const t = a + b
      const toWhole = r.chance(0.3)
      const ans = toWhole ? `${a} to ${t}` : `${a} to ${b}`
      const rest = t - a
      return {
        prompt: `${S.say(t, a)} What is the ratio of ${S.A} to ${toWhole ? S.T : S.B}?`,
        ...choice(ans, toWhole ? [`${t} to ${a}`, `${a} to ${b}`, `${b} to ${t}`] : [`${a} to ${t}`, `${b} to ${a}`, `${t} to ${a}`], rng),
        strategies: [
          strat('Say It in Order', toWhole ? [`The question says ${S.A} first, then ${S.T}.`, `There are ${a} ${S.A} and ${t} ${S.T}.`, `The ratio is ${a} to ${t}. You can also write ${a}:${t}.`] : [`First find the ${S.B}: ${t} − ${a} = ${rest}`, `The question says ${S.A} first, then ${S.B}.`, `The ratio is ${a} to ${rest}. You can also write ${a}:${rest}.`], toWhole ? `${a} to ${t}` : `${a} to ${rest}`),
          strat('Draw It', [`Draw ${t} dots for the ${S.T}. Color ${a} of them for the ${S.A}.`, `Count: ${a} ${S.A}, ${Array(t).length - a} ${S.B}, ${t} in all.`, `The ratio of ${S.A} to ${toWhole ? S.T : S.B} is ${ans}.`], toWhole ? `${a} to ${a + b}` : `${a} to ${b}`, { html: dotsHTML([[S.A, a, '#2e7d32'], [S.B, b, '#90a4ae']]) }),
        ],
        operands: [a, b, t],
        difficulty: d,
      }
    }
    if (kind === 'whole') {
      const t = a + b
      const first = r.chance(0.5)
      const [X, x] = first ? [C.A, a] : [C.B, b]
      const ans = `${x} to ${t}`
      return {
        prompt: `There are ${a} ${C.A} and ${b} ${C.B}. What is the ratio of ${X} to all the ${C.all}?`,
        ...choice(ans, [`${a} to ${b}`, `${t} to ${x}`, `${first ? b : a} to ${t}`], rng),
        strategies: [
          strat('Say It in Order', [`First find all the ${C.all}: ${a} + ${b} = ${t}`, `The question says ${X} first, then all the ${C.all}.`, `The ratio is ${x} to ${a + b}. You can also write ${x}:${a + b}.`], `${x} to ${a + b}`),
          strat('Draw It', [`Draw a dot for each thing.`, `Count the ${X}: ${x}. Count every dot: ${t}.`, `The ratio of ${X} to all the ${C.all} is ${ans}.`], `${x} to ${t}`, { html: dotsHTML([[C.A, a, C.ca], [C.B, b, C.cb]]) }),
        ],
        operands: [a, b, t],
        difficulty: d,
      }
    }
    const flip = r.chance(0.5)
    const [X, x, Y, y] = flip ? [C.B, b, C.A, a] : [C.A, a, C.B, b]
    const ans = `${x} to ${y}`
    return {
      prompt: `There are ${a} ${C.A} and ${b} ${C.B}. What is the ratio of ${X} to ${Y}?`,
      ...choice(ans, [`${y} to ${x}`, `${x} to ${a + b}`, `${y} to ${a + b}`], rng),
      strategies: [
        strat('Say It in Order', [`A ratio compares two amounts. The order matters.`, `The question says ${X} first, then ${Y}.`, `There are ${x} ${X} and ${y} ${Y}. The ratio is ${x} to ${y}. You can also write ${x}:${y}.`], `${x} to ${y}`),
        strat('Draw It', [`Draw a dot for each thing.`, `Count the ${X}: ${x}. Count the ${Y}: ${y}.`, `The ratio of ${X} to ${Y} is ${ans}.`], ans, { html: dotsHTML(flip ? [[C.B, b, C.cb], [C.A, a, C.ca]] : [[C.A, a, C.ca], [C.B, b, C.cb]]) }),
      ],
      operands: [a, b, a + b],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.equivalent-ratios */
  'al.equivalent-ratios': (rng, d) => {
    const r = R(rng)
    const CTX = [
      { xs: 'hot dogs', ys: 'dollars', say: (a: number, b: number) => `${a} hot dogs cost $${b}.`, askY: (x: number) => `How many dollars do ${x} hot dogs cost?`, askX: (y: number) => `How many hot dogs can you buy with $${y}?` },
      { xs: 'games', ys: 'hits', say: (a: number, b: number) => `{n} gets ${b} hits every ${a} games.`, askY: (x: number) => `At that rate, how many hits does he get in ${x} games?`, askX: (y: number) => `At that rate, how many games does it take to get ${y} hits?` },
      { xs: 'minutes', ys: 'balls', say: (a: number, b: number) => `The pitching machine throws ${b} balls every ${a} minutes.`, askY: (x: number) => `How many balls does it throw in ${x} minutes?`, askX: (y: number) => `How many minutes does it take to throw ${y} balls?` },
      { xs: 'cups of juice', ys: 'cups of water', say: (a: number, b: number) => `A sports drink uses ${a} cups of juice for every ${b} cups of water.`, askY: (x: number) => `How many cups of water go with ${x} cups of juice?`, askX: (y: number) => `How many cups of juice go with ${y} cups of water?` },
      { xs: 'minutes', ys: 'laps', say: (a: number, b: number) => `{n} runs ${b} laps every ${a} minutes.`, askY: (x: number) => `At that speed, how many laps does he run in ${x} minutes?`, askX: (y: number) => `At that speed, how many minutes does it take to run ${y} laps?` },
    ]
    const C = r.pick(CTX)
    const row = (x: (number | string)[], y: (number | string)[]) => tableHTML([[C.xs, ...x.map(String)], [C.ys, ...y.map(String)]], 'left')
    if (d === 3) {
      // shrink first, then grow: 4 → 6
      const g = r.int(2, 4)
      let p = r.int(1, 4), q = r.int(1, 6)
      while (gcd(p, q) !== 1 || p === q) {
        p = r.int(1, 4)
        q = r.int(1, 6)
      }
      let e = r.int(1, 5)
      while (e % g === 0) e = r.int(1, 5)
      const m = g + e
      const a = g * p, b = g * q, tx = m * p, ty = m * q
      const findX = r.chance(0.4)
      const [k1, k2, t1, small1, small2] = findX ? [b, a, ty, q, p] : [a, b, tx, p, q] // k1 row is known at the target
      const ans = findX ? tx : ty
      const [n1, n2] = findX ? [C.ys, C.xs] : [C.xs, C.ys]
      return {
        prompt: `${C.say(a, b)} ${findX ? C.askX(ty) : C.askY(tx)}`,
        visual: findX ? row([a, '?'], [b, ty]) : row([a, tx], [b, '?']),
        input: 'number',
        answer: ans,
        unit: n2,
        strategies: [
          strat('Shrink, Then Grow', [`Make a smaller pair first. Divide both by ${g}: ${k1} ÷ ${g} = ${small1} and ${k2} ÷ ${g} = ${small2}`, `Now grow ${small1} up to ${t1}: ${small1} × ${m} = ${t1}`, `Do the same to the other row: ${small2} × ${m} = ${small2 * m}`], small2 * m, {
            html: findX ? row([a, p, '?'], [b, q, ty]) : row([a, p, tx], [b, q, '?']),
          }),
          strat(
            'Add On',
            [
              `Split the first column into ${g} equal parts. Each part has ${small1} in the ${n1} row and ${small2} in the ${n2} row.`,
              `${t1} is ${k1} plus ${e === 1 ? '1 more part' : `${e} more parts`}: ${k1} + ${e * small1} = ${t1}`,
              `Add ${e === 1 ? '1 part' : `${e} parts`} to the other row too: ${k2} + ${e * small2} = ${k2 + e * small2}`,
            ],
            k2 + e * small2,
          ),
        ],
        // added the same amount to both rows, doubled, used the small pair
        distractors: wrongs(ans, [k2 + (t1 - k1), k2 * 2, small2 * (m + 1), t1]).slice(0, 4),
        operands: [a, b, findX ? ty : tx],
        difficulty: d,
      }
    }
    const a = r.int(d === 1 ? 2 : 2, d === 1 ? 5 : 9)
    let b = r.int(2, d === 1 ? 6 : 12)
    while (b === a) b = r.int(2, d === 1 ? 6 : 12)
    const k = r.int(2, d === 1 ? 4 : 6)
    const findX = d === 2 && r.chance(0.45)
    const tx = a * k, ty = b * k
    const [k1, k2, t1] = findX ? [b, a, ty] : [a, b, tx]
    const [n1, n2] = findX ? [C.ys, C.xs] : [C.xs, C.ys]
    const ans = findX ? tx : ty
    const mult = t1 / k1
    const col1: number[] = [], col2: number[] = []
    for (let s1 = k1, s2 = k2; s1 <= t1; s1 += k1, s2 += k2) {
      col1.push(s1)
      col2.push(s2)
    }
    return {
      prompt: `${C.say(a, b)} ${findX ? C.askX(ty) : C.askY(tx)}`,
      visual: findX ? row([a, '?'], [b, ty]) : row([a, tx], [b, '?']),
      input: 'number',
      answer: ans,
      unit: n2,
      strategies: [
        strat('Multiply Both Rows', [`How did ${k1} grow to ${t1}? ${t1} ÷ ${k1} = ${mult}. It got ${mult} times as big.`, `Do the same to the other row: ${k2} × ${mult} = ${k2 * mult}`, `Both rows grew ${mult} times, so the ratio stays the same.`], k2 * mult),
        strat('Keep Adding', [`Each new column adds ${k1} ${n1} and ${k2} ${n2}.`, `${n1}: ${col1.join(', ')}`, `${n2}: ${col2.join(', ')}`, `When the ${n1} row gets to ${t1}, the ${n2} row is at ${col2[col2.length - 1]}.`], col2[col2.length - 1], {
          html: findX ? row(col2.map((v, i) => (i === col2.length - 1 ? '?' : v)), col1) : row(col1, col2.map((v, i) => (i === col2.length - 1 ? '?' : v))),
        }),
      ],
      // added the same amount to both rows, one column short or long
      distractors: wrongs(ans, [k2 + (t1 - k1), k2 * (mult - 1), k2 * (mult + 1), t1]).slice(0, 4),
      operands: [a, b, findX ? ty : tx],
      difficulty: d,
    }
  },

  /* ---------------------------------------------------------------- al.unit-rate */
  'al.unit-rate': (rng, d) => {
    const r = R(rng)
    const CTX = [
      { say: (k: number, T: number) => `${k} hot dogs cost $${T}.`, one: `How many dollars does 1 hot dog cost?`, many: (m: number) => `How many dollars do ${m} hot dogs cost?`, per: 'hot dog', pers: 'hot dogs', tot: 'dollars', max: 8, so: (u: number) => `1 hot dog costs $${u}.` },
      { say: (k: number, T: number) => `${k} tacos cost $${T}.`, one: `How many dollars does 1 taco cost?`, many: (m: number) => `How many dollars do ${m} tacos cost?`, per: 'taco', pers: 'tacos', tot: 'dollars', max: 6, so: (u: number) => `1 taco costs $${u}.` },
      { say: (k: number, T: number) => `{n} runs ${T} laps in ${k} minutes. He keeps the same speed.`, one: `How many laps does he run in 1 minute?`, many: (m: number) => `How many laps does he run in ${m} minutes?`, per: 'minute', pers: 'minutes', tot: 'laps', max: 6, so: (u: number) => `He runs ${u} laps in 1 minute.` },
      { say: (k: number, T: number) => `${k} boxes hold ${T} baseballs. Each box holds the same number.`, one: `How many baseballs are in 1 box?`, many: (m: number) => `How many baseballs are in ${m} boxes?`, per: 'box', pers: 'boxes', tot: 'baseballs', max: 12, so: (u: number) => `1 box holds ${u} baseballs.` },
      { say: (k: number, T: number) => `{n} got ${T} hits in ${k} games. He got the same number each game.`, one: `How many hits did he get in 1 game?`, many: (m: number) => `At that rate, how many hits in ${m} games?`, per: 'game', pers: 'games', tot: 'hits', max: 4, so: (u: number) => `He got ${u} hits in 1 game.` },
      { say: (k: number, T: number) => `A surfer rides ${T} waves in ${k} hours. She rides the same number each hour.`, one: `How many waves does she ride in 1 hour?`, many: (m: number) => `How many waves does she ride in ${m} hours?`, per: 'hour', pers: 'hours', tot: 'waves', max: 12, so: (u: number) => `She rides ${u} waves in 1 hour.` },
    ]
    if (d === 3 && r.chance(0.35)) {
      // which stand has the lower price for one?
      const item = r.pick(['tacos', 'hot dogs', 'drinks', 'pretzels'])
      let k1 = r.int(2, 6), k2 = r.int(2, 6), u1 = r.int(2, 9), u2 = r.int(2, 9)
      while (k1 === k2 || u1 === u2) {
        k2 = r.int(2, 6)
        u2 = r.int(2, 9)
      }
      const T1 = k1 * u1, T2 = k2 * u2
      const both = k1 * k2
      const ans = u1 < u2 ? 'Stand A' : 'Stand B'
      return {
        prompt: `Stand A sells ${k1} ${item} for $${T1}. Stand B sells ${k2} ${item} for $${T2}. Which stand has the lower price for 1 ${item.replace(/s$/, '')}?`,
        ...choice(ans, ['Stand A', 'Stand B'], rng, true),
        strategies: [
          strat('Find the Price for 1', [`Stand A: ${T1} ÷ ${k1} = ${T1 / k1} dollars for 1.`, `Stand B: ${T2} ÷ ${k2} = ${T2 / k2} dollars for 1.`, `${Math.min(T1 / k1, T2 / k2)} is less than ${Math.max(T1 / k1, T2 / k2)}. ${T1 / k1 < T2 / k2 ? 'Stand A' : 'Stand B'} has the lower price.`], T1 / k1 < T2 / k2 ? 'Stand A' : 'Stand B'),
          strat('Buy the Same Number', [`Pretend you buy ${both} ${item} at each stand.`, `Stand A: ${k2} sets of ${k1}. ${T1} × ${k2} = ${T1 * k2} dollars.`, `Stand B: ${k1} sets of ${k2}. ${T2} × ${k1} = ${T2 * k1} dollars.`, `${T1 * k2 < T2 * k1 ? 'Stand A' : 'Stand B'} costs less for the same number of ${item}.`], T1 * k2 < T2 * k1 ? 'Stand A' : 'Stand B'),
        ],
        operands: [k1, T1, k2, T2],
        difficulty: d,
      }
    }
    const C = r.pick(CTX)
    const k = r.int(2, d === 1 ? 5 : 9)
    const u = r.int(2, Math.min(d === 1 ? 6 : 12, C.max))
    const T = k * u
    let q = 1
    while (q * k < T) q++
    const list: number[] = []
    for (let x = k; x <= T; x += k) list.push(x)
    if (d === 3) {
      let m = k + r.int(1, 6)
      if (m % k === 0) m += 1
      const e = m - k
      return {
        prompt: `${C.say(k, T)} ${C.many(m)}`,
        visual: tableHTML([[C.pers, `${k}`, `${m}`], [C.tot, `${T}`, '?']], 'left'),
        input: 'number',
        answer: u * m,
        unit: C.tot,
        strategies: [
          strat('Find 1 First', [`Find the amount for 1 ${C.per}: ${T} ÷ ${k} = ${T / k}`, `Now do ${m} of them: ${T / k} × ${m} = ${(T / k) * m}`], (T / k) * m, { html: tableHTML([[C.pers, `${k}`, '1', `${m}`], [C.tot, `${T}`, `${T / k}`, '?']], 'left') }),
          strat('Add On', [`${m} ${C.pers} is ${e} more than ${k} ${C.pers}.`, `Each ${C.per} adds ${q} ${C.tot}, since ${q} × ${k} = ${T}`, `The ${e} extra: ${e} × ${q} = ${e * q}`, `Add it on: ${T} + ${e * q} = ${T + e * q}`], T + e * q),
        ],
        // added the same amount to both, stopped at the amount for 1
        distractors: wrongs(u * m, [T + e, u, T * m > 2000 ? T + m : T * m, u * m + u]).slice(0, 4),
        operands: [k, T, m],
        difficulty: d,
      }
    }
    return {
      prompt: `${C.say(k, T)} ${C.one}`,
      input: 'number',
      answer: u,
      unit: C.tot,
      strategies: [
        strat('Share It Equally', [`Share the ${T} ${C.tot} into ${k} equal parts, one part for each ${C.per}.`, `${T} ÷ ${k} = ${T / k}`, C.so(T / k)], T / k, { html: tapeSVG(Array(k).fill('?'), `${T} ${C.tot} for ${k} ${C.pers}`) }),
        strat('Think Times', [`What number times ${k} makes ${T}?`, `Count by ${k}s: ${list.join(', ')}. That is ${list.length} counts.`, `${list.length} × ${k} = ${T}. ${C.so(list.length)}`], list.length),
      ],
      // subtracted, multiplied, off by one
      distractors: wrongs(u, [T - k, T * k > 500 ? T + k : T * k, u + 1, u - 1]).slice(0, 4),
      operands: [k, T],
      difficulty: d,
    }
  },
}

/** Finish an "if the letter is …, what is …?" item. */
function varItem(L: string, n: number, show: string, v: number, s1: string[], s2: Strat, wrong: number[], note: string, ops: number[], d: 1 | 2 | 3): Item {
  const last = s1[s1.length - 1]
  return {
    prompt: `The letter ${L} stands for a number.${note} If ${L} is ${n}, what is ${show}?`,
    eq: `${show} = ${Q}`,
    input: 'number',
    answer: v,
    strategies: [strat('Swap In the Number', s1, Number(last.slice(last.lastIndexOf('=') + 1))), s2],
    distractors: wrongs(v, [...wrong, v + 1]).slice(0, 4),
    operands: ops,
    difficulty: d,
  }
}

/* ================================================================ teach */

export const teach: Record<string, string> = {
  'al.equal-sign': 'The equal sign means "the same as." Both sides must make the same number, like a balance scale that stays level.',
  'al.patterns-number': 'A number pattern follows a rule. Find how big each jump is, then keep jumping the same way.',
  'al.in-out': 'A number machine does the same thing to every number that goes in. Use the rule to go forward. Do the opposite to go backward.',
  'al.patterns-rule': 'To find a rule, look at what happens to each In number. The rule must work for every row, not just one.',
  'al.order-ops': 'Math has an order. Multiply and divide first. Then add and subtract, going left to right.',
  'al.parentheses': 'Parentheses say "do me first!" Work out the part inside the parentheses before anything else.',
  'al.expressions': 'You can write words as math. If something has to happen first, put it inside parentheses.',
  'al.variables': 'A letter can stand for a number we do not know yet. When you find out the number, put it in the place of the letter.',
  'al.like-terms': '3n means 3 of the same mystery number. You can put the n\'s together: 3n and 4n make 7n. Plain numbers stay by themselves.',
  'al.one-step-add': 'An equation is like a balance scale. To find the letter, undo what was done to it. Undo adding by taking away. Undo taking away by adding.',
  'al.one-step-mult': 'To find the letter, undo what was done to it. Undo times by dividing. Undo dividing by multiplying.',
  'al.inequalities': 'The sign > means greater than. The sign < means less than. Lots of numbers can work! Find the edge, then pick the side that works.',
  'al.two-step-eq': 'When two things were done to the letter, undo them backward. Undo the last thing first, like taking off your shoes before your socks.',
  'al.ratios': 'A ratio compares two amounts, like 3 bats to 5 balls. The order matters, so say them in the order the question asks.',
  'al.equivalent-ratios': 'In a ratio table, both rows grow the same way. If one row gets 3 times as big, the other row gets 3 times as big too.',
  'al.unit-rate': 'A unit rate tells how much for just 1. Divide to find it. Then you can find the amount for any number.',
}

/* ================================================================ limits */

const num = (it: Item) => it.input === 'number' && typeof it.answer === 'number'
const within = (it: Item, lo: number, hi: number) => it.operands.every((x) => Number.isInteger(x) && x >= lo && x <= hi)
const ansIn = (it: Item, lo: number, hi: number) => num(it) && +it.answer >= lo && +it.answer <= hi

export const limits: Record<string, (it: Item) => boolean> = {
  'al.equal-sign': (it) => within(it, 1, 60) && (it.input === 'choice' ? TF.includes(String(it.answer)) && it.operands.length === 4 : ansIn(it, 1, 60) && it.operands.length === 3),
  'al.patterns-number': (it) => ansIn(it, 0, 500) && it.operands[1] >= 2 && it.operands[1] <= 50 && it.operands[0] >= 0 && it.operands[0] <= 300 && [2, 3, 4].includes(it.operands[2]),
  'al.in-out': (it) => ansIn(it, 0, 150) && it.operands[1] >= 1 && it.operands[1] <= 30 && it.operands[2] >= 0 && it.operands[2] <= 9 && !!it.visual,
  'al.patterns-rule': (it) => within(it, 0, 150) && !!(it.visual || it.eq) && (it.input === 'choice' ? /^[+−×÷] \d+$/.test(String(it.answer)) : ansIn(it, 0, 3200)),
  'al.order-ops': (it) => ansIn(it, 0, 200) && within(it, 1, 100) && it.operands.length >= 3 && it.operands.length <= 5 && !(it.eq || '').includes('('),
  'al.parentheses': (it) => ansIn(it, 0, 250) && within(it, 1, 60) && (it.eq || '').includes('('),
  'al.expressions': (it) => within(it, 1, 40) && it.operands.length === 3 && (it.input === 'choice' ? /[+−×÷]/.test(String(it.answer)) && it.choices!.length >= 3 : ansIn(it, 1, 300)),
  'al.variables': (it) => within(it, 1, 100) && (it.input === 'choice' ? it.choices!.length >= 3 : ansIn(it, 0, 130)),
  'al.like-terms': (it) => it.operands.every((x) => Number.isInteger(x) && Math.abs(x) <= 18 && x !== 0) && (it.input === 'choice' ? /^\d+[a-z] \+ \d+$/.test(String(it.answer)) : ansIn(it, 2, 25)),
  'al.one-step-add': (it) => ansIn(it, 1, 250) && within(it, 1, 250),
  'al.one-step-mult': (it) => ansIn(it, 1, 240) && within(it, 1, 240) && it.operands[0] >= 2 && it.operands[0] <= 12,
  'al.inequalities': (it) => within(it, 1, 100) && (it.input === 'choice' ? /^\d+$/.test(String(it.answer)) && it.choices!.length >= 3 : ansIn(it, 0, 100)),
  'al.two-step-eq': (it) => ansIn(it, 1, 110) && within(it, 1, 125) && it.operands[0] >= 2 && it.operands[0] <= 10,
  'al.ratios': (it) => within(it, 1, 40) && (it.input === 'choice' ? /^\d+ to \d+$/.test(String(it.answer)) && it.choices!.length === 4 : ansIn(it, 1, 6)),
  'al.equivalent-ratios': (it) => ansIn(it, 2, 80) && within(it, 1, 80) && !!it.visual,
  'al.unit-rate': (it) => within(it, 2, 110) && (it.input === 'choice' ? /^Stand [AB]$/.test(String(it.answer)) : ansIn(it, 2, 200)),
}
