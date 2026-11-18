import { useEffect, useRef, useState } from 'react'
import { S } from '../db/store'
import { sym } from '../engine/util'
import { sfx } from '../lib/sfx'
import { firstSentence, speak } from '../lib/speech'
import ReadAlong from '../components/ReadAlong'
import NumPad from '../components/NumPad'
import { checkPitch, pitchHint, type FieldChallenge, type PitchChallenge } from './challenges'

export interface DefenseResult {
  ok: boolean
  tries: number
  ms: number
  /** What to tell him about the play (the math behind it). */
  explain: string
}
const e2e = typeof window !== 'undefined' && !!(window as unknown as { __E2E__?: boolean }).__E2E__

function useAutoRead(prompt: string, delay: number) {
  useEffect(() => {
    const lvl = S().readLevel || 1
    if (lvl === 3) return
    const t = setTimeout(() => speak(lvl === 2 ? firstSentence(prompt) : prompt, { id: 'prompt' }), delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt])
}

/** Pitching: build a problem whose answer lands in the strike zone. One "ball" is allowed. */
export function Pitching({ c, delay = 700, onBall, onDone }: { c: PitchChallenge; delay?: number; onBall: (hint: string) => void; onDone: (r: DefenseResult) => void }) {
  const [nums, setNums] = useState(['', ''])
  const [slot, setSlot] = useState(0)
  const [locked, setLocked] = useState(false)
  const s = useRef({ tries: 0, t0: Date.now() })
  const text = `${c.prompt}${c.rule ? ' ' + c.rule : ''}`
  useAutoRead(text, delay)

  const pitch = () => {
    if (locked || nums[0] === '' || nums[1] === '') return
    const a = +nums[0],
      b = +nums[1]
    const r = checkPitch(c, a, b)
    const eq = `${a} ${sym(c.op)} ${b} = ${r.value}.`
    if (r.ok) {
      setLocked(true)
      return onDone({ ok: true, tries: s.current.tries, ms: Date.now() - s.current.t0, explain: `${eq} Right in the zone!` })
    }
    s.current.tries++
    const hint = pitchHint(c, a, b, r)
    if (s.current.tries >= 2) {
      setLocked(true)
      return onDone({ ok: false, tries: 2, ms: Date.now() - s.current.t0, explain: `${hint} One that works: ${c.example[0]} ${sym(c.op)} ${c.example[1]} = ${checkPitch(c, ...c.example).value}.` })
    }
    sfx.pop()
    onBall(hint)
  }
  return (
    <div className="col" data-testid="pitching" {...(e2e ? { 'data-a': c.example[0], 'data-b': c.example[1] } : {})}>
      <div className="card prob">
        <div className="lbl">You are pitching</div>
        <ReadAlong id="prompt" text={text} className="story" />
        <div className="zone">
          Strike zone: <b>{c.lo}</b> to <b>{c.hi}</b>
        </div>
        <div className="build">
          {[0, 1].map((i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i === 1 && <span className="bop">{sym(c.op)}</span>}
              <button className={'slot' + (slot === i && !locked ? ' on' : '')} aria-label={i ? 'Second number' : 'First number'} onClick={() => setSlot(i)}>
                {nums[i]}
              </button>
            </span>
          ))}
        </div>
        <div className="tools">
          <button onClick={() => speak(text, { id: 'prompt' })}>🔊 Read it</button>
        </div>
      </div>
      {!locked && (
        <NumPad
          goLabel="Pitch"
          goIcon="⚾"
          onKey={(k) => {
            sfx.tap()
            if (k === 'go') {
              if (nums[slot] !== '' && nums[1 - slot] === '') return setSlot(1 - slot)
              return pitch()
            }
            setNums((n) => {
              const m = [...n]
              m[slot] = k === 'del' ? m[slot].slice(0, -1) : m[slot].length < 3 ? (m[slot] === '0' ? '' : m[slot]) + k : m[slot]
              return m
            })
          }}
        />
      )}
    </div>
  )
}

/** Fielding: one quick decision with big answer buttons. */
export function Fielding({ c, delay = 700, onDone }: { c: FieldChallenge; delay?: number; onDone: (r: DefenseResult) => void }) {
  const [picked, setPicked] = useState(-1)
  const t0 = useRef(Date.now())
  useAutoRead(c.prompt, delay)
  return (
    <div className="col" data-testid="fielding" {...(e2e ? { 'data-answer': c.answer } : {})}>
      <div className="card prob">
        <div className="lbl">You are fielding</div>
        <ReadAlong id="prompt" text={c.prompt} className="story" />
        <div className="choices">
          {c.choices.map((ch, i) => (
            <button
              key={ch}
              className={picked < 0 ? '' : i === c.answer ? 'right' : i === picked ? 'picked' : 'dim'}
              onClick={() => {
                if (picked >= 0) return
                setPicked(i)
                onDone({ ok: i === c.answer, tries: i === c.answer ? 0 : 1, ms: Date.now() - t0.current, explain: c.explain })
              }}
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="tools">
          <button onClick={() => speak(c.prompt, { id: 'prompt' })}>🔊 Read it</button>
        </div>
      </div>
    </div>
  )
}
