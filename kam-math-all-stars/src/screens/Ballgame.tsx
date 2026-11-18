import { useEffect, useReducer, useRef, useState } from 'react'
import { TOP } from '../content/levels'
import { fill, pickFresh, THEMES } from '../content/themes'
import { uuid } from '../db/db'
import { addAttempt, addGame, getState, loadLiveGame, S, saveLiveGame, update } from '../db/store'
import type { Fmt } from '../engine/types'
import { hasGen, makeItem } from '../skills/graph'
import { legacyLevel, SKILL } from '../skills/manifest'
import { difficultyFor, dueReviews, stretchOf, suggestions } from '../skills/mastery'
import type { Difficulty, Item } from '../skills/types'
import { sfx } from '../lib/sfx'
import { hush, speak } from '../lib/speech'
import { confetti } from '../components/confetti'
import ReadAlong from '../components/ReadAlong'
import WaysSheet from '../components/WaysSheet'
import ItemCard, { answerText, type SwingResult } from '../components/ItemCard'
import { plainText } from './Play'
import { Fielding, Pitching, type DefenseResult } from '../game/Defense'
import { Field, Scoreboard, type Run } from '../game/Field'
import {
  applyHit, applyOut, defenseKind, HIT_NAMES, hitBases, isQuick, newGame, nextOpponent, oppHitBases, simHit, ordinal, PITCHES, resume, result, RUN_LIMIT,
  STADIUMS, TEAM_COLORS, TEAM_NAMES, toRecord, total, type Game, type Pitch,
} from '../game/ballgame'
import { makeFieldChallenge, makePitchChallenge, type FieldChallenge, type PitchChallenge } from '../game/challenges'
import { ADJUST_LINES, BALL_LINES, DEF_OUT_LINES, HIT_LINES, QUICK_LINES, runsLine, STRIKE_LINES, STRIKEOUT_LINES } from '../game/lines'

const BB = THEMES.baseball
const say = (t: string, g?: Game) => fill(t, S().name, BB).replace(/\{o\}/g, g?.opp.name || '')

/**
 * What each pitch throws, from the skill he is working on:
 * fastball = that skill, gentle (or now and then a skill that is due for review);
 * curveball = that skill, harder; slider = the next skill; meatball = the skill after that.
 */
function pitchPlan(): Record<Pitch, { sk: string; d: Difficulty; only?: Fmt[] }> {
  const b = getState().derived.board
  const focus = suggestions(b, 1, S().currentSkill)[0] ?? dueReviews(b)[0] ?? 'as.thousands'
  const next = stretchOf(focus, b, hasGen)
  const after = next === focus ? focus : stretchOf(next, b, hasGen)
  const d = difficultyFor(b.states[focus])
  return {
    fastball: { sk: focus, d: 1, only: ['solve'] },
    curveball: { sk: focus, d: Math.max(2, d) as Difficulty, only: ['story', 'agree', 'missing'] },
    slider: next === focus ? { sk: focus, d: 3 } : { sk: next, d: 1 },
    meatball: after === next ? { sk: next, d: next === focus ? 3 : 2 } : { sk: after, d: 1 },
  }
}
function pitchItem(pitch: Pitch): { sk: string; item: Item } {
  const plan = pitchPlan()[pitch]
  let { sk } = plan
  // The pitcher mixes it up: some fastballs are a quick review of something he has mastered.
  const due = dueReviews(getState().derived.board)
  if (pitch === 'fastball' && due.length && Math.random() < 0.3) sk = due[0]
  return { sk, item: makeItem(sk, { d: plan.d, only: sk === plan.sk ? plan.only : undefined, theme: BB, name: S().name }) }
}

type Turn =
  | { kind: 'bat'; pitch: Pitch; sk: string; item: Item }
  | { kind: 'pitching'; c: PitchChallenge }
  | { kind: 'fielding'; c: FieldChallenge }

export default function Ballgame({ fresh, onHome, onCard }: { fresh: boolean; onHome: () => void; onCard: () => void }) {
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  const [loaded, setLoaded] = useState(false)
  const gref = useRef<Game | null>(null)
  const ui = useRef({
    turn: null as Turn | null,
    /** A play just happened: show it until he taps Next. */
    played: false,
    msg: '',
    runs: null as Run[] | null,
    playKey: 0,
    sheet: false,
    tok: 0,
    /** The announcer is setting the scene; wait before reading the challenge. */
    leadIn: false,
    /** Counts turns; a new number means a brand-new problem card. */
    seq: 0,
  })
  const alive = useRef(true)
  const later = (fn: () => void, ms: number) => setTimeout(() => alive.current && fn(), ms)

  useEffect(() => {
    alive.current = true
    void (fresh ? saveLiveGame(null).then(() => undefined) : loadLiveGame()).then((g) => {
      if (!alive.current) return
      if (g && g.phase !== 'final') gref.current = g
      setLoaded(true)
    })
    return () => {
      alive.current = false
      hush()
    }
  }, [fresh])

  const g = gref.current
  const u = ui.current
  const save = () => void saveLiveGame(gref.current ? JSON.parse(JSON.stringify(gref.current)) : null)
  const announce = (msg: string, onend?: () => void) => {
    u.msg = msg
    rerender()
    speak(msg, { id: 'announce', onend })
  }

  /* ---------- setup ---------- */
  const f = S()
  if (!loaded) return <div className="screen" />
  if (!g) {
    const opp = nextOpponent(getState().games)
    const teamName = f.teamName || TEAM_NAMES[0]
    return (
      <div className="screen" data-testid="game-setup">
        <div className="top">
          <button className="iconbtn" aria-label="Home" onClick={onHome}>
            ←
          </button>
          <h1>⚾ Game Day!</h1>
          <div className="spacer" />
        </div>
        <div className="card">
          <div className="lbl">Your team name</div>
          <div className="chips">
            {TEAM_NAMES.map((n) => (
              <button key={n} className={'chip' + (n === teamName ? ' sel' : '')} onClick={() => (update({ teamName: n }), sfx.tap(), speak(`${f.name}'s ${n}!`), rerender())}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="lbl">Your colors</div>
          <div className="chips">
            {TEAM_COLORS.map((c) => (
              <button key={c} aria-label={`Team color ${c}`} className={'swatch' + (c === f.teamColor ? ' sel' : '')} style={{ background: c }} onClick={() => (update({ teamColor: c }), sfx.tap(), rerender())}>
                {c === f.teamColor ? '14' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="lbl">Your ballpark</div>
          <div className="chips">
            {Object.entries(STADIUMS).map(([k, s]) => (
              <button key={k} className={'chip' + (k === f.stadium ? ' sel' : '')} onClick={() => (update({ stadium: k }), sfx.tap(), speak(s.label), rerender())}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="lbl">Today's game</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {f.name}'s {teamName} <span style={{ opacity: 0.5 }}>vs</span> {opp.name}
          </div>
          <div className="note">
            {'⭐'.repeat(opp.rating)} · {f.gameInnings || 3} innings
          </div>
        </div>
        <button
          className="btn play-main"
          onClick={() => {
            if (!f.teamName) update({ teamName })
            gref.current = newGame({ id: uuid(), ts: Date.now(), innings: f.gameInnings || 3, team: { name: `${f.name}'s ${teamName}`, color: f.teamColor }, stadium: f.stadium, opp })
            save()
            sfx.organ()
            announce(`Play ball! ${f.name}'s ${teamName} against the ${opp.name}. You are up to bat first. Pick your pitch!`)
          }}
        >
          ⚾ Play ball!
        </button>
      </div>
    )
  }

  /* ---------- plays ---------- */
  // Defense questions follow his grade: the grade of the skill he is on, mapped to the old 0-17 difficulty scale.
  const U = Math.min(17, Math.max(f.unlocked, ((SKILL[suggestions(getState().derived.board, 1, f.currentSkill)[0]]?.grade ?? 2) - 1) * 4))
  const afterPlay = () => {
    u.played = true
    save()
    rerender()
    const tok = ++u.tok
    return () => later(() => u.tok === tok && u.played && !u.sheet && next(), 900)
  }
  function next() {
    u.tok++
    hush()
    u.played = false
    u.turn = null
    u.runs = null
    u.sheet = false
    u.msg = ''
    if (g!.phase === 'final') finish()
    else if (g!.phase === 'defense') startDefense()
    rerender()
  }
  function startDefense() {
    const kind = defenseKind(g!)
    // Sometimes their batter gets on base by himself, so Kam's play has something riding on it.
    const sim = simHit(g!)
    u.leadIn = false
    if (sim) {
      const before = [0, ...g!.bases.flatMap((on, i) => (on ? [i + 1] : []))]
      const runs = applyHit(g!, sim, false, true)
      u.runs = before.map((from) => ({ from, to: Math.min(4, from + sim) }))
      u.playKey++
      sfx.crack()
      later(() => {
        u.runs = null
        rerender()
      }, 450 * sim + 500)
      u.leadIn = true
      announce(`The ${g!.opp.name} batter hits a ${HIT_NAMES[sim]}.${runs ? ` ${runs === 1 ? 'A run scores' : `${runs} runs score`}.` : ''} ${kind === 'pitching' ? 'Now strike out the next one' : 'Now make the play'}, ${f.name}!`)
      save()
      if (g!.phase !== 'defense') return
    }
    u.seq++
    u.turn = kind === 'pitching' ? { kind, c: makePitchChallenge(U, g!.opp.rating) } : { kind, c: makeFieldChallenge(U, g!.opp.rating) }
  }
  function finish() {
    if (getState().games.some((x) => x.id === g!.id)) return
    addGame(toRecord(g!))
    void saveLiveGame(null)
    const r = result(g!)
    const [us, them] = [total(g!.us), total(g!.them)]
    if (r === 'W') {
      sfx.organ()
      confetti('⚾')
      later(() => confetti('🏆'), 500)
    }
    const hits = g!.bat.h
    announce(
      r === 'W'
        ? `That is the ball game! ${g!.team.name} win, ${us} to ${them}! What a game, ${f.name}!`
        : r === 'T'
          ? `It ends in a tie, ${us} to ${them}. What a battle, ${f.name}!`
          : `Good game. The ${g!.opp.name} got us this time, ${them} to ${us}. You had ${hits} ${hits === 1 ? 'hit' : 'hits'}, ${f.name}. We will get them next time!`,
    )
  }

  function onSwing(r: SwingResult) {
    const t = u.turn as Extract<Turn, { kind: 'bat' }>
    const { item, pitch, sk } = t
    const first = r.ok && r.tries === 0 && !r.helped
    const prev = getState().derived.board.states[sk]
    const quick = first && isQuick(r.ms, prev && { att: prev.n, ms: prev.ms })
    const bases = r.ok ? hitBases(pitch, quick, r.tries > 0) : 0
    const L = legacyLevel(sk)
    addAttempt({ L, sk, mode: 'game', fmt: item.agree ? 'agree' : item.eqOnly ? 'solve' : 'story', q: plainText(item), target: typeof item.answer === 'number' ? item.answer : 0, ok: r.ok, first, tries: r.tries + (r.ok ? 1 : 0), helped: r.helped, ms: r.ms, gid: g!.id, pitch, bases })
    if (L >= 0 && L === S().unlocked && L < TOP && !prev?.mastered && getState().derived.board.states[sk]?.mastered) update({ unlocked: L + 1 })
    if (r.ok) {
      const before = [0, ...g!.bases.flatMap((on, i) => (on ? [i + 1] : []))]
      const runs = applyHit(g!, bases, first)
      u.runs = before.map((from) => ({ from, to: Math.min(4, from + bases) }))
      u.playKey++
      sfx.crack()
      sfx.crowd(bases)
      if (bases === 4) confetti('⚾')
      later(() => {
        u.runs = null
        rerender()
      }, 450 * bases + 500)
      const line = (r.tries > 0 ? pickFresh(ADJUST_LINES) : '') + say(pickFresh(HIT_LINES[bases])) + (quick ? pickFresh(QUICK_LINES) : '') + runsLine(runs) + (g!.ended === 'limit' && g!.phase !== 'pick' ? ` That is the ${RUN_LIMIT} run limit. What an inning!` : '')
      announce(line, afterPlay())
    } else {
      applyOut(g!)
      sfx.pop()
      announce(say(pickFresh(STRIKEOUT_LINES)))
      afterPlay()
      later(() => {
        if (u.played && u.turn === t) {
          u.sheet = true
          rerender()
        }
      }, 800)
    }
  }

  function onDefense(r: DefenseResult) {
    const t = u.turn as Exclude<Turn, { kind: 'bat' }>
    addAttempt({ L: -1, sk: 'defense', mode: 'game', fmt: t.kind === 'pitching' ? 'pitch' : 'field', q: t.c.prompt, target: t.kind === 'fielding' ? Number(t.c.choices[t.c.answer]) || 0 : 0, ok: r.ok, first: r.ok && r.tries === 0, tries: r.tries + (r.ok ? 1 : 0), helped: false, ms: r.ms, gid: g!.id })
    if (r.ok) {
      applyOut(g!)
      sfx.pop()
      sfx.crowd(1)
      announce(`${say(pickFresh(DEF_OUT_LINES))} ${r.explain}`, afterPlay())
    } else {
      const bases = oppHitBases(g!.opp.rating)
      const before = [0, ...g!.bases.flatMap((on, i) => (on ? [i + 1] : []))]
      const runs = applyHit(g!, bases)
      u.runs = before.map((from) => ({ from, to: Math.min(4, from + bases) }))
      u.playKey++
      sfx.crack()
      later(() => {
        u.runs = null
        rerender()
      }, 450 * bases + 500)
      announce(`${r.explain} The ${g!.opp.name} get a ${HIT_NAMES[bases]}.${runs ? ` ${runs} ${runs === 1 ? 'run scores' : 'runs score'}.` : ''} Shake it off, ${f.name}!`, afterPlay())
    }
  }

  /* ---------- screen ---------- */
  // A saved game reopened in the bottom half needs its next defense challenge.
  if (g.phase === 'defense' && !u.turn && !u.played) startDefense()
  const final = g.phase === 'final' && !u.played
  const onBreak = g.phase === 'break' && !u.played
  const us = total(g.us),
    them = total(g.them)
  const oppColor = g.opp.color
  let panel: React.ReactNode
  if (final) {
    const r = result(g)
    panel = (
      <div className="col" data-testid="game-final">
        <div className="card endcard" style={{ textAlign: 'center' }}>
          <div className="stars">{r === 'W' ? '🏆' : r === 'T' ? '🤝' : '⚾'}</div>
          <h2>{r === 'W' ? 'You win!' : r === 'T' ? 'Tie game!' : 'Good game!'}</h2>
          <p>
            {g.team.name} {us}, {g.opp.name} {them}
          </p>
          <p className="note" style={{ fontSize: 17 }}>
            Your game: {g.bat.h} for {g.bat.ab} · {g.bat.hr} HR · {g.bat.rbi} RBI
          </p>
        </div>
        <button className="btn" onClick={() => ((gref.current = null), (u.msg = ''), hush(), rerender())}>
          ⚾ Play another game
        </button>
        <button className="btn" style={{ background: '#fff' }} onClick={onCard}>
          🧢 My player card
        </button>
        <button className="btn" style={{ background: 'rgba(255,255,255,.85)' }} onClick={onHome}>
          🏠 Home
        </button>
      </div>
    )
  } else if (onBreak) {
    const top = g.half === 'top'
    const kind = defenseKind(g)
    const txt = top
      ? `Top of the ${ordinal(g.inning)}. You are up to bat! Pick your pitch.`
      : kind === 'pitching'
        ? `Bottom of the ${ordinal(g.inning)}. Now you pitch! Build a problem that lands in the strike zone.`
        : `Bottom of the ${ordinal(g.inning)}. Now you play the field! Make the quick call.`
    panel = (
      <div className="col" data-testid="game-break">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="lbl">{top ? `End of the ${ordinal(g.inning - 1)} inning` : `Middle of the ${ordinal(g.inning)} inning`}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>
            {us > them ? `You lead ${us} to ${them}` : us < them ? `${g.opp.name} lead ${them} to ${us}` : `Tied at ${us}`}
          </div>
          <ReadAlong id="break" text={txt} className="story" />
        </div>
        <button
          className="btn play-main"
          onClick={() => {
            resume(g)
            if (g.phase === 'defense') startDefense()
            else speak(txt, { id: 'break' })
            save()
            rerender()
          }}
        >
          {top ? '⚾ Batter up!' : kind === 'pitching' ? '⚾ Take the mound!' : '🧤 Take the field!'}
        </button>
      </div>
    )
  } else if (!u.turn) {
    // top half: pick your pitch
    const plan = pitchPlan()
    panel = (
      <div className="col" data-testid="pitch-pick">
        <div className="card">
          <div className="lbl">Pick your pitch</div>
          <div className="pitches">
            {(Object.keys(PITCHES) as Pitch[]).map((k) => {
              const p = PITCHES[k]
              return (
                <button
                  key={k}
                  data-pitch={k}
                  onClick={() => {
                    hush()
                    sfx.whoosh()
                    u.seq++
                    u.turn = { kind: 'bat', pitch: k, ...pitchItem(k) }
                    u.msg = `Here comes the ${p.label.toLowerCase()}!`
                    rerender()
                  }}
                >
                  <span className="pi">{p.icon}</span>
                  <b>{p.label}</b>
                  <span className="ph">{p.hit}</span>
                  <span className="pn">{k === 'curveball' ? 'Tricky · ' : ''}{SKILL[plan[k].sk]?.name}</span>
                </button>
              )
            })}
          </div>
          <div className="note" style={{ marginTop: 8 }}>
            Harder pitches are bigger hits. Fast answers go one base farther!
          </div>
        </div>
      </div>
    )
  } else if (u.turn.kind === 'bat') {
    const t = u.turn
    panel = (
      <ItemCard
        key={u.seq}
        item={t.item}
        goLabel="Swing"
        onStrike={() => announce(pickFresh(STRIKE_LINES))}
        onDone={onSwing}
        onWays={() => {
          u.sheet = true
          rerender()
        }}
      />
    )
  } else if (u.turn.kind === 'pitching') {
    panel = <Pitching key={u.seq} delay={u.leadIn ? 5200 : 700} c={u.turn.c} onBall={(hint) => announce(`${pickFresh(BALL_LINES)} ${hint}`)} onDone={onDefense} />
  } else {
    panel = <Fielding key={u.seq} delay={u.leadIn ? 5200 : 700} c={u.turn.c} onDone={onDefense} />
  }

  return (
    <div className="screen game" data-testid="ballgame">
      <div className="top">
        <button className="iconbtn" aria-label="Leave game" onClick={() => (hush(), save(), onHome())}>
          ✕
        </button>
        <h1>
          {g.phase === 'final' ? 'Final' : `${g.half === 'top' ? 'Top' : 'Bottom'} of the ${ordinal(g.inning)}`}
        </h1>
        <button className="iconbtn" aria-label={f.sfx ? 'Mute sound effects' : 'Turn sound effects on'} onClick={() => (update({ sfx: !f.sfx }), rerender())}>
          {f.sfx ? '🔊' : '🔇'}
        </button>
      </div>
      <div className="gcols">
        <div className="col gleft">
          <Scoreboard g={g} />
          <Field g={g} runs={u.runs} playKey={u.playKey} color={g.half === 'top' ? g.team.color : oppColor} />
          <div className="announce" aria-live="polite">
            <ReadAlong id="announce" text={u.msg} testId="announce" />
          </div>
        </div>
        <div className="col gright">
          {panel}
          {u.played && (
            <button className="btn" onClick={next}>
              {g.phase === 'final' ? 'Final score ▶' : g.phase === 'break' ? 'Next ▶' : g.half === 'top' ? 'Next batter ▶' : 'Next play ▶'}
            </button>
          )}
        </div>
      </div>
      {u.sheet && u.turn?.kind === 'bat' && (
        <WaysSheet
          strategies={u.turn.item.strategies}
          answer={answerText(u.turn.item)}
          reveal={u.played}
          onClose={() => {
            u.sheet = false
            hush()
            rerender()
          }}
        />
      )}
    </div>
  )
}
