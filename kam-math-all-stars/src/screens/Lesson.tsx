import { useEffect, useRef, useState } from 'react'
import { LESSONS, UNIT, type StageApi } from '../content/lessons'
import { LEVELS } from '../content/levels'
import { fill, THEMES } from '../content/themes'
import { S, update } from '../db/store'
import { hush, speak } from '../lib/speech'
import ReadAlong from '../components/ReadAlong'

/** The lesson stage: base-ten blocks that pop in, fly away, break apart and bundle. */
function makeStage(el: HTMLElement, later: (fn: () => void, ms: number) => void): StageApi {
  el.innerHTML = '<div class="eqline"></div><div class="blocks"><div class="hund"></div><div class="tens"></div><div class="ones"></div></div><div class="extra"></div>'
  const q = (s: string) => el.querySelector(s) as HTMLElement
  const box = (k: string) => q(k === 'h' ? '.hund' : k === 't' ? '.tens' : '.ones')
  const live = (k: string) => [...box(k).children].filter((c) => !c.classList.contains('gone') && !c.classList.contains('gather'))
  const api: StageApi = {
    eq: (h) => void (q('.eqline').innerHTML = h),
    clear: () => ['h', 't', 'o'].forEach((k) => (box(k).innerHTML = '')),
    set(h, t, o) {
      api.clear()
      api.add('h', h)
      api.add('t', t)
      api.add('o', o)
    },
    add(k, n, cls = '') {
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div')
        d.className = (k === 'h' ? 'flat' : k === 't' ? 'rod' : 'cube') + ' pop ' + cls
        d.style.animationDelay = i * 0.09 + 's'
        box(k).appendChild(d)
      }
    },
    remove(k, n, delay = 0) {
      live(k)
        .slice(-n)
        .forEach((c, i) =>
          later(() => {
            c.classList.add('gone')
            later(() => c.remove(), 600)
          }, delay + i * 170),
        )
    },
    breakTen() {
      const r = live('t').pop()
      if (!r) return
      r.classList.add('gone')
      later(() => {
        r.remove()
        api.add('o', 10, 'fromten')
      }, 500)
    },
    breakHundred() {
      const f = live('h').pop()
      if (!f) return
      f.classList.add('gone')
      later(() => {
        f.remove()
        api.add('t', 10, 'fromten')
      }, 500)
    },
    bundle() {
      const c = live('o').slice(0, 10)
      c.forEach((x) => x.classList.add('gather'))
      later(() => {
        c.forEach((x) => x.remove())
        api.add('t', 1, 'new')
      }, 600)
    },
    bundleTens() {
      const c = live('t').slice(0, 10)
      c.forEach((x) => x.classList.add('gather'))
      later(() => {
        c.forEach((x) => x.remove())
        api.add('h', 1, 'new')
      }, 600)
    },
    extra: (h) => void (q('.extra').innerHTML = h || ''),
    lightGroups() {
      ;[...el.querySelectorAll('.grp')].forEach((x, i) => later(() => x.classList.add('lit'), 700 + i * 900))
    },
  }
  return api
}

export default function Lesson({ L, onGo, onClose }: { L: number; onGo: () => void; onClose: () => void }) {
  const stageEl = useRef<HTMLDivElement>(null)
  const lp = useRef({ i: -1, run: 0, playing: true, done: false, gen: 0, st: null as StageApi | null })
  const [ui, setUi] = useState({ i: -1, playing: true, done: false, caption: '' })
  const scenes = LESSONS[L]
  const say = (t: string) => fill(t, S().name, THEMES[S().theme] || THEMES.baseball)
  const sync = (caption?: string) => setUi((u) => ({ i: lp.current.i, playing: lp.current.playing, done: lp.current.done, caption: caption ?? u.caption }))

  function narrate() {
    const s = lp.current
    const run = ++s.run
    speak(say(scenes[s.i].say), {
      id: 'caption',
      onend: () => {
        if (lp.current.run === run && s.playing) setTimeout(() => lp.current.run === run && s.playing && nextScene(), 900)
      },
    })
  }
  function nextScene() {
    const s = lp.current
    s.i++
    if (s.i >= scenes.length) {
      s.i = scenes.length - 1
      s.playing = false
      s.done = true
      s.run++
      sync()
      speak(`Your turn, ${S().name}! Let's play.`)
      return
    }
    const sc = scenes[s.i]
    if (sc.eq !== undefined) s.st!.eq(sc.eq)
    if (sc.extra) s.st!.extra(sc.extra())
    try {
      sc.do?.(s.st!)
    } catch {
      /* a visual hiccup should never stop the lesson */
    }
    sync(say(sc.say))
    if (s.playing) narrate()
  }
  function start() {
    hush()
    const gen = lp.current.gen + 1
    const later = (fn: () => void, ms: number) => setTimeout(() => lp.current.gen === gen && fn(), ms)
    lp.current = { i: -1, run: lp.current.run + 1, playing: true, done: false, gen, st: makeStage(stageEl.current!, later) }
    if (!S().seenLesson[L]) update({ seenLesson: { ...S().seenLesson, [L]: 1 } })
    nextScene()
  }
  useEffect(() => {
    start()
    return () => {
      lp.current.run++
      lp.current.gen++
      lp.current.playing = false
      hush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L])

  return (
    <div className="screen" data-testid="lesson">
      <div className="top">
        <button className="iconbtn" aria-label="Close lesson" onClick={onClose}>
          ✕
        </button>
        <h1>📺 {LEVELS[L].name}</h1>
        <div className="spacer" />
      </div>
      <div className="card stagecard">
        <div ref={stageEl} className="stage" style={{ ['--u' as string]: UNIT[L] || '14px' }} />
      </div>
      <div aria-live="polite">
        <ReadAlong id="caption" text={ui.caption} className="card caption" />
      </div>
      <div className="dots">
        {scenes.map((_, i) => (
          <i key={i} className={i <= ui.i ? 'on' : ''} />
        ))}
      </div>
      <div className="lctl">
        <button onClick={start}>⏮ Start over</button>
        <button
          onClick={() => {
            const s = lp.current
            if (s.playing) {
              s.playing = false
              s.run++
              hush()
              sync()
            } else if (s.done) start()
            else {
              s.playing = true
              sync()
              narrate()
            }
          }}
        >
          {ui.playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => {
            const s = lp.current
            hush()
            s.run++
            if (s.done) return
            s.playing = true
            nextScene()
          }}
        >
          ⏭ Next
        </button>
      </div>
      {ui.done && (
        <button className="btn" onClick={() => (hush(), onGo())}>
          Let's play! ▶
        </button>
      )}
    </div>
  )
}
