import { R, strat, wrongs, choice, frac, fracHTML, Q, type Gen, type Item, type Rng } from '../kit'

/* Calculus ideas as stories and puzzles: speed, distance, change of speed, graphs,
   area under a speed graph, halving again and again, sums that get closer and closer to 1, steepness.
   Every picture is drawn from the same numbers the answer is computed from. */

type RR = ReturnType<typeof R>
type P = [number, number]

const INK = '#1d2b36'
const CREAM = '#fffdf5'
const RED = '#d84315'
const BLUE = '#1565c0'
const BOX = ['#ffcc80', '#90caf9', '#a5d6a7', '#f48fb1']

const n1 = (x: number) => String(Math.round(x * 10) / 10)
const svg = (w: number, h: number, body: string, max = 380, label = 'picture') =>
  `<svg viewBox="0 0 ${n1(w)} ${n1(h)}" role="img" aria-label="${label}" style="width:100%;max-width:${max}px;display:block;margin:0 auto">${body}</svg>`
const T = (x: number, y: number, s: string | number, o: { size?: number; fill?: string; anchor?: string; halo?: boolean } = {}) =>
  `<text x="${n1(x)}" y="${n1(y)}" text-anchor="${o.anchor || 'middle'}" font-size="${o.size || 15}" font-weight="700" fill="${o.fill || INK}"${o.halo ? ` stroke="${CREAM}" stroke-width="4" paint-order="stroke" stroke-linejoin="round"` : ''}>${s}</text>`
const lineEl = (a: P, b: P, stroke = INK, sw = 3, dash = '') =>
  `<line x1="${n1(a[0])}" y1="${n1(a[1])}" x2="${n1(b[0])}" y2="${n1(b[1])}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0)
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const ONE: Record<string, string> = { feet: 'foot', inches: 'inch', miles: 'mile', blocks: 'block', yards: 'yard' }
/** "1 foot", "3 feet" */
const amt = (n: number, u: string) => `${n} ${n === 1 ? ONE[u] || u : u}`
const isNum = (it: Item) => it.input === 'number' && typeof it.answer === 'number'
const between = (x: number | string, lo: number, hi: number) => typeof x === 'number' && x >= lo && x <= hi

/** A small table: each row is a heading and its cells. */
const table = (rows: [string, (number | string)[]][]) =>
  `<table style="border-collapse:collapse;margin:0 auto;font-size:18px;font-weight:700;color:${INK};background:#fff">` +
  rows
    .map(
      ([h, cells], i) =>
        `<tr><th style="border:2px solid #90a4ae;padding:6px 10px;background:${i === 2 ? '#ffe0b2' : '#e3f2fd'};text-align:left">${h}</th>${cells.map((c) => `<td style="border:2px solid #90a4ae;padding:6px 10px;text-align:center;min-width:30px${i === 2 ? `;color:${RED}` : ''}">${c}</td>`).join('')}</tr>`,
    )
    .join('') +
  '</table>'

interface Step { v: number; t: number }
/** A graph over time. pts = one value at each whole second (dots joined by a line). steps = flat stretches of speed with the area under them shaded. */
function chart(o: { n: number; ymax: number; ystep: number; ylabel: string; xlabel?: string; pts?: number[]; steps?: Step[]; t0?: number; boxText?: string[]; guide?: number }): string {
  const L = 64,
    top = 18,
    PW = 300,
    PH = 190
  const rowsN = o.ymax / o.ystep
  const X = (t: number) => L + (t * PW) / o.n,
    Y = (v: number) => top + PH - (v / o.ymax) * PH
  let s = `<rect x="${L}" y="${top}" width="${PW}" height="${PH}" fill="#fff"/>`
  for (let t = 0; t <= o.n; t++) s += lineEl([X(t), top], [X(t), top + PH], '#cfd8dc', 1.5) + T(X(t), top + PH + 20, t, { size: 14 })
  for (let i = 0; i <= rowsN; i++) {
    const v = i * o.ystep
    s += lineEl([L, Y(v)], [L + PW, Y(v)], '#cfd8dc', 1.5)
    if (rowsN <= 12 || i % 2 === 0) s += T(L - 9, Y(v) + 5, v, { size: 14, anchor: 'end' })
  }
  if (o.steps) {
    let t = o.t0 || 0
    o.steps.forEach((st, i) => {
      s += `<rect x="${n1(X(t))}" y="${n1(Y(st.v))}" width="${n1(X(t + st.t) - X(t))}" height="${n1(Y(0) - Y(st.v))}" fill="${BOX[i % BOX.length]}" opacity="0.85" stroke="${INK}" stroke-width="1.5"/>`
      if (o.boxText && o.boxText[i]) s += T((X(t) + X(t + st.t)) / 2, Math.min(Y(0) - 8, (Y(st.v) + Y(0)) / 2 + 6), o.boxText[i], { size: 15, halo: true })
      t += st.t
    })
    t = o.t0 || 0
    o.steps.forEach((st) => {
      s += lineEl([X(t), Y(st.v)], [X(t + st.t), Y(st.v)], RED, 5)
      t += st.t
    })
  }
  if (o.pts) {
    if (o.guide !== undefined) s += lineEl([X(o.guide), Y(0)], [X(o.guide), Y(o.pts[o.guide])], BLUE, 3, '6 5') + lineEl([X(o.guide), Y(o.pts[o.guide])], [L, Y(o.pts[o.guide])], BLUE, 3, '6 5')
    s += `<polyline points="${o.pts.map((v, t) => `${n1(X(t))},${n1(Y(v))}`).join(' ')}" fill="none" stroke="${RED}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`
    o.pts.forEach((v, t) => {
      s += `<circle cx="${n1(X(t))}" cy="${n1(Y(v))}" r="6.5" fill="${RED}" stroke="#fff" stroke-width="2"/>`
    })
  }
  s += lineEl([L, top], [L, top + PH], INK, 3) + lineEl([L, top + PH], [L + PW, top + PH], INK, 3)
  s += T(L + PW / 2, top + PH + 44, o.xlabel || 'seconds', { size: 15 })
  s += `<text x="16" y="${top + PH / 2}" text-anchor="middle" font-size="15" font-weight="700" fill="${INK}" transform="rotate(-90 16 ${top + PH / 2})">${o.ylabel}</text>`
  return svg(L + PW + 18, top + PH + 56, s, 400, 'a graph')
}
/** A good scale for the up-and-down numbers. */
const scaleFor = (vals: number[]) => {
  const max = Math.max(...vals)
  // every value must sit on a grid line, with one line of head room
  const ystep = [1, 2, 5, 10, 20].find((s) => vals.every((v) => v % s === 0) && max / s + 1 <= 11) || 10
  return { ystep, ymax: (Math.ceil(max / ystep) + 1) * ystep }
}

interface Mover { who: string; verb: string; u: string; tu: string; thing: string }
const MOVERS: Mover[] = [
  { who: 'A runner', verb: 'runs', u: 'feet', tu: 'second', thing: 'runner' },
  { who: '{n}', verb: 'surfs', u: 'feet', tu: 'second', thing: 'surfer' },
  { who: 'A ball', verb: 'rolls', u: 'inches', tu: 'second', thing: 'ball' },
  { who: '{n}', verb: 'bikes', u: 'feet', tu: 'second', thing: 'bike' },
  { who: 'A train', verb: 'goes', u: 'miles', tu: 'hour', thing: 'train' },
  { who: 'A snail', verb: 'crawls', u: 'inches', tu: 'minute', thing: 'snail' },
  { who: 'A robot', verb: 'rolls', u: 'feet', tu: 'minute', thing: 'robot' },
  { who: 'A dancer', verb: 'glides', u: 'feet', tu: 'second', thing: 'dancer' },
]
const KIDS = ['Max', 'Leo', 'Sam', 'Ava', 'Mia', 'Zoe', 'Ben', 'Eli']

/** The track from the start to the goal with the first k half-way hops drawn. */
function halvingPic(S: number, k: number, u: string, labels = false): string {
  const L = 24,
    W = 320,
    y = 74
  const X = (d: number) => L + (d / S) * W
  let s = lineEl([L, y], [L + W, y], INK, 4)
  let pos = 0,
    left = S
  for (let i = 0; i < k; i++) {
    const hop = left / 2
    const x1 = X(pos),
      x2 = X(pos + hop)
    const h = Math.min(46, 10 + (x2 - x1) * 0.4)
    s += `<path d="M${n1(x1)} ${y - 4} Q ${n1((x1 + x2) / 2)} ${n1(y - 4 - h * 1.5)} ${n1(x2)} ${y - 4}" fill="none" stroke="${RED}" stroke-width="3"/>`
    if (labels && x2 - x1 >= 26) s += T((x1 + x2) / 2, y - h * 0.75 - 12, hop, { size: 14, fill: RED, halo: true })
    pos += hop
    left -= hop
    s += lineEl([X(pos), y - 8], [X(pos), y + 8], INK, 2.5)
  }
  s += lineEl([L, y - 12], [L, y + 12], INK, 4) + lineEl([L + W, y - 12], [L + W, y + 12], INK, 4)
  s += T(L + 4, y + 32, 'start', { size: 14, anchor: 'start' }) + T(L + W - 2, y + 32, 'goal', { size: 14, anchor: 'end' })
  s += T(L + W / 2, y + 54, `${S} ${u} in all`, { size: 15 })
  return svg(L * 2 + W, 136, s, 400, 'a track with half-way hops')
}
/** One whole bar with the pieces 1/2, 1/4, 1/8 ... coloured in. */
function sumBar(k: number): string {
  const L = 10,
    W = 340
  let s = `<rect x="${L}" y="22" width="${W}" height="56" fill="#fff" stroke="${INK}" stroke-width="3"/>`
  let x = L,
    w = W / 2
  for (let i = 1; i <= k; i++) {
    s += `<rect x="${n1(x)}" y="22" width="${n1(w)}" height="56" fill="${BOX[(i - 1) % BOX.length]}" stroke="${INK}" stroke-width="2"/>`
    if (w >= 34) s += T(x + w / 2, 56, `1/${2 ** i}`, { size: w >= 60 ? 18 : 14 })
    x += w
    w /= 2
  }
  s += `<rect x="${L}" y="22" width="${W}" height="56" fill="none" stroke="${INK}" stroke-width="3"/>`
  s += T(L, 100, '0', { size: 15, anchor: 'start' }) + T(L + W, 100, '1 whole', { size: 15, anchor: 'end' })
  return svg(W + 20, 108, s, 400, 'one whole bar with pieces filled in')
}
/** A ramp or hill as a right triangle with its rise and run written on it. */
function rampPic(hills: { rise: number; run: number; name?: string; hide?: 'rise' | 'run' }[], u: string): string {
  const maxRun = Math.max(...hills.map((h) => h.run)),
    maxRise = Math.max(...hills.map((h) => h.rise))
  const cellW = 170,
    k = Math.min((cellW - 62) / maxRun, 120 / maxRise)
  let s = ''
  hills.forEach((h, i) => {
    const x0 = i * cellW + 16,
      y0 = 150
    const x1 = x0 + h.run * k,
      y1 = y0 - h.rise * k
    s += `<polygon points="${n1(x0)},${y0} ${n1(x1)},${y0} ${n1(x1)},${n1(y1)}" fill="${BOX[(i + 2) % BOX.length]}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    s += T((x0 + x1) / 2, y0 + 20, `${h.hide === 'run' ? '?' : h.run} across`, { size: 14, fill: h.hide === 'run' ? RED : INK }) + T(x1 + 6, (y0 + y1) / 2 + 5, `${h.hide === 'rise' ? '?' : h.rise} up`, { size: 14, anchor: 'start', fill: h.hide === 'rise' ? RED : INK })
    if (h.name) s += T(x0 + 4, 22, `Hill ${h.name}`, { size: 16, anchor: 'start' })
  })
  return svg(hills.length * cellW + 10, 180, s, hills.length * 200 + 20, `a hill, measured in ${u}`)
}
/** A square grid with two named points and the line through them. legs = show the across and up moves. */
function slopeGrid(a: P, b: P, G: number, legs: boolean): string {
  const c = 30,
    L = 34,
    top = 30
  const X = (x: number) => L + x * c,
    Y = (y: number) => top + (G - y) * c
  let s = `<rect x="${L}" y="${top}" width="${G * c}" height="${G * c}" fill="#fff"/>`
  for (let i = 0; i <= G; i++) {
    s += lineEl([X(i), Y(0)], [X(i), Y(G)], '#b0bec5', 1.5) + lineEl([X(0), Y(i)], [X(G), Y(i)], '#b0bec5', 1.5)
    s += T(X(i), Y(0) + 19, i, { size: 14 }) + T(L - 9, Y(i) + 5, i, { size: 14, anchor: 'end' })
  }
  s += lineEl([X(0), Y(0)], [X(G), Y(0)], INK, 3) + lineEl([X(0), Y(0)], [X(0), Y(G)], INK, 3)
  if (legs) {
    s += lineEl([X(a[0]), Y(a[1])], [X(b[0]), Y(a[1])], BLUE, 4, '7 6') + lineEl([X(b[0]), Y(a[1])], [X(b[0]), Y(b[1])], '#2e7d32', 4, '7 6')
    s += T((X(a[0]) + X(b[0])) / 2 + (a[1] === 0 ? 34 : 0), Y(a[1]) + (a[1] === 0 ? -8 : 17), `${b[0] - a[0]} across`, { size: 14, fill: BLUE, halo: true }) + T(X(b[0]) + 7, (Y(a[1]) + Y(b[1])) / 2 + 5, `${b[1] - a[1]} up`, { size: 14, fill: '#2e7d32', anchor: 'start', halo: true })
  }
  s += lineEl([X(a[0]), Y(a[1])], [X(b[0]), Y(b[1])], RED, 4)
  ;[a, b].forEach((p, i) => {
    s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="7" fill="${RED}" stroke="#fff" stroke-width="2"/>` + T(X(p[0]) - 10, Y(p[1]) - 10, 'AB'[i], { size: 17, anchor: 'end', halo: true })
  })
  return svg(L + G * c + 60, top + G * c + 30, s, 380, 'a line on a grid')
}
const yn = (ans: boolean, rng: Rng) => choice(ans ? 'yes' : 'no', ['yes', 'no'], rng, true)
const yesNo = (b: boolean) => (b ? 'yes' : 'no')
const fracEq = (k: number) => Array.from({ length: k }, (_, i) => fracHTML(1, 2 ** (i + 1))).join(' + ')
const pieces = (k: number) => Array.from({ length: k }, (_, i) => `1/${2 ** (i + 1)}`)
const listAnd = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

const MOVING = (r: RR) =>
  r.pick([
    { intro: 'A ball rolls down a hill.', it: 'the ball' },
    { intro: 'A sled slides down a snowy hill.', it: 'the sled' },
    { intro: 'A toy rocket takes off.', it: 'the rocket' },
    { intro: '{n} rides a bike down a ramp.', it: 'the bike' },
    { intro: 'A surfer catches a wave.', it: 'the surfer' },
    { intro: 'A runner takes off for first base.', it: 'the runner' },
  ])

export const gens: Record<string, Gen> = {
  'ca.speed': (rng, d) => {
    const r = R(rng)
    const m = r.pick(MOVERS)
    if (d === 3 && r.chance(0.3)) {
      // who is faster?
      const [A, B] = r.shuffle(KIDS).slice(0, 2)
      const t1 = r.int(2, 9)
      let t2 = r.int(2, 9)
      if (t2 === t1) t2 = t1 === 9 ? 3 : t1 + 1
      const v1 = r.int(4, 12)
      let v2 = r.int(4, 12)
      if (v2 === v1) v2 = v1 + 1
      const d1 = v1 * t1,
        d2 = v2 * t2
      const s1 = d1 / t1,
        s2 = d2 / t2
      const both = t1 * t2
      const far1 = d1 * t2,
        far2 = d2 * t1
      const ans = s1 > s2 ? A : B
      return {
        prompt: `${A} runs ${d1} feet in ${plural(t1, 'second')}. ${B} runs ${d2} feet in ${plural(t2, 'second')}. Who is faster?`,
        ...choice(ans, [A, B], rng, true),
        strategies: [
          strat('Find Each Speed', [`${A}: ${d1} ÷ ${t1} = ${s1} feet each second.`, `${B}: ${d2} ÷ ${t2} = ${s2} feet each second.`, `${Math.max(s1, s2)} is more than ${Math.min(s1, s2)}, so ${s1 > s2 ? A : B} is faster.`], s1 > s2 ? A : B),
          strat('Give Them the Same Time', [`Let both run for ${both} seconds.`, `${A} would go ${d1} × ${t2} = ${far1} feet.`, `${B} would go ${d2} × ${t1} = ${far2} feet.`, `${far1 > far2 ? A : B} gets farther in the same time, so ${far1 > far2 ? A : B} is faster.`], far1 > far2 ? A : B),
        ],
        operands: [d1, t1, d2, t2],
        difficulty: d,
      }
    }
    const t = d === 1 ? r.pick([2, 5, 10]) : d === 2 ? r.int(2, 9) : r.int(3, 12)
    const v = d === 1 ? r.int(1, 10) : d === 2 ? r.int(2, 10) : r.int(6, 15)
    const D = v * t
    let found = 0
    for (let k = 1; k <= D; k++) if (k * t === D) found = k
    const pts = Array.from({ length: t + 1 }, (_, i) => i * v)
    return {
      prompt: r.pick([
        `${m.who} ${m.verb} ${D} ${m.u} in ${plural(t, m.tu)}. The speed stays the same. How many ${m.u} each ${m.tu}?`,
        `${m.who} ${m.verb} at a steady speed and covers ${D} ${m.u} in ${plural(t, m.tu)}. How far is that each ${m.tu}?`,
      ]),
      input: 'number',
      answer: v,
      unit: `${m.u} each ${m.tu}`,
      strategies: [
        strat('Share It Out', [`Speed is how far you go in 1 ${m.tu}.`, `Share ${D} ${m.u} over ${plural(t, m.tu)}.`, `${D} ÷ ${t} = ${v}`], D / t),
        strat('Think Multiplication', [`What number times ${t} makes ${D}?`, `Try ${found}: ${found} × ${t} = ${D}. It fits.`, `So the speed is ${amt(found, m.u)} each ${m.tu}.`], found, t <= 6 ? { line: pts } : {}),
      ],
      distractors: wrongs(v, [D - t, D + t, t, v + 1, v - 1, D].filter((x) => x > 0)),
      operands: [D, t],
      difficulty: d,
    }
  },

  'ca.distance': (rng, d) => {
    const r = R(rng)
    const m = r.pick(MOVERS)
    const v = d === 1 ? r.int(2, 10) : d === 2 ? r.int(3, 12) : r.int(11, 25)
    const t = d === 1 ? r.int(2, 5) : r.int(3, 9)
    const head = d === 3 && r.chance(0.35) ? r.int(1, 6) * 5 : 0
    const D = v * t
    const ans = head + D
    const counts = Array.from({ length: t }, (_, i) => head + (i + 1) * v)
    const tens = Math.floor(v / 10) * 10,
      ones = v % 10
    const alt =
      v > 10 && ones
        ? strat('Break It Apart', [`Split ${v} into ${tens} and ${ones}.`, `${tens} × ${t} = ${tens * t}`, `${ones} × ${t} = ${ones * t}`, head ? `${tens * t} + ${ones * t} + ${head} = ${tens * t + ones * t + head}` : `${tens * t} + ${ones * t} = ${tens * t + ones * t}`], tens * t + ones * t + head)
        : strat('Count On Each ' + m.tu[0].toUpperCase() + m.tu.slice(1), [`Add ${v} for each ${m.tu}${head ? `, starting from ${head}` : ''}.`, counts.join(', '), `After ${plural(t, m.tu)} that is ${counts[t - 1]} ${m.u}.`], counts[t - 1], { line: [head, ...counts] })
    return {
      prompt: head
        ? `${m.who} starts ${head} ${m.u} past the start line. Then ${m.who === '{n}' ? 'he' : 'it'} ${m.verb} ${v} ${m.u} each ${m.tu} for ${plural(t, m.tu)}. How far past the start line now?`
        : r.pick([`${m.who} ${m.verb} ${v} ${m.u} each ${m.tu}. How far in ${plural(t, m.tu)}?`, `${m.who} ${m.verb} at ${v} ${m.u} each ${m.tu} for ${plural(t, m.tu)}. How many ${m.u} is that?`]),
      input: 'number',
      answer: ans,
      unit: m.u,
      strategies: [strat('Multiply', [`Each ${m.tu} adds ${v} ${m.u}. There are ${plural(t, m.tu)}.`, `${v} × ${t} = ${D}`, ...(head ? [`Add the head start: ${D} + ${head} = ${D + head}`] : [])], v * t + head), alt],
      distractors: wrongs(ans, [v + t + head, D - v + head, D + v + head, ...(head ? [D, (v + head) * t] : [v * (t - 1) + t])]),
      operands: head ? [v, t, head] : [v, t],
      difficulty: d,
    }
  },

  'ca.rate-change': (rng, d) => {
    const r = R(rng)
    const mv = MOVING(r)
    const It = mv.it[0].toUpperCase() + mv.it.slice(1)
    const N = 4 // seconds 0..4 shown
    const t = r.pick(d === 1 ? [0, 1] : d === 2 ? [1, 2, 3] : [3, 4, 5])
    const secs = Array.from({ length: N + 1 }, (_, i) => i)
    if (t === 0 || t === 1) {
      const v = d === 1 ? r.int(2, 9) : r.int(4, 15)
      const p0 = r.pick([0, 0, r.int(1, 9)])
      const pos = secs.map((s) => p0 + v * s)
      const tbl = table([['Second', secs], ['Feet', pos]])
      const jumps = pos.slice(1).map((p, i) => p - pos[i])
      const withJumps = table([['Second', secs], ['Feet', pos], ['Jump', ['', ...jumps.map((j) => `+${j}`)]]])
      if (t === 0) {
        const whole = pos[N] - pos[0]
        return {
          prompt: `${mv.intro} The table shows how far ${mv.it} is at each second. How many feet does it move each second?`,
          visual: tbl,
          input: 'number',
          answer: v,
          unit: 'feet each second',
          strategies: [
            strat('Find the Jump', [`Look at two numbers side by side in the Feet row.`, `${pos[2]} − ${pos[1]} = ${pos[2] - pos[1]}`, `Every jump is the same: ${jumps[0]} feet each second.`], pos[2] - pos[1], { html: withJumps }),
            strat('Use the Whole Trip', [`From second 0 to second ${N}: ${pos[N]} − ${pos[0]} = ${whole}`, `That took ${N} seconds: ${whole} ÷ ${N} = ${whole / N}`], whole / N),
          ],
          distractors: wrongs(v, [pos[1], pos[N], v + 1, N]),
          operands: pos,
          difficulty: d,
        }
      }
      const next = pos[N] + jumps[N - 1]
      return {
        prompt: `${mv.intro} The table shows how far ${mv.it} is at each second. It keeps the same speed. How far is ${mv.it} at second ${N + 1}?`,
        visual: tbl,
        input: 'number',
        answer: p0 + v * (N + 1),
        unit: 'feet',
        strategies: [
          strat('Add One More Jump', [`Each second it moves ${jumps[N - 1]} feet: ${pos[N]} − ${pos[N - 1]} = ${jumps[N - 1]}`, `Add one more jump: ${pos[N]} + ${jumps[N - 1]} = ${next}`], next, { html: withJumps }),
          strat('Jumps Times Seconds', [`${N + 1} seconds means ${N + 1} jumps of ${v}: ${N + 1} × ${v} = ${(N + 1) * v}`, p0 ? `Add where it started: ${(N + 1) * v} + ${p0} = ${(N + 1) * v + p0}` : `It started at 0, so that is the answer.`], (N + 1) * v + p0),
        ],
        distractors: wrongs(next, [pos[N] + 1, pos[N] + N + 1, pos[N] * 2, next + v, pos[N]]),
        operands: pos,
        difficulty: d,
      }
    }
    // speeding up: the jumps grow by the same amount a
    const a = d === 2 ? r.int(1, 4) : r.int(2, 6)
    const j0 = r.int(1, d === 2 ? 5 : 8)
    const jumps = Array.from({ length: N }, (_, i) => j0 + a * i)
    const pos = [0]
    for (const j of jumps) pos.push(pos[pos.length - 1] + j)
    const tbl = table([['Second', secs], ['Feet', pos]])
    const diffs = pos.slice(1).map((p, i) => p - pos[i])
    const withJumps = table([['Second', secs], ['Feet', pos], ['Jump', ['', ...diffs.map((j) => `+${j}`)]]])
    if (t === 2) {
      const k = r.int(2, N)
      const ans = pos[k] - pos[k - 1]
      return {
        prompt: `${mv.intro} ${It} speeds up. The table shows how far ${mv.it} is at each second. How far does it go from second ${k - 1} to second ${k}?`,
        visual: tbl,
        input: 'number',
        answer: ans,
        unit: 'feet',
        strategies: [
          strat('Subtract', [`Find the two numbers in the Feet row: ${pos[k - 1]} and ${pos[k]}.`, `${pos[k]} − ${pos[k - 1]} = ${ans}`], pos[k] - pos[k - 1], { html: withJumps }),
          strat('Count Up', [`Start at ${pos[k - 1]}. Count up to ${pos[k]}.`, `That is a hop of ${diffs[k - 1]} feet.`], diffs[k - 1], { line: [pos[k - 1], pos[k]] }),
        ],
        distractors: wrongs(ans, [pos[k], pos[k] + pos[k - 1], diffs[0], ans + 1, k === N ? diffs[k - 2] : diffs[k]]),
        operands: pos,
        difficulty: d,
      }
    }
    if (t === 3) {
      // table of speeds
      const speeds = Array.from({ length: N + 1 }, (_, i) => j0 + a * i)
      const whole = speeds[N] - speeds[0]
      const sTbl = table([['Second', secs.map((s) => s + 1)], ['Speed', speeds]])
      return {
        prompt: `${mv.intro} ${It} gets faster and faster. The table shows its speed in feet each second. How much does the speed grow each second?`,
        visual: sTbl,
        input: 'number',
        answer: a,
        unit: 'more each second',
        strategies: [
          strat('Find the Jump', [`Look at two speeds side by side.`, `${speeds[1]} − ${speeds[0]} = ${speeds[1] - speeds[0]}`, `Check the next pair: ${speeds[2]} − ${speeds[1]} = ${speeds[2] - speeds[1]}. Same jump.`], speeds[1] - speeds[0], { html: table([['Second', secs.map((s) => s + 1)], ['Speed', speeds], ['Jump', ['', ...speeds.slice(1).map((s, i) => `+${s - speeds[i]}`)]]]) }),
          strat('Use the Whole Table', [`From the first speed to the last: ${speeds[N]} − ${speeds[0]} = ${whole}`, `That is ${N} jumps: ${whole} ÷ ${N} = ${whole / N}`], whole / N),
        ],
        distractors: wrongs(a, [speeds[0], speeds[N], whole, a + 1]),
        operands: speeds,
        difficulty: d,
      }
    }
    const grow = diffs.slice(1).map((x, i) => x - diffs[i])
    if (t === 4) {
      const span = diffs[N - 1] - diffs[0]
      return {
        prompt: `${mv.intro} ${It} speeds up. The table shows how far ${mv.it} is at each second. Each jump is bigger than the last. How much bigger?`,
        visual: tbl,
        input: 'number',
        answer: a,
        unit: 'feet bigger',
        strategies: [
          strat('Jumps of the Jumps', [`First find each jump: ${diffs.join(', ')}.`, `Now see how the jumps grow: ${diffs[1]} − ${diffs[0]} = ${grow[0]}`, `Each jump is ${grow[0]} bigger than the one before.`], grow[0], { html: withJumps }),
          strat('First Jump to Last Jump', [`The first jump is ${diffs[0]}. The last jump is ${diffs[N - 1]}.`, `${diffs[N - 1]} − ${diffs[0]} = ${span}`, `The jumps grew ${N - 1} times: ${span} ÷ ${N - 1} = ${span / (N - 1)}`], span / (N - 1)),
        ],
        distractors: wrongs(a, [diffs[0], diffs[N - 1], pos[1], a + 1, span]),
        operands: pos,
        difficulty: d,
      }
    }
    const nextJump = diffs[N - 1] + grow[grow.length - 1]
    const next = pos[N] + nextJump
    const all = [...diffs, nextJump]
    return {
      prompt: `${mv.intro} ${It} speeds up. The table shows how far ${mv.it} is at each second. The jumps keep growing the same way. How far is ${mv.it} at second ${N + 1}?`,
      visual: tbl,
      input: 'number',
      answer: sum(Array.from({ length: N + 1 }, (_, i) => j0 + a * i)),
      unit: 'feet',
      strategies: [
        strat('Keep the Pattern Going', [`The jumps are ${diffs.join(', ')}. Each one is ${grow[0]} bigger.`, `The next jump is ${diffs[N - 1]} + ${grow[0]} = ${nextJump}`, `Add it on: ${pos[N]} + ${nextJump} = ${next}`], next, { html: withJumps }),
        strat('Add Up Every Jump', [`It starts at 0. Add all the jumps, with the new one.`, `${all.join(' + ')} = ${sum(all)}`], sum(all)),
      ],
      distractors: wrongs(next, [pos[N] + diffs[N - 1], pos[N] + grow[0], pos[N] * 2 - pos[N - 1], next + a, nextJump]),
      operands: pos,
      difficulty: d,
    }
  },

  'ca.graph-read': (rng, d) => {
    const r = R(rng)
    const n = d === 1 ? 5 : 6
    const dist = r.chance(0.4)
    const ystep = d === 1 ? 1 : d === 2 ? r.pick([2, 5]) : r.pick([5, 10])
    const who = r.pick(['a runner', 'a surfer', 'a bike', 'a race car', 'a dancer', 'a sled'])
    // values at each second, as a count of grid lines
    let k: number[] = []
    for (let tries = 0; tries < 40; tries++) {
      if (dist) {
        k = [0]
        for (let i = 1; i <= n; i++) k.push(k[i - 1] + r.int(1, 2))
      } else {
        k = [r.int(1, 4)]
        for (let i = 1; i <= n; i++) k.push(Math.max(0, Math.min(10, k[i - 1] + r.pick([-2, -1, 0, 1, 1, 2, 3]))))
      }
      if (Math.max(...k) >= 4 && Math.max(...k) <= 10 && k.filter((x) => x === Math.max(...k)).length === 1) break
    }
    if (k.filter((x) => x === Math.max(...k)).length !== 1 || Math.max(...k) > 10 || Math.max(...k) < 4) k = dist ? [0, 1, 3, 4, 6, 7, 9].slice(0, n + 1) : [2, 3, 5, 4, 6, 8, 7].slice(0, n + 1)
    const vals = k.map((x) => x * ystep)
    const ymax = Math.max(...k) * ystep
    const ylabel = dist ? 'feet from the start' : 'speed (feet each second)'
    const g = (guide?: number) => chart({ n, ymax, ystep, ylabel, pts: vals, guide })
    const intro = dist ? `The graph shows how far ${who} is from the start.` : `The graph shows the speed of ${who}.`
    const what = dist ? 'How far from the start' : 'How fast'
    const t0 = r.pick(d === 1 ? [0, 0, 4] : d === 2 ? [0, 2, 3, 4] : [2, 3, 3, 5])
    const t = t0 === 5 && dist ? 3 : t0
    const unit = dist ? 'feet' : 'feet each second'
    if (t === 2) {
      // when does it reach a value? (must happen at one second only)
      const uniq = vals.map((v, i) => i).filter((i) => i > 0 && vals.filter((x) => x === vals[i]).length === 1)
      const at = r.pick(uniq.length ? uniq : [k.indexOf(Math.max(...k))])
      const list = vals.map((v, i) => `second ${i}: ${v}`)
      const hits = vals.map((v, i) => (v === vals[at] ? i : -1)).filter((i) => i >= 0)
      return {
        prompt: `${intro} At which second is ${dist ? 'it' : 'the speed'} ${vals[at]} ${dist ? 'feet from the start' : 'feet each second'}?`,
        visual: g(),
        input: 'number',
        answer: at,
        unit: '',
        strategies: [
          strat('Over, Then Down', [`Find ${vals[at]} on the side numbers.`, `Slide across to the dot. Then slide straight down.`, `You land on second ${vals.indexOf(vals[at])}.`], vals.indexOf(vals[at]), { html: g(at) }),
          strat('Check Each Dot', [`Read every dot: ${list.slice(0, 4).join(', ')},`, `${list.slice(4).join(', ')}.`, `The dot at ${vals[at]} is at second ${hits[0]}.`], hits[0]),
        ],
        distractors: wrongs(at, [vals[at], k[at], at + 1, at - 1]),
        operands: vals,
        difficulty: d,
      }
    }
    if (t === 3) {
      // how much more at one second than another
      let i = r.int(0, n - 1),
        j = r.int(i + 1, n)
      for (let tries = 0; tries < 20 && vals[i] === vals[j]; tries++) {
        i = r.int(0, n - 1)
        j = r.int(i + 1, n)
      }
      if (vals[i] === vals[j]) {
        i = k.indexOf(Math.min(...k))
        j = k.indexOf(Math.max(...k))
      }
      const hi = vals[i] > vals[j] ? i : j,
        lo = hi === i ? j : i
      const ans = vals[hi] - vals[lo]
      const linesBetween = k[hi] - k[lo]
      return {
        prompt: `${intro} How much ${dist ? 'farther is it' : 'faster is it'} at second ${hi} than at second ${lo}?`,
        visual: g(),
        input: 'number',
        answer: ans,
        unit,
        strategies: [
          strat('Read Both, Then Subtract', [`At second ${hi} the dot is at ${vals[hi]}.`, `At second ${lo} the dot is at ${vals[lo]}.`, `${vals[hi]} − ${vals[lo]} = ${ans}`], vals[hi] - vals[lo]),
          strat('Count the Lines Between', [`Count the grid lines from one dot up to the other: ${linesBetween}.`, ystep === 1 ? `Each line is 1, so the answer is ${linesBetween}.` : `Each line is worth ${ystep}: ${linesBetween} × ${ystep} = ${linesBetween * ystep}`], linesBetween * ystep),
        ],
        distractors: wrongs(ans, [vals[hi], vals[lo], vals[hi] + vals[lo], linesBetween, Math.abs(hi - lo)]),
        operands: vals,
        difficulty: d,
      }
    }
    if (t === 4 && !dist) {
      // fastest moment
      const top = Math.max(...vals)
      const at = vals.indexOf(top)
      const order = vals.map((v, i) => i).sort((x, y) => vals[y] - vals[x])
      return {
        prompt: `${intro} At which second is it going the fastest?`,
        visual: g(),
        input: 'number',
        answer: at,
        strategies: [
          strat('Find the Highest Dot', [`Faster means higher on this graph.`, `The highest dot is at ${top} feet each second.`, `Slide down from that dot: second ${at}.`], at, { html: g(at) }),
          strat('Compare the Dots', [`Read each dot: ${vals.join(', ')}.`, `The biggest number is ${vals[order[0]]}. It is at second ${order[0]}.`], order[0]),
        ],
        distractors: wrongs(at, [top, n, vals.indexOf(Math.min(...vals)), at + 1]),
        operands: vals,
        difficulty: d,
      }
    }
    if (t === 5) {
      // is it going up, down or staying flat?
      const i = r.int(0, n - 1)
      const diff = vals[i + 1] - vals[i]
      const words = ['speeding up', 'staying the same speed', 'slowing down']
      const ans = diff > 0 ? words[0] : diff === 0 ? words[1] : words[2]
      const slopeUp = k[i + 1] > k[i],
        flat = k[i + 1] === k[i]
      return {
        prompt: `${intro} What is it doing from second ${i} to second ${i + 1}?`,
        visual: g(),
        ...choice(ans, words, rng, true),
        strategies: [
          strat('Compare the Two Dots', [`At second ${i} the dot is at ${vals[i]}. At second ${i + 1} it is at ${vals[i + 1]}.`, diff > 0 ? `${vals[i + 1]} is more than ${vals[i]}.` : diff === 0 ? `The two numbers are the same.` : `${vals[i + 1]} is less than ${vals[i]}.`, `So it is ${ans}.`], ans),
          strat('Look at the Line', [`Put your finger on the line between second ${i} and second ${i + 1}.`, slopeUp ? `The line climbs up.` : flat ? `The line is flat.` : `The line goes down.`, `That means ${slopeUp ? words[0] : flat ? words[1] : words[2]}.`], slopeUp ? words[0] : flat ? words[1] : words[2]),
        ],
        operands: vals,
        difficulty: d,
      }
    }
    const at = r.int(1, n)
    return {
      prompt: `${intro} ${what} is it at second ${at}?`,
      visual: g(),
      input: 'number',
      answer: vals[at],
      unit,
      strategies: [
        strat('Up, Then Over', [`Find ${at} on the bottom numbers.`, `Go straight up to the dot. Then slide left to the side numbers.`, `You land on ${vals[at]}.`], vals[at], { html: g(at) }),
        strat('Count the Lines', [`Start at the bottom. Count the grid lines up to the dot: ${k[at]}.`, ystep === 1 ? `Each line is 1, so the dot is at ${k[at]}.` : `Each line is worth ${ystep}: ${k[at]} × ${ystep} = ${k[at] * ystep}`], k[at] * ystep),
      ],
      distractors: wrongs(vals[at], [at, k[at], vals[at - 1], at < n ? vals[at + 1] : vals[at] + ystep, vals[at] + ystep]),
      operands: vals,
      difficulty: d,
    }
  },

  'ca.accumulate': (rng, d) => {
    const r = R(rng)
    const who = r.pick([
      { w: '{n}', verb: 'runs', he: 'he' },
      { w: 'A surfer', verb: 'rides', he: 'she' },
      { w: 'A robot', verb: 'rolls', he: 'it' },
      { w: 'A bike', verb: 'rolls', he: 'it' },
      { w: 'A runner', verb: 'runs', he: 'she' },
    ])
    const v = d === 1 ? r.int(2, 6) : d === 2 ? r.int(3, 10) : r.pick([5, 10]) * r.int(2, 6)
    const t = d === 1 ? r.int(2, 5) : d === 2 ? r.int(3, 8) : r.int(3, 7)
    const t0 = d === 3 && r.chance(0.5) ? r.int(1, 3) : 0
    const n = Math.max(d === 1 ? 5 : 8, t0 + t + (d === 3 ? 1 : 0))
    const { ystep, ymax } = scaleFor([v])
    const ans = v * t
    const g = (text?: string) => chart({ n, ymax, ystep, ylabel: 'speed (feet each second)', steps: [{ v, t }], t0, boxText: text ? [text] : undefined })
    const perSec = Array.from({ length: t }, () => v)
    let squares = 0
    for (let row = 0; row < v; row++) for (let col = 0; col < t; col++) squares++
    return {
      prompt:
        d === 1
          ? `${who.w} ${who.verb} ${v} feet each second for ${plural(t, 'second')}. The shaded box under the speed line shows how far. How many feet is that?`
          : t0
            ? `${who.w} ${who.verb} at a steady speed from second ${t0} to second ${t0 + t}. The shaded box under the speed line shows how far ${who.he} goes. How many feet?`
            : r.pick([`The graph shows the speed of ${who.w === '{n}' ? '{n}' : who.w.toLowerCase()}. The shaded box under the line shows how far ${who.he} goes. How many feet?`, `${who.w} ${who.verb} at a steady speed. The space under the speed line is the distance. How many feet does ${who.he} go?`]),
      visual: g(),
      input: 'number',
      answer: ans,
      unit: 'feet',
      strategies: [
        strat('Area of the Box', [`The box is ${v} tall. That is the speed.`, t0 ? `It is ${t} wide. That is the time: ${t0 + t} − ${t0} = ${t}` : `It is ${t} wide. That is the time.`, `Tall times wide: ${v} × ${t} = ${ans}`], v * t, { html: g(`${v} × ${t}`) }),
        strat('Second by Second', [`Each second adds ${v} feet.`, `${perSec.join(' + ')} = ${sum(perSec)}`], sum(perSec)),
        ...(ystep === 1 ? [strat('Count the Squares', [`Each small square is 1 foot.`, `There are ${t} squares in a row and ${v} rows.`, `Count them all: ${squares} squares, so ${squares} feet.`], squares)] : []),
      ],
      distractors: wrongs(ans, [v + t, 2 * (v + t), ans - v, v * (t0 + t), v]),
      operands: [v, t, t0],
      difficulty: d,
    }
  },

  'ca.accumulate-steps': (rng, d) => {
    const r = R(rng)
    const parts = d === 1 ? 2 : r.pick(d === 2 ? [2, 3] : [3, 3, 2])
    const mult = d === 3 ? r.pick([5, 10]) : 1
    const steps: Step[] = []
    for (let i = 0; i < parts; i++) {
      let v = (d === 1 ? r.int(1, 6) : d === 2 ? r.int(2, 10) : r.int(1, 6)) * mult
      if (i && v === steps[i - 1].v) v += mult
      steps.push({ v, t: d === 1 ? r.int(1, 3) : d === 2 ? r.int(1, 4) : r.int(2, 4) })
    }
    const total = sum(steps.map((s) => s.t))
    const { ystep, ymax } = scaleFor(steps.map((s) => s.v))
    const who = r.pick(['{n}', 'A runner', 'A surfer', 'A bike', 'A robot', 'A sled'])
    const boxes = steps.map((s) => s.v * s.t)
    const ans = sum(boxes)
    const g = (labels: boolean) => chart({ n: Math.max(total, 5), ymax, ystep, ylabel: 'speed (feet each second)', steps, boxText: labels ? steps.map((s) => `${s.v} × ${s.t}`) : undefined })
    // running total, one second at a time
    const running: number[] = []
    let run = 0
    for (const s of steps)
      for (let i = 0; i < s.t; i++) {
        run += s.v
        running.push(run)
      }
    const story = steps.map((s, i) => `${i === 0 ? 'First' : i === parts - 1 ? 'Last' : 'Then'} ${amt(s.v, 'feet')} each second for ${plural(s.t, 'second')}.`).join(' ')
    if (d === 3 && parts === 2) {
      const big = Math.max(...boxes),
        small = Math.min(...boxes)
      if (big !== small) {
        const iBig = boxes.indexOf(big)
        return {
          prompt: `${who} changes speed. Each shaded box shows how far in that part. How many more feet in the bigger box than in the smaller box?`,
          visual: g(false),
          input: 'number',
          answer: big - small,
          unit: 'feet',
          strategies: [
            strat('Find Both Boxes', [`Box 1: ${steps[0].v} × ${steps[0].t} = ${boxes[0]}`, `Box 2: ${steps[1].v} × ${steps[1].t} = ${boxes[1]}`, `${big} − ${small} = ${big - small}`], big - small, { html: g(true) }),
            strat('Count Up', [`The boxes are ${boxes[1 - iBig]} feet and ${boxes[iBig]} feet.`, `Count up from ${small} to ${big}.`, `That is a hop of ${boxes[iBig] - boxes[1 - iBig]}.`], boxes[iBig] - boxes[1 - iBig], { line: [small, big] }),
          ],
          distractors: wrongs(big - small, [big + small, big, Math.abs(steps[0].v - steps[1].v), Math.abs(steps[0].v - steps[1].v) * total]),
          operands: steps.flatMap((s) => [s.v, s.t]),
          difficulty: d,
        }
      }
    }
    return {
      prompt: d === 1 ? `${who} changes speed. ${story} The shaded boxes show how far. How many feet in all?` : r.pick([`${who} changes speed. The shaded boxes under the speed line show how far. How many feet in all?`, `The graph shows the speed of ${who === '{n}' ? '{n}' : who.toLowerCase()}. Add the boxes under the line. How far in all?`]),
      visual: g(false),
      input: 'number',
      answer: ans,
      unit: 'feet',
      strategies: [
        strat('Add the Boxes', [...steps.map((s, i) => `Box ${i + 1} is ${s.v} tall and ${s.t} wide: ${s.v} × ${s.t} = ${boxes[i]}`), `${boxes.join(' + ')} = ${ans}`], ans, { html: g(true) }),
        strat('Second by Second', [`Add the speed for every second, one at a time.`, `Running total: ${running.join(', ')}.`, `After ${plural(total, 'second')} that is ${running[running.length - 1]} feet.`], running[running.length - 1]),
      ],
      distractors: wrongs(ans, [sum(steps.map((s) => s.v)) * total, sum(steps.map((s) => s.v)) + total, ans - boxes[parts - 1], sum(steps.map((s) => s.v)), steps[parts - 1].v * total]),
      operands: steps.flatMap((s) => [s.v, s.t]),
      difficulty: d,
    }
  },

  'ca.halving': (rng, d) => {
    const r = R(rng)
    const S = r.pick(d === 1 ? [8, 12, 16, 20, 32, 40, 64] : d === 2 ? [16, 24, 32, 40, 48, 64, 80, 96] : [32, 48, 64, 80, 96, 160])
    let maxK = 0
    for (let x = S; x % 2 === 0; x /= 2) maxK++
    const k = Math.min(maxK, d === 1 ? r.int(1, 2) : d === 2 ? r.int(2, 3) : r.int(3, 5))
    const ctx = r.pick([
      { who: 'A puppy', goal: 'the ball', u: 'feet', step: 'runs half of the way that is left', n: 'run' },
      { who: 'A frog', goal: 'the pond', u: 'inches', step: 'hops half of the way that is left', n: 'hop' },
      { who: '{n}', goal: 'the shore', u: 'feet', step: 'paddles half of the way that is left', n: 'paddle' },
      { who: 'A robot', goal: 'the wall', u: 'inches', step: 'rolls half of the way that is left', n: 'move' },
      { who: 'A bug', goal: 'the leaf', u: 'inches', step: 'crawls half of the way that is left', n: 'crawl' },
    ])
    const lefts = [S]
    for (let i = 0; i < k; i++) lefts.push(lefts[i] / 2)
    const hops = lefts.slice(1)
    const he = ctx.who === '{n}' ? 'he' : 'it'
    const open = `${ctx.who} is ${S} ${ctx.u} from ${ctx.goal}. Each time, ${he} ${ctx.step}.`
    const halvings = lefts.slice(0, k).map((x, i) => `${x} ÷ 2 = ${lefts[i + 1]}`)
    const t = r.pick(d === 1 ? [0, 0, 1] : d === 2 ? [0, 1, 2] : [0, 1, 2, 2, 3])
    if (t === 3) {
      // the big idea
      const tiny = hops[hops.length - 1]
      const q = r.pick([0, 1])
      const ans = q === 0
      return {
        prompt: q === 0 ? `${open} After ${plural(k, ctx.n)}, is there still some way left to go?` : `${open} After ${plural(k, ctx.n)}, is ${he} all the way at ${ctx.goal}?`,
        visual: halvingPic(S, k, ctx.u),
        ...yn(ans, rng),
        strategies: [
          strat('Halve and See', [...halvings, `There ${tiny === 1 ? 'is' : 'are'} still ${amt(tiny, ctx.u)} left. So the answer is ${yesNo(q === 0 ? tiny > 0 : tiny === 0)}.`], yesNo(q === 0 ? tiny > 0 : tiny === 0), { html: halvingPic(S, k, ctx.u, true) }),
          strat('Think About Halves', [`Each move covers only half of what is left.`, `The other half is always still there. It just gets smaller and smaller.`, `So after any number of moves a little bit is left: ${yesNo(ans)}.`], yesNo(S / 2 ** k > 0 ? q === 0 : q === 1)),
        ],
        operands: [S, k],
        difficulty: d,
      }
    }
    if (t === 2) {
      // how many moves until less than X is left?
      const X = lefts[k - 1] - (lefts[k - 1] - lefts[k] > 1 ? r.int(0, lefts[k - 1] - lefts[k] - 1) : 0)
      let steps = 0
      for (let x = S; x >= X; x /= 2) steps++
      const doubles = [X]
      while (doubles[doubles.length - 1] <= S) doubles.push(doubles[doubles.length - 1] * 2)
      return {
        prompt: `${open} How many ${ctx.n}s until less than ${amt(X, ctx.u)} ${X === 1 ? 'is' : 'are'} left?`,
        visual: halvingPic(S, steps, ctx.u),
        input: 'number',
        answer: k,
        strategies: [
          strat('Halve and Count', [`Keep cutting what is left in half: ${lefts.join(', ')}.`, `${lefts[k]} is the first one that is less than ${X}.`, `That took ${plural(steps, ctx.n)}.`], steps, { html: halvingPic(S, steps, ctx.u, true) }),
          strat('Double Up From the Goal', [`Halving can be undone by doubling. Double ${X} until you pass ${S}.`, `${doubles.join(', ')}.`, `${doubles[doubles.length - 1]} is more than ${S}. That took ${plural(doubles.length - 1, 'double')}.`], doubles.length - 1),
        ],
        distractors: wrongs(k, [k - 1, k + 1, lefts[k], X]),
        operands: [S, X],
        difficulty: d,
      }
    }
    if (t === 1) {
      // how far has it gone in all?
      const gone = sum(hops)
      return {
        prompt: `${open} How far has ${he} gone in all after ${plural(k, ctx.n)}?`,
        visual: halvingPic(S, k, ctx.u),
        input: 'number',
        answer: S - S / 2 ** k,
        unit: ctx.u,
        strategies: [
          strat('Add the Moves', [`Each move is half of what was left: ${hops.join(', ')}.`, hops.length > 1 ? `${hops.join(' + ')} = ${gone}` : `There is just one move: ${gone} ${ctx.u}.`], gone, { html: halvingPic(S, k, ctx.u, true) }),
          strat('Whole Trip Minus What Is Left', [`After ${plural(k, ctx.n)}, ${amt(lefts[k], ctx.u)} ${lefts[k] === 1 ? 'is' : 'are'} left.`, `${S} − ${lefts[k]} = ${S - lefts[k]}`], S - lefts[k]),
        ],
        distractors: wrongs(gone, [lefts[k], S, hops[0], gone - hops[hops.length - 1], S - k * 2]),
        operands: [S, k],
        difficulty: d,
      }
    }
    const cuts = 2 ** k
    return {
      prompt: `${open} How far is ${he} from ${ctx.goal} after ${plural(k, ctx.n)}?`,
      visual: halvingPic(S, k, ctx.u),
      input: 'number',
      answer: lefts[k],
      unit: ctx.u,
      strategies: [
        strat('Halve Again and Again', [`Cut what is left in half, one time for each ${ctx.n}.`, ...halvings], lefts[k], { html: halvingPic(S, k, ctx.u, true) }),
        k === 1
          ? strat('Think Doubles', [`What number added to itself makes ${S}?`, `${S / 2} + ${S / 2} = ${S}`, `So half of ${S} is ${S / 2}.`], S / 2)
          : strat('Cut It All at Once', [`Halving ${k} times is like cutting into ${Array(k).fill(2).join(' × ')} = ${cuts} equal parts.`, `One part is left: ${S} ÷ ${cuts} = ${S / cuts}`], S / cuts),
      ],
      distractors: wrongs(lefts[k], [S - 2 * k, Math.floor(S / k), lefts[k - 1], S - lefts[k], lefts[k] / 2]),
      operands: [S, k],
      difficulty: d,
    }
  },

  'ca.limit-sum': (rng, d) => {
    const r = R(rng)
    const k = d === 1 ? r.int(2, 3) : d === 2 ? r.int(2, 4) : r.int(3, 6)
    const den = 2 ** k
    const p = pieces(k)
    const ctx = r.pick([
      { a: '{n} eats', of: 'a pizza', done: 'has he eaten', left: 'is left' },
      { a: '{n} paints', of: 'a wall', done: 'has he painted', left: 'is left to paint' },
      { a: 'A hose fills', of: 'a pool', done: 'is full', left: 'is still empty' },
      { a: 'A runner runs', of: 'the way to the base', done: 'has she run', left: 'is left to run' },
      { a: '{n} builds', of: 'a brick wall', done: 'is built', left: 'is left to build' },
      { a: 'A surfer paddles', of: 'the way to shore', done: 'has she paddled', left: 'is left' },
    ])
    const the = ctx.of.replace(/^a /, 'the ')
    const story = k >= 5 ? `${ctx.a} ${p[0]} of ${ctx.of}, then ${p[1]} more, then ${p[2]} more, and so on down to ${p[k - 1]}.` : `${ctx.a} ${p[0]} of ${ctx.of}, then ${p.slice(1).map((x) => `${x} more`).join(', then ')}.`
    const eq = `${fracEq(k)} = ${Q}`
    const tops = Array.from({ length: k }, (_, i) => den / 2 ** (i + 1))
    const total = sum(tops)
    // halve the empty space once for each piece
    let gapDen = 1
    for (let i = 0; i < k; i++) gapDen *= 2
    const t = r.pick(d === 1 ? [0, 0, 1] : d === 2 ? [0, 1, 2, 4] : [0, 1, 2, 3, 4])
    if (t === 1) {
      return {
        prompt: `${story} How much of ${the} ${ctx.left}? Type a fraction.`,
        visual: sumBar(k),
        input: 'fraction',
        answer: frac(den - total, den),
        strategies: [
          strat('Halve the Empty Space', [`At the start, 1 whole is empty. Each piece fills half of the empty space.`, `The empty space goes: ${Array.from({ length: k }, (_, i) => `1/${2 ** (i + 1)}`).join(', ')}.`, `So 1/${gapDen} ${ctx.left}.`], `1/${gapDen}`, { html: sumBar(k) }),
          strat('Add, Then Subtract From 1', [`Change every piece to ${den}ths: ${tops.map((x) => `${x}/${den}`).join(' + ')} = ${total}/${den}`, `One whole is ${den}/${den}: ${den}/${den} − ${total}/${den} = ${den - total}/${den}`], frac(den - total, den)),
        ],
        distractors: [`${total}/${den}`, `1/${den / 2}`, `1/${den * 2}`, `1/${k}`].filter((x) => x !== `1/${den}`),
        operands: [k, den],
        difficulty: d,
      }
    }
    if (t === 2) {
      // true or not?
      const q = r.int(0, 4)
      if (q === 4) {
        // keep going forever: does the total ever pass 1?
        let top = 0,
          bottom = 1,
          everOver = false
        const totals: string[] = []
        for (let i = 1; i <= 20; i++) {
          top = top * 2 + 1
          bottom *= 2
          if (top > bottom) everOver = true
          if (i <= 5) totals.push(`${top}/${bottom}`)
        }
        // the space left is halved each time, so it is never used up
        let gapTop = 1,
          gapBottom = 1
        for (let i = 0; i < 20; i++) gapBottom *= 2
        const roomLeft = gapTop > 0 && gapBottom > 0
        return {
          prompt: `${story} Each new piece is half of the one before. If this goes on and on, will the total ever go past 1 whole?`,
          visual: sumBar(k),
          ...yn(everOver, rng),
          strategies: [
            strat('Watch the Totals', [`Totals after each piece: ${totals.join(', ')}.`, `The top number is always 1 less than the bottom number.`, `So the total gets closer and closer to 1, but it does not go past it: ${yesNo(everOver)}.`], yesNo(everOver), { html: sumBar(5) }),
            strat('Look at the Space Left', [`Each new piece fills only half of the empty space.`, `So half of the empty space is always still there. It just gets tiny.`, `There is always a little room left, so the total cannot pass 1: ${yesNo(!roomLeft)}.`], yesNo(!roomLeft)),
          ],
          operands: [k, den, q],
          difficulty: d,
        }
      }
      const nextTotal = [total * 2 + 1, den * 2] // sum after one more piece, over 2·den
      const gapNow = [den - total, den],
        gapNext = [nextTotal[1] - nextTotal[0], nextTotal[1]]
      const ans = q === 0 ? nextTotal[0] > nextTotal[1] : q === 1 ? gapNext[0] * gapNow[1] < gapNow[0] * gapNext[1] : q === 2 ? total === den : 1 * den < 1 * den * 2 && gapNow[0] * (den * 2) > 1 * den
      const asks = [
        `The next piece is 1/${den * 2}. Will that make the total more than 1 whole?`,
        `The next piece is 1/${den * 2}. Will the total then be closer to 1 whole than it is now?`,
        `Is the total now exactly 1 whole?`,
        `The next piece is 1/${den * 2}. Is that smaller than the space that is left?`,
      ]
      const why = [
        [`Now the total is ${total}/${den}. The space left is 1/${den}.`, `The next piece is 1/${den * 2}. That is only half of the space left.`, `So the total stays under 1: no.`],
        [`Now the space left is 1/${den}.`, `The next piece fills half of it. Then only 1/${den * 2} is left.`, `1/${den * 2} is smaller than 1/${den}, so yes, it is closer to 1.`],
        [`Add the pieces in ${den}ths: ${tops.map((x) => `${x}/${den}`).join(' + ')} = ${total}/${den}`, `One whole would be ${den}/${den}. There is still 1/${den} missing: no.`],
        [`The space left is 1/${den}. That is the same as 2/${den * 2}.`, `The next piece is 1/${den * 2}. That is half of the space: yes, smaller.`],
      ]
      // second way: think in the smallest pieces
      const small = den * 2
      const nowSmall = total * 2
      const ans2 = q === 0 ? nowSmall + 1 > small : q === 1 ? small - (nowSmall + 1) < small - nowSmall : q === 2 ? nowSmall === small : 1 < small - nowSmall
      return {
        prompt: `${story} ${asks[q]}`,
        visual: sumBar(k),
        ...yn(ans, rng),
        strategies: [
          strat('Look at the Space Left', why[q], yesNo(ans), { html: sumBar(k + (q === 2 ? 0 : 1)) }),
          strat('Count Tiny Pieces', [`Cut the whole into ${small} tiny pieces. Now the total is ${nowSmall} of them, and ${small - nowSmall} are empty.`, q === 2 ? `${nowSmall} is not all ${small}.` : `The next piece is just 1 tiny piece. Then ${nowSmall + 1} are full and ${small - nowSmall - 1} is empty.`, `So the answer is ${yesNo(ans2)}.`], yesNo(ans2)),
        ],
        operands: [k, den, q],
        difficulty: d,
      }
    }
    if (t === 3) {
      // how many pieces to reach a total?
      let count = 0,
        acc = 0
      while (acc < den - 1) {
        count++
        acc += den / 2 ** count
      }
      let gaps = 0
      for (let g = 1; g < den; g *= 2) gaps++
      return {
        prompt: `Add 1/2, then 1/4, then 1/8, and keep going. Each piece is half of the one before. How many pieces make a total of ${den - 1}/${den}?`,
        visual: sumBar(k),
        input: 'number',
        answer: k,
        strategies: [
          strat('Add and Watch', [`Totals after each piece: ${Array.from({ length: k }, (_, i) => `${2 ** (i + 1) - 1}/${2 ** (i + 1)}`).join(', ')}.`, `The total ${den - 1}/${den} shows up after ${plural(count, 'piece')}.`], count),
          strat('Watch the Space Left', [`${den - 1}/${den} means 1/${den} is still empty.`, `The empty space is cut in half by each piece: ${Array.from({ length: gaps }, (_, i) => `1/${2 ** (i + 1)}`).join(', ')}.`, `It reaches 1/${den} after ${plural(gaps, 'piece')}.`], gaps),
        ],
        distractors: wrongs(k, [den, den - 1, k + 1, k - 1]),
        operands: [k, den],
        difficulty: d,
      }
    }
    if (t === 4) {
      const nd = den * 2
      return {
        prompt: `{n} adds pieces in a pattern: ${listAnd(p)}. Each piece is half of the one before. What piece comes next? Type a fraction.`,
        visual: sumBar(k),
        input: 'fraction',
        answer: `1/${nd}`,
        strategies: [
          strat('Double the Bottom', [`Half of a piece means twice as many pieces fit in the whole.`, `The bottom numbers go ${Array.from({ length: k }, (_, i) => 2 ** (i + 1)).join(', ')}. Double the last one: ${den} × 2 = ${nd}`, `The next piece is 1/${nd}.`], `1/${den * 2}`, { html: sumBar(k + 1) }),
          strat('Half of the Space Left', [`After these pieces, 1/${den} of the whole is empty.`, `The next piece is half of that space. Two of them fill it: 1/${nd} + 1/${nd} = 1/${den}`, `So the next piece is 1/${nd}.`], frac(1, gapDen * 2)),
        ],
        distractors: [`1/${den + 2}`, `1/${den + 1}`, `1/${den}`, `2/${den}`],
        operands: [k, den],
        difficulty: d,
      }
    }
    return {
      prompt: `${story} How much of ${the} ${ctx.done} in all? Type a fraction.`,
      eq,
      visual: sumBar(k),
      input: 'fraction',
      answer: frac(total, den),
      strategies: [
        strat('Same Size Pieces', [`Change every piece to ${den}ths so they are the same size.`, `${tops.map((x) => `${x}/${den}`).join(' + ')} = ${total}/${den}`], frac(total, den)),
        strat('Look at What Is Left', [`Each piece fills half of the empty space. The space left is as big as the last piece: 1/${gapDen}.`, `Take that away from 1 whole: 1 − 1/${gapDen} = ${gapDen - 1}/${gapDen}`], frac(gapDen - 1, gapDen), { html: sumBar(k) }),
      ],
      // added tops and bottoms, gave what is left, thought it reaches 1, stopped one piece early
      distractors: [`${k}/${sum(Array.from({ length: k }, (_, i) => 2 ** (i + 1)))}`, `1/${den}`, `${den}/${den}`, `${den / 2 - 1}/${den / 2}`],
      operands: [k, den],
      difficulty: d,
    }
  },

  'ca.slope': (rng, d) => {
    const r = R(rng)
    const t = r.pick(d === 1 ? [0, 0, 1] : d === 2 ? [0, 1, 1] : [1, 2, 2, 3])
    const u = r.pick(['feet', 'blocks', 'yards'])
    const thing = r.pick(['skate ramp', 'hill', 'slide', 'roof', 'bike ramp', 'wave'])
    const findM = (rise: number, run: number) => {
      let m = 0
      for (let s = 1; s <= rise; s++) if (s * run === rise) m = s
      return m
    }
    if (t === 2) {
      // which hill is steeper?
      const same = r.chance(0.15)
      const mA = r.int(1, 4)
      let mB = same ? mA : r.int(1, 4)
      if (!same && mB === mA) mB = mA === 4 ? 2 : mA + 1
      // make the less steep hill the taller one when we can: tall is not the same as steep
      let runA = r.int(1, 3),
        runB = r.int(1, 3)
      if (!same && r.chance(0.6)) {
        if (mA > mB) {
          runA = 1
          runB = r.int(Math.min(4, Math.floor(mA / mB) + 1), 4)
        } else {
          runB = 1
          runA = r.int(Math.min(4, Math.floor(mB / mA) + 1), 4)
        }
      }
      if (same && runA === runB) runB = runA === 3 ? 1 : runA + 1
      const A = { rise: mA * runA, run: runA, name: 'A' },
        B = { rise: mB * runB, run: runB, name: 'B' }
      const sA = A.rise / A.run,
        sB = B.rise / B.run
      const ans = sA > sB ? 'Hill A' : sB > sA ? 'Hill B' : 'the same'
      // second way: stretch both to the same distance across
      const across = A.run * B.run
      const upA = A.rise * B.run,
        upB = B.rise * A.run
      return {
        prompt: `Hill A goes up ${A.rise} ${u} and across ${A.run}. Hill B goes up ${B.rise} ${u} and across ${B.run}. Which hill is steeper?`,
        visual: rampPic([A, B], u),
        ...choice(ans, ['Hill A', 'Hill B', 'the same'], rng, true),
        strategies: [
          strat('Up for Each 1 Across', [`Hill A: ${A.rise} ÷ ${A.run} = ${sA} up for each 1 across.`, `Hill B: ${B.rise} ÷ ${B.run} = ${sB} up for each 1 across.`, sA === sB ? `They match. The hills are the same steepness.` : `${Math.max(sA, sB)} is more than ${Math.min(sA, sB)}, so Hill ${sA > sB ? 'A' : 'B'} is steeper.`], sA > sB ? 'Hill A' : sB > sA ? 'Hill B' : 'the same'),
          strat('Make Them the Same Length', [`Stretch both hills to go ${across} across.`, `Hill A would go up ${A.rise} × ${B.run} = ${upA}.`, `Hill B would go up ${B.rise} × ${A.run} = ${upB}.`, upA === upB ? `Same height for the same length: the same.` : `Hill ${upA > upB ? 'A' : 'B'} gets higher in the same length, so it is steeper.`], upA > upB ? 'Hill A' : upB > upA ? 'Hill B' : 'the same'),
        ],
        operands: [A.rise, A.run, B.rise, B.run],
        difficulty: d,
      }
    }
    if (t === 3) {
      // use the steepness to find the height or the length
      const m = r.int(2, 6),
        run = r.int(2, 8)
      const rise = m * run
      const askRise = r.chance()
      const ups = Array.from({ length: run }, (_, i) => (i + 1) * m)
      let count = 0
      for (let h = m; h <= rise; h += m) count++
      return {
        prompt: askRise ? `A ${thing} goes up ${m} ${u} for each 1 across. It is ${run} ${u} across. How high does it go?` : `A ${thing} goes up ${m} ${u} for each 1 across. It is ${rise} ${u} high. How far across is it?`,
        visual: rampPic([{ rise, run, hide: askRise ? 'rise' : 'run' }], u),
        input: 'number',
        answer: askRise ? rise : run,
        unit: u,
        strategies: askRise
          ? [strat('Multiply', [`Each 1 across adds ${m} up. There are ${run} of them.`, `${m} × ${run} = ${rise}`], m * run), strat('Climb the Stairs', [`Count up by ${m} for each 1 across.`, ups.join(', '), `After ${run} across it is ${ups[run - 1]} high.`], ups[run - 1])]
          : [strat('Divide', [`Every ${m} up takes 1 across.`, `How many ${m}s are in ${rise}? ${rise} ÷ ${m} = ${run}`], rise / m), strat('Climb the Stairs', [`Count up by ${m} until you reach ${rise}.`, ups.join(', '), `That took ${count} counts, so it is ${count} across.`], count)],
        distractors: wrongs(askRise ? rise : run, askRise ? [m + run, rise - m, rise + m, run] : [rise - m, rise * m, m, run + 1]),
        operands: [rise, run, m],
        difficulty: d,
      }
    }
    const m = r.int(1, d === 1 ? 3 : 4)
    if (t === 1) {
      // two points on a grid
      const G = 8
      const run = r.int(1, Math.min(4, Math.floor(G / m)))
      const rise = m * run
      const x1 = r.int(0, G - run - 1),
        y1 = r.int(0, G - rise)
      const A: P = [x1, y1],
        B: P = [x1 + run, y1 + rise]
      const dx = B[0] - A[0],
        dy = B[1] - A[1]
      return {
        prompt: `A line goes from A at (${A[0]}, ${A[1]}) to B at (${B[0]}, ${B[1]}). How many squares does it go up for each 1 square across?`,
        visual: slopeGrid(A, B, G, false),
        input: 'number',
        answer: m,
        strategies: [
          strat('Up Divided by Across', [`Across: ${B[0]} − ${A[0]} = ${dx}`, `Up: ${B[1]} − ${A[1]} = ${dy}`, `Up for each 1 across: ${dy} ÷ ${dx} = ${dy / dx}`], dy / dx, { html: slopeGrid(A, B, G, true) }),
          strat('Climb the Stairs', [`Start at A. Step 1 across. Count how far up to get back on the line.`, `Each stair is ${findM(dy, dx)} up. After ${plural(dx, 'stair')}: ${findM(dy, dx)} × ${dx} = ${dy}. You land on B.`], findM(dy, dx)),
        ],
        distractors: wrongs(m, [dy, dx, dy - dx, dy + dx, m + 1]),
        operands: [A[0], A[1], B[0], B[1]],
        difficulty: d,
      }
    }
    const run = r.int(2, d === 1 ? 5 : 8)
    const rise = m * run
    return {
      prompt: r.pick([`A ${thing} goes up ${rise} ${u}. It goes across ${run} ${u}. How many ${u} up for each 1 across?`, `{n} measures a ${thing}. It is ${rise} ${u} high and ${run} ${u} across. How far up does it go for each 1 across?`]),
      visual: rampPic([{ rise, run }], u),
      input: 'number',
      answer: m,
      strategies: [
        strat('Up Divided by Across', [`Steepness is how far up for each 1 across.`, `Share the ${rise} up over the ${run} across: ${rise} ÷ ${run} = ${rise / run}`], rise / run),
        strat('Climb the Stairs', [`Cut the ${thing} into ${run} stairs, each 1 across.`, `Each stair must be ${findM(rise, run)} up, since ${findM(rise, run)} × ${run} = ${rise}.`], findM(rise, run)),
      ],
      distractors: wrongs(m, [rise - run, rise + run, run, rise, m + 1]),
      operands: [rise, run],
      difficulty: d,
    }
  },
}

export const teach: Record<string, string> = {
  'ca.speed': 'Speed tells how far something goes in one second, or one minute. To find it, share the whole distance over the time. That is dividing.',
  'ca.distance': 'If you know the speed, you can find how far. Each second adds the same amount, so multiply the speed by the time.',
  'ca.rate-change': 'Look at the jumps between the numbers in a table. Same jumps mean a steady speed. Growing jumps mean it is speeding up.',
  'ca.graph-read': 'A graph is a picture of numbers. Find the time on the bottom, go up to the dot, then slide left to read how fast or how far.',
  'ca.accumulate': 'On a speed graph, the box under the line shows how far you went. Its height is the speed and its width is the time. Tall times wide is the distance.',
  'ca.accumulate-steps': 'When the speed changes, make one box for each part. Find how far for each box, then add the boxes to get the whole trip.',
  'ca.halving': 'Go half of the way, then half of what is left, again and again. What is left gets tiny very fast, but there is always a little bit left.',
  'ca.limit-sum': 'Add one half, then one fourth, then one eighth, and keep going. The total gets closer and closer to 1 whole, but it never goes past it.',
  'ca.slope': 'Steepness tells how far a hill goes up for each 1 step across. Divide the up by the across. A bigger number means a steeper hill.',
}

export const limits: Record<string, (it: Item) => boolean> = {
  'ca.speed': (it) => (it.input === 'choice' ? KIDS.includes(String(it.answer)) && it.operands.length === 4 : isNum(it) && between(it.answer, 1, 15) && it.operands[1] >= 2 && it.operands[1] <= 12 && it.operands[0] === +it.answer * it.operands[1]) && it.operands.every((x) => x >= 1 && x <= 180),
  'ca.distance': (it) => isNum(it) && between(it.answer, 4, 260) && it.operands[0] >= 2 && it.operands[0] <= 25 && it.operands[1] >= 2 && it.operands[1] <= 9 && +it.answer === it.operands[0] * it.operands[1] + (it.operands[2] || 0),
  'ca.rate-change': (it) => isNum(it) && between(it.answer, 1, 120) && it.operands.length === 5 && it.operands.every((x, i) => x >= 0 && x <= 110 && (i === 0 || x > it.operands[i - 1])),
  'ca.graph-read': (it) => it.operands.length >= 6 && it.operands.every((x) => x >= 0 && x <= 100) && (it.input === 'choice' ? typeof it.answer === 'string' : isNum(it) && between(it.answer, 0, 100)),
  'ca.accumulate': (it) => isNum(it) && it.operands[0] >= 2 && it.operands[0] <= 60 && it.operands[1] >= 2 && it.operands[1] <= 8 && +it.answer === it.operands[0] * it.operands[1],
  'ca.accumulate-steps': (it) => isNum(it) && (it.operands.length === 4 || it.operands.length === 6) && it.operands.every((x) => x >= 1 && x <= 70) && between(it.answer, 1, 800),
  'ca.halving': (it) => it.operands[0] >= 8 && it.operands[0] <= 160 && (it.input === 'choice' ? ['yes', 'no'].includes(String(it.answer)) : isNum(it) && between(it.answer, 1, 160) && +it.answer < it.operands[0]),
  'ca.limit-sum': (it) =>
    it.operands[0] >= 2 &&
    it.operands[0] <= 6 &&
    it.operands[1] === 2 ** it.operands[0] &&
    (it.input === 'fraction' ? /^\d+\/\d+$/.test(String(it.answer)) && +String(it.answer).split('/')[0] < +String(it.answer).split('/')[1] : it.input === 'choice' ? ['yes', 'no'].includes(String(it.answer)) : isNum(it) && between(it.answer, 2, 6)),
  'ca.slope': (it) => it.operands.every((x) => x >= 0 && x <= 48) && (it.input === 'choice' ? ['Hill A', 'Hill B', 'the same'].includes(String(it.answer)) : isNum(it) && between(it.answer, 1, 48)),
}
