/* Ballgame rules. Pure logic, no UI: every change to a game goes through these functions. */

export type Pitch = 'fastball' | 'curveball' | 'slider' | 'meatball'
export const PITCHES: Record<Pitch, { label: string; icon: string; bases: number; hit: string; blurb: string }> = {
  fastball: { label: 'Fastball', icon: '⚡', bases: 1, hit: 'Single', blurb: 'A problem from your level' },
  curveball: { label: 'Curveball', icon: '🌀', bases: 2, hit: 'Double', blurb: 'A tricky one from your level' },
  slider: { label: 'Slider', icon: '💨', bases: 3, hit: 'Triple', blurb: 'A problem from the next level' },
  meatball: { label: 'Meatball', icon: '🍖', bases: 4, hit: 'Home run', blurb: 'A big one from two levels up' },
}
export const HIT_NAMES = ['', 'single', 'double', 'triple', 'home run']
/** Youth-league rule: a half inning ends after this many runs, so no inning goes on forever. */
export const RUN_LIMIT = 3
const MAX_EXTRA = 2

export interface Team {
  name: string
  color: string
}
export interface Opponent extends Team {
  /** 1 (easy) to 5 (tough). Tougher teams ask harder defense questions and hit harder when Kam misses. */
  rating: number
}
export const OPPONENTS: Opponent[] = [
  { name: 'Hilltop Hawks', color: '#8d6e63', rating: 1 },
  { name: 'Bayou Bullfrogs', color: '#43a047', rating: 1 },
  { name: 'River City Raptors', color: '#00897b', rating: 2 },
  { name: 'Coastal Comets', color: '#1e88e5', rating: 2 },
  { name: 'Pine Ridge Panthers', color: '#5e35b1', rating: 3 },
  { name: 'Thunder Valley Bolts', color: '#f4511e', rating: 3 },
  { name: 'Iron Mountain Miners', color: '#546e7a', rating: 4 },
  { name: 'Gulf Shore Sharks', color: '#00acc1', rating: 4 },
  { name: 'Capital City Kings', color: '#c62828', rating: 5 },
]
export const TEAM_NAMES = ['All-Stars', 'Sluggers', 'Thunder', 'Rockets', 'Sharks', 'Dragons']
export const TEAM_COLORS = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#263238']
export const STADIUMS: Record<string, { label: string; icon: string; sky: [string, string]; grass: string }> = {
  sandlot: { label: 'Sandlot', icon: '🌳', sky: ['#81d4fa', '#e1f5fe'], grass: '#43a047' },
  sunset: { label: 'Sunset Park', icon: '🌇', sky: ['#ff8a65', '#ffe0b2'], grass: '#388e3c' },
  lights: { label: 'Night Lights', icon: '🌙', sky: ['#1a237e', '#3949ab'], grass: '#2e7d32' },
}

export interface Game {
  id: string
  ts: number
  /** Regulation innings (3, 6 or 9). */
  innings: number
  team: Team
  stadium: string
  opp: Opponent
  inning: number
  half: 'top' | 'bottom'
  outs: number
  /** Runners on 1st, 2nd, 3rd. */
  bases: [boolean, boolean, boolean]
  /** Runs per inning. */
  us: number[]
  them: number[]
  /** pick = choose a pitch, defense = bottom half, break = between halves, final = game over. */
  phase: 'pick' | 'defense' | 'break' | 'final'
  halfRuns: number
  /** Kam's batting line for this game. */
  bat: { ab: number; first: number; h: number; hr: number; rbi: number; tb: number; k: number }
  /** Defense chances and outs made. */
  def: { chances: number; outs: number }
  themHits: number
  /** Hits the other team got on its own this half (not from a miss by Kam). */
  halfSim?: number
  /** Why the last half ended, for the announcer. */
  ended?: 'outs' | 'limit' | 'walkoff'
}
export const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
export const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`
/** Odd innings Kam pitches (builds a problem); even innings he fields (quick decisions). */
export const defenseKind = (g: Game): 'pitching' | 'fielding' => (g.inning % 2 ? 'pitching' : 'fielding')

export function newGame(setup: { id: string; ts: number; innings: number; team: Team; stadium: string; opp: Opponent }): Game {
  return {
    ...setup,
    inning: 1,
    half: 'top',
    outs: 0,
    bases: [false, false, false],
    us: [0],
    them: [],
    phase: 'pick',
    halfRuns: 0,
    bat: { ab: 0, first: 0, h: 0, hr: 0, rbi: 0, tb: 0, k: 0 },
    def: { chances: 0, outs: 0 },
    themHits: 0,
  }
}

/**
 * How many bases a hit is worth.
 * - The pitch sets the base value (fastball 1 ... meatball 4).
 * - Exit velocity: answering within his own usual time for that skill adds a base.
 * - Needing a second swing takes one base away (but a hit is always at least a single).
 */
export function hitBases(pitch: Pitch, quick: boolean, secondSwing: boolean): number {
  return Math.max(1, Math.min(4, PITCHES[pitch].bases + (quick ? 1 : 0) - (secondSwing ? 1 : 0)))
}

/** Was this answer fast for him? Compared with his own average on that level, never a fixed clock. */
export function isQuick(ms: number, stat?: { att: number; ms: number }): boolean {
  return !!stat && stat.att >= 3 && ms <= stat.ms / stat.att
}

/** Move every runner (and the batter) n bases. Returns the runs that scored. */
function advance(g: Game, n: number): number {
  let runs = 0
  const next: [boolean, boolean, boolean] = [false, false, false]
  // positions: 0 = batter at home, 1..3 = bases
  for (const pos of [3, 2, 1, 0]) {
    if (pos > 0 && !g.bases[pos - 1]) continue
    const to = pos + n
    if (to >= 4) runs++
    else next[to - 1] = true
  }
  g.bases = next
  return runs
}

function endHalf(g: Game, why: 'outs' | 'limit') {
  g.ended = why
  g.outs = 0
  g.bases = [false, false, false]
  g.halfRuns = 0
  g.halfSim = 0
  const last = g.inning >= g.innings
  if (g.half === 'top') {
    // The home team does not bat in the last inning if it is already ahead.
    if (last && total(g.them) > total(g.us)) return void (g.phase = 'final')
    g.half = 'bottom'
    g.them.push(0)
  } else {
    if (last && (total(g.us) !== total(g.them) || g.inning >= g.innings + MAX_EXTRA)) return void (g.phase = 'final')
    g.inning++
    g.half = 'top'
    g.us.push(0)
  }
  g.phase = 'break'
}

/** A hit for whoever is batting. Returns runs scored on the play. */
export function applyHit(g: Game, n: number, firstSwing = false, sim = false): number {
  const runs = advance(g, n)
  const line = g.half === 'top' ? g.us : g.them
  line[line.length - 1] += runs
  g.halfRuns += runs
  if (g.half === 'top') {
    g.bat.ab++
    g.bat.h++
    if (firstSwing) g.bat.first++
    g.bat.tb += n
    g.bat.rbi += runs
    if (n === 4) g.bat.hr++
  } else {
    g.themHits++
    if (sim) g.halfSim = (g.halfSim || 0) + 1
    else g.def.chances++
    // Walk-off: the home team takes the lead in the last inning.
    if (g.inning >= g.innings && total(g.them) > total(g.us)) {
      g.ended = 'walkoff'
      g.phase = 'final'
      return runs
    }
  }
  if (g.halfRuns >= RUN_LIMIT) endHalf(g, 'limit')
  return runs
}

/** An out for whoever is batting (a strikeout when Kam bats, a play made when he is on defense). */
export function applyOut(g: Game) {
  g.outs++
  if (g.half === 'top') {
    g.bat.ab++
    g.bat.k++
  } else {
    g.def.chances++
    g.def.outs++
  }
  if (g.outs >= 3) endHalf(g, 'outs')
}

/** Leave the between-halves break and start the next half. */
export function resume(g: Game) {
  if (g.phase === 'break') g.phase = g.half === 'top' ? 'pick' : 'defense'
}

export const result = (g: Game): 'W' | 'L' | 'T' => (total(g.us) > total(g.them) ? 'W' : total(g.us) < total(g.them) ? 'L' : 'T')

/**
 * Game balance: before one of Kam's defense plays, the other team's batter may get a hit on his own.
 * This is what makes it a contest: Kam scores a lot, so good teams have to score too.
 * - Tougher teams do it more often, and a little more when Kam is far ahead (less when he is behind).
 * - The two easiest teams get at most 2 a half; the very easiest only singles, so it cannot score unless Kam misses.
 * - In the last inning it only happens while Kam leads by 3 or more, and only singles:
 *   he can never be tied or beaten at the end without a miss of his own.
 * Returns the bases of the hit, or 0 for no hit.
 */
export function simHit(g: Game, rng: () => number = Math.random): number {
  const r = g.opp.rating
  const cap = r <= 2 ? 2 : r + 1
  if (g.half !== 'bottom' || (g.halfSim || 0) >= cap) return 0
  const lead = total(g.us) - total(g.them)
  const last = g.inning >= g.innings
  if (last && lead < 3) return 0
  let p = 0.14 + 0.15 * r
  if (lead >= 4) p += 0.15
  else if (lead < 0) p *= 0.4
  if (rng() >= p) return 0
  return !last && r >= 3 && rng() < 0.15 * (r - 1) ? 2 : 1
}

/**
 * Which team he plays next: a win moves him up to a tougher team, a loss moves him back to an easier one.
 */
export function nextOpponent(games: { result: 'W' | 'L' | 'T' }[]): Opponent {
  let i = 0
  for (const g of games) i = Math.max(0, Math.min(OPPONENTS.length - 1, i + (g.result === 'W' ? 1 : g.result === 'L' ? -1 : 0)))
  return OPPONENTS[i]
}

/** How hard the other team hits when Kam misses on defense. Tough teams make a miss count. */
export function oppHitBases(rating: number, rng: () => number = Math.random): number {
  const r = rng()
  if (rating <= 1) return 1
  if (rating === 2) return r < 0.3 ? 2 : 1
  if (rating === 3) return r < 0.6 ? 2 : 1
  if (rating === 4) return r < 0.5 ? 3 : 2
  return r < 0.5 ? 4 : 3
}

/** Finished-game summary kept for the player card and standings. */
export interface GameRecord {
  id: string
  ts: number
  innings: number
  team: string
  opp: string
  rating: number
  us: number[]
  them: number[]
  result: 'W' | 'L' | 'T'
  bat: Game['bat']
  def: Game['def']
  synced: 0 | 1
}
export function toRecord(g: Game): GameRecord {
  return { id: g.id, ts: g.ts, innings: g.innings, team: g.team.name, opp: g.opp.name, rating: g.opp.rating, us: g.us, them: g.them, result: result(g), bat: g.bat, def: g.def, synced: 0 }
}

/** Baseball-card numbers. Each one is real math Kam can check. */
export interface Card {
  games: number
  w: number
  l: number
  t: number
  ab: number
  first: number
  h: number
  hr: number
  rbi: number
  tb: number
  /** First-swing hits ÷ at-bats. */
  avg: number
  /** Total bases ÷ at-bats. */
  slg: number
}
export function playerCard(games: GameRecord[], live?: Game): Card {
  const c: Card = { games: games.length, w: 0, l: 0, t: 0, ab: 0, first: 0, h: 0, hr: 0, rbi: 0, tb: 0, avg: 0, slg: 0 }
  for (const g of games) {
    if (g.result === 'W') c.w++
    else if (g.result === 'L') c.l++
    else c.t++
  }
  for (const b of [...games.map((g) => g.bat), ...(live ? [live.bat] : [])]) {
    c.ab += b.ab
    c.first += b.first
    c.h += b.h
    c.hr += b.hr
    c.rbi += b.rbi
    c.tb += b.tb
  }
  c.avg = c.ab ? c.first / c.ab : 0
  c.slg = c.ab ? c.tb / c.ab : 0
  return c
}
/** .750 style, like a real baseball card. */
export const fmtAvg = (x: number) => (x >= 1 ? x.toFixed(3) : x.toFixed(3).slice(1))
