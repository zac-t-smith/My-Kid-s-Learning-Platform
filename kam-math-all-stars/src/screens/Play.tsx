import { useEffect, useReducer, useRef } from 'react'
import { fill, pickFresh, THEMES } from '../content/themes'
import { rungName, TOP } from '../content/levels'
import { addAttempt, getState, S, update } from '../db/store'
import { hasGen, makeItem } from '../skills/graph'
import { LEGACY, legacyLevel, SKILL } from '../skills/manifest'
import { answerPlacement, difficultyFor, frontier, LADDER, PLACEMENT_LENGTH, placementSeeds, planRound, startPlacement, type Placement, type Slot } from '../skills/mastery'
import type { Item } from '../skills/types'
import { sfx } from '../lib/sfx'
import { hush, speak } from '../lib/speech'
import { confetti } from '../components/confetti'
import ItemCard, { answerText, type SwingResult } from '../components/ItemCard'
import ReadAlong from '../components/ReadAlong'
import WaysSheet from '../components/WaysSheet'

export type RoundConfig = { mode: 'round'; skill: string } | { mode: 'climb' } | { mode: 'placement' }
export type RoundResult =
  | { mode: 'round'; skill: string; wins: number; n: number; mastered: boolean; opened: string[]; levelUp?: number }
  | { mode: 'climb'; best: number; newBest: boolean; climbBest: number }
  | { mode: 'placement'; known: number; next: string[] }

type Res = 'win' | 'ok' | 'miss'
interface Round {
  mode: RoundConfig['mode']
  skill: string
  plan: { sk: string; slot: Slot }[]
  i: number
  n: number
  res: Res[]
  streak: number
  // climb
  rung: number
  best: number
  lives: number
  up: number
  climbed: boolean
  // placement
  place: Placement
  // result bookkeeping
  levelUp?: number
  masteredNow: boolean
  openBefore: string[]
  // current problem
  item: Item
  sk: string
  slot: Slot
  done: boolean
  // what is on screen
  feedback: string
  sheet: null | { reveal: boolean }
  bounce: number
  tok: number
  /** Counts problems shown; a new number means a brand-new problem card. */
  seq: number
}

const TH = () => THEMES[S().theme] || THEMES.baseball
const say = (t: string) => fill(t, S().name, TH())
const board = () => getState().derived.board

export default function Play({ config, paused, onLesson, onQuit, onEnd }: { config: RoundConfig; paused: boolean; onLesson: (skill: string) => void; onQuit: () => void; onEnd: (r: RoundResult) => void }) {
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  const ref = useRef<Round | null>(null)
  const alive = useRef(true)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  /** setTimeout that does nothing once the round is gone. */
  const later = (fn: () => void, ms: number) => setTimeout(() => alive.current && fn(), ms)

  function nextProblem() {
    const R = ref.current!
    let sk: string, slot: Slot = 'focus'
    let item: Item
    if (R.mode === 'climb') {
      sk = R.rung <= TOP ? LEGACY[R.rung][0] : 'super'
      item = makeItem(sk, { rung: R.rung, theme: TH(), name: S().name })
    } else if (R.mode === 'placement') {
      sk = LADDER[R.place.at]
      item = makeItem(sk, { d: 2, theme: TH(), name: S().name, only: ['solve', 'missing'] })
    } else {
      if (R.i >= R.n) return endRound()
      ;({ sk, slot } = R.plan[R.i])
      item = makeItem(sk, { d: slot === 'stretch' ? 1 : difficultyFor(board().states[sk]), theme: TH(), name: S().name })
    }
    Object.assign(R, { item, sk, slot, done: false, feedback: '', sheet: null, seq: (R.seq || 0) + 1 } satisfies Partial<Round>)
    rerender()
  }

  // Start once.
  useEffect(() => {
    alive.current = true
    hush()
    const b = board()
    const base = { i: 0, n: 10, res: [], streak: 0, lives: 3, up: 0, climbed: false, bounce: 0, masteredNow: false, openBefore: frontier(b), plan: [], rung: 0, best: 0, tok: 0, place: startPlacement(b), skill: '' } as Partial<Round>
    if (config.mode === 'climb') {
      const start = Math.max(0, Math.min(S().unlocked, TOP) - 1)
      ref.current = { ...base, mode: 'climb', rung: start, best: start } as Round
      speak(`The Climb! Two right in a row moves you up. You have 3 lives. Let's go, ${S().name}!`)
    } else if (config.mode === 'placement') {
      ref.current = { ...base, mode: 'placement', n: PLACEMENT_LENGTH } as Round
      speak(`Tryouts! Just show what you know, ${S().name}. Some will be easy and some will be new. That is how we find your spot.`)
    } else {
      ref.current = { ...base, mode: 'round', skill: config.skill, plan: planRound(config.skill, 10, b, Math.random, hasGen) } as Round
    }
    nextProblem()
    return () => {
      alive.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onDone(r: SwingResult) {
    const R = ref.current!
    R.done = true
    const first = r.ok && r.tries === 0 && !r.helped
    const L = R.sk === 'super' ? TOP + 1 : legacyLevel(R.sk)
    const was = board().states[R.sk]?.mastered
    addAttempt({ L, sk: R.sk, mode: R.mode, fmt: R.item.agree ? 'agree' : R.item.eqOnly ? 'solve' : 'story', q: plainText(R.item), target: typeof R.item.answer === 'number' ? R.item.answer : 0, ok: r.ok, first, tries: r.tries + (r.ok ? 1 : 0), helped: r.helped, ms: r.ms })
    R.res.push(first ? 'win' : r.ok ? 'ok' : 'miss')
    R.streak = first ? R.streak + 1 : 0
    const now = board().states[R.sk]?.mastered
    if (!was && now && R.mode !== 'placement') {
      if (R.sk === R.skill) R.masteredNow = true
      // keep the old "highest unlocked level" moving for the original levels
      if (L >= 0 && L === S().unlocked && L < TOP) {
        update({ unlocked: L + 1 })
        R.levelUp = L + 1
      }
    }
    if (R.mode === 'climb') {
      if (first) {
        R.up++
        if (R.up >= 2) {
          R.rung++
          R.up = 0
          R.climbed = true
          R.best = Math.max(R.best, R.rung)
        }
      } else {
        R.up = 0
        if (!r.ok) R.lives--
      }
    }
    if (R.mode === 'placement') {
      R.place = answerPlacement(R.place, first)
      sfx.tap()
      const line = first ? pickFresh(['Got it!', 'Nice!', 'Yes!', 'There it is!']) : pickFresh(['Thanks! On to the next one.', 'Good try. Here comes another.', 'No problem. Next pitch!'])
      R.feedback = line
      const tok = ++R.tok
      rerender()
      return speak(line, { id: 'feedback', onend: () => later(() => ref.current === R && R.tok === tok && goNext(), 300) })
    }
    if (r.ok) celebrate(r)
    else {
      sfx.bad()
      let t = say(pickFresh(TH().miss))
      if (R.mode === 'climb') t += R.lives > 0 ? ` You have ${R.lives} ${R.lives === 1 ? 'life' : 'lives'} left.` : ' That was your last life.'
      R.feedback = R.mode === 'climb' && R.lives <= 0 ? 'Last life! Let’s see how it works 👇' : 'Let’s look at it together 👇'
      speak(t)
      const item = R.item
      later(() => {
        if (ref.current === R && R.item === item && R.done) {
          R.sheet = { reveal: true }
          rerender()
        }
      }, 700)
      rerender()
    }
  }

  function celebrate(r: SwingResult) {
    const R = ref.current!
    sfx.good()
    confetti(TH().win)
    R.bounce++
    const t = TH()
    let line: string
    if (r.tries > 0 || r.helped) line = say(pickFresh(t.fixed))
    else if (R.streak === 3) line = say(t.streak[0])
    else if (R.streak === 5) line = say(t.streak[1])
    else if (R.streak === 8) line = say(t.streak[2])
    else line = say(pickFresh(t.praise))
    if (R.slot === 'stretch' && r.tries === 0) line += ' And that was a next level problem!'
    if (R.climbed) {
      R.climbed = false
      later(() => sfx.up(), 250)
      line += ` Climb up! Rung ${R.rung + 1}: ${rungName(R.rung)}!`
    }
    R.feedback = line
    const tok = ++R.tok
    rerender()
    speak(line, { id: 'feedback', onend: () => later(() => ref.current === R && R.tok === tok && !R.sheet && !pausedRef.current && goNext(), 650) })
  }

  function goNext() {
    const R = ref.current
    if (!R) return
    R.tok++
    hush()
    R.sheet = null
    if (R.mode === 'climb' && R.lives <= 0) return endClimb()
    if (R.mode === 'placement' && R.place.done) return endPlacement()
    R.i++
    nextProblem()
  }

  function endRound() {
    const R = ref.current!
    hush()
    if (R.levelUp !== undefined) update({ current: R.levelUp })
    const opened = frontier(board()).filter((id) => !R.openBefore.includes(id))
    onEnd({ mode: 'round', skill: R.skill, wins: R.res.filter((x) => x === 'win').length, n: R.n, mastered: R.masteredNow, opened, levelUp: R.levelUp })
  }
  function endClimb() {
    const R = ref.current!
    hush()
    const top = R.best + 1
    const newBest = top > (S().climbBest || 0)
    if (newBest) update({ climbBest: top })
    onEnd({ mode: 'climb', best: R.best, newBest, climbBest: Math.max(top, S().climbBest || 0) })
  }
  function endPlacement() {
    const R = ref.current!
    hush()
    const ids = placementSeeds(R.place)
    const now = Date.now()
    const known = { ...S().known }
    for (const id of ids) known[id] ??= now
    update({ known, currentSkill: '' })
    onEnd({ mode: 'placement', known: ids.length, next: frontier(board()).slice(0, 3) })
  }
  function quit() {
    const R = ref.current
    hush()
    if (R && R.mode === 'climb' && R.i > 0) {
      R.lives = 0
      return endClimb()
    }
    onQuit()
  }

  // Enter moves on when a problem is finished.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyRef.current = (e) => {
    const R = ref.current
    if (R && R.done && !R.sheet && !pausedRef.current && e.key === 'Enter' && R.mode !== 'placement') goNext()
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e)
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  const R = ref.current
  if (!R || !R.item) return <div className="screen" />
  const th = TH()
  const meta = SKILL[R.sk]
  const title =
    R.mode === 'climb'
      ? `🧗 Rung ${R.rung + 1} · ${rungName(R.rung)}`
      : R.mode === 'placement'
        ? `🎯 Tryouts · ${R.place.asked + 1} of ${PLACEMENT_LENGTH}`
        : `${th.round} · ${meta?.name ?? ''}`

  return (
    <div className="screen" data-testid="play">
      <div className="top">
        <button className="iconbtn" aria-label="Quit" onClick={quit}>
          ✕
        </button>
        <div className="roundinfo">
          <div className="lvlname">{title}</div>
          <div className="slots">
            {R.mode === 'climb' ? (
              <div className="lives" aria-label={`${Math.max(R.lives, 0)} lives left`}>
                {'❤️'.repeat(Math.max(R.lives, 0))}
                {'🤍'.repeat(3 - Math.max(R.lives, 0))} · {'▲'.repeat(R.up)}
                {'△'.repeat(2 - R.up)}
              </div>
            ) : (
              Array.from({ length: R.n }, (_, i) => {
                const r = R.res[i]
                return (
                  <span key={i} className={i === R.res.length ? 'now' : ''}>
                    {R.mode === 'placement' ? (r ? '•' : '') : r === 'win' ? th.win : r === 'ok' ? '✓' : r === 'miss' ? '·' : ''}
                  </span>
                )
              })
            )}
          </div>
        </div>
        <div key={R.bounce} className={'mascot' + (R.bounce ? ' bounce' : '')}>
          {th.icon}
        </div>
      </div>

      <ItemCard
        key={R.seq}
        item={R.item}
        swings={R.mode === 'placement' ? 1 : 2}
        badge={R.mode !== 'round' ? undefined : R.slot === 'stretch' ? `⭐ Bonus: ${meta?.name}` : R.slot === 'review' ? `🔁 Review: ${meta?.name}` : undefined}
        onStrike={() => {
          sfx.bad()
          R.feedback = say(pickFresh(th.retry))
          speak(R.feedback, { id: 'feedback' })
          rerender()
        }}
        onDone={onDone}
        onWays={
          R.mode === 'placement'
            ? undefined
            : () => {
                R.sheet = { reveal: false }
                rerender()
              }
        }
      />

      <div aria-live="polite">
        <ReadAlong id="feedback" text={R.feedback} className="feedback" testId="feedback" />
      </div>
      {R.done && R.mode !== 'placement' && (
        <button className="btn" onClick={goNext}>
          Next ▶
        </button>
      )}

      {R.sheet && (
        <WaysSheet
          strategies={R.item.strategies}
          answer={answerText(R.item)}
          reveal={R.sheet.reveal}
          onClose={() => {
            R.sheet = null
            hush()
            rerender()
          }}
          onLesson={
            R.sk !== 'super'
              ? () => {
                  R.sheet = null
                  R.tok++
                  hush()
                  rerender()
                  onLesson(R.sk)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

/** One-line text version of a problem for the parent log. */
export function plainText(it: Item): string {
  const eq = (it.eq || '').replace(/<span class="fr"><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g, '$1/$2').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const base = it.eqOnly && eq ? eq : fill(it.prompt, S().name, TH()) + (eq ? ` [${eq}]` : '')
  return (it.agree ? `${base}? (${it.agree.isTrue ? 'true' : 'false'})` : base).slice(0, 160)
}
