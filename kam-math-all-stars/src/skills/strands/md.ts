import { R, strat, wrongs, choice, fmtN, Q, pieces, expand, skipList, groupsHTML, arrayHTML, areaHTML, gcd, lcm, type Gen, type Item, type Strat } from '../kit'

/* Multiply & Divide strand: arrays through long division, factors, primes, powers, GCF and LCM. */

/* ───────────────────────── small helpers ───────────────────────── */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const times = <T,>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i))
const factorsOf = (n: number) => times(n, (i) => i + 1).filter((i) => n % i === 0)
/** Factor pairs [small, big] found by trying 1, 2, 3 … */
const pairsOf = (n: number) => {
  const out: [number, number][] = []
  for (let i = 1; i * i <= n; i++) if (n % i === 0) out.push([i, n / i])
  return out
}
const pairText = (n: number) =>
  pairsOf(n)
    .map(([x, y]) => `${x} × ${y}`)
    .join(', ')
/** Smallest number above 1 that divides n (n itself when n is prime). Trial division. */
const smallestDivisor = (n: number) => {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p
  return n
}
const isPrime = (n: number) => n >= 2 && smallestDivisor(n) === n
const pw = (b: number, e: number) => times(e, () => b).reduce((x, y) => x * y, 1)
const s = (n: number, one: string, many: string) => (n === 1 ? one : many)
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']
const PLACE = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands']
const INK = '#1d2b36'

/* ───────────────────────── strategy builders: facts ───────────────────────── */

/** g groups of k, by skip counting. */
const skipCount = (g: number, k: number): Strat =>
  strat(
    'Skip Count',
    [`Count by ${k}s, ${g} times:`, skipList(k, g), `That is ${g} × ${k} = ${g * k}`],
    sum(times(g, () => k)),
    g * k <= 36 && k <= 8 && g <= 6 ? { html: groupsHTML(g, k) } : g <= 12 ? { line: times(g + 1, (i) => i * k) } : {},
  )

/** key × n worked out from an easier fact. key is 2 to 12. */
function derive(key: number, n: number): Strat {
  const d = n + n
  switch (key) {
    case 2:
      return strat('Double It', [`Times 2 means double.`, `${n} + ${n} = ${d}`], d)
    case 3:
      return strat('Double, Then One More', [`3 groups is 2 groups plus 1 more group.`, `Double ${n}: ${n} + ${n} = ${d}`, `Add one more ${n}: ${d} + ${n} = ${d + n}`], d + n)
    case 4:
      return strat('Double, Double', [`4 groups is 2 groups, then doubled.`, `Double ${n}: ${n} + ${n} = ${d}`, `Double again: ${d} + ${d} = ${d + d}`], d + d)
    case 5:
      return strat('Half of Ten', [`5 is half of 10.`, `10 × ${n} = ${10 * n}`, `Half of ${10 * n} is ${(10 * n) / 2}.`], (10 * n) / 2)
    case 6:
      return strat('Five and One More', [`6 groups is 5 groups plus 1 more group.`, `5 × ${n} = ${5 * n}`, `${5 * n} + ${n} = ${5 * n + n}`], 5 * n + n, n <= 12 ? { html: arrayHTML(n, 6, 5) } : {})
    case 7:
      return strat('Break 7 Apart', [`Break 7 into 5 + 2.`, `5 × ${n} = ${5 * n}`, `2 × ${n} = ${2 * n}`, `${5 * n} + ${2 * n} = ${5 * n + 2 * n}`], 5 * n + 2 * n, n <= 12 ? { html: arrayHTML(n, 7, 5) } : {})
    case 8:
      return strat('Double, Double, Double', [`8 groups is double, double, double.`, `${n} + ${n} = ${d}`, `${d} + ${d} = ${d + d}`, `${d + d} + ${d + d} = ${d + d + d + d}`], d + d + (d + d))
    case 9:
      return strat('Ten Take Away One', [`9 groups is 10 groups take away 1 group.`, `10 × ${n} = ${10 * n}`, `${10 * n} − ${n} = ${10 * n - n}`], 10 * n - n)
    case 10:
      return strat('Think Tens', [`10 × ${n} means ${n} tens.`, `${n} tens is ${n}0.`], Number(`${n}0`))
    case 11:
      return strat('Ten and One More', [`11 groups is 10 groups plus 1 more group.`, `10 × ${n} = ${10 * n}`, `${10 * n} + ${n} = ${10 * n + n}`], 10 * n + n)
    default:
      return strat('Ten and Two More', [`12 groups is 10 groups plus 2 more groups.`, `10 × ${n} = ${10 * n}`, `2 × ${n} = ${2 * n}`, `${10 * n} + ${2 * n} = ${10 * n + 2 * n}`], 10 * n + 2 * n)
  }
}
/** a × b from an easier fact: uses whichever factor has the handiest trick. */
function pickDerive(a: number, b: number): Strat {
  for (const k of [10, 2, 4, 9, 5, 3, 6, 8, 11, 12, 7]) {
    if (a === k) return derive(k, b)
    if (b === k) return derive(k, a)
  }
  return derive(Math.min(Math.max(a, 2), 12), b)
}

/** N ÷ k with no leftovers (facts up to 12): two ways. */
function divWays(N: number, k: number): Strat[] {
  let count = 0
  for (let t = k; t <= N; t += k) count++
  const think = strat(
    'Think Multiplication',
    [`Ask: what number times ${k} makes ${N}?`, `Count by ${k}s until you get to ${N}: ${skipList(k, count)}`, `That took ${count} ${s(count, 'count', 'counts')}, so the answer is ${count}.`],
    count,
    count <= 10 ? { line: times(count + 1, (i) => i * k) } : {},
  )
  let groups = 0
  for (let left = N; left >= k; left -= k) groups++
  if (groups <= 5 && N <= 40)
    return [
      think,
      strat(
        'Take Away Groups',
        [`Start with ${N}. Take away ${k} again and again until nothing is left.`, `${N}${times(groups, () => ` − ${k}`).join('')} = 0`, `You took away ${groups} ${s(groups, 'group', 'groups')} of ${k}.`],
        groups,
        k <= 8 ? { html: groupsHTML(groups, k) } : {},
      ),
    ]
  const q = N / k
  const base = [10, 5, 2, 1].find((x) => x < q) ?? 1
  const first = base * k
  const rest = N - first
  return [
    think,
    strat('Break It Up', [`Break ${N} into ${first} and ${rest}. Both are easy to split by ${k}.`, `${first} ÷ ${k} = ${first / k}`, `${rest} ÷ ${k} = ${rest / k}`, `${first / k} + ${rest / k} = ${first / k + rest / k}`], first / k + rest / k),
  ]
}

/* ───────────────────────── strategy builders: big multiplying ───────────────────────── */

/** Area model: break both numbers by place value. */
function areaStrat(a: number, b: number): Strat {
  const A = pieces(a)
  const B = pieces(b)
  const rows = B.map((y) => A.map((x) => x * y))
  const total = sum(rows.map(sum))
  const first = `Break ${fmtN(a)} into ${expand(a)}` + (B.length > 1 ? ` and ${fmtN(b)} into ${expand(b)}.` : '.')
  const steps =
    A.length * B.length <= 4
      ? [first, ...B.flatMap((y) => A.map((x) => `${fmtN(x)} × ${fmtN(y)} = ${fmtN(x * y)}`)), `Add them up: ${rows.flat().map(fmtN).join(' + ')} = ${fmtN(total)}`]
      : [first, `Fill in each box of the picture.`, ...B.map((y, i) => `Add the ${fmtN(y)} row: ${rows[i].map(fmtN).join(' + ')} = ${fmtN(sum(rows[i]))}`), `Add the rows: ${rows.map((r) => fmtN(sum(r))).join(' + ')} = ${fmtN(total)}`]
  return strat('Area Model', steps, total, { html: areaHTML(A, B) })
}

const mono = (lines: string[]) =>
  `<div style="text-align:center"><div style="display:inline-block;text-align:left;white-space:pre;font:700 22px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.2em;color:${INK};margin:8px auto">${lines.join('\n')}</div></div>`
const ruled = (t: string) => `<span style="border-bottom:3px solid #37474f">${t}</span>`

/** The stacked way a kid writes it: one row for each digit of b. */
function stackStrat(a: number, b: number): Strat {
  const B = pieces(b).reverse()
  const rows = B.map((y) => a * y)
  const total = sum(rows)
  const w = String(total).length + 1
  const pad = (t: string) => t.padStart(w, ' ')
  const html = mono([pad(String(a)), ruled(pad('×' + String(b).padStart(w - 1, ' ').slice(1))), ...rows.map((x, i) => (i === rows.length - 1 ? ruled(pad(String(x))) : pad(String(x)))), pad(String(total))])
  const name = (y: number) => (y < 10 ? 'Ones' : y < 100 ? 'Tens' : 'Hundreds')
  return strat(
    'Stack It Up',
    [
      `Write ${fmtN(a)} on top and ${fmtN(b)} under it. Make one row for each digit of ${fmtN(b)}.`,
      ...B.map((y, i) => `${name(y)} row: ${fmtN(a)} × ${fmtN(y)} = ${fmtN(rows[i])}`),
      rows.length > 1 ? `Add the rows: ${rows.map(fmtN).join(' + ')} = ${fmtN(total)}` : `There is just one row, so that is the answer.`,
    ],
    total,
    { html },
  )
}

/** Keep b whole and break only a. */
function breakBigStrat(a: number, b: number): Strat {
  const A = pieces(a)
  const parts = A.map((x) => x * b)
  return strat('Break the Big Number', [`Keep ${fmtN(b)} whole. Break ${fmtN(a)} into ${expand(a)}.`, ...A.map((x, i) => `${fmtN(x)} × ${fmtN(b)} = ${fmtN(parts[i])}`), `Add them up: ${parts.map(fmtN).join(' + ')} = ${fmtN(sum(parts))}`], sum(parts))
}

/** Round b up to the next ten, multiply, then take the extra groups back. Only when b ends in 7, 8 or 9. */
function roundFix(a: number, b: number): Strat | null {
  const ones = b % 10
  if (ones < 7) return null
  const T = b + (10 - ones)
  const extra = T - b
  const big = a * T
  const back = a * extra
  return strat(
    'Round and Fix',
    [`${fmtN(b)} is close to ${fmtN(T)}. Use ${fmtN(T)} first.`, `${fmtN(a)} × ${fmtN(T)} = ${fmtN(big)}`, `That is ${extra} extra ${s(extra, 'group', 'groups')} of ${fmtN(a)}: ${extra} × ${fmtN(a)} = ${fmtN(back)}`, `Take that back: ${fmtN(big)} − ${fmtN(back)} = ${fmtN(big - back)}`],
    big - back,
  )
}

/** a × d (d is one digit) by doubling and other easy moves. */
function easyMoves(a: number, d: number): Strat {
  const A = fmtN(a)
  const dbl = a + a
  switch (d) {
    case 2:
      return strat('Double It', [`Times 2 means double.`, `${A} + ${A} = ${fmtN(dbl)}`], dbl)
    case 3:
      return strat('Double, Then One More', [`3 groups is 2 groups plus 1 more.`, `${A} + ${A} = ${fmtN(dbl)}`, `${fmtN(dbl)} + ${A} = ${fmtN(dbl + a)}`], dbl + a)
    case 4:
      return strat('Double, Double', [`Times 4 is double, then double again.`, `${A} + ${A} = ${fmtN(dbl)}`, `${fmtN(dbl)} + ${fmtN(dbl)} = ${fmtN(dbl + dbl)}`], dbl + dbl)
    case 5:
      return strat('Half of Ten', [`5 is half of 10.`, `${A} × 10 = ${fmtN(a * 10)}`, `Half of ${fmtN(a * 10)} is ${fmtN((a * 10) / 2)}.`], (a * 10) / 2)
    case 6:
      return strat('Triple, Then Double', [`6 groups is 3 groups, doubled.`, `${A} + ${A} + ${A} = ${fmtN(dbl + a)}`, `${fmtN(dbl + a)} + ${fmtN(dbl + a)} = ${fmtN(dbl + a + dbl + a)}`], dbl + a + (dbl + a))
    case 7: {
      const five = (a * 10) / 2
      return strat('Five and Two', [`Break 7 into 5 + 2.`, `5 groups is half of 10 groups. Half of ${fmtN(a * 10)} is ${fmtN(five)}.`, `2 groups: ${A} + ${A} = ${fmtN(dbl)}`, `${fmtN(five)} + ${fmtN(dbl)} = ${fmtN(five + dbl)}`], five + dbl)
    }
    case 8:
      return strat('Double, Double, Double', [`Times 8 is double, double, double.`, `${A} + ${A} = ${fmtN(dbl)}`, `${fmtN(dbl)} + ${fmtN(dbl)} = ${fmtN(dbl * 2)}`, `${fmtN(dbl * 2)} + ${fmtN(dbl * 2)} = ${fmtN(dbl * 4)}`], dbl + dbl + (dbl + dbl))
    default:
      return strat('Ten Take Away One', [`9 groups is 10 groups take away 1 group.`, `${A} × 10 = ${fmtN(a * 10)}`, `${fmtN(a * 10)} − ${A} = ${fmtN(a * 10 - a)}`], a * 10 - a)
  }
}

/* ───────────────────────── strategy builders: big dividing ───────────────────────── */

type Ask = 'q' | 'r'

/** Friendly chunk sizes (1, 2, 5, 10, 20, 50 …). If that takes too many steps, use one chunk for each place. */
function chunkPlan(N: number, k: number): number[] {
  const out: number[] = []
  let rem = N
  while (rem >= k) {
    let c = 1
    for (let p = 1; p * k <= rem; p *= 10) for (const m of [1, 2, 5]) if (m * p * k <= rem) c = m * p
    out.push(c)
    rem -= c * k
  }
  if (out.length <= 4) return out
  const byPlace: number[] = []
  rem = N
  for (let p = 10000; p >= 1; p /= 10) {
    let c = 0
    while ((c + p) * k <= rem) c += p
    if (c) {
      byPlace.push(c)
      rem -= c * k
    }
  }
  return byPlace
}

/** Partial quotients: take out big chunks of groups. */
function chunkStrat(N: number, k: number, ask: Ask): Strat {
  const plan = chunkPlan(N, k)
  let rem = N
  const steps = plan.map((c) => {
    const before = rem
    rem -= c * k
    return `Take out ${fmtN(c)} ${s(c, 'group', 'groups')} of ${k}. That is ${fmtN(c * k)}. ${fmtN(before)} − ${fmtN(c * k)} = ${fmtN(rem)} left.`
  })
  const q = sum(plan)
  steps.push(plan.length > 1 ? `Count the groups: ${plan.map(fmtN).join(' + ')} = ${fmtN(q)}` : `That makes ${fmtN(q)} ${s(q, 'group', 'groups')}.`)
  if (rem > 0 || ask === 'r') steps.push(rem > 0 ? `${rem} is too small for one more group of ${k}. So ${rem} ${s(rem, 'is', 'are')} left over.` : `Nothing is left over.`)
  return strat('Big Chunks', steps, ask === 'q' ? q : rem)
}

/** Area / place-value way: break the big number into parts that split evenly. */
function breakDivStrat(N: number, k: number, ask: Ask): Strat {
  const parts: number[] = []
  let rem = N
  for (let p = 10000; p >= 1; p /= 10) {
    let c = 0
    while ((c + p) * k <= rem) c += p
    if (c) {
      parts.push(c * k)
      rem -= c * k
    }
  }
  const qs = parts.map((x) => x / k)
  const q = sum(qs)
  if (parts.length === 1 && rem === 0 && ask === 'q' && N % 10 === 0 && (N / 10) % k === 0) {
    const unit = N % 100 === 0 && (N / 100) % k === 0 ? 100 : 10
    const name = unit === 100 ? 'hundreds' : 'tens'
    const each = N / unit / k
    return strat(`Think ${unit === 100 ? 'Hundreds' : 'Tens'}`, [`${fmtN(N)} is ${N / unit} ${name}.`, `Split the ${name}: ${N / unit} ÷ ${k} = ${each}`, `${each} ${name} is ${fmtN(each * unit)}.`], each * unit, { html: areaHTML([each * unit], [k]) })
  }
  const steps = [`Break ${fmtN(N)} into parts that ${k} splits evenly: ${[...parts, ...(rem ? [rem] : [])].map(fmtN).join(' + ')}`, ...parts.map((x, i) => `${fmtN(x)} ÷ ${k} = ${fmtN(qs[i])}`)]
  if (qs.length > 1) steps.push(`Add the answers: ${qs.map(fmtN).join(' + ')} = ${fmtN(q)}`)
  if (rem > 0 || ask === 'r') steps.push(rem > 0 ? `The last part, ${rem}, is too small to split. It is left over.` : `Every part split evenly. Nothing is left over.`)
  return strat('Break Apart', steps, ask === 'q' ? q : rem, { html: areaHTML(qs, [k]) })
}

/** Count up by k (for one-digit answers). */
function countUpStrat(N: number, k: number, ask: Ask): Strat {
  let count = 0
  let at = 0
  while (at + k <= N) {
    at += k
    count++
  }
  const steps = [`Count by ${k}s. Stop before you pass ${fmtN(N)}:`, times(count, (i) => fmtN(k * (i + 1))).join(', '), `That is ${count} ${s(count, 'count', 'counts')} and gets you to ${fmtN(at)}.`]
  if (N - at > 0 || ask === 'r') steps.push(`${fmtN(N)} − ${fmtN(at)} = ${N - at} left over.`)
  return strat('Count Up', steps, ask === 'q' ? count : N - at)
}

/** The written long-division work, one digit at a time. */
function longDivHTML(N: number, k: number): string {
  const ds = String(N)
  const ks = String(k)
  const pre = ' '.repeat(ks.length + 1)
  // right-align t so its last character sits under digit number `col` of the big number
  const upTo = (t: string, col: number, wrap = (x: string) => x) => ' '.repeat(Math.max(0, pre.length + col + 1 - t.length)) + wrap(t)
  const lines: string[] = []
  let top = ''
  let rem = 0
  let started = false
  for (let i = 0; i < ds.length; i++) {
    const cur = rem * 10 + Number(ds[i])
    const qd = Math.floor(cur / k)
    if (started) lines.push(upTo(String(cur), i))
    if (started || qd > 0) {
      lines.push(upTo('−' + String(qd * k), i, ruled))
      started = true
    }
    top += started ? String(qd) : ' '
    rem = cur - qd * k
  }
  lines.push(upTo(String(rem), ds.length - 1))
  return mono([pre + top, `${ks})<span style="border-top:3px solid #37474f">${ds}</span>`, ...lines])
}

function longDivStrat(N: number, k: number, ask: Ask): Strat {
  const ds = String(N)
  const steps: string[] = []
  let rem = 0
  let q = 0
  let started = false
  for (let i = 0; i < ds.length; i++) {
    const digit = Number(ds[i])
    const cur = rem * 10 + digit
    const qd = Math.floor(cur / k)
    const place = PLACE[ds.length - 1 - i]
    if (!started && qd === 0) {
      rem = cur
      continue
    }
    const lead = started ? `Bring down the ${digit} to make ${cur}.` : (place === 'ones' ? `Look at all of ${cur}.` : `Start at the left with ${cur} ${place}.`)
    steps.push(
      qd === 0
        ? `${lead} ${k} is too big to fit, so write 0 on top. ${cur} left.`
        : `${lead} ${k} fits ${qd} ${s(qd, 'time', 'times')}, since ${qd} × ${k} = ${qd * k}. Then ${cur} − ${qd * k} = ${cur - qd * k} left.`,
    )
    started = true
    q = q * 10 + qd
    rem = cur - qd * k
  }
  steps.push(rem > 0 ? `Read the top: ${fmtN(q)}, with ${rem} left over.` : `Read the top: ${fmtN(q)}. Nothing is left over.`)
  return strat('Long Division', steps, ask === 'q' ? q : rem, { html: longDivHTML(N, k) })
}

/* ───────────────────────── stories ───────────────────────── */

const PACKS = [
  { cs: 'bags', c: 'bag', items: 'baseballs', prep: 'in' },
  { cs: 'boxes', c: 'box', items: 'bricks', prep: 'in' },
  { cs: 'packs', c: 'pack', items: 'cards', prep: 'in' },
  { cs: 'teams', c: 'team', items: 'players', prep: 'on' },
  { cs: 'rows', c: 'row', items: 'seats', prep: 'in' },
  { cs: 'shelves', c: 'shelf', items: 'trophies', prep: 'on' },
  { cs: 'pages', c: 'page', items: 'stickers', prep: 'on' },
  { cs: 'vans', c: 'van', items: 'surfers', prep: 'in' },
  { cs: 'buckets', c: 'bucket', items: 'balls', prep: 'in' },
  { cs: 'tables', c: 'table', items: 'puzzles', prep: 'on' },
] as const

const GROUPERS = [
  { things: 'players', act: 'They make teams of', full: 'teams' },
  { things: 'cards', act: 'They go in packs of', full: 'packs' },
  { things: 'bricks', act: 'They go in towers of', full: 'towers' },
  { things: 'baseballs', act: 'They go in buckets of', full: 'buckets' },
  { things: 'dancers', act: 'They stand in rows of', full: 'rows' },
  { things: 'surfboards', act: 'They go on racks of', full: 'racks' },
  { things: 'stickers', act: 'They go on pages of', full: 'pages' },
  { things: 'jumpers', act: 'They jump in groups of', full: 'groups' },
] as const

type Rand = ReturnType<typeof R>
/** A "groups of k" story that asks for one number: full groups, or leftovers. */
function groupStory(r: Rand, N: number, k: number, ask: Ask, exact: boolean): string {
  const g = r.pick(GROUPERS)
  const start = `There are ${fmtN(N)} ${g.things}. ${g.act} ${k}.`
  if (ask === 'r') return `${start} How many ${g.things} are left over?`
  return exact ? `${start} How many ${g.full} are there?` : `${start} How many full ${g.full} are there?`
}

/** Dots in circles plus loose dots that did not fit in a group. */
const leftoverHTML = (q: number, k: number, rem: number) =>
  groupsHTML(q, k) +
  (rem
    ? `<div style="text-align:center;font-size:16px;font-weight:700;color:#37474f;margin-top:4px">Left over: ${times(rem, () => `<span style="display:inline-block;width:17px;height:17px;border-radius:50%;background:#42a5f5;margin:0 3px;vertical-align:middle"></span>`).join('')}</div>`
    : '')

/** One bar for the small amount, k bars for the big amount. */
function barsHTML(labelSmall: string, labelBig: string, k: number, inBox: string): string {
  const box = (bg: string) => `<span style="display:inline-block;min-width:40px;padding:6px 4px;margin:2px;border-radius:8px;background:${bg};color:${INK};font-weight:700;font-size:16px;text-align:center">${inBox}</span>`
  const row = (label: string, n: number, bg: string) => `<div style="margin:4px 0"><div style="font-size:15px;font-weight:700;color:#37474f">${label}</div><div>${times(n, () => box(bg)).join('')}</div></div>`
  return `<div style="max-width:480px;margin:8px auto;text-align:left">${row(labelSmall, 1, '#ffcc80')}${row(labelBig, k, '#90caf9')}</div>`
}

/* ───────────────────────── division items shared by three skills ───────────────────────── */

function divisionItem(r: Rand, N: number, k: number, d: 1 | 2 | 3, ways: (ask: Ask) => Strat[], storyChance: number): Item {
  const q = Math.floor(N / k)
  const rem = N % k
  const exact = rem === 0
  const ask: Ask = exact ? 'q' : r.chance(0.5) ? 'q' : 'r'
  const story = !exact || r.chance(storyChance)
  const base = {
    input: 'number' as const,
    strategies: ways(ask),
    operands: [N, k],
    difficulty: d,
  }
  if (ask === 'r')
    // gave the number of groups, counted up to the next group, stopped one group early, said none
    return { ...base, prompt: groupStory(r, N, k, 'r', false), answer: rem, distractors: wrongs(rem, [q, k - rem, rem + k, 0, rem + 1]) }
  // one group too many (rounded up), one too few, gave the leftovers, a place-value slip
  const slips = wrongs(q, [q + 1, q - 1, ...(rem ? [rem] : []), q >= 100 ? q - 100 : q + 10, q >= 20 ? q - 10 : q + 2, Math.floor(q / 10) + (q % 10)])
  return story
    ? { ...base, prompt: groupStory(r, N, k, 'q', exact), answer: q, distractors: slips }
    : { ...base, prompt: `What is ${fmtN(N)} divided by ${k}?`, eq: `${fmtN(N)} ÷ ${k} = ${Q}`, eqOnly: true, answer: q, distractors: slips }
}

/* ───────────────────────── the skills ───────────────────────── */

const OTHERS = ['Mia', 'Leo', 'Sam', 'Ava', 'Ben', 'Zoe', 'Max', 'Ivy'] as const
const DID = [
  ['hit', 'hit', 'home runs'],
  ['caught', 'catch', 'waves'],
  ['did', 'do', 'jumps'],
  ['got', 'get', 'hits'],
  ['built', 'build', 'towers'],
  ['had', 'have', 'cards'],
  ['had', 'have', 'bricks'],
  ['found', 'find', 'shells'],
  ['threw', 'throw', 'pitches'],
  ['made', 'make', 'catches'],
] as const

export const gens: Record<string, Gen> = {
  /* Rows and Columns (grade 2): count an array as equal rows. */
  'md.arrays': (rng, d) => {
    const r = R(rng)
    const rows = d === 1 ? r.int(2, 3) : d === 2 ? r.int(2, 5) : r.int(3, 5)
    const cols = d === 3 ? r.int(6, 9) : r.int(2, 5)
    const total = rows * cols
    const thing = r.pick(['baseballs', 'bricks', 'stickers', 'stars', 'seats', 'cupcakes', 'dots', 'surfboards'] as const)
    const byCols = r.chance(0.3)
    return {
      prompt: byCols ? `The ${thing} are in ${cols} columns. Each column has ${rows}. How many ${thing} in all?` : `The ${thing} are in ${rows} rows. Each row has ${cols}. How many ${thing} in all?`,
      visual: arrayHTML(rows, cols),
      input: 'number',
      answer: total,
      strategies: [
        strat('Add the Rows', [`There are ${rows} rows. Each row has ${cols}.`, `Add ${cols} for each row: ${times(rows, () => cols).join(' + ')} = ${sum(times(rows, () => cols))}`], sum(times(rows, () => cols)), { html: arrayHTML(rows, cols) }),
        strat('Count by Columns', [`Look down the columns. There are ${cols} columns. Each one has ${rows}.`, `Count by ${rows}s, ${cols} times: ${skipList(rows, cols)}`, `Rows or columns, you get the same total.`], sum(times(cols, () => rows)), { line: times(cols + 1, (i) => i * rows) }),
      ],
      // added the two numbers, missed a row, counted a row twice, missed a column
      distractors: wrongs(total, [rows + cols, total - cols, total + cols, total - rows]),
      operands: [rows, cols],
      difficulty: d,
    }
  },

  /* Times 3 and 4. */
  'md.times-3-4': (rng, d) => {
    const r = R(rng)
    const key = r.pick([3, 4] as const)
    const n = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 10) : r.int(6, 12)
    const ans = key * n
    const [x, y] = r.chance(0.5) ? [key, n] : [n, key]
    return {
      prompt: `What is ${x} times ${y}?`,
      eq: `${x} × ${y} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies: [skipCount(key, n), derive(key, n)],
      // added, one group too many or too few, slid to the next fact
      distractors: wrongs(ans, [key + n, ans + key, ans - key, ans + n, ans - n]),
      operands: [key, n],
      difficulty: d,
    }
  },

  /* Times 6, 7, 8, 9. */
  'md.times-6-9': (rng, d) => {
    const r = R(rng)
    const key = r.pick([6, 7, 8, 9] as const)
    const n = d === 1 ? r.int(2, 5) : d === 2 ? r.int(3, 9) : r.int(6, 12)
    const ans = key * n
    const [x, y] = r.chance(0.5) ? [key, n] : [n, key]
    const five = strat('Break Apart with 5', [`Break ${key} into 5 + ${key - 5}.`, `5 × ${n} = ${5 * n}`, `${key - 5} × ${n} = ${(key - 5) * n}`, `${5 * n} + ${(key - 5) * n} = ${5 * n + (key - 5) * n}`], 5 * n + (key - 5) * n, { html: arrayHTML(n, key, 5) })
    return {
      prompt: `What is ${x} times ${y}?`,
      eq: `${x} × ${y} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies: key === 7 ? [five, skipCount(n, key)] : key === 6 ? [derive(6, n), skipCount(n, key)] : [derive(key, n), five],
      distractors: wrongs(ans, [key + n, ans + key, ans - key, ans + n, ans - n, ans + 10]),
      operands: [key, n],
      difficulty: d,
    }
  },

  /* Square numbers. */
  'md.squares': (rng, d) => {
    const r = R(rng)
    const n = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 10) : r.int(6, 12)
    const sq = n * n
    if (d > 1 && r.chance(0.3)) {
      let root = 1
      while (root * root < sq) root++
      const odds: number[] = []
      for (let total = 0, odd = 1; total < sq; odd += 2) {
        odds.push(odd)
        total += odd
      }
      return {
        prompt: `What number times itself makes ${sq}?`,
        eq: `${Q} × ${Q} = ${sq}`,
        eqOnly: true,
        input: 'number',
        answer: n,
        strategies: [
          strat('Try Squares', [`Try a number times itself.`, ...(root > 2 ? [`${root - 1} × ${root - 1} = ${(root - 1) * (root - 1)}. Too small.`] : []), `${root} × ${root} = ${root * root}. That is it!`], root),
          strat('Odd Number Steps', [`Squares grow by odd numbers: 1, then 3 more, then 5 more.`, `Add odd numbers until you reach ${sq}:`, odds.length > 1 ? `${odds.join(' + ')} = ${sum(odds)}` : `1 is the first square.`, `That took ${odds.length} odd numbers, so the answer is ${odds.length}.`], odds.length),
        ],
        // halved it, off by one, gave the square back
        distractors: wrongs(n, [Math.floor(sq / 2), n + 1, n - 1, sq]),
        operands: [n],
        difficulty: d,
      }
    }
    const before = (n - 1) * (n - 1)
    return {
      prompt: `What is ${n} times ${n}?`,
      eq: `${n} × ${n} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: sq,
      strategies: [
        strat('Make a Square', [`${n} rows of ${n} make a square.`, `Count by ${n}s, ${n} times: ${skipList(n, n)}`, `So ${n} × ${n} = ${sum(times(n, () => n))}`], sum(times(n, () => n)), { html: arrayHTML(n, n) }),
        n === 2
          ? strat('Double It', [`2 times 2 means double 2.`, `2 + 2 = 4`], 2 + 2)
          : strat('Grow the Last Square', [`Start with the square before it: ${n - 1} × ${n - 1} = ${before}`, `Add one more row of ${n - 1} and one more column of ${n}.`, `${before} + ${n - 1} + ${n} = ${before + (n - 1) + n}`], before + (n - 1) + n),
      ],
      // doubled instead of squared, one row short, one row too many
      distractors: wrongs(sq, [n + n, sq - n, sq + n, before]),
      operands: [n],
      difficulty: d,
    }
  },

  /* Division facts. */
  'md.div-facts': (rng, d) => {
    const r = R(rng)
    const k = d === 1 ? r.pick([2, 3, 4, 5, 10] as const) : d === 2 ? r.int(2, 9) : r.int(6, 9)
    const q = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 10) : r.int(4, 12)
    const N = k * q
    return {
      prompt: `What is ${N} divided by ${k}?`,
      eq: `${N} ÷ ${k} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: q,
      strategies: divWays(N, k),
      // one group off, subtracted instead, gave the divider back
      distractors: wrongs(q, [q + 1, q - 1, N - k, k, q + 2]),
      operands: [N, k],
      difficulty: d,
    }
  },

  /* Times tens (and hundreds at the top). */
  'md.times-tens': (rng, d) => {
    const r = R(rng)
    if (d === 3 && r.chance(0.5)) {
      const t1 = r.int(2, 9)
      const t2 = r.int(2, 9)
      const T1 = t1 * 10
      const T2 = t2 * 10
      const p = t1 * t2
      const ans = T1 * T2
      return {
        prompt: `What is ${T1} times ${T2}?`,
        eq: `${T1} × ${T2} = ${Q}`,
        eqOnly: true,
        input: 'number',
        answer: ans,
        strategies: [
          strat('Fact, Then Zeros', [`Do the small fact first: ${t1} × ${t2} = ${p}`, `${T1} and ${T2} have 2 zeros in all. Put 2 zeros after ${p}.`, `That makes ${fmtN(Number(`${p}00`))}.`], Number(`${p}00`)),
          strat('One Ten at a Time', [`${T2} is ${t2} tens. First do ${T1} × ${t2}, then make it tens.`, `${T1} × ${t2} = ${T1 * t2}`, `${T1 * t2} × 10 = ${fmtN(T1 * t2 * 10)}`], T1 * t2 * 10),
        ],
        // one zero short, forgot both zeros, added
        distractors: wrongs(ans, [p * 10, p, T1 + T2, p * 1000]),
        operands: [T1, T2],
        difficulty: d,
      }
    }
    const unit = d === 3 ? 100 : 10
    const unitName = unit === 10 ? 'tens' : 'hundreds'
    const a = d === 1 ? r.int(2, 5) : r.int(2, 9)
    const t = d === 1 ? r.int(2, 5) : r.int(2, 9)
    const T = t * unit
    const ans = a * T
    const [x, y] = r.chance(0.5) ? [a, T] : [T, a]
    const second =
      a <= 5
        ? strat('Add It Up', [`${a} × ${T} means ${a} groups of ${T}.`, `${times(a, () => T).join(' + ')} = ${fmtN(sum(times(a, () => T)))}`], sum(times(a, () => T)), { line: times(a + 1, (i) => i * T) })
        : strat('Break Apart', [`Break ${a} into 5 + ${a - 5}.`, `5 × ${T} = ${fmtN(5 * T)}`, `${a - 5} × ${T} = ${fmtN((a - 5) * T)}`, `${fmtN(5 * T)} + ${fmtN((a - 5) * T)} = ${fmtN(5 * T + (a - 5) * T)}`], 5 * T + (a - 5) * T)
    return {
      prompt: `What is ${x} times ${y}?`,
      eq: `${x} × ${y} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies: [strat(`Think ${unit === 10 ? 'Tens' : 'Hundreds'}`, [`${T} is ${t} ${unitName}.`, `${a} groups of ${t} ${unitName} is ${a * t} ${unitName}, because ${a} × ${t} = ${a * t}`, `${a * t} ${unitName} is ${fmtN(a * t * unit)}.`], a * t * unit), second],
      // forgot the zero, one zero too many, added, one group off
      distractors: wrongs(ans, [a * t, ans * 10, a + T, ans + T, ans - T, ...(unit === 100 ? [a * t * 10] : [])]),
      operands: [a, T],
      difficulty: d,
    }
  },

  /* Break It to Multiply (distributive property). */
  'md.distributive': (rng, d) => {
    const r = R(rng)
    const a = d === 3 ? r.int(3, 9) : r.int(2, 9)
    const b = d === 1 ? r.int(6, 9) : d === 2 ? r.int(12, 19) : r.int(2, 4) * 10 + r.int(2, 9)
    const p = d === 1 ? 5 : b - (b % 10)
    const q = b - p
    const ans = a * b
    if (r.chance(0.35)) {
      const whole = a * b
      const part = a * p
      return {
        prompt: `${a} times ${b} is the same as ${a} times ${p} plus ${a} times what number?`,
        eq: `${a} × ${b} = ${a} × ${p} + ${a} × ${Q}`,
        input: 'number',
        answer: q,
        strategies: [
          strat('Parts Make the Whole', [`${b} is broken into two parts. One part is ${p}.`, `Find the other part: ${b} − ${p} = ${b - p}`, `So ${a} × ${b} is ${a} × ${p} plus ${a} × ${b - p}.`], b - p, b <= 12 ? { html: arrayHTML(a, b, p) } : { html: areaHTML([p, b - p], [a]) }),
          strat('Check the Totals', [`${a} × ${b} = ${whole}`, `${a} × ${p} = ${part}`, `${whole} − ${part} = ${whole - part} is still needed.`, `${whole - part} ÷ ${a} = ${(whole - part) / a}`], (whole - part) / a),
        ],
        // gave the part already shown, the whole number, the other factor, added the parts
        distractors: wrongs(q, [p, b, a, b + p, q + 1]),
        operands: [a, b],
        difficulty: d,
      }
    }
    const x = a > 5 ? 5 : a >= 4 ? 2 : 1
    return {
      prompt: `What is ${a} times ${b}? Break ${b} into ${p} and ${q} to help.`,
      eq: `${a} × ${b} = ${Q}`,
      input: 'number',
      answer: ans,
      strategies: [
        strat('Break Apart', [`Break ${b} into ${p} + ${q}.`, `${a} × ${p} = ${a * p}`, `${a} × ${q} = ${a * q}`, `Add the parts: ${a * p} + ${a * q} = ${a * p + a * q}`], a * p + a * q, b <= 12 ? { html: arrayHTML(a, b, p) } : { html: areaHTML([p, q], [a]) }),
        a === 2
          ? strat('Double It', [`Times 2 means double.`, `${b} + ${b} = ${b + b}`], b + b)
          : strat('Break the Other Number', [`This time break ${a} into ${x} + ${a - x}.`, `${x} × ${b} = ${x * b}`, `${a - x} × ${b} = ${(a - x) * b}`, `Add the parts: ${x * b} + ${(a - x) * b} = ${x * b + (a - x) * b}`], x * b + (a - x) * b),
      ],
      // multiplied only one part, stopped after the first part, added, one group off
      distractors: wrongs(ans, [a * p + q, a * p, a + b, ans + a, ans - a]),
      operands: [a, b],
      difficulty: d,
    }
  },

  /* Multiply & divide stories. */
  'md.word-mult': (rng, d) => {
    const r = R(rng)
    const a = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 9) : r.int(6, 9)
    const b = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 10) : r.int(6, 12)
    const N = a * b
    const k = r.pick(PACKS)
    const kind = r.pick(['mult', 'mult', 'rows', 'share', 'group'] as const)
    if (kind === 'mult' || kind === 'rows') {
      const thing = kind === 'rows' ? r.pick(['dancers', 'bricks', 'cards', 'seats', 'trophies', 'baseballs'] as const) : k.items
      return {
        prompt: kind === 'rows' ? `The ${thing} are in ${a} rows. Each row has ${b}. How many ${thing} in all?` : `There are ${a} ${k.cs}. Each ${k.c} has ${b} ${k.items}. How many ${k.items} in all?`,
        input: 'number',
        answer: N,
        strategies: [skipCount(a, b), pickDerive(a, b)],
        // added the two numbers, one group off
        distractors: wrongs(N, [a + b, N + b, N - b, N + a]),
        operands: [a, b],
        difficulty: d,
      }
    }
    // share: N things into a groups (answer b).  group: b in each (answer a).
    const [divisor, ans] = kind === 'share' ? [a, b] : [b, a]
    return {
      prompt:
        kind === 'share'
          ? `There are ${N} ${k.items}. They go ${k.prep} ${a} ${k.cs}, the same number ${k.prep} each. How many ${k.items} ${k.prep} each ${k.c}?`
          : `There are ${N} ${k.items}. ${b} go ${k.prep} each ${k.c}. How many ${k.cs} are there?`,
      input: 'number',
      answer: ans,
      strategies: divWays(N, divisor),
      // subtracted, multiplied, gave the other number, one off
      distractors: wrongs(ans, [N - divisor, N + divisor, ...(divisor !== ans ? [divisor] : []), ans + 1, ans - 1]),
      operands: [N, divisor],
      difficulty: d,
    }
  },

  /* Times as many. */
  'md.compare-times': (rng, d) => {
    const r = R(rng)
    const small = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 9) : r.int(6, 12)
    const k = d === 1 ? r.int(2, 4) : d === 2 ? r.int(2, 6) : r.int(3, 9)
    const big = small * k
    const o = r.pick(OTHERS)
    const [past, base, thing] = r.pick(DID)
    const kind = d === 1 ? r.pick(['big', 'big', 'small'] as const) : r.pick(['big', 'small', 'times'] as const)
    if (kind === 'big')
      return {
        prompt: `${o} ${past} ${small} ${thing}. {n} ${past} ${k} times as many. How many ${thing} did {n} ${base}?`,
        input: 'number',
        answer: big,
        strategies: [
          strat('Draw Bars', [`Draw 1 bar for ${o}. It is worth ${small}.`, `${k} times as many means ${k} bars of ${small}.`, `Count by ${small}s, ${k} times: ${skipList(small, k)}`], sum(times(k, () => small)), { html: barsHTML(o, `${k} times as many`, k, String(small)) }),
          { ...pickDerive(k, small), name: 'Use a Fact' },
        ],
        // "3 more" instead of "3 times", one bar off
        distractors: wrongs(big, [small + k, big + small, big - small, big + k]),
        operands: [small, k],
        difficulty: d,
      }
    if (kind === 'small') {
      let count = 0
      for (let t = k; t <= big; t += k) count++
      return {
        prompt: `{n} ${past} ${big} ${thing}. That is ${k} times as many as ${o}. How many ${thing} did ${o} ${base}?`,
        input: 'number',
        answer: small,
        strategies: [
          strat('Draw Bars', [`The big amount is ${k} equal bars. One bar is what ${o} ${past}.`, `Split ${big} into ${k} equal bars.`, `${big} ÷ ${k} = ${big / k}`], big / k, { html: barsHTML(o, `${k} times as many is ${big}`, k, '?') }),
          strat('Think Multiplication', [`Ask: ${k} times what number makes ${big}?`, `Count by ${k}s until you get to ${big}: ${skipList(k, count)}`, `That took ${count} ${s(count, 'count', 'counts')}, so ${o} ${past} ${count}.`], count),
        ],
        // multiplied again, subtracted, one off
        distractors: wrongs(small, [big * k, big - k, small + 1, small - 1, ...(k !== small ? [k] : [])]),
        operands: [big, k],
        difficulty: d,
      }
    }
    let fits = 0
    for (let t = small; t <= big; t += small) fits++
    return {
      prompt: `{n} ${past} ${big} ${thing}. ${o} ${past} ${small}. {n} ${past} how many times as many as ${o}?`,
      input: 'number',
      answer: k,
      strategies: [
        strat('How Many Fit', [`How many ${small}s fit in ${big}?`, `Count by ${small}s until you get to ${big}: ${skipList(small, fits)}`, `That took ${fits} ${s(fits, 'count', 'counts')}. So it is ${fits} times as many.`], fits, fits <= 10 ? { line: times(fits + 1, (i) => i * small) } : {}),
        strat('Divide', [`"Times as many" is a multiply story: ${small} times what number makes ${big}?`, `Divide to find it: ${big} ÷ ${small} = ${big / small}`], big / small),
      ],
      // "how many more" instead of "how many times", one off
      distractors: wrongs(k, [big - small, k + 1, k - 1, ...(small !== k ? [small] : [])]),
      operands: [big, small],
      difficulty: d,
    }
  },

  /* Leftovers: division with remainders, one number at a time. */
  'md.remainders': (rng, d) => {
    const r = R(rng)
    const k = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 9) : r.int(3, 9)
    const q = d === 1 ? r.int(1, 5) : d === 2 ? r.int(2, 9) : r.int(5, 12)
    const ask: Ask = r.chance(0.5) ? 'q' : 'r'
    const rem = ask === 'r' && d > 1 && r.chance(0.1) ? 0 : r.int(1, k - 1)
    const N = q * k + rem
    let groups = 0
    let left = N
    while (left >= k) {
      left -= k
      groups++
    }
    const draw =
      N <= 40 && k <= 8
        ? strat('Draw It', [`Draw ${N} dots. Circle groups of ${k}.`, `You can circle ${groups} ${s(groups, 'group', 'groups')}.`, left ? `${left} ${s(left, 'dot is', 'dots are')} not in a group. ${s(left, 'It is', 'They are')} left over.` : `Every dot is in a group. Nothing is left over.`], ask === 'q' ? groups : left, { html: leftoverHTML(groups, k, left) })
        : chunkStrat(N, k, ask)
    return {
      prompt: groupStory(r, N, k, ask, false),
      input: 'number',
      answer: ask === 'q' ? q : rem,
      strategies: [countUpStrat(N, k, ask), draw],
      distractors:
        ask === 'q'
          ? // made one more group out of the leftovers, gave the leftovers, one short
            wrongs(q, [q + 1, ...(rem ? [rem] : []), q - 1, N - k])
          : // gave the groups, counted up to the next group, stopped one group early, said none
            wrongs(rem, [q, k - rem, rem + k, 0, rem + 1]),
      operands: [N, k],
      difficulty: d,
    }
  },

  /* 3-digit times 1-digit. */
  'md.three-by-one': (rng, d) => {
    const r = R(rng)
    const m = d === 1 ? r.int(2, 3) : d === 2 ? r.int(2, 5) : r.int(6, 9)
    let a = d === 1 ? r.int(1, 3) * 100 + r.int(0, 3) * 10 + r.int(1, 3) : r.int(101, 999)
    if (a % 100 === 0) a += r.int(1, 99)
    const ans = a * m
    const A = pieces(a)
    // dropped every carry: keep only the ones digit of each small product (except in the top place)
    const noCarry = sum(A.map((x, i) => (i === 0 ? x * m : (((x / 10 ** (String(x).length - 1)) * m) % 10) * 10 ** (String(x).length - 1))))
    const story = r.chance(0.3)
    const stories = [
      `A ballpark has ${m} sections. Each section has ${a} seats. How many seats in all?`,
      `{n} builds ${m} brick towers. Each tower has ${a} bricks. How many bricks in all?`,
      `A team plays ${m} games. ${a} fans come to each game. How many fans in all?`,
      `There are ${m} boxes of cards. Each box has ${a} cards. How many cards in all?`,
    ]
    return {
      prompt: story ? r.pick(stories) : `What is ${a} times ${m}?`,
      ...(story ? {} : { eq: `${a} × ${m} = ${Q}`, eqOnly: true }),
      input: 'number',
      answer: ans,
      strategies: [areaStrat(a, m), easyMoves(a, m)],
      // dropped the carries, left out one part, hundreds done as tens, added
      distractors: wrongs(ans, [noCarry, ans - A[A.length - 1] * m, A[0] * m + (a - A[0]), a + m, ans + 100, ans - 10]),
      operands: [a, m],
      difficulty: d,
    }
  },

  /* 2-digit times 2-digit. */
  'md.two-by-two': (rng, d) => {
    const r = R(rng)
    let a: number, b: number
    if (d === 1) {
      a = r.int(11, 19)
      b = r.chance(0.4) ? r.int(2, 5) * 10 : r.int(11, 15)
    } else if (d === 2) {
      a = r.int(12, 39)
      b = r.int(1, 3) * 10 + r.int(1, 9)
    } else {
      a = r.int(24, 99)
      b = r.int(2, 9) * 10 + r.int(1, 9)
    }
    const ans = a * b
    const ta = a - (a % 10)
    const tb = b - (b % 10)
    const strategies: Strat[] = [areaStrat(a, b)]
    if (b % 10 === 0) {
      const t = b / 10
      strategies.push(strat('Tens Trick', [`${b} is ${t} tens. First do ${a} × ${t}, then make it tens.`, `${a} × ${t} = ${a * t}`, `${a * t} × 10 = ${fmtN(a * t * 10)}`], a * t * 10))
    } else {
      strategies.push(stackStrat(a, b))
      const rf = roundFix(a, b)
      if (rf) strategies.push(rf)
    }
    const [x, y] = r.chance(0.5) ? [a, b] : [b, a]
    return {
      prompt: `What is ${x} times ${y}?`,
      eq: `${x} × ${y} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies,
      // only tens × tens plus ones × ones, forgot the zero in the tens row, added, a missing part
      distractors: wrongs(ans, [ta * tb + (a % 10) * (b % 10), a * (b % 10) + a * (tb / 10), a + b, ans - ta * (b % 10 || 1), ans + 100, a * (tb / 10)]),
      operands: [a, b],
      difficulty: d,
    }
  },

  /* Divide Bigger Numbers: 2-digit (then 3-digit) by 1-digit, answers of 10 or more. */
  'md.divide-2-digit': (rng, d) => {
    const r = R(rng)
    let k: number, q: number, rem = 0
    if (d === 1) {
      k = r.int(2, 5)
      q = r.int(11, Math.floor(99 / k))
    } else if (d === 2) {
      k = r.int(2, 9)
      q = r.int(10, Math.floor(99 / k))
      if (r.chance(0.4)) rem = r.int(1, Math.min(k - 1, 99 - q * k) || 1)
      if (q * k + rem > 99) rem = 0
    } else {
      k = r.int(3, 9)
      q = r.int(Math.max(12, Math.ceil(100 / k)), Math.min(99, Math.floor(999 / k)))
      if (r.chance(0.4)) rem = r.int(1, k - 1)
      if (q * k + rem > 999) rem = 0
    }
    const N = q * k + rem
    return divisionItem(r, N, k, d, (ask) => [chunkStrat(N, k, ask), breakDivStrat(N, k, ask)], 0.25)
  },

  /* Long division: 3-digit and 4-digit by 1-digit. */
  'md.long-division': (rng, d) => {
    const r = R(rng)
    const k = d === 1 ? r.int(2, 5) : r.int(2, 9)
    let N: number
    if (d === 1) N = r.int(100, Math.floor(999 / k)) * k
    else {
      const lo = d === 2 ? 100 : 1000
      const hi = d === 2 ? 999 : 9999
      const q = r.int(Math.max(20, Math.ceil(lo / k)), Math.floor(hi / k))
      N = q * k
      if (r.chance(0.5) && N + k - 1 <= hi) N += r.int(1, k - 1)
    }
    return divisionItem(r, N, k, d, (ask) => [longDivStrat(N, k, ask), chunkStrat(N, k, ask), breakDivStrat(N, k, ask)], 0.2)
  },

  /* Factors. */
  'md.factors': (rng, d) => {
    const r = R(rng)
    const [lo, hi] = d === 1 ? [6, 30] : d === 2 ? [12, 60] : [36, 100]
    let N = r.int(lo, hi)
    while (factorsOf(N).length < 4) N = N + 1 > hi ? lo : N + 1
    const fs = factorsOf(N)
    const pairs = pairsOf(N)
    const inPairs = (c: number) => pairs.some(([x, y]) => x === c || y === c)
    const proper = fs.filter((f) => f !== 1 && f !== N)
    const non = times(Math.min(N - 2, Math.max(12, Math.floor(N / 2))) - 1, (i) => i + 2).filter((c) => N % c !== 0)
    const kind = r.pick(['which', 'count', 'partner', 'isit'] as const)
    const base = { operands: [N], difficulty: d }
    if (kind === 'which') {
      const f = r.pick(proper)
      const opts = [f, ...r.shuffle(non).slice(0, 3)].sort((x, y) => x - y)
      return {
        ...base,
        prompt: `Which number is a factor of ${N}?`,
        ...choice(String(f), opts.filter((c) => c !== f).map(String), rng),
        strategies: [
          strat('Divide and Check', [`A factor divides ${N} with no leftovers. Test each choice.`, ...opts.map((c) => (N % c === 0 ? `${N} ÷ ${c} = ${N / c}. No leftovers!` : `${N} ÷ ${c} has ${N % c} left over.`))], String(opts.find((c) => N % c === 0))),
          strat('List Factor Pairs', [`Pairs that multiply to make ${N}:`, pairText(N), `Only ${opts.find(inPairs)} from the choices is in a pair.`], String(opts.find(inPairs))),
        ],
      }
    }
    if (kind === 'count') {
      const square = pairs.some(([x, y]) => x === y)
      const n = pairs.length * 2 - (square ? 1 : 0)
      return {
        ...base,
        prompt: `How many factors does ${N} have?`,
        input: 'number',
        answer: fs.length,
        strategies: [
          strat('List Factor Pairs', [`Find every pair that multiplies to make ${N}:`, pairText(N), square ? `Count each number one time. The number that pairs with itself counts once.` : `Count each number in the pairs.`, `There are ${n} factors.`], n),
          strat('Try Each Number', [`Try 1, 2, 3 and so on. Keep the ones that divide ${N} with no leftovers.`, `They are: ${fs.join(', ')}`, `Count them: ${fs.length}`], fs.length),
        ],
        // forgot 1 and the number itself, counted pairs, one off
        distractors: wrongs(fs.length, [fs.length - 2, pairs.length, fs.length + 1, fs.length - 1]),
      }
    }
    if (kind === 'partner') {
      const a = r.pick(proper)
      const partner = pairs.find(([x, y]) => x === a || y === a)!
      const viaPairs = partner[0] === a ? partner[1] : partner[0]
      let count = 0
      for (let t = a; t <= N; t += a) count++
      return {
        ...base,
        prompt: `${a} and what number are a factor pair of ${N}? ${a} times what number makes ${N}?`,
        eq: `${a} × ${Q} = ${N}`,
        input: 'number',
        answer: N / a,
        strategies: [
          strat('List Factor Pairs', [`Pairs that multiply to make ${N}:`, pairText(N), `${a} is in a pair with ${viaPairs}.`], viaPairs),
          count <= 12
            ? strat('Skip Count', [`Count by ${a}s until you get to ${N}:`, skipList(a, count), `That took ${count} ${s(count, 'count', 'counts')}. So ${count} × ${a} = ${count * a}`], count)
            : strat('Divide', [`The partner is how many ${a}s fit in ${N}.`, `${N} ÷ ${a} = ${N / a}`, `Check: ${a} × ${N / a} = ${a * (N / a)}`], N / a),
        ],
        // subtracted, gave the same factor, one off
        distractors: wrongs(N / a, [N - a, ...(a !== N / a ? [a] : []), N / a + 1, N / a - 1]),
      }
    }
    const yes = r.chance(0.5)
    const c = yes ? r.pick(proper) : r.pick(non.filter((x) => x <= 12).length ? non.filter((x) => x <= 12) : non)
    const under = Math.floor(N / c)
    return {
      ...base,
      operands: [N, c],
      prompt: `Is ${c} a factor of ${N}?`,
      ...choice(N % c === 0 ? 'Yes' : 'No', ['Yes', 'No'], rng, true),
      strategies: [
        strat(
          'Divide and Check',
          N % c === 0 ? [`A factor divides ${N} with no leftovers.`, `${N} ÷ ${c} = ${N / c}`, `No leftovers, so yes.`] : [`A factor divides ${N} with no leftovers.`, `${under} × ${c} = ${under * c}. That is ${N - under * c} short of ${N}.`, `There are leftovers, so no.`],
          N - under * c === 0 ? 'Yes' : 'No',
        ),
        strat('List Factor Pairs', [`Pairs that multiply to make ${N}:`, pairText(N), inPairs(c) ? `${c} is in the list, so yes.` : `${c} is not in the list, so no.`], inPairs(c) ? 'Yes' : 'No'),
      ],
    }
  },

  /* Multiples. */
  'md.multiples': (rng, d) => {
    const r = R(rng)
    const k = d === 1 ? r.pick([2, 3, 4, 5, 10] as const) : d === 2 ? r.int(2, 9) : r.int(6, 12)
    const top = d === 1 ? 6 : d === 2 ? 10 : 12
    const kind = r.pick(['next', 'next', 'nth', 'which', 'isit'] as const)
    const base = { difficulty: d }
    const divides = (c: number) => {
      const under = Math.floor(c / k)
      return c - under * k === 0
    }
    if (kind === 'nth') {
      const n = r.int(d === 1 ? 2 : 3, top)
      return {
        ...base,
        prompt: `What is the ${ORD[n]} multiple of ${k}?`,
        input: 'number',
        answer: n * k,
        strategies: [strat('Skip Count', [`Multiples of ${k} are what you say when you count by ${k}s.`, skipList(k, n), `The ${ORD[n]} number you said is ${sum(times(n, () => k))}.`], sum(times(n, () => k))), { ...pickDerive(n, k), name: 'Use a Fact' }],
        // one count off, added instead
        distractors: wrongs(n * k, [(n - 1) * k, (n + 1) * k, n + k, n * k + 1]),
        operands: [k, n],
      }
    }
    if (kind === 'next') {
      const j = r.int(d === 1 ? 2 : 3, top - 1)
      const extra = d === 3 && r.chance(0.6) ? r.int(1, k - 1) : 0
      const start = j * k + extra
      const ans = (j + 1) * k
      let under = 0
      while ((under + 1) * k <= start) under++
      let at = k
      const said = [k]
      while (at <= start) {
        at += k
        said.push(at)
      }
      return {
        ...base,
        prompt: `What is the next multiple of ${k} after ${start}?`,
        input: 'number',
        answer: ans,
        strategies: [
          extra
            ? strat('Closest Fact', [`${start} is not a multiple of ${k}. Find the one just before it.`, `${under} × ${k} = ${under * k}`, `Add one more ${k}: ${under * k} + ${k} = ${under * k + k}`], under * k + k)
            : strat('Add One More', [`${start} is a multiple of ${k}, because ${under} × ${k} = ${under * k}`, `The next one is ${k} more.`, `${start} + ${k} = ${start + k}`], start + k, { line: [start, start + k] }),
          strat('Skip Count', [`Count by ${k}s until you pass ${start}:`, said.join(', '), `The first number after ${start} is ${at}.`], at),
        ],
        // added 1, added 10, went backward, went two too far
        distractors: wrongs(ans, [start + 1, ...(k !== 10 ? [start + 10] : []), under * k === start ? start - k : under * k, ans + k, ...(extra ? [start + k] : [])]),
        operands: [k, start],
      }
    }
    if (kind === 'which') {
      const m = r.int(2, top) * k
      const nons: number[] = []
      for (const c of r.shuffle(times(top * k, (i) => i + 2))) if (!divides(c) && nons.length < 3 && c > k) nons.push(c)
      const opts = [m, ...nons].sort((x, y) => x - y)
      const list = times(Math.floor(Math.max(...opts) / k), (i) => (i + 1) * k)
      return {
        ...base,
        prompt: `Which number is a multiple of ${k}?`,
        ...choice(String(m), nons.map(String), rng),
        strategies: [
          strat('Skip Count', [`Count by ${k}s and watch for one of the choices:`, list.join(', '), `${opts.find((c) => list.includes(c))} is in the list.`], String(opts.find((c) => list.includes(c)))),
          strat('Divide and Check', [`A multiple of ${k} splits into ${k}s with no leftovers.`, ...opts.map((c) => (divides(c) ? `${c} ÷ ${k} = ${c / k}. No leftovers!` : `${c} ÷ ${k} has ${c % k} left over.`))], String(opts.find(divides))),
        ],
        operands: [k, m],
      }
    }
    const yes = r.chance(0.5)
    const c = r.int(2, top) * k + (yes ? 0 : r.int(1, k - 1))
    const list = times(Math.ceil(c / k), (i) => (i + 1) * k)
    const under = Math.floor(c / k)
    return {
      ...base,
      prompt: `Is ${c} a multiple of ${k}?`,
      ...choice(divides(c) ? 'Yes' : 'No', ['Yes', 'No'], rng, true),
      strategies: [
        strat('Skip Count', [`Count by ${k}s and see if you land on ${c}:`, list.join(', '), list.includes(c) ? `You land right on ${c}, so yes.` : `You jump over ${c}, so no.`], list.includes(c) ? 'Yes' : 'No'),
        strat('Use a Fact', c - under * k === 0 ? [`Look for a times fact with ${k} that makes ${c}.`, `${under} × ${k} = ${under * k}`, `It works, so yes.`] : [`Look for a times fact with ${k} that makes ${c}.`, `${under} × ${k} = ${under * k} is too small. ${under + 1} × ${k} = ${(under + 1) * k} is too big.`, `No fact lands on ${c}, so no.`], c - under * k === 0 ? 'Yes' : 'No'),
      ],
      operands: [k, c],
    }
  },

  /* Prime or composite. */
  'md.primes': (rng, d) => {
    const r = R(rng)
    const [lo, hi] = d === 1 ? [2, 20] : d === 2 ? [11, 50] : [31, 100]
    const all = times(hi - lo + 1, (i) => lo + i)
    const primes = all.filter(isPrime)
    const comps = all.filter((x) => !isPrime(x))
    // odd composites that do not end in 5 are the ones that fool people
    const sneaky = comps.filter((x) => x % 2 === 1 && x % 5 !== 0)
    const pickComp = () => (sneaky.length && r.chance(d === 1 ? 0.35 : 0.6) ? r.pick(sneaky) : r.pick(comps))
    const rect = (n: number) => {
      const p = factorsOf(n).find((f) => f > 1 && f < n)
      return p ? ([p, n / p] as const) : null
    }
    const label = (n: number) => (factorsOf(n).length === 2 ? 'Prime' : 'Composite')
    if (r.chance(0.6)) {
      const N = r.chance(0.5) ? r.pick(primes) : pickComp()
      const p = smallestDivisor(N)
      const tests = [2, 3, 5, 7].filter((t) => t * t <= N)
      const rc = rect(N)
      return {
        prompt: `Is ${N} prime or composite?`,
        ...choice(isPrime(N) ? 'Prime' : 'Composite', ['Prime', 'Composite'], rng, true),
        strategies: [
          strat(
            'Try to Divide',
            p === N
              ? [`A prime number has just 2 factors: 1 and itself.`, tests.length ? `Try dividing ${N} by ${tests.join(', ').replace(/, (\d+)$/, ' and $1')}. There are leftovers every time.` : `No number between 1 and ${N} divides it evenly.`, `So ${N} is prime.`]
              : [`A prime number has just 2 factors: 1 and itself.`, `Try small numbers. ${N} ÷ ${p} = ${N / p}`, `${p} is a factor too. So ${N} is composite.`],
            p === N ? 'Prime' : 'Composite',
          ),
          strat(
            'Rectangle Test',
            rc ? [`Can ${N} dots make a rectangle with more than 1 row?`, `Yes! ${rc[0]} rows of ${rc[1]} works.`, `So ${N} is composite.`] : [`Can ${N} dots make a rectangle with more than 1 row?`, `No. ${N} dots only fit in 1 long row.`, `Its only factors are 1 and ${N}. So ${N} is prime.`],
            label(N),
            rc && N <= 60 ? { html: arrayHTML(rc[0], rc[1]) } : {},
          ),
        ],
        operands: [N],
        difficulty: d,
      }
    }
    const wantPrime = d < 3 || r.chance(0.7)
    const odd = (xs: number[]) => (xs.filter((x) => x % 2 === 1).length >= 3 ? xs.filter((x) => x % 2 === 1) : xs)
    const target = wantPrime ? r.pick(primes) : pickComp()
    const rest = wantPrime ? r.shuffle([...new Set([...r.shuffle(sneaky).slice(0, 2), ...r.shuffle(comps).slice(0, 3)])]).slice(0, 3) : r.shuffle(odd(primes)).slice(0, 3)
    const opts = [target, ...rest].sort((x, y) => x - y)
    const fits = (n: number) => (smallestDivisor(n) === n) === wantPrime
    const byCount = (n: number) => (factorsOf(n).length === 2) === wantPrime
    return {
      prompt: wantPrime ? `Which of these numbers is prime?` + ` ${opts.join(', ')}` : `Which of these numbers is composite? ${opts.join(', ')}`,
      ...choice(String(target), rest.map(String), rng),
      strategies: [
        strat(
          wantPrime ? 'Cross Out' : 'Hunt for a Factor',
          wantPrime
            ? [...opts.filter((c) => !isPrime(c)).map((c) => `${smallestDivisor(c)} × ${c / smallestDivisor(c)} = ${c}. Cross out ${c}.`), `${opts.find(fits)} is left. Only 1 and itself divide it. It is prime.`]
            : [`A composite number has a factor besides 1 and itself.`, `${smallestDivisor(opts.find(fits)!)} × ${opts.find(fits)! / smallestDivisor(opts.find(fits)!)} = ${opts.find(fits)}`, `The other numbers have no factor like that. So ${opts.find(fits)} is composite.`],
          String(opts.find(fits)),
        ),
        strat('Count the Factors', [...opts.map((c) => `${c} has ${factorsOf(c).length} factors: ${factorsOf(c).join(', ')}`), wantPrime ? `Prime means just 2 factors. That is ${opts.find(byCount)}.` : `Composite means more than 2 factors. That is ${opts.find(byCount)}.`], String(opts.find(byCount))),
      ],
      operands: opts,
      difficulty: d,
    }
  },

  /* Multi-digit multiplying (grade 5). */
  'md.multi-digit': (rng, d) => {
    const r = R(rng)
    const a = d === 1 ? r.int(101, 399) : d === 2 ? r.int(201, 999) : r.int(1001, 5999)
    const b = (d === 1 ? r.int(1, 2) : r.int(2, 9)) * 10 + r.int(1, 9)
    const ans = a * b
    const tens = (b - (b % 10)) / 10
    const strategies: Strat[] = [stackStrat(a, b), areaStrat(a, b), breakBigStrat(a, b)]
    const rf = roundFix(a, b)
    if (rf) strategies.push(rf)
    const story = r.chance(0.25)
    const stories = [
      `A ballpark sells ${fmtN(a)} tickets for each game. There are ${b} games. How many tickets in all?`,
      `Each box holds ${fmtN(a)} bricks. There are ${b} boxes. How many bricks in all?`,
      `A surf shop sells ${fmtN(a)} boards each month. How many boards in ${b} months?`,
    ]
    return {
      prompt: story ? r.pick(stories) : `What is ${fmtN(a)} times ${b}?`,
      ...(story ? {} : { eq: `${fmtN(a)} × ${b} = ${Q}`, eqOnly: true }),
      input: 'number',
      answer: ans,
      strategies,
      // forgot the zero in the tens row, did only the tens row, only the ones row, a place slip
      distractors: wrongs(ans, [a * (b % 10) + a * tens, a * tens * 10, a * (b % 10), ans + 1000, ans - 100, a + b]),
      operands: [a, b],
      difficulty: d,
    }
  },

  /* Divide by 2-digit numbers (grade 5). */
  'md.divide-by-2-digit': (rng, d) => {
    const r = R(rng)
    let k: number, N: number
    if (d === 1) {
      k = r.pick([10, 11, 12, 15, 20, 25, 30, 40, 50] as const)
      N = r.int(Math.ceil(100 / k), Math.min(30, Math.floor(999 / k))) * k
    } else {
      const lo = d === 2 ? 100 : 1000
      const hi = d === 2 ? 999 : 9999
      k = d === 2 ? r.int(11, 49) : r.int(12, 99)
      N = r.int(Math.max(d === 2 ? 2 : 10, Math.ceil(lo / k)), Math.floor(hi / k)) * k
      if (r.chance(0.4) && N + k - 1 <= hi) N += r.int(1, k - 1)
    }
    const q = Math.floor(N / k)
    return divisionItem(r, N, k, d, (ask) => [chunkStrat(N, k, ask), longDivStrat(N, k, ask), q <= 9 ? countUpStrat(N, k, ask) : breakDivStrat(N, k, ask)], 0.2)
  },

  /* Powers. */
  'md.exponents': (rng, d) => {
    const r = R(rng)
    const pool: (readonly [number, number])[] =
      d === 1
        ? [...times(9, (i) => [i + 2, 2] as const), [10, 3], [2, 3], [3, 3]]
        : d === 2
          ? [...[2, 3, 4, 5].flatMap((b) => [[b, 3] as const, [b, 4] as const]), [2, 5], [10, 4], [10, 5], [11, 2], [12, 2], [6, 3]]
          : [...[6, 7, 8, 9, 10].map((e) => [2, e] as const), [3, 4], [3, 5], [4, 4], [4, 5], [5, 4], [6, 3], [7, 3], [8, 3], [9, 3], [10, 6]]
    const [b, e] = r.pick(pool)
    const ans = pw(b, e)
    const chain = times(e, (i) => pw(b, i + 1))
    const spelled = times(e, () => b).join(' × ')
    const sup = `${b}<sup>${e}</sup>`
    if (d > 1 && e <= 6 && r.chance(0.25)) {
      let downs = 0
      for (let x = ans; x > 1; x /= b) downs++
      return {
        prompt: `${spelled} is ${b} to what power? Count how many ${b}s are multiplied.`,
        eq: `${spelled} = ${b}<sup>${Q}</sup>`,
        input: 'number',
        answer: e,
        strategies: [
          strat('Count the Factors', [`The little number tells how many ${b}s are multiplied.`, `Count the ${b}s in ${spelled}.`, `There are ${spelled.split(' × ').length}. So the power is ${spelled.split(' × ').length}.`], spelled.split(' × ').length),
          strat('Divide Back Down', [`All together, the ${b}s make ${fmtN(ans)}.`, `Keep dividing by ${b} until you get to 1: ${[...chain].reverse().map(fmtN).join(', ')}, 1`, `That took ${downs} divides. So the power is ${downs}.`], downs),
        ],
        // gave the base, counted the × signs, one too many
        distractors: wrongs(e, [b, e - 1, e + 1, ...(ans < 100 ? [ans] : [])]),
        operands: [b, e],
        difficulty: d,
      }
    }
    const stepwise =
      e <= 4
        ? strat('One Step at a Time', [`It means ${WORD[e]} ${b}s multiplied: ${spelled}`, ...times(e - 1, (i) => `${fmtN(chain[i])} × ${b} = ${fmtN(chain[i] * b)}`)], chain[e - 2] * b)
        : strat('One Step at a Time', [`It means ${WORD[e]} ${b}s multiplied together.`, `Start at ${b}. Keep multiplying by ${b} until you have used ${e} of them:`, chain.map(fmtN).join(', '), `The last number is ${fmtN(chain[chain.length - 1])}.`], chain[chain.length - 1])
    const h = Math.floor(e / 2)
    const other =
      b === 10
        ? strat('Count the Zeros', [`Each time you multiply by 10, you add one zero.`, `${WORD[e]} 10s multiplied makes a 1 with ${e} zeros.`, `That is ${fmtN(Number('1' + '0'.repeat(e)))}.`], Number('1' + '0'.repeat(e)))
        : e === 2
          ? strat('Make a Square', [`${b} squared is a square with ${b} rows of ${b}.`, `Count by ${b}s, ${b} times: ${skipList(b, b)}`, `The square has ${sum(times(b, () => b))} dots.`], sum(times(b, () => b)), { html: arrayHTML(b, b) })
          : e === 3
            ? strat('Stack the Layers', [`Think of a cube of blocks. One flat layer is ${b} × ${b} = ${b * b}`, `Stack ${b} layers of ${b * b}.`, `Count by ${b * b}s, ${b} times: ${skipList(b * b, b)}`], sum(times(b, () => b * b)))
            : strat('Split It in Two', [`Split the ${WORD[e]} ${b}s into a group of ${h} and a group of ${e - h}.`, `${times(h, () => b).join(' × ')} = ${fmtN(pw(b, h))}`, `${times(e - h, () => b).join(' × ')} = ${fmtN(pw(b, e - h))}`, `Now multiply the two: ${fmtN(pw(b, h))} × ${fmtN(pw(b, e - h))} = ${fmtN(pw(b, h) * pw(b, e - h))}`], pw(b, h) * pw(b, e - h))
    return {
      prompt: e === 2 ? `What is ${b} squared? That means ${b} times ${b}.` : `What is ${b} to the power of ${e}? That means ${WORD[e]} ${b}s multiplied together.`,
      eq: `${sup} = ${Q}`,
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies: [stepwise, other],
      // multiplied the two numbers, added them, one factor short, one too many
      distractors: wrongs(ans, [b * e, b + e, pw(b, e - 1), pw(b, e + 1)]),
      operands: [b, e],
      difficulty: d,
    }
  },

  /* Greatest common factor. */
  'md.gcf': (rng, d) => {
    const r = R(rng)
    const cap = d === 1 ? 20 : d === 2 ? 60 : 100
    let a = 8
    let b = 12
    for (let tries = 0; tries < 60; tries++) {
      const g = d === 1 ? r.int(2, 5) : d === 2 ? r.int(2, 9) : r.chance(0.1) ? 1 : r.int(2, 12)
      const x = r.int(d === 3 ? 2 : 1, d === 1 ? 4 : d === 2 ? 6 : 9)
      const y = r.int(2, d === 1 ? 5 : d === 2 ? 7 : 9)
      if (x !== y && gcd(x, y) === 1 && g * x <= cap && g * y <= cap && g * x >= 4 && g * y >= 4) {
        ;[a, b] = r.chance(0.5) ? [g * x, g * y] : [g * y, g * x]
        break
      }
    }
    const fa = factorsOf(a)
    const fb = factorsOf(b)
    const common = fa.filter((f) => fb.includes(f))
    const byLists = Math.max(...common)
    // ladder: keep dividing both by a prime they share
    let x = a
    let y = b
    let ladder = 1
    const ladderSteps: string[] = []
    const used: number[] = []
    for (const p of [2, 3, 5, 7, 11, 13, 17, 19, 23])
      while (x % p === 0 && y % p === 0) {
        ladderSteps.push(`Both divide by ${p}: ${x} ÷ ${p} = ${x / p} and ${y} ÷ ${p} = ${y / p}`)
        x /= p
        y /= p
        ladder *= p
        used.push(p)
      }
    const ladderStrat =
      used.length === 0
        ? strat('Divide Both Down', [`Look for a number that divides both ${a} and ${b}.`, `Try 2, 3, 5 and 7. None of them divides both.`, `Only 1 divides both. So the answer is 1.`], ladder)
        : strat('Divide Both Down', [...ladderSteps, `${x} and ${y} share nothing but 1, so stop.`, used.length > 1 ? `Multiply what you divided by: ${used.join(' × ')} = ${ladder}` : `You divided by ${ladder} one time. So the answer is ${ladder}.`], ladder)
    const ans = gcd(a, b)
    const story = d > 1 && r.chance(0.3)
    const stories = [
      `{n} has ${a} baseballs and ${b} bats. {n} packs kits that are all the same and uses everything. What is the most kits {n} can make?`,
      `${a} red bricks and ${b} blue bricks go into piles. Every pile is the same. No bricks are left. What is the most piles?`,
    ]
    return {
      prompt: story ? r.pick(stories) : `What is the greatest common factor of ${a} and ${b}? It is the biggest number that divides both.`,
      input: 'number',
      answer: ans,
      strategies: [strat('List the Factors', [`Factors of ${a}: ${fa.join(', ')}`, `Factors of ${b}: ${fb.join(', ')}`, `In both lists: ${common.join(', ')}`, `The biggest one in both lists is ${byLists}.`], byLists), ladderStrat],
      // a common factor that is not the biggest, the difference, the smaller number, the LCM, 1
      distractors: wrongs(ans, [common.length > 2 ? common[1] : ans * 2, Math.abs(a - b), Math.min(a, b), lcm(a, b), 1, ...(common.length > 3 ? [common[common.length - 2]] : [])]),
      operands: [a, b],
      difficulty: d,
    }
  },

  /* Least common multiple. */
  'md.lcm': (rng, d) => {
    const r = R(rng)
    const [lo, hi] = d === 1 ? [2, 6] : d === 2 ? [2, 10] : [4, 15]
    let a = 4
    let b = 6
    for (let tries = 0; tries < 60; tries++) {
      const x = r.int(lo, hi)
      const y = r.int(lo, hi)
      const m = lcm(x, y)
      if (x !== y && m <= 120 && m / Math.min(x, y) <= 12 && (d < 3 || m > 12)) {
        ;[a, b] = [x, y]
        break
      }
    }
    const small = Math.min(a, b)
    const big = Math.max(a, b)
    const ans = lcm(a, b)
    // list both until a number shows up in both lists
    const la: number[] = []
    const lb: number[] = []
    let both = 0
    while (!both) {
      if ((la[la.length - 1] ?? 0) <= (lb[lb.length - 1] ?? 0)) la.push((la.length + 1) * a)
      else lb.push((lb.length + 1) * b)
      both = la.find((v) => lb.includes(v)) ?? 0
    }
    // count by the bigger number and test each one
    const tried: number[] = []
    let hit = 0
    while (!hit) {
      const v = (tried.length + 1) * big
      tried.push(v)
      let t = 0
      while (t < v) t += small
      if (t === v) hit = v
    }
    const story = d > 1 && r.chance(0.3)
    const stories = [
      `A red light blinks every ${a} seconds. A blue light blinks every ${b} seconds. They blink together now. In how many seconds will they blink together again?`,
      `{n} claps every ${a} beats and stomps every ${b} beats. On which beat does {n} first clap and stomp together?`,
    ]
    return {
      prompt: story ? r.pick(stories) : `What is the least common multiple of ${a} and ${b}? It is the first number you say counting by ${a}s and by ${b}s.`,
      input: 'number',
      answer: ans,
      strategies: [
        strat('List Both', [`Multiples of ${a}: ${la.join(', ')}`, `Multiples of ${b}: ${lb.join(', ')}`, `The first number in both lists is ${both}.`], both),
        strat('Count by the Bigger One', [`Count by ${big}s. Each time ask: can I get here counting by ${small}s?`, tried.map((v) => `${v}: ${v === hit ? 'yes!' : 'no'}`).join('  '), `The first yes is ${hit}.`], hit),
      ],
      // just multiplied them, gave the GCF, added, gave the bigger number, went one too far
      distractors: wrongs(ans, [a * b, ...(gcd(a, b) > 1 ? [gcd(a, b)] : []), a + b, big, ans * 2, ans + small]),
      operands: [a, b],
      difficulty: d,
    }
  },
}

export const teach: Record<string, string> = {
  'md.arrays': 'An array is things lined up in rows and columns. Every row has the same number, so you can add the rows or skip count to find the total.',
  'md.times-3-4': 'Times 3 is double plus one more group. Times 4 is double, then double again. You can skip count too.',
  'md.times-6-9': 'Big facts are made of small facts. Break 6, 7, 8 or 9 into 5 and a little more, or use ten and take a group away.',
  'md.squares': 'A square number is a number times itself, like 4 times 4. The dots make a perfect square with the same rows and columns.',
  'md.div-facts': 'Dividing asks how many groups fit. Think of the times fact: 56 divided by 7 asks, what times 7 makes 56?',
  'md.times-tens': 'To multiply by tens, do the small fact first. Then make it tens. 3 times 4 tens is 12 tens, and 12 tens is 120.',
  'md.distributive': 'You can break a hard fact into two easy ones. Split one number, multiply each part, then add the parts back together.',
  'md.word-mult': 'Equal groups stories use multiplying to find the total. If you know the total, divide to find the groups or how many in each group.',
  'md.compare-times': '3 times as many means 3 copies of the small amount. Multiply to find the big amount. Divide to find the small one.',
  'md.remainders': 'Sometimes things do not split evenly. Make as many full groups as you can. What does not fit in a group is the leftover.',
  'md.three-by-one': 'Break the big number into hundreds, tens and ones. Multiply each part, then add the parts together.',
  'md.two-by-two': 'Break both numbers into tens and ones. Multiply every part by every part, like filling the boxes of a rectangle. Then add.',
  'md.divide-2-digit': 'To divide a big number, take out big chunks of groups, like 10 groups at a time. Then count all the groups you took.',
  'md.long-division': 'Long division goes one place at a time, from the left. See how many fit, multiply, subtract, then bring down the next digit.',
  'md.factors': 'Factors are the numbers that multiply to make a number. They come in pairs, like 3 and 8 for 24, and they divide it with no leftovers.',
  'md.multiples': 'Multiples are the numbers you say when you skip count. The multiples of 6 are 6, 12, 18, 24, and they keep going.',
  'md.primes': 'A prime number has just two factors: 1 and itself. A composite number has more. The number 1 is not prime and not composite.',
  'md.multi-digit': 'For big multiplying, make one row for each digit of the bottom number. Remember the tens row is really tens. Then add the rows.',
  'md.divide-by-2-digit': 'Dividing by a 2-digit number works the same way. Take out big chunks of groups, like 10 or 20 at a time, and keep track.',
  'md.exponents': 'A power is a short way to write the same number multiplied again and again. 2 to the power of 3 means 2 times 2 times 2.',
  'md.gcf': 'The greatest common factor is the biggest number that divides both numbers with no leftovers. List the factors and find the biggest match.',
  'md.lcm': 'The least common multiple is the first number that shows up when you skip count by both numbers. List the multiples and find the first match.',
}

const num = (it: Item) => it.input === 'number' && typeof it.answer === 'number'
const between = (x: number, lo: number, hi: number) => Number.isInteger(x) && x >= lo && x <= hi
const divOK = (it: Item, kLo: number, kHi: number, nLo: number, nHi: number, qLo: number) => {
  const [N, k] = it.operands
  return num(it) && between(k, kLo, kHi) && between(N, nLo, nHi) && Math.floor(N / k) >= qLo && (it.answer === Math.floor(N / k) || it.answer === N % k)
}

export const limits: Record<string, (it: Item) => boolean> = {
  'md.arrays': (it) => num(it) && between(it.operands[0], 2, 5) && between(it.operands[1], 2, 9) && it.answer === it.operands[0] * it.operands[1],
  'md.times-3-4': (it) => num(it) && (it.operands[0] === 3 || it.operands[0] === 4) && between(it.operands[1], 2, 12) && it.answer === it.operands[0] * it.operands[1],
  'md.times-6-9': (it) => num(it) && between(it.operands[0], 6, 9) && between(it.operands[1], 2, 12) && it.answer === it.operands[0] * it.operands[1],
  'md.squares': (it) => num(it) && between(it.operands[0], 2, 12) && (it.answer === it.operands[0] ** 2 || it.answer === it.operands[0]),
  'md.div-facts': (it) => num(it) && between(it.operands[1], 2, 10) && between(+it.answer, 2, 12) && it.operands[0] === it.operands[1] * +it.answer,
  'md.times-tens': (it) => {
    const [a, b] = it.operands
    const tensOrHundreds = (x: number) => (x % 10 === 0 && between(x / 10, 2, 9)) || (x % 100 === 0 && between(x / 100, 2, 9))
    return num(it) && (between(a, 2, 9) || tensOrHundreds(a)) && tensOrHundreds(b) && it.answer === a * b && a * b <= 8100
  },
  'md.distributive': (it) => {
    const [a, b] = it.operands
    return num(it) && between(a, 2, 9) && between(b, 6, 49) && (it.answer === a * b || between(+it.answer, 1, 9))
  },
  'md.word-mult': (it) => {
    const [x, y] = it.operands
    return num(it) && between(+it.answer, 2, 144) && (it.answer === x * y ? between(x, 2, 9) && between(y, 2, 12) : between(y, 2, 12) && x === y * +it.answer && x <= 108)
  },
  'md.compare-times': (it) => {
    const [x, y] = it.operands
    return num(it) && between(+it.answer, 2, 108) && (it.answer === x * y ? between(x, 2, 12) && between(y, 2, 9) : x === y * +it.answer && x <= 108)
  },
  'md.remainders': (it) => {
    const [N, k] = it.operands
    return num(it) && between(k, 2, 9) && between(N, 3, 116) && between(Math.floor(N / k), 1, 12) && (it.answer === Math.floor(N / k) || it.answer === N % k)
  },
  'md.three-by-one': (it) => num(it) && between(it.operands[0], 100, 999) && between(it.operands[1], 2, 9) && it.answer === it.operands[0] * it.operands[1],
  'md.two-by-two': (it) => num(it) && between(it.operands[0], 11, 99) && between(it.operands[1], 11, 99) && it.answer === it.operands[0] * it.operands[1],
  'md.divide-2-digit': (it) => divOK(it, 2, 9, 20, 999, 10) && Math.floor(it.operands[0] / it.operands[1]) <= 99,
  'md.long-division': (it) => divOK(it, 2, 9, 100, 9999, 20),
  'md.factors': (it) => between(it.operands[0], 6, 100) && (it.input === 'choice' || (num(it) && between(+it.answer, 2, 50))),
  'md.multiples': (it) => between(it.operands[0], 2, 12) && between(it.operands[1], 2, 160) && (it.input === 'choice' || (num(it) && +it.answer % it.operands[0] === 0 && +it.answer <= 144)),
  'md.primes': (it) => it.input === 'choice' && it.operands.every((x) => between(x, 2, 100)) && (it.choices!.length === 2 ? it.answer === (isPrime(it.operands[0]) ? 'Prime' : 'Composite') : it.operands.length === 4),
  'md.multi-digit': (it) => num(it) && between(it.operands[0], 101, 5999) && between(it.operands[1], 11, 99) && it.answer === it.operands[0] * it.operands[1],
  'md.divide-by-2-digit': (it) => divOK(it, 10, 99, 100, 9999, 2),
  'md.exponents': (it) => {
    const [b, e] = it.operands
    return num(it) && between(b, 2, 12) && between(e, 2, 10) && (it.answer === b ** e || it.answer === e) && b ** e <= 1_000_000
  },
  'md.gcf': (it) => num(it) && it.operands.every((x) => between(x, 4, 100)) && it.operands[0] !== it.operands[1] && it.answer === gcd(it.operands[0], it.operands[1]),
  'md.lcm': (it) => num(it) && it.operands.every((x) => between(x, 2, 15)) && it.operands[0] !== it.operands[1] && it.answer === lcm(it.operands[0], it.operands[1]) && +it.answer <= 120,
}
