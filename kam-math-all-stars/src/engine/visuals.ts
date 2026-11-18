import { dig, fmtN, placesOf, sym } from './util'
import type { Op } from './types'

/* Visual builders. They return trusted HTML/SVG strings built only from numbers the engine produced. */

export function numberLineSVG(pts: number[]): string {
  const W = 560,
    H = 160
  const lo = Math.min(...pts),
    hi = Math.max(...pts)
  const pad = Math.max((hi - lo) * 0.07, 2)
  const x = (v: number) => 30 + ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (W - 60)
  const fs = hi >= 10000 ? 13 : 16
  // a real minus sign for numbers below zero
  const label = (v: number) => fmtN(v).replace('-', '−')
  let s = `<svg viewBox="0 0 ${W} ${H}" class="nl" role="img" aria-label="number line"><line x1="16" y1="118" x2="${W - 16}" y2="118" stroke="#37474f" stroke-width="3" stroke-linecap="round"/>`
  const seen = new Set<number>()
  pts.forEach((v, i) => {
    if (seen.has(v)) return
    seen.add(v)
    const last = i === pts.length - 1
    s += `<line x1="${x(v)}" y1="108" x2="${x(v)}" y2="128" stroke="#37474f" stroke-width="3"/><text x="${x(v)}" y="${i % 2 ? 154 : 150}" text-anchor="middle" font-size="${last || i === 0 ? fs + 3 : fs}" font-weight="700" fill="${last ? '#2e7d32' : i === 0 ? '#1d2b36' : '#546e7a'}">${label(v)}</text>`
  })
  for (let i = 1; i < pts.length; i++) {
    const x1 = x(pts[i - 1]),
      x2 = x(pts[i])
    const mx = (x1 + x2) / 2
    const h = Math.min(90, 26 + Math.abs(x2 - x1) * 0.45)
    const d = pts[i] - pts[i - 1]
    const ly = 114 - h * 0.8 - 6 - (i % 2 && Math.abs(x2 - x1) < 40 ? 14 : 0)
    s += `<path d="M${x1} 112 Q ${mx} ${112 - h * 1.6} ${x2} 112" fill="none" stroke="#ff7043" stroke-width="3.5" stroke-linecap="round" class="arc" style="animation-delay:${(i - 1) * 0.55}s"/>`
    s += `<text x="${mx}" y="${ly}" text-anchor="middle" font-size="16" font-weight="700" fill="#d84315" class="hl" style="animation-delay:${(i - 1) * 0.55 + 0.4}s">${d > 0 ? '+' : '−'}${fmtN(Math.abs(d))}</text>`
  }
  return s + '</svg>'
}

export function groupsHTML(g: number, k: number): string {
  let s = '<div class="groups">'
  for (let i = 0; i < g; i++) s += '<div class="grp">' + '<i></i>'.repeat(k) + '</div>'
  return s + '</div>'
}

export function arrayHTML(r: number, c: number, split?: number): string {
  let s = `<div class="arr" style="grid-template-columns:repeat(${c},auto)">`
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      s += `<i class="${split && j >= split ? 'b' : ''}" style="${split && j === split ? 'margin-left:10px' : ''}"></i>`
  return s + '</div>'
}

export function areaHTML(A: number[], B: number[]): string {
  let s = '<table class="area"><tr><th>×</th>' + A.map((x) => `<th>${fmtN(x)}</th>`).join('') + '</tr>'
  for (const y of B) s += `<tr><th>${fmtN(y)}</th>` + A.map((x) => `<td>${fmtN(x * y)}</td>`).join('') + '</tr>'
  return s + '</table>'
}

export function barHTML(d: number, q: number, lit: number): string {
  let s = '<div class="fbar">'
  for (let i = 0; i < d; i++) s += `<div class="${i < lit ? 'lit' : ''}">${q}</div>`
  return s + '</div>'
}

export function placeTable(a: number, b: number, op: Op, ans?: number): string {
  const pl = placesOf(Math.max(a, b, ans || 0))
  const names: Record<number, string> = { 1: 'Ones', 10: 'Tens', 100: 'Hund', 1000: 'Thou' }
  const hd = pl.map((x) => names[x] || '')
  const row = (v: number, pre: string, cls = '') =>
    `<tr class="${cls}"><td class="op">${pre}</td>` +
    pl.map((x) => `<td>${v >= x || x === 1 ? dig(v, x) : ''}</td>`).join('') +
    '</tr>'
  return `<table class="ptab"><tr><th></th>${hd.map((h) => `<th>${h}</th>`).join('')}</tr>${row(a, '')}${row(b, sym(op))}${ans !== undefined ? row(ans, '', 'ansr') : ''}</table>`
}
