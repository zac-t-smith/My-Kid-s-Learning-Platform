import { useEffect, useMemo, useRef, useState } from 'react'
import { S, update } from '../db/store'
import { buildScenes } from '../skills/lesson'
import { SKILL } from '../skills/manifest'
import { hush, speak } from '../lib/speech'
import ReadAlong from '../components/ReadAlong'

/** Lesson for any skill in the graph (the original 18 levels keep their hand-made lessons). */
export default function SkillLesson({ skill, onGo, onClose }: { skill: string; onGo: () => void; onClose: () => void }) {
  const scenes = useMemo(() => buildScenes(skill, S().name), [skill])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [done, setDone] = useState(false)
  const run = useRef(0)
  const sc = scenes[i]

  useEffect(() => {
    if (!S().seenLesson[skill]) update({ seenLesson: { ...S().seenLesson, [skill]: 1 } })
    return () => {
      run.current++
      hush()
    }
  }, [skill])

  // Narrate the scene, then move on by itself while playing.
  useEffect(() => {
    if (!playing) return
    const my = ++run.current
    speak(sc.say, {
      id: 'caption',
      onend: () =>
        setTimeout(() => {
          if (run.current !== my) return
          if (i + 1 < scenes.length) setI(i + 1)
          else {
            setPlaying(false)
            setDone(true)
            speak(`Your turn, ${S().name}! Let's play.`)
          }
        }, 900),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing])

  const restart = () => {
    hush()
    run.current++
    setDone(false)
    setI(0)
    setPlaying(true)
  }
  return (
    <div className="screen wide" data-testid="lesson">
      <div className="top">
        <button className="iconbtn" aria-label="Close lesson" onClick={onClose}>
          ✕
        </button>
        <h1>📺 {SKILL[skill].name}</h1>
        <div className="spacer" />
      </div>
      <div className="lcols">
      <div className="card stagecard">
        <div className="stage">
          {sc.head && <div className="eqline" style={{ fontSize: 30 }} dangerouslySetInnerHTML={{ __html: sc.head }} />}
          {sc.html && <div className="extra visual" key={sc.html.length + '-' + i} dangerouslySetInnerHTML={{ __html: sc.html }} />}
          {sc.steps.length > 0 && (
            <ul className="steps" style={{ width: '100%' }}>
              {sc.steps.map((t, k) => (
                <li key={k} style={{ animationDelay: '0s', opacity: k === sc.steps.length - 1 ? undefined : 1, animation: k === sc.steps.length - 1 ? undefined : 'none' }}>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="col lside">
      <div aria-live="polite">
        <ReadAlong id="caption" text={sc.say} className="card caption" />
      </div>
      <div className="dots">
        {scenes.map((_, k) => (
          <i key={k} className={k <= i ? 'on' : ''} />
        ))}
      </div>
      <div className="lctl">
        <button onClick={restart}>⏮ Start over</button>
        <button
          onClick={() => {
            if (playing) {
              run.current++
              hush()
              setPlaying(false)
            } else if (done) restart()
            else setPlaying(true)
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => {
            hush()
            run.current++
            if (i + 1 < scenes.length) {
              setI(i + 1)
              setPlaying(true)
            } else {
              setPlaying(false)
              setDone(true)
            }
          }}
        >
          ⏭ Next
        </button>
      </div>
      {done && (
        <button className="btn" onClick={() => (hush(), onGo())}>
          Let's play! ▶
        </button>
      )}
      </div>
      </div>
    </div>
  )
}
