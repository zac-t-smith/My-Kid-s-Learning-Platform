import { motion, useReducedMotion } from 'framer-motion'
import { ordinal, STADIUMS, total, type Game } from './ballgame'

/** Where a runner starts and ends on a play. 0 = home plate (batter), 1-3 = bases, 4 = scored. */
export interface Run {
  from: number
  to: number
}
// home, 1st, 2nd, 3rd, home again
const P: [number, number][] = [
  [200, 232],
  [296, 136],
  [200, 40],
  [104, 136],
  [200, 232],
]

/** The diamond: bases, runners who run the bases on a hit, and the outs. */
export function Field({ g, runs, playKey, color }: { g: Game; runs: Run[] | null; playKey: number; color: string }) {
  const reduce = useReducedMotion()
  const st = STADIUMS[g.stadium] || STADIUMS.sandlot
  const still: Run[] = g.bases.flatMap((on, i) => (on ? [{ from: i + 1, to: i + 1 }] : []))
  const runners = runs ?? still
  return (
    <svg viewBox="0 0 400 270" className="field" role="img" aria-label={`Runners on: ${g.bases.map((b, i) => (b ? ordinal(i + 1) : '')).filter(Boolean).join(', ') || 'nobody'}. ${g.outs} out.`}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={st.sky[0]} />
          <stop offset="1" stopColor={st.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="270" rx="18" fill="url(#sky)" />
      <path d="M0 120 Q200 -40 400 120 L400 270 L0 270 Z" fill={st.grass} />
      <path d="M200 250 L316 136 L200 20 L84 136 Z" fill="#c8a165" />
      <path d="M200 216 L280 136 L200 56 L120 136 Z" fill={st.grass} />
      <circle cx="200" cy="140" r="12" fill="#c8a165" />
      {[1, 2, 3].map((b) => (
        <rect key={b} x={P[b][0] - 11} y={P[b][1] - 11} width="22" height="22" rx="3" transform={`rotate(45 ${P[b][0]} ${P[b][1]})`} fill="#fff" stroke="#8d6e63" strokeWidth="2" />
      ))}
      <path d="M188 226 h24 v8 l-12 10 l-12 -10 Z" fill="#fff" stroke="#8d6e63" strokeWidth="2" />
      {runners.map((r, i) => {
        const path = P.slice(r.from, r.to + 1)
        const moving = r.to > r.from && !reduce
        return (
          <motion.g
            key={`${playKey}-${i}`}
            initial={{ x: P[moving ? r.from : Math.min(r.to, 4)][0], y: P[moving ? r.from : Math.min(r.to, 4)][1], opacity: 1 }}
            animate={{ x: moving ? path.map((p) => p[0]) : P[r.to][0], y: moving ? path.map((p) => p[1]) : P[r.to][1], opacity: r.to >= 4 ? [1, 1, 0] : 1 }}
            transition={{ duration: moving ? 0.45 * (r.to - r.from) : 0, ease: 'linear', opacity: { duration: moving ? 0.45 * (r.to - r.from) + 0.3 : 0, times: [0, 0.9, 1] } }}
          >
            <circle r="15" fill={color} stroke="#fff" strokeWidth="3" />
            <text y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
              14
            </text>
          </motion.g>
        )
      })}
      <g transform="translate(14 16)">
        <rect width="84" height="30" rx="10" fill="rgba(0,0,0,.45)" />
        <text x="10" y="20" fontSize="14" fontWeight="700" fill="#fff">
          OUTS
        </text>
        {[0, 1].map((i) => (
          <circle key={i} cx={62 + i * 14} cy="15" r="5" fill={i < g.outs ? '#ffca28' : 'rgba(255,255,255,.3)'} />
        ))}
      </g>
    </svg>
  )
}

/** A real line score: runs by inning, plus runs and hits. */
export function Scoreboard({ g }: { g: Game }) {
  const n = Math.max(g.innings, g.inning)
  const row = (name: string, color: string, line: number[], hits: number, batting: boolean) => (
    <tr className={batting ? 'bat' : ''}>
      <th scope="row">
        <i style={{ background: color }} />
        {name}
      </th>
      {Array.from({ length: n }, (_, i) => (
        <td key={i}>{line[i] ?? ''}</td>
      ))}
      <td className="tot">{total(line)}</td>
      <td className="tot">{hits}</td>
    </tr>
  )
  return (
    <table className="score" data-testid="scoreboard" aria-label="Scoreboard">
      <thead>
        <tr>
          <th scope="col">
            {g.phase === 'final' ? 'Final' : `${g.half === 'top' ? '▲' : '▼'} ${ordinal(g.inning)}`}
          </th>
          {Array.from({ length: n }, (_, i) => (
            <th key={i} scope="col">
              {i + 1}
            </th>
          ))}
          <th scope="col">R</th>
          <th scope="col">H</th>
        </tr>
      </thead>
      <tbody>
        {row(g.team.name, g.team.color, g.us, g.bat.h, g.half === 'top' && g.phase !== 'final')}
        {row(g.opp.name, g.opp.color, g.them, g.themHits, g.half === 'bottom' && g.phase !== 'final')}
      </tbody>
    </table>
  )
}
