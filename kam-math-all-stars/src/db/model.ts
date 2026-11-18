import type { ThemeKey } from '../content/themes'
import type { Fmt } from '../engine/types'
import type { GameRecord, Pitch } from '../game/ballgame'

/** One answered problem. The attempt log is the source of truth for all stats. */
export interface Attempt {
  id: string
  /** When it was answered (ms since epoch, device clock). */
  ts: number
  /** Level the problem belongs to (18 = Super Rungs). */
  L: number
  mode: 'round' | 'climb' | 'game'
  /** Problem format. 'pitch' and 'field' are Ballgame defense challenges. */
  fmt: Fmt | 'pitch' | 'field'
  /** Plain-text problem, e.g. "54 − 27". */
  q: string
  target: number
  /** Solved in the end (first or second try). */
  ok: boolean
  /** Right on the first try with no hint. */
  first: boolean
  tries: number
  helped: boolean
  ms: number
  device: string
  /** Ballgame only: which game, which pitch he chose, and how many bases the hit was worth. */
  gid?: string
  pitch?: Pitch
  bases?: number
  /** 0 = not yet in the cloud, 1 = uploaded. Local bookkeeping only. */
  synced: 0 | 1
}

export interface Fields {
  name: string
  theme: ThemeKey
  /** Highest unlocked level index. */
  unlocked: number
  current: number
  seenLesson: Record<number, 1>
  voice: string
  rate: number
  autoRead: 'words' | 'all' | 'off'
  sfx: boolean
  climbBest: number
  /** Parent PIN check value + salt ('' = no PIN yet). */
  pin: string
  pinSalt: string
  /** Ballgame team. */
  teamName: string
  teamColor: string
  stadium: string
  /** Innings per game: 3, 6 or 9. */
  gameInnings: number
  /** Read-along help: 1 = read everything, 2 = first sentence, 3 = tap to hear. */
  readLevel: 1 | 2 | 3
  /** How many times he tapped each word to hear it. */
  wordTaps: Record<string, number>
  /** Attempts at or before this time were erased by the parent. */
  resetAt: number
  /** When a parent last set `unlocked` by hand or erased progress. */
  parentAt: number
}

/** Kid profile. Every field carries the time it was last changed so two devices can merge. */
export interface Profile {
  fields: Fields
  times: Partial<Record<keyof Fields, number>>
}

export const freshFields = (): Fields => ({
  name: 'Kam',
  theme: 'baseball',
  unlocked: 0,
  current: 0,
  seenLesson: {},
  voice: '',
  rate: 0.95,
  autoRead: 'words',
  sfx: true,
  climbBest: 0,
  pin: '',
  teamName: '',
  teamColor: '#c62828',
  stadium: 'sandlot',
  gameInnings: 3,
  readLevel: 1,
  wordTaps: {},
  pinSalt: '',
  resetAt: 0,
  parentAt: 0,
})
export const freshProfile = (): Profile => ({ fields: freshFields(), times: {} })

export interface Backup {
  app: 'kams-math-all-stars'
  version: 1
  exportedAt: number
  profile: Profile
  attempts: Attempt[]
  games?: GameRecord[]
}
