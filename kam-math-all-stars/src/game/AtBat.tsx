import { useEffect, useRef, useState } from 'react'
import { S } from '../db/store'
import { eqHTML, lhs, Q, speechFor, subline } from '../engine/format'
import type { Problem } from '../engine/types'
import { fmtN } from '../engine/util'
import { sfx } from '../lib/sfx'
import { firstSentence, speak } from '../lib/speech'
import ReadAlong from '../components/ReadAlong'
import NumPad from '../components/NumPad'

export interface SwingResult {
  ok: boolean
  /** Wrong answers before it was settled (0 = first swing). */
  tries: number
  helped: boolean
  ms: number
}
/** Automated tests set this so they can answer problems; it is never set for a real player. */
const e2e = typeof window !== 'undefined' && !!(window as unknown as { __E2E__?: boolean }).__E2E__

/**
 * One at-bat: a problem, up to two swings.
 * A first miss is a strike (he swings again). A second miss is a strikeout.
 */
export default function AtBat({ p, onStrike, onDone, onWays }: { p: Problem; onStrike: () => void; onDone: (r: SwingResult) => void; onWays: () => void }) {
  const [entry, setEntry] = useState('')
  const [agreeStage, setAgreeStage] = useState(p.fmt === 'agree')
  const [eq, setEq] = useState(() => eqHTML(p))
  const [sub, setSub] = useState(() => subline(p))
  const [cls, setCls] = useState('')
  const [locked, setLocked] = useState(false)
  const s = useRef({ tries: 0, helped: false, t0: Date.now(), done: false })

  const read = (asked: boolean) => {
    const lvl = asked ? 1 : S().readLevel || 1
    if (lvl === 3) return
    const text = speechFor(p)
    speak(lvl === 2 ? firstSentence(text) : text, p.fmt === 'story' ? { id: 'problem' } : {})
  }
  useEffect(() => {
    const ar = S().autoRead
    if (!(ar === 'all' || (ar === 'words' && p.fmt !== 'solve'))) return
    const t = setTimeout(() => !s.current.done && read(false), 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = (ok: boolean) => {
    if (s.current.done) return
    s.current.done = true
    setLocked(true)
    onDone({ ok, tries: s.current.tries, helped: s.current.helped, ms: Date.now() - s.current.t0 })
  }
  const miss = () => {
    s.current.tries++
    if (s.current.tries >= 2) return finish(false)
    sfx.pop()
    onStrike()
  }
  const submit = () => {
    if (locked || entry === '') return
    if (+entry === p.target) {
      setCls('good')
      setEq((e) => e.replace(Q, `<span class="blank filled">${fmtN(p.target)}</span>`))
      finish(true)
    } else {
      setCls('bad shake')
      miss()
      setTimeout(() => {
        if (s.current.done) return
        setEntry('')
        setCls('')
      }, 900)
    }
  }
  const agree = (yes: boolean) => {
    if (locked) return
    if (yes && p.isTrue) finish(true)
    else if (!yes && !p.isTrue) {
      sfx.good()
      setAgreeStage(false)
      setEq(`${lhs(p)} = <span class="strike">${fmtN(p.shown!)}</span> ${Q}`)
      setSub('Good eye! So what is the real answer?')
      speak(`Good eye, ${S().name}! That is not right. So what is the real answer?`)
    } else {
      setCls('shake')
      setTimeout(() => setCls(''), 500)
      miss()
    }
  }
  const eqLen = eq.replace(/<[^>]+>/g, '').length
  const eqSize = eqLen > 23 ? 22 : eqLen > 17 ? 28 : eqLen > 13 ? 34 : eqLen > 9 ? 42 : undefined

  return (
    <div className="col" data-testid="atbat" {...(e2e ? { 'data-target': p.target, 'data-agree': p.fmt === 'agree' ? String(p.isTrue) : '' } : {})}>
      <div className="card prob">
        {p.fmt === 'story' ? <ReadAlong id="problem" text={p.story} className="story" /> : <div className="eq" style={{ fontSize: eqSize }} dangerouslySetInnerHTML={{ __html: eq }} />}
        <div className="subq">{sub}</div>
        {agreeStage ? (
          <div className={'agree ' + cls}>
            <button className="y" onClick={() => agree(true)}>
              👍 Agree
            </button>
            <button className="n" onClick={() => agree(false)}>
              👎 Disagree
            </button>
          </div>
        ) : (
          <div className="ansrow">
            <div className={'ansbox ' + cls} aria-live="polite">
              {entry ? fmtN(+entry) : ''}
            </div>
          </div>
        )}
        <div className="tools">
          <button onClick={() => read(true)}>🔊 Read it</button>
          <button
            onClick={() => {
              if (!locked) s.current.helped = true
              onWays()
            }}
          >
            💡 Ways to solve
          </button>
        </div>
      </div>
      {!agreeStage && !locked && (
        <NumPad
          onKey={(k) => {
            sfx.tap()
            setCls('')
            if (k === 'del') setEntry((e) => e.slice(0, -1))
            else if (k === 'go') submit()
            else setEntry((e) => (e.length < 8 ? (e === '0' ? '' : e) + k : e))
          }}
          goLabel="Swing"
        />
      )}
    </div>
  )
}
