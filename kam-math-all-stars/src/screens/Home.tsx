import { LEVELS, rungName } from '../content/levels'
import { THEMES, type ThemeKey } from '../content/themes'
import { useEffect, useState } from 'react'
import { loadLiveGame, update, useStore } from '../db/store'
import { ordinal, total, type Game } from '../game/ballgame'
import { sfx } from '../lib/sfx'
import { speak } from '../lib/speech'

export default function Home({ onPlay, onClimb, onParent, onGame, onCard }: { onPlay: (L: number, withLesson: boolean) => void; onClimb: () => void; onParent: () => void; onGame: (fresh: boolean) => void; onCard: () => void }) {
  const [live, setLive] = useState<Game | null>(null)
  useEffect(() => {
    void loadLiveGame().then((g) => setLive(g && g.phase !== 'final' ? g : null))
  }, [])
  const st = useStore()
  const f = st.profile.fields
  const th = THEMES[f.theme] || THEMES.baseball
  const cur = Math.min(f.current, f.unlocked)
  const launch = (L: number) => {
    update({ current: L })
    onPlay(L, !f.seenLesson[L])
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
      <div className="card">
        <div className="lbl">Practice theme</div>
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
      <button className="btn" onClick={() => launch(cur)}>
        ▶ Practice {LEVELS[cur].icon} {LEVELS[cur].name}
      </button>
      <div className="card climb">
        <div className="lbl">🧗 The Climb</div>
        <div className="ct">Problems get harder… and harder… and HARDER. How high can you go?</div>
        <div className="note">{f.climbBest ? `Your best: Rung ${f.climbBest} (${rungName(f.climbBest - 1)})` : 'Start where you are and keep climbing until you run out of lives.'}</div>
        <button className="btn" onClick={onClimb}>
          🧗 Start climbing
        </button>
      </div>
      <div className="card">
        <div className="lbl">Levels</div>
        {LEVELS.map((l, i) => {
          const locked = i > f.unlocked
          const rec = (st.derived.recent[i] || []).slice(-6)
          return (
            <div key={i} className={'lvl' + (locked ? ' locked' : '') + (i === cur ? ' cur' : '')}>
              <div className="ic">{locked ? '🔒' : i < f.unlocked ? '⭐' : l.icon}</div>
              <div>
                <div className="nm">
                  {i + 1}. {l.name}
                </div>
                <div className="ds">
                  {l.desc} · {l.ex}
                </div>
                {!locked && (
                  <div className="meter">
                    {Array.from({ length: 6 }, (_, j) => (
                      <i key={j} className={rec[j] ? 'on' : ''} />
                    ))}
                  </div>
                )}
              </div>
              {!locked && (
                <div className="go">
                  <button aria-label={`Watch lesson: ${l.name}`} onClick={() => onPlay(i, true)}>
                    📺
                  </button>
                  <button aria-label={`Play ${l.name}`} onClick={() => launch(i)}>
                    ▶
                  </button>
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
