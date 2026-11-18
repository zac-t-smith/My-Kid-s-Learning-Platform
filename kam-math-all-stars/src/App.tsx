import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { THEMES } from './content/themes'
import { useStore } from './db/store'
import { hush, loadVoices, speak } from './lib/speech'
import { unlockAudio } from './lib/sfx'
import Home from './screens/Home'
import Play, { type RoundConfig, type RoundResult } from './screens/Play'
import Lesson from './screens/Lesson'
import SkillLesson from './screens/SkillLesson'
import { legacyLevel } from './skills/manifest'
import End from './screens/End'
import Parent from './screens/Parent'
import Ballgame from './screens/Ballgame'
import PlayerCard from './screens/PlayerCard'
import { ToastHost } from './components/Toast'

type Screen = 'start' | 'home' | 'play' | 'end' | 'parent' | 'game' | 'card'
interface LessonReq {
  skill: string
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
  const [game, setGame] = useState({ fresh: false, key: 0, cardBack: 'home' as Screen })
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
  const view = lesson ? `lesson-${lesson.skill}-${lesson.after}` : screen

  return (
    <>
      {/* Each screen fades in. No exit animation, so two screens are never on the page at once. */}
      {view !== 'play' && (
        <motion.div key={view} {...fade}>
          {lesson ? (
            (() => {
              const go = () => (lesson.after === 'resume' ? setLesson(null) : startRound({ mode: 'round', skill: lesson.skill }))
              const close = () => (lesson.after === 'resume' ? (hush(), setLesson(null)) : goHome())
              const L = legacyLevel(lesson.skill)
              return L >= 0 ? <Lesson L={L} onGo={go} onClose={close} /> : <SkillLesson skill={lesson.skill} onGo={go} onClose={close} />
            })()
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
                  speak(`Hey ${f.name}! Welcome to Math All-Stars. Play a ball game, pick a skill, or take on The Climb!`)
                  setScreen('home')
                }}
              >
                ▶ Tap to Play
              </button>
              <p className="small">Turn your sound on 🔊</p>
            </div>
          ) : screen === 'home' ? (
            <Home
              onPlay={(skill, withLesson) => (withLesson ? setLesson({ skill, after: 'round' }) : startRound({ mode: 'round', skill }))}
              onClimb={() => startRound({ mode: 'climb' })}
              onTryouts={() => startRound({ mode: 'placement' })}
              onParent={() => (hush(), setScreen('parent'))}
              onGame={(fresh) => (hush(), setGame((x) => ({ ...x, fresh, key: x.key + 1 })), setScreen('game'))}
              onCard={() => (hush(), setGame((x) => ({ ...x, cardBack: 'home' })), setScreen('card'))}
            />
          ) : screen === 'end' && result ? (
            <End result={result} onLesson={(skill) => setLesson({ skill, after: 'round' })} onPlay={(skill) => startRound({ mode: 'round', skill })} onClimb={() => startRound({ mode: 'climb' })} onHome={goHome} />
          ) : screen === 'game' ? (
            <Ballgame key={game.key} fresh={game.fresh} onHome={goHome} onCard={() => (hush(), setGame((x) => ({ ...x, fresh: false, cardBack: 'game' })), setScreen('card'))} />
          ) : screen === 'card' ? (
            <PlayerCard onBack={() => (hush(), setScreen(game.cardBack))} />
          ) : screen === 'parent' ? (
            <Parent onBack={goHome} onTryouts={() => startRound({ mode: 'placement' })} />
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
            onLesson={(skill) => setLesson({ skill, after: 'resume' })}
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
