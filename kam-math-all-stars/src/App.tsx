import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { THEMES } from './content/themes'
import { useStore } from './db/store'
import { hush, loadVoices, speak } from './lib/speech'
import { unlockAudio } from './lib/sfx'
import Home from './screens/Home'
import Play, { type RoundConfig, type RoundResult } from './screens/Play'
import Lesson from './screens/Lesson'
import End from './screens/End'
import Parent from './screens/Parent'
import { ToastHost } from './components/Toast'

type Screen = 'start' | 'home' | 'play' | 'end' | 'parent'
interface LessonReq {
  L: number
  /** What "Let's play!" does. */
  after: 'round' | 'resume'
}

export default function App() {
  const st = useStore()
  const f = st.profile.fields
  const theme = THEMES[f.theme] || THEMES.baseball
  const [screen, setScreen] = useState<Screen>('start')
  const [round, setRound] = useState<(RoundConfig & { key: number }) | null>(null)
  const [lesson, setLesson] = useState<LessonReq | null>(null)
  const [result, setResult] = useState<RoundResult | null>(null)
  const keyRef = useRef(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--bg1', theme.bg[0])
    r.setProperty('--bg2', theme.bg[1])
    r.setProperty('--acc', theme.acc)
    document.title = `${f.name}'s Math All-Stars`
  }, [theme, f.name])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen, lesson])

  if (!st.ready) return <div className="screen center" />

  const startRound = (cfg: RoundConfig) => {
    hush()
    setLesson(null)
    setRound({ ...cfg, key: ++keyRef.current })
    setScreen('play')
  }
  const goHome = () => {
    hush()
    setLesson(null)
    setRound(null)
    setScreen('home')
  }
  const fade = { initial: { opacity: 0, y: reduce ? 0 : 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduce ? 0 : 0.2 } }
  const view = lesson ? `lesson-${lesson.L}-${lesson.after}` : screen

  return (
    <>
      {/* Each screen fades in. No exit animation, so two screens are never on the page at once. */}
      {view !== 'play' && (
        <motion.div key={view} {...fade}>
          {lesson ? (
            <Lesson
              L={lesson.L}
              onGo={() => (lesson.after === 'resume' ? setLesson(null) : startRound({ mode: 'round', L: lesson.L }))}
              onClose={() => (lesson.after === 'resume' ? (hush(), setLesson(null)) : goHome())}
            />
          ) : screen === 'start' ? (
            <div className="screen center">
              <div className="hero">{theme.icon}</div>
              <h1 className="title">{f.name}'s Math All-Stars</h1>
              <button
                className="btn"
                style={{ fontSize: 30, padding: '20px 34px' }}
                onClick={() => {
                  unlockAudio()
                  loadVoices()
                  speak(`Hey ${f.name}! Welcome to Math All-Stars. Pick a level, or take on The Climb!`)
                  setScreen('home')
                }}
              >
                ▶ Tap to Play
              </button>
              <p className="small">Turn your sound on 🔊</p>
            </div>
          ) : screen === 'home' ? (
            <Home onPlay={(L, withLesson) => (withLesson ? setLesson({ L, after: 'round' }) : startRound({ mode: 'round', L }))} onClimb={() => startRound({ mode: 'climb', L: 0 })} onParent={() => (hush(), setScreen('parent'))} />
          ) : screen === 'end' && result ? (
            <End result={result} onLesson={(L) => setLesson({ L, after: 'round' })} onPlay={(L) => startRound({ mode: 'round', L })} onClimb={() => startRound({ mode: 'climb', L: 0 })} onHome={goHome} />
          ) : screen === 'parent' ? (
            <Parent onBack={goHome} />
          ) : null}
        </motion.div>
      )}
      {/* Play stays mounted while a lesson is opened from inside a round, so the round is not lost. */}
      {round && screen === 'play' && (
        <motion.div key={round.key} {...fade} style={{ display: lesson ? 'none' : 'block' }}>
          <Play
            key={round.key}
            config={round}
            paused={!!lesson}
            onLesson={(L) => setLesson({ L, after: 'resume' })}
            onQuit={goHome}
            onEnd={(r) => {
              setResult(r)
              setRound(null)
              setScreen('end')
            }}
          />
        </motion.div>
      )}
      <ToastHost />
    </>
  )
}
