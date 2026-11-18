import { useSyncExternalStore } from 'react'
import { S } from '../db/store'

/* Voice: Web Speech API (free, works offline), with read-along word highlighting. */
const ok = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
let voices: SpeechSynthesisVoice[] = []

export function loadVoices() {
  if (!ok) return
  try {
    voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang))
  } catch {
    /* no voices */
  }
}
if (ok) {
  loadVoices()
  try {
    speechSynthesis.onvoiceschanged = loadVoices
  } catch {
    /* older Safari */
  }
}
export const speechOk = () => ok
export const getVoices = () => voices

function chooseVoice(): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const want = S().voice
  if (want) {
    const v = voices.find((v) => v.name === want)
    if (v) return v
  }
  const pref = ['Samantha (Enhanced)', 'Ava (Enhanced)', 'Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Ava', 'Allison', 'Karen', 'Daniel']
  for (const p of pref) {
    const v = voices.find((v) => v.name.includes(p))
    if (v) return v
  }
  return voices.find((v) => /en[-_]US/i.test(v.lang)) || voices[0]
}

/* ---------- read-along: which word of which text is being spoken right now ---------- */

/** One word on screen and how the voice should say it. */
export interface Tok {
  show: string
  say: string
}
const SYMBOL_WORDS: Record<string, string> = { '−': 'minus', '-': 'minus', '+': 'plus', '×': 'times', '÷': 'divided by', '=': 'equals', '→': 'to', '?': 'what number', '✓': '', '·': '' }
const FRACTION_WORDS: Record<string, [string, string]> = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 10: ['tenth', 'tenths'] }
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
/** How one written word is spoken: math symbols become words, emoji are skipped. */
export function sayWord(w: string): string {
  if (w in SYMBOL_WORDS) return SYMBOL_WORDS[w]
  const fr = /^(\d+)\/(\d+)([.,!?]?)$/.exec(w)
  if (fr && FRACTION_WORDS[fr[2]] && NUMBER_WORDS[+fr[1]]) return `${NUMBER_WORDS[+fr[1]]} ${FRACTION_WORDS[fr[2]][+fr[1] > 1 ? 1 : 0]}${fr[3]}`
  return w
    .replace(/(\d),(?=\d{3})/g, '$1')
    .replace(/[−]/g, ' minus ')
    .replace(/[×]/g, ' times ')
    .replace(/[^\p{L}\p{N}\s.,!?'’:;%$-]/gu, '')
    .trim()
}
/** Split a sentence into words for read-along. */
export const tokenize = (text: string): Tok[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((show) => ({ show, say: sayWord(show) }))
/** The first sentence of a text (read-along level 2 reads only this much on its own). */
export function firstSentence(text: string): string {
  const m = /^.*?[.!?](?=\s|$)/.exec(text)
  return m ? m[0] : text
}

let reading = { id: '', word: -1 }
const readingSubs = new Set<() => void>()
function setReading(id: string, word: number) {
  if (reading.id === id && reading.word === word) return
  reading = { id, word }
  readingSubs.forEach((f) => f())
}
/** Index of the word being spoken in the text with this id, or -1. */
export function useReading(id: string): number {
  const r = useSyncExternalStore(
    (f) => (readingSubs.add(f), () => readingSubs.delete(f)),
    () => reading,
  )
  return r.id === id ? r.word : -1
}

/** Roughly how long the voice takes on one word, used when the browser does not report word timing. */
function estimateMs(say: string, rate: number): number {
  if (!say) return 0
  return (120 + say.replace(/[^\p{L}\p{N}]/gu, '').length * 62 + (/[.!?]$/.test(say) ? 330 : /[,:;]$/.test(say) ? 160 : 0)) / rate
}

let speakTok = 0
let timers: ReturnType<typeof setTimeout>[] = []
const clearTimers = () => {
  timers.forEach(clearTimeout)
  timers = []
}

export interface SpeakOpts {
  onend?: () => void
  /** Read-along id: the on-screen text with this id is highlighted word by word. */
  id?: string
}
/**
 * Say something. Pass a string, or words (when what is shown and what is said differ, like "−" / "minus").
 * `onend` fires once, even if the browser never reports the end.
 */
export function speak(text: string | Tok[], opts: SpeakOpts = {}) {
  const tok = ++speakTok
  clearTimers()
  const toks = typeof text === 'string' ? (opts.id ? tokenize(text) : [{ show: text, say: text }]) : text
  // Build the spoken string and remember where each on-screen word starts in it.
  const starts: number[] = []
  let spoken = ''
  for (const t of toks) {
    starts.push(spoken.length)
    if (t.say) spoken += (spoken ? ' ' : '') + t.say
  }
  const id = opts.id || ''
  const done = () => {
    if (tok !== speakTok) return
    speakTok++
    clearTimers()
    setReading('', -1)
    opts.onend?.()
  }
  const rate = S().rate
  let real = false // true once the browser sends real word-boundary events
  /** Fallback highlighting on a timer. Stops mattering the moment a real boundary event arrives. */
  const estimate = (finish: boolean) => {
    let at = 150
    toks.forEach((t, i) => {
      if (id && t.say) timers.push(setTimeout(() => tok === speakTok && !real && setReading(id, i), at))
      at += estimateMs(t.say, rate)
    })
    if (finish) timers.push(setTimeout(done, at + 200))
  }
  if (!ok) {
    // No voice at all: still walk the highlight so the timing of the app stays the same.
    if (id || opts.onend) estimate(true)
    return
  }
  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
  const u = new SpeechSynthesisUtterance(spoken)
  const v = chooseVoice()
  if (v) u.voice = v
  u.rate = rate
  u.pitch = 1.1
  u.onend = done
  u.onerror = () => {
    if (tok === speakTok) setTimeout(done, 300)
  }
  if (id) {
    let started = false
    const begin = () => {
      if (started || tok !== speakTok) return
      started = true
      estimate(false)
    }
    u.onstart = begin
    timers.push(setTimeout(begin, 600)) // some browsers never fire onstart
    u.onboundary = (e) => {
      if (tok !== speakTok || (e.name && e.name !== 'word')) return
      real = true
      let i = 0
      while (i + 1 < starts.length && starts[i + 1] <= e.charIndex) i++
      setReading(id, i)
    }
  }
  timers.push(setTimeout(done, 2500 + spoken.length * 95))
  try {
    speechSynthesis.speak(u)
  } catch {
    setTimeout(done, 1500)
  }
}
export function hush() {
  speakTok++
  clearTimers()
  setReading('', -1)
  if (ok) {
    try {
      speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }
}
