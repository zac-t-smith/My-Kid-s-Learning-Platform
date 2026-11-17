import type { Problem } from './types'
import { fmtN, fracHTML, fracWords, OPW, sym } from './util'

export const Q = '<span class="blank">?</span>'

/** Left-hand side as HTML (fractions are stacked, `hide` shows a blank). */
export function lhs(p: Problem, hide?: 'a' | 'b'): string {
  if (p.kind === 'frac') return `${fracHTML(p.num!, p.a)} of ${fmtN(p.b)}`
  if (p.kind === 'two') return `${fmtN(p.a)} ${sym(p.op)} ${fmtN(p.b)} ${sym(p.op2!)} ${fmtN(p.c!)}`
  return `${hide === 'a' ? Q : fmtN(p.a)} ${sym(p.op)} ${hide === 'b' ? Q : fmtN(p.b)}`
}
export function plainLhs(p: Problem, hide?: 'a' | 'b'): string {
  if (p.kind === 'frac') return `${p.num}/${p.a} of ${fmtN(p.b)}`
  if (p.kind === 'two') return `${fmtN(p.a)} ${sym(p.op)} ${fmtN(p.b)} ${sym(p.op2!)} ${fmtN(p.c!)}`
  return `${hide === 'a' ? '?' : fmtN(p.a)} ${sym(p.op)} ${hide === 'b' ? '?' : fmtN(p.b)}`
}
export function sayLhs(p: Problem, hide?: 'a' | 'b'): string {
  if (p.kind === 'frac') return `${fracWords(p.num!, p.a)} of ${p.b}`
  if (p.kind === 'two') return `${p.a} ${OPW[p.op]} ${p.b} ${OPW[p.op2!]} ${p.c}`
  return `${hide === 'a' ? 'what number' : p.a} ${OPW[p.op]} ${hide === 'b' ? 'what number' : p.b}`
}
/** One-line text version for the parent log. */
export function plainEq(p: Problem): string {
  if (p.fmt === 'missing') return `${plainLhs(p, p.miss)} = ${fmtN(p.ans)}`
  if (p.fmt === 'agree') return `${plainLhs(p)} = ${fmtN(p.shown!)}? (${p.isTrue ? 'true' : 'false'})`
  return plainLhs(p) + (p.fmt === 'story' ? ' (word problem)' : '')
}
export function speechFor(p: Problem): string {
  if (p.fmt === 'story') return p.story || ''
  if (p.fmt === 'missing') return `${sayLhs(p, p.miss)} equals ${p.ans}?`
  if (p.fmt === 'agree') return `Someone says ${sayLhs(p)} equals ${p.shown}. Do you agree, or disagree?`
  if (p.op === '×' && p.kind === 'basic' && p.a <= 5 && p.b <= 10) return `${p.a} groups of ${p.b}. What is ${p.a} times ${p.b}?`
  return `What is ${sayLhs(p)}?`
}
/** The equation as first shown on the play card. */
export function eqHTML(p: Problem): string {
  if (p.fmt === 'missing') return `${lhs(p, p.miss)} = ${fmtN(p.ans)}`
  if (p.fmt === 'agree') return `${lhs(p)} = ${fmtN(p.shown!)}`
  return `${lhs(p)} = ${Q}`
}
/** The small helper line under the equation. */
export function subline(p: Problem): string {
  if (p.fmt === 'agree') return 'Agree or disagree?'
  if (p.fmt === 'missing') return 'What is the mystery number?'
  if (p.fmt === 'story') return ''
  if (p.kind === 'two') return 'Two steps!'
  if (p.kind === 'frac') return `${fracWords(p.num!, p.a)} of ${p.b}`
  if (p.op === '×' && p.a <= 5 && p.b <= 10) return `${p.a} groups of ${p.b}`
  if (p.op === '÷' && p.a <= 90) return `Share ${p.a} into ${p.b} equal groups`
  return ''
}
