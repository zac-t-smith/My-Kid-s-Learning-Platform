import { useEffect, useState } from 'react'
import { rungName } from '../content/levels'
import { THEMES, type ThemeKey } from '../content/themes'
import { loadLiveGame, update, useStore } from '../db/store'
import { ordinal, total, type Game } from '../game/ballgame'
import { legacyLevel, SKILL, SKILLS } from '../skills/manifest'
import { dueReviews, suggestions, type Board } from '../skills/mastery'
import { STRANDS, type Strand } from '../skills/types'
import { sfx } from '../lib/sfx'
import { speak } from '../lib/speech'

const STATUS_ICON = { mastered: '⭐', review: '🔁', learning: '▶', open: '▶', locked: '🔒' } as const

/** One skill with its progress bar and lesson / play buttons. */
export function SkillRow({ id, board, cur, onLesson, onPlay }: { id: string; board: Board; cur?: boolean; onLesson: () => void; onPlay: () => void }) {
  const s = SKILL[id]
  const st = board.states[id]
  return (
    <div className={'sk' + (cur ? ' cur' : '')} data-skill={id}>
      <div className="ic">{board.status[id] === 'review' ? '🔁' : STRANDS[s.strand].icon}</div>
      <div>
        <div className="nm">{s.name}</div>
        <div className="ds">
          {STRANDS[s.strand].name}
          {board.status[id] === 'review' ? ' · time for a quick review' : ''}
        </div>
        <div className="bar" aria-label={`Progress ${Math.round((st?.score ?? 0) * 100)} percent`}>
          <i style={{ width: `${Math.round((st?.score ?? 0) * 100)}%` }} />
        </div>
      </div>
      <div className="go">
        <button aria-label={`Watch lesson: ${s.name}`} onClick={onLesson}>
          📺
        </button>
        <button aria-label={`Play ${s.name}`} onClick={onPlay}>
          ▶
        </button>
      </div>
    </div>
  )
}

export default function Home({ onPlay, onClimb, onParent, onGame, onCard, onTryouts }: { onPlay: (skill: string, withLesson: boolean) => void; onClimb: () => void; onParent: () => void; onGame: (fresh: boolean) => void; onCard: () => void; onTryouts: () => void }) {
  const [live, setLive] = useState<Game | null>(null)
  const [openStrand, setOpenStrand] = useState<Strand | ''>('')
  useEffect(() => {
    void loadLiveGame().then((g) => setLive(g && g.phase !== 'final' ? g : null))
  }, [])
  const st = useStore()
  const f = st.profile.fields
  const th = THEMES[f.theme] || THEMES.baseball
  const board = st.derived.board
  const picks = suggestions(board, 3, f.currentSkill)
  const due = dueReviews(board).slice(0, 2)
  const seen = (id: string) => !!f.seenLesson[id] || !!f.seenLesson[legacyLevel(id)]
  const launch = (id: string) => {
    update({ currentSkill: id })
    onPlay(id, !seen(id))
  }
  const counts = (strand: Strand) => {
    const ids = SKILLS.filter((s) => s.strand === strand).map((s) => s.id)
    return { ids, done: ids.filter((id) => board.states[id]?.mastered).length }
  }
  return (
    <div className="screen" data-testid="home">
      <div className="top">
        <div className="spacer" />
        <h1>
          Hey {f.name}! {th.icon}
        </h1>
        <button className="iconbtn" aria-label="Coach's Corner (grown-ups)" onClick={onParent}>
          ⚙️
        </button>
      </div>
      <div className="card climb" data-testid="ballgame-card">
        <div className="lbl">⚾ Ballgame</div>
        <div className="ct">{live ? `Your game is waiting: ${live.half === 'top' ? 'top' : 'bottom'} of the ${ordinal(live.inning)}, ${total(live.us)} to ${total(live.them)}.` : 'Step up to the plate! Pick your pitch, hit the ball, and beat the other team.'}</div>
        <button className="btn play-main" onClick={() => onGame(false)}>
          ⚾ {live ? 'Keep playing' : 'Play ball!'}
        </button>
        <div className="row">
          {live && (
            <button className="chip" onClick={() => onGame(true)}>
              🆕 Start a new game
            </button>
          )}
          <button className="chip" onClick={onCard}>
            🧢 My player card
          </button>
        </div>
      </div>

      <div className="card" data-testid="up-next">
        <div className="lbl">Practice: pick one</div>
        {picks.map((id) => (
          <SkillRow key={id} id={id} board={board} cur={id === f.currentSkill} onLesson={() => onPlay(id, true)} onPlay={() => launch(id)} />
        ))}
        {due.map((id) => (
          <SkillRow key={id} id={id} board={board} onLesson={() => onPlay(id, true)} onPlay={() => onPlay(id, false)} />
        ))}
        {!picks.length && !due.length && <div className="note">You have mastered everything that is open. Try The Climb or a ball game!</div>}
        <div className="lbl" style={{ marginTop: 10 }}>
          Theme
        </div>
        <div className="chips">
          {(Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([k, t]) => (
            <button
              key={k}
              className={'chip' + (k === f.theme ? ' sel' : '')}
              onClick={() => {
                update({ theme: k })
                sfx.tap()
                speak(`${t.label}! Let's go!`)
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card climb">
        <div className="lbl">🧗 The Climb</div>
        <div className="ct">Problems get harder… and harder… and HARDER. How high can you go?</div>
        <div className="note">{f.climbBest ? `Your best: Rung ${f.climbBest} (${rungName(f.climbBest - 1)})` : 'Start where you are and keep climbing until you run out of lives.'}</div>
        <button className="btn" onClick={onClimb}>
          🧗 Start climbing
        </button>
        <button className="chip" onClick={onTryouts}>
          🎯 Tryouts: show what you know
        </button>
      </div>

      <div className="card" data-testid="skill-map">
        <div className="lbl">All skills</div>
        {(Object.keys(STRANDS) as Strand[]).map((k) => {
          const c = counts(k)
          const open = openStrand === k
          return (
            <div key={k}>
              <button className="sk" style={{ width: '100%', textAlign: 'left' }} aria-expanded={open} onClick={() => setOpenStrand(open ? '' : k)}>
                <div className="ic">{STRANDS[k].icon}</div>
                <div>
                  <div className="nm">{STRANDS[k].name}</div>
                  <div className="ds">
                    ⭐ {c.done} of {c.ids.length}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 22 }}>{open ? '▲' : '▼'}</div>
              </button>
              {open && (
                <div className="smap" style={{ marginBottom: 10 }}>
                  {c.ids.map((id) => {
                    const status = board.status[id]
                    return status === 'locked' ? (
                      <span key={id} className="st-locked">
                        🔒 {SKILL[id].name}
                      </span>
                    ) : (
                      <button key={id} className={'st-' + status} onClick={() => (status === 'mastered' || status === 'review' ? onPlay(id, false) : launch(id))}>
                        {STATUS_ICON[status]} {SKILL[id].name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="hold-tip">Grown-ups: tap ⚙️ for the Coach's Corner (PIN)</div>
    </div>
  )
}
