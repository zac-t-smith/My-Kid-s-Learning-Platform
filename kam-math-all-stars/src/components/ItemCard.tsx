import { useEffect, useRef, useState } from 'react'
import { fill, THEMES } from '../content/themes'
import { S } from '../db/store'
import { Q } from '../engine/format'
import { fmtN } from '../engine/util'
import { isCorrect } from '../skills/check'
import type { Item } from '../skills/types'
import { SKILL } from '../skills/manifest'
import { sfx } from '../lib/sfx'
import { firstSentence, speak } from '../lib/speech'
import ReadAlong from './ReadAlong'
import NumPad from './NumPad'

export interface SwingResult {
  ok: boolean
  /** Wrong answers before it was settled (0 = first swing). */
  tries: number
  helped: boolean
  ms: number
}
/** Automated tests set this so they can answer problems; it is never set for a real player. */
const e2e = typeof window !== 'undefined' && !!(window as unknown as { __E2E__?: boolean }).__E2E__

export const itemText = (it: Item) => fill(it.prompt, S().name, THEMES[S().theme] || THEMES.baseball)
/** The answer the way a kid would read it. */
export const answerText = (it: Item) => (typeof it.answer === 'number' ? fmtN(it.answer) : it.answer) + (it.unit ? ` ${it.unit}` : '')

/**
 * One problem, any kind: type a number, a decimal or a fraction, tap a choice, or agree/disagree.
 * A first miss is a strike (he swings again). A second miss ends it. Two-choice questions get one swing.
 */
export default function ItemCard({ item, swings = 2, goLabel = 'Check', badge, onStrike, onDone, onWays }: { item: Item; swings?: number; goLabel?: string; badge?: string; onStrike: () => void; onDone: (r: SwingResult) => void; onWays?: () => void }) {
  const [entry, setEntry] = useState('')
  const [agreeStage, setAgreeStage] = useState(!!item.agree)
  const [eq, setEq] = useState(item.eq || '')
  const [sub, setSub] = useState(item.sub || '')
  const [cls, setCls] = useState('')
  const [locked, setLocked] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const s = useRef({ tries: 0, helped: false, t0: Date.now(), done: false })
  const text = itemText(item)
  const showPrompt = !item.eqOnly
  const maxSwings = item.input === 'choice' && (item.choices?.length ?? 0) <= 2 ? 1 : swings

  const read = (asked: boolean) => {
    const lvl = asked ? 1 : S().readLevel || 1
    if (lvl === 3) return
    speak(lvl === 2 ? firstSentence(text) : text, showPrompt ? { id: 'problem' } : {})
  }
  useEffect(() => {
    const ar = S().autoRead
    // a bare equation like "54 − 20 = ?" is only read aloud if the parent chose "every problem"
    const plainSolve = !!item.eqOnly && !item.agree && (item.eq || '').trim().endsWith(Q)
    if (!(ar === 'all' || (ar === 'words' && !plainSolve))) return
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
    if (s.current.tries >= maxSwings) return finish(false)
    sfx.pop()
    onStrike()
  }
  const complete = (e: string) => (item.input === 'fraction' ? /^\d+\/\d+$/.test(e) : item.input === 'decimal' ? /^-?\d*\.?\d+$/.test(e) : /^-?\d+$/.test(e))
  const submit = () => {
    if (locked || !complete(entry)) return
    if (isCorrect(item, entry)) {
      setCls('good')
      setEq((e) => e.replace(Q, `<span class="blank filled">${show(entry)}</span>`))
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
    if (locked || !item.agree) return
    if (yes && item.agree.isTrue) finish(true)
    else if (!yes && !item.agree.isTrue) {
      sfx.good()
      setAgreeStage(false)
      setEq((e) => e.replace(/= ([\d,]+)$/, `= <span class="strike">$1</span> ${Q}`))
      setSub('Good eye! So what is the real answer?')
      speak(`Good eye, ${S().name}! That is not right. So what is the real answer?`)
    } else {
      setCls('shake')
      setTimeout(() => setCls(''), 500)
      miss()
    }
  }
  const pick = (c: string) => {
    if (locked || picked.includes(c)) return
    if (isCorrect(item, c)) {
      setPicked((p) => [...p, c])
      finish(true)
    } else {
      setPicked((p) => [...p, c])
      miss()
    }
  }
  const show = (e: string) => (item.input === 'number' && /^-?\d+$/.test(e) ? fmtN(+e) : e)
  const onKey = (k: string) => {
    sfx.tap()
    setCls('')
    if (k === 'go') return submit()
    setEntry((e) => {
      if (k === 'del') return e.slice(0, -1)
      if (k === '-') return item.signed ? (e.startsWith('-') ? e.slice(1) : '-' + e) : e
      if (k === '.') return item.input === 'decimal' && !e.includes('.') ? (e === '' || e === '-' ? e + '0.' : e + '.') : e
      if (k === '/') return item.input === 'fraction' && e !== '' && !e.includes('/') ? e + '/' : e
      if (e.replace(/\D/g, '').length >= 9) return e
      return (e === '0' ? '' : e === '-0' ? '-' : e) + k
    })
  }
  const eqLen = eq.replace(/<[^>]+>/g, '').length
  const eqSize = eqLen > 23 ? 22 : eqLen > 17 ? 28 : eqLen > 13 ? 34 : eqLen > 9 ? 42 : undefined
  const extra = item.input === 'decimal' ? { key: '.', label: '. point', aria: 'Decimal point' } : item.input === 'fraction' ? { key: '/', label: '⁄ fraction bar', aria: 'Fraction bar' } : item.signed ? { key: '-', label: '+/− below zero', aria: 'Plus or minus' } : undefined

  return (
    <div className="col item" data-testid="item" {...(e2e ? { 'data-answer': String(item.answer), 'data-input': item.input, 'data-agree': item.agree ? String(item.agree.isTrue) : '', 'data-skill-name': SKILL[item.skill || '']?.name || '' } : {})}>
      <div className="card prob">
        {badge && <div className="badge">{badge}</div>}
        {showPrompt && <ReadAlong id="problem" text={text} className="story" testId="story" />}
        {item.visual && <div className="extra visual" dangerouslySetInnerHTML={{ __html: item.visual }} />}
        {eq && <div className={'eq' + (showPrompt ? ' eq-sm' : '')} data-testid="eq" style={{ fontSize: showPrompt ? undefined : eqSize }} dangerouslySetInnerHTML={{ __html: eq }} />}
        {sub && <div className="subq">{sub}</div>}
        {agreeStage ? (
          <div className={'agree ' + cls}>
            <button className="y" onClick={() => agree(true)}>
              👍 Agree
            </button>
            <button className="n" onClick={() => agree(false)}>
              👎 Disagree
            </button>
          </div>
        ) : item.input === 'choice' ? (
          <div className="choices">
            {item.choices!.map((c) => (
              <button key={c} data-choice={c} className={picked.includes(c) ? (isCorrect(item, c) ? 'right' : 'picked') : locked ? (isCorrect(item, c) && s.current.tries >= maxSwings ? 'right' : 'dim') : ''} onClick={() => pick(c)}>
                {c}
              </button>
            ))}
          </div>
        ) : (
          <div className="ansrow">
            <div className={'ansbox ' + cls} data-testid="answer" aria-live="polite">
              {show(entry)}
            </div>
            {item.unit && <div className="unit">{item.unit}</div>}
          </div>
        )}
        <div className="tools">
          <button onClick={() => read(true)}>🔊 Read it</button>
          {onWays && (
            <button
              onClick={() => {
                if (!locked) s.current.helped = true
                onWays()
              }}
            >
              💡 Ways to solve
            </button>
          )}
        </div>
      </div>
      {!agreeStage && !locked && item.input !== 'choice' && <NumPad onKey={onKey} goLabel={goLabel} extra={extra} />}
    </div>
  )
}
