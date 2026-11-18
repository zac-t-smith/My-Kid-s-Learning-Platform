import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import ReadAlong from './ReadAlong'
import type { Strat } from '../skills/types'
import { numberLineSVG } from '../engine/visuals'
import { speak, tokenize, type Tok } from '../lib/speech'

/** "Ways to solve": every strategy for this problem, with its picture and a Hear-it button. */
export default function WaysSheet({ strategies: list, answer, reveal, onClose, onLesson }: { strategies: Strat[]; answer: string; reveal: boolean; onClose: () => void; onLesson?: () => void }) {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()
  const s = list[i]
  // Words for the strategy name and each step, so the voice and the highlight stay together.
  const blocks = useMemo(
    () =>
      list.map((st) =>
        [st.name, ...st.steps].map((line) => {
          const toks: Tok[] = tokenize(line)
          const last = toks[toks.length - 1]
          if (last && !/[.!?:]$/.test(last.say)) toks[toks.length - 1] = { ...last, say: last.say + '.' }
          return toks
        }),
      ),
    [list],
  )
  const offsets = (k: number) => blocks[k].map((_, n) => blocks[k].slice(0, n).reduce((a, b) => a + b.length, 0))
  const hear = (k = i) => speak(blocks[k].flat(), { id: 'ways' })

  // After a miss the answer is shown and the first strategy is read aloud.
  useEffect(() => {
    if (!reveal) return
    const t = setTimeout(() => hear(0), 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  return (
    <div className="sheet" data-testid="sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="sheet-in" initial={{ y: reduce ? 0 : 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="sheet-top">
          <b>💡 Ways to solve</b>
          <button aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {reveal && <div className="reveal">The answer is {answer}</div>}
        <div className="chips">
          {list.map((st, k) => (
            <button
              key={st.name}
              className={'chip' + (k === i ? ' sel' : '')}
              onClick={() => {
                setI(k)
                hear(k)
              }}
            >
              {st.name}
            </button>
          ))}
        </div>
        <div key={i}>
          {s.line && <div dangerouslySetInnerHTML={{ __html: numberLineSVG(s.line) }} />}
          {s.html && <div className="extra" dangerouslySetInnerHTML={{ __html: s.html }} />}
          <ul className="steps">
            {s.steps.map((t, k) => (
              <li key={k} style={{ animationDelay: `${k * 0.35}s` }} aria-label={t}>
                <ReadAlong id="ways" tokens={blocks[i][k + 1]} offset={offsets(i)[k + 1]} />
              </li>
            ))}
          </ul>
        </div>
        <div className="sheet-btns">
          <button onClick={() => hear()}>🔊 Hear it</button>
          {onLesson && <button onClick={onLesson}>📺 Lesson</button>}
        </div>
      </motion.div>
    </div>
  )
}
