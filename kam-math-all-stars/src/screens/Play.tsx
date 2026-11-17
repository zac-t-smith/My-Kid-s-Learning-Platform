import { useEffect, useReducer, useRef } from 'react'
import { fill, pickFresh, storyFor, THEMES } from '../content/themes'
import { LEVELS, rungName, TOP } from '../content/levels'
import { mastered } from '../db/derive'
import { addAttempt, getState, S, update } from '../db/store'
import { eqHTML, lhs, plainEq, Q, speechFor, subline } from '../engine/format'
import { makeProblem } from '../engine/generate'
import type { Problem } from '../engine/types'
import { fmtN } from '../engine/util'
import { sfx } from '../lib/sfx'
import { hush, speak } from '../lib/speech'
import { confetti } from '../components/confetti'
import WaysSheet from '../components/WaysSheet'

export interface RoundConfig {
  mode: 'round' | 'climb'
  L: number
}
export type RoundResult =
  | { mode: 'round'; L: number; wins: number; n: number; levelUp?: number }
  | { mode: 'climb'; best: number; newBest: boolean; climbBest: number }

type Res = 'win' | 'ok' | 'miss'
interface Round {
  mode: 'round' | 'climb'
  L: number
  i: number
  n: number
  res: Res[]
  streak: number
  // climb
  rung: number
  best: number
  lives: number
  up: number
  climbed: boolean
  levelUp?: number
  // current problem
  p: Problem
  tries: number
  helped: boolean
  locked: boolean
  entry: string
  t0: number
  tok: number | null
  agreeStage: boolean
  // what is on screen
  eq: string
  sub: string
  feedback: string
  ansCls: '' | 'good' | 'bad shake'
  agreeShake: boolean
  showNext: boolean
  sheet: null | { reveal: boolean }
  bounce: number
}

/** Automated tests set this so they can answer problems; it is never set for a real player. */
const e2e = typeof window !== 'undefined' && !!(window as unknown as { __E2E__?: boolean }).__E2E__
const TH = () => THEMES[S().theme] || THEMES.baseball
const say = (t: string) => fill(t, S().name, TH())

export default function Play({ config, paused, onLesson, onQuit, onEnd }: { config: RoundConfig; paused: boolean; onLesson: (L: number) => void; onQuit: () => void; onEnd: (r: RoundResult) => void }) {
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  const ref = useRef<Round | null>(null)
  const alive = useRef(true)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  /** setTimeout that does nothing once the round is gone. */
  const later = (fn: () => void, ms: number) => setTimeout(() => alive.current && fn(), ms)

  function roundAcc(R: Round) {
    return R.res.length ? R.res.filter((x) => x === 'win').length / R.res.length : 0
  }

  function nextProblem(quiet?: boolean) {
    const R = ref.current!
    let bonus = false
    let p: Problem
    if (R.mode === 'climb') {
      const L = R.rung <= TOP ? R.rung : TOP + 1
      R.L = L
      p = makeProblem(L, R.rung)
    } else {
      if (R.i >= R.n) return endRound()
      if ((R.i === 4 || R.i === 8) && R.L < TOP && roundAcc(R) >= 0.6) bonus = true
      p = makeProblem(bonus ? R.L + 1 : R.L)
    }
    p.bonus = bonus
    if (p.fmt === 'story') p.story = storyFor(p, S().name, TH())
    Object.assign(R, {
      p, tries: 0, helped: false, locked: false, entry: '', t0: Date.now(), tok: null, agreeStage: p.fmt === 'agree',
      eq: eqHTML(p), sub: subline(p), feedback: '', ansCls: '', showNext: false, sheet: null,
    } satisfies Partial<Round>)
    rerender()
    if (quiet) return
    const ar = S().autoRead
    if (ar === 'all' || (ar === 'words' && p.fmt !== 'solve')) later(() => ref.current === R && R.p === p && !R.locked && speak(speechFor(p)), 350)
    else if (bonus) speak('Bonus challenge! This one is from the next level.')
  }

  // Start the round once.
  useEffect(() => {
    alive.current = true
    hush()
    const base = { i: 0, n: 10, res: [], streak: 0, lives: 3, up: 0, climbed: false, bounce: 0, agreeShake: false } as Partial<Round>
    if (config.mode === 'climb') {
      const start = Math.max(0, Math.min(S().unlocked, TOP) - 1)
      ref.current = { ...base, mode: 'climb', L: start, rung: start, best: start } as Round
      speak(`The Climb! Two right in a row moves you up. You have 3 lives. Let's go, ${S().name}!`)
      nextProblem(true)
    } else {
      ref.current = { ...base, mode: 'round', L: config.L, rung: 0, best: 0 } as Round
      nextProblem()
    }
    return () => {
      alive.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function record(ok: boolean) {
    const R = ref.current!
    const p = R.p,
      L = p.L
    const first = ok && R.tries === 0 && !R.helped
    addAttempt({ L, mode: R.mode, fmt: p.fmt, q: plainEq(p), target: p.target, ok, first, tries: R.tries + (ok ? 1 : 0), helped: R.helped, ms: Date.now() - R.t0 })
    R.res.push(first ? 'win' : ok ? 'ok' : 'miss')
    R.streak = first ? R.streak + 1 : 0
    if (L === S().unlocked && L < TOP && mastered(getState().derived.recent[L])) {
      update({ unlocked: L + 1 })
      if (R.mode === 'round') R.levelUp = L + 1
    }
    if (R.mode === 'climb') {
      if (first) {
        R.up++
        if (R.up >= 2) {
          R.rung++
          R.up = 0
          R.climbed = true
          R.best = Math.max(R.best, R.rung)
        }
      } else {
        R.up = 0
        if (!ok) R.lives--
      }
    }
  }

  function celebrate() {
    const R = ref.current!
    sfx.good()
    confetti(TH().win)
    R.bounce++
    const t = TH()
    let line: string
    if (R.tries > 0 || R.helped) line = say(pickFresh(t.fixed))
    else if (R.streak === 3) line = say(t.streak[0])
    else if (R.streak === 5) line = say(t.streak[1])
    else if (R.streak === 8) line = say(t.streak[2])
    else line = say(pickFresh(t.praise))
    if (R.p.bonus && R.tries === 0) line += ' And that was a next level problem!'
    if (R.climbed) {
      R.climbed = false
      later(() => sfx.up(), 250)
      line += ` Climb up! Rung ${R.rung + 1}: ${rungName(R.rung)}!`
    }
    R.feedback = line
    R.showNext = true
    const tok = (R.tok = Math.random())
    rerender()
    speak(line, { onend: () => later(() => ref.current === R && R.tok === tok && !R.sheet && !pausedRef.current && goNext(), 650) })
  }

  function wrong(visual: () => void) {
    const R = ref.current!
    R.tries++
    sfx.bad()
    visual()
    if (R.tries === 1) {
      R.feedback = say(pickFresh(TH().retry))
      speak(R.feedback)
    } else {
      R.locked = true
      record(false)
      let t = say(pickFresh(TH().miss))
      if (R.mode === 'climb') t += R.lives > 0 ? ` You have ${R.lives} ${R.lives === 1 ? 'life' : 'lives'} left.` : ' That was your last life.'
      R.feedback = R.mode === 'climb' && R.lives <= 0 ? 'Last life! Let’s see how it works 👇' : 'Let’s look at it together 👇'
      R.showNext = true
      speak(t)
      const p = R.p
      later(() => {
        if (ref.current === R && R.p === p) {
          R.sheet = { reveal: true }
          rerender()
        }
      }, 700)
    }
    rerender()
  }

  function submit(v: number) {
    const R = ref.current!
    if (v === R.p.target) {
      R.locked = true
      R.ansCls = 'good'
      R.eq = R.eq.replace(Q, `<span class="blank filled">${fmtN(v)}</span>`)
      record(true)
      celebrate()
    } else {
      const p = R.p
      wrong(() => {
        R.ansCls = 'bad shake'
        later(() => {
          if (ref.current === R && R.p === p && !R.locked) {
            R.entry = ''
            R.ansCls = ''
            rerender()
          }
        }, 900)
      })
    }
  }

  function key(k: string) {
    const R = ref.current
    if (!R || R.locked || R.agreeStage) return
    sfx.tap()
    if (k === 'del') R.entry = R.entry.slice(0, -1)
    else if (k === 'go') {
      if (R.entry !== '') submit(+R.entry)
      return
    } else if (R.entry.length < 8) R.entry = (R.entry === '0' ? '' : R.entry) + k
    R.ansCls = ''
    rerender()
  }

  function agreeTap(yes: boolean) {
    const R = ref.current
    if (!R || R.locked || !R.agreeStage) return
    const p = R.p
    if (yes && p.isTrue) {
      R.locked = true
      record(true)
      celebrate()
    } else if (!yes && !p.isTrue) {
      R.agreeStage = false
      sfx.good()
      R.eq = `${lhs(p)} = <span class="strike">${fmtN(p.shown!)}</span> ${Q}`
      R.sub = 'So what is the real answer?'
      R.feedback = 'Good eye! 👀'
      speak(`Good eye, ${S().name}! That is not right. So what is the real answer?`)
      rerender()
    } else
      wrong(() => {
        R.agreeShake = true
        later(() => {
          R.agreeShake = false
          rerender()
        }, 500)
      })
  }

  function goNext() {
    const R = ref.current
    if (!R) return
    R.tok = null
    hush()
    R.sheet = null
    if (R.mode === 'climb' && R.lives <= 0) return endClimb()
    R.i++
    nextProblem()
  }

  function endRound() {
    const R = ref.current!
    hush()
    if (R.levelUp !== undefined) update({ current: R.levelUp })
    onEnd({ mode: 'round', L: R.L, wins: R.res.filter((x) => x === 'win').length, n: R.n, levelUp: R.levelUp })
  }
  function endClimb() {
    const R = ref.current!
    hush()
    const top = R.best + 1
    const newBest = top > (S().climbBest || 0)
    if (newBest) update({ climbBest: top })
    onEnd({ mode: 'climb', best: R.best, newBest, climbBest: Math.max(top, S().climbBest || 0) })
  }
  function quit() {
    const R = ref.current
    hush()
    if (R && R.mode === 'climb' && R.i > 0) {
      R.lives = 0
      return endClimb()
    }
    onQuit()
  }

  // Keyboard support (handy with an iPad keyboard case).
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyRef.current = (e) => {
    const R = ref.current
    if (!R || R.sheet || pausedRef.current) return
    if (/^[0-9]$/.test(e.key)) key(e.key)
    else if (e.key === 'Backspace') key('del')
    else if (e.key === 'Enter') {
      if (R.locked && R.showNext) goNext()
      else key('go')
    }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e)
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  const R = ref.current
  if (!R || !R.p) return <div className="screen" />
  const p = R.p
  const th = TH()
  const eqLen = R.eq.replace(/<[^>]+>/g, '').length
  const eqSize = eqLen > 23 ? 22 : eqLen > 17 ? 28 : eqLen > 13 ? 34 : eqLen > 9 ? 42 : undefined

  return (
    <div className="screen" data-testid="play" {...(e2e ? { 'data-target': p.target, 'data-agree': p.fmt === 'agree' ? String(p.isTrue) : '' } : {})}>
      <div className="top">
        <button className="iconbtn" aria-label="Quit" onClick={quit}>
          ✕
        </button>
        <div className="roundinfo">
          <div className="lvlname">{R.mode === 'climb' ? `🧗 Rung ${R.rung + 1} · ${rungName(R.rung)}` : `${th.round} · ${LEVELS[R.L].icon} ${LEVELS[R.L].name}`}</div>
          <div className="slots">
            {R.mode === 'climb' ? (
              <div className="lives" aria-label={`${Math.max(R.lives, 0)} lives left`}>
                {'❤️'.repeat(Math.max(R.lives, 0))}
                {'🤍'.repeat(3 - Math.max(R.lives, 0))} · {'▲'.repeat(R.up)}
                {'△'.repeat(2 - R.up)}
              </div>
            ) : (
              Array.from({ length: R.n }, (_, i) => {
                const r = R.res[i]
                return (
                  <span key={i} className={i === R.i && !r ? 'now' : ''}>
                    {r === 'win' ? th.win : r === 'ok' ? '✓' : r === 'miss' ? '·' : ''}
                  </span>
                )
              })
            )}
          </div>
        </div>
        <div key={R.bounce} className={'mascot' + (R.bounce ? ' bounce' : '')}>
          {th.icon}
        </div>
      </div>

      <div className="card prob">
        {p.bonus && <div className="badge">⭐ Bonus challenge!</div>}
        {p.fmt === 'story' ? (
          <div className="story" data-testid="story">
            {p.story}
          </div>
        ) : (
          <div className="eq" data-testid="eq" style={{ fontSize: eqSize }} dangerouslySetInnerHTML={{ __html: R.eq }} />
        )}
        <div className="subq">{R.sub}</div>
        {R.agreeStage ? (
          <div className={'agree' + (R.agreeShake ? ' shake' : '')}>
            <button className="y" onClick={() => agreeTap(true)}>
              👍 Agree
            </button>
            <button className="n" onClick={() => agreeTap(false)}>
              👎 Disagree
            </button>
          </div>
        ) : (
          <div className="ansrow">
            <div className={'ansbox ' + R.ansCls} data-testid="answer" aria-live="polite">
              {R.entry ? fmtN(+R.entry) : ''}
            </div>
          </div>
        )}
        <div className="tools">
          <button onClick={() => speak(speechFor(p))}>🔊 Read it</button>
          <button
            onClick={() => {
              if (!R.locked) R.helped = true
              R.sheet = { reveal: false }
              rerender()
            }}
          >
            💡 Ways to solve
          </button>
        </div>
      </div>

      <div className="feedback" data-testid="feedback" aria-live="polite">
        {R.feedback}
      </div>

      {!R.agreeStage && !R.showNext && (
        <div className="pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => key(String(n))}>
              {n}
            </button>
          ))}
          <button className="del" aria-label="Delete" onClick={() => key('del')}>
            ⌫
          </button>
          <button onClick={() => key('0')}>0</button>
          <button className="go" aria-label="Check" onClick={() => key('go')}>
            ✔
          </button>
        </div>
      )}
      {R.showNext && (
        <button className="btn" onClick={goNext}>
          Next ▶
        </button>
      )}

      {R.sheet && (
        <WaysSheet
          p={p}
          reveal={R.sheet.reveal}
          onClose={() => {
            R.sheet = null
            hush()
            rerender()
          }}
          onLesson={
            p.L <= TOP
              ? () => {
                  R.sheet = null
                  R.tok = null
                  hush()
                  rerender()
                  onLesson(p.L)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
