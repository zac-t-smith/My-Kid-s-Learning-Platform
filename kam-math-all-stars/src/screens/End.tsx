import { useEffect, useMemo, useState } from 'react'
import { LEVELS, rungName, TOP } from '../content/levels'
import { fill, THEMES } from '../content/themes'
import { S, update, useStore } from '../db/store'
import { confetti } from '../components/confetti'
import { sfx } from '../lib/sfx'
import { speak } from '../lib/speech'
import type { RoundResult } from './Play'

export default function End({ result, onLesson, onPlay, onClimb, onHome }: { result: RoundResult; onLesson: (L: number) => void; onPlay: (L: number) => void; onClimb: () => void; onHome: () => void }) {
  const st = useStore()
  const f = st.profile.fields
  const th = THEMES[f.theme] || THEMES.baseball
  const [unlockedTo, setUnlockedTo] = useState<number | null>(null)

  // Work out what to show and say once, when the screen opens.
  const v = useMemo(() => {
    const name = S().name
    if (result.mode === 'round') {
      const { wins, n, L, levelUp } = result
      const stars = wins >= 9 ? 3 : wins >= 7 ? 2 : wins >= 5 ? 1 : 0
      const head = fill(th.end[Math.floor(Math.random() * th.end.length)], name, th)
      let say = `${head} You got ${wins} out of ${n} on the first try.`
      if (levelUp !== undefined) say += ` And guess what? You unlocked a new level: ${LEVELS[levelUp].name}! Want to see how it works?`
      else if (stars >= 2 && L < S().unlocked) say += ' You already beat this level. Try the next one, or take on The Climb!'
      else if (stars < 2) say += ' Keep practicing. You are getting stronger every round!'
      return { stars: '★'.repeat(stars) + '☆'.repeat(3 - stars), title: head, score: `${wins} out of ${n} on the first try!`, say, party: levelUp !== undefined, offer: null as number | null }
    }
    const top = result.best + 1
    const lvl = Math.min(result.best, TOP)
    const offer = lvl > S().unlocked ? lvl : null
    let say = `Awesome climb, ${name}! You made it to rung ${top}, ${rungName(result.best)}.` + (result.newBest ? ' That is a new personal best!' : ` Your best is rung ${result.climbBest}. Can you beat it?`)
    if (offer !== null) say += ' You climbed higher than your levels go. Want to unlock them?'
    return { stars: '🧗', title: `You reached Rung ${top}!`, score: `${rungName(result.best)} · ${result.newBest ? 'New personal best! 🏆' : `Your best: Rung ${result.climbBest}`}`, say, party: result.newBest, offer }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  useEffect(() => {
    if (v.party) {
      sfx.up()
      confetti(th.win)
      if (result.mode === 'round') setTimeout(() => confetti(th.win), 400)
    }
    const t = setTimeout(() => speak(v.say), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  const levelUp = result.mode === 'round' ? result.levelUp : undefined
  return (
    <div className="screen center" data-testid="end">
      <div className="card endcard">
        <div className="stars" style={{ color: result.mode === 'round' ? 'var(--acc)' : undefined }}>
          {v.stars}
        </div>
        <h2>{v.title}</h2>
        <p>{v.score}</p>
        {levelUp !== undefined && (
          <div className="unlock">
            🎉 New level unlocked!
            <br />
            {LEVELS[levelUp].icon} {LEVELS[levelUp].name}
          </div>
        )}
        {unlockedTo !== null ? (
          <div className="unlock">
            ⭐ Unlocked up to {LEVELS[unlockedTo].icon} {LEVELS[unlockedTo].name}!
          </div>
        ) : (
          v.offer !== null && <div className="unlock">You climbed past your levels! 🎉</div>
        )}
      </div>
      <div className="col">
        {result.mode === 'round' && levelUp !== undefined && (
          <>
            <button className="btn" onClick={() => onLesson(levelUp)}>
              📺 Watch: {LEVELS[levelUp].name}
            </button>
            <button className="btn" style={{ background: '#fff' }} onClick={() => onPlay(levelUp)}>
              ▶ Play {LEVELS[levelUp].name}
            </button>
          </>
        )}
        {result.mode === 'round' && levelUp === undefined && (
          <button className="btn" onClick={() => onPlay(result.L)}>
            ▶ Play again
          </button>
        )}
        {v.offer !== null && unlockedTo === null && (
          <button
            className="btn"
            onClick={() => {
              const L = v.offer!
              update({ unlocked: L, current: L })
              setUnlockedTo(L)
              sfx.up()
              speak(`Done! You can now play all the way up to ${LEVELS[L].name}.`)
            }}
          >
            ⭐ Unlock levels up to {LEVELS[v.offer].name}
          </button>
        )}
        <button className="btn" style={result.mode === 'round' ? { background: '#fff' } : undefined} onClick={onClimb}>
          🧗 {result.mode === 'climb' ? 'Climb again' : 'The Climb'}
        </button>
        <button className="btn" style={{ background: 'rgba(255,255,255,.85)' }} onClick={onHome}>
          🏠 Home
        </button>
      </div>
    </div>
  )
}
