import { fill, THEMES } from '../content/themes'
import { fmtN, mulberry32 } from '../engine/util'
import { numberLineSVG } from '../engine/visuals'
import { makeItem, TEACH } from './graph'
import { SKILL } from './manifest'

export interface Scene {
  /** What the voice says (also shown as the caption). */
  say: string
  /** Big line at the top of the stage. */
  head?: string
  /** Picture (trusted HTML from the skill generators). */
  html?: string
  /** Steps shown so far. */
  steps: string[]
}

/**
 * A short narrated lesson for a skill: the big idea, then one worked example solved two ways.
 * The example is always the same for a skill, so a lesson can be replayed.
 */
export function buildScenes(id: string, name: string): Scene[] {
  const seed = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const item = makeItem(id, { rng: mulberry32(seed), d: 1 })
  const answer = (typeof item.answer === 'number' ? fmtN(item.answer) : item.answer) + (item.unit ? ` ${item.unit}` : '')
  const q = fill(item.prompt, name, THEMES.baseball)
  const pic = item.visual
  const head = item.eq
  const scenes: Scene[] = [
    { say: TEACH[id] || `Let us learn ${SKILL[id].name}.`, steps: [] },
    { say: `Here is one to try together. ${q}`, head, html: pic, steps: [] },
  ]
  item.strategies.slice(0, 2).forEach((s, k) => {
    const html = (s.line ? numberLineSVG(s.line) : '') + (s.html || '') || pic
    scenes.push({ say: k ? `Here is another way. ${s.name}.` : `One way to do it: ${s.name}.`, head, html, steps: [] })
    s.steps.forEach((_, i) => scenes.push({ say: s.steps[i], head, html, steps: s.steps.slice(0, i + 1) }))
  })
  scenes.push({ say: `So the answer is ${answer}. Two ways, same answer. Use the one that feels best to you!`, head, html: pic, steps: [`The answer is ${answer}`] })
  return scenes
}
