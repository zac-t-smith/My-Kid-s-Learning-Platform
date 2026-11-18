import { R, strat, wrongs, choice, fmtN, frac, type Gen, type Item, type Rng, type Difficulty, type Strat } from '../kit'

/* Measurement & Data: time, money, length, graphs, mass and volume, perimeter, area, units, line plots, volume, baseball stats. */

// ───────────────────────── small helpers ─────────────────────────
const pad2 = (m: number) => String(m).padStart(2, '0')
/** "3:05" */
const T = (h: number, m: number) => `${h}:${pad2(m)}`
/** cents → "1.75" */
const money = (c: number) => `${Math.floor(c / 100)}.${pad2(c % 100)}`
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const skips = (by: number, n: number) => Array.from({ length: n }, (_, i) => by * (i + 1))
const upTo = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const list = (xs: number[]) => xs.map(fmtN).join(', ')
const plus = (xs: number[]) => xs.map(fmtN).join(' + ')
const pl = (n: number, one: string, many: string) => `${fmtN(n)} ${n === 1 ? one : many}`
const NAMES = ['{n}', '{n}', 'Mia', 'Leo', 'Sam', 'Ava', 'Ben', 'Zoe']
const DEC = /^\d+(\.\d{1,3})?$/
/** Wrong decimal answers: valid strings, different in value from the answer and from each other. */
function decWrongs(ans: string, cands: string[], fallback: string): string[] {
  const out: string[] = []
  for (const c of cands) if (DEC.test(c) && Number(c) !== Number(ans) && !out.some((o) => Number(o) === Number(c))) out.push(c)
  return out.length ? out : [fallback]
}

// ───────────────────────── pictures ─────────────────────────
const INK = '#1d2b36'
const svg = (w: number, h: number, max: number, inner: string, label: string) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" style="width:100%;max-width:${max}px;display:block;margin:0 auto">${inner}</svg>`
const tx = (x: number, y: number, s: string | number, size = 16, fill = INK, anchor = 'middle', extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${fill}"${extra}>${s}</text>`
const f1 = (v: number) => Math.round(v * 10) / 10

/** Analog clock. The hour hand sits between the numbers by the minutes. */
function clockSVG(h: number, m: number, max = 230): string {
  const c = 110
  const pt = (deg: number, rad: number) => [f1(c + rad * Math.sin((deg * Math.PI) / 180)), f1(c - rad * Math.cos((deg * Math.PI) / 180))]
  let s = `<circle cx="${c}" cy="${c}" r="102" fill="#ffffff" stroke="#37474f" stroke-width="6"/>`
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0
    const [x1, y1] = pt(i * 6, big ? 86 : 91)
    const [x2, y2] = pt(i * 6, 97)
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${big ? '#37474f' : '#90a4ae'}" stroke-width="${big ? 3 : 1.5}"/>`
  }
  const [hx, hy] = pt(((h % 12) + m / 60) * 30, 46)
  const [mx, my] = pt(m * 6, 82)
  s += `<line x1="${c}" y1="${c}" x2="${hx}" y2="${hy}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`
  s += `<line x1="${c}" y1="${c}" x2="${mx}" y2="${my}" stroke="#d84315" stroke-width="5" stroke-linecap="round"/>`
  s += `<circle cx="${c}" cy="${c}" r="7" fill="${INK}"/>`
  for (let n = 1; n <= 12; n++) {
    const [x, y] = pt(n * 30, 70)
    s += tx(x, y + 7, n, 21, INK, 'middle', ' stroke="#ffffff" stroke-width="5" paint-order="stroke" stroke-linejoin="round"')
  }
  return svg(220, 220, max, s, 'clock')
}
const twoClocks = (a: [number, number], b: [number, number]) =>
  `<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap">${[
    ['Start', a],
    ['End', b],
  ]
    .map(([t, [h, m]]) => `<div style="flex:1 1 130px;max-width:180px;text-align:center;font-weight:700;font-size:17px;color:${INK}">${t}${clockSVG(h as number, m as number, 180)}</div>`)
    .join('')}</div>`

const COIN: Record<number, { r: number; fill: string; stroke: string; ink: string }> = {
  25: { r: 30, fill: '#cfd8dc', stroke: '#455a64', ink: INK },
  10: { r: 19, fill: '#eceff1', stroke: '#455a64', ink: INK },
  5: { r: 25, fill: '#b0bec5', stroke: '#37474f', ink: INK },
  1: { r: 22, fill: '#a9571f', stroke: '#6d3410', ink: '#ffffff' },
}
/** Dollar bills (if any) and coins, each coin labelled with its value. */
function moneySVG(bills: number, coins: number[]): string {
  const per = 7,
    cw = 66
  const W = Math.max(Math.min(coins.length, per) * cw, bills * 106, 140) + 12
  let y = 6,
    s = ''
  for (let i = 0; i < bills; i++) {
    s += `<rect x="${6 + i * 106}" y="${y}" width="98" height="48" rx="6" fill="#c8e6c9" stroke="#2e7d32" stroke-width="3"/>` + tx(6 + i * 106 + 49, y + 31, '$1', 22, '#1b5e20')
  }
  if (bills) y += 58
  coins.forEach((v, i) => {
    const k = COIN[v]
    const cx = 6 + (i % per) * cw + cw / 2,
      cy = y + Math.floor(i / per) * 66 + 33
    s += `<circle cx="${cx}" cy="${cy}" r="${k.r}" fill="${k.fill}" stroke="${k.stroke}" stroke-width="3"/>` + tx(cx, cy + 6, `${v}¢`, v === 10 ? 15 : 18, k.ink)
  })
  const H = y + Math.ceil(coins.length / per) * 66 + 6
  return svg(W, H, Math.min(480, Math.round(W * 1.1)), s, 'money')
}

/** A ruler with one thing lying on it from `start` to `end`. */
function rulerSVG(start: number, end: number, maxU: number, unit: string, name: string, color: string): string {
  const u = 500 / maxU
  const x = (v: number) => f1(30 + v * u)
  let s = `<rect x="${x(start)}" y="26" width="${f1((end - start) * u)}" height="30" rx="8" fill="${color}" stroke="${INK}" stroke-width="2.5"/>`
  s += tx(Math.min(480, Math.max(80, f1((x(start) + x(end)) / 2))), 19, name, 20)
  for (const v of [start, end]) s += `<line x1="${x(v)}" y1="26" x2="${x(v)}" y2="76" stroke="#d84315" stroke-width="2" stroke-dasharray="5 4"/>`
  s += `<rect x="14" y="76" width="532" height="62" rx="6" fill="#ffe082" stroke="#8d6e63" stroke-width="2.5"/>`
  for (let v = 0; v <= maxU; v++) {
    s += `<line x1="${x(v)}" y1="76" x2="${x(v)}" y2="100" stroke="${INK}" stroke-width="2.5"/>` + tx(x(v), 124, v, 20)
    if (v < maxU) s += `<line x1="${f1(x(v) + u / 2)}" y1="76" x2="${f1(x(v) + u / 2)}" y2="90" stroke="#5d4037" stroke-width="1.5"/>`
  }
  s += tx(280, 162, unit, 20, '#5d4037')
  return svg(560, 168, 560, s, 'ruler')
}

/** Two or three labelled bars drawn to scale (for comparing lengths). */
function lengthBarsSVG(rows: { name: string; len: number; color: string }[], unit: string): string {
  const mx = Math.max(...rows.map((r) => r.len))
  let s = ''
  rows.forEach((r, i) => {
    const y = 8 + i * 62
    const w = f1(Math.max(24, (r.len / mx) * 300))
    s += tx(10, y + 16, r.name, 18, INK, 'start')
    s += `<rect x="10" y="${y + 24}" width="${w}" height="24" rx="6" fill="${r.color}" stroke="${INK}" stroke-width="2.5"/>`
    s += tx(10 + w + 10, y + 43, `${fmtN(r.len)} ${unit}`, 18, INK, 'start')
  })
  return svg(440, 8 + rows.length * 62, 440, s, 'lengths')
}

const BAR_COLORS = ['#ef5350', '#42a5f5', '#66bb6a', '#ffa726', '#ab47bc']
/** Bar graph. `step` is what each line on the side counts by. */
function barGraphSVG(title: string, labels: string[], values: number[], step: number, top: number): string {
  const x0 = 58,
    x1 = 428,
    yB = 246,
    yT = 46
  const y = (v: number) => f1(yB - (v / top) * (yB - yT))
  let s = tx(240, 24, title, 20)
  for (let v = 0; v <= top; v += step) {
    s += `<line x1="${x0}" y1="${y(v)}" x2="${x1}" y2="${y(v)}" stroke="${v ? '#b0bec5' : INK}" stroke-width="${v ? 1.5 : 3}"/>` + tx(x0 - 8, y(v) + 6, fmtN(v), 17, INK, 'end')
  }
  s += `<line x1="${x0}" y1="${yT - 6}" x2="${x0}" y2="${yB}" stroke="${INK}" stroke-width="3"/>`
  const bw = (x1 - x0) / labels.length
  labels.forEach((L, i) => {
    const bx = f1(x0 + i * bw + bw * 0.2)
    s += `<rect x="${bx}" y="${y(values[i])}" width="${f1(bw * 0.6)}" height="${f1(yB - y(values[i]))}" fill="${BAR_COLORS[i % 5]}" stroke="${INK}" stroke-width="2.5"/>`
    s += tx(f1(x0 + i * bw + bw / 2), yB + 24, L, 17)
  })
  return svg(440, 280, 460, s, 'bar graph')
}

/** Picture graph: `halves[i]` half-pictures in row i, with a key underneath. */
function pictureGraphSVG(title: string, labels: string[], halves: number[], key: string): string {
  const rowH = 40,
    lx = 104
  let s = tx(210, 24, title, 18)
  const yEnd = 38 + labels.length * rowH
  labels.forEach((L, i) => {
    const cy = 38 + i * rowH + rowH / 2
    s += `<line x1="8" y1="${cy + rowH / 2}" x2="412" y2="${cy + rowH / 2}" stroke="#cfd8dc" stroke-width="1.5"/>`
    s += tx(lx - 12, cy + 6, L, 18, INK, 'end')
    for (let k = 0; k < Math.ceil(halves[i] / 2); k++) {
      const cx = lx + 18 + k * 36
      const half = k * 2 + 1 === halves[i]
      s += half
        ? `<path d="M${cx} ${cy - 14} A14 14 0 0 0 ${cx} ${cy + 14} Z" fill="#fb8c00" stroke="${INK}" stroke-width="2.5"/>`
        : `<circle cx="${cx}" cy="${cy}" r="14" fill="#fb8c00" stroke="${INK}" stroke-width="2.5"/>`
    }
  })
  s += `<line x1="${lx}" y1="36" x2="${lx}" y2="${yEnd}" stroke="${INK}" stroke-width="3"/>`
  s += `<rect x="70" y="${yEnd + 10}" width="280" height="38" rx="8" fill="#ffffff" stroke="${INK}" stroke-width="2"/>`
  s += `<circle cx="96" cy="${yEnd + 29}" r="12" fill="#fb8c00" stroke="${INK}" stroke-width="2.5"/>` + tx(118, yEnd + 35, `= ${key}`, 18, INK, 'start')
  return svg(420, yEnd + 56, 440, s, 'picture graph')
}

const QSYM = ['', '¼', '½', '¾']
/** Label for a number of quarters: "2½". */
const qLabel = (q: number) => `${Math.floor(q / 4)}${QSYM[q % 4]}`
/** Words for a number of quarters: "2 and 1/2". */
const qWords = (q: number) => (q % 4 ? `${Math.floor(q / 4)} and ${q % 4 === 2 ? '1/2' : `${q % 4}/4`}` : `${q / 4}`)

/** Line plot: X marks stacked above a number line. */
function linePlotSVG(title: string, tickLabels: string[], counts: number[]): string {
  const n = tickLabels.length
  const mx = Math.max(...counts, 3)
  const H = 76 + mx * 26 + 62
  const yB = 76 + mx * 26 - 20
  const x = (i: number) => f1(50 + (i * 380) / (n - 1))
  let s = tx(240, 24, title, 18)
  s += `<line x1="24" y1="${yB}" x2="456" y2="${yB}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
  tickLabels.forEach((L, i) => {
    s += `<line x1="${x(i)}" y1="${yB - 8}" x2="${x(i)}" y2="${yB + 8}" stroke="${INK}" stroke-width="3"/>` + tx(x(i), yB + 32, L, 20)
    for (let k = 0; k < counts[i]; k++) {
      const cy = yB - 24 - k * 26
      s += `<path d="M${f1(x(i) - 8)} ${cy - 8} L${f1(x(i) + 8)} ${cy + 8} M${f1(x(i) + 8)} ${cy - 8} L${f1(x(i) - 8)} ${cy + 8}" stroke="#c62828" stroke-width="4" stroke-linecap="round"/>`
    }
  })
  s += tx(240, yB + 58, 'inches', 18, '#455a64')
  return svg(480, H, 480, s, 'line plot')
}

interface RectOpts {
  grid?: boolean
  top?: string
  bottom?: string
  left?: string
  right?: string
  fill?: string
  cell?: number
  caption?: string
}
/** Rectangle with side labels, or made of unit squares. */
function rectSVG(w: number, h: number, o: RectOpts = {}): string {
  let pw: number, ph: number
  if (o.grid) {
    const cell = o.cell ?? Math.min(36, 300 / w, 190 / h)
    pw = w * cell
    ph = h * cell
  } else {
    const ratio = Math.min(2.6, Math.max(0.5, w / h))
    if (ratio >= 250 / 150) [pw, ph] = [250, 250 / ratio]
    else [pw, ph] = [150 * ratio, 150]
  }
  pw = f1(pw)
  ph = f1(ph)
  const mx = o.left || o.right ? 92 : 12,
    mt = (o.top ? 30 : 10) + (o.caption ? 24 : 0),
    mb = o.bottom ? 32 : 10
  let s = o.caption ? tx(mx + pw / 2, 20, o.caption, 17) : ''
  s += `<rect x="${mx}" y="${mt}" width="${pw}" height="${ph}" fill="${o.fill ?? '#bbdefb'}" stroke="${INK}" stroke-width="3"/>`
  if (o.grid) {
    for (let i = 1; i < w; i++) s += `<line x1="${f1(mx + (i * pw) / w)}" y1="${mt}" x2="${f1(mx + (i * pw) / w)}" y2="${mt + ph}" stroke="${INK}" stroke-width="1.5"/>`
    for (let j = 1; j < h; j++) s += `<line x1="${mx}" y1="${f1(mt + (j * ph) / h)}" x2="${mx + pw}" y2="${f1(mt + (j * ph) / h)}" stroke="${INK}" stroke-width="1.5"/>`
  }
  if (o.top) s += tx(mx + pw / 2, mt - 9, o.top, 17)
  if (o.bottom) s += tx(mx + pw / 2, mt + ph + 23, o.bottom, 17)
  if (o.left) s += tx(mx - 9, mt + ph / 2 + 6, o.left, 17, INK, 'end')
  if (o.right) s += tx(mx + pw + 9, mt + ph / 2 + 6, o.right, 17, INK, 'start')
  const W = f1(pw + mx * 2)
  return svg(W, f1(ph + mt + mb), Math.min(460, Math.round(W * 1.15)), s, 'rectangle')
}

/** An L shape on a grid: R rows by C columns with the top-right corner (r2 by c2) missing. */
function lShapeSVG(Rr: number, C: number, r2: number, c2: number): string {
  const cell = Math.min(36, 320 / C, 200 / Rr)
  let s = ''
  for (let i = 0; i < Rr; i++)
    for (let j = 0; j < C; j++)
      if (!(i < r2 && j >= C - c2)) s += `<rect x="${f1(10 + j * cell)}" y="${f1(10 + i * cell)}" width="${f1(cell)}" height="${f1(cell)}" fill="#c8e6c9" stroke="${INK}" stroke-width="2"/>`
  const W = f1(C * cell + 20)
  return svg(W, f1(Rr * cell + 20), Math.min(420, Math.round(W * 1.15)), s, 'shape made of squares')
}

function triangleSVG(a: string, b: string, c: string): string {
  const s =
    `<polygon points="70,170 290,170 150,36" fill="#ffe0b2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    tx(180, 194, a, 17) +
    tx(98, 100, b, 17, INK, 'end') +
    tx(234, 100, c, 17, INK, 'start')
  return svg(360, 204, 360, s, 'triangle')
}
function polygonSVG(n: number, label: string): string {
  const pts: [number, number][] = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n + Math.PI / n
    return [f1(150 + 84 * Math.sin(a)), f1(104 + 84 * Math.cos(a))]
  })
  // points 0 and n-1 make the flat bottom side
  const s =
    `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="#e1bee7" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    tx(150, Math.max(pts[0][1], pts[n - 1][1]) + 22, label, 17) +
    tx(150, 110, 'all sides', 15, '#4a148c') +
    tx(150, 128, 'the same', 15, '#4a148c')
  return svg(300, 222, 300, s, 'shape with equal sides')
}

/** A block built from unit cubes: l across, w deep, h tall. */
function cubesSVG(l: number, w: number, h: number): string {
  const s = 34,
    dx = 20,
    dy = 14
  const W = l * s + w * dx + 16,
    H = h * s + w * dy + 16
  let out = ''
  const face = (pts: number[][], fill: string) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" stroke="#4e342e" stroke-width="2" stroke-linejoin="round"/>`
  for (let y = w - 1; y >= 0; y--)
    for (let z = 0; z < h; z++)
      for (let x = 0; x < l; x++) {
        const fx = 8 + x * s + y * dx,
          fy = H - 8 - z * s - y * dy
        if (z === h - 1) out += face([[fx, fy - s], [fx + dx, fy - s - dy], [fx + s + dx, fy - s - dy], [fx + s, fy - s]], '#ffe0b2')
        if (x === l - 1) out += face([[fx + s, fy], [fx + s + dx, fy - dy], [fx + s + dx, fy - s - dy], [fx + s, fy - s]], '#fb8c00')
        if (y === 0) out += face([[fx, fy], [fx + s, fy], [fx + s, fy - s], [fx, fy - s]], '#ffb74d')
      }
  return svg(W, H, Math.min(380, Math.round(W * 1.3)), out, 'block of cubes')
}

/** A plain box with its three sizes written on it. */
function boxSVG(l: number, w: number, h: number, unit: string, hLabel?: string): string {
  const fw = Math.min(230, 70 + 14 * l),
    fh = Math.min(170, 50 + 14 * h),
    dx = Math.min(90, 26 + 7 * w),
    dy = f1(dx * 0.6)
  const x0 = 104,
    y0 = 20 + dy + fh
  const P = (pts: number[][], fill: string) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
  let s = P([[x0, y0], [x0 + fw, y0], [x0 + fw, y0 - fh], [x0, y0 - fh]], '#b3e5fc')
  s += P([[x0, y0 - fh], [x0 + dx, y0 - fh - dy], [x0 + fw + dx, y0 - fh - dy], [x0 + fw, y0 - fh]], '#e1f5fe')
  s += P([[x0 + fw, y0], [x0 + fw + dx, y0 - dy], [x0 + fw + dx, y0 - fh - dy], [x0 + fw, y0 - fh]], '#4fc3f7')
  s += tx(x0 + fw / 2, y0 + 24, `${l} ${unit}`, 17)
  s += tx(x0 - 8, y0 - fh / 2 + 6, hLabel ?? `${h} ${unit}`, 17, INK, 'end')
  s += tx(x0 + fw + dx / 2 + 12, y0 - dy / 2 + 20, `${w} ${unit}`, 17, INK, 'start')
  const W = x0 + fw + dx + 96
  return svg(W, y0 + 36, Math.min(440, W), s, 'box')
}

/** Measuring cup, 0 to 1,000 mL, a line every 100. */
function cupSVG(level: number, labelEvery: number): string {
  const yB = 262,
    yT = 42
  const y = (v: number) => f1(yB - (v / 1000) * (yB - yT))
  let s = `<rect x="92" y="${y(level)}" width="116" height="${f1(yB - y(level))}" fill="#4fc3f7"/>`
  s += `<path d="M92 22 L92 ${yB} Q92 270 100 270 L200 270 Q208 270 208 ${yB} L208 22" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
  for (let v = 100; v <= 1000; v += 100) {
    const lab = v % labelEvery === 0
    s += `<line x1="92" y1="${y(v)}" x2="${lab ? 132 : 116}" y2="${y(v)}" stroke="${INK}" stroke-width="${lab ? 3 : 2}"/>`
    if (lab) s += tx(84, y(v) + 6, fmtN(v), 16, INK, 'end')
  }
  s += tx(250, 36, 'mL', 17, '#455a64')
  return svg(300, 282, 280, s, 'measuring cup')
}

/** Scoreboard: runs in each game. */
function scoreSVG(team: string, runs: number[]): string {
  const cw = 54,
    lw = 84
  const W = lw + runs.length * cw + 16
  let s = `<rect x="4" y="4" width="${W - 8}" height="112" rx="10" fill="#1b5e20" stroke="${INK}" stroke-width="3"/>`
  s += tx(W / 2, 28, team, 17, '#ffffff')
  s += tx(16, 60, 'Game', 16, '#fff59d', 'start') + tx(16, 98, 'Runs', 16, '#fff59d', 'start')
  runs.forEach((v, i) => {
    const cx = lw + i * cw + cw / 2 + 4
    s += tx(cx, 60, i + 1, 16, '#fff59d')
    s += `<rect x="${cx - 21}" y="72" width="42" height="36" rx="5" fill="#0d3b12" stroke="#a5d6a7" stroke-width="1.5"/>` + tx(cx, 98, v, 22, '#ffffff')
  })
  return svg(W, 120, Math.min(460, Math.round(W * 1.1)), s, 'scoreboard')
}

// ───────────────────────── time ─────────────────────────
const CLOCK_CTX = [
  'Game time!',
  'Batting practice starts now.',
  'Surf class starts now.',
  'Dance class starts now.',
  'The jump park opens now.',
  '{n} looks at the clock.',
  'Time to build bricks.',
  'Snack time!',
  'The bus comes now.',
  'Puzzle time!',
  'The team bus leaves now.',
  'Time to warm up.',
]
type ClockKind = 'time' | 'minutes' | 'hour' | 'until'
function clockItem(rng: Rng, d: Difficulty, h: number, m: number, kind: ClockKind, simple = false): Item {
  const r = R(rng)
  const ctx = r.pick(CLOCK_CTX)
  const k5 = Math.floor(m / 5),
    extra = m % 5,
    nh = (h % 12) + 1,
    ph = h === 1 ? 12 : h - 1
  const hourStep =
    m === 0
      ? `The short hand points right at the ${h}. The hour is ${h}.`
      : m < 30
        ? `The short hand is a little past the ${h}. The hour is ${h}.`
        : `The short hand is between ${h} and ${nh}. It has not reached ${nh} yet, so the hour is still ${h}.`
  // way 1: big numbers count by fives, then little marks
  const minSteps =
    m === 0
      ? ['The long hand points at the 12. That means 0 minutes.']
      : k5 === 0
        ? [`The long hand is ${extra} little ${extra === 1 ? 'mark' : 'marks'} past the 12. Each little mark is 1 minute.`]
        : [
            extra ? `The long hand is ${extra} little ${extra === 1 ? 'mark' : 'marks'} past the ${k5}.` : `The long hand points at the ${k5}.`,
            `Each big number is 5 minutes: ${k5} × 5 = ${k5 * 5}`,
            ...(extra ? [`Add the little marks: ${k5 * 5} + ${extra} = ${k5 * 5 + extra}`] : []),
          ]
  const minA = k5 * 5 + extra
  // way 2: start from a corner of the clock (12, 3, 6, 9)
  const base = [0, 15, 30, 45, 60].reduce((b, v) => (Math.abs(v - m) < Math.abs(b - m) ? v : b), 0)
  const diff = m - base
  const corner: Record<number, string> = {
    0: 'When the long hand is on the 12, the hour is just starting: 0 minutes.',
    15: 'The 3 is a quarter of the way around: 15 minutes.',
    30: 'The 6 is halfway around: 30 minutes.',
    45: 'The 9 is three quarters of the way around: 45 minutes.',
    60: 'All the way around, back to the 12, is 60 minutes.',
  }
  const cornerSteps = [
    corner[base],
    diff === 0 ? 'The long hand is right on that spot.' : diff > 0 ? `The long hand is ${diff} past that spot: ${base} + ${diff} = ${base + diff}` : `The long hand is ${-diff} before that spot: ${base} − ${-diff} = ${base + diff}`,
  ]
  const minB = base + diff
  const common = { visual: clockSVG(h, m), operands: [h, m], difficulty: d }
  if (kind === 'until') {
    const toTen = (10 - (m % 10)) % 10
    const left = 60 - m
    return {
      prompt: `${ctx} How many minutes until ${nh} o'clock?`,
      input: 'number',
      answer: left,
      unit: 'minutes',
      strategies: [
        strat('Take Away From 60', [...minSteps, `It is ${minA} minutes after ${h}.`, `An hour has 60 minutes: 60 − ${minA} = ${60 - minA}`], 60 - minA),
        strat(
          'Count Up to 60',
          toTen && m + toTen < 60
            ? [`It is ${m} minutes after ${h}. Hop ${toTen} to get to ${m + toTen}.`, `Then hop ${60 - m - toTen} more to 60.`, `${toTen} + ${60 - m - toTen} = ${toTen + (60 - m - toTen)}`]
            : [`It is ${m} minutes after ${h}.`, `Count up from ${m} to 60. That is ${60 - m} minutes.`],
          toTen && m + toTen < 60 ? toTen + (60 - m - toTen) : 60 - m,
          { line: toTen && m + toTen < 60 ? [m, m + toTen, 60] : [m, 60] },
        ),
      ],
      distractors: wrongs(left, [m, left + 10, 100 - m, left - 10, 60 - k5]),
      ...common,
    }
  }
  if (kind === 'minutes')
    return {
      prompt: `${ctx} The hour is ${h}. How many minutes after ${h} o'clock is it?`,
      input: 'number',
      answer: m,
      unit: 'minutes',
      strategies: [strat('Count by Fives', [...minSteps, `It is ${minA} minutes after ${h}.`], minA), strat('Use a Corner of the Clock', [...cornerSteps, `It is ${minB} minutes after ${h}.`], minB)],
      distractors: wrongs(m, [k5, extra ? k5 * 5 : m + 5, extra ? k5 + extra : m - 5, 60 - m, h * 5]),
      ...common,
    }
  if (kind === 'hour')
    return {
      prompt: `${ctx} The short hand shows the hour. What hour is it?`,
      input: 'number',
      answer: h,
      strategies: [
        strat('Look at the Short Hand', [hourStep, 'The long hand shows minutes. It does not change the hour.'], h),
        strat(
          'Which Number Did It Pass?',
          m === 0
            ? ['The long hand is on the 12. So it is right on the hour.', `The short hand points at the ${ph === 12 ? 1 : ph + 1}.`]
            : ['The short hand goes around slowly, from one number to the next.', `The next number is ${nh}. It is not there yet.`, `The number just before ${nh} is ${ph === 12 ? 1 : ph + 1}. That is the hour.`],
          ((nh + 10) % 12) + 1,
        ),
      ],
      distractors: wrongs(h, [nh, k5 || 12, ph]),
      ...common,
    }
  const ans = T(h, m)
  const cands = (simple ? [T(nh, m), T(h, 30 - m), T(ph, m), T(nh, 30 - m)] : [
    ...(m > 0 ? [T(nh, m)] : []),
    ...(m % 5 === 0 && m > 0 ? [T(m / 5, (h * 5) % 60), T(h, m / 5)] : []),
    ...(m === 0 ? [T(12, (h * 5) % 60), T(h, 30)] : []),
    ...(extra ? [T(h, k5 * 5), T(h, k5 + extra)] : []),
    ...(m === 30 ? [T(h, 0)] : []),
    T(ph, m),
    T(nh, (m + 30) % 60),
  ]).filter((x) => x !== ans)
  return {
    prompt: `${ctx} What time does the clock show?`,
    ...choice(ans, cands, rng),
    strategies: [
      strat('Short Hand, Then Long Hand', [hourStep, ...minSteps, `The time is ${T(h, minA)}.`], T(h, minA)),
      strat('Use a Corner of the Clock', [...cornerSteps, `The hour is ${h}, so the time is ${T(h, minB)}.`], T(h, minB)),
    ],
    ...common,
  }
}
const clockLimit = (ok: (m: number) => boolean) => (it: Item) =>
  (it.input === 'choice' || it.input === 'number') && it.operands.length === 2 && it.operands[0] >= 1 && it.operands[0] <= 12 && it.operands[1] >= 0 && it.operands[1] <= 59 && ok(it.operands[1]) && !!it.visual

const EVENTS = ['Batting practice', 'The ball game', 'Surf class', 'Dance class', 'Puzzle club', 'Brick club', 'Jump time', 'Swim time', 'The team picnic']

// ───────────────────────── graphs data ─────────────────────────
interface DS {
  title: string
  noun: string
  labels: string[]
  one: (L: string) => string
  more: (A: string, B: string) => string
  both: (A: string, B: string) => string
  most: string
  least: string
  all: string
}
const DATASETS: DS[] = [
  {
    title: 'Hits This Week',
    noun: 'hits',
    labels: ['Mia', 'Leo', 'Sam', 'Ava', 'Ben'],
    one: (L) => `How many hits did ${L} get?`,
    more: (A, B) => `How many more hits did ${A} get than ${B}?`,
    both: (A, B) => `How many hits did ${A} and ${B} get in all?`,
    most: 'Who got the most hits?',
    least: 'Who got the fewest hits?',
    all: 'How many hits in all?',
  },
  {
    title: 'Favorite Sport',
    noun: 'kids',
    labels: ['Baseball', 'Soccer', 'Surfing', 'Dance'],
    one: (L) => `How many kids picked ${L}?`,
    more: (A, B) => `How many more kids picked ${A} than ${B}?`,
    both: (A, B) => `How many kids picked ${A} or ${B}?`,
    most: 'Which one did the most kids pick?',
    least: 'Which one did the fewest kids pick?',
    all: 'How many kids voted in all?',
  },
  {
    title: 'Bricks in the Bin',
    noun: 'bricks',
    labels: ['Red', 'Blue', 'Green', 'Yellow'],
    one: (L) => `How many ${L} bricks are there?`,
    more: (A, B) => `How many more ${A} bricks than ${B} bricks?`,
    both: (A, B) => `How many ${A} and ${B} bricks in all?`,
    most: 'Which color has the most bricks?',
    least: 'Which color has the fewest bricks?',
    all: 'How many bricks in all?',
  },
  {
    title: 'Home Runs',
    noun: 'home runs',
    labels: ['Sharks', 'Bears', 'Owls', 'Tigers'],
    one: (L) => `How many home runs did the ${L} hit?`,
    more: (A, B) => `How many more home runs did the ${A} hit than the ${B}?`,
    both: (A, B) => `How many home runs did the ${A} and the ${B} hit in all?`,
    most: 'Which team hit the most home runs?',
    least: 'Which team hit the fewest home runs?',
    all: 'How many home runs in all?',
  },
  {
    title: 'Waves Caught',
    noun: 'waves',
    labels: ['Mon', 'Tue', 'Wed', 'Thu'],
    one: (L) => `How many waves on ${L}?`,
    more: (A, B) => `How many more waves on ${A} than on ${B}?`,
    both: (A, B) => `How many waves on ${A} and ${B} in all?`,
    most: 'Which day had the most waves?',
    least: 'Which day had the fewest waves?',
    all: 'How many waves in all?',
  },
]
/** n different whole numbers from lo..hi */
function distinct(r: ReturnType<typeof R>, n: number, lo: number, hi: number): number[] {
  return r.shuffle(upTo(lo, hi)).slice(0, n)
}

// add / subtract strategy pairs used by several stories
function addStrats(a: number, b: number): Strat[] {
  const ta = a - (a % 10),
    tb = b - (b % 10)
  return [
    a < 10 || b < 10 || (a % 10 === 0 && b % 10 === 0)
      ? strat('Count On', [`Start at the bigger number, ${fmtN(Math.max(a, b))}.`, `Count on ${fmtN(Math.min(a, b))} more.`, `${fmtN(Math.max(a, b))} + ${fmtN(Math.min(a, b))} = ${fmtN(Math.max(a, b) + Math.min(a, b))}`], Math.max(a, b) + Math.min(a, b))
      : strat('Tens and Ones', [`Tens: ${fmtN(ta)} + ${fmtN(tb)} = ${fmtN(ta + tb)}`, `Ones: ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}`, `${fmtN(ta + tb)} + ${(a % 10) + (b % 10)} = ${fmtN(ta + tb + (a % 10) + (b % 10))}`], ta + tb + (a % 10) + (b % 10)),
    strat(
      'Hop on a Number Line',
      tb && b % 10 ? [`Start at ${fmtN(a)}. Hop ${fmtN(tb)} to ${fmtN(a + tb)}.`, `Then hop ${b % 10} more.`, `${fmtN(a + tb)} + ${b % 10} = ${fmtN(a + tb + (b % 10))}`] : [`Start at ${fmtN(a)}.`, `Hop ${fmtN(b)} to land on ${fmtN(a + b)}.`],
      tb && b % 10 ? a + tb + (b % 10) : a + b,
      { line: tb && b % 10 ? [a, a + tb, a + b] : [a, a + b] },
    ),
  ]
}
function subStrats(a: number, b: number): Strat[] {
  // count up: to the next ten, then the next hundred, then the rest
  const stops = [b]
  let cur = b
  if (cur % 10 && cur + (10 - (cur % 10)) < a) stops.push((cur += 10 - (cur % 10)))
  if (cur % 100 && cur + (100 - (cur % 100)) < a) stops.push((cur += 100 - (cur % 100)))
  stops.push(a)
  const hops = stops.slice(1).map((v, i) => v - stops[i])
  const up =
    hops.length === 1
      ? [`Start at ${fmtN(b)}.`, `Count up to ${fmtN(a)}. That is ${fmtN(hops[0])}.`]
      : [...hops.map((h, i) => (i === 0 ? `Start at ${fmtN(b)}. Hop ${fmtN(h)} to get to ${fmtN(stops[1])}.` : `Then hop ${fmtN(h)} more to ${fmtN(stops[i + 1])}.`)), `${plus(hops)} = ${fmtN(sum(hops))}`]
  // take away: hundreds, then tens, then ones
  const parts: [number, string][] = (
    [
      [b - (b % 100), 'hundreds'],
      [(b % 100) - (b % 10), 'tens'],
      [b % 10, 'ones'],
    ] as [number, string][]
  ).filter(([v]) => v > 0)
  let left = a
  const down = parts.length > 1 ? parts.map(([v, nm]) => `Take away the ${nm}: ${fmtN(left)} − ${fmtN(v)} = ${fmtN((left -= v))}`) : [`Take ${fmtN(b)} away from ${fmtN(a)}.`, `${fmtN(a)} − ${fmtN(b)} = ${fmtN((left -= b))}`]
  return [strat('Count Up', up, sum(hops), { line: stops }), strat('Take It Away in Parts', down, left)]
}
/** adding hundreds-size numbers (grams, mL) */
function addBig(a: number, b: number): Strat[] {
  const ha = a - (a % 100),
    hb = b - (b % 100),
    ra = a % 100,
    rb = b % 100
  return [
    strat('Hundreds First', [`Hundreds: ${ha} + ${hb} = ${ha + hb}`, `The rest: ${ra} + ${rb} = ${ra + rb}`, `${ha + hb} + ${ra + rb} = ${fmtN(ha + hb + ra + rb)}`], ha + hb + ra + rb),
    strat(
      'Hop on a Number Line',
      hb && rb ? [`Start at ${a}. Hop ${hb} to ${a + hb}.`, `Then hop ${rb} more.`, `${a + hb} + ${rb} = ${fmtN(a + hb + rb)}`] : [`Start at ${a}.`, `Hop ${b} to land on ${fmtN(a + b)}.`],
      hb && rb ? a + hb + rb : a + b,
      { line: hb && rb ? [a, a + hb, a + b] : [a, a + b] },
    ),
  ]
}

// ───────────────────────── shared lists ─────────────────────────
const MEASURE_THINGS: [string, string][] = [
  ['pencil', '#fdd835'],
  ['crayon', '#ef5350'],
  ['toy bat', '#bcaaa4'],
  ['brick', '#42a5f5'],
  ['ribbon', '#f48fb1'],
  ['toy car', '#66bb6a'],
  ['marker', '#ab47bc'],
  ['straw', '#ffa726'],
]
const COMPARE_PAIRS: [string, string, string][] = [
  ['red rope', 'blue rope', 'feet'],
  ['green ribbon', 'yellow ribbon', 'inches'],
  ['red brick train', 'blue brick train', 'cm'],
  ['long hose', 'short hose', 'feet'],
  ['white string', 'black string', 'cm'],
  ['kite tail', 'jump rope', 'inches'],
  ['red snake', 'green snake', 'cm'],
  ['top fence', 'side fence', 'feet'],
]
const SHAPE_UNITS = ['feet', 'inches', 'cm', 'meters', 'yards']
const AREA_THINGS: [string, string][] = [
  ['rug', 'feet'],
  ['garden', 'meters'],
  ['dance floor', 'feet'],
  ['poster', 'inches'],
  ['brick plate', 'cm'],
  ['tarp', 'yards'],
  ['sandbox', 'feet'],
  ['sticker sheet', 'cm'],
  ['photo', 'inches'],
  ['parking lot', 'meters'],
]
const TEAMS = ['Sharks', 'Bears', 'Owls', 'Tigers', 'Rockets', 'Waves', 'Hawks', 'Comets']

const CONV: { big: [string, string]; small: [string, string]; f: number; story: (n: string) => string }[] = [
  { big: ['foot', 'feet'], small: ['inch', 'inches'], f: 12, story: (n) => `A surfboard is ${n} long.` },
  { big: ['yard', 'yards'], small: ['foot', 'feet'], f: 3, story: (n) => `The fence is ${n} long.` },
  { big: ['meter', 'meters'], small: ['centimeter', 'centimeters'], f: 100, story: (n) => `The rope is ${n} long.` },
  { big: ['kilometer', 'kilometers'], small: ['meter', 'meters'], f: 1000, story: (n) => `The trail is ${n} long.` },
  { big: ['hour', 'hours'], small: ['minute', 'minutes'], f: 60, story: (n) => `The game lasts ${n}.` },
  { big: ['kilogram', 'kilograms'], small: ['gram', 'grams'], f: 1000, story: (n) => `The bag of bats has a mass of ${n}.` },
  { big: ['liter', 'liters'], small: ['milliliter', 'milliliters'], f: 1000, story: (n) => `The cooler holds ${n}.` },
  { big: ['pound', 'pounds'], small: ['ounce', 'ounces'], f: 16, story: (n) => `The puppy weighs ${n}.` },
]

// ───────────────────────── generators ─────────────────────────
export const gens: Record<string, Gen> = {
  'me.time-hour-half': (rng, d) => {
    const r = R(rng)
    const h = r.int(1, 12)
    const m = r.chance(d === 1 ? 0.25 : d === 2 ? 0.5 : 0.8) ? 30 : 0
    return clockItem(rng, d, h, m, r.chance(d === 1 ? 0.2 : 0.3) ? 'hour' : 'time', true)
  },

  'me.time-5': (rng, d) => {
    const r = R(rng)
    const h = r.int(1, 12)
    const m = d === 1 ? r.pick([5, 10, 15, 20, 25, 30, 15, 30]) : d === 2 ? r.int(1, 11) * 5 : r.pick([35, 40, 45, 50, 55, 25, 20, 10, 5])
    return clockItem(rng, d, h, m, r.chance(d === 1 ? 0.25 : 0.4) ? 'minutes' : 'time')
  },

  'me.time-minute': (rng, d) => {
    const r = R(rng)
    const h = r.int(1, 12)
    let m = d === 1 ? r.int(1, 29) : d === 2 ? r.int(1, 59) : r.int(31, 59)
    if (m % 5 === 0 && r.chance(0.8)) m += r.pick([1, 2, 3, 4])
    const roll = r.int(1, 10)
    const kind: ClockKind = d === 1 ? (roll <= 7 ? 'time' : 'minutes') : roll <= 5 ? 'time' : roll <= 7 ? 'minutes' : 'until'
    return clockItem(rng, d, h, m, kind)
  },

  'me.elapsed': (rng, d) => {
    const r = R(rng)
    const h1 = r.int(1, 9)
    let m1: number, dur: number
    if (d === 1) {
      m1 = r.int(0, 9) * 5
      dur = r.int(1, (55 - m1) / 5) * 5
    } else if (d === 2) {
      m1 = r.int(1, 11) * 5
      dur = r.int(Math.max(2, (60 - m1) / 5), 18) * 5
    } else {
      m1 = r.int(1, 59)
      dur = r.int(11, 150)
      if ((m1 + dur) % 5 === 0 && m1 % 5 === 0) dur += 2
    }
    const tot = h1 * 60 + m1 + dur
    const h2 = Math.floor(tot / 60),
      m2 = tot % 60
    const cross = h2 > h1
    const ev = r.pick(EVENTS)
    const common = { operands: [h1, m1, dur], difficulty: d }
    if (cross && d > 1 && r.chance(0.3)) {
      // when does it end?
      const toHour = 60 - m1
      const rest = dur - toHour
      const q = Math.floor(dur / 60),
        rem = dur % 60
      const x = m1 + rem
      const ans = T(h2, m2)
      const cands = [...(m1 + dur < 100 ? [T(h1, m1 + dur)] : []), T(h2 + 1, m2), T(h1, m2), T(h2, (m2 + 10) % 60), T(h2 - 1, m2)].filter((t) => t !== ans)
      return {
        prompt: `${ev} starts at ${T(h1, m1)}. It lasts ${dur} minutes. What time does it end?`,
        visual: clockSVG(h1, m1, 190),
        ...choice(ans, cands, rng),
        strategies: [
          strat(
            'Hop to the Hour',
            [
              `${toHour} minutes gets you from ${T(h1, m1)} to ${h1 + 1} o'clock.`,
              `${dur} − ${toHour} = ${rest} minutes are left.`,
              ...(rest >= 60 ? [`${rest} minutes is ${pl(Math.floor(rest / 60), 'hour', 'hours')} and ${rest % 60} minutes.`] : []),
              `Go ${rest} minutes past ${h1 + 1} o'clock. It ends at ${T(h1 + 1 + Math.floor(rest / 60), rest % 60)}.`,
            ],
            T(h1 + 1 + Math.floor(rest / 60), rest % 60),
          ),
          strat(
            'Hours First, Then Minutes',
            [
              q ? `${dur} minutes is ${pl(q, 'hour', 'hours')} and ${rem} minutes. Add the hours: now it is ${T(h1 + q, m1)}.` : `${dur} minutes is less than one hour. Just add minutes.`,
              `Add the minutes: ${m1} + ${rem} = ${x}`,
              ...(x >= 60 ? [`${x} minutes is 1 hour and ${x - 60} minutes. So the hour goes up by 1.`] : []),
              `It ends at ${T(h1 + q + Math.floor(x / 60), x % 60)}.`,
            ],
            T(h1 + q + Math.floor(x / 60), x % 60),
          ),
        ],
        ...common,
      }
    }
    const strategies: Strat[] = []
    if (!cross) {
      const toTen = (10 - (m1 % 10)) % 10
      const fives = m1 % 5 === 0 && m2 % 5 === 0
      const hops = fives ? upTo(1, (m2 - m1) / 5).map((i) => m1 + i * 5) : []
      strategies.push(strat('Take Away the Minutes', [`Both times are in the same hour. Only the minutes change.`, `${m2} − ${m1} = ${m2 - m1}`], m2 - m1))
      strategies.push(
        fives
          ? strat('Count by Fives', [`Start at ${m1} minutes. Count by fives to ${m2}: ${hops.join(', ')}.`, `That is ${pl(hops.length, 'hop', 'hops')} of 5 minutes.`, `${hops.length} × 5 = ${hops.length * 5}`], hops.length * 5, { line: [m1, m2] })
          : toTen && m1 + toTen < m2
            ? strat('Count Up', [`Start at ${m1} minutes. Hop ${toTen} to ${m1 + toTen}.`, `Then hop ${m2 - m1 - toTen} more to ${m2}.`, `${toTen} + ${m2 - m1 - toTen} = ${toTen + (m2 - m1 - toTen)}`], toTen + (m2 - m1 - toTen), { line: [m1, m1 + toTen, m2] })
            : strat('Count Up', [`Start at ${m1} minutes.`, `Count up to ${m2} minutes. That is ${upTo(m1 + 1, m2).length} minutes.`], upTo(m1 + 1, m2).length, { line: [m1, m2] }),
      )
    } else {
      const parts: number[] = []
      const steps: string[] = []
      const k = m1 > 0 ? h2 - h1 - 1 : h2 - h1
      if (m1 > 0) {
        parts.push(60 - m1)
        steps.push(`From ${T(h1, m1)}, hop to ${h1 + 1} o'clock. That is ${60 - m1} minutes.`)
      }
      if (k > 0) {
        parts.push(k * 60)
        steps.push(`Then ${pl(k, 'whole hour', 'whole hours')} to ${h2} o'clock. That is ${k * 60} minutes.`)
      }
      if (m2 > 0) {
        parts.push(m2)
        steps.push(`Then ${m2} more minutes to reach ${T(h2, m2)}.`)
      }
      steps.push(parts.length > 1 ? `${plus(parts)} = ${sum(parts)}` : `That is ${sum(parts)} minutes in all.`)
      strategies.push(strat('Hop to the Hour', steps, sum(parts)))
      const H = h2 - h1
      strategies.push(
        m2 === m1
          ? strat('Whole Hours', [`From ${T(h1, m1)} to ${T(h2, m2)} the minutes match. It is ${pl(H, 'whole hour', 'whole hours')}.`, `${H} × 60 = ${H * 60}`], H * 60)
          : m2 > m1
            ? strat('Whole Hours First', [`${pl(H, 'hour', 'hours')} after ${T(h1, m1)} is ${T(h2, m1)}. That is ${H * 60} minutes.`, `Then ${m2 - m1} more minutes to ${T(h2, m2)}.`, `${H * 60} + ${m2 - m1} = ${H * 60 + (m2 - m1)}`], H * 60 + (m2 - m1))
            : strat('Whole Hours, Then Back Up', [`${pl(H, 'hour', 'hours')} after ${T(h1, m1)} would be ${T(h2, m1)}. That is ${H * 60} minutes.`, `But it ends ${m1 - m2} minutes sooner than that.`, `${H * 60} − ${m1 - m2} = ${H * 60 - (m1 - m2)}`], H * 60 - (m1 - m2)),
      )
    }
    return {
      prompt: `${ev} starts at ${T(h1, m1)} and ends at ${T(h2, m2)}. How many minutes long is it?`,
      visual: twoClocks([h1, m1], [h2, m2]),
      input: 'number',
      answer: dur,
      unit: 'minutes',
      strategies,
      distractors: wrongs(dur, [Math.abs(m2 - m1), dur + 60, dur - 60, h2 * 100 + m2 - (h1 * 100 + m1), m1 + m2, dur + 10]),
      ...common,
    }
  },

  'me.coins': (rng, d) => {
    const r = R(rng)
    let q = 0,
      di = 0,
      n = 0,
      p = 0
    for (let tries = 0; tries < 60; tries++) {
      if (d === 1) {
        const pat = r.pick(['dp', 'np', 'dn', 'dnp'])
        di = pat.includes('d') ? r.int(1, 5) : 0
        n = pat.includes('n') ? r.int(1, 4) : 0
        p = pat.includes('p') ? r.int(1, 4) : 0
        q = 0
      } else if (d === 2) {
        q = r.int(0, 2)
        di = r.int(0, 3)
        n = r.int(0, 2)
        p = r.int(0, 4)
      } else {
        q = r.int(1, 4)
        di = r.int(0, 4)
        n = r.int(0, 3)
        p = r.int(0, 4)
      }
      const kinds = [q, di, n, p].filter(Boolean).length
      const count = q + di + n + p
      const tot = q * 25 + di * 10 + n * 5 + p
      if (kinds >= 2 && count >= 3 && count <= 12 && tot <= (d === 3 ? 175 : 99)) break
      ;[q, di, n, p] = [1, 2, 1, 2]
    }
    const total = q * 25 + di * 10 + n * 5 + p
    const sorted = [...Array(q).fill(25), ...Array(di).fill(10), ...Array(n).fill(5), ...Array(p).fill(1)] as number[]
    const shown = d === 3 ? r.shuffle(sorted) : sorted
    const who = r.pick(NAMES)
    const place = r.pick(['in a glove', 'under the bench', 'in a jar', 'in a pocket', 'in the sand', 'on the desk', 'in a brick box', 'in a cap'])
    const ask = r.pick(['How many cents is that?', 'How much money is it? Count the cents.', 'Count the coins. How many cents?'])
    // way 1: keep one running count, biggest coins first
    let run = 0
    const runSteps: string[] = []
    const kinds: [number, number, string, string][] = [
      [q, 25, 'quarter', 'quarters'],
      [di, 10, 'dime', 'dimes'],
      [n, 5, 'nickel', 'nickels'],
      [p, 1, 'penny', 'pennies'],
    ]
    for (const [c, v, , many] of kinds) {
      if (!c) continue
      const seq = upTo(1, c).map((i) => run + i * v)
      runSteps.push(run === 0 ? `Start with the ${many}. Count by ${v}s: ${seq.join(', ')}.` : `Keep going with the ${many}. Count on by ${v}s: ${seq.join(', ')}.`)
      run = seq[seq.length - 1]
    }
    runSteps.push(`The last number you say is the total: ${run}¢.`)
    // way 2: value of each kind, then add
    const parts = kinds.filter(([c]) => c).map(([c, v]) => c * v)
    const groupSteps = kinds.filter(([c]) => c).map(([c, v, one, many]) => `${pl(c, one, many)}: ${c} × ${v} = ${c * v}`)
    groupSteps.push(`Add them up: ${plus(parts)} = ${sum(parts)}`)
    return {
      prompt: `${who} finds these coins ${place}. ${ask}`,
      visual: moneySVG(0, shown),
      input: 'number',
      answer: total,
      unit: '¢',
      strategies: [strat('Biggest Coins First', runSteps, run), strat('Sort the Coins', groupSteps, sum(parts))],
      // counted coins not cents; dime and nickel values swapped; a dime counted as 5; left out the pennies
      distractors: wrongs(total, [q + di + n + p, q * 25 + di * 5 + n * 10 + p, q * 25 + di * 5 + n * 5 + p, p ? total - p : total + 5, q ? total - q * 5 : total + 10]),
      operands: [q, di, n, p],
      difficulty: d,
    }
  },

  'me.money-totals': (rng, d) => {
    const r = R(rng)
    const who = r.pick(NAMES)
    const example = (ans: string) => (ans === '1.25' ? '3.50' : '1.25')
    const kind = d === 1 ? r.pick(['toCents', 'addC']) : d === 2 ? r.pick(['toDollars', 'addOver']) : r.pick(['toDollars', 'addD', 'addD'])
    if (kind === 'toCents' || kind === 'toDollars') {
      const b = r.int(1, d === 1 ? 3 : 4)
      let q = 0,
        di = 0,
        n = 0,
        p = 0
      for (let tries = 0; tries < 60; tries++) {
        q = r.int(0, d === 3 ? 5 : 3)
        di = r.int(0, 4)
        n = r.int(0, d === 1 ? 2 : 3)
        p = d === 1 ? 0 : r.int(0, 4)
        const c = q * 25 + di * 10 + n * 5 + p
        const cnt = q + di + n + p
        if (cnt >= 2 && cnt <= 9 && c > 0 && (d === 3 ? c < 200 : c < 100)) break
        ;[q, di, n, p] = [1, 1, 0, 0]
      }
      const coins = [...Array(q).fill(25), ...Array(di).fill(10), ...Array(n).fill(5), ...Array(p).fill(1)] as number[]
      const c = sum(coins)
      const total = b * 100 + c
      // running count through everything
      let run = b * 100
      const seq: number[] = []
      for (const v of coins) seq.push((run += v))
      const coinCount = `Count the coins: ${coins.map((v, i) => sum(coins.slice(0, i + 1))).join(', ')}. That is ${c}¢.`
      if (kind === 'toCents')
        return {
          prompt: `${who} has ${pl(b, 'dollar bill', 'dollar bills')} and some coins. How many cents is that in all?`,
          visual: moneySVG(b, coins),
          input: 'number',
          answer: total,
          unit: '¢',
          strategies: [
            strat('Dollars, Then Coins', [`1 dollar is 100 cents. ${pl(b, 'dollar', 'dollars')}: ${b} × 100 = ${b * 100}`, coinCount, `${b * 100} + ${c} = ${b * 100 + c}`], b * 100 + c),
            strat('Count Straight Through', [`Count the bills by 100s: ${list(skips(100, b))}.`, `Keep counting with the coins: ${seq.join(', ')}.`, `The last number is the total: ${run}¢.`], run),
          ],
          distractors: wrongs(total, [b + c, c, b * 10 + c, total - 100, b * 100 + coins.length]),
          operands: [b, q, di, n, p],
          difficulty: d,
        }
      const ans = money(total)
      return {
        prompt: `${who} has this money. How many dollars is it? Type it with a dot, like ${example(ans)} for $${example(ans)}.`,
        visual: moneySVG(b, coins),
        input: 'decimal',
        answer: ans,
        strategies: [
          strat(
            'Dollars, Then Coins',
            [
              `Count the bills: ${pl(b, 'dollar', 'dollars')}.`,
              coinCount,
              ...(c >= 100 ? [`${c}¢ is 1 more dollar and ${c - 100}¢.`] : []),
              `Dollars go before the dot. Cents go after it: $${b + Math.floor(c / 100)}.${pad2(c % 100)}`,
            ],
            `${b + Math.floor(c / 100)}.${pad2(c % 100)}`,
          ),
          strat('All in Cents', [`Count the bills by 100s: ${list(skips(100, b))}.`, `Keep counting with the coins: ${seq.join(', ')}.`, `${run}¢ is ${pl(Math.floor(run / 100), 'dollar', 'dollars')} and ${run % 100} cents: $${money(run)}`], money(run)),
        ],
        distractors: decWrongs(ans, [`${total}`, `${b}.${pad2(coins.length)}`, money(c), money(total + 100), `${b}.${pad2(Math.floor((c % 100) / 10))}`], money(total + 10)),
        operands: [b, q, di, n, p],
        difficulty: d,
      }
    }
    const ITEMS: [string, string][] = [
      ['A ball', 'A snack'],
      ['A cap', 'A drink'],
      ['A pack of cards', 'A sticker'],
      ['A hot dog', 'A juice'],
      ['A toy bat', 'A whistle'],
      ['A brick set', 'A pencil'],
      ['A surf sticker', 'A snow cone'],
    ]
    const [A, B] = r.pick(ITEMS)
    if (kind === 'addC') {
      const a = r.int(2, 12) * 5,
        b = r.int(2, Math.floor((95 - a) / 5)) * 5
      return {
        prompt: `${A} costs ${a}¢. ${B} costs ${b}¢. How many cents for both?`,
        input: 'number',
        answer: a + b,
        unit: '¢',
        strategies: addStrats(a, b),
        distractors: wrongs(a + b, [Math.abs(a - b), a + b + 10, a + b - 10, a + b + 5]),
        operands: [a, b],
        difficulty: d,
      }
    }
    let a: number, b: number
    if (kind === 'addOver') {
      a = r.int(11, 19) * 5
      b = r.int(Math.ceil((105 - a) / 5), 19) * 5
    } else {
      a = r.int(1, 4) * 100 + r.int(1, 19) * 5
      b = r.int(1, 4) * 100 + r.int(1, 19) * 5
    }
    const show = (c: number) => (kind === 'addOver' ? `${c}¢` : `$${money(c)}`)
    const da = Math.floor(a / 100),
      db = Math.floor(b / 100),
      cc = (a % 100) + (b % 100)
    const ans = money(a + b)
    return {
      prompt: `${A} costs ${show(a)}. ${B} costs ${show(b)}. How many dollars for both? Type it with a dot, like ${example(ans)} for $${example(ans)}.`,
      input: 'decimal',
      answer: ans,
      strategies: [
        strat(
          kind === 'addOver' ? 'Make a Dollar' : 'Dollars and Cents Apart',
          [
            ...(da + db > 0 ? [`Dollars: ${da} + ${db} = ${da + db}`] : []),
            `Cents: ${a % 100} + ${b % 100} = ${cc}`,
            ...(cc >= 100 ? [`100 cents make 1 dollar. ${cc} cents is 1 dollar and ${cc - 100} cents.`] : []),
            `That is ${pl(da + db + Math.floor(cc / 100), 'dollar', 'dollars')} and ${cc % 100} cents: $${da + db + Math.floor(cc / 100)}.${pad2(cc % 100)}`,
          ],
          `${da + db + Math.floor(cc / 100)}.${pad2(cc % 100)}`,
        ),
        strat('All in Cents', [...(kind === 'addD' ? [`$${money(a)} is ${a} cents. $${money(b)} is ${b} cents.`] : []), `${a} + ${b} = ${a + b}`, `${a + b} cents is ${pl(Math.floor((a + b) / 100), 'dollar', 'dollars')} and ${(a + b) % 100} cents: $${money(a + b)}`], money(a + b)),
      ],
      distractors: decWrongs(ans, [`${a + b}`, ...(cc >= 100 ? [`${da + db}.${pad2(cc % 100)}`] : [money(a + b + 100)]), money(Math.abs(a - b)), money(a + b + 10)], money(a + b + 5)),
      operands: [a, b],
      difficulty: d,
    }
  },

  'me.make-change': (rng, d) => {
    const r = R(rng)
    const who = r.pick(NAMES)
    const thing = r.pick(['a ball', 'a snack', 'a sticker', 'a juice', 'a pack of cards', 'a pencil', 'a whistle', 'a snow cone'])
    if (d < 3) {
      const paid = d === 1 && r.chance(0.3) ? 50 : 100
      const cost = d === 1 ? r.int(2, paid / 5 - 1) * 5 : r.int(11, 98)
      const ans = paid - cost
      const toTen = (10 - (cost % 10)) % 10
      const tc = cost - (cost % 10)
      return {
        prompt: `${who} buys ${thing} for ${cost}¢ and pays with ${paid === 100 ? '1 dollar (100¢)' : '50¢'}. How many cents does ${who} get back?`,
        input: 'number',
        answer: ans,
        unit: '¢',
        strategies: [
          toTen && cost + toTen < paid
            ? strat('Count Up Like a Cashier', [`Start at ${cost}¢. Add ${toTen}¢ to get to ${cost + toTen}¢.`, `Then add ${paid - cost - toTen}¢ to get to ${paid}¢.`, `${toTen} + ${paid - cost - toTen} = ${toTen + (paid - cost - toTen)}`], toTen + (paid - cost - toTen), { line: [cost, cost + toTen, paid] })
            : strat('Count Up Like a Cashier', [`Start at ${cost}¢.`, `Count up to ${paid}¢. That is ${paid - cost}¢.`], paid - cost, { line: [cost, paid] }),
          strat('Take It Away', cost % 10 && tc ? [`${paid} − ${tc} = ${paid - tc}`, `${paid - tc} − ${cost % 10} = ${paid - tc - (cost % 10)}`] : [`Change is what you paid take away the price.`, `${paid} − ${cost} = ${paid - cost}`], paid - tc - (cost % 10)),
        ],
        // made the ones add to 10 AND the tens add to 10 (10 too many), off by ten, gave the price back, added
        distractors: wrongs(ans, [cost % 10 ? ans + 10 : ans + 5, ans - 10, cost, ans + 1]),
        operands: [paid, cost],
        difficulty: d,
      }
    }
    const paid = r.pick([500, 500, 1000, 2000])
    const realCost = r.int(1, paid / 100 - 1) * 100 + r.int(1, 19) * 5
    const ch = paid - realCost
    const toDollar = (100 - (realCost % 100)) % 100
    const nextD = realCost + toDollar
    const ans = money(ch)
    const ex = ans === '1.25' ? '3.50' : '1.25'
    const cd = Math.floor(realCost / 100),
      cc = realCost % 100
    return {
      prompt: `${who} buys a cap for $${money(realCost)} and pays with a $${paid / 100} bill. How many dollars does ${who} get back? Type it with a dot, like ${ex}.`,
      input: 'decimal',
      answer: ans,
      strategies: [
        strat(
          'Count Up Like a Cashier',
          [
            `Start at $${money(realCost)}. Add ${toDollar}¢ to get to $${money(nextD)}.`,
            ...(paid > nextD ? [`Then add ${pl((paid - nextD) / 100, 'dollar', 'dollars')} to get to $${money(paid)}.`] : []),
            paid > nextD ? `In all that is ${pl((paid - nextD) / 100, 'dollar', 'dollars')} and ${toDollar} cents: $${money(toDollar + (paid - nextD))}` : `That is ${toDollar} cents: $${money(toDollar + (paid - nextD))}`,
          ],
          money(toDollar + (paid - nextD)),
        ),
        strat('All in Cents', [`$${paid / 100} is ${fmtN(paid)} cents. $${money(realCost)} is ${fmtN(realCost)} cents.`, `${fmtN(paid)} − ${fmtN(realCost)} = ${fmtN(paid - realCost)}`, `${paid - realCost} cents is $${money(paid - realCost)}`], money(paid - realCost)),
      ],
      // took dollars from dollars and cents from 100 without trading a dollar (1 dollar too many)
      distractors: decWrongs(ans, [money((paid / 100 - cd) * 100 + (100 - cc)), money((paid / 100 - cd) * 100 + cc), `${ch}`, money(Math.max(5, ch - 10))], money(ch + 10)),
      operands: [paid, realCost],
      difficulty: d,
    }
  },

  'me.length-measure': (rng, d) => {
    const r = R(rng)
    const [thing, color] = r.pick(MEASURE_THINGS)
    const inches = r.chance()
    const unit = inches ? 'inches' : 'centimeters'
    const maxU = d === 1 ? 10 : inches ? 12 : 15
    const start = d === 3 ? r.int(1, 5) : 0
    const len = d === 1 ? r.int(1, 8) : d === 2 ? r.int(4, maxU) : r.int(2, Math.min(9, maxU - start))
    const end = start + len
    const hops = upTo(start + 1, end)
    return {
      prompt: d === 3 ? `How many ${unit} long is the ${thing}? Look at both ends. It does not start at 0.` : `Use the ruler. How many ${unit} long is the ${thing}?`,
      visual: rulerSVG(start, end, maxU, unit, thing, color),
      input: 'number',
      answer: len,
      unit: inches ? 'inches' : 'cm',
      strategies:
        start === 0
          ? [
              strat('Read the End', [`The left end of the ${thing} is at 0. That is where measuring starts.`, `The right end is at ${end}.`, `So the ${thing} is ${end - start} ${unit} long.`], end - start),
              strat('Count the Spaces', [`Each space from one number to the next is 1 ${inches ? 'inch' : 'centimeter'}.`, `Count the spaces under the ${thing}: ${hops.join(', ')}.`], hops.length),
            ]
          : [
              strat('End Take Away Start', [`The left end is at ${start}. The right end is at ${end}.`, `${end} − ${start} = ${end - start}`], end - start),
              strat('Count the Hops', [`Put your finger at ${start}. Hop to each number until ${end}.`, `Count the hops: ${hops.map((_, i) => i + 1).join(', ')}.`], hops.length, { line: [start, end] }),
            ],
      // read only the right end; counted the lines, not the spaces; one space short
      distractors: wrongs(len, start ? [end, len + 1, start, end + start] : [len + 1, len - 1, maxU]),
      operands: [start, end, maxU],
      difficulty: d,
    }
  },

  'me.length-compare': (rng, d) => {
    const r = R(rng)
    const [A, B, unit] = r.pick(COMPARE_PAIRS)
    let a: number, b: number
    if (d === 1) {
      a = r.int(6, 20)
      b = r.int(2, a - 2)
    } else if (d === 2) {
      a = r.int(25, 99)
      b = r.int(11, a - 5)
    } else {
      a = r.int(31, 100)
      b = r.int(12, a - 6)
      if (b % 10 <= a % 10 && b % 10 < 9) b += Math.min(9 - (b % 10), (a % 10) - (b % 10) + 1) // make the ones need a trade
      if (b >= a) b = a - 6
    }
    const ans = a - b
    const shorter = d > 1 && r.chance(0.4)
    return {
      prompt: `The ${A} is ${a} ${unit} long. The ${B} is ${b} ${unit} long. ${shorter ? `How much shorter is the ${B}?` : `How much longer is the ${A}?`}`,
      visual: lengthBarsSVG(
        [
          { name: A, len: a, color: '#ef9a9a' },
          { name: B, len: b, color: '#90caf9' },
        ],
        unit,
      ),
      input: 'number',
      answer: ans,
      unit,
      strategies: subStrats(a, b),
      // added; took the small digit from the big digit in each place; just the longer one; off by ten
      distractors: wrongs(ans, [a + b, Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10)), a, ans + 10, ans - 10]),
      operands: [a, b],
      difficulty: d,
    }
  },

  'me.length-add': (rng, d) => {
    const r = R(rng)
    const who = r.pick(NAMES)
    const kind = d === 1 ? r.pick(['join', 'cut']) : d === 2 ? r.pick(['join', 'cut', 'join']) : r.pick(['three', 'back', 'cut'])
    const lo = d === 1 ? 3 : 12
    const hi = d === 1 ? 20 : d === 2 ? 60 : 90
    if (kind === 'join') {
      const a = r.int(lo, hi),
        b = r.int(lo, d === 1 ? 20 - Math.min(a, 17) + 3 : Math.min(hi, 99 - a))
      const tpl = r.pick([
        [`A red brick train is ${a} cm long. A blue one is ${b} cm long. ${who} puts them end to end. How long is the big train?`, 'cm'],
        [`${who} hits a ball ${a} feet. Then it rolls ${b} feet more. How far did the ball go in all?`, 'feet'],
        [`One rope is ${a} feet long. Another rope is ${b} feet long. ${who} ties them end to end. How long is the new rope?`, 'feet'],
        [`${who} rides a wave for ${a} meters. The next wave goes ${b} meters. How many meters in all?`, 'meters'],
        [`A ribbon is ${a} inches long. ${who} tapes on ${b} more inches. How long is the ribbon now?`, 'inches'],
      ])
      return { prompt: tpl[0], input: 'number', answer: a + b, unit: tpl[1], strategies: addStrats(a, b), distractors: wrongs(a + b, [Math.abs(a - b), a + b + 10, a + b - 10, a + b + 1]), operands: [a, b], difficulty: d }
    }
    if (kind === 'cut') {
      const a = r.int(d === 1 ? 8 : 30, d === 1 ? 20 : 100),
        b = r.int(d === 1 ? 2 : 11, a - (d === 1 ? 2 : 6))
      const tpl = r.pick([
        [`A rope is ${a} feet long. Coach cuts off ${b} feet. How long is the rope now?`, 'feet'],
        [`A ribbon is ${a} cm long. ${who} cuts off ${b} cm. How many cm are left?`, 'cm'],
        [`The base path is ${a} feet long. ${who} has run ${b} feet. How many feet are left to run?`, 'feet'],
        [`A board is ${a} inches long. ${who} saws off ${b} inches. How long is the board now?`, 'inches'],
        [`The pool is ${a} meters long. ${who} swam ${b} meters. How many meters to the end?`, 'meters'],
      ])
      return {
        prompt: tpl[0],
        input: 'number',
        answer: a - b,
        unit: tpl[1],
        strategies: subStrats(a, b),
        distractors: wrongs(a - b, [a + b, Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10)), a - b + 10, a - b - 10, a - b + 1]),
        operands: [a, b],
        difficulty: d,
      }
    }
    if (kind === 'three') {
      const a = r.int(11, 40),
        b = r.int(11, 40),
        c = r.int(5, 30)
      const tpl = r.pick([
        [`${who} builds three brick walls. They are ${a} cm, ${b} cm and ${c} cm long. Put end to end, how long are they?`, 'cm'],
        [`Three ropes are ${a} feet, ${b} feet and ${c} feet long. ${who} ties them end to end. How long is the big rope?`, 'feet'],
        [`${who} throws a ball ${a} feet, then ${b} feet, then ${c} feet. How many feet in all?`, 'feet'],
      ])
      const tens = a - (a % 10) + (b - (b % 10)) + (c - (c % 10)),
        ones = (a % 10) + (b % 10) + (c % 10)
      return {
        prompt: tpl[0],
        input: 'number',
        answer: a + b + c,
        unit: tpl[1],
        strategies: [
          strat('Two First, Then One More', [`Add the first two: ${a} + ${b} = ${a + b}`, `Now add the last one: ${a + b} + ${c} = ${a + b + c}`], a + b + c, { line: [a, a + b, a + b + c] }),
          strat('Tens and Ones', [`Tens: ${a - (a % 10)} + ${b - (b % 10)} + ${c - (c % 10)} = ${tens}`, `Ones: ${a % 10} + ${b % 10} + ${c % 10} = ${ones}`, `${tens} + ${ones} = ${tens + ones}`], tens + ones),
        ],
        distractors: wrongs(a + b + c, [a + b, a + b + c + 10, a + b + c - 10, b + c]),
        operands: [a, b, c],
        difficulty: d,
      }
    }
    // two steps: join, then cut some off
    const a = r.int(20, 60),
      b = r.int(11, 39),
      c = r.int(5, Math.min(a - 2, 30))
    const tpl = r.pick([
      [`${who} has a rope ${a} feet long. ${who} ties on ${b} more feet. Then ${c} feet get cut off. How long is the rope now?`, 'feet'],
      [`A brick road is ${a} cm long. ${who} adds ${b} cm. Then ${c} cm break off. How long is the road now?`, 'cm'],
      [`A ribbon is ${a} inches long. ${who} tapes on ${b} inches and then cuts off ${c} inches. How long is it now?`, 'inches'],
    ])
    return {
      prompt: tpl[0],
      input: 'number',
      answer: a + b - c,
      unit: tpl[1],
      strategies: [
        strat('One Step at a Time', [`First it gets longer: ${a} + ${b} = ${a + b}`, `Then it gets shorter: ${a + b} − ${c} = ${a + b - c}`], a + b - c, { line: [a, a + b, a + b - c] }),
        strat('Cut First, Then Add', [`The order does not change the end. Take away first: ${a} − ${c} = ${a - c}`, `Then add: ${a - c} + ${b} = ${a - c + b}`], a - c + b),
      ],
      distractors: wrongs(a + b - c, [a + b, a + b + c, a - c, a + b - c + 10]),
      operands: [a, b, c],
      difficulty: d,
    }
  },

  'me.bar-graph': (rng, d) => {
    const r = R(rng)
    const ds = r.pick(DATASETS)
    const n = d === 1 ? 3 : 4
    const labels = r.shuffle(ds.labels).slice(0, n)
    const vals = distinct(r, n, 1, 10)
    const visual = barGraphSVG(ds.title, labels, vals, 1, 10)
    const kind = d === 1 ? r.pick(['read', 'read', 'most', 'least']) : d === 2 ? r.pick(['more', 'sum2', 'more']) : r.pick(['all', 'more', 'gap', 'sum2'])
    const common = { visual, operands: vals, difficulty: d }
    const [i, j] = r.shuffle(upTo(0, n - 1))
    if (kind === 'read') {
      const v = vals[i]
      return {
        prompt: `Look at the graph. ${ds.one(labels[i])}`,
        input: 'number',
        answer: v,
        strategies: [
          strat('Slide Over From the Top', [`Find the bar for ${labels[i]}.`, `Put your finger on the top of the bar. Slide left to the numbers.`, `It lines up with ${v}.`], v),
          strat('Count Up the Bar', [`Start at 0 at the bottom of the ${labels[i]} bar.`, `Count the lines as you go up: ${upTo(1, v).join(', ')}.`], upTo(1, v).length),
        ],
        distractors: wrongs(v, [vals[j], v + 1, v - 1, vals[(i + 1) % n]]),
        ...common,
      }
    }
    if (kind === 'most' || kind === 'least') {
      const best = kind === 'most' ? Math.max(...vals) : Math.min(...vals)
      const sorted = [...vals].sort((a, b) => a - b)
      return {
        prompt: `Look at the graph. ${kind === 'most' ? ds.most : ds.least}`,
        ...choice(labels[vals.indexOf(best)], labels, rng, true),
        strategies: [
          strat(kind === 'most' ? 'Find the Tallest Bar' : 'Find the Shortest Bar', [`Look across all the bars.`, `The ${kind === 'most' ? 'tallest' : 'shortest'} bar is ${labels[vals.indexOf(best)]}.`], labels[vals.indexOf(best)]),
          strat('Read Every Bar', [labels.map((L, k) => `${L} ${vals[k]}`).join(', ') + '.', `In order: ${sorted.join(', ')}. The ${kind === 'most' ? 'biggest' : 'smallest'} number is ${kind === 'most' ? sorted[n - 1] : sorted[0]}.`, `That bar is ${labels[vals.indexOf(kind === 'most' ? sorted[n - 1] : sorted[0])]}.`], labels[vals.indexOf(kind === 'most' ? sorted[n - 1] : sorted[0])]),
        ],
        ...common,
      }
    }
    if (kind === 'more' || kind === 'gap') {
      const hiI = kind === 'gap' ? vals.indexOf(Math.max(...vals)) : vals[i] > vals[j] ? i : j
      const loI = kind === 'gap' ? vals.indexOf(Math.min(...vals)) : vals[i] > vals[j] ? j : i
      const a = vals[hiI],
        b = vals[loI]
      return {
        prompt: `Look at the graph. ${kind === 'gap' ? `Find the tallest bar and the shortest bar. How many more ${ds.noun} does the tallest bar show?` : ds.more(labels[hiI], labels[loI])}`,
        input: 'number',
        answer: a - b,
        strategies: [
          strat('Read Both, Then Take Away', [`${labels[hiI]} is ${a}. ${labels[loI]} is ${b}.`, `${a} − ${b} = ${a - b}`], a - b),
          strat('Count Up Between the Tops', [`Start at the top of the shorter bar, at ${b}.`, `Count the lines up to ${a}: ${upTo(1, a - b).join(', ')}.`], upTo(b + 1, a).length, { line: [b, a] }),
        ],
        // added the two bars; read just one bar
        distractors: wrongs(a - b, [a + b, a, b, a - b + 1]),
        ...common,
      }
    }
    if (kind === 'sum2') {
      const a = vals[i],
        b = vals[j]
      return {
        prompt: `Look at the graph. ${ds.both(labels[i], labels[j])}`,
        input: 'number',
        answer: a + b,
        strategies: [
          strat('Read Both, Then Add', [`${labels[i]} is ${a}. ${labels[j]} is ${b}.`, `${a} + ${b} = ${a + b}`], a + b),
          strat('Count On', [`Start at the bigger bar: ${Math.max(a, b)}.`, `Count on ${Math.min(a, b)} more for the other bar.`, `You land on ${Math.max(a, b) + Math.min(a, b)}.`], Math.max(a, b) + Math.min(a, b), { line: [Math.max(a, b), Math.max(a, b) + Math.min(a, b)] }),
        ],
        distractors: wrongs(a + b, [Math.abs(a - b), Math.max(a, b), sum(vals), a + b + 1]),
        ...common,
      }
    }
    const sorted = [...vals].sort((a, b) => b - a)
    const run = sorted.map((_, k) => sum(sorted.slice(0, k + 1)))
    return {
      prompt: `Look at the graph. ${ds.all} Add every bar.`,
      input: 'number',
      answer: sum(vals),
      strategies: [
        strat('Add in Order', [`Read each bar: ${vals.join(', ')}.`, `${plus(vals)} = ${sum(vals)}`], sum(vals)),
        strat('Biggest First', [`Start with the biggest bar, ${sorted[0]}. Add the others one at a time.`, `Keep a running total: ${run.join(', ')}.`], run[run.length - 1]),
      ],
      distractors: wrongs(sum(vals), [sum(vals) - vals[n - 1], Math.max(...vals), sum(vals) + 1, vals[0] + vals[1]]),
      ...common,
    }
  },

  'me.picture-graph': (rng, d) => {
    const r = R(rng)
    const ds = r.pick(DATASETS)
    const n = d === 1 ? 3 : 4
    const labels = r.shuffle(ds.labels).slice(0, n)
    const k = d === 1 ? r.pick([2, 5]) : d === 2 ? r.pick([2, 5, 10]) : r.pick([2, 4, 10])
    const bars = d >= 2 && r.chance(0.4)
    // counts in half-pictures; only the hardest level uses half pictures
    const hv = d === 3 ? distinct(r, n, 2, 12) : distinct(r, n, 1, 6).map((x) => x * 2)
    const vals = hv.map((x) => (x * k) / 2)
    const visual = bars ? barGraphSVG(ds.title, labels, vals, k, Math.ceil(Math.max(...vals) / k) * k) : pictureGraphSVG(ds.title, labels, hv, `${k} ${ds.noun}`)
    const lead = bars ? `The side of the graph counts by ${k}s.` : `Each ball stands for ${k} ${ds.noun}.`
    const pic = bars ? 'step' : 'ball'
    const pics = bars ? 'steps' : 'balls'
    const kind = d === 1 ? 'read' : d === 2 ? r.pick(['read', 'more', 'sum2']) : r.pick(['more', 'sum2', 'all'])
    const [i, j] = r.shuffle(upTo(0, n - 1))
    const common = { visual, operands: [k, ...vals], difficulty: d }
    const say = (hh: number) => (hh % 2 ? (hh > 1 ? `${(hh - 1) / 2} and a half` : 'half a') : `${hh / 2}`)
    /** value of hh half-pictures, worked out by multiplying */
    const times = (hh: number): [string[], number] => {
      const w = Math.floor(hh / 2)
      const st = w ? [`${w} × ${k} = ${w * k}`] : []
      if (hh % 2) st.push(w ? `Half a ${pic} is ${k / 2}. ${w * k} + ${k / 2} = ${w * k + k / 2}` : `Half a ${pic} is half of ${k}. That is ${k / 2}.`)
      return [st, w * k + (hh % 2 ? k / 2 : 0)]
    }
    if (kind === 'read') {
      const hh = hv[i],
        w = Math.floor(hh / 2)
      const sk = skips(k, w)
      const [ts, tv] = times(hh)
      return {
        prompt: `${lead} ${ds.one(labels[i])}`,
        input: 'number',
        answer: vals[i],
        strategies: [
          strat(`Count by ${k}s`, [`${labels[i]} has ${say(hh)} ${hh === 2 ? pic : pics}.`, `Count by ${k}s, one count for each ${pic}: ${list(sk)}.`, ...(hh % 2 ? [`Half a ${pic} is ${k / 2} more: ${sk[w - 1]} + ${k / 2} = ${sk[w - 1] + k / 2}`] : [])], sk[w - 1] + (hh % 2 ? k / 2 : 0)),
          strat('Multiply', [`${labels[i]} has ${say(hh)} ${hh === 2 ? pic : pics}. Each one is ${k}.`, ...ts], tv),
        ],
        // read each picture as 1; one picture off
        distractors: wrongs(vals[i], [Math.ceil(hh / 2), vals[i] + k, vals[i] - k, vals[j], Math.ceil(hh / 2) * k].filter((x) => x > 0)),
        ...common,
      }
    }
    if (kind === 'more') {
      const hiI = hv[i] > hv[j] ? i : j,
        loI = hv[i] > hv[j] ? j : i
      const a = vals[hiI],
        b = vals[loI],
        e = hv[hiI] - hv[loI]
      const [ts, tv] = times(e)
      return {
        prompt: `${lead} ${ds.more(labels[hiI], labels[loI])}`,
        input: 'number',
        answer: a - b,
        strategies: [
          strat('Find Each, Then Take Away', [`${labels[hiI]}: ${say(hv[hiI])} ${hv[hiI] === 2 ? pic : pics} is ${a}.`, `${labels[loI]}: ${say(hv[loI])} ${hv[loI] === 2 ? pic : pics} is ${b}.`, `${a} − ${b} = ${a - b}`], a - b),
          strat(`Just the Extra ${bars ? 'Steps' : 'Balls'}`, [`${labels[hiI]} has ${say(e)} more ${e === 2 ? pic : pics} than ${labels[loI]}.`, `Each ${pic} is ${k}.`, ...ts], tv),
        ],
        distractors: wrongs(a - b, [Math.ceil(e / 2), a + b, a, a - b + k]),
        ...common,
      }
    }
    const idx = kind === 'sum2' ? [i, j] : upTo(0, n - 1)
    const hs = idx.map((x) => hv[x])
    const vs = idx.map((x) => vals[x])
    const [ts, tv] = times(sum(hs))
    return {
      prompt: `${lead} ${kind === 'sum2' ? ds.both(labels[i], labels[j]) : ds.all}`,
      input: 'number',
      answer: sum(vs),
      strategies: [
        strat('Find Each, Then Add', [idx.map((x) => `${labels[x]} is ${vals[x]}`).join('. ') + '.', `${plus(vs)} = ${sum(vs)}`], sum(vs)),
        strat(`Count All the ${bars ? 'Steps' : 'Balls'} First`, [`Put the ${pics} together. Two halves make a whole one. That makes ${say(sum(hs))} ${sum(hs) === 2 ? pic : pics}.`, `Each ${pic} is ${k}.`, ...ts], tv),
      ],
      distractors: wrongs(sum(vs), [Math.ceil(sum(hs) / 2), sum(vs) + k, sum(vs) - k, Math.abs(vs[0] - vs[1])]),
      ...common,
    }
  },

  'me.mass-volume': (rng, d) => {
    const r = R(rng)
    const who = r.pick(NAMES)
    const kind = d === 1 ? r.pick(['add', 'sub', 'cup']) : d === 2 ? r.pick(['add', 'sub', 'mul', 'cup']) : r.pick(['mul', 'div', 'add', 'sub', 'cup'])
    if (kind === 'cup') {
      const every = d === 1 ? 100 : 200
      const level = d === 3 ? r.int(1, 9) * 100 + 50 : d === 2 ? r.pick([100, 300, 500, 700, 900, 300, 700, 500, 400]) : r.int(1, 9) * 100
      const full = Math.floor(level / 100)
      const ctx = r.pick(['fills a cup with water', 'pours juice into a cup', 'fills a cup with lemonade', 'pours sports drink into a cup', 'fills a cup at the sink', 'pours milk into a cup'])
      const empty = 1000 - level
      return {
        prompt: `${who} ${ctx}. Each line is 100 mL. How many mL are in the cup?`,
        visual: cupSVG(level, every),
        input: 'number',
        answer: level,
        unit: 'mL',
        strategies: [
          strat('Count Up by 100s', [`Start at the bottom. Count each line by 100s up to the water: ${list(skips(100, full))}.`, ...(level % 100 ? [`The water is halfway to the next line. Half of 100 is 50.`, `${full * 100} + 50 = ${full * 100 + 50}`] : [`The water stops right on that line.`])], full * 100 + (level % 100 ? 50 : 0)),
          strat('Come Down From the Top', [`The top line is 1,000 mL.`, `The empty part is ${fmtN(empty)} mL. Count the empty lines down from the top to check.`, `1,000 − ${empty} = ${1000 - empty}`], 1000 - empty),
        ],
        // counted lines as 1 each; read the line above or below
        distractors: wrongs(level, [full, level % 100 ? full * 100 : level + 100, level % 100 ? full * 100 + 100 : level - 100, level % 100 ? full * 100 + 5 : empty]),
        operands: [level],
        difficulty: d,
      }
    }
    if (kind === 'add' || kind === 'sub') {
      const big = d > 1
      const a = big ? r.int(12, 60) * 10 + (d === 3 ? r.int(0, 1) * 5 : 0) : r.int(12, 60)
      const b = big ? r.int(11, kind === 'sub' ? a / 10 - 2 : Math.min(39, 99 - a / 10)) * 10 : r.int(5, kind === 'sub' ? a - 3 : Math.min(39, 99 - a))
      const tpl =
        kind === 'add'
          ? r.pick(
              big
                ? [
                    [`A bat has a mass of ${a} grams. A glove has a mass of ${b} grams. What is the mass of both?`, 'grams'],
                    [`${who} pours ${a} mL of water and ${b} mL of juice into a jug. How many mL are in the jug?`, 'mL'],
                    [`A brick box has a mass of ${a} grams. ${who} adds ${b} grams of bricks. What is the mass now?`, 'grams'],
                  ]
                : [
                    [`One cooler holds ${a} liters. Another holds ${b} liters. How many liters do both hold?`, 'liters'],
                    [`A dog has a mass of ${a} kg. A puppy has a mass of ${b} kg. What is the mass of both?`, 'kg'],
                    [`${who} pours ${a} liters into the pool. Then ${b} liters more. How many liters in all?`, 'liters'],
                  ],
            )
          : r.pick(
              big
                ? [
                    [`A bag of sand has a mass of ${a} grams. ${who} pours out ${b} grams. How many grams are left?`, 'grams'],
                    [`A bottle has ${a} mL of water. ${who} drinks ${b} mL. How many mL are left?`, 'mL'],
                    [`A box of bricks has a mass of ${a} grams. ${who} takes out ${b} grams. What is the mass now?`, 'grams'],
                  ]
                : [
                    [`A bucket has ${a} liters of water. ${b} liters spill out. How many liters are left?`, 'liters'],
                    [`A bag of balls has a mass of ${a} kg. Coach takes out ${b} kg of balls. What is the mass now?`, 'kg'],
                    [`The tank holds ${a} liters. It has ${b} liters in it now. How many more liters fit?`, 'liters'],
                  ],
            )
      const ans = kind === 'add' ? a + b : a - b
      return {
        prompt: tpl[0],
        input: 'number',
        answer: ans,
        unit: tpl[1],
        strategies:
          kind === 'add' ? (big ? addBig(a, b) : addStrats(a, b)) : subStrats(a, b),
        distractors: wrongs(ans, kind === 'add' ? [a - b, ans + (big ? 100 : 10), ans - (big ? 100 : 10), ans + (big ? 10 : 1)] : [a + b, ans + (big ? 100 : 10), ans - (big ? 100 : 10), ans + (big ? 10 : 1)]),
        operands: [a, b],
        difficulty: d,
      }
    }
    if (kind === 'mul') {
      const a = d === 2 ? r.pick([2, 3, 4, 5, 10]) : r.int(3, 9)
      const b = r.int(2, d === 2 ? 6 : 9)
      const tpl = r.pick([
        [`Each water bottle holds ${a} liters. How many liters do ${b} bottles hold?`, 'liters'],
        [`One brick has a mass of ${a} grams. What is the mass of ${b} bricks?`, 'grams'],
        [`Each bat has a mass of ${a} kg. What is the mass of ${b} bats?`, 'kg'],
        [`Each cup holds ${a} liters of sports drink. How many liters are in ${b} cups?`, 'liters'],
      ])
      const sk = skips(a, b)
      return {
        prompt: tpl[0],
        input: 'number',
        answer: a * b,
        unit: tpl[1],
        strategies: [strat('Count by Groups', [`There are ${b} groups of ${a} ${tpl[1]}.`, `Count by ${a}s, ${b} times: ${sk.join(', ')}.`], sk[b - 1]), strat('Use a Fact', [`${b} groups of ${a} is a times fact.`, `${b} × ${a} = ${b * a}`], b * a)],
        distractors: wrongs(a * b, [a + b, a * b + a, a * b - a, a * (b + 1) + 1]),
        operands: [a, b],
        difficulty: d,
      }
    }
    const b = r.int(2, 9),
      q = r.int(2, 10)
    const total = b * q
    const tpl = r.pick([
      [`${total} liters of sports drink are shared the same into ${b} coolers. How many liters go in each cooler?`, 'liters'],
      [`${b} balls that are all the same have a mass of ${total} grams in all. What is the mass of one ball?`, 'grams'],
      [`Coach pours ${total} liters of water into ${b} buckets. Each bucket gets the same. How many liters in each?`, 'liters'],
      [`${b} bricks that are all the same have a mass of ${total} grams. What is the mass of one brick?`, 'grams'],
    ])
    const sk: number[] = []
    for (let v = b; v <= total; v += b) sk.push(v)
    let found = 1
    while (found * b < total) found++
    return {
      prompt: tpl[0],
      input: 'number',
      answer: q,
      unit: tpl[1],
      strategies: [
        strat('Think Times', [`What number times ${b} makes ${total}?`, `${found} × ${b} = ${found * b}`, `So each one gets ${found} ${tpl[1]}.`], found),
        strat(`Count by ${b}s`, [`Count by ${b}s until you get to ${total}: ${sk.join(', ')}.`, `That took ${sk.length} counts. So each one gets ${sk.length}.`], sk.length),
      ],
      distractors: wrongs(q, [total - b, q + 1, q - 1, total + b]),
      operands: [total, b],
      difficulty: d,
    }
  },

  'me.perimeter': (rng, d) => {
    const r = R(rng)
    let unit = r.pick(SHAPE_UNITS)
    const kind = d === 1 ? r.pick(['rect4', 'tri', 'square']) : d === 2 ? r.pick(['rect2', 'story', 'square']) : r.pick(['missing', 'reg', 'rect2'])
    const common = () => ({ input: 'number' as const, unit, difficulty: d })
    if (kind === 'tri') {
      const a = r.int(3, 9),
        b = r.int(3, 9)
      const c = r.int(Math.max(2, Math.abs(a - b) + 1), Math.min(a + b - 1, 12))
      const s = [a, b, c].sort((x, y) => y - x)
      let tri: string
      ;[tri, unit] = r.pick([
        ['A flag', 'inches'],
        ['A sail', 'feet'],
        ['A garden', 'meters'],
        ['A ramp side', 'feet'],
        ['A kite', 'inches'],
        ['A brick roof', 'cm'],
      ] as [string, string][])
      return {
        prompt: `${tri} is a triangle. What is the perimeter? Add all the sides.`,
        visual: triangleSVG(`${a} ${unit}`, `${b} ${unit}`, `${c} ${unit}`),
        answer: a + b + c,
        strategies: [
          strat('Walk Around the Shape', [`Perimeter is the distance all the way around.`, `Add the three sides: ${a} + ${b} + ${c} = ${a + b + c}`], a + b + c),
          strat('Biggest Sides First', [`Add the two biggest sides: ${s[0]} + ${s[1]} = ${s[0] + s[1]}`, `Then the last side: ${s[0] + s[1]} + ${s[2]} = ${s[0] + s[1] + s[2]}`], s[0] + s[1] + s[2]),
        ],
        distractors: wrongs(a + b + c, [a + b, b + c, a + b + c + 1, a * b]),
        operands: [a, b, c],
        ...common(),
      }
    }
    if (kind === 'square') {
      const s = d === 1 ? r.int(2, 9) : r.int(6, 25)
      let sq: string
      ;[sq, unit] = r.pick([
        ['A base', 'inches'],
        ['A window', 'inches'],
        ['A brick plate', 'cm'],
        ['A sandbox', 'feet'],
        ['A picture frame', 'inches'],
        ['A game board', 'inches'],
        ['A play mat', 'feet'],
      ] as [string, string][])
      return {
        prompt: `${sq} is a square. Each side is ${s} ${unit}. What is the perimeter?`,
        visual: rectSVG(1, 1, { top: `${s} ${unit}`, fill: '#fff9c4' }),
        answer: 4 * s,
        strategies: [
          strat('Add All Four Sides', [`A square has 4 sides that are all the same.`, `${s} + ${s} + ${s} + ${s} = ${s + s + s + s}`], s + s + s + s),
          strat('Double and Double', [`Two sides: ${s} + ${s} = ${s + s}`, `Two more sides is the same again: ${s + s} + ${s + s} = ${(s + s) * 2}`], (s + s) * 2),
        ],
        distractors: wrongs(4 * s, [s * s, 2 * s, s, 3 * s]),
        operands: [s, s],
        ...common(),
      }
    }
    if (kind === 'reg') {
      const n = r.pick([5, 6, 8, 3])
      const s = r.int(3, 12)
      const name = { 3: 'triangle', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' }[n]
      const sk = skips(s, n)
      return {
        prompt: `This ${name} has ${n} sides that are all the same. Each side is ${s} ${unit}. What is the perimeter?`,
        visual: polygonSVG(n, `${s} ${unit}`),
        answer: n * s,
        strategies: [strat('Multiply', [`There are ${n} sides. Each one is ${s}.`, `${n} × ${s} = ${n * s}`], n * s), strat('Count Side by Side', [`Go around the shape. Count by ${s}s, one count for each side.`, `${sk.join(', ')}.`], sk[n - 1])],
        distractors: wrongs(n * s, [n + s, (n - 1) * s, s * s, 4 * s]),
        operands: [n, s],
        ...common(),
      }
    }
    const l = d === 1 ? r.int(3, 9) : d === 2 ? r.int(5, 20) : r.int(6, 30)
    let w = d === 1 ? r.int(2, 8) : d === 2 ? r.int(3, 15) : r.int(3, 20)
    if (w === l) w = l > 3 ? l - 1 : l + 1
    const P = 2 * (l + w)
    if (kind === 'missing') {
      return {
        prompt: `A rectangle has a perimeter of ${P} ${unit}. Its long side is ${Math.max(l, w)} ${unit}. How long is the short side?`,
        visual: rectSVG(Math.max(l, w), Math.min(l, w), { top: `${Math.max(l, w)} ${unit}`, left: '?' }),
        answer: Math.min(l, w),
        strategies: [
          strat('Take Away the Long Sides', [`There are two long sides: ${Math.max(l, w)} + ${Math.max(l, w)} = ${2 * Math.max(l, w)}`, `What is left is for the two short sides: ${P} − ${2 * Math.max(l, w)} = ${P - 2 * Math.max(l, w)}`, `Split it in two: ${P - 2 * Math.max(l, w)} ÷ 2 = ${(P - 2 * Math.max(l, w)) / 2}`], (P - 2 * Math.max(l, w)) / 2),
          strat('Half Way Around', [`Half of the way around is one long side and one short side: ${P} ÷ 2 = ${P / 2}`, `Take away the long side: ${P / 2} − ${Math.max(l, w)} = ${P / 2 - Math.max(l, w)}`], P / 2 - Math.max(l, w)),
        ],
        distractors: wrongs(Math.min(l, w), [P - 2 * Math.max(l, w), P - Math.max(l, w), P / 2, Math.min(l, w) + 1]),
        operands: [P, Math.max(l, w)],
        ...common(),
      }
    }
    const [thing, u2] = r.pick([
      ['garden', 'meters'],
      ['field', 'yards'],
      ['dog yard', 'feet'],
      ['sandbox', 'feet'],
      ['pool', 'meters'],
      ['dance floor', 'feet'],
      ['shop sign', 'inches'],
      ['batting cage', 'feet'],
    ] as [string, string][])
    if (kind !== 'missing') unit = u2
    const prompt =
      kind === 'story'
        ? `${r.pick(NAMES)} puts a fence around a ${thing}. It is ${l} ${unit} long and ${w} ${unit} wide. How many ${unit} of fence go all the way around?`
        : kind === 'rect4'
          ? `What is the perimeter of this ${thing}? Add all four sides.`
          : `What is the perimeter of this ${thing}? The sides across from each other are the same.`
    return {
      prompt,
      visual: rectSVG(l, w, kind === 'rect4' ? { top: `${l} ${unit}`, bottom: `${l} ${unit}`, left: `${w} ${unit}`, right: `${w} ${unit}` } : { top: `${l} ${unit}`, left: `${w} ${unit}` }),
      answer: P,
      strategies: [
        strat('Walk Around the Shape', [`Perimeter is the distance all the way around. There are 4 sides.`, `${l} + ${w} + ${l} + ${w} = ${l + w + l + w}`], l + w + l + w),
        strat('Half, Then Double', [`One long side and one short side: ${l} + ${w} = ${l + w}`, `That is half way around. Double it: ${l + w} + ${l + w} = ${(l + w) * 2}`], (l + w) * 2),
      ],
      // multiplied (that is area); added only two sides; forgot one side
      distractors: wrongs(P, [l * w, l + w, 2 * l + w, l + 2 * w]),
      operands: [l, w],
      ...common(),
    }
  },

  'me.area-count': (rng, d) => {
    const r = R(rng)
    const thing = r.pick(['a brick wall', 'a dance floor', 'a tile floor', 'a quilt', 'a garden bed', 'a game board', 'a window', 'a patch of grass'])
    const ask = r.pick(['How many square units is its area?', 'What is the area in square units?', 'How many squares cover it?'])
    if (d === 3) {
      const Rr = r.int(3, 6),
        C = r.int(4, 8)
      const r2 = r.int(1, Rr - 1),
        c2 = r.int(1, C - 2)
      const topA = r2 * (C - c2),
        botA = (Rr - r2) * C
      return {
        prompt: `{n} draws ${thing} with a corner cut out. Each small square is 1 square unit. ${ask}`,
        visual: lShapeSVG(Rr, C, r2, c2),
        input: 'number',
        answer: Rr * C - r2 * c2,
        unit: 'square units',
        strategies: [
          strat('Cut It Into Two Rectangles', [`Top part: ${pl(r2, 'row', 'rows')} of ${C - c2}. ${r2} × ${C - c2} = ${topA}`, `Bottom part: ${pl(Rr - r2, 'row', 'rows')} of ${C}. ${Rr - r2} × ${C} = ${botA}`, `${topA} + ${botA} = ${topA + botA}`], topA + botA),
          strat('Fill In the Corner, Then Take It Back', [`If the corner were filled in: ${Rr} × ${C} = ${Rr * C}`, `The missing corner is ${r2} × ${c2} = ${r2 * c2}`, `${Rr * C} − ${r2 * c2} = ${Rr * C - r2 * c2}`], Rr * C - r2 * c2),
        ],
        // counted the full rectangle; counted the edge; missed one row
        distractors: wrongs(Rr * C - r2 * c2, [Rr * C, 2 * (Rr + C), Rr * C - r2 * c2 - C, Rr * C - r2 * c2 + c2]),
        operands: [Rr, C, r2, c2],
        difficulty: d,
      }
    }
    const rows = d === 1 ? r.int(1, 4) : r.int(2, 6),
      cols = d === 1 ? r.int(2, 5) : r.int(4, 10)
    const sk = skips(cols, rows)
    return {
      prompt: `{n} draws ${thing}. Each small square is 1 square unit. ${ask}`,
      visual: rectSVG(cols, rows, { grid: true, fill: '#c8e6c9' }),
      input: 'number',
      answer: rows * cols,
      unit: 'square units',
      strategies: [
        strat('Count Row by Row', [`There ${rows === 1 ? 'is 1 row' : `are ${rows} rows`}. Each row has ${cols} squares.`, `Count by ${cols}s, one count for each row: ${sk.join(', ')}.`], sk[rows - 1]),
        strat('Rows Times Columns', [`${pl(rows, 'row', 'rows')} of ${cols} is a times fact.`, `${rows} × ${cols} = ${rows * cols}`], rows * cols),
      ],
      // walked around the edge; added the sides; one row short
      distractors: wrongs(rows * cols, [2 * (rows + cols), rows + cols, rows * cols - cols, rows * cols + rows]),
      operands: [rows, cols],
      difficulty: d,
    }
  },

  'me.area-multiply': (rng, d) => {
    const r = R(rng)
    const [thing, unit] = r.pick(AREA_THINGS)
    const l = d === 1 ? r.pick([2, 3, 4, 5, 10]) : d === 2 ? r.int(3, 10) : r.chance(0.35) ? r.pick([20, 30, 40]) : r.int(11, 15)
    const w = d === 1 ? r.int(2, 5) : d === 2 ? r.int(3, 10) : r.int(2, 9)
    const A = l * w
    const sk = skips(l, w)
    const tens = l >= 20
    return {
      prompt: `A ${thing} is ${l} ${unit} long and ${w} ${unit} wide. What is its area?`,
      visual: rectSVG(l, w, { top: `${l} ${unit}`, left: `${w} ${unit}`, fill: '#d1c4e9' }),
      input: 'number',
      answer: A,
      unit: `square ${unit}`,
      strategies: [
        l > 10
          ? tens
            ? strat('Think in Tens', [`${l} is ${l / 10} tens.`, `${l / 10} × ${w} = ${(l / 10) * w}`, `${(l / 10) * w} tens is ${(l / 10) * w * 10}. So the area is ${(l / 10) * w * 10} square ${unit}.`], (l / 10) * w * 10)
            : strat('Break Apart the Long Side', [`Split ${l} into 10 and ${l - 10}.`, `10 × ${w} = ${10 * w}`, `${l - 10} × ${w} = ${(l - 10) * w}`, `${10 * w} + ${(l - 10) * w} = ${10 * w + (l - 10) * w}`], 10 * w + (l - 10) * w)
          : strat('Length Times Width', [`Area is how many squares cover the inside.`, `Multiply the two sides: ${l} × ${w} = ${l * w}`], l * w),
        strat('Count the Rows', [`Think of ${pl(w, 'row', 'rows')} with ${l} squares in each row.`, `Count by ${l}s, ${w} times: ${list(sk)}.`], sk[w - 1]),
      ],
      // found the perimeter; added the sides; one row short
      distractors: wrongs(A, [2 * (l + w), l + w, A - l, A + w]),
      operands: [l, w],
      difficulty: d,
    }
  },

  'me.area-perimeter': (rng, d) => {
    const r = R(rng)
    const unit = r.pick(['feet', 'meters', 'yards'])
    const who = r.pick(NAMES)
    const kind = d === 1 ? r.pick(['sideFromArea', 'fence', 'cover']) : d === 2 ? r.pick(['sideFromArea', 'sideFromPerim', 'which']) : r.pick(['areaFromPerim', 'howMuchMore', 'fenceFromArea'])
    const thing = r.pick(['garden', 'dog pen', 'field', 'sandbox', 'play yard', 'batting cage'])
    if (kind === 'fence' || kind === 'cover') {
      const l = r.int(4, 12),
        w = r.int(2, 9)
      const isP = kind === 'fence'
      const sk = skips(l, w)
      return {
        prompt: isP ? `A ${thing} is ${l} ${unit} long and ${w} ${unit} wide. ${who} puts a fence all the way around. How many ${unit} of fence?` : `A ${thing} is ${l} ${unit} long and ${w} ${unit} wide. ${who} covers all of it with grass. How many square ${unit} of grass?`,
        visual: rectSVG(l, w, { top: `${l} ${unit}`, left: `${w} ${unit}`, fill: '#c8e6c9' }),
        input: 'number',
        answer: isP ? 2 * (l + w) : l * w,
        unit: isP ? unit : `square ${unit}`,
        strategies: isP
          ? [
              strat('Around Means Add', [`A fence goes around the edge. That is perimeter.`, `${l} + ${w} + ${l} + ${w} = ${l + w + l + w}`], l + w + l + w),
              strat('Half, Then Double', [`One long side and one short side: ${l} + ${w} = ${l + w}`, `Double it for the other two sides: ${l + w} + ${l + w} = ${(l + w) * 2}`], (l + w) * 2),
            ]
          : [
              strat('Cover Means Multiply', [`Grass covers the inside. That is area.`, `${l} × ${w} = ${l * w}`], l * w),
              strat('Count the Rows', [`Think of ${pl(w, 'row', 'rows')} with ${l} squares in each.`, `Count by ${l}s, ${w} times: ${sk.join(', ')}.`], sk[w - 1]),
            ],
        // mixed up area and perimeter
        distractors: wrongs(isP ? 2 * (l + w) : l * w, [isP ? l * w : 2 * (l + w), l + w, isP ? 2 * l + w : l * w - l]),
        operands: [l, w],
        difficulty: d,
      }
    }
    if (kind === 'sideFromArea' || kind === 'fenceFromArea') {
      const a = d === 1 ? r.int(2, 6) : r.int(3, 10),
        b = d === 1 ? r.int(2, 9) : r.int(3, 12)
      const A = a * b
      const sk: number[] = []
      for (let v = a; v <= A; v += a) sk.push(v)
      let found = 1
      while (found * a < A) found++
      if (kind === 'sideFromArea')
        return {
          prompt: `A ${thing} is a rectangle. Its area is ${A} square ${unit}. One side is ${a} ${unit}. How long is the other side?`,
          visual: rectSVG(Math.max(a, 3), Math.max(Math.min(b, 6), 2), { left: `${a} ${unit}`, top: '?', fill: '#fff9c4', caption: `Area: ${A} square ${unit}` }),
          input: 'number',
          answer: b,
          unit,
          strategies: [
            strat('Think Times', [`Area is side times side. What number times ${a} makes ${A}?`, `${found} × ${a} = ${found * a}`, `So the other side is ${found} ${unit}.`], found),
            strat(`Count by ${a}s`, [`Each row has ${a} squares. Count by ${a}s until you reach ${A}: ${sk.join(', ')}.`, `That is ${sk.length} counts. So the other side is ${sk.length}.`], sk.length),
          ],
          // took away; used perimeter thinking
          distractors: wrongs(b, [A - a, Math.max(1, Math.floor(A / 2) - a), b + 1, A + a]),
          operands: [A, a],
          difficulty: d,
        }
      return {
        prompt: `A ${thing} is a rectangle. Its area is ${A} square ${unit}. One side is ${a} ${unit}. How many ${unit} of fence go all the way around?`,
        visual: rectSVG(Math.max(a, 3), Math.max(Math.min(b, 6), 2), { left: `${a} ${unit}`, top: '?', fill: '#fff9c4', caption: `Area: ${A} square ${unit}` }),
        input: 'number',
        answer: 2 * (a + b),
        unit,
        strategies: [
          strat('Find the Side, Then Go Around', [`What number times ${a} makes ${A}? ${found} × ${a} = ${found * a}`, `So the sides are ${a} and ${found}.`, `${a} + ${found} + ${a} + ${found} = ${a + found + a + found}`], a + found + a + found),
          strat('Divide, Then Double', [`Other side: ${A} ÷ ${a} = ${A / a}`, `Half way around: ${a} + ${A / a} = ${a + A / a}`, `Double it: ${a + A / a} × 2 = ${(a + A / a) * 2}`], (a + A / a) * 2),
        ],
        distractors: wrongs(2 * (a + b), [a + b, b, A, 2 * (a + b) + 2]),
        operands: [A, a],
        difficulty: d,
      }
    }
    if (kind === 'sideFromPerim' || kind === 'areaFromPerim') {
      const l = r.int(5, 15),
        w = r.int(2, 9)
      const P = 2 * (l + w)
      const wFound = (P - 2 * l) / 2,
        wHalf = P / 2 - l
      if (kind === 'sideFromPerim')
        return {
          prompt: `${who} uses ${P} ${unit} of fence to go around a ${thing}. It is a rectangle. One side is ${l} ${unit}. How long is the side next to it?`,
          visual: rectSVG(4, 3, { top: `${l} ${unit}`, left: '?', fill: '#c8e6c9', caption: `Fence: ${P} ${unit}` }),
          input: 'number',
          answer: w,
          unit,
          strategies: [
            strat('Take Away Two Sides', [`Two sides are ${l} each: ${l} + ${l} = ${2 * l}`, `Fence left for the other two sides: ${P} − ${2 * l} = ${P - 2 * l}`, `Split it in two: ${P - 2 * l} ÷ 2 = ${wFound}`], wFound),
            strat('Half Way Around', [`Half of the fence covers two sides that touch: ${P} ÷ 2 = ${P / 2}`, `Take away the side you know: ${P / 2} − ${l} = ${wHalf}`], wHalf),
          ],
          distractors: wrongs(w, [P - l, P - 2 * l, P / 2, w + 1]),
          operands: [P, l],
          difficulty: d,
        }
      return {
        prompt: `${who} uses ${P} ${unit} of fence to go around a ${thing}. It is a rectangle. One side is ${l} ${unit}. What is the area inside?`,
        visual: rectSVG(4, 3, { top: `${l} ${unit}`, left: '?', fill: '#c8e6c9', caption: `Fence: ${P} ${unit}` }),
        input: 'number',
        answer: l * w,
        unit: `square ${unit}`,
        strategies: [
          strat('Half Way Around First', [`Half of the fence covers two sides that touch: ${P} ÷ 2 = ${P / 2}`, `The other side: ${P / 2} − ${l} = ${wHalf}`, `Area: ${l} × ${wHalf} = ${l * wHalf}`], l * wHalf),
          strat('Take Away Two Sides First', [`${P} − ${l} − ${l} = ${P - l - l}`, `That is two sides, so one is ${P - l - l} ÷ 2 = ${wFound}`, `Area is ${pl(wFound, 'row', 'rows')} of ${l}: ${wFound} × ${l} = ${wFound * l}`], wFound * l),
        ],
        distractors: wrongs(l * w, [w, P * l, l * (P - 2 * l), l * (P / 2), l + w]),
        operands: [P, l],
        difficulty: d,
      }
    }
    // two pens that use the same fence
    const half = r.int(6, d === 2 ? 10 : 14)
    let l1 = r.int(1, Math.floor(half / 2)),
      l2 = r.int(1, Math.floor(half / 2))
    if (l1 === l2) l2 = l1 === 1 ? 2 : l1 - 1
    const [w1, w2] = [half - l1, half - l2]
    const A1 = l1 * w1,
      A2 = l2 * w2
    const P = 2 * half
    const cell = Math.min(22, 150 / Math.max(w1, w2))
    const visual = `<div style="display:flex;justify-content:center;align-items:flex-end;gap:18px;flex-wrap:wrap">${[
      ['Pen A', w1, l1, '#bbdefb'],
      ['Pen B', w2, l2, '#ffe0b2'],
    ]
      .map(
        ([nm, ww, ll, fill]) =>
          `<div style="flex:0 1 ${Math.round((ww as number) * cell + 30)}px;min-width:130px;text-align:center;font-weight:700;font-size:17px;color:${INK}"><div style="white-space:nowrap">${nm}: ${ww} by ${ll}</div>${rectSVG(ww as number, ll as number, { grid: true, cell, fill: fill as string })}</div>`,
      )
      .join('')}</div>`
    const bigger = A1 > A2 ? 'Pen A' : 'Pen B'
    const squarer = Math.abs(w1 - l1) < Math.abs(w2 - l2) ? 'Pen A' : 'Pen B'
    const sk1 = skips(w1, l1),
      sk2 = skips(w2, l2)
    if (kind === 'which')
      return {
        prompt: `Two dog pens each use ${P} ${unit} of fence. Pen A is ${w1} by ${l1}. Pen B is ${w2} by ${l2}. Which pen has more room inside?`,
        visual,
        ...choice(bigger, ['Pen A', 'Pen B', 'Same'], rng, true),
        strategies: [
          strat('Find Both Areas', [`Room inside is area. Pen A: ${w1} × ${l1} = ${A1}`, `Pen B: ${w2} × ${l2} = ${A2}`, `${Math.max(A1, A2)} is more than ${Math.min(A1, A2)}. ${bigger} has more room.`], bigger),
          strat('Closer to a Square Wins', [`Both pens use the same fence.`, `When the fence is the same, the pen that is closer to a square holds more.`, `${squarer} has sides that are closer together. ${squarer} has more room.`], squarer),
        ],
        operands: [w1, l1, w2, l2],
        difficulty: d,
      }
    return {
      prompt: `Two dog pens each use ${P} ${unit} of fence. Pen A is ${w1} by ${l1}. Pen B is ${w2} by ${l2}. How many more square ${unit} are inside the bigger pen?`,
      visual,
      input: 'number',
      answer: Math.abs(A1 - A2),
      unit: `square ${unit}`,
      strategies: [
        strat('Find Both Areas', [`Pen A: ${w1} × ${l1} = ${A1}`, `Pen B: ${w2} × ${l2} = ${A2}`, `${Math.max(A1, A2)} − ${Math.min(A1, A2)} = ${Math.max(A1, A2) - Math.min(A1, A2)}`], Math.max(A1, A2) - Math.min(A1, A2)),
        strat('Count the Rows', [`Pen A: count by ${w1}s, ${l1} ${l1 === 1 ? 'time' : 'times'}: ${sk1.join(', ')}.`, `Pen B: count by ${w2}s, ${l2} ${l2 === 1 ? 'time' : 'times'}: ${sk2.join(', ')}.`, `Count up from ${Math.min(sk1[l1 - 1], sk2[l2 - 1])} to ${Math.max(sk1[l1 - 1], sk2[l2 - 1])}. That is ${Math.abs(sk1[l1 - 1] - sk2[l2 - 1])}.`], Math.abs(sk1[l1 - 1] - sk2[l2 - 1])),
      ],
      // same fence so "no difference"; gave the bigger area; added
      distractors: wrongs(Math.abs(A1 - A2), [0, Math.max(A1, A2), A1 + A2, Math.abs(A1 - A2) + 2]),
      operands: [w1, l1, w2, l2],
      difficulty: d,
    }
  },

  'me.units-convert': (rng, d) => {
    const r = R(rng)
    const cv = d === 1 ? r.pick(CONV.filter((c) => c.f !== 16)) : r.pick(CONV)
    const f = cv.f
    const fact = `1 ${cv.big[0]} is ${fmtN(f)} ${cv.small[1]}.`
    /** n × f worked out the easy way for this factor */
    const mult = (n: number): [string[], number] => {
      if (f === 12 || f === 16) return [[`Split ${f} into 10 and ${f - 10}.`, `${n} × 10 = ${n * 10}`, `${n} × ${f - 10} = ${n * (f - 10)}`, `${n * 10} + ${n * (f - 10)} = ${n * 10 + n * (f - 10)}`], n * 10 + n * (f - 10)]
      if (f === 60) return [[`60 is 6 tens. ${n} × 6 = ${n * 6}`, `${n * 6} tens is ${fmtN(n * 6 * 10)}.`], n * 6 * 10]
      if (f === 3) return [[`Each ${cv.big[0]} is 3 ${cv.small[1]}. That is ${pl(n, 'group', 'groups')} of 3.`, `${n} × 3 = ${n * 3}`], n * 3]
      return [[`Each ${cv.big[0]} is ${fmtN(f)} ${cv.small[1]}. That is ${pl(n, 'group', 'groups')} of ${fmtN(f)}.`, `${n} × ${fmtN(f)} = ${fmtN(n * f)}`], n * f]
    }
    const mode = d < 3 ? 'mul' : r.pick(['mixed', 'div', 'mixed'])
    if (mode === 'div') {
      const q = r.int(2, f === 16 || f === 60 ? 6 : 12)
      const total = q * f
      const sk = skips(f, q)
      let found = 1
      while (found * f < total) found++
      return {
        prompt: `${fact} How many ${cv.big[1]} is ${fmtN(total)} ${cv.small[1]}?`,
        input: 'number',
        answer: q,
        unit: cv.big[1],
        strategies: [
          strat('Think Times', [`How many groups of ${fmtN(f)} make ${fmtN(total)}?`, `${found} × ${fmtN(f)} = ${fmtN(found * f)}`, `So it is ${found} ${cv.big[1]}.`], found),
          strat(`Count by ${fmtN(f)}s`, [`Count by ${fmtN(f)}s until you get to ${fmtN(total)}: ${list(sk)}.`, `That took ${sk.length} counts. Each count is 1 ${cv.big[0]}.`], sk.length),
        ],
        // multiplied instead; took away; lost a zero
        distractors: wrongs(q, [total - f, q * 10, q + 1, q - 1]),
        operands: [q, f, 0],
        difficulty: d,
      }
    }
    const n = d === 1 ? r.int(2, 5) : d === 2 ? r.int(f === 16 || f === 60 ? 2 : 3, f === 16 || f === 60 ? 6 : f === 12 ? 9 : 12) : r.int(1, f === 16 || f === 60 ? 5 : 9)
    const extra = mode === 'mixed' ? (f >= 100 ? (f === 100 ? r.int(1, 19) * 5 : r.int(1, 19) * 50) : r.int(1, f - 1)) : 0
    const ans = n * f + extra
    const [ms, mv] = mult(n)
    const sk = skips(f, n)
    const amount = pl(n, cv.big[0], cv.big[1]) + (extra ? ` and ${pl(extra, cv.small[0], cv.small[1])}` : '')
    const story = r.chance(0.5)
    return {
      prompt: story ? `${cv.story(amount)} ${fact} How many ${cv.small[1]} is that?` : `${fact} How many ${cv.small[1]} are in ${amount}?`,
      input: 'number',
      answer: ans,
      unit: cv.small[1],
      strategies: [
        strat('Multiply', [...ms, ...(extra ? [`Now add the extra ${pl(extra, cv.small[0], cv.small[1])}: ${fmtN(mv)} + ${fmtN(extra)} = ${fmtN(mv + extra)}`] : [])], mv + extra),
        strat(`Count by ${fmtN(f)}s`, [`Count by ${fmtN(f)}s, one count for each ${cv.big[0]}: ${list(sk)}.`, ...(extra ? [`Then count on ${fmtN(extra)} more: ${fmtN(sk[n - 1])} + ${fmtN(extra)} = ${fmtN(sk[n - 1] + extra)}`] : [`The last number is the answer: ${fmtN(sk[n - 1])}.`])], sk[n - 1] + extra),
      ],
      // added instead of multiplied; lost or gained a zero; forgot the extra part; stuck the digits together
      distractors: wrongs(ans, [n + f + extra, f >= 100 ? (n * f) / 10 + extra : n * 10 + extra, extra ? n * f : ans + f, extra ? n + extra : ans - f, (n + 1) * f + extra]),
      operands: [n, f, extra],
      difficulty: d,
    }
  },

  'me.line-plot': (rng, d) => {
    const r = R(rng)
    const [thing, things] = r.pick([
      ['pencil', 'pencils'],
      ['worm', 'worms'],
      ['leaf', 'leaves'],
      ['ribbon', 'ribbons'],
      ['bean plant', 'bean plants'],
      ['brick tower', 'brick towers'],
      ['shell', 'shells'],
    ] as [string, string][])
    const stepQ = d === 1 ? r.pick([4, 2]) : d === 2 ? r.pick([2, 1]) : 1
    const nT = d === 1 ? 5 : r.int(5, 7)
    const a = r.int(1, 6)
    const qs = upTo(0, nT - 1).map((i) => a * 4 + i * stepQ)
    const kind = d === 1 ? r.pick(['at', 'all', 'most']) : d === 2 ? r.pick(['longer', 'shorter', 'most', 'all']) : r.pick(['range', 'range', 'longer', 'shorter'])
    let counts: number[] = []
    for (let tries = 0; tries < 80; tries++) {
      counts = qs.map(() => r.int(0, d === 1 ? 4 : 5))
      const mx = Math.max(...counts)
      const nz = counts.filter(Boolean).length
      if (sum(counts) >= 5 && sum(counts) <= 18 && nz >= 3 && counts.filter((c) => c === mx).length === 1) break
      counts = qs.map((_, i) => [2, 0, 3, 1, 1, 0, 2][i])
    }
    const total = sum(counts)
    const title = `${thing.replace(/(^| )[a-z]/g, (c) => c.toUpperCase())} Lengths`
    const visual = linePlotSVG(title, qs.map(qLabel), counts)
    const lead = `{n} measured some ${things}. Each X is one ${thing}.`
    const common = { visual, operands: [a, stepQ, ...counts], difficulty: d }
    const nonzero = upTo(0, nT - 1).filter((i) => counts[i] > 0)
    if (kind === 'at') {
      const i = r.pick(nonzero)
      return {
        prompt: `${lead} How many ${things} are ${qWords(qs[i])} ${qs[i] === 4 ? 'inch' : 'inches'} long?`,
        input: 'number',
        answer: counts[i],
        strategies: [
          strat('Find the Spot', [`Find ${qWords(qs[i])} on the number line.`, `Count the X marks stacked above it: ${upTo(1, counts[i]).join(', ')}.`], upTo(1, counts[i]).length),
          strat('Take Away the Others', [`There are ${total} X marks in all.`, `${total - counts[i]} of them are above other numbers.`, `${total} − ${total - counts[i]} = ${total - (total - counts[i])}`], total - (total - counts[i])),
        ],
        // read the number under the stack; read the stack next door; counted everything
        distractors: wrongs(counts[i], [Math.floor(qs[i] / 4), counts[(i + 1) % nT], total, counts[i] + 1]),
        ...common,
      }
    }
    if (kind === 'all') {
      const run = counts.map((_, k) => sum(counts.slice(0, k + 1)))
      return {
        prompt: `${lead} How many ${things} did {n} measure in all?`,
        input: 'number',
        answer: total,
        strategies: [
          strat('Add Each Stack', [`Count the X marks above each number: ${counts.join(', ')}.`, `${plus(counts)} = ${sum(counts)}`], sum(counts)),
          strat('Keep a Running Count', [`Go left to right. Keep counting on as you pass each stack.`, `Running count: ${run.join(', ')}.`], run[run.length - 1]),
        ],
        // counted the numbers on the line; only the tallest stack
        distractors: wrongs(total, [nT, Math.max(...counts), total + 1, total - 1, nonzero.length]),
        ...common,
      }
    }
    if (kind === 'most') {
      const mx = Math.max(...counts)
      const mi = counts.indexOf(mx)
      const opts = [mi, ...r.shuffle(upTo(0, nT - 1).filter((i) => i !== mi)).slice(0, 3)].sort((x, y) => x - y)
      const sorted = [...counts].sort((x, y) => y - x)
      return {
        prompt: `${lead} Which length shows up the most?`,
        ...choice(`${qLabel(qs[mi])} inches`, opts.map((i) => `${qLabel(qs[i])} inches`), rng, true),
        strategies: [
          strat('Find the Tallest Stack', [`The most X marks means the tallest stack.`, `The tallest stack is above ${qWords(qs[mi])}. So the answer is ${qLabel(qs[mi])} inches.`], `${qLabel(qs[mi])} inches`),
          strat('Count Every Stack', [`Stacks from left to right: ${counts.join(', ')}.`, `The biggest count is ${sorted[0]}. That stack is above ${qWords(qs[counts.indexOf(sorted[0])])}.`], `${qLabel(qs[counts.indexOf(sorted[0])])} inches`),
        ],
        ...common,
      }
    }
    if (kind === 'longer' || kind === 'shorter') {
      const longer = kind === 'longer'
      let i = r.int(1, nT - 2)
      const side = (k: number) => (longer ? sum(counts.slice(k + 1)) : sum(counts.slice(0, k)))
      if (side(i) === 0) i = longer ? nonzero[0] : nonzero[nonzero.length - 1]
      if (side(i) === 0) i = longer ? 0 : nT - 1
      const part = longer ? counts.slice(i + 1) : counts.slice(0, i)
      const rest = total - sum(part)
      return {
        prompt: `${lead} How many ${things} are ${longer ? 'longer' : 'shorter'} than ${qWords(qs[i])} inches?`,
        input: 'number',
        answer: sum(part),
        strategies: [
          strat(longer ? 'Look to the Right' : 'Look to the Left', [`${longer ? 'Longer' : 'Shorter'} means to the ${longer ? 'right' : 'left'} of ${qWords(qs[i])}. Do not count the stack at ${qWords(qs[i])}.`, part.length > 1 ? `Add those stacks: ${plus(part)} = ${sum(part)}` : `There is one stack there. It has ${sum(part)}.`], sum(part)),
          strat('Take Away the Rest', [`There are ${total} X marks in all.`, `${rest} of them are at ${qWords(qs[i])} or ${longer ? 'shorter' : 'longer'}.`, `${total} − ${rest} = ${total - rest}`], total - rest),
        ],
        // counted the stack at that length too; counted the other side; counted numbers, not X marks
        distractors: wrongs(sum(part), [sum(part) + counts[i] || sum(part) + 1, total - sum(part) - counts[i], part.length, total]),
        ...common,
      }
    }
    // how much longer is the longest than the shortest
    const lo = nonzero[0],
      hi = nonzero[nonzero.length - 1]
    const hopsN = hi - lo
    const dq = qs[hi] - qs[lo]
    const den = stepQ === 2 ? 2 : 4
    const hopName = stepQ === 4 ? '1' : `1/${den}`
    const whole = dq % 4 === 0
    const prompt = `${lead} How many inches longer is the longest ${thing} than the shortest ${thing}?`
    const s2steps = [`Shortest: ${qWords(qs[lo])} is the same as ${qs[lo] / (4 / den)}/${den}. Longest: ${qWords(qs[hi])} is the same as ${qs[hi] / (4 / den)}/${den}.`, `${qs[hi] / (4 / den)}/${den} − ${qs[lo] / (4 / den)}/${den} = ${dq / (4 / den)}/${den}`]
    if (whole) {
      const n = dq / 4
      return {
        prompt,
        input: 'number',
        answer: n,
        unit: n === 1 ? 'inch' : 'inches',
        strategies: [
          strat('Count the Hops', [`The shortest X is at ${qWords(qs[lo])}. The longest X is at ${qWords(qs[hi])}.`, `Each hop on the line is ${hopName} inch. It takes ${pl(hopsN, 'hop', 'hops')}.`, stepQ === 4 ? `${hopsN} × 1 = ${hopsN}` : `${hopsN} hops of ${hopName} is ${hopsN}/${den}. That makes ${(hopsN * stepQ) / 4} whole ${n === 1 ? 'inch' : 'inches'}.`], (hopsN * stepQ) / 4),
          strat('Take Away', [...s2steps, `${dq / (4 / den)}/${den} = ${dq / 4}`], dq / 4),
        ],
        distractors: wrongs(n, [hopsN !== n ? hopsN : n + 1, Math.floor(qs[hi] / 4), (qs[nT - 1] - qs[0]) / 4 === n ? n + 2 : Math.ceil((qs[nT - 1] - qs[0]) / 4), n - 1]),
        ...common,
      }
    }
    const ans = frac(dq, 4)
    const cands = [`${hopsN}/1`, frac(dq + stepQ, 4), frac(qs[nT - 1] - qs[0], 4), `${qs[hi] % 4 || 1}/${den}`, frac(dq, 2)]
    const dz = cands.filter((c, k) => {
      const [x, y] = c.split('/').map(Number)
      return x * 4 !== dq * y && cands.findIndex((o) => o === c) === k
    })
    return {
      prompt: `${prompt} Type a fraction like 3/4. If it is more than 1, type it like 5/4.`,
      input: 'fraction',
      answer: ans,
      strategies: [
        strat('Count the Hops', [`The shortest X is at ${qWords(qs[lo])}. The longest X is at ${qWords(qs[hi])}.`, `Each hop on the line is ${hopName} inch. It takes ${pl(hopsN, 'hop', 'hops')}.`, `${hopsN} hops of ${hopName} is ${hopsN}/${den}.`], frac(hopsN * stepQ, 4)),
        strat('Take Away', s2steps, frac(qs[hi] - qs[lo], 4)),
      ],
      distractors: dz.length ? dz : [frac(dq + 4, 4)],
      ...common,
    }
  },

  'me.volume-count': (rng, d) => {
    const r = R(rng)
    let l: number, w: number, h: number
    if (d === 1) {
      l = r.int(2, 4)
      w = r.int(1, 2)
      h = w === 1 ? r.int(2, 3) : r.int(1, 3)
    } else if (d === 2) {
      l = r.int(2, 4)
      w = r.int(2, 3)
      h = r.int(2, 3)
    } else {
      l = r.int(3, 5)
      w = r.int(2, 4)
      h = r.int(2, 4)
    }
    const V = l * w * h
    const who = r.pick(NAMES)
    const ctx = r.pick([`${who} stacks brick cubes into a block.`, `${who} packs cube boxes of baseballs.`, `${who} builds a solid block from cubes.`, `${who} stacks ice cubes.`, `${who} piles up toy blocks.`, `${who} fills a box with cubes.`])
    const ask = r.pick(['How many cubes are there? Count the hidden ones too.', 'What is the volume in cubes? Some cubes are hidden.', 'How many cubes make this block? Do not forget the ones inside.'])
    const layer = l * w
    const sk = skips(layer, h)
    const wall = l * h
    const visible = l * w + l * h + w * h - l - w - h + 1
    return {
      prompt: `${ctx} ${ask}`,
      visual: cubesSVG(l, w, h),
      input: 'number',
      answer: V,
      unit: 'cubes',
      strategies: [
        strat('Layer by Layer', [`Look at the top layer: ${pl(w, 'row', 'rows')} of ${l}. ${w} × ${l} = ${layer}`, h === 1 ? 'There is just 1 layer.' : `There are ${h} layers, one on top of the other.`, `Count by ${layer}s, one count for each layer: ${sk.join(', ')}.`], sk[h - 1]),
        strat('Front Wall, Then Back', [`The front wall is ${l} wide and ${h} tall: ${l} × ${h} = ${wall}`, `There ${w === 1 ? 'is 1 wall' : `are ${w} walls`} like it, front to back.`, `${wall} × ${w} = ${wall * w}`], wall * w),
      ],
      // counted only the cubes you can see; counted the faces; added the sides; one layer only
      distractors: wrongs(V, [visible, l * w + l * h + w * h, l + w + h, h > 1 ? layer : V + l, V - 1]),
      operands: [l, w, h],
      difficulty: d,
    }
  },

  'me.volume-multiply': (rng, d) => {
    const r = R(rng)
    const [thing, unit] = r.pick([
      ['toy box', 'feet'],
      ['fish tank', 'feet'],
      ['sandbox', 'feet'],
      ['ball crate', 'feet'],
      ['cooler', 'inches'],
      ['brick bin', 'inches'],
      ['gear locker', 'feet'],
      ['gift box', 'cm'],
      ['pool', 'meters'],
    ] as [string, string][])
    const l = d === 1 ? r.int(2, 5) : d === 2 ? r.int(4, 10) : r.int(5, 12)
    const w = d === 1 ? r.int(2, 4) : d === 2 ? r.int(2, 6) : r.int(2, 8)
    const h = d === 1 ? r.int(2, 3) : d === 2 ? r.int(2, 5) : r.int(2, 10)
    const V = l * w * h
    const base = l * w
    if (d === 3 && r.chance(0.4)) {
      let found = 1
      while (found * base < V) found++
      return {
        prompt: `A ${thing} holds ${fmtN(V)} cubic ${unit}. It is ${l} ${unit} long and ${w} ${unit} wide. How tall is it?`,
        visual: boxSVG(l, w, h, unit, '?'),
        input: 'number',
        answer: h,
        unit,
        strategies: [
          strat('Find the Floor First', [`The floor of the box is ${l} × ${w} = ${base} squares.`, `Each layer holds ${base} cubes. How many layers make ${fmtN(V)}?`, `${fmtN(V)} ÷ ${base} = ${V / base}`], V / base),
          strat('Undo One Side at a Time', [`Divide by the length: ${fmtN(V)} ÷ ${l} = ${V / l}`, `Divide by the width: ${V / l} ÷ ${w} = ${V / l / w}`, `Check: ${l} × ${w} × ${found} = ${fmtN(l * w * found)}`], found),
        ],
        distractors: wrongs(h, [V / l, V / w, Math.max(1, V - base), h + 1, h - 1].filter((x) => x <= 2000)),
        operands: [l, w, h],
        difficulty: d,
      }
    }
    return {
      prompt: `A ${thing} is ${l} ${unit} long, ${w} ${unit} wide and ${h} ${unit} tall. What is its volume?`,
      visual: boxSVG(l, w, h, unit),
      input: 'number',
      answer: V,
      unit: `cubic ${unit}`,
      strategies: [
        strat('Floor Times Height', [`The floor is length times width: ${l} × ${w} = ${base}`, `Stack up ${h} layers like that: ${base} × ${h} = ${fmtN(base * h)}`], base * h),
        strat('A Different Order', [`You can multiply in any order. Try width times height first: ${w} × ${h} = ${w * h}`, `Then times the length: ${w * h} × ${l} = ${fmtN(w * h * l)}`], w * h * l),
      ],
      // added the sides; stopped at the floor; floor plus height; added the three faces
      distractors: wrongs(V, [l + w + h, base, base + h, l * w + l * h + w * h, V + base]),
      operands: [l, w, h],
      difficulty: d,
    }
  },

  'me.runs-per-game': (rng, d) => {
    const r = R(rng)
    const team = r.pick(TEAMS)
    if (d === 3 && r.chance(0.45)) {
      const n = r.int(6, 12),
        q = r.int(3, 9)
      const total = n * q
      const c1 = q > 5 ? 5 : q - 1
      let found = 1
      while (found * n < total) found++
      return {
        prompt: `The ${team} scored ${total} runs in ${n} games. What is the mean (average) number of runs per game?`,
        input: 'number',
        answer: q,
        unit: 'runs per game',
        strategies: [
          strat('Think Times', [`Runs per game means share the runs the same over all ${n} games.`, `What number times ${n} makes ${total}? ${found} × ${n} = ${found * n}`, `So it is ${found} runs per game.`], found),
          strat('Share in Two Chunks', [`Give each game ${c1} first: ${c1} × ${n} = ${c1 * n}`, `Runs left to share: ${total} − ${c1 * n} = ${total - c1 * n}`, `${total - c1 * n} ÷ ${n} = ${(total - c1 * n) / n} more for each game.`, `${c1} + ${(total - c1 * n) / n} = ${c1 + (total - c1 * n) / n}`], c1 + (total - c1 * n) / n),
        ],
        // took away; added; off by one
        distractors: wrongs(q, [total - n, q + 1, q - 1, n]),
        operands: [total, n],
        difficulty: d,
      }
    }
    const n = d === 1 ? r.int(2, 3) : d === 2 ? r.int(4, 5) : r.int(5, 6)
    const mean = d === 1 ? r.int(2, 6) : d === 2 ? r.int(3, 8) : r.int(4, 10)
    const hi = d === 1 ? 10 : d === 2 ? 12 : 16
    let runs: number[] = []
    for (let tries = 0; tries < 80; tries++) {
      runs = Array.from({ length: n - 1 }, () => r.int(Math.max(d === 1 ? 1 : 0, mean - 5), Math.min(hi, mean + 5)))
      const last = n * mean - sum(runs)
      if (last >= (d === 1 ? 1 : 0) && last <= hi && (last !== mean || runs.some((v) => v !== mean))) {
        runs.push(last)
        break
      }
      runs = [mean - 1, mean + 1, ...Array(n - 2).fill(mean)]
    }
    const total = sum(runs)
    const mn = Math.min(...runs)
    const extras = runs.map((v) => v - mn)
    const sorted = [...runs].sort((a, b) => a - b)
    return {
      prompt: `The ${team} scored ${runs.slice(0, -1).join(', ')} and ${runs[n - 1]} runs in ${n} games. What is the mean (average) number of runs per game?`,
      visual: scoreSVG(team, runs),
      input: 'number',
      answer: mean,
      unit: 'runs per game',
      strategies: [
        strat('Add, Then Share', [`Add all the runs: ${plus(runs)} = ${total}`, `Share them the same over ${n} games: ${total} ÷ ${n} = ${total / n}`], total / n),
        strat('Level It Out', [mn === 0 ? 'The lowest game has 0 runs. So every run is an extra run.' : `Every game has at least ${mn} ${mn === 1 ? 'run' : 'runs'}. Look at the extra runs above ${mn}.`, `Extras: ${plus(extras)} = ${sum(extras)}`, `Share the extras over ${n} games: ${sum(extras)} ÷ ${n} = ${sum(extras) / n}`, `${mn} + ${sum(extras) / n} = ${mn + sum(extras) / n}`], mn + sum(extras) / n),
      ],
      // gave the total; the biggest game; the middle game; divided by the wrong number
      distractors: wrongs(mean, [total, Math.max(...runs), sorted[Math.floor(n / 2)], total % (n - 1) === 0 ? total / (n - 1) : mean + 1, mean - 1]),
      operands: runs,
      difficulty: d,
    }
  },

  'me.batting-average': (rng, d) => {
    const r = R(rng)
    const ab = d === 1 ? r.pick([2, 4, 5, 10]) : d === 2 ? r.pick([8, 20, 25, 40, 50]) : r.pick([100, 125, 200, 250, 500])
    const hits = d === 1 ? r.int(1, ab - 1) : d === 2 ? r.int(Math.ceil(ab * 0.1), Math.floor(ab * 0.5)) : r.int(ab * 0.2, ab * 0.4)
    const th = (hits * 1000) / ab
    const show = (t: number) => `0.${String(t).padStart(3, '0')}`
    const ans = show(th)
    const k = 1000 / ab
    const who = r.pick(NAMES)
    const when = r.pick(['this week', 'this month', 'this season', 'at camp', 'in the playoffs', 'so far'])
    const ex = th === 250 ? 400 : 250
    return {
      prompt: `${who} got ${pl(hits, 'hit', 'hits')} in ${ab} at-bats ${when}. What is the batting average? Type it like ${show(ex)}. (A card shows it as ${show(ex).slice(1)}.)`,
      input: 'decimal',
      answer: ans,
      strategies: [
        strat('Hits Divided by At-Bats', [`Batting average is hits ÷ at-bats.`, `${hits} ÷ ${ab} = ${show((hits * 1000) / ab)}`, `Always show 3 places after the dot. On a card it is ${show((hits * 1000) / ab).slice(1)}.`], show((hits * 1000) / ab)),
        strat('Make It Out of 1,000', [`Grow the at-bats to 1,000: ${ab} × ${k} = 1,000`, `Grow the hits the same way: ${hits} × ${k} = ${fmtN(hits * k)}`, `${hits * k} hits out of 1,000 is ${hits * k} thousandths. Write ${show(hits * k)}.`], show(hits * k)),
      ],
      // outs ÷ at-bats; dot in the wrong spot; just wrote the hits after the dot; stuck the two numbers together
      distractors: decWrongs(ans, [show(1000 - th), th % 10 === 0 ? `${th / 100}` : `${Math.floor(th / 100)}.${String(th % 100).padStart(2, '0')}`, `0.${hits}`, ...(th % 10 === 0 ? [show(th / 10)] : [])], show(th === 500 ? 250 : 500)),
      operands: [hits, ab],
      difficulty: d,
    }
  },
}

// ───────────────────────── the big idea of each skill ─────────────────────────
export const teach: Record<string, string> = {
  'me.time-hour-half': 'The short hand tells the hour. The long hand tells the minutes. Long hand on the 12 means o’clock. Long hand on the 6 means half past: 30 minutes.',
  'me.time-5': 'Each big number on a clock is 5 more minutes. Start at the 12 and count by fives to the long hand. The hour is the number the short hand has passed.',
  'me.time-minute': 'Count by fives to the big number just before the long hand. Then count the little marks one by one. The hour is the number the short hand passed last.',
  'me.elapsed': 'To find how much time passed, hop from the start time to the end time. Hop to the next hour first, then keep going. Add your hops.',
  'me.coins': 'A quarter is 25¢, a dime is 10¢, a nickel is 5¢ and a penny is 1¢. Start with the biggest coins and count on.',
  'me.money-totals': '100 cents make 1 dollar. Count the dollars first, then the cents. We write dollars, a dot, then cents, like $2.35.',
  'me.make-change': 'Change is the money you get back. Start at the price and count up to what you paid, just like a cashier does.',
  'me.length-measure': 'Line up one end of the thing with 0 on the ruler. The number at the other end is how long it is. Count the spaces, not the lines.',
  'me.length-compare': 'To find how much longer one thing is, start at the short length and count up to the long one. That gap is the answer.',
  'me.length-add': 'Lengths add just like other numbers. Put end to end means add. Cut off means take away. Keep the same unit in your answer.',
  'me.bar-graph': 'In a bar graph, a taller bar means more. Slide from the top of a bar over to the numbers to read it. Then you can add or compare bars.',
  'me.picture-graph': 'Check the key first! One picture can stand for 2, 5 or 10 things. Count the pictures, then count by that number.',
  'me.mass-volume': 'Grams and kilograms tell how heavy something is. Liters and milliliters tell how much a cup or jug holds. Add, take away, times and share them like any numbers.',
  'me.perimeter': 'Perimeter is the distance all the way around a shape, like a fence. Add up every side.',
  'me.area-count': 'Area is how many squares cover a shape with no gaps. Count the squares. Counting row by row is fast.',
  'me.area-multiply': 'To find the area of a rectangle, multiply its length by its width. It is the same as counting rows of squares.',
  'me.area-perimeter': 'Perimeter goes around the edge: add the sides. Area covers the inside: multiply the sides. Two shapes can have the same fence but hold different room.',
  'me.units-convert': 'A big unit is made of many small units. To change big units into small ones, multiply. 1 foot is 12 inches, so 3 feet is 3 groups of 12.',
  'me.line-plot': 'A line plot shows each measurement as an X above a number line. A tall stack means that length shows up a lot.',
  'me.volume-count': 'Volume is how many cubes fill a solid shape. Count one layer, then count how many layers. Remember the cubes hiding inside.',
  'me.volume-multiply': 'To find the volume of a box, multiply length times width times height. That is the floor layer times the number of layers.',
  'me.runs-per-game': 'The mean is a fair share. Add up all the runs, then share them the same over every game. That is runs per game.',
  'me.batting-average': 'Batting average is hits divided by at-bats. It is written with 3 places after the dot, like .250. A bigger number means more hits.',
}

// ───────────────────────── what each skill may produce ─────────────────────────
const num = (it: Item, lo: number, hi: number) => it.input === 'number' && typeof it.answer === 'number' && it.answer >= lo && it.answer <= hi
const inRange = (xs: number[], lo: number, hi: number) => xs.every((x) => Number.isInteger(x) && x >= lo && x <= hi)
const DIV1000 = [2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 125, 200, 250, 500]

export const limits: Record<string, (it: Item) => boolean> = {
  'me.time-hour-half': clockLimit((m) => m === 0 || m === 30),
  'me.time-5': clockLimit((m) => m % 5 === 0 && m > 0),
  'me.time-minute': clockLimit((m) => m >= 1),
  'me.elapsed': (it) => {
    const [h, m, dur] = it.operands
    return it.operands.length === 3 && h >= 1 && h <= 9 && m >= 0 && m <= 59 && dur >= 5 && dur <= 152 && !!it.visual && (it.input === 'choice' || (num(it, 5, 152) && it.answer === dur))
  },
  'me.coins': (it) => {
    const [q, di, n, p] = it.operands
    return it.operands.length === 4 && inRange(it.operands, 0, 5) && num(it, 3, 175) && it.answer === q * 25 + di * 10 + n * 5 + p && it.unit === '¢' && !!it.visual
  },
  'me.money-totals': (it) =>
    it.input === 'number' ? num(it, 15, 499) && it.unit === '¢' : it.input === 'decimal' && Number(it.answer) >= 1 && Number(it.answer) <= 10 && /^\d\.\d\d$/.test(String(it.answer)) && inRange(it.operands, 0, 500),
  'me.make-change': (it) => {
    const [paid, cost] = it.operands
    if (![50, 100, 500, 1000, 2000].includes(paid) || cost <= 0 || cost >= paid) return false
    return it.input === 'number' ? paid <= 100 && it.answer === paid - cost : it.input === 'decimal' && paid >= 500 && Math.round(Number(it.answer) * 100) === paid - cost
  },
  'me.length-measure': (it) => {
    const [s, e, mx] = it.operands
    return s >= 0 && e > s && e <= mx && mx <= 15 && num(it, 1, 15) && it.answer === e - s && !!it.visual
  },
  'me.length-compare': (it) => it.operands.length === 2 && inRange(it.operands, 2, 100) && it.operands[0] > it.operands[1] && num(it, 1, 98) && it.answer === it.operands[0] - it.operands[1],
  'me.length-add': (it) => it.operands.length >= 2 && it.operands.length <= 3 && inRange(it.operands, 2, 100) && num(it, 1, 130) && !!it.unit,
  'me.bar-graph': (it) => it.operands.length >= 3 && it.operands.length <= 4 && inRange(it.operands, 1, 10) && !!it.visual && (it.input === 'choice' || num(it, 1, 40)),
  'me.picture-graph': (it) => [2, 4, 5, 10].includes(it.operands[0]) && it.operands.length >= 4 && inRange(it.operands.slice(1), 1, 60) && num(it, 1, 240) && !!it.visual,
  'me.mass-volume': (it) => num(it, 1, 1000) && inRange(it.operands, 1, 1000) && ['grams', 'kg', 'liters', 'mL'].includes(it.unit || ''),
  'me.perimeter': (it) => num(it, 2, 200) && inRange(it.operands, 2, 100) && !!it.visual && SHAPE_UNITS.includes(it.unit || ''),
  'me.area-count': (it) => {
    const o = it.operands
    return num(it, 2, 60) && !!it.visual && it.unit === 'square units' && (o.length === 2 ? it.answer === o[0] * o[1] && o[0] <= 6 && o[1] <= 10 : o.length === 4 && it.answer === o[0] * o[1] - o[2] * o[3] && o[2] < o[0] && o[3] < o[1])
  },
  'me.area-multiply': (it) => it.operands.length === 2 && inRange(it.operands, 2, 40) && num(it, 4, 360) && it.answer === it.operands[0] * it.operands[1] && /^square /.test(it.unit || ''),
  'me.area-perimeter': (it) => inRange(it.operands, 1, 120) && !!it.visual && (it.input === 'choice' ? ['Pen A', 'Pen B'].includes(String(it.answer)) : num(it, 1, 200)),
  'me.units-convert': (it) => {
    const [n, f, extra] = it.operands
    return [3, 12, 16, 60, 100, 1000].includes(f) && n >= 1 && n <= 12 && extra >= 0 && extra < f && num(it, 1, 12999) && (it.answer === n * f + extra || it.answer === n)
  },
  'me.line-plot': (it) => {
    const [a, stepQ, ...counts] = it.operands
    if (!(a >= 1 && a <= 6 && [1, 2, 4].includes(stepQ) && counts.length >= 5 && counts.length <= 7 && inRange(counts, 0, 5) && it.visual)) return false
    return it.input === 'choice' || (it.input === 'fraction' && /^\d+\/[24]$/.test(String(it.answer))) || num(it, 0, 18)
  },
  'me.volume-count': (it) => it.operands.length === 3 && inRange(it.operands, 1, 5) && num(it, 2, 80) && it.answer === it.operands[0] * it.operands[1] * it.operands[2] && !!it.visual,
  'me.volume-multiply': (it) => {
    const [l, w, h] = it.operands
    return it.operands.length === 3 && inRange(it.operands, 2, 12) && num(it, 2, 960) && (it.answer === l * w * h || it.answer === h) && !!it.visual
  },
  'me.runs-per-game': (it) => num(it, 1, 12) && inRange(it.operands, 0, 108) && it.operands.length >= 2 && it.operands.length <= 6,
  'me.batting-average': (it) => {
    const [hits, ab] = it.operands
    return it.input === 'decimal' && DIV1000.includes(ab) && hits >= 1 && hits < ab && /^0\.\d{3}$/.test(String(it.answer)) && Number(String(it.answer).slice(2)) * ab === hits * 1000
  },
}
