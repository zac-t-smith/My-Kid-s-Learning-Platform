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
/** A burst of filtered noise: bat cracks, crowd swells, pitch whooshes. */
function noise(dur: number, when: number, freq: number, vol: number, shape: 'hit' | 'swell') {
  const c = unlockAudio()
  if (!c || !S().sfx) return
  try {
    const len = Math.floor(c.sampleRate * dur)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = shape === 'hit' ? 1.2 : 0.6
    const g = c.createGain()
    const t = c.currentTime + when
    if (shape === 'hit') {
      g.gain.setValueAtTime(vol, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    } else {
      g.gain.setValueAtTime(0.001, t)
      g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    }
    src.connect(f)
    f.connect(g)
    g.connect(c.destination)
    src.start(t)
    src.stop(t + dur + 0.05)
  } catch {
    /* ignore */
  }
}
export const sfx = {
  /** Bat meets ball. */
  crack() {
    noise(0.09, 0, 1800, 0.5, 'hit')
    tone(180, 0.08, 0, 'square', 0.12)
  },
  /** The crowd roars; bigger hits roar longer. */
  crowd(size = 1) {
    noise(0.9 + size * 0.45, 0.08, 900, 0.1 + size * 0.03, 'swell')
  },
  /** A short original ballpark-organ riff. */
  organ() {
    ;[392, 494, 587, 494, 587, 784].forEach((f, i) => tone(f, 0.16, i * 0.13, 'square', 0.05))
  },
  whoosh() {
    noise(0.25, 0, 500, 0.12, 'swell')
  },
  /** Glove pop: a called strike or an out. */
  pop() {
    noise(0.06, 0, 700, 0.35, 'hit')
  },
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
