import { useEffect, useMemo, useState } from 'react'
import { LEVELS, rungName, TOP } from '../content/levels'
import { fill, THEMES } from '../content/themes'
import { S, update, useStore } from '../db/store'
import { SKILL } from '../skills/manifest'
import { STRANDS } from '../skills/types'
import { confetti } from '../components/confetti'
import { sfx } from '../lib/sfx'
import { speak } from '../lib/speech'
import type { RoundResult } from './Play'

export default function End({ result, onLesson, onPlay, onClimb, onHome }: { result: RoundResult; onLesson: (skill: string) => void; onPlay: (skill: string) => void; onClimb: () => void; onHome: () => void }) {
  const st = useStore()
  const f = st.profile.fields
  const th = THEMES[f.theme] || THEMES.baseball
  const [unlockedTo, setUnlockedTo] = useState<number | null>(null)

  // Work out what to show and say once, when the screen opens.
  const v = useMemo(() => {
    const name = S().name
    if (result.mode === 'round') {
      const { wins, n, mastered, opened } = result
      const stars = wins >= 9 ? 3 : wins >= 7 ? 2 : wins >= 5 ? 1 : 0
      const head = fill(th.end[Math.floor(Math.random() * th.end.length)], name, th)
      let say = `${head} You got ${wins} out of ${n} on the first try.`
      if (mastered) say += ` And guess what? You mastered ${SKILL[result.skill].name}!` + (opened.length ? ` That opens ${opened.length === 1 ? 'a new skill' : 'new skills'}: ${opened.slice(0, 3).map((id) => SKILL[id].name).join(', ')}. Pick one!` : '')
      else if (stars < 2) say += ' Keep practicing. You are getting stronger every round!'
      return { stars: '★'.repeat(stars) + '☆'.repeat(3 - stars), title: head, score: `${wins} out of ${n} on the first try!`, say, party: mastered, offer: null as number | null }
    }
    if (result.mode === 'placement') {
      const next = result.next.map((id) => SKILL[id].name)
      return {
        stars: '🎯',
        title: 'Tryouts are done!',
        score: result.known ? `You showed ${result.known} skills you already know.` : 'Now we know right where to start.',
        say: `Great tryout, ${name}! ${result.known ? `You already know ${result.known} skills.` : ''} ${next.length ? `Here is what is up next: ${next.join(', ')}. Pick one!` : ''}`,
        party: true,
        offer: null as number | null,
      }
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
      if (result.mode !== 'climb') setTimeout(() => confetti(th.win), 400)
    }
    const t = setTimeout(() => speak(v.say), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  // What he can pick next: skills this round opened, or the tryout's suggestions.
  const next = result.mode === 'round' ? (result.mastered ? result.opened.slice(0, 3) : []) : result.mode === 'placement' ? result.next : []
  return (
    <div className="screen center" data-testid="end">
      <div className="card endcard">
        <div className="stars" style={{ color: result.mode === 'round' ? 'var(--acc)' : undefined }}>
          {v.stars}
        </div>
        <h2>{v.title}</h2>
        <p>{v.score}</p>
        {result.mode === 'round' && result.mastered && (
          <div className="unlock">
            🎉 Mastered: {SKILL[result.skill].name}!{next.length > 0 && <div style={{ fontSize: 17, fontWeight: 500 }}>New skills are open. Pick one!</div>}
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
        {next.map((id) => (
          <div key={id} className="sk" style={{ background: '#fff' }}>
            <div className="ic">{STRANDS[SKILL[id].strand].icon}</div>
            <div style={{ textAlign: 'left' }}>
              <div className="nm">{SKILL[id].name}</div>
              <div className="ds">{STRANDS[SKILL[id].strand].name}</div>
            </div>
            <div className="go">
              <button aria-label={`Watch lesson: ${SKILL[id].name}`} onClick={() => onLesson(id)}>
                📺
              </button>
              <button aria-label={`Play ${SKILL[id].name}`} onClick={() => (update({ currentSkill: id }), onPlay(id))}>
                ▶
              </button>
            </div>
          </div>
        ))}
        {result.mode === 'round' && (
          <button className="btn" style={next.length ? { background: '#fff' } : undefined} onClick={() => onPlay(result.skill)}>
            ▶ {result.mastered ? `More ${SKILL[result.skill].name}` : 'Play again'}
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
        {result.mode !== 'placement' && (
          <button className="btn" style={result.mode === 'round' ? { background: '#fff' } : undefined} onClick={onClimb}>
            🧗 {result.mode === 'climb' ? 'Climb again' : 'The Climb'}
          </button>
        )}
        <button className="btn" style={{ background: 'rgba(255,255,255,.85)' }} onClick={onHome}>
          🏠 Home
        </button>
      </div>
    </div>
  )
}
