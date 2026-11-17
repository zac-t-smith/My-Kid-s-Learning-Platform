import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { speakable, strategies } from '../engine/strategies'
import type { Problem } from '../engine/types'
import { fmtN } from '../engine/util'
import { numberLineSVG } from '../engine/visuals'
import { speak } from '../lib/speech'

/** "Ways to solve": every strategy for this problem, with its picture and a Hear-it button. */
export default function WaysSheet({ p, reveal, onClose, onLesson }: { p: Problem; reveal: boolean; onClose: () => void; onLesson?: () => void }) {
  const list = useMemo(() => strategies(p), [p])
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()
  const s = list[i]
  const hear = (k = i) => speak(speakable(list[k].name + '. ' + list[k].steps.join('. ')))

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
        {reveal && <div className="reveal">The answer is {fmtN(p.target)}</div>}
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
              <li key={k} style={{ animationDelay: `${k * 0.35}s` }}>
                {t}
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
