import { S } from '../db/store'

/* Sound effects made with the Web Audio API (no audio files, nothing to license). */
type AC = AudioContext
let ctx: AC | null = null
/** Call from a tap so iOS lets us play sound. */
export function unlockAudio(): AC | null {
  if (!ctx) {
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new C()
    } catch {
      /* no audio */
    }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}
function tone(f: number, dur: number, when = 0, type: OscillatorType = 'sine', vol = 0.14) {
  const c = unlockAudio()
  if (!c || !S().sfx) return
  try {
    const o = c.createOscillator(),
      g = c.createGain()
    o.type = type
    o.frequency.value = f
    const t = c.currentTime + when
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g)
    g.connect(c.destination)
    o.start(t)
    o.stop(t + dur + 0.05)
  } catch {
    /* ignore */
  }
}
export const sfx = {
  good() {
    tone(660, 0.14)
    tone(990, 0.3, 0.1)
  },
  bad() {
    tone(240, 0.22, 0, 'triangle', 0.1)
    tone(200, 0.25, 0.12, 'triangle', 0.1)
  },
  up() {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, i * 0.11))
  },
  tap() {
    tone(500, 0.04, 0, 'sine', 0.04)
  },
}
