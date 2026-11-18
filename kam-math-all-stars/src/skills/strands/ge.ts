import { R, strat, wrongs, choice, type Gen, type Item, type Rng } from '../kit'

/* Geometry: shapes, solids, lines, angles, symmetry, triangles, the field grid, shape families.
   Every picture is drawn from the same numbers the answer is computed from. */

type P = [number, number]
type RR = ReturnType<typeof R>

const INK = '#1d2b36'
const CREAM = '#fffdf5'
const RED = '#d84315'
const BLUE = '#1565c0'
const FILLS = ['#ffcc80', '#90caf9', '#a5d6a7', '#f48fb1', '#ce93d8', '#fff59d', '#80cbc4']

/* ---------- small drawing kit ---------- */
const n1 = (x: number) => String(Math.round(x * 10) / 10)
const svg = (w: number, h: number, body: string, max = 300, label = 'picture') =>
  `<svg viewBox="0 0 ${n1(w)} ${n1(h)}" role="img" aria-label="${label}" style="width:100%;max-width:${max}px;display:block;margin:0 auto">${body}</svg>`
const T = (x: number, y: number, s: string | number, o: { size?: number; fill?: string; anchor?: string; halo?: boolean } = {}) =>
  `<text x="${n1(x)}" y="${n1(y)}" text-anchor="${o.anchor || 'middle'}" font-size="${o.size || 16}" font-weight="700" fill="${o.fill || INK}"${o.halo ? ` stroke="${CREAM}" stroke-width="4" paint-order="stroke" stroke-linejoin="round"` : ''}>${s}</text>`
const ptsStr = (v: P[]) => v.map(([x, y]) => `${n1(x)},${n1(y)}`).join(' ')
const polyEl = (v: P[], fill: string, stroke = INK, sw = 3) => `<polygon points="${ptsStr(v)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
const lineEl = (a: P, b: P, stroke = INK, sw = 3, dash = '') =>
  `<line x1="${n1(a[0])}" y1="${n1(a[1])}" x2="${n1(b[0])}" y2="${n1(b[1])}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
const dot = (p: P, r = 6, fill = INK) => `<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="${r}" fill="${fill}"/>`
const badge = (p: P, s: string | number, fill = RED) => `<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="12" fill="${CREAM}" stroke="${fill}" stroke-width="2"/>${T(p[0], p[1] + 5, s, { size: 14, fill })}`

/* ---------- geometry maths ---------- */
const rad = (deg: number) => (deg * Math.PI) / 180
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]]
const len = (a: P) => Math.hypot(a[0], a[1])
const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
const centroid = (v: P[]): P => [v.reduce((s, p) => s + p[0], 0) / v.length, v.reduce((s, p) => s + p[1], 0) / v.length]
const regular = (n: number, rot = 0, radii?: number[]): P[] =>
  Array.from({ length: n }, (_, i): P => {
    const a = rad(rot + (i * 360) / n - 90)
    const k = radii ? radii[i] : 1
    return [k * Math.cos(a), k * Math.sin(a)]
  })
const rotate = (v: P[], deg: number): P[] => v.map(([x, y]) => [x * Math.cos(rad(deg)) - y * Math.sin(rad(deg)), x * Math.sin(rad(deg)) + y * Math.cos(rad(deg))])
/** A map that moves unit shapes into a box (x, y, w, h) with padding. */
function fitter(v: P[], x: number, y: number, w: number, h: number, pad = 18): (p: P) => P {
  const xs = v.map((p) => p[0]),
    ys = v.map((p) => p[1])
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys)
  const k = Math.min((w - 2 * pad) / (x1 - x0 || 1), (h - 2 * pad) / (y1 - y0 || 1))
  return (p) => [x + w / 2 + (p[0] - (x0 + x1) / 2) * k, y + h / 2 + (p[1] - (y0 + y1) / 2) * k]
}
const fit = (v: P[], x: number, y: number, w: number, h: number, pad = 18) => v.map(fitter(v, x, y, w, h, pad))
const cornerDeg = (v: P[], i: number) => {
  const p = v[i],
    a = sub(v[(i + v.length - 1) % v.length], p),
    b = sub(v[(i + 1) % v.length], p)
  return Math.round((Math.acos((a[0] * b[0] + a[1] * b[1]) / (len(a) * len(b))) * 180) / Math.PI)
}
const sideLens = (v: P[]) => v.map((p, i) => Math.round(len(sub(v[(i + 1) % v.length], p)) * 50) / 50)
const edges = (v: P[]) => v.map((p, i): [P, P] => [p, v[(i + 1) % v.length]])
function parallelPairs(v: P[]): number {
  const e = edges(v).map(([a, b]) => sub(b, a))
  let n = 0
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) if (Math.abs(e[i][0] * e[j][1] - e[i][1] * e[j][0]) < 0.02 * len(e[i]) * len(e[j])) n++
  return n
}
const squareCorners = (v: P[]) => v.filter((_, i) => cornerDeg(v, i) === 90).length
const allEqual = (xs: number[]) => xs.every((x) => Math.abs(x - xs[0]) < 0.03)
/** Name a 4-sided shape by measuring its sides and corners. */
function quadName(v: P[]): string {
  const eq = allEqual(sideLens(v)),
    right = squareCorners(v) === 4,
    pp = parallelPairs(v)
  return eq && right ? 'square' : right ? 'rectangle' : eq ? 'rhombus' : pp === 2 ? 'parallelogram' : pp === 1 ? 'trapezoid' : 'quadrilateral'
}
const BY_SIDES: Record<number, string> = { 3: 'triangle', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' }
const nameFromVerts = (v: P[] | null) => (!v ? 'circle' : v.length === 4 ? quadName(v) : BY_SIDES[v.length] || `${v.length}-sided shape`)
/** Little square marks in every square corner. */
function rightMarks(v: P[], m = 12): string {
  let s = ''
  v.forEach((p, i) => {
    if (cornerDeg(v, i) !== 90) return
    const a = sub(v[(i + v.length - 1) % v.length], p),
      b = sub(v[(i + 1) % v.length], p)
    const u: P = [(a[0] / len(a)) * m, (a[1] / len(a)) * m],
      w: P = [(b[0] / len(b)) * m, (b[1] / len(b)) * m]
    s += `<path d="M${n1(p[0] + u[0])} ${n1(p[1] + u[1])} L${n1(p[0] + u[0] + w[0])} ${n1(p[1] + u[1] + w[1])} L${n1(p[0] + w[0])} ${n1(p[1] + w[1])}" fill="none" stroke="${INK}" stroke-width="2"/>`
  })
  return s
}
const shapePic = (v: P[] | null, fill: string, o: { marks?: boolean; sides?: boolean; corners?: boolean; extra?: string; max?: number } = {}) => {
  if (!v) return svg(240, 190, `<circle cx="120" cy="95" r="74" fill="${fill}" stroke="${INK}" stroke-width="3"/>`, o.max || 250, 'a shape')
  const f = fit(v, 0, 0, 240, 190, 22)
  return svg(
    240,
    190,
    polyEl(f, fill) +
      (o.marks ? rightMarks(f) : '') +
      (o.sides ? edges(f).map(([a, b], i) => badge(mid(a, b), i + 1)).join('') : '') +
      (o.corners ? f.map((p, i) => badge(p, i + 1, BLUE)).join('') : '') +
      (o.extra || ''),
    o.max || 250,
    'a shape',
  )
}
const yn = (ans: boolean, rng: Rng) => choice(ans ? 'yes' : 'no', ['yes', 'no'], rng, true)
const yesNo = (b: boolean) => (b ? 'yes' : 'no')
const isNum = (it: Item) => it.input === 'number' && typeof it.answer === 'number'
const aOrAn = (w: string) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w

/* ---------- flat shapes ---------- */
const QUADS: Record<string, P[][]> = {
  square: [[[-1, -1], [1, -1], [1, 1], [-1, 1]]],
  rectangle: [
    [[-1.7, -1], [1.7, -1], [1.7, 1], [-1.7, 1]],
    [[-1, -1.6], [1, -1.6], [1, 1.6], [-1, 1.6]],
  ],
  rhombus: [
    [[0, -1.5], [1, 0], [0, 1.5], [-1, 0]],
    [[0, 0], [2, 0], [3, -Math.sqrt(3)], [1, -Math.sqrt(3)]],
  ],
  parallelogram: [
    [[0, 0], [3, 0], [4, -1.5], [1, -1.5]],
    [[1, 0], [4, 0], [3, -1.5], [0, -1.5]],
  ],
  trapezoid: [
    [[-1.8, 1], [1.8, 1], [0.9, -1], [-0.9, -1]],
    [[-1.5, 1], [1.5, 1], [0.5, -1], [-1.5, -1]],
  ],
  kite: [[[0, -1], [0.9, 0], [0, 2], [-0.9, 0]]],
}
const CONCAVE: Record<string, P[]> = {
  'L shape': [[0, 0], [1, 0], [1, 2], [2, 2], [2, 3], [0, 3]],
  arrow: [[0, 1], [2, 1], [2, 0], [3.5, 1.5], [2, 3], [2, 2], [0, 2]],
  'T shape': [[0, 0], [3, 0], [3, 1], [2, 1], [2, 3], [1, 3], [1, 1], [0, 1]],
  star: regular(10, 0, [1, 0.45, 1, 0.45, 1, 0.45, 1, 0.45, 1, 0.45]),
  'plus sign': [[1, 0], [2, 0], [2, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 2], [0, 2], [0, 1], [1, 1]],
}
/** Vertices for a named flat shape (null = circle). d makes it wobblier or turned. */
function make2d(kind: string, r: RR, d: number): P[] | null {
  if (kind === 'circle') return null
  if (QUADS[kind]) {
    const v = r.pick(QUADS[kind])
    return d === 3 && kind !== 'square' && kind !== 'rhombus' ? rotate(v, r.pick([0, 0, 14, -12])) : v
  }
  const n = { triangle: 3, pentagon: 5, hexagon: 6, octagon: 8 }[kind] || 3
  const radii = d === 1 ? undefined : Array.from({ length: n }, () => r.int(n >= 8 ? 88 : 78, 100) / 100)
  return regular(n, d === 1 ? r.pick([0, 180]) : r.int(0, 11) * 15, radii)
}
const LIKE: Record<string, string> = {
  circle: 'a coin or a pizza',
  triangle: 'a slice of pizza',
  square: 'a base on the ball field',
  rectangle: 'a door',
  pentagon: 'home plate',
  hexagon: 'a cell in a honeycomb',
  octagon: 'a stop sign',
  trapezoid: 'a bucket seen from the side',
  rhombus: 'a diamond on a playing card',
}
const CLUE: Record<number, [string, string]> = {
  3: ['triangle', '"Tri" means 3, like a tricycle with 3 wheels.'],
  5: ['pentagon', '"Penta" means 5. Home plate has 5 sides.'],
  6: ['hexagon', '"Hexa" means 6. A honeycomb cell has 6 sides.'],
  8: ['octagon', '"Octa" means 8, like an octopus with 8 arms.'],
}

/* ---------- solids ---------- */
const shade = (pts: P[], dark: boolean) => `<polygon points="${ptsStr(pts)}" fill="${dark ? '#000' : '#fff'}" opacity="${dark ? 0.14 : 0.4}"/>`
function boxPic(W: number, H: number, D: number, fill: string): string {
  const dx = D * 0.7,
    dy = D * 0.5,
    x = 24,
    y = 22 + dy
  const top: P[] = [[x, y], [x + dx, y - dy], [x + W + dx, y - dy], [x + W, y]]
  const side: P[] = [[x + W, y], [x + W + dx, y - dy], [x + W + dx, y + H - dy], [x + W, y + H]]
  const back: P = [x + dx, y + H - dy]
  return svg(
    W + dx + 48,
    H + dy + 44,
    `<rect x="${x}" y="${n1(y)}" width="${W}" height="${H}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      polyEl(top, fill) + shade(top, false) + polyEl(top, 'none') +
      polyEl(side, fill) + shade(side, true) + polyEl(side, 'none') +
      lineEl([x, y + H], back, INK, 2, '6 5') + lineEl(back, [x + dx, y - dy], INK, 2, '6 5') + lineEl(back, [x + W + dx, y + H - dy], INK, 2, '6 5'),
    250,
    'a solid shape',
  )
}
function solidPic(kind: string, fill: string): string {
  const st = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`
  if (kind === 'cube') return boxPic(100, 100, 56, fill)
  if (kind === 'rectangular prism') return boxPic(150, 70, 50, fill)
  if (kind === 'sphere')
    return svg(220, 180, `<circle cx="110" cy="90" r="72" fill="${fill}" ${st}/><ellipse cx="110" cy="90" rx="72" ry="20" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/><ellipse cx="84" cy="58" rx="20" ry="12" fill="#fff" opacity="0.55"/>`, 230, 'a solid shape')
  if (kind === 'cylinder')
    return svg(
      220,
      190,
      `<path d="M50 40 L50 150 A60 18 0 0 0 170 150 L170 40" fill="${fill}" ${st}/><path d="M50 150 A60 18 0 0 1 170 150" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/><ellipse cx="110" cy="40" rx="60" ry="18" fill="${fill}" ${st}/><ellipse cx="110" cy="40" rx="60" ry="18" fill="#fff" opacity="0.4"/>`,
      230,
      'a solid shape',
    )
  if (kind === 'cone')
    return svg(
      220,
      190,
      `<path d="M170 150 L110 18 L50 150 A60 18 0 0 0 170 150 Z" fill="${fill}" ${st}/><path d="M50 150 A60 18 0 0 1 170 150" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/>`,
      230,
      'a solid shape',
    )
  if (kind === 'pyramid') {
    const A: P = [34, 158], B: P = [150, 158], C: P = [196, 118], D: P = [80, 118], X: P = [115, 22]
    return svg(
      230,
      180,
      polyEl([A, B, X], fill) + polyEl([B, C, X], fill) + shade([B, C, X], true) + polyEl([B, C, X], 'none') + lineEl(C, D, INK, 2, '6 5') + lineEl(D, A, INK, 2, '6 5') + lineEl(D, X, INK, 2, '6 5'),
      240,
      'a solid shape',
    )
  }
  // triangular prism, lying like a tent
  const A: P = [30, 160], B: P = [120, 160], C: P = [75, 78]
  const o = (p: P): P => [p[0] + 96, p[1] - 44]
  return svg(
    250,
    180,
    polyEl([B, o(B), o(C), C], fill) + shade([B, o(B), o(C), C], true) + polyEl([B, o(B), o(C), C], 'none') + polyEl([A, B, C], fill) + lineEl(A, o(A), INK, 2, '6 5') + lineEl(o(A), o(B), INK, 2, '6 5') + lineEl(o(A), o(C), INK, 2, '6 5'),
    250,
    'a solid shape',
  )
}
/** base = number of sides of the flat end. Prisms have two ends, pyramids come to a point. */
const SOLIDS: Record<string, { type: 'prism' | 'pyramid' | 'round'; base: number; flat: number; rolls: boolean; like: string[] }> = {
  cube: { type: 'prism', base: 4, flat: 6, rolls: false, like: ['a number cube', 'an ice cube', 'a toy block'] },
  'rectangular prism': { type: 'prism', base: 4, flat: 6, rolls: false, like: ['a cereal box', 'a building brick', 'a shoe box'] },
  sphere: { type: 'round', base: 0, flat: 0, rolls: true, like: ['a baseball', 'a globe', 'an orange'] },
  cylinder: { type: 'round', base: 0, flat: 2, rolls: true, like: ['a soup can', 'a drum', 'a water bottle'] },
  cone: { type: 'round', base: 0, flat: 1, rolls: true, like: ['a party hat', 'an ice cream cone', 'a traffic cone'] },
  pyramid: { type: 'pyramid', base: 4, flat: 5, rolls: false, like: [] },
  'triangular prism': { type: 'prism', base: 3, flat: 5, rolls: false, like: [] },
}

/* ---------- angles ---------- */
/** Rays from one point. Angles in degrees, counted the math way (0 = right, turning up and left). */
function angleFig(rays: number[], o: { labels?: string[]; square?: boolean; box?: boolean; dashed?: number; outer?: string; arcs?: boolean; w?: number; h?: number; cx?: number; cy?: number; L?: number; max?: number } = {}): string {
  const w = o.w || 260,
    h = o.h || 230,
    cx = o.cx ?? w / 2,
    cy = o.cy ?? h / 2,
    L = o.L || 96
  const at = (a: number, k: number): P => [cx + k * Math.cos(rad(a)), cy - k * Math.sin(rad(a))]
  const arc = (a0: number, a1: number, k: number, col: string) => {
    const p = at(a0, k),
      q = at(a1, k)
    return `<path d="M${n1(p[0])} ${n1(p[1])} A${k} ${k} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${n1(q[0])} ${n1(q[1])}" fill="none" stroke="${col}" stroke-width="2.5"/>`
  }
  let s = ''
  if (o.dashed !== undefined) s += lineEl([cx, cy], at(o.dashed, L), '#78909c', 2.5, '7 6')
  for (let i = 0; i + 1 < rays.length; i++) {
    const a0 = rays[i],
      a1 = rays[i + 1],
      gap = a1 - a0
    if (o.square && gap === 90) {
      const p = at(a0, 18),
        q = at(a1, 18)
      s += `<path d="M${n1(p[0])} ${n1(p[1])} L${n1(p[0] + q[0] - cx)} ${n1(p[1] + q[1] - cy)} L${n1(q[0])} ${n1(q[1])}" fill="none" stroke="${INK}" stroke-width="2.5"/>`
    } else if (o.arcs !== false) s += arc(a0, a1, 26 + (i % 2) * 7, i % 2 ? BLUE : RED)
    if (o.labels && o.labels[i]) {
      const p = at((a0 + a1) / 2, gap < 30 ? 84 : gap < 50 ? 64 : 50)
      s += T(p[0], p[1] + 6, o.labels[i], { size: 16, fill: o.labels[i] === '?' ? RED : INK, halo: true })
    }
  }
  if (o.box) {
    const p = at(rays[0], 16),
      q = at(rays[rays.length - 1], 16)
    s += `<path d="M${n1(p[0])} ${n1(p[1])} L${n1(p[0] + q[0] - cx)} ${n1(p[1] + q[1] - cy)} L${n1(q[0])} ${n1(q[1])}" fill="none" stroke="${INK}" stroke-width="2.5"/>`
  }
  if (o.outer) {
    s += arc(rays[0], rays[rays.length - 1], 72, '#2e7d32')
    const p = at((rays[0] + rays[rays.length - 1]) / 2, 90)
    s += T(p[0], p[1] + 6, o.outer, { size: 18, fill: RED, halo: true })
  }
  rays.forEach((a) => {
    s += lineEl([cx, cy], at(a, L), INK, 4)
  })
  return svg(w, h, s + dot([cx, cy], 5), o.max || 260, 'an angle')
}
/** A half-circle protractor with rays at the given marks. */
function protractor(rays: number[]): string {
  const cx = 260,
    cy = 262,
    Rr = 226
  const at = (a: number, k: number): P => [cx + k * Math.cos(rad(a)), cy - k * Math.sin(rad(a))]
  let s = `<path d="M${cx - Rr} ${cy} A${Rr} ${Rr} 0 0 1 ${cx + Rr} ${cy} Z" fill="#e3f2fd" stroke="#546e7a" stroke-width="2.5"/>`
  for (let a = 0; a <= 180; a += 5) {
    const ten = a % 10 === 0
    s += lineEl(at(a, Rr), at(a, Rr - (ten ? 16 : 9)), '#37474f', ten ? 2 : 1.2)
  }
  rays.forEach((a, i) => {
    s += lineEl([cx, cy], at(a, Rr + 14), i ? RED : BLUE, 4)
  })
  // numbers go on top of the rays so they can always be read
  for (let a = 0; a <= 180; a += 10) {
    const p = at(a, Rr - 34)
    s += `<text x="${n1(p[0])}" y="${n1(p[1] + (a === 0 || a === 180 ? -8 : 5))}" text-anchor="middle" font-size="15" font-weight="700" fill="#263238" stroke="#e3f2fd" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${a}</text>`
  }
  return svg(520, 290, s + dot([cx, cy], 6), 520, 'an angle on a protractor')
}
function clockPic(h: number): string {
  const c = 100
  const at = (a: number, k: number): P => [c + k * Math.sin(rad(a)), c - k * Math.cos(rad(a))]
  let s = `<circle cx="${c}" cy="${c}" r="92" fill="#fff" stroke="${INK}" stroke-width="4"/>`
  for (let i = 1; i <= 12; i++) {
    const p = at(i * 30, 74)
    s += T(p[0], p[1] + 6, i, { size: 16 })
  }
  return svg(200, 200, s + lineEl([c, c], at(0, 62), BLUE, 4) + lineEl([c, c], at(h * 30, 42), RED, 6) + dot([c, c], 6), 210, 'a clock')
}
const angleKind = (deg: number) => (deg < 90 ? 'acute' : deg === 90 ? 'right' : 'obtuse')

/* ---------- triangles ---------- */
/** Corner points of a triangle with corner angles A (left), B (right), C (top), in a box. */
function triFromAngles(A: number, B: number, C: number, w = 280, h = 190, pad = 48): P[] {
  const b = Math.sin(rad(B)) / Math.sin(rad(C))
  return fit([[0, 0], [1, 0], [b * Math.cos(rad(A)), -b * Math.sin(rad(A))]], 0, 0, w, h, pad)
}
function triFromSides(a: number, b: number, c: number, w = 280, h = 190, pad = 38): P[] {
  // bottom = c, left = b, right = a
  const cosA = (b * b + c * c - a * a) / (2 * b * c)
  return fit([[0, 0], [c, 0], [b * cosA, -b * Math.sqrt(1 - cosA * cosA)]], 0, 0, w, h, pad)
}
function triPic(v: P[], o: { angles?: string[]; sides?: string[]; fill?: string; marks?: boolean } = {}): string {
  const g = centroid(v)
  let s = polyEl(v, o.fill || FILLS[1]) + (o.marks ? rightMarks(v, 14) : '')
  if (o.angles)
    v.forEach((p, i) => {
      if (!o.angles![i]) return
      // written just outside the corner so it never sits on a side
      const d = sub(p, g),
        k = 22 / len(d)
      s += T(p[0] + d[0] * k, p[1] + d[1] * k + 6, o.angles![i], { size: 15, fill: o.angles![i] === '?' ? RED : INK })
    })
  if (o.sides)
    // side i runs from corner i to corner i+1
    edges(v).forEach(([a, b], i) => {
      if (!o.sides![i]) return
      const m = mid(a, b),
        d = sub(m, g),
        k = 19 / len(d)
      s += T(m[0] + d[0] * k, m[1] + d[1] * k + 6, o.sides![i], { size: 16, fill: o.sides![i] === '?' ? RED : INK })
    })
  return svg(280, 190, s, 290, 'a triangle')
}
const sideKind = (s: number[]) => {
  const pairs = (s[0] === s[1] ? 1 : 0) + (s[1] === s[2] ? 1 : 0) + (s[0] === s[2] ? 1 : 0)
  return pairs === 3 ? 'equilateral' : pairs === 1 ? 'isosceles' : 'scalene'
}
const SIDE_KINDS = ['equilateral', 'isosceles', 'scalene']
const ANGLE_KINDS = ['acute', 'right', 'obtuse']

/* ---------- symmetry ---------- */
const reflect = (p: P, c: P, deg: number): P => {
  const u: P = [Math.cos(rad(deg)), -Math.sin(rad(deg))],
    d = sub(p, c),
    t = d[0] * u[0] + d[1] * u[1]
  return [c[0] + 2 * t * u[0] - d[0], c[1] + 2 * t * u[1] - d[1]]
}
/** Fold test: does every corner land on a corner? Line goes through the middle at this slant (0 = flat, 90 = up and down). */
const isMirror = (v: P[], deg: number) => {
  const c = centroid(v)
  return v.every((p) => {
    const q = reflect(p, c, deg)
    return v.some((z) => len(sub(z, q)) < 0.02)
  })
}
function mirrorDegs(v: P[]): number[] {
  const c = centroid(v)
  const cands = [...v, ...edges(v).map(([a, b]) => mid(a, b))].filter((p) => len(sub(p, c)) > 0.01).map((p) => Math.atan2(-(p[1] - c[1]), p[0] - c[0]) * (180 / Math.PI))
  const seen = new Set<number>()
  for (const a of [...cands, 0, 45, 90, 135]) {
    const k = ((Math.round(a * 10) % 1800) + 1800) % 1800
    if (isMirror(v, k / 10)) seen.add(k)
  }
  return [...seen].map((k) => k / 10)
}
const countMirrors = (v: P[]) => mirrorDegs(v).length
/** name, corners, how many fold lines it is known to have, which of the tested lines work (V up-down, H flat, D corner to corner). */
const SYM: { name: string; v: P[]; n: number; ok: string }[] = [
  { name: 'square', v: QUADS.square[0], n: 4, ok: 'VHD' },
  { name: 'rectangle', v: QUADS.rectangle[0], n: 2, ok: 'VH' },
  { name: 'triangle', v: regular(3), n: 3, ok: 'V' },
  { name: 'triangle', v: [[0, -1.4], [0.8, 1], [-0.8, 1]], n: 1, ok: 'V' },
  { name: 'triangle', v: [[-1, 1], [1.2, 1], [-1, -0.8]], n: 0, ok: '' },
  { name: 'pentagon', v: regular(5), n: 5, ok: 'V' },
  { name: 'hexagon', v: regular(6), n: 6, ok: 'VH' },
  { name: 'rhombus', v: QUADS.rhombus[0], n: 2, ok: 'VH' },
  { name: 'parallelogram', v: [[-1.5, 1], [0.9, 1], [1.5, -1], [-0.9, -1]], n: 0, ok: '' },
  { name: 'trapezoid', v: QUADS.trapezoid[0], n: 1, ok: 'V' },
  { name: 'kite', v: QUADS.kite[0], n: 1, ok: 'V' },
  { name: 'arrow', v: CONCAVE.arrow, n: 1, ok: 'H' },
  { name: 'plus sign', v: CONCAVE['plus sign'], n: 4, ok: 'VHD' },
  { name: 'L shape', v: CONCAVE['L shape'], n: 0, ok: '' },
  { name: 'house shape', v: [[0, -1.6], [1, -0.6], [1, 1], [-1, 1], [-1, -0.6]], n: 1, ok: 'V' },
  { name: 'star', v: CONCAVE.star, n: 5, ok: 'V' },
]
const LETTERS: Record<string, string> = { A: 'V', C: 'H', D: 'H', E: 'H', H: 'VH', I: 'VH', M: 'V', T: 'V', U: 'V', V: 'V', W: 'V', Y: 'V', F: '', G: '', J: '', L: '', N: '', P: '', R: '', S: '', Z: '' }
const lineDeg = (v: P[], code: string) => {
  if (code === 'V') return 90
  if (code === 'H') return 0
  const xs = v.map((p) => p[0]),
    ys = v.map((p) => p[1])
  return (Math.atan2(Math.max(...ys) - Math.min(...ys), Math.max(...xs) - Math.min(...xs)) * 180) / Math.PI
}
function symPic(v: P[], fill: string, degs: number[]): string {
  const m = fitter(v, 0, 0, 260, 210, 34)
  const c = centroid(v)
  let s = polyEl(v.map(m), fill)
  for (const deg of degs) {
    const u: P = [Math.cos(rad(deg)), -Math.sin(rad(deg))]
    // long enough to cross the whole shape, then moved with the shape
    const far = Math.max(...v.map((p) => len(sub(p, c)))) * 1.25
    s += lineEl(m([c[0] - u[0] * far, c[1] - u[1] * far]), m([c[0] + u[0] * far, c[1] + u[1] * far]), RED, 3.5, '9 7')
  }
  return svg(260, 210, s, 270, 'a shape with a dashed fold line')
}
function letterPic(ch: string, code: string): string {
  const cap = 108
  let s = `<text x="110" y="${50 + cap}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" fill="${BLUE}">${ch}</text>`
  if (code === 'V') s += lineEl([110, 24], [110, 184], RED, 3.5, '9 7')
  if (code === 'H') s += lineEl([24, 50 + cap / 2], [196, 50 + cap / 2], RED, 3.5, '9 7')
  return svg(220, 200, s, 220, 'a letter')
}

/* ---------- the field grid ---------- */
interface Thing { name: string; x: number; y: number }
const THINGS = ['ball', 'bat', 'cap', 'glove', 'coach', 'cone', 'bag', 'flag', 'cart', 'net', 'dog', 'fan']
const DOTS = ['#d84315', '#1565c0', '#6a1b9a', '#ad1457', '#4e342e', '#00695c']
function fieldMap(G: number, things: Thing[], o: { path?: P[]; names?: boolean } = {}): string {
  const c = Math.floor(340 / G),
    L = 50,
    top = 34,
    W = L + G * c + 26,
    H = top + G * c + 58
  const X = (x: number) => L + x * c,
    Y = (y: number) => top + (G - y) * c
  let s = `<rect x="${L}" y="${top}" width="${G * c}" height="${G * c}" fill="#dcedc8"/>`
  // infield dirt in the corner by home plate
  s += `<path d="M${L} ${Y(0)} L${X(Math.min(3, G))} ${Y(0)} A${Math.min(3, G) * c} ${Math.min(3, G) * c} 0 0 0 ${L} ${Y(Math.min(3, G))} Z" fill="#ffe0b2"/>`
  for (let i = 0; i <= G; i++) {
    s += lineEl([X(i), Y(0)], [X(i), Y(G)], '#7cb342', 1.5) + lineEl([X(0), Y(i)], [X(G), Y(i)], '#7cb342', 1.5)
    s += T(X(i), Y(0) + 20, i, { size: 14 }) + T(L - 12, Y(i) + 5, i, { size: 14, anchor: 'end' })
  }
  s += lineEl([X(0), Y(0)], [X(G), Y(0)], INK, 3) + lineEl([X(0), Y(0)], [X(0), Y(G)], INK, 3)
  s += T(X(G / 2), Y(0) + 44, 'x: go across →', { size: 14, fill: '#33691e' })
  s += `<text x="16" y="${Y(G / 2)}" text-anchor="middle" font-size="14" font-weight="700" fill="#33691e" transform="rotate(-90 16 ${Y(G / 2)})">y: go up →</text>`
  s += `<polygon points="${X(0) - 7},${Y(0) - 7} ${X(0) + 7},${Y(0) - 7} ${X(0) + 7},${Y(0) + 1} ${X(0)},${Y(0) + 8} ${X(0) - 7},${Y(0) + 1}" fill="#fff" stroke="${INK}" stroke-width="2"/>`
  if (o.path) for (let i = 0; i + 1 < o.path.length; i++) s += lineEl([X(o.path[i][0]), Y(o.path[i][1])], [X(o.path[i + 1][0]), Y(o.path[i + 1][1])], RED, 5, '2 9')
  things.forEach((t, i) => {
    s += `<circle cx="${X(t.x)}" cy="${Y(t.y)}" r="7.5" fill="${DOTS[i % DOTS.length]}" stroke="#fff" stroke-width="2"/>`
    if (o.names !== false && t.name) s += T(X(t.x), Y(t.y) - 13, t.name, { size: 15, halo: true })
  })
  return svg(W, H, s, 440, 'a map of the ball field on a grid')
}
/** Things on the grid with no two in the same row or column, away from the edges. */
function placeThings(r: RR, G: number, k: number): Thing[] {
  const xs = r.shuffle(Array.from({ length: G - 1 }, (_, i) => i + 1)).slice(0, k)
  const ys = r.shuffle(Array.from({ length: G - 1 }, (_, i) => i + 1)).slice(0, k)
  const names = r.shuffle(THINGS).slice(0, k)
  const out = names.map((name, i) => ({ name, x: xs[i], y: ys[i] }))
  // the first thing is the one we ask about: make sure across and up are different numbers
  if (out[0].x === out[0].y) {
    const j = out.findIndex((t, i) => i > 0 && t.y !== out[0].x)
    const tmp = out[0].y
    out[0].y = out[j].y
    out[j].y = tmp
  }
  return out
}
const pair = (x: number, y: number) => `(${x}, ${y})`

/* ---------- shape families ---------- */
type Props = Record<string, string | number | boolean>
const QUAD_CASES: Props[] = [
  { par: 2, eq: true, right: true }, // square
  { par: 2, eq: false, right: true }, // long rectangle
  { par: 2, eq: true, right: false }, // leaning rhombus
  { par: 2, eq: false, right: false }, // plain parallelogram
  { par: 1, eq: false, right: false }, // trapezoid
  { par: 0, eq: false, right: false }, // kite or odd four-sided shape
]
const TRI_CASES: Props[] = [
  { side: 'equilateral', angle: 'acute' },
  ...['acute', 'right', 'obtuse'].flatMap((angle) => [
    { side: 'isosceles', angle },
    { side: 'scalene', angle },
  ]),
]
/** What each family promises. */
const FAMILY: Record<string, { tri: boolean; needs: Props; say: string }> = {
  quadrilateral: { tri: false, needs: {}, say: '4 sides' },
  parallelogram: { tri: false, needs: { par: 2 }, say: '2 pairs of parallel sides' },
  rectangle: { tri: false, needs: { par: 2, right: true }, say: '4 square corners' },
  rhombus: { tri: false, needs: { par: 2, eq: true }, say: '4 equal sides' },
  square: { tri: false, needs: { par: 2, right: true, eq: true }, say: '4 equal sides and 4 square corners' },
  trapezoid: { tri: false, needs: { par: 1 }, say: 'just 1 pair of parallel sides' },
  'right triangle': { tri: true, needs: { angle: 'right' }, say: '1 square corner' },
  'acute triangle': { tri: true, needs: { angle: 'acute' }, say: '3 small (acute) angles' },
  'obtuse triangle': { tri: true, needs: { angle: 'obtuse' }, say: '1 wide (obtuse) angle' },
  'equilateral triangle': { tri: true, needs: { side: 'equilateral', angle: 'acute' }, say: '3 equal sides and three 60° angles' },
  'scalene triangle': { tri: true, needs: { side: 'scalene' }, say: 'no equal sides' },
  'isosceles triangle': { tri: true, needs: { side: 'isosceles' }, say: 'exactly 2 equal sides' },
}
const fits = (c: Props, fam: string) => Object.entries(FAMILY[fam].needs).every(([k, v]) => c[k] === v)
/** Try every kind of shape in family X: how many of them are also in family Y? */
function relateByCases(x: string, y: string): string {
  const cases = (FAMILY[x].tri ? TRI_CASES : QUAD_CASES).filter((c) => fits(c, x))
  const hit = cases.filter((c) => fits(c, y)).length
  return hit === cases.length ? 'always' : hit === 0 ? 'never' : 'sometimes'
}
/** Compare the two rule lists directly. */
function relateByRules(x: string, y: string): string {
  const a = FAMILY[x].needs,
    b = FAMILY[y].needs
  if (Object.keys(b).some((k) => k in a && a[k] !== b[k])) return 'never'
  return Object.keys(b).every((k) => a[k] === b[k]) ? 'always' : 'sometimes'
}
const PAIRS: [string, string][] = [
  ...['quadrilateral', 'parallelogram', 'rectangle', 'rhombus', 'square'].flatMap((x) => ['quadrilateral', 'parallelogram', 'rectangle', 'rhombus', 'square'].filter((y) => y !== x).map((y): [string, string] => [x, y])),
  ['trapezoid', 'quadrilateral'],
  ['quadrilateral', 'trapezoid'],
  ['equilateral triangle', 'acute triangle'],
  ['right triangle', 'equilateral triangle'],
  ['right triangle', 'isosceles triangle'],
  ['obtuse triangle', 'scalene triangle'],
  ['acute triangle', 'right triangle'],
  ['scalene triangle', 'right triangle'],
  ['equilateral triangle', 'obtuse triangle'],
  ['isosceles triangle', 'acute triangle'],
  ['right triangle', 'obtuse triangle'],
  ['equilateral triangle', 'scalene triangle'],
]
const QUAD_FAMS = ['quadrilateral', 'parallelogram', 'rectangle', 'rhombus', 'square']
const propsOf = (v: P[]): Props => ({ par: parallelPairs(v), eq: allEqual(sideLens(v)), right: squareCorners(v) === 4 })

/* ================================================================== */
export const gens: Record<string, Gen> = {
  'ge.shapes-2d': (rng, d) => {
    const r = R(rng)
    const pool = d === 1 ? ['circle', 'triangle', 'square', 'rectangle'] : d === 2 ? ['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon'] : ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'octagon', 'trapezoid', 'rhombus']
    const t = r.pick(d === 1 ? [0, 0, 2] : [0, 0, 1, 2])
    const fill = r.pick(FILLS)
    if (t === 1) {
      // which shape has n sides?
      const n = r.pick(d === 2 ? [3, 5, 6] : [3, 5, 6, 8])
      const ans = nameFromVerts(regular(n))
      return {
        prompt: r.pick([`Which shape has ${n} sides?`, `A shape has ${n} straight sides. What is it called?`, `{n} draws a shape with ${n} corners. What shape is it?`]),
        ...choice(ans, r.shuffle(['triangle', 'pentagon', 'hexagon', 'octagon', 'square'].filter((x) => x !== ans)).slice(0, 3), rng),
        strategies: [
          strat('Draw It and Count', [`Draw ${n} straight sides that close up.`, `Count them: ${n} sides and ${n} corners.`, `A shape with ${n} sides is ${aOrAn(ans)}.`], ans, { html: shapePic(regular(n), fill, { sides: true }) }),
          strat('Word Clue', [CLUE[n][1], `So the shape with ${n} sides is the ${CLUE[n][0]}.`], CLUE[n][0]),
        ],
        operands: [n],
        difficulty: d,
      }
    }
    if (t === 2) {
      // three pictures, pick the named one
      const kinds = r.shuffle(pool).slice(0, 3)
      const vs = kinds.map((k) => make2d(k, r, d))
      const want = r.int(0, 2)
      const AB = ['A', 'B', 'C']
      const cols = r.shuffle(FILLS)
      let body = ''
      vs.forEach((v, i) => {
        body += v ? polyEl(fit(v, i * 120, 0, 120, 112, 14), cols[i]) : `<circle cx="${i * 120 + 60}" cy="56" r="42" fill="${cols[i]}" stroke="${INK}" stroke-width="3"/>`
        body += T(i * 120 + 60, 136, AB[i], { size: 20 })
      })
      const found = AB[vs.findIndex((v) => nameFromVerts(v) === kinds[want])]
      const left = AB.filter((_, i) => kinds[i] !== kinds[want])
      const sidesOf = (v: P[] | null) => (v ? v.length : 0)
      const say = (v: P[] | null) => (v ? `${v.length} sides` : 'no straight sides')
      return {
        prompt: r.pick([`Which shape is the ${kinds[want]}?`, `Find the ${kinds[want]}. Which letter is it?`, `{n} wants the ${kinds[want]}. Which one should he pick?`]),
        visual: svg(360, 146, body, 400, 'three shapes named A, B and C'),
        ...choice(AB[want], AB, rng, true),
        strategies: [
          strat('Count the Sides', [`A has ${say(vs[0])}. B has ${say(vs[1])}. C has ${say(vs[2])}.`, kinds[want] === 'circle' ? `A circle is round with no straight sides.` : `Look for the shape that fits the name ${kinds[want]}.`, `That is shape ${found}.`], found),
          strat('Cross Out', [`Shape ${left[0]} is ${aOrAn(kinds[AB.indexOf(left[0])])}. Cross it out.`, `Shape ${left[1]} is ${aOrAn(kinds[AB.indexOf(left[1])])}. Cross it out.`, `The one left is the ${kinds[want]}.`], AB.filter((x) => !left.includes(x))[0]),
        ],
        operands: [want, ...vs.map(sidesOf)],
        difficulty: d,
      }
    }
    const kind = r.pick(pool)
    const v = make2d(kind, r, d)
    const ans = nameFromVerts(v)
    const n = v ? v.length : 0
    const others = r.shuffle(pool.filter((x) => x !== ans))
    // the classic mix-ups first
    const mix: Record<string, string> = { square: 'rectangle', rectangle: 'square', pentagon: 'hexagon', hexagon: 'pentagon', rhombus: 'square', trapezoid: 'rectangle', octagon: 'hexagon', circle: 'square', triangle: 'pentagon' }
    const wrong = [...new Set([mix[ans], ...others].filter((x) => x && x !== ans && (pool.includes(x) || d === 3)))].slice(0, 3)
    return {
      prompt: r.pick([`What shape is this?`, `What is the name of this shape?`, `{n} drew this shape. What is it called?`, `Look at the shape. Pick its name.`]),
      visual: shapePic(v, fill, { marks: d === 3 && n === 4 }),
      ...choice(ans, wrong, rng),
      strategies: [
        strat(
          'Count the Sides',
          !v
            ? [`This shape is round. It has no straight sides and no corners.`, `A round shape like this is a circle.`]
            : n === 4
              ? [`Count the sides: 4.`, allEqual(sideLens(v)) ? `All 4 sides are the same length.` : `The sides are not all the same length.`, squareCorners(v) === 4 ? `It has 4 square corners.` : `It does not have 4 square corners.`, `So it is ${aOrAn(ans)}.`]
              : [`Count the straight sides. There are ${n}.`, `A shape with ${n} sides is ${aOrAn(ans)}.`],
          ans,
          v ? { html: shapePic(v, fill, { sides: true }) } : {},
        ),
        strat('Think of Something You Know', [`This shape looks like ${LIKE[kind]}.`, `That shape is called ${aOrAn(kind)}.`], kind),
      ],
      operands: [n],
      difficulty: d,
    }
  },

  'ge.sides-corners': (rng, d) => {
    const r = R(rng)
    const t = r.pick(d === 1 ? [0, 0, 1] : d === 2 ? [0, 0, 1, 2] : [0, 0, 2, 3])
    const fill = r.pick(FILLS)
    const what = r.pick(['sides', 'corners'])
    const NAMED: [string, number][] = [['triangle', 3], ['square', 4], ['rectangle', 4], ['pentagon', 5], ['hexagon', 6], ['octagon', 8]]
    if (t === 1) {
      const [name, n] = r.pick(d === 1 ? NAMED.slice(0, 5) : NAMED)
      const v = name === 'rectangle' ? QUADS.rectangle[0] : name === 'square' ? QUADS.square[0] : regular(n)
      return {
        prompt: `How many ${what} does ${aOrAn(name)} have?`,
        input: 'number',
        answer: n,
        strategies: [
          strat('Draw It and Count', [`Draw ${aOrAn(name)}.`, `Put a number on each ${what === 'sides' ? 'side' : 'corner'} as you count.`, `The last number is ${v.length}.`], v.length, { html: shapePic(v, fill, what === 'sides' ? { sides: true } : { corners: true }) }),
          strat('Sides and Corners Match', [`Every corner is where 2 sides meet.`, `So ${aOrAn(name)} has the same number of sides and corners.`, `It has ${edges(v).length} of each.`], edges(v).length),
        ],
        distractors: wrongs(n, [n + 1, n - 1, n === 4 ? 2 : n + 2]),
        operands: [n],
        difficulty: d,
      }
    }
    if (t === 2) {
      const n = r.int(3, d === 2 ? 9 : 12)
      const other = what === 'sides' ? 'corners' : 'sides'
      const v = regular(n)
      return {
        prompt: r.pick([`A closed shape has ${n} straight ${other}. How many ${what} does it have?`, `{n} builds a brick shape with ${n} ${other}. How many ${what} does it have?`]),
        input: 'number',
        answer: n,
        strategies: [
          strat('Sides and Corners Match', [`Each corner joins 2 sides. Each side joins 2 corners.`, `So a closed shape has the same number of sides and corners.`, `${n} ${other} means ${n} ${what}.`], n),
          strat('Draw It and Count', [`Draw a shape with ${n} ${other}.`, `Count the ${what} one by one.`, `You count ${v.length}.`], v.length, { html: shapePic(v, fill, what === 'sides' ? { sides: true } : { corners: true }) }),
        ],
        distractors: wrongs(n, [n + 1, n - 1, n * 2]),
        operands: [n],
        difficulty: d,
      }
    }
    if (t === 3) {
      const [name, n] = r.pick(NAMED.filter((x) => x[0] !== 'rectangle'))
      const k = r.int(2, 4)
      const v = name === 'square' ? QUADS.square[0] : regular(n)
      let body = ''
      for (let i = 0; i < k; i++) body += polyEl(fit(v, i * 100, 0, 100, 100, 12), FILLS[(i + 2) % FILLS.length])
      const tot = k * n
      let run = 0
      const counts = Array.from({ length: k }, () => (run += v.length))
      return {
        prompt: `{n} draws ${k} ${name}s. How many ${what} are there in all?`,
        visual: svg(k * 100, 100, body, k * 110, `${k} ${name}s`),
        input: 'number',
        answer: tot,
        strategies: [
          strat('Count by Shape', [`One ${name} has ${n} ${what}.`, `Count on for each shape: ${counts.join(', ')}.`, `There are ${run} ${what} in all.`], run),
          strat('Multiply', [`There are ${k} shapes with ${n} ${what} each.`, `${k} × ${n} = ${tot}`], k * n),
        ],
        distractors: wrongs(tot, [k + n, n, tot + n, tot - n]),
        operands: [k, n],
        difficulty: d,
      }
    }
    // count on a picture
    let v: P[]
    if (d === 3 && r.chance(0.6)) v = CONCAVE[r.pick(Object.keys(CONCAVE))]
    else {
      const n = r.int(3, d === 1 ? 6 : 8)
      v = n === 4 ? r.pick([...QUADS.trapezoid, ...QUADS.parallelogram, ...QUADS.kite, ...QUADS.rectangle]) : regular(n, r.int(0, 11) * 15, Array.from({ length: n }, () => r.int(n >= 7 ? 88 : 78, 100) / 100))
    }
    const n = v.length
    const one = what === 'sides' ? 'side' : 'corner'
    return {
      prompt: r.pick([`How many ${what} does this shape have?`, `Count the ${what} of this shape.`, `{n} drew this shape. How many ${what} does it have?`]),
      visual: shapePic(v, fill),
      input: 'number',
      answer: n,
      strategies: [
        strat('Count Around', [`Pick a ${one} to start. Go around the shape.`, `Put a number on each ${one} so you do not count one twice.`, `The last number is ${what === 'sides' ? edges(v).length : v.length}.`], what === 'sides' ? edges(v).length : v.length, { html: shapePic(v, fill, what === 'sides' ? { sides: true } : { corners: true }) }),
        strat('Count the Other One', [`Sides and corners always match on a closed shape.`, `Count the ${what === 'sides' ? 'corners' : 'sides'} to check.`, `There are ${what === 'sides' ? v.length : edges(v).length}, so there are ${n} ${what} too.`], what === 'sides' ? v.length : edges(v).length, { html: shapePic(v, fill, what === 'sides' ? { corners: true } : { sides: true }) }),
      ],
      distractors: wrongs(n, [n - 1, n + 1, n - 2]),
      operands: [n],
      difficulty: d,
    }
  },

  'ge.shapes-3d': (rng, d) => {
    const r = R(rng)
    const pool = d === 1 ? ['cube', 'sphere', 'cylinder', 'cone'] : d === 2 ? ['cube', 'sphere', 'cylinder', 'cone', 'rectangular prism', 'pyramid'] : Object.keys(SOLIDS)
    const fill = r.pick(FILLS)
    const t = r.pick(d === 1 ? [0, 0, 1, 2] : [0, 1, 2, 2, 3])
    const kind = r.pick(pool)
    const S = SOLIDS[kind]
    if (t === 1) {
      // real things
      const k2 = r.pick(pool.filter((k) => SOLIDS[k].like.length))
      const thing = r.pick(SOLIDS[k2].like)
      const s2 = SOLIDS[k2]
      const describe = s2.type === 'round' ? (s2.flat === 0 ? 'round all over, with no flat faces' : s2.flat === 2 ? 'round on the side, with 2 flat circles' : 'round with 1 flat circle and a point') : k2 === 'cube' ? 'made of 6 square faces, all the same' : 'made of 6 rectangle faces'
      const byFlat = Object.keys(SOLIDS).find((k) => SOLIDS[k].like.length && SOLIDS[k].flat === s2.flat && SOLIDS[k].type === s2.type && (k === 'cube') === thing.includes('cube'))
      return {
        prompt: `Think of ${thing}. What solid shape is it like?`,
        ...choice(k2, r.shuffle(pool.filter((k) => k !== k2 && SOLIDS[k].like.length)).slice(0, 3), rng),
        strategies: [
          strat('Picture It', [`Picture ${thing} in your hand.`, `It is ${describe}.`, `That is a ${k2}.`], k2, { html: solidPic(k2, fill) }),
          strat('Count the Flat Faces', [`How many flat faces does ${thing} have? ${s2.flat}.`, s2.rolls ? `It can roll.` : `It cannot roll. It can only slide.`, `So it is a ${byFlat || k2}.`], byFlat === 'cube' || byFlat === 'rectangular prism' ? k2 : byFlat || k2),
        ],
        operands: [s2.flat],
        difficulty: d,
      }
    }
    if (t === 2) {
      // count faces, corners or edges
      const flatOnly = S.type === 'round' || d === 1
      const ask = flatOnly ? 'faces' : r.pick(d === 2 ? ['faces', 'corners'] : ['faces', 'corners', 'edges'])
      const b = S.base
      const isPrism = S.type === 'prism'
      const ans = S.type === 'round' ? S.flat : ask === 'faces' ? (isPrism ? b + 2 : b + 1) : ask === 'corners' ? (isPrism ? 2 * b : b + 1) : isPrism ? 3 * b : 2 * b
      const parts =
        S.type === 'round'
          ? kind === 'cylinder' ? [1, 1] : kind === 'cone' ? [1] : []
          : ask === 'faces' ? (isPrism ? [1, 1, b] : [1, b]) : ask === 'corners' ? (isPrism ? [b, b] : [b, 1]) : isPrism ? [b, b, b] : [b, b]
      const sum = parts.reduce((a, x) => a + x, 0)
      const words =
        S.type === 'round'
          ? kind === 'cylinder' ? `1 flat circle on top and 1 on the bottom` : kind === 'cone' ? `1 flat circle on the bottom. The rest is curved` : `no flat part at all. It is curved all over`
          : ask === 'faces' ? (isPrism ? `1 on each end and ${b} around the middle` : `1 on the bottom and ${b} triangles going up`) : ask === 'corners' ? (isPrism ? `${b} on one end and ${b} on the other end` : `${b} on the bottom and 1 at the top`) : isPrism ? `${b} on one end, ${b} on the other end, and ${b} joining them` : `${b} on the bottom and ${b} going up to the point`
      const label = ask === 'faces' ? 'flat faces' : ask
      return {
        prompt: r.pick([`How many ${label} does this ${kind} have?`, `Look at the ${kind}. Count its ${label}.`]) + (ask !== 'faces' || S.type !== 'round' ? ' Count the hidden ones too.' : ''),
        visual: solidPic(kind, fill),
        input: 'number',
        answer: ans,
        strategies: [
          strat('Count in Groups', [`Count the ${label} a group at a time.`, `There ${sum === 1 ? 'is' : 'are'} ${words}.`, parts.length > 1 ? `${parts.join(' + ')} = ${sum}` : `That makes ${sum}.`], sum),
          strat('Hold One in Your Mind', [`Think of ${S.like[0] || (kind === 'pyramid' ? 'a pyramid made of blocks' : 'a tent')}. Turn it around in your mind.`, `Touch each ${ask === 'faces' ? 'flat face' : ask === 'corners' ? 'corner' : 'edge'} one time as you count.`, `You count ${ans}.`], ans),
        ],
        distractors: wrongs(ans, ask === 'faces' ? [S.type === 'round' ? ans + 1 : 4, ans - 1, ans + 2, kind === 'cylinder' ? 3 : ans + 1] : ask === 'corners' ? [ans - 4, b, isPrism ? b + 2 : 2 * b, ans + 2] : [isPrism ? 2 * b : b, ans - 4, isPrism ? b + 2 : b + 1, ans + 2]),
        operands: [b, S.flat],
        difficulty: d,
      }
    }
    if (t === 3) {
      // roll or stack
      const roll = r.chance()
      const ans = r.pick(pool.filter((k) => SOLIDS[k].rolls === roll))
      const others = r.shuffle(pool.filter((k) => SOLIDS[k].rolls !== roll)).slice(0, 2)
      const curved = (k: string) => SOLIDS[k].type === 'round'
      const all = [ans, ...others]
      return {
        prompt: roll ? r.pick([`Which solid can roll?`, `{n} wants a shape that can roll down a ramp. Which one?`]) : r.pick([`Which solid can NOT roll?`, `Which solid has only flat faces?`]),
        ...choice(ans, others, rng),
        strategies: [
          strat('Look for a Curve', [`A solid rolls when it has a curved side.`, ...all.map((k) => `A ${k} ${curved(k) ? 'has a curved side' : 'has only flat faces'}.`)], all.filter((k) => curved(k) === roll)[0], { html: solidPic(ans, fill) }),
          strat('Try It in Your Mind', [`Push each shape across the floor.`, roll ? `Only the ${ans} rolls away. The others just slide.` : `Only the ${ans} just slides. The others roll away.`], ans),
        ],
        operands: [roll ? 1 : 0, SOLIDS[ans].flat],
        difficulty: d,
      }
    }
    const mix: Record<string, string> = { cube: 'rectangular prism', 'rectangular prism': 'cube', sphere: 'cylinder', cylinder: 'cone', cone: 'pyramid', pyramid: 'cone', 'triangular prism': 'pyramid' }
    const wrong = [...new Set([mix[kind], ...r.shuffle(pool)].filter((k) => k !== kind && pool.includes(k)))].slice(0, 3)
    const byParts = Object.keys(SOLIDS).find((k) => SOLIDS[k].type === S.type && SOLIDS[k].flat === S.flat && SOLIDS[k].base === S.base && (k !== 'cube' || kind === 'cube') && (k !== 'rectangular prism' || kind !== 'cube'))!
    return {
      prompt: r.pick([`What solid shape is this?`, `What is the name of this solid?`, `{n} found this block. What shape is it?`]),
      visual: solidPic(kind, fill),
      ...choice(kind, wrong, rng),
      strategies: [
        strat(
          'Look at the Faces',
          S.type === 'round'
            ? [`This solid has a curved part.`, S.flat === 0 ? `It has no flat faces. It is round like a ball.` : S.flat === 2 ? `It has 2 flat circles, one on each end.` : `It has 1 flat circle and a point on top.`, `That is a ${byParts}.`]
            : [S.type === 'pyramid' ? `The sides are triangles that meet at a point on top.` : kind === 'triangular prism' ? `The two ends are triangles. The sides are rectangles.` : kind === 'cube' ? `All 6 faces are squares of the same size.` : `All 6 faces are rectangles. Some are long.`, `That is a ${byParts}.`],
          byParts,
        ),
        strat('Think of Something You Know', [`It looks like ${S.like[0] || (kind === 'pyramid' ? 'the big stone pyramids in Egypt' : 'a camping tent')}.`, `That shape is called a ${kind}.`], kind),
      ],
      operands: [S.flat, S.base],
      difficulty: d,
    }
  },

  'ge.partition': (rng, d) => {
    const r = R(rng)
    const rows = d === 1 ? r.int(2, 3) : d === 2 ? r.int(2, 5) : r.int(3, 6)
    const cols = d === 1 ? r.int(2, 5) : d === 2 ? r.int(3, 6) : r.int(4, 8)
    const tot = rows * cols
    const t = d === 1 ? r.pick([0, 1]) : d === 2 ? r.pick([0, 1, 1, 2]) : r.pick([0, 1, 2, 2])
    const fill = r.pick(FILLS)
    const c = Math.min(44, Math.floor(320 / cols))
    const grid = (showCols: boolean, numbers = false) => {
      let s = `<rect x="4" y="4" width="${cols * c}" height="${rows * c}" fill="${fill}" stroke="${INK}" stroke-width="3"/>`
      for (let i = 1; i < rows; i++) s += lineEl([4, 4 + i * c], [4 + cols * c, 4 + i * c], INK, 2)
      if (showCols) for (let j = 1; j < cols; j++) s += lineEl([4 + j * c, 4], [4 + j * c, 4 + rows * c], INK, 2)
      if (numbers) for (let i = 0; i < rows; i++) s += T(4 + cols * c + 22, 4 + i * c + c / 2 + 6, (i + 1) * cols, { size: 16, fill: RED })
      return svg(cols * c + (numbers ? 48 : 8), rows * c + 8, s, cols * c + (numbers ? 48 : 8), 'a rectangle split into squares')
    }
    const thing = r.pick(['rectangle', 'pan of brownies', 'brick wall', 'window', 'quilt', 'sheet of stickers'])
    const part = { rectangle: 'squares', 'pan of brownies': 'square pieces', 'brick wall': 'square bricks', window: 'square panes', quilt: 'squares', 'sheet of stickers': 'square stickers' }[thing]!
    const rowSum = Array(rows).fill(cols).join(' + ')
    const colSum = Array(cols).fill(rows).join(' + ')
    const addRows = Array.from({ length: rows }, () => cols).reduce((a, x) => a + x, 0)
    const addCols = Array.from({ length: cols }, () => rows).reduce((a, x) => a + x, 0)
    if (t === 2) {
      const askCols = r.chance()
      const known = askCols ? rows : cols
      const ans = tot / known
      let count = 0
      for (let s = known; s <= tot; s += known) count++
      return {
        prompt: `A ${thing} is split into ${tot} same-size ${part}. There are ${known} ${askCols ? 'rows' : 'columns'}. How many ${part} are in each ${askCols ? 'row' : 'column'}?`,
        visual: grid(true),
        input: 'number',
        answer: ans,
        strategies: [
          strat('Skip Count', [`Count by ${known}s until you reach ${tot}.`, `${Array.from({ length: count }, (_, i) => (i + 1) * known).join(', ')}`, `That took ${count} counts. So there are ${count} in each ${askCols ? 'row' : 'column'}.`], count),
          strat('Share It Out', [`Share ${tot} ${part} into ${known} equal ${askCols ? 'rows' : 'columns'}.`, `${tot} ÷ ${known} = ${ans}`], tot / known),
        ],
        distractors: wrongs(ans, [known, tot - known, ans + 1, ans - 1]),
        operands: [rows, cols, tot],
        difficulty: d,
      }
    }
    return {
      prompt:
        t === 1
          ? r.pick([`A ${thing} has ${rows} rows. Each row has ${cols} same-size ${part}. How many ${part} in all?`, `{n} splits a ${thing} into ${rows} rows and ${cols} columns of ${part}. How many ${part} does he make?`])
          : r.pick([`This ${thing} is split into same-size ${part}. How many ${part} are there?`, `Count the same-size ${part} in this ${thing}.`]),
      visual: grid(true),
      input: 'number',
      answer: tot,
      strategies: [
        strat('Add the Rows', [`There are ${rows} rows. Each row has ${cols}.`, `${rowSum} = ${addRows}`], addRows, { html: grid(true, true) }),
        strat('Add the Columns', [`There are ${cols} columns. Each column has ${rows}.`, `${colSum} = ${addCols}`], addCols),
        ...(d > 1 ? [strat('Multiply', [`Rows times columns gives the total.`, `${rows} × ${cols} = ${tot}`], rows * cols)] : []),
      ],
      distractors: wrongs(tot, [rows + cols, 2 * (rows + cols), tot - cols, tot + rows]),
      operands: [rows, cols],
      difficulty: d,
    }
  },

  'ge.quadrilaterals': (rng, d) => {
    const r = R(rng)
    const NAMES = ['square', 'rectangle', 'rhombus', 'trapezoid', 'parallelogram']
    const fill = r.pick(FILLS)
    const t = r.pick(d === 1 ? [0, 0, 1, 2] : d === 2 ? [0, 1, 2, 3] : [0, 2, 3, 4])
    const turn = (v: P[], kind: string) => (d === 3 ? rotate(v, kind === 'square' ? r.pick([0, 15]) : r.pick([0, 0, 18, -14, 90])) : v)
    if (t === 1) {
      // is it a quadrilateral at all?
      const isQ = r.chance(0.55)
      const n = isQ ? 4 : r.pick([3, 5, 6])
      const v = isQ ? r.pick([...QUADS.kite, ...QUADS.trapezoid, ...QUADS.parallelogram, ...QUADS.rhombus, [[-1.5, 1], [1.2, 0.8], [0.6, -1], [-0.9, -0.5]] as P[]]) : regular(n, r.int(0, 5) * 20, Array.from({ length: n }, () => r.int(78, 100) / 100))
      return {
        prompt: r.pick([`Is this shape a quadrilateral?`, `A quadrilateral has 4 sides. Is this shape a quadrilateral?`, `{n} says this shape is a quadrilateral. Is he right?`]),
        visual: shapePic(v, fill),
        ...yn(isQ, rng),
        strategies: [
          strat('Count the Sides', [`"Quad" means 4. A quadrilateral has 4 straight sides.`, `Count the sides of this shape: ${edges(v).length}.`, edges(v).length === 4 ? `It has 4 sides, so yes.` : `That is not 4, so no.`], yesNo(edges(v).length === 4), { html: shapePic(v, fill, { sides: true }) }),
          strat('Count the Corners', [`A quadrilateral has 4 corners too.`, `Count the corners: ${v.length}.`, v.length === 4 ? `4 corners. Yes, it is a quadrilateral.` : `Not 4 corners. It is not a quadrilateral.`], yesNo(v.length === 4), { html: shapePic(v, fill, { corners: true }) }),
        ],
        operands: [n],
        difficulty: d,
      }
    }
    if (t === 2) {
      // riddles
      const RID: Record<string, { clues: string[]; p: Props }> = {
        square: { clues: ['All 4 of my sides are the same length.', 'I have 4 square corners.'], p: { par: 2, eq: true, right: true } },
        rectangle: { clues: ['I have 4 square corners.', 'Two of my sides are long and two are short.'], p: { par: 2, eq: false, right: true } },
        rhombus: { clues: ['All 4 of my sides are the same length.', 'I have no square corners.'], p: { par: 2, eq: true, right: false } },
        parallelogram: { clues: ['My sides across from each other match.', 'I lean over, with no square corners. Two sides are long and two are short.'], p: { par: 2, eq: false, right: false } },
        trapezoid: { clues: ['Only one pair of my sides runs side by side like train tracks.', 'My other two sides do not.'], p: { par: 1, eq: false, right: false } },
      }
      const kind = r.pick(NAMES)
      const v = QUADS[kind][0]
      // match the clues against the rule list of every family: the tightest family that fits wins
      const ordered = [...QUAD_FAMS.slice(1)].sort((a, b) => Object.keys(FAMILY[b].needs).length - Object.keys(FAMILY[a].needs).length)
      const tight = RID[kind].p.par === 1 ? 'trapezoid' : ordered.find((f) => fits(RID[kind].p, f))!
      return {
        prompt: `I have 4 sides. ${RID[kind].clues.join(' ')} What am I?`,
        ...choice(kind, r.shuffle(NAMES.filter((x) => x !== kind)).slice(0, 3), rng),
        strategies: [
          strat('Draw the Clues', [`Draw a shape that fits each clue.`, `Check it: ${RID[kind].clues[0]}`, `The drawing is ${aOrAn(quadName(v))}.`], quadName(v), { html: shapePic(v, fill, { marks: true }) }),
          strat('Rule Out', [`Go through the names one by one.`, `Cross out each name that breaks a clue.`, `Only ${tight} is left.`], tight),
        ],
        operands: [NAMES.indexOf(kind), 4],
        difficulty: d,
      }
    }
    if (t === 3) {
      // count square corners
      const kind = r.pick([...NAMES, 'kite'])
      const v = turn(r.pick(QUADS[kind]), kind)
      const ans = squareCorners(v)
      const byKind = kind === 'square' || kind === 'rectangle' ? 4 : kind === 'trapezoid' ? fit(v, 0, 0, 100, 100).filter((_, i, f) => cornerDeg(f, i) === 90).length : 0
      return {
        prompt: r.pick([`How many square corners does this shape have?`, `A square corner fits the corner of a sheet of paper. How many does this shape have?`, `Count the right angles in this shape.`]),
        visual: shapePic(v, fill),
        input: 'number',
        answer: ans,
        strategies: [
          strat('Paper Corner Test', [`Hold the corner of a sheet of paper in each corner of the shape.`, `Count the corners where it fits just right.`, `It fits in ${ans} ${ans === 1 ? 'corner' : 'corners'}.`], ans, { html: shapePic(v, fill, { marks: true, corners: true }) }),
          strat('Use the Shape Name', [`This shape is a ${kind}.`, byKind === 4 ? `Squares and rectangles always have 4 square corners.` : byKind === 0 ? `It leans, so none of its corners are square.` : `This one has ${byKind} square corners on its straight side.`], byKind),
        ],
        distractors: wrongs(ans, [4, 2, 0, 1]),
        operands: [ans, 4],
        difficulty: d,
      }
    }
    if (t === 4) {
      // does this name fit too?
      const FACTS: [string, string][] = [['square', 'rectangle'], ['square', 'rhombus'], ['rectangle', 'quadrilateral'], ['rhombus', 'quadrilateral'], ['trapezoid', 'quadrilateral'], ['square', 'quadrilateral'], ['rectangle', 'square'], ['rhombus', 'square'], ['rhombus', 'rectangle'], ['rectangle', 'rhombus']]
      const [x, y] = r.pick(FACTS)
      const v = turn(QUADS[x][0], x)
      const ans = fits(propsOf(v), y)
      return {
        prompt: `This shape is a ${x}. Is it also a ${y}?`,
        visual: shapePic(v, fill, { marks: true }),
        ...yn(ans, rng),
        strategies: [
          strat('Check the Rule', [`A ${y} needs ${FAMILY[y].say}.`, `Look at this ${x}. Does it have that?`, ans ? `Yes. So it is a ${y} too.` : `No. So it is not a ${y}.`], yesNo(ans)),
          strat('Think About the Family', [`A ${x} always has ${FAMILY[x].say}.`, relateByRules(x, y) === 'always' ? `Every ${x} fits the ${y} rule. A ${x} is a special kind of ${y}.` : `That is not enough to be a ${y}. This one is not.`], yesNo(relateByRules(x, y) === 'always')),
        ],
        operands: [[...QUAD_FAMS, 'trapezoid'].indexOf(x), QUAD_FAMS.indexOf(y), 4],
        difficulty: d,
      }
    }
    const kind = r.pick(NAMES)
    const v = turn(r.pick(QUADS[kind]), kind)
    const ans = quadName(v)
    const mix: Record<string, string> = { square: 'rhombus', rectangle: 'parallelogram', rhombus: 'square', trapezoid: 'parallelogram', parallelogram: 'rhombus' }
    const p = propsOf(v)
    return {
      prompt: r.pick([`What is the best name for this 4-sided shape?`, `Which name fits this shape best?`, `{n} drew this shape. What is its best name?`]),
      visual: shapePic(v, fill, { marks: true }),
      ...choice(ans, [...new Set([mix[ans], ...r.shuffle(NAMES)])].filter((x) => x !== ans).slice(0, 3), rng),
      strategies: [
        strat('Check Sides and Corners', [p.eq ? `All 4 sides are the same length.` : `The sides are not all the same length.`, p.right ? `All 4 corners are square corners.` : `The corners are not all square.`, p.par === 2 ? `Both pairs of sides across from each other run the same way.` : `Only one pair of sides runs the same way.`, `That is ${aOrAn(ans)}.`], ans),
        strat('Think of Something You Know', [`It looks like ${{ square: 'a base on the ball field', rectangle: 'a door', rhombus: 'a diamond on a playing card', trapezoid: 'a bucket seen from the side', parallelogram: 'a door that got pushed over' }[kind]}.`, `That shape is ${aOrAn(kind)}.`], kind),
      ],
      operands: [NAMES.indexOf(kind), 4],
      difficulty: d,
    }
  },

  'ge.lines': (rng, d) => {
    const r = R(rng)
    const t = r.pick(d === 1 ? [0, 0, 1, 3] : d === 2 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 4])
    const tilt = d === 1 ? 0 : r.pick([0, 20, -25, 40, 65, -50])
    const W = 260,
      H = 180,
      c: P = [W / 2, H / 2]
    const at = (a: number, k: number, from: P = c): P => [from[0] + k * Math.cos(rad(a)), from[1] - k * Math.sin(rad(a))]
    const arrow = (tip: P, a: number, col: string) => polyEl([tip, at(a + 155, 16, tip), at(a - 155, 16, tip)], col, col, 2)
    if (t === 0 || t === 2) {
      const kind = r.pick(t === 2 ? ['line', 'line segment', 'ray'] : d === 1 ? ['line', 'line segment', 'ray'] : ['line', 'line segment', 'ray', 'point'])
      const col = r.pick([BLUE, RED, '#2e7d32', '#6a1b9a'])
      const a = at(tilt + 180, 96),
        b = at(tilt, 96)
      const ends = kind === 'line' ? 0 : kind === 'ray' ? 1 : kind === 'point' ? 0 : 2
      const arrows = kind === 'line' ? 2 : kind === 'ray' ? 1 : 0
      const pic = svg(
        W,
        H,
        kind === 'point'
          ? dot(c, 8, col) + T(c[0] + 18, c[1] - 12, 'A', { size: 18 })
          : lineEl(a, b, col, 5) + (arrows === 2 ? arrow(a, tilt + 180, col) : dot(a, 8, INK)) + (arrows >= 1 ? arrow(b, tilt, col) : dot(b, 8, INK)),
        W,
        'a figure',
      )
      // name it from what the ends look like
      const byEnds = kind === 'point' ? 'point' : arrows === 2 ? 'line' : arrows === 1 ? 'ray' : 'line segment'
      const byDots = kind === 'point' ? 'point' : ['line', 'ray', 'line segment'][ends]
      if (t === 2) {
        return {
          prompt: r.pick([`How many endpoints does this ${kind} have?`, `An endpoint is a dot where the path stops. How many endpoints does a ${kind} have?`]),
          visual: pic,
          input: 'number',
          answer: ends,
          strategies: [
            strat('Count the Dots', [`A dot at the end means the path stops there.`, `An arrow means it keeps going forever.`, `Count the dots: ${2 - arrows}.`], 2 - arrows),
            strat('Use the Name', [`A line goes on forever both ways: 0 endpoints.`, `A ray starts at 1 endpoint and goes on forever.`, `A line segment stops at both ends: 2 endpoints.`, `This is a ${byEnds}, so it has ${['line', 'ray', 'line segment'].indexOf(byEnds)}.`], ['line', 'ray', 'line segment'].indexOf(byEnds)),
          ],
          distractors: wrongs(ends, [0, 1, 2]),
          operands: [ends, arrows],
          difficulty: d,
        }
      }
      return {
        prompt: r.pick([`What is this called?`, `What is the math name for this?`, `{n} drew this. What is it called?`, `Pick the name for this picture.`]),
        visual: pic,
        ...choice(kind, ['line', 'line segment', 'ray', ...(d > 1 ? ['point'] : [])], rng, true),
        strategies: [
          strat('Look at the Ends', kind === 'point' ? [`There is no path here. It is just one dot.`, `One exact spot is called a point.`] : [`An arrow means "keeps going forever". A dot means "stops here".`, `This picture has ${arrows} ${arrows === 1 ? 'arrow' : 'arrows'} and ${ends} end ${ends === 1 ? 'dot' : 'dots'}.`, `That is a ${byEnds}.`], byEnds),
          strat('Think of Something You Know', [kind === 'point' ? `A point is like one tiny dot of chalk.` : kind === 'line' ? `A line is like a road that never ends, both ways.` : kind === 'ray' ? `A ray is like a beam from a flashlight. It starts and then goes on and on.` : `A line segment is like a bat. It has two ends.`, `So this is a ${byDots}.`], byDots),
        ],
        operands: [ends, arrows],
        difficulty: d,
      }
    }
    if (t === 1) {
      // two lines
      const rel = r.pick(['parallel', 'perpendicular', 'neither'])
      const cross = rel === 'parallel' ? 0 : rel === 'perpendicular' ? 90 : r.pick([40, 55, 125, 140])
      const a1 = tilt,
        a2 = tilt + cross
      const off = rel === 'parallel' ? 30 : 0
      const p1 = at(a1 + 90, off),
        p2 = at(a1 - 90, off)
      const seg = (p: P, a: number, col: string) => lineEl(at(a + 180, 92, p), at(a, 92, p), col, 5) + arrow(at(a + 180, 92, p), a + 180, col) + arrow(at(a, 92, p), a, col)
      const pic = (mark: boolean) => {
        let s = seg(p1, a1, BLUE) + seg(p2, a2, RED)
        if (mark && rel === 'perpendicular') {
          const u = at(a1, 16),
            w = at(a2, 16)
          s += `<path d="M${n1(u[0])} ${n1(u[1])} L${n1(u[0] + w[0] - c[0])} ${n1(u[1] + w[1] - c[1])} L${n1(w[0])} ${n1(w[1])}" fill="none" stroke="${INK}" stroke-width="2.5"/>`
        }
        return svg(W, H + 40, `<g transform="translate(0 20)">${s}</g>`, W, 'two lines')
      }
      // two ways to decide: the angle between them, or the dot and cross products of their directions
      const gap = ((a2 - a1) % 180 + 180) % 180
      const byAngle = gap === 0 ? 'parallel' : gap === 90 ? 'perpendicular' : 'neither'
      const u: P = [Math.cos(rad(a1)), Math.sin(rad(a1))],
        w: P = [Math.cos(rad(a2)), Math.sin(rad(a2))]
      const byVec = Math.abs(u[0] * w[1] - u[1] * w[0]) < 1e-6 ? 'parallel' : Math.abs(u[0] * w[0] + u[1] * w[1]) < 1e-6 ? 'perpendicular' : 'neither'
      return {
        prompt: r.pick([`Are these two lines parallel, perpendicular, or neither?`, `Look at the blue line and the red line. Are they parallel, perpendicular, or neither?`]),
        visual: pic(d === 1),
        ...choice(rel, ['parallel', 'perpendicular', 'neither'], rng, true),
        strategies: [
          strat('Will They Ever Meet?', [`Parallel lines stay the same distance apart. They never meet.`, byVec === 'parallel' ? `These lines never get closer. They are parallel.` : `These lines cross, so they are not parallel.`, ...(byVec === 'parallel' ? [] : [byVec === 'perpendicular' ? `They cross in a square corner. They are perpendicular.` : `They do not cross in a square corner. So the answer is neither.`])], byVec),
          strat('Paper Corner Test', [`Put the corner of a sheet of paper where the lines cross.`, byAngle === 'parallel' ? `These lines never cross, so there is no corner to test. They are parallel.` : byAngle === 'perpendicular' ? `The paper corner fits just right. They are perpendicular.` : `The paper corner does not fit. They cross, but not in a square corner: neither.`], byAngle, { html: pic(true) }),
        ],
        operands: [cross, tilt],
        difficulty: d,
      }
    }
    if (t === 3) {
      // real things
      const REAL: [string, string][] = [
        ['The two rails of a train track', 'parallel'],
        ['The two long sides of a ladder', 'parallel'],
        ['The lanes in a swimming pool', 'parallel'],
        ['The top and the bottom of a door', 'parallel'],
        ['The two lines in an equal sign', 'parallel'],
        ['The two tall lines in the letter H', 'parallel'],
        ['The two foul lines that meet at home plate', 'perpendicular'],
        ['The top and the side of a door', 'perpendicular'],
        ['The two lines in a plus sign', 'perpendicular'],
        ['The two lines in the letter T', 'perpendicular'],
        ['The two lines in the letter L', 'perpendicular'],
        ['A wall and the floor', 'perpendicular'],
      ]
      const [thing, rel] = r.pick(REAL)
      const meet = rel === 'perpendicular'
      return {
        prompt: `${thing}: are they parallel or perpendicular?`,
        ...choice(rel, ['parallel', 'perpendicular'], rng, true),
        strategies: [
          strat('Do They Meet?', [`Parallel lines never meet. Perpendicular lines meet in a square corner.`, meet ? `These meet and make a square corner.` : `These stay the same distance apart and never meet.`, `They are ${meet ? 'perpendicular' : 'parallel'}.`], meet ? 'perpendicular' : 'parallel'),
          strat('Word Trick', [`The word parallel has two l's side by side that never touch.`, `Perpendicular lines make a square corner, like a plus sign.`, `${thing} are ${REAL.find((x) => x[0] === thing)![1]}.`], REAL.find((x) => x[0] === thing)![1]),
        ],
        operands: [REAL.findIndex((x) => x[0] === thing)],
        difficulty: d,
      }
    }
    // pairs of parallel sides in a shape
    const SH: [string, P[]][] = [['rectangle', QUADS.rectangle[0]], ['trapezoid', QUADS.trapezoid[0]], ['triangle', regular(3)], ['hexagon', regular(6)], ['parallelogram', QUADS.parallelogram[0]], ['pentagon', regular(5)], ['kite', QUADS.kite[0]], ['square', QUADS.square[0]], ['trapezoid', QUADS.trapezoid[1]], ['rhombus', QUADS.rhombus[1]], ['octagon', regular(8, 22.5)]]
    const [name, v] = r.pick(d === 2 ? SH.slice(0, 8) : SH)
    const ans = parallelPairs(v)
    const fill = r.pick(FILLS)
    const f = fit(v, 0, 0, 240, 190, 22)
    // colour each matching pair for the worked picture
    const e = edges(f)
    const cols = [RED, BLUE, '#2e7d32', '#6a1b9a']
    let marked = polyEl(f, fill),
      k = 0
    for (let i = 0; i < e.length; i++)
      for (let j = i + 1; j < e.length; j++) {
        const a = sub(e[i][1], e[i][0]),
          b = sub(e[j][1], e[j][0])
        if (Math.abs(a[0] * b[1] - a[1] * b[0]) < 0.02 * len(a) * len(b)) {
          marked += lineEl(e[i][0], e[i][1], cols[k % 4], 6) + lineEl(e[j][0], e[j][1], cols[k % 4], 6)
          k++
        }
      }
    return {
      prompt: r.pick([`How many pairs of parallel sides does this ${name} have?`, `Parallel sides run the same way and never meet. How many pairs does this ${name} have?`]),
      visual: shapePic(v, fill),
      input: 'number',
      answer: ans,
      strategies: [
        strat('Match the Sides', [`Pick a side. Look for another side that runs the very same way.`, `Color each matching pair.`, `You color ${k} ${k === 1 ? 'pair' : 'pairs'}.`], k, { html: svg(240, 190, marked, 250, 'the shape with matching sides colored') }),
        strat('Stretch the Sides', [`Pretend every side grows longer, like a road.`, `Sides that would cross are not parallel.`, `${ans} ${ans === 1 ? 'pair of sides never crosses' : 'pairs of sides never cross'}.`], ans),
      ],
      distractors: wrongs(ans, [v.length, ans + 1, ans * 2, ans - 1, 0]),
      operands: [v.length, ans],
      difficulty: d,
    }
  },

  'ge.angles-type': (rng, d) => {
    const r = R(rng)
    const want = r.pick(ANGLE_KINDS)
    const t = d === 1 ? 0 : d === 2 ? r.pick([0, 0, 1]) : r.pick([0, 1, 2])
    let deg: number
    let prompt: string
    let visual: string | undefined
    if (t === 2) {
      const hrs = { acute: [1, 2, 10, 11], right: [3, 9], obtuse: [4, 5, 7, 8] }[want]!
      const h = r.pick(hrs)
      deg = Math.min(30 * h, 360 - 30 * h)
      prompt = `It is ${h} o'clock. What kind of angle do the clock hands make?`
      visual = clockPic(h)
    } else if (t === 1) {
      deg = want === 'right' ? 90 : want === 'acute' ? r.int(d === 2 ? 20 : 3, d === 2 ? 85 : 89) : r.int(d === 2 ? 95 : 91, d === 2 ? 170 : 178)
      prompt = r.pick([`An angle measures ${deg}°. Is it acute, right, or obtuse?`, `{n} measures an angle. It is ${deg}°. What kind of angle is it?`, `A ramp makes an angle of ${deg}°. What kind of angle is that?`])
    } else {
      deg = want === 'right' ? 90 : want === 'acute' ? (d === 1 ? r.int(5, 12) * 5 : r.int(6, 16) * 5) : d === 1 ? r.int(24, 31) * 5 : r.int(20, 32) * 5
      const base = d === 1 ? 0 : r.int(0, 23) * 15
      prompt = r.pick([`What kind of angle is this?`, `Is this angle acute, right, or obtuse?`, `{n} drew this angle. What kind is it?`, `Look at the angle. Is it smaller than, the same as, or bigger than a square corner?`])
      visual = angleFig([base, base + deg], { square: d === 1 })
      const st2 = angleFig([base, base + deg], { dashed: base + 90, arcs: false })
      const byCos = Math.round(Math.cos(rad(deg)) * 1000)
      return {
        prompt,
        visual,
        ...choice(angleKind(deg), ANGLE_KINDS, rng, true),
        strategies: [
          strat('Paper Corner Test', [`Put the corner of a sheet of paper on the point of the angle. The dashed line shows the paper.`, byCos > 0 ? `The angle is inside the paper corner. It is smaller.` : byCos === 0 ? `The angle fits the paper corner just right.` : `The angle opens past the paper corner. It is bigger.`, byCos > 0 ? `Smaller than a square corner is acute.` : byCos === 0 ? `A square corner is a right angle.` : `Bigger than a square corner is obtuse.`], byCos > 0 ? 'acute' : byCos === 0 ? 'right' : 'obtuse', { html: st2 }),
          strat('Think of 90', [`A right angle is 90°. Acute is less. Obtuse is more.`, `This angle is about ${deg}°.`, deg < 90 ? `${deg} is less than 90, so it is acute.` : deg === 90 ? `It is 90 on the dot, so it is right.` : `${deg} is more than 90, so it is obtuse.`], angleKind(deg)),
        ],
        operands: [deg],
        difficulty: d,
      }
    }
    const diff = deg - 90
    return {
      prompt,
      ...(visual ? { visual } : {}),
      ...choice(angleKind(deg), ANGLE_KINDS, rng, true),
      strategies: [
        strat('Compare to 90', [`A right angle is 90°. Acute is less than 90. Obtuse is more than 90.`, t === 2 ? `Each hour on the clock is 30°. These hands are ${deg / 30} hours apart: ${deg / 30} × 30 = ${deg}` : `This angle is ${deg}°.`, deg < 90 ? `${deg} is less than 90, so it is acute.` : deg === 90 ? `It is 90 on the dot, so it is right.` : `${deg} is more than 90, so it is obtuse.`], angleKind(deg)),
        strat('Square Corner Picture', [`Picture a square corner, like the corner of a book.`, diff < 0 ? `This angle is ${-diff}° more closed than that.` : diff === 0 ? `This angle is the very same.` : `This angle is ${diff}° more open than that.`, diff < 0 ? `More closed means acute.` : diff === 0 ? `That is a right angle.` : `More open means obtuse.`], diff < 0 ? 'acute' : diff === 0 ? 'right' : 'obtuse', { html: angleFig([0, deg], { dashed: 90, arcs: false }) }),
      ],
      operands: [deg],
      difficulty: d,
    }
  },

  'ge.angles-measure': (rng, d) => {
    const r = R(rng)
    if (d > 1 && r.chance(0.2)) {
      // turns
      const q = r.int(1, 4)
      const ans = q * 90
      const name = ['a quarter turn', 'a half turn', 'a three-quarter turn', 'a full turn'][q - 1]
      const who = r.pick([`{n} spins ${name} on the trampoline.`, `A dancer spins ${name}.`, `A surfer spins the board ${name}.`, `The hand of a clock makes ${name}.`])
      return {
        prompt: `${who} A full turn is 360°. How many degrees is ${name}?`,
        input: 'number',
        answer: ans,
        unit: '°',
        strategies: [
          strat('Count Quarter Turns', [`A quarter turn is a square corner: 90°.`, `This turn is ${q} quarter ${q === 1 ? 'turn' : 'turns'}.`, `${Array(q).fill(90).join(' + ')} = ${ans}`], Array(q).fill(90).reduce((a: number, x: number) => a + x, 0)),
          strat('Cut Up the Full Turn', q === 4 ? [`A full turn goes all the way around.`, `That is 2 half turns: 180 + 180 = 360`] : q === 2 ? [`A half turn is half of 360.`, `360 ÷ 2 = 180`] : q === 1 ? [`A quarter turn is one of 4 equal parts of 360.`, `360 ÷ 4 = 90`] : [`A three-quarter turn is a full turn with one quarter left off.`, `360 − 90 = 270`], q === 4 ? 180 + 180 : q === 2 ? 360 / 2 : q === 1 ? 360 / 4 : 360 - 90),
        ],
        distractors: wrongs(ans, [q * 25, 360 - ans, ans + 90, ans - 90, 100 * q]),
        operands: [q, 360],
        difficulty: d,
      }
    }
    const intro = r.pick([`{n} opens a door this wide.`, `A bat swings this far.`, `A surfboard tips this much.`, `A skate ramp makes this angle.`, `A dancer lifts a leg this high.`, `A pair of scissors opens this wide.`])
    const ask = r.pick([`How many degrees is the angle?`, `What does the angle measure?`])
    if (d === 3) {
      const a0 = r.int(2, 12) * 5
      const ans = r.int(4, 22) * 5
      const a1 = Math.min(a0 + ans, 175)
      const real = a1 - a0
      const nextTen = Math.min(a1, Math.ceil((a0 + 1) / 10) * 10)
      const hops = nextTen < a1 && nextTen > a0 ? [a0, nextTen, a1] : [a0, a1]
      const hopSum = hops.slice(1).reduce((s, x, i) => s + (x - hops[i]), 0)
      return {
        prompt: `${intro} Look out! The blue ray does not start at 0. ${ask}`,
        visual: protractor([a0, a1]),
        input: 'number',
        answer: real,
        unit: '°',
        strategies: [
          strat('Subtract the Two Marks', [`The angle does not start at 0. So read both rays.`, `The red ray is at ${a1}. The blue ray is at ${a0}.`, `${a1} − ${a0} = ${real}`], a1 - a0),
          strat('Count Up', [`Start at ${a0} and hop to ${a1}.`, hops.length === 3 ? `Hop ${nextTen - a0} to ${nextTen}. Then hop ${a1 - nextTen} more.` : `That is one hop of ${a1 - a0}.`, hops.length === 3 ? `${nextTen - a0} + ${a1 - nextTen} = ${hopSum}` : `The angle is ${hopSum}°.`], hopSum, { line: hops }),
        ],
        distractors: wrongs(real, [a1, a0, a1 + a0, 180 - real]),
        operands: [a0, a1],
        difficulty: d,
      }
    }
    const deg = d === 1 ? r.int(1, 17) * 10 : r.int(1, 17) * 10 + 5
    const tens = Math.floor(deg / 10)
    const off = deg - 90
    return {
      prompt: `${intro} ${ask}`,
      visual: protractor([0, deg]),
      input: 'number',
      answer: deg,
      unit: '°',
      strategies: [
        strat('Count From Zero', [`The blue ray is on 0. Follow the numbers to the red ray.`, `Count by tens: ${tens} ${tens === 1 ? 'ten' : 'tens'} is ${tens * 10}.`, deg % 10 ? `The red ray is one small mark more. Each small mark is 5: ${tens * 10} + 5 = ${tens * 10 + 5}` : `The red ray is right on ${tens * 10}.`], tens * 10 + (deg % 10)),
        strat('Use the Square Corner', [`Straight up is 90, a square corner.`, off < 0 ? `The red ray is ${-off} before straight up.` : off === 0 ? `The red ray points straight up.` : `The red ray is ${off} past straight up.`, off < 0 ? `90 − ${-off} = ${deg}` : off === 0 ? `So the angle is 90°.` : `90 + ${off} = ${deg}`], 90 + off),
      ],
      distractors: wrongs(deg, [180 - deg, deg + 10, deg - 10, deg % 10 ? deg - 5 : deg + 5]),
      operands: [0, deg],
      difficulty: d,
    }
  },

  'ge.angles-add': (rng, d) => {
    const r = R(rng)
    const step = d === 1 ? 10 : d === 2 ? 5 : 1
    const rnd = (lo: number, hi: number) => r.int(Math.ceil(lo / step), Math.floor(hi / step)) * step
    const t = r.pick(d === 1 ? [0, 1, 2] : d === 2 ? [0, 1, 2, 3] : [0, 1, 3, 3, 4, 5])
    if (t === 2) {
      const a = rnd(20, 80),
        b = rnd(20, 80)
      const tens = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10,
        ones = (a % 10) + (b % 10)
      const onTens = Array.from({ length: Math.floor(b / 10) }, (_, i) => a + (i + 1) * 10)
      return {
        prompt: r.pick([`Two angles sit side by side. One is ${a}°. The other is ${b}°. How big is the whole angle?`, `{n} puts two angles side by side. They are ${a}° and ${b}°. What is the whole angle?`]),
        visual: angleFig([0, a, a + b], { labels: [`${a}°`, `${b}°`], outer: '?', w: 280, h: 200, cx: 140, cy: 150 }),
        input: 'number',
        answer: a + b,
        unit: '°',
        strategies: [
          strat('Add the Parts', [`The whole angle is the two parts put together.`, `${a} + ${b} = ${a + b}`], a + b),
          ones
            ? strat('Tens, Then Ones', [`Add the tens: ${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10} = ${tens}`, `Add the ones: ${a % 10} + ${b % 10} = ${ones}`, `${tens} + ${ones} = ${tens + ones}`], tens + ones)
            : strat('Count On by Tens', [`Start at ${a}. Count on ${b / 10} tens.`, onTens.join(', '), `You stop at ${onTens[onTens.length - 1]}.`], onTens[onTens.length - 1], { line: [a, a + b] }),
        ],
        distractors: wrongs(a + b, [Math.abs(a - b), 180 - a - b, a + b + 10, a + b - 10]),
        operands: [a, b],
        difficulty: d,
      }
    }
    if (t === 3 || t === 4 || t === 5) {
      // two known parts, one missing: triangle (180), full turn (360), straight line (180)
      const whole = t === 4 ? 360 : 180
      let a: number, b: number
      if (t === 4) {
        a = rnd(80, 150)
        b = rnd(80, 150)
        if (a + b > 320) b = rnd(60, 100)
      } else {
        a = rnd(30, 80)
        b = rnd(30, 180 - a - 30)
      }
      const x = whole - a - b
      const sum = a + b
      const afterA = whole - a
      const visual =
        t === 3
          ? triPic(triFromAngles(a, b, x), { angles: [`${a}°`, `${b}°`, '?'], fill: r.pick(FILLS) })
          : t === 4
            ? angleFig([0, a, a + b, 360], { labels: [`${a}°`, `${b}°`, '?'] })
            : angleFig([0, a, a + b, 180], { labels: [`${a}°`, `${b}°`, '?'], w: 280, h: 150, cx: 140, cy: 130, L: 110 })
      return {
        prompt:
          t === 3
            ? r.pick([`The three angles of a triangle add up to 180°. Two of them are ${a}° and ${b}°. What is the third angle?`, `A triangle has angles of ${a}° and ${b}°. All three add to 180°. What is the missing angle?`])
            : t === 4
              ? `Three angles go all the way around a point. That is 360°. Two of them are ${a}° and ${b}°. What is the third?`
              : `Three angles make a straight line. That is 180°. Two of them are ${a}° and ${b}°. What is the third?`,
        visual,
        input: 'number',
        answer: x,
        unit: '°',
        strategies: [
          strat('Add, Then Subtract', [`First add the two angles you know: ${a} + ${b} = ${sum}`, `Take that away from ${whole}: ${whole} − ${sum} = ${whole - sum}`, `The missing angle is ${whole - sum}°.`], whole - sum),
          strat('Take Away One at a Time', [`Start with ${whole}.`, `Take away ${a}: ${whole} − ${a} = ${afterA}`, `Take away ${b}: ${afterA} − ${b} = ${afterA - b}`], afterA - b),
        ],
        distractors: wrongs(x, [sum, whole - a, whole - b, (t === 4 ? 180 : 90) - sum, (t === 4 ? 180 : 360) - sum, x + 10]),
        operands: [a, b, whole],
        difficulty: d,
      }
    }
    const whole = t === 0 ? 90 : 180
    const a = t === 0 ? rnd(d === 3 ? 12 : 20, d === 3 ? 78 : 70) : rnd(d === 3 ? 15 : 20, d === 3 ? 165 : 160)
    const x = whole - a
    const toTen = (10 - (a % 10)) % 10
    const hops = toTen ? [a, a + toTen, whole] : [a, whole]
    const hopSum = hops.slice(1).reduce((s, v, i) => s + (v - hops[i]), 0)
    return {
      prompt:
        t === 0
          ? r.pick([`Two angles make a square corner. That is 90°. One angle is ${a}°. What is the other angle?`, `A right angle is cut into two parts. One part is ${a}°. How big is the other part?`])
          : r.pick([`Two angles make a straight line. That is 180°. One angle is ${a}°. What is the other angle?`, `A bat leans on flat ground. One angle is ${a}°. The two angles make a straight line, 180°. What is the other angle?`]),
      visual: t === 0 ? angleFig([0, a, 90], { labels: [`${a}°`, '?'], box: true, arcs: false, w: 230, h: 200, cx: 50, cy: 170, L: 140 }) : angleFig([0, a, 180], { labels: [`${a}°`, '?'], w: 280, h: 150, cx: 140, cy: 130, L: 110 }),
      input: 'number',
      answer: x,
      unit: '°',
      strategies: [
        strat('Subtract', [`The two parts add up to ${whole}.`, `Take away the part you know: ${whole} − ${a} = ${x}`], whole - a),
        strat('Count Up', [`Start at ${a} and count up to ${whole}.`, toTen ? `Hop ${toTen} to ${a + toTen}. Then hop ${whole - a - toTen} to ${whole}.` : `It is one hop of ${whole - a}.`, toTen ? `${toTen} + ${whole - a - toTen} = ${hopSum}` : `The missing angle is ${hopSum}°.`], hopSum, { line: hops }),
      ],
      distractors: wrongs(x, [(t === 0 ? 180 : 90) - a, whole + a, x + 10, x - 10, a]),
      operands: [a, whole],
      difficulty: d,
    }
  },

  'ge.symmetry': (rng, d) => {
    const r = R(rng)
    const fill = r.pick(FILLS)
    const t = r.pick(d === 1 ? [0, 0, 2] : d === 2 ? [0, 1, 2, 3] : [0, 1, 1, 3])
    if (t === 2 || t === 3) {
      // letters
      const ch = r.pick(Object.keys(LETTERS))
      const has = LETTERS[ch]
      if (t === 3) {
        const ans = has.length
        const tests = ['V', 'H'].map((c) => has.includes(c))
        return {
          prompt: r.pick([`How many lines of symmetry does the letter ${ch} have?`, `{n} folds the letter ${ch} so both halves match. How many ways can he fold it?`]),
          visual: letterPic(ch, ''),
          input: 'number',
          answer: ans,
          strategies: [
            strat('Try Both Folds', [`Fold it left over right. ${tests[0] ? 'The halves match.' : 'The halves do not match.'}`, `Fold it top over bottom. ${tests[1] ? 'The halves match.' : 'The halves do not match.'}`, `That makes ${tests.filter(Boolean).length} ${tests.filter(Boolean).length === 1 ? 'line' : 'lines'} of symmetry.`], tests.filter(Boolean).length),
            strat('Use a Mirror', [`Stand a little mirror on the letter. Try it up-and-down, then flat.`, `Count the ways the mirror shows the whole letter again.`, ans === 0 ? `No way works. ${ch} can turn, but it cannot fold onto itself: 0.` : `It works ${ans} ${ans === 1 ? 'way' : 'ways'}.`], ans, ans ? { html: letterPic(ch, has[0]) } : {}),
          ],
          distractors: wrongs(ans, [1, 2, 0, 4]),
          operands: [ch.charCodeAt(0), ans],
          difficulty: d,
        }
      }
      const code = r.pick(['V', 'H'])
      const ans = has.includes(code)
      return {
        prompt: `Is the dashed line a line of symmetry for the letter ${ch}?`,
        visual: letterPic(ch, code),
        ...yn(ans, rng),
        strategies: [
          strat('Fold It', [`Fold the letter along the dashed line.`, ans ? `The two halves land right on top of each other.` : `The two halves do not match up.`, ans ? `Yes, it is a line of symmetry.` : `No, it is not a line of symmetry.`], yesNo(has.indexOf(code) >= 0)),
          strat('Mirror Test', [`Cover one side of the dashed line. Picture a mirror on the line.`, ans ? `The mirror shows the same letter ${ch}.` : `The mirror would show a different shape, not the letter ${ch}.`], yesNo(ans)),
        ],
        operands: [ch.charCodeAt(0), code === 'V' ? 90 : 0],
        difficulty: d,
      }
    }
    const pool = d === 1 ? SYM.filter((s) => ['square', 'rectangle', 'triangle', 'house shape', 'arrow', 'kite', 'trapezoid'].includes(s.name)) : SYM
    const S = r.pick(pool)
    if (t === 1) {
      const ans = countMirrors(S.v)
      return {
        prompt: r.pick([`How many lines of symmetry does this ${S.name} have?`, `How many ways can you fold this ${S.name} so the two halves match?`]),
        visual: symPic(S.v, fill, []),
        input: 'number',
        answer: ans,
        strategies: [
          strat('Fold and Count', [`Try every fold through the middle: up-and-down, flat, and slanted.`, `Keep only the folds where both halves match.`, ans === 0 ? `No fold works. The answer is 0.` : `${ans} ${ans === 1 ? 'fold works' : 'folds work'}.`], ans, ans ? { html: symPic(S.v, fill, mirrorDegs(S.v)) } : {}),
          strat('Know Your Shapes', [S.n === 0 ? `This ${S.name} is lopsided. One side is not a copy of the other.` : S.n === S.v.length || S.n * 2 === S.v.length ? `All the sides and corners match all the way around.` : `Look for matching halves.`, `This ${S.name} has ${S.n} ${S.n === 1 ? 'line' : 'lines'} of symmetry.`], S.n),
        ],
        distractors: wrongs(ans, [S.v.length, ans + 1, ans - 1, ans * 2, S.name === 'rectangle' ? 4 : 2, 1]),
        operands: [S.v.length, ans],
        difficulty: d,
      }
    }
    const code = r.pick(S.v.length === 4 && d > 1 ? ['V', 'H', 'D', 'D'] : ['V', 'H'])
    const deg = lineDeg(S.v, code)
    const ans = isMirror(S.v, deg)
    return {
      prompt: r.pick([`Is the dashed line a line of symmetry for this ${S.name}?`, `{n} folds this ${S.name} on the dashed line. Do the two halves match?`]),
      visual: symPic(S.v, fill, [deg]),
      ...yn(ans, rng),
      strategies: [
        strat('Fold It', [`Fold the shape along the dashed line.`, ans ? `Every corner lands on a matching corner.` : `Some corners have no partner to land on.`, ans ? `Yes, the halves match.` : `No, the halves do not match.`], yesNo(ans)),
        strat('Know Your Shapes', [code === 'D' ? `A corner-to-corner line only works when all 4 sides are equal.` : `Look at the part on each side of the line. Is one a flipped copy of the other?`, S.ok.includes(code) ? `For this ${S.name}, it is. Yes.` : `For this ${S.name}, it is not. No.`], yesNo(S.ok.includes(code))),
      ],
      operands: [S.v.length, Math.round(deg)],
      difficulty: d,
    }
  },

  'ge.triangles': (rng, d) => {
    const r = R(rng)
    const fill = r.pick(FILLS)
    const t = r.pick(d === 1 ? [0, 0, 1] : d === 2 ? [0, 1, 2] : [0, 1, 2, 3])
    const unit = r.pick(['cm', 'feet', 'inches'])
    const mkSides = (kind: string): number[] => {
      if (kind === 'equilateral') {
        const s = r.int(3, 12)
        return [s, s, s]
      }
      if (kind === 'isosceles') {
        const a = r.int(4, 12)
        let b = r.int(Math.max(2, a - 5), Math.min(2 * a - 3, a + 5))
        if (b === a) b = a + 1
        return [a, a, b]
      }
      const a = r.int(4, 9),
        b = a + r.int(1, 3),
        c = b + r.int(1, Math.min(3, a - 2))
      return [a, b, c]
    }
    const mkAngles = (kind: string): number[] => {
      const st = d === 1 ? 10 : 5
      if (kind === 'right') {
        const a = r.int(Math.ceil(25 / st), Math.floor(65 / st)) * st
        return [90, a, 90 - a]
      }
      if (kind === 'obtuse') {
        const big = r.int(Math.ceil(100 / st), Math.floor(130 / st)) * st
        const a = r.int(Math.ceil(20 / st), Math.floor((180 - big - 20) / st)) * st
        return [big, a, 180 - big - a]
      }
      const a = r.int(Math.ceil(50 / st), Math.floor(80 / st)) * st
      const b = r.int(Math.ceil(Math.max(40, 100 - a) / st), Math.floor(80 / st)) * st
      return [a, b, 180 - a - b]
    }
    if (t === 1) {
      const kind = r.pick(ANGLE_KINDS)
      const ang = r.shuffle(mkAngles(kind))
      const big = Math.max(...ang)
      const nRight = ang.filter((x) => x === 90).length,
        nWide = ang.filter((x) => x > 90).length
      return {
        prompt: r.pick([`The angles of this triangle are ${ang[0]}°, ${ang[1]}° and ${ang[2]}°. Is it acute, right, or obtuse?`, `A triangle has angles of ${ang[0]}°, ${ang[1]}° and ${ang[2]}°. What kind of triangle is it?`]),
        visual: triPic(triFromAngles(ang[0], ang[1], ang[2]), { angles: ang.map((x) => `${x}°`), fill, marks: true }),
        ...choice(kind, ANGLE_KINDS, rng, true),
        strategies: [
          strat('Find the Biggest Angle', [`The biggest angle names the triangle. Here it is ${big}°.`, big < 90 ? `${big} is less than 90. All three angles are acute.` : big === 90 ? `It is 90 on the dot. That is a square corner.` : `${big} is more than 90. That is an obtuse angle.`, `So this is ${aOrAn(angleKind(big))} triangle.`], angleKind(big)),
          strat('Hunt for a Square Corner', [`Check each angle against 90.`, `Angles of exactly 90: ${nRight}. Angles bigger than 90: ${nWide}.`, nRight ? `It has a square corner: right.` : nWide ? `It has one wide angle: obtuse.` : `All three are small: acute.`], nRight ? 'right' : nWide ? 'obtuse' : 'acute'),
        ],
        operands: ang,
        difficulty: d,
      }
    }
    if (t === 2) {
      // use the name to find the distance around
      const kind = r.pick(['equilateral', 'isosceles'])
      const s = mkSides(kind)
      const [a, , b] = s
      const tot = s[0] + s[1] + s[2]
      const v = triFromSides(s[0], s[1], s[2])
      return {
        prompt: kind === 'equilateral' ? `This triangle is equilateral. One side is ${a} ${unit}. How far is it all the way around?` : `This triangle is isosceles. The two matching sides are ${a} ${unit} each. The bottom is ${b} ${unit}. How far is it all the way around?`,
        visual: triPic(v, { sides: kind === 'equilateral' ? ['', `${a}`, ''] : [`${b}`, `${a}`, `${a}`], fill }),
        input: 'number',
        answer: tot,
        unit,
        strategies: [
          strat('Add All Three Sides', [kind === 'equilateral' ? `Equilateral means all 3 sides are equal. Each side is ${a}.` : `Isosceles means 2 sides are equal. The sides are ${a}, ${a} and ${b}.`, `${s[0]} + ${s[1]} + ${s[2]} = ${tot}`], s[0] + s[1] + s[2]),
          strat('Multiply the Matching Sides', kind === 'equilateral' ? [`There are 3 sides of ${a}.`, `3 × ${a} = ${3 * a}`] : [`There are 2 sides of ${a}: 2 × ${a} = ${2 * a}`, `Now add the bottom: ${2 * a} + ${b} = ${2 * a + b}`], kind === 'equilateral' ? 3 * a : 2 * a + b),
        ],
        distractors: wrongs(tot, kind === 'equilateral' ? [a, 2 * a, 4 * a, a + 3] : [a + b, a + 2 * b, a * b, tot + a]),
        operands: s,
        difficulty: d,
      }
    }
    if (t === 3) {
      // angles tell you about the sides
      const kind = r.pick(SIDE_KINDS)
      let ang: number[]
      if (kind === 'equilateral') ang = [60, 60, 60]
      else if (kind === 'isosceles') {
        const a = r.pick([30, 35, 40, 45, 50, 55, 65, 70, 75])
        ang = r.shuffle([a, a, 180 - 2 * a])
      } else {
        const a = r.int(6, 12) * 5,
          b = a + r.int(1, 4) * 5
        ang = 180 - a - b !== a && 180 - a - b !== b ? r.shuffle([a, b, 180 - a - b]) : [40, 60, 80]
      }
      const distinct = new Set(ang).size
      return {
        prompt: `A triangle has angles of ${ang[0]}°, ${ang[1]}° and ${ang[2]}°. Equal angles sit across from equal sides. Is it equilateral, isosceles, or scalene?`,
        visual: triPic(triFromAngles(ang[0], ang[1], ang[2]), { angles: ang.map((x) => `${x}°`), fill }),
        ...choice(kind, SIDE_KINDS, rng, true),
        strategies: [
          strat('Count Matching Angles', [`Look for angles that are the same.`, distinct === 1 ? `All 3 angles match, so all 3 sides match.` : distinct === 2 ? `Just 2 angles match, so just 2 sides match.` : `No angles match, so no sides match.`, distinct === 1 ? `That is equilateral.` : distinct === 2 ? `That is isosceles.` : `That is scalene.`], ['equilateral', 'isosceles', 'scalene'][distinct - 1]),
          strat('Sort the Angles', [`Put the angles in order: ${[...ang].sort((x, y) => x - y).join(', ')}.`, `Check neighbors in the list for a match.`, `This triangle is ${sideKind(ang)}.`], sideKind(ang)),
        ],
        operands: ang,
        difficulty: d,
      }
    }
    const kind = r.pick(SIDE_KINDS)
    const s = r.shuffle(mkSides(kind))
    const distinct = new Set(s).size
    return {
      prompt: r.pick([`The sides of this triangle are ${s[0]}, ${s[1]} and ${s[2]} ${unit}. Is it equilateral, isosceles, or scalene?`, `{n} builds a triangle with sides of ${s[0]}, ${s[1]} and ${s[2]} ${unit}. What kind of triangle is it?`]),
      // drawn so that side i is the one between corner i and corner i+1
      visual: triPic(triFromSides(s[1], s[2], s[0]), { sides: [`${s[0]}`, `${s[1]}`, `${s[2]}`], fill }),
      ...choice(kind, SIDE_KINDS, rng, true),
      strategies: [
        strat('Count Matching Sides', [`Equilateral: all 3 sides match. Isosceles: just 2 match. Scalene: none match.`, distinct === 1 ? `Here all 3 sides are ${s[0]}.` : distinct === 2 ? `Here 2 sides match and 1 is different.` : `Here all 3 sides are different.`, `This triangle is ${['equilateral', 'isosceles', 'scalene'][distinct - 1]}.`], ['equilateral', 'isosceles', 'scalene'][distinct - 1]),
        strat('Sort the Sides', [`Put the sides in order: ${[...s].sort((x, y) => x - y).join(', ')}.`, `Now matching sides sit next to each other in the list.`, `This triangle is ${sideKind(s)}.`], sideKind(s)),
      ],
      operands: s,
      difficulty: d,
    }
  },

  'ge.coordinates': (rng, d) => {
    const r = R(rng)
    const G = d === 1 ? 5 : d === 2 ? 8 : 10
    const things = placeThings(r, G, d + 2)
    const it = things[0]
    const t = r.pick(d === 1 ? [0, 1, 2] : d === 2 ? [0, 1, 2, 3] : [0, 1, 2, 3, 4])
    // put something at the swapped spot too, when the spot is free
    if ((t === 2 || t === 4) && !things.slice(1).some((o) => o.x === it.y || o.y === it.x || o.x === it.x || o.y === it.y)) things[1] = { ...things[1], x: it.y, y: it.x }
    const map = fieldMap(G, things)
    const route = fieldMap(G, things, { path: [[0, 0], [it.x, 0], [it.x, it.y]] })
    let across = 0
    for (let i = 0; i < it.x; i++) across++
    let up = 0
    for (let i = 0; i < it.y; i++) up++
    if (t === 0 || t === 1) {
      const isX = t === 0
      const ans = isX ? it.x : it.y
      return {
        prompt: r.pick([`Look at the map of the field. What is the ${isX ? 'x' : 'y'}-coordinate of the ${it.name}?`, `Find the ${it.name} on the map. How far ${isX ? 'across' : 'up'} is it? That is its ${isX ? 'x' : 'y'}-coordinate.`]),
        visual: map,
        input: 'number',
        answer: ans,
        strategies: [
          strat('Walk From Home', [`Start at home plate, at (0, 0).`, `Walk across ${across} to get under the ${it.name}. Then walk up ${up}.`, `The ${isX ? 'x' : 'y'}-coordinate is how far you went ${isX ? 'across' : 'up'}: ${isX ? across : up}.`], isX ? across : up, { html: route }),
          strat('Slide to the Numbers', [isX ? `Put your finger on the ${it.name}. Slide straight down to the bottom numbers.` : `Put your finger on the ${it.name}. Slide straight left to the side numbers.`, `You land on ${ans}.`], ans),
        ],
        distractors: wrongs(ans, [isX ? it.y : it.x, ans + 1, ans - 1]),
        operands: [it.x, it.y],
        difficulty: d,
      }
    }
    if (t === 3) {
      const ans = pair(it.x, it.y)
      const wrong = [pair(it.y, it.x), pair(it.x, it.y + (it.y < G ? 1 : -1)), pair(it.x + (it.x < G ? 1 : -1), it.y)]
      return {
        prompt: r.pick([`Where is the ${it.name} on the map?`, `{n} looks for the ${it.name}. Which ordered pair tells where it is?`]),
        visual: map,
        ...choice(ans, wrong, rng),
        strategies: [
          strat('Across, Then Up', [`Start at home plate. Always go across first, then up.`, `The ${it.name} is ${across} across and ${up} up.`, `Write across first: ${pair(across, up)}.`], pair(across, up), { html: route }),
          strat('Slide to the Numbers', [`Slide down from the ${it.name} to the bottom numbers: x is ${it.x}.`, `Slide left from the ${it.name} to the side numbers: y is ${it.y}.`, `The pair is (x, y): ${ans}.`], ans),
        ],
        operands: [it.x, it.y],
        difficulty: d,
      }
    }
    // which thing is at (x, y)?
    const found = things.find((o) => o.x === it.x && o.y === it.y)!.name
    const inColumn = things.filter((o) => o.x === it.x)
    const byColumn = inColumn.find((o) => o.y === it.y)!.name
    return {
      prompt: t === 4 ? `Start at home plate, (0, 0). Go across ${it.x}. Then go up ${it.y}. What do you find?` : r.pick([`What is at ${pair(it.x, it.y)} on the map?`, `{n} runs to the point ${pair(it.x, it.y)}. What does he find there?`]),
      visual: map,
      ...choice(it.name, things.slice(1).map((o) => o.name), rng),
      strategies: [
        strat('Across, Then Up', [`Start at home plate. The first number says how far across: ${it.x}.`, `The second number says how far up: ${it.y}.`, `You land on the ${found}.`], found, { html: route }),
        strat('Where the Lines Meet', [`Find ${it.x} on the bottom. Run a finger up that line.`, `Find ${it.y} on the side. Run a finger across that line.`, `Your fingers meet at the ${byColumn}.`], byColumn),
      ],
      operands: [it.x, it.y],
      difficulty: d,
    }
  },

  'ge.coordinate-distance': (rng, d) => {
    const r = R(rng)
    const G = d === 1 ? 6 : d === 2 ? 8 : 10
    const t = r.pick(d === 1 ? [0, 0, 1] : d === 2 ? [0, 1, 2] : [0, 1, 2, 3, 3])
    const [n1a, n2a] = r.shuffle(THINGS).slice(0, 2)
    const hopsFrom = (a: number, b: number) => {
      let k = 0
      for (let p = Math.min(a, b); p < Math.max(a, b); p++) k++
      return k
    }
    if (t === 2) {
      // a move changes one coordinate
      const x = r.int(1, G - 1),
        y = r.int(1, G - 1)
      const dir = r.pick(['right', 'left', 'up', 'down'])
      const room = dir === 'right' ? G - x : dir === 'left' ? x : dir === 'up' ? G - y : y
      const k = r.int(1, room)
      const isX = dir === 'right' || dir === 'left'
      const plus = dir === 'right' || dir === 'up'
      const from = isX ? x : y
      const ans = plus ? from + k : from - k
      const nx = isX ? ans : x,
        ny = isX ? y : ans
      let walk = from
      for (let i = 0; i < k; i++) walk += plus ? 1 : -1
      return {
        prompt: `{n} stands at ${pair(x, y)} on the field map. He walks ${k} ${k === 1 ? 'step' : 'steps'} ${dir}. What is his ${isX ? 'x' : 'y'}-coordinate now?`,
        visual: fieldMap(G, [{ name: 'start', x, y }]),
        input: 'number',
        answer: ans,
        strategies: [
          strat('Count the Steps', [`${dir === 'right' || dir === 'left' ? 'Right and left change x, the across number.' : 'Up and down change y, the up number.'}`, `Start at ${from}. Count ${k} ${k === 1 ? 'step' : 'steps'} ${dir}.`, `You stop at ${walk}.`], walk, { html: fieldMap(G, [{ name: 'start', x, y }, { name: 'now', x: nx, y: ny }], { path: [[x, y], [nx, ny]] }), line: [from, walk] }),
          strat('Add or Subtract', [`${plus ? `Going ${dir} makes the number bigger. Add.` : `Going ${dir} makes the number smaller. Subtract.`}`, plus ? `${from} + ${k} = ${ans}` : `${from} − ${k} = ${ans}`], plus ? from + k : from - k),
        ],
        distractors: wrongs(ans, [plus ? from - k : from + k, isX ? y : x, (isX ? y : x) + k, k]),
        operands: [x, y, k],
        difficulty: d,
      }
    }
    if (t === 3) {
      // across, then up
      const x1 = r.int(0, G - 3),
        y1 = r.int(0, G - 3)
      const x2 = r.int(x1 + 2, G),
        y2 = r.int(y1 + 2, G)
      const dx = x2 - x1,
        dy = y2 - y1
      const things = [{ name: n1a, x: x1, y: y1 }, { name: n2a, x: x2, y: y2 }]
      const counted = hopsFrom(x1, x2) + hopsFrom(y1, y2)
      return {
        prompt: `{n} walks from the ${n1a} to the ${n2a}. He stays on the grid lines: first across, then up. How many steps is that?`,
        visual: fieldMap(G, things),
        input: 'number',
        answer: dx + dy,
        unit: 'steps',
        strategies: [
          strat('Count the Path', [`Follow the dotted path. Count each step across: ${hopsFrom(x1, x2)}.`, `Now count each step up: ${hopsFrom(y1, y2)}.`, `${hopsFrom(x1, x2)} + ${hopsFrom(y1, y2)} = ${counted}`], counted, { html: fieldMap(G, things, { path: [[x1, y1], [x2, y1], [x2, y2]] }) }),
          strat('Subtract the Coordinates', [`Across: ${x2} − ${x1} = ${dx}`, `Up: ${y2} − ${y1} = ${dy}`, `${dx} + ${dy} = ${dx + dy}`], dx + dy),
        ],
        distractors: wrongs(dx + dy, [dx, dy, x2 + y2, dx * dy, dx + dy + 1]),
        operands: [x1, y1, x2, y2],
        difficulty: d,
      }
    }
    // same row (t 0) or same column (t 1)
    const row = t === 0
    const fixed = r.int(1, G - 1)
    const a = r.int(0, G - 2)
    const b = r.int(a + 2, G)
    const [p, q] = r.chance() ? [a, b] : [b, a]
    const things = row ? [{ name: n1a, x: p, y: fixed }, { name: n2a, x: q, y: fixed }] : [{ name: n1a, x: fixed, y: p }, { name: n2a, x: fixed, y: q }]
    const ans = b - a
    const P1 = pair(things[0].x, things[0].y),
      P2 = pair(things[1].x, things[1].y)
    return {
      prompt: r.pick(
        d === 1
          ? [`How many steps is it from the ${n1a} to the ${n2a}?`, `{n} walks straight from the ${n1a} to the ${n2a}. How many steps?`]
          : [`The ${n1a} is at ${P1}. The ${n2a} is at ${P2}. How many steps apart are they?`, `{n} walks from the ${n1a} at ${P1} to the ${n2a} at ${P2}. How many steps?`],
      ),
      visual: fieldMap(G, things),
      input: 'number',
      answer: ans,
      unit: 'steps',
      strategies: [
        strat('Count the Hops', [`They are in the same ${row ? 'row' : 'column'}. Walk straight from one to the other.`, `Count each square you pass: ${hopsFrom(p, q)} hops.`], hopsFrom(p, q), { html: fieldMap(G, things, { path: [[things[0].x, things[0].y], [things[1].x, things[1].y]] }), line: [a, b] }),
        strat('Subtract', [`The ${row ? 'y' : 'x'} numbers match, so only ${row ? 'x' : 'y'} changes.`, `Take the small ${row ? 'x' : 'y'} from the big one: ${b} − ${a} = ${ans}`], b - a),
      ],
      distractors: wrongs(ans, [a + b, ans + 1, ans - 1, b, fixed]),
      operands: row ? [p, fixed, q, fixed] : [fixed, p, fixed, q],
      difficulty: d,
    }
  },

  'ge.classify': (rng, d) => {
    const r = R(rng)
    const fill = r.pick(FILLS)
    const t = r.pick(d === 1 ? [0, 1, 1] : d === 2 ? [0, 0, 1, 2] : [0, 0, 2, 3])
    if (t === 0) {
      const pool = d === 1 ? PAIRS.filter(([x, y]) => !FAMILY[x].tri && relateByCases(x, y) !== 'sometimes') : PAIRS
      const [x, y] = r.pick(pool)
      const ans = relateByCases(x, y)
      const rule = relateByRules(x, y)
      const yShort = y.replace(' triangle', '')
      const cases = (FAMILY[x].tri ? TRI_CASES : QUAD_CASES).filter((c) => fits(c, x))
      const hit = cases.filter((c) => fits(c, y)).length
      return {
        prompt: r.pick([`Is ${aOrAn(x)} always, sometimes, or never ${FAMILY[y].tri ? yShort : aOrAn(y)}?`, `{n} says ${aOrAn(x)} is ${FAMILY[y].tri ? yShort : aOrAn(y)}. Is that always, sometimes, or never true?`]),
        ...choice(ans, ['always', 'sometimes', 'never'], rng, true),
        strategies: [
          strat('Check the Rules', [`${aOrAn(x).replace(/^a/, 'A')} must have ${FAMILY[x].say}.`, `${aOrAn(y).replace(/^a/, 'A')} must have ${FAMILY[y].say}.`, rule === 'always' ? `The first rule already gives everything the second rule needs: always.` : rule === 'never' ? `The two rules fight. A shape cannot have both: never.` : `Some shapes fit both rules and some fit only the first: sometimes.`], rule),
          strat('Try Some Shapes', [`Picture every kind of ${x} you can.`, hit === cases.length ? `Every one of them is also ${FAMILY[y].tri ? yShort : aOrAn(y)}.` : hit === 0 ? `Not one of them is ${FAMILY[y].tri ? yShort : aOrAn(y)}.` : `Some are ${FAMILY[y].tri ? yShort : aOrAn(y)}, and some are not.`, `So the answer is ${ans}.`], hit === cases.length ? 'always' : hit === 0 ? 'never' : 'sometimes'),
        ],
        operands: [PAIRS.findIndex((p) => p[0] === x && p[1] === y)],
        difficulty: d,
      }
    }
    const kind = r.pick(t === 2 ? ['rectangle', 'rhombus', 'parallelogram'] : ['square', 'rectangle', 'rhombus', 'parallelogram'])
    const v = r.pick(QUADS[kind])
    const p = propsOf(v)
    const visual = shapePic(v, fill, { marks: true })
    const fitList = QUAD_FAMS.filter((f) => fits(p, f))
    const see = `This shape has ${p.eq ? '4 equal sides' : 'sides that are not all equal'} and ${p.right ? '4 square corners' : 'no square corners'}. Its opposite sides are parallel.`
    if (t === 1) {
      const fam = r.pick(QUAD_FAMS)
      const ans = fits(p, fam)
      return {
        prompt: r.pick([`Does the name "${fam}" fit this shape?`, `{n} calls this shape a ${fam}. Is that name true for it?`]),
        visual,
        ...yn(ans, rng),
        strategies: [
          strat('Check the Rule', [`A ${fam} must have ${FAMILY[fam].say}.`, see, ans ? `It has what the rule needs. Yes.` : `It is missing something the rule needs. No.`], yesNo(ans)),
          strat('List Every Name That Fits', [`A shape can have more than one name.`, `Names that fit this one: ${fitList.join(', ')}.`, fitList.includes(fam) ? `"${fam}" is on the list. Yes.` : `"${fam}" is not on the list. No.`], yesNo(fitList.includes(fam))),
        ],
        operands: [QUAD_FAMS.indexOf(fam), QUAD_FAMS.indexOf(kind), 4],
        difficulty: d,
      }
    }
    if (t === 2) {
      const no = QUAD_FAMS.filter((f) => !fits(p, f))
      const out = r.pick(no)
      const options = r.shuffle([out, ...r.shuffle(fitList).slice(0, 3)])
      const byRule = options.find((f) => !Object.entries(FAMILY[f].needs).every(([k, val]) => propsOf(v)[k] === val))!
      return {
        prompt: `Which name does NOT fit this shape?`,
        visual,
        ...choice(out, options.filter((f) => f !== out), rng),
        strategies: [
          strat('Test Each Name', [see, ...options.map((f) => `${f}: needs ${FAMILY[f].say}. ${fits(p, f) ? 'Fits.' : 'Does not fit.'}`)], byRule),
          strat('List Every Name That Fits', [`Names that fit this shape: ${fitList.join(', ')}.`, `The name that is not on that list is ${options.filter((f) => !fitList.includes(f))[0]}.`], options.filter((f) => !fitList.includes(f))[0]),
        ],
        operands: [QUAD_FAMS.indexOf(kind), QUAD_FAMS.indexOf(out), 4],
        difficulty: d,
      }
    }
    // how many of these names fit?
    const list = r.shuffle(QUAD_FAMS).slice(0, r.int(3, 4))
    const ans = list.filter((f) => fits(p, f)).length
    let tally = 0
    const lines = list.map((f) => {
      const ok = fitList.includes(f)
      if (ok) tally++
      return `${f}: ${ok ? 'yes' : 'no'}.`
    })
    return {
      prompt: `How many of these names fit this shape? ${list.join(', ')}.`,
      visual,
      input: 'number',
      answer: ans,
      strategies: [
        strat('Test Each Name', [see, ...lines, `Count the yes answers: ${tally}.`], tally),
        strat('Use the Family Tree', [`Every 4-sided shape is a quadrilateral. Rectangles and rhombuses are special parallelograms. A square is both.`, `The best name here is ${quadName(v)}. It also gets every name above it in the tree.`, `From the list, ${ans} ${ans === 1 ? 'name fits' : 'names fit'}.`], ans),
      ],
      distractors: wrongs(ans, [1, list.length, ans + 1, ans - 1]),
      operands: [QUAD_FAMS.indexOf(kind), list.length, ans],
      difficulty: d,
    }
  },
}

export const teach: Record<string, string> = {
  'ge.shapes-2d': 'Shapes get their names from their sides. Count the straight sides: 3 is a triangle, 4 can be a square or rectangle, 5 is a pentagon, 6 is a hexagon.',
  'ge.sides-corners': 'A side is a straight edge. A corner is where two sides meet. Go around the shape one time and count. Sides and corners always match.',
  'ge.shapes-3d': 'Solid shapes are fat, not flat. You can hold them. Look for flat faces, curved parts, edges and corners to tell them apart.',
  'ge.partition': 'You can split a rectangle into rows and columns of same-size squares. Count one row, then add that number for every row.',
  'ge.quadrilaterals': 'A quadrilateral is any shape with 4 straight sides. Squares, rectangles, rhombuses and trapezoids are all in this family. Check the sides and the corners.',
  'ge.lines': 'A line goes on forever both ways. A ray has one end. A line segment has two ends. Parallel lines never meet. Perpendicular lines make a square corner.',
  'ge.angles-type': 'An angle is how wide two rays open. A square corner is a right angle. Smaller than that is acute. Wider than that is obtuse.',
  'ge.angles-measure': 'We measure angles in degrees with a protractor. A square corner is 90 degrees. A straight line is 180. A full turn is 360.',
  'ge.angles-add': 'Angles side by side add up. Parts of a square corner make 90. Parts of a straight line make 180. So you can find a missing part by subtracting.',
  'ge.symmetry': 'A line of symmetry is a fold line. When you fold on it, the two halves match exactly, like butterfly wings.',
  'ge.triangles': 'Triangles get names from their sides and their angles. All sides equal is equilateral, two equal is isosceles, none equal is scalene. A square corner makes a right triangle.',
  'ge.coordinates': 'Two numbers tell where a point is on a grid. Start at home plate. The first number says how far to go across. The second says how far to go up.',
  'ge.coordinate-distance': 'To find how far apart two points are in the same row or column, count the steps between them, or subtract the small number from the big one.',
  'ge.classify': 'Shapes live in families. A square is a special rectangle and a special rhombus. To see if a name fits, check the rule for that name.',
}

const isChoice = (it: Item, among?: string[]) => it.input === 'choice' && typeof it.answer === 'string' && (!among || among.includes(it.answer))
const between = (x: number | string, lo: number, hi: number) => typeof x === 'number' && x >= lo && x <= hi
const FLAT_NAMES = ['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'octagon', 'trapezoid', 'rhombus', 'A', 'B', 'C']

export const limits: Record<string, (it: Item) => boolean> = {
  'ge.shapes-2d': (it) => isChoice(it, FLAT_NAMES) && it.operands.every((x) => x >= 0 && x <= 8),
  'ge.sides-corners': (it) => isNum(it) && between(it.answer, 3, 32) && it.operands.every((x) => x >= 2 && x <= 12),
  'ge.shapes-3d': (it) => (isNum(it) ? between(it.answer, 0, 12) : isChoice(it, Object.keys(SOLIDS))) && it.operands.every((x) => x >= 0 && x <= 6),
  'ge.partition': (it) => isNum(it) && it.operands[0] >= 2 && it.operands[0] <= 6 && it.operands[1] >= 2 && it.operands[1] <= 8 && between(it.answer, 2, 48),
  'ge.quadrilaterals': (it) => (isNum(it) ? between(it.answer, 0, 4) : isChoice(it, ['yes', 'no', 'square', 'rectangle', 'rhombus', 'trapezoid', 'parallelogram'])) && it.operands.every((x) => x >= 0 && x <= 6),
  'ge.lines': (it) => (isNum(it) ? between(it.answer, 0, 4) : isChoice(it, ['line', 'line segment', 'ray', 'point', 'parallel', 'perpendicular', 'neither'])),
  'ge.angles-type': (it) => isChoice(it, ANGLE_KINDS) && it.operands[0] >= 1 && it.operands[0] <= 179 && angleKind(it.operands[0]) === it.answer,
  'ge.angles-measure': (it) => isNum(it) && between(it.answer, 10, 360) && +it.answer % 5 === 0 && it.operands.every((x) => x >= 0 && x <= 360),
  'ge.angles-add': (it) => isNum(it) && between(it.answer, 10, 200) && it.operands.every((x) => x >= 10 && x <= 360),
  'ge.symmetry': (it) => (isNum(it) ? between(it.answer, 0, 6) : isChoice(it, ['yes', 'no'])),
  'ge.triangles': (it) =>
    it.operands.length === 3 &&
    (isNum(it) ? between(it.answer, 9, 45) : isChoice(it, [...SIDE_KINDS, ...ANGLE_KINDS])) &&
    (it.operands[0] + it.operands[1] + it.operands[2] === 180 || Math.max(...it.operands) * 2 < it.operands[0] + it.operands[1] + it.operands[2]),
  'ge.coordinates': (it) => it.operands.every((x) => x >= 0 && x <= 10) && (isNum(it) ? between(it.answer, 0, 10) : isChoice(it)),
  'ge.coordinate-distance': (it) => isNum(it) && between(it.answer, 0, 20) && it.operands.every((x) => x >= 0 && x <= 10),
  'ge.classify': (it) => (isNum(it) ? between(it.answer, 0, 4) : isChoice(it, ['always', 'sometimes', 'never', 'yes', 'no', ...QUAD_FAMS])),
}
