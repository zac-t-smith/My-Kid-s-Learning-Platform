import { useState } from 'react'
import { useStore } from '../db/store'
import { fmtAvg, playerCard } from '../game/ballgame'
import { speak } from '../lib/speech'
import ReadAlong from '../components/ReadAlong'

/** Kam's baseball card. Every number is real math, and each one can show how it is figured. */
export default function PlayerCard({ onBack }: { onBack: () => void }) {
  const st = useStore()
  const f = st.profile.fields
  const c = playerCard(st.games)
  const [open, setOpen] = useState('')
  const rows: { key: string; label: string; value: string; how: string }[] = [
    {
      key: 'avg',
      label: 'Batting average',
      value: fmtAvg(c.avg),
      how: c.ab
        ? `Batting average is hits on your first swing, divided by your at-bats. You have ${c.first} first-swing hits in ${c.ab} at-bats. ${c.first} ÷ ${c.ab} = ${fmtAvg(c.avg)}. A perfect average is 1.000.`
        : 'Batting average is hits on your first swing, divided by your at-bats. Play a game to get yours!',
    },
    {
      key: 'slg',
      label: 'Slugging',
      value: fmtAvg(c.slg),
      how: c.ab
        ? `Slugging counts how big your hits are. A single is 1 base, a double is 2, a triple is 3, and a home run is 4. You have ${c.tb} total bases in ${c.ab} at-bats. ${c.tb} ÷ ${c.ab} = ${fmtAvg(c.slg)}. Harder pitches make it go up!`
        : 'Slugging counts how big your hits are: total bases divided by at-bats. Harder pitches make it go up!',
    },
    { key: 'h', label: 'Hits', value: String(c.h), how: `A hit is any at-bat where you get the right answer. You have ${c.h} hits in ${c.ab} at-bats.` },
    { key: 'hr', label: 'Home runs', value: String(c.hr), how: `A home run is a hit worth 4 bases. Meatballs are home runs. A slider you answer fast is one too! You have ${c.hr}.` },
    { key: 'rbi', label: 'Runs batted in', value: String(c.rbi), how: `Every time your hit brings a runner home, that is a run batted in. You have ${c.rbi}.` },
  ]
  return (
    <div className="screen" data-testid="card">
      <div className="top">
        <button className="iconbtn" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h1>🧢 Player card</h1>
        <div className="spacer" />
      </div>
      <div className="card pcard" style={{ borderColor: f.teamColor }}>
        <div className="pc-top" style={{ background: f.teamColor }}>
          <div className="pc-num">14</div>
          <div>
            <div className="pc-name">{f.name}</div>
            <div className="pc-team">
              {f.name}'s {f.teamName || 'All-Stars'} · 1B / OF
            </div>
          </div>
        </div>
        <div className="pc-rec">
          {c.games} {c.games === 1 ? 'game' : 'games'} · {c.w} {c.w === 1 ? 'win' : 'wins'} · {c.l} {c.l === 1 ? 'loss' : 'losses'}
          {c.t ? ` · ${c.t} ${c.t === 1 ? 'tie' : 'ties'}` : ''}
        </div>
        {rows.map((r) => (
          <div key={r.key} className="pc-row">
            <div className="pc-line">
              <span>{r.label}</span>
              <b data-testid={`stat-${r.key}`}>{r.value}</b>
              <button
                aria-expanded={open === r.key}
                onClick={() => {
                  setOpen(open === r.key ? '' : r.key)
                  if (open !== r.key) speak(r.how, { id: 'how-' + r.key })
                }}
              >
                How is this figured?
              </button>
            </div>
            {open === r.key && <ReadAlong id={'how-' + r.key} text={r.how} className="pc-how" />}
          </div>
        ))}
      </div>
    </div>
  )
}
