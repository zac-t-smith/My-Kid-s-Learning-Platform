import type { Problem, Strategy } from './types'
import { calc, dig, expand, fmtN, pieces, placesOf, PLN, skipList, sym } from './util'
import { plainLhs } from './format'
import { areaHTML, arrayHTML, barHTML, groupsHTML } from './visuals'

const sum = (xs: number[]) => xs.reduce((x, y) => x + y, 0)

function placeValue(p: Problem): Strategy {
  const { a, b, op, ans } = p
  const places = placesOf(Math.max(a, b))
  const nm = a < 100 && b < 100 ? 'Tens & Ones' : 'Place Value'
  if (op === '+') {
    const st = [`Break them apart: ${expand(a)} and ${expand(b)}`]
    const ps: number[] = []
    for (const pl of places) {
      const x = dig(a, pl) * pl,
        y = dig(b, pl) * pl
      if (!x && !y) continue
      st.push(`${PLN[pl]}: ${fmtN(x)} + ${fmtN(y)} = ${fmtN(x + y)}`)
      ps.push(x + y)
    }
    if ((a % 10) + (b % 10) >= 10 && a < 100 && b < 100)
      st.push(`${(a % 10) + (b % 10)} ones is 1 ten and ${(a % 10) + (b % 10) - 10} ones. Bundle it!`)
    st.push(`Put it together: ${ps.map(fmtN).join(' + ')} = ${fmtN(ans)}`)
    return { name: nm, steps: st, result: sum(ps) }
  }
  const borrow = places.some((pl) => dig(a, pl) < dig(b, pl))
  if (!borrow) {
    const st = [`Break them apart: ${expand(a)} and ${expand(b)}`]
    let res = 0
    for (const pl of places) {
      st.push(`${PLN[pl]}: ${dig(a, pl)} − ${dig(b, pl)} = ${dig(a, pl) - dig(b, pl)}`)
      res += (dig(a, pl) - dig(b, pl)) * pl
    }
    st.push(`So the answer is ${fmtN(ans)}`)
    return { name: nm, steps: st, result: res }
  }
  if (a < 100) {
    const A = a % 10,
      B = b % 10
    const top = a - A - 10,
      low = 10 + A,
      bt = b - B
    const st: string[] = []
    st.push(`Ones: ${A} − ${B}? Not enough ones!`)
    st.push(`Break a ten: ${a} = ${top} + ${low}`)
    st.push(`${low} − ${B} = ${low - B}`)
    if (bt) st.push(`${top} − ${bt} = ${top - bt}`)
    st.push(`${top - bt} + ${low - B} = ${ans}`)
    return { name: 'Break a Ten', steps: st, result: top - bt + (low - B) }
  }
  const st = [`Take away ${fmtN(b)} one piece at a time: ${expand(b)}`]
  let cur = a
  for (const y of pieces(b)) {
    st.push(`${fmtN(cur)} − ${fmtN(y)} = ${fmtN(cur - y)}`)
    cur -= y
  }
  st.push(`The answer is ${fmtN(ans)}`)
  return { name: 'Take Away in Parts', steps: st, result: cur }
}

function hopStrat(p: Problem): Strategy {
  const { a, b, op } = p
  const s = op === '+' ? 1 : -1
  let cur = a
  const pts = [a]
  const lines: string[] = []
  const bigPart = b - (b % 10)
  if (bigPart) {
    if (bigPart <= 40) {
      for (let i = 0; i < bigPart / 10; i++) {
        cur += s * 10
        pts.push(cur)
      }
      lines.push(`Hop ${bigPart / 10} ten${bigPart > 10 ? 's' : ''}: ${fmtN(a)} → ${fmtN(cur)}`)
    } else {
      cur += s * bigPart
      pts.push(cur)
      lines.push(`Big jump of ${fmtN(bigPart)}: ${fmtN(a)} → ${fmtN(cur)}`)
    }
  }
  const o = b % 10
  if (o) {
    const r = cur % 10
    if (op === '-' && r > 0 && o > r) {
      const c1 = cur - r
      pts.push(c1)
      lines.push(`Hop down ${r} to a friendly ten: ${fmtN(c1)}`)
      const c2 = c1 - (o - r)
      pts.push(c2)
      lines.push(`Hop ${o - r} more: ${fmtN(c2)}`)
      cur = c2
    } else if (op === '+' && r > 0 && r + o > 10) {
      const need = 10 - r
      const c1 = cur + need
      pts.push(c1)
      lines.push(`Hop up ${need} to a friendly ten: ${fmtN(c1)}`)
      const c2 = c1 + (o - need)
      pts.push(c2)
      lines.push(`Hop ${o - need} more: ${fmtN(c2)}`)
      cur = c2
    } else {
      cur += s * o
      pts.push(cur)
      lines.push(`Hop ${o}: ${fmtN(cur)}`)
    }
  }
  lines.push(`You land on ${fmtN(cur)}!`)
  return { name: 'Number Line', steps: [`Start at ${fmtN(a)}`, ...lines], line: pts, result: cur }
}

function roundFix(p: Problem): Strategy | null {
  const { a, b, op, ans } = p
  if (b % 10 < 7) return null
  const r = b + (10 - (b % 10)),
    d = r - b
  const mid = op === '+' ? a + r : a - r
  if (mid < 0) return null
  return {
    name: 'Round & Fix',
    steps: [
      `${fmtN(b)} is close to ${fmtN(r)}. Use ${fmtN(r)} instead!`,
      `${fmtN(a)} ${sym(op)} ${fmtN(r)} = ${fmtN(mid)}`,
      op === '+'
        ? `We added ${d} too many. Take ${d} back: ${fmtN(mid)} − ${d} = ${fmtN(ans)}`
        : `We took away ${d} too many. Give ${d} back: ${fmtN(mid)} + ${d} = ${fmtN(ans)}`,
    ],
    line: [a, mid, ans],
    result: op === '+' ? mid - d : mid + d,
  }
}

function countUpHops(start: number, end: number) {
  const pts = [start],
    jumps: number[] = [],
    lines: string[] = []
  let cur = start
  const add = (j: number) => {
    cur += j
    pts.push(cur)
    jumps.push(j)
    lines.push(`Jump ${fmtN(j)} → ${fmtN(cur)}`)
  }
  if (cur % 10) {
    const j = 10 - (cur % 10)
    if (cur + j <= end) add(j)
  }
  const t = Math.floor((end - cur) / 10) * 10
  if (t > 0) add(t)
  if (end - cur > 0) add(end - cur)
  return { pts, jumps, lines }
}

function multStrats(p: Problem): Strategy[] {
  const { a, b, ans } = p
  const out: Strategy[] = []
  if (a <= 10 && b <= 10) {
    out.push({
      name: 'Skip Count',
      steps: [`Count by ${b}s, ${a} times:`, skipList(b, a), `So ${a} × ${b} = ${ans}`],
      html: a * b <= 36 && b <= 8 ? groupsHTML(a, b) : arrayHTML(a, b),
      result: sum(Array.from({ length: a }, () => b)),
    })
    const big = Math.max(a, b),
      small = Math.min(a, b)
    if (big > 5 && small > 1 && big !== 10) {
      const k = big - 5
      out.push({
        name: 'Fact You Know',
        steps: [`Break ${big} into 5 + ${k}`, `${small} × 5 = ${small * 5}`, `${small} × ${k} = ${small * k}`, `${small * 5} + ${small * k} = ${ans}`],
        html: arrayHTML(small, big, 5),
        result: small * 5 + small * k,
      })
    }
    if (a === 2 || b === 2) out.push({ name: 'Double It', steps: [`Times 2 means double`, `${big} + ${big} = ${ans}`], result: big + big })
    if (a === 10 || b === 10) out.push({ name: 'Add a Zero', steps: [`${small} tens is ${small}0`, `${a} × ${b} = ${ans}`], result: Number(`${small}0`) })
    if (a !== b)
      out.push({
        name: 'Flip It',
        steps: [`${a} × ${b} is the same as ${b} × ${a}`, `Count by ${a}s instead: ${skipList(a, b)}`, `Both ways it's ${ans}`],
        result: sum(Array.from({ length: b }, () => a)),
      })
    return out
  }
  const A = pieces(a),
    B = b >= 10 ? pieces(b) : [b]
  const prods: [number, number, number][] = []
  for (const y of B) for (const x of A) prods.push([x, y, x * y])
  out.push({
    name: 'Break Apart',
    steps: [
      `Break ${fmtN(a)} into ${expand(a)}` + (b >= 10 ? ` and ${fmtN(b)} into ${expand(b)}` : ''),
      ...prods.map(([x, y, z]) => `${fmtN(x)} × ${fmtN(y)} = ${fmtN(z)}`),
      `Add them up: ${prods.map((z) => fmtN(z[2])).join(' + ')} = ${fmtN(ans)}`,
    ],
    html: areaHTML(A, B),
    result: sum(prods.map((z) => z[2])),
  })
  if (a % 10 >= 8 && b < 10) {
    const r = a + (10 - (a % 10)),
      d = r - a
    out.push({
      name: 'Round & Fix',
      steps: [`${a} is close to ${r}`, `${r} × ${b} = ${fmtN(r * b)}`, `That's ${d} extra group${d > 1 ? 's' : ''} of ${b}: ${d} × ${b} = ${d * b}`, `${fmtN(r * b)} − ${d * b} = ${fmtN(ans)}`],
      result: r * b - d * b,
    })
  }
  return out
}

function divStrats(p: Problem): Strategy[] {
  const { a, b, ans } = p
  const out: Strategy[] = []
  if (ans <= 12) {
    let jumps = 0
    for (let v = b; v <= a; v += b) jumps++
    out.push({
      name: 'Think Multiply',
      steps: [`${a} ÷ ${b} means ? × ${b} = ${a}`, `Count by ${b}s: ${skipList(b, ans)}`, `That's ${ans} jumps. So ${a} ÷ ${b} = ${ans}`],
      result: jumps,
    })
  } else {
    const st = [`How many ${b}s fit in ${fmtN(a)}? Take big chunks!`]
    let rem = a
    const ch: number[] = []
    while (rem > 0) {
      const t = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].find((t) => t * b <= rem)!
      ch.push(t)
      rem -= t * b
      st.push(`${b} × ${t} = ${fmtN(t * b)} → ${fmtN(rem)} left`)
    }
    st.push(`Add the chunks: ${ch.join(' + ')} = ${fmtN(ans)}`)
    out.push({ name: 'Big Chunks', steps: st, result: sum(ch) })
  }
  if (a <= 40) out.push({ name: 'Share It', steps: [`Share ${a} into ${b} equal groups`, `Each group gets ${ans}`], html: groupsHTML(b, ans), result: a / b })
  out.push({ name: 'Check It', steps: [`Multiply back to check:`, `${fmtN(ans)} × ${b} = ${fmtN(a)} ✓`], result: ans * b === a ? ans : NaN })
  return out
}

function twoStrats(p: Problem): Strategy[] {
  const { a, b, ans } = p
  const c = p.c!,
    op = p.op,
    op2 = p.op2!
  const m = calc(a, op, b)
  const out: Strategy[] = [
    { name: 'One Step at a Time', steps: [`Step 1: ${a} ${sym(op)} ${b} = ${m}`, `Step 2: ${m} ${sym(op2)} ${c} = ${ans}`], line: [a, m, ans], result: calc(m, op2, c) },
  ]
  const net = (op === '+' ? b : -b) + (op2 === '+' ? c : -c)
  if (op !== op2 && net !== 0) {
    const sg = net > 0 ? '+' : '−',
      n = Math.abs(net)
    out.push({
      name: 'Combine First',
      steps: [
        `${op === '+' ? 'Add' : 'Take away'} ${b}, then ${op2 === '+' ? 'add' : 'take away'} ${c}`,
        `Put the changes together: that's ${sg === '+' ? 'adding' : 'taking away'} ${n}`,
        `${a} ${sg} ${n} = ${ans}`,
      ],
      result: a + net,
    })
  }
  return out
}

function fracStrats(p: Problem): Strategy[] {
  const { a, b, ans } = p
  const num = p.num!
  const q = b / a
  return [
    {
      name: 'Equal Parts',
      steps: [`Split ${b} into ${a} equal parts`, `${b} ÷ ${a} = ${q} in each part`, num > 1 ? `Take ${num} parts: ${num} × ${q} = ${ans}` : `One part is ${ans}`],
      html: barHTML(a, q, num),
      result: num * q,
    },
    {
      name: 'Think Multiply',
      steps: [`? × ${a} = ${b}`, `Count by ${a}s: ${skipList(a, q)}`, `That's ${q} in each part`, num > 1 ? `${num} parts: ${num} × ${q} = ${ans}` : `So ${num}/${a} of ${b} is ${ans}`],
      result: num * q,
    },
  ]
}

function missingStrats(p: Problem): Strategy[] {
  const { a, b, op, ans } = p
  const miss = p.miss!
  const t = p[miss]
  const out: Strategy[] = []
  let inv: string, res: number
  if (op === '+') {
    const k = miss === 'a' ? b : a
    inv = `${fmtN(ans)} − ${fmtN(k)} = ${fmtN(t)}`
    res = ans - k
  } else if (op === '-') {
    inv = miss === 'b' ? `${fmtN(a)} − ${fmtN(ans)} = ${fmtN(t)}` : `${fmtN(ans)} + ${fmtN(b)} = ${fmtN(t)}`
    res = miss === 'b' ? a - ans : ans + b
  } else if (op === '×') {
    const k = miss === 'a' ? b : a
    inv = `${fmtN(ans)} ÷ ${fmtN(k)} = ${fmtN(t)}`
    res = ans / k
  } else {
    inv = miss === 'b' ? `${fmtN(a)} ÷ ${fmtN(ans)} = ${fmtN(t)}` : `${fmtN(ans)} × ${fmtN(b)} = ${fmtN(t)}`
    res = miss === 'b' ? a / ans : ans * b
  }
  out.push({ name: 'Flip It', steps: [`${plainLhs(p, miss)} = ${fmtN(ans)}`, `Use the opposite:`, inv, `The mystery number is ${fmtN(t)}`], result: res })
  if (op === '+' || (op === '-' && miss === 'b')) {
    const start = op === '+' ? (miss === 'a' ? b : a) : ans,
      end = op === '+' ? ans : a
    const cu = countUpHops(start, end)
    out.push({
      name: 'Count Up',
      steps: [`Start at ${fmtN(start)}. How far to ${fmtN(end)}?`, ...cu.lines, `Total: ${cu.jumps.map(fmtN).join(' + ')} = ${fmtN(end - start)}`],
      line: cu.pts,
      result: sum(cu.jumps),
    })
  }
  if (op === '×' && t <= 12) {
    const k = miss === 'a' ? b : a
    let jumps = 0
    for (let v = k; v <= ans; v += k) jumps++
    out.push({ name: 'Skip Count', steps: [`Count by ${k}s until you reach ${ans}:`, skipList(k, t), `That's ${t} jumps!`], result: jumps })
  }
  if (op === '÷' && miss === 'b' && t <= 12) {
    let jumps = 0
    for (let v = ans; v <= a; v += ans) jumps++
    out.push({ name: 'Think Multiply', steps: [`${a} ÷ ? = ${ans} means ${ans} × ? = ${a}`, `Count by ${ans}s: ${skipList(ans, t)}`, `That's ${t} jumps!`], result: jumps })
  }
  return out
}

/** Every way we know to solve this problem. Each one must land on `p.target`. */
export function strategies(p: Problem): Strategy[] {
  if (p.fmt === 'missing') return missingStrats(p)
  if (p.kind === 'two') return twoStrats(p)
  if (p.kind === 'frac') return fracStrats(p)
  if (p.op === '×') return multStrats(p)
  if (p.op === '÷') return divStrats(p)
  const { a, b, op, ans } = p
  const out = [placeValue(p), hopStrat(p)]
  const rf = roundFix(p)
  if (rf) out.push(rf)
  if (op === '+' && a % 10 && (a % 10) + (b % 10) >= 10) {
    const need = 10 - (a % 10)
    out.push({
      name: 'Make a Ten',
      steps: [`${fmtN(a)} needs ${need} more to make ${fmtN(a + need)}`, `Take ${need} from ${fmtN(b)}. That leaves ${fmtN(b - need)}`, `${fmtN(a + need)} + ${fmtN(b - need)} = ${fmtN(ans)}`],
      result: a + need + (b - need),
    })
  }
  if (op === '-' && b >= 10) {
    const cu = countUpHops(b, a)
    out.push({
      name: 'Count Up',
      steps: [`Start at ${fmtN(b)} and count up to ${fmtN(a)}`, ...cu.lines, `Add the jumps: ${cu.jumps.map(fmtN).join(' + ')} = ${fmtN(ans)}`],
      line: cu.pts,
      result: sum(cu.jumps),
    })
  }
  return out
}

/** Turn a step into something the voice can read. */
export function speakable(t: string): string {
  const FR: Record<string, [string, string]> = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 10: ['tenth', 'tenths'] }
  const NW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
  return t
    .replace(/(\d+)\/(\d+)/g, (m, n, d) => (FR[d] && NW[n] ? `${NW[n]} ${FR[d][+n > 1 ? 1 : 0]}` : m))
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/−/g, ' minus ')
    .replace(/\+/g, ' plus ')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/→/g, ' to ')
    .replace(/=/g, ' equals ')
    .replace(/\?/g, ' what number ')
    .replace(/✓/g, '')
}
