import { S } from '../db/store'

/* Voice: Web Speech API (free, works offline). Ported from the prototype. */
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

let speakTok = 0
/** Say something. `onend` fires once, even if the browser never reports the end. */
export function speak(text: string, opts: { onend?: () => void } = {}) {
  const tok = ++speakTok
  const done = () => {
    if (tok !== speakTok) return
    speakTok++
    opts.onend?.()
  }
  if (!ok) {
    if (opts.onend) setTimeout(done, Math.max(1400, text.split(' ').length * 380))
    return
  }
  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
  const u = new SpeechSynthesisUtterance(text)
  const v = chooseVoice()
  if (v) u.voice = v
  u.rate = S().rate
  u.pitch = 1.1
  u.onend = done
  u.onerror = () => {
    if (tok === speakTok) setTimeout(done, 300)
  }
  setTimeout(done, 2500 + text.length * 95)
  try {
    speechSynthesis.speak(u)
  } catch {
    setTimeout(done, 1500)
  }
}
export function hush() {
  speakTok++
  if (ok) {
    try {
      speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }
}
