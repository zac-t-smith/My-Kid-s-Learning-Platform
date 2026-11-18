import { R, strat, wrongs, choice, Q, arrayHTML, type Gen, type Item, type Strat } from '../kit'

/* Problem Solving: Math Kangaroo-style puzzles. Every puzzle with clues is searched in full to prove it has ONE answer. */

type Rand = ReturnType<typeof R>
const KIDS: readonly string[] = ['Mia', 'Leo', 'Sam', 'Ava', 'Ben', 'Zoe', 'Max', 'Eli', 'Ivy', 'Jon']
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const range = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i)
const andList = (xs: (string | number)[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const perms = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])))
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/* ------------------------------ ps.patterns-shape ------------------------------ */

const SHAPE_SETS = [
  ['🔴', '🔵', '🟢', '🟡'],
  ['⚾', '🧢', '🏆', '⭐'],
  ['🔺', '🟦', '🟣', '⭐'],
  ['🏄', '🌊', '🐚', '🌴'],
  ['🧱', '🚗', '🤖', '🚀'],
  ['🍎', '🍌', '🍇', '🥕'],
] as const
const CORES: Record<1 | 2 | 3, number[][]> = {
  1: [
    [0, 1],
    [0, 1, 2],
  ],
  2: [
    [0, 0, 1],
    [0, 1, 1],
    [0, 0, 1, 1],
    [0, 1, 2, 1],
    [0, 1, 2],
  ],
  3: [
    [0, 1],
    [0, 1, 2],
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 2, 3],
  ],
}
const GROW = [
  { thing: 'balls', e: '⚾' },
  { thing: 'bricks', e: '🧱' },
  { thing: 'stars', e: '⭐' },
  { thing: 'shells', e: '🐚' },
] as const

const patterns: Gen = (rng, d) => {
  const r = R(rng)
  if (d === 3 && r.chance(0.4)) {
    // growing pattern: each row has `k` more
    const g = r.pick(GROW)
    const k = r.int(1, 3)
    const s = r.int(1, k === 3 ? 1 : 3)
    const counts = [0, 1, 2, 3].map((i) => s + i * k)
    const last = counts[3]
    const rows = counts.map((c, i) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="font:700 15px sans-serif;color:#546e7a;width:52px;text-align:right">Row ${i + 1}</span><span style="font-size:22px;letter-spacing:2px">${g.e.repeat(c)}</span></div>`).join('')
    return {
      prompt: `Look at the rows of ${g.thing}. Each row grows the same way. How many ${g.thing} go in row 5?`,
      visual: `<div style="display:inline-block;text-align:left">${rows}<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="font:700 15px sans-serif;color:#546e7a;width:52px;text-align:right">Row 5</span><span style="font:700 22px sans-serif;color:#d84315">?</span></div></div>`,
      input: 'number',
      answer: s + 4 * k,
      strategies: [
        strat('Find the Jump', [`Count each row: ${counts.join(', ')}.`, `Each row has ${k} more than the row before.`, `Row 5: ${last} + ${k} = ${last + k}`], last + k, { line: [...counts, last + k] }),
        strat('Start at Row 1', [`Row 1 has ${s}. Row 5 is 4 rows later.`, `Each row adds ${k}. Four rows add 4 × ${k} = ${4 * k}`, `${s} + ${4 * k} = ${s + 4 * k}`], s + 4 * k),
      ],
      // same as the last row, only one more, jumped twice, counted row 5 as 5
      distractors: wrongs(s + 4 * k, [last, last + 1, last + 2 * k, 5, last + k + 1]),
      operands: [s, k],
      difficulty: d,
    }
  }
  const set = r.shuffle(r.pick(SHAPE_SETS))
  const core = r.pick(CORES[d]).map((i) => set[i])
  const L = core.length
  const used = [...new Set(core)]
  const others = [...used, ...set.filter((e) => !used.includes(e)).slice(0, used.length < 3 ? 1 : 0)]
  if (d === 3) {
    // which shape is number N?
    const T = 2 * L + r.int(0, 1)
    const N = r.int(T + 3, Math.min(20, T + 9))
    const shown = range(0, T - 1).map((i) => core[i % L])
    // way 1: keep writing the pattern
    const long = [...shown]
    while (long.length < N) long.push(long[long.length - L])
    // way 2: jump by whole parts
    const m = Math.floor((N - 1) / L) * L
    const ans = core[N - m - 1]
    return {
      prompt: `The pattern keeps going the same way. Which shape is number ${N}?`,
      eq: `${shown.join(' ')} …`,
      ...choice(ans, others.filter((e) => e !== ans), rng),
      strategies: [
        strat('Keep It Going', [`Keep the pattern going until you have ${N} shapes.`, `${long.join(' ')}`, `Shape number ${N} is ${long[N - 1]}`], long[N - 1]),
        strat(`Count by ${L}s`, [`The part that repeats is ${core.join(' ')}. It has ${L} shapes.`, m ? `A part ends at number ${m}. Then it starts over.` : `The first part is not done yet.`, `${m} + ${N - m} = ${N}. So take shape ${N - m} of the part: ${core[N - m - 1]}`], core[N - m - 1]),
      ],
      operands: [L, N],
      difficulty: d,
    }
  }
  const T = (L === 2 ? 3 : 2) * L + r.int(1, L)
  const hole = d === 2 && r.chance(0.5) ? r.int(L, T - 2) : T
  const seq = range(0, Math.max(T - 1, hole)).map((i) => core[i % L])
  const ans = core[hole % L]
  const back = seq[hole - L]
  return {
    prompt: hole === T ? 'Look at the pattern. What comes next?' : 'Look at the pattern. One shape is hiding. Which shape is it?',
    eq: seq.map((e, i) => (i === hole ? Q : e)).join(' ') + (hole === T ? '' : ' …'),
    ...choice(ans, others.filter((e) => e !== ans), rng),
    strategies: [
      strat('Find the Part That Repeats', [`The part that repeats is ${core.join(' ')}`, `Say it again and again until you get to the blank.`, `You land on ${ans}`], ans),
      strat('Look Back', [`The pattern starts over every ${L} shapes.`, `So count back ${L} shapes from the blank.`, `That shape is ${back}. The blank is the same.`], back),
    ],
    operands: [L, hole],
    difficulty: d,
  }
}

/* ------------------------------ ps.logic-who ------------------------------ */

const ORDER = [
  { gt: 'is taller than', lt: 'is shorter than', top: 'Who is the tallest?', bot: 'Who is the shortest?', notTop: 'is not the tallest', notBot: 'is not the shortest', first: 'tallest' },
  { gt: 'is faster than', lt: 'is slower than', top: 'Who is the fastest?', bot: 'Who is the slowest?', notTop: 'is not the fastest', notBot: 'is not the slowest', first: 'fastest' },
  { gt: 'is older than', lt: 'is younger than', top: 'Who is the oldest?', bot: 'Who is the youngest?', notTop: 'is not the oldest', notBot: 'is not the youngest', first: 'oldest' },
  { gt: 'hit more balls than', lt: 'hit fewer balls than', top: 'Who hit the most balls?', bot: 'Who hit the fewest balls?', notTop: 'did not hit the most', notBot: 'did not hit the fewest', first: 'most balls' },
  { gt: 'has more bricks than', lt: 'has fewer bricks than', top: 'Who has the most bricks?', bot: 'Who has the fewest bricks?', notTop: 'does not have the most', notBot: 'does not have the fewest', first: 'most bricks' },
] as const
const MATCH = [
  { verb: 'picks', noVerb: 'does not pick', what: 'a different sport', things: ['baseball', 'surfing', 'dance'] },
  { verb: 'has', noVerb: 'does not have', what: 'a different pet', things: ['a dog', 'a cat', 'a fish'] },
  { verb: 'wears', noVerb: 'does not wear', what: 'a different color hat', things: ['red', 'blue', 'green'] },
  { verb: 'eats', noVerb: 'does not eat', what: 'a different snack', things: ['an apple', 'a banana', 'grapes'] },
] as const

function logicOrder(r: Rand, rng: () => number, d: 1 | 2 | 3): Item {
  const at = r.pick(ORDER)
  const n = d === 3 ? 4 : 3
  const order = r.shuffle(KIDS).slice(0, n) // order[0] is the top
  let pairs = range(0, n - 2).map((i) => [order[i], order[i + 1]] as [string, string]) // [x, y]: x is above y
  if (d > 1) pairs = r.shuffle(pairs)
  const texts = pairs.map(([x, y]) => (d > 1 && r.chance(0.5) ? `${y} ${at.lt} ${x}.` : `${x} ${at.gt} ${y}.`))
  const ask = d === 3 ? r.pick(['top', 'bot'] as const) : d === 2 ? r.pick(['top', 'bot', 'mid'] as const) : r.pick(['top', 'bot'] as const)
  // proof: try every way to line the kids up
  const names = [...order].sort()
  const fits = perms(names).filter((p) => pairs.every(([x, y]) => p.indexOf(x) < p.indexOf(y)))
  if (fits.length !== 1) throw new Error('logic puzzle is not unique')
  const line = fits[0]
  const ans = ask === 'top' ? line[0] : ask === 'bot' ? line[n - 1] : line[1]
  // way 2: cross out by the clues alone
  let second: Strat
  if (ask === 'mid') {
    const both = names.filter((k) => pairs.some((p) => p[0] === k) && pairs.some((p) => p[1] === k))
    second = strat('Find the Name in Both Clues', [`The kid in the middle is above one kid and below one kid.`, `So that name is in both clues.`, `${both[0]} is in both clues.`], both.length === 1 ? both[0] : '')
  } else {
    const out = new Set(pairs.map((p) => (ask === 'top' ? p[1] : p[0])))
    const left = names.filter((k) => !out.has(k))
    second = strat('Cross Out', [...pairs.map(([x, y]) => `${x} ${at.gt} ${y}. So ${ask === 'top' ? y : x} ${ask === 'top' ? at.notTop : at.notBot}.`), `Only ${left[0]} is left.`], left.length === 1 ? left[0] : '')
  }
  return {
    prompt: `${texts.join(' ')} ${ask === 'top' ? at.top : ask === 'bot' ? at.bot : 'Who is in the middle?'}`,
    ...choice(ans, names.filter((k) => k !== ans), rng),
    strategies: [strat('Line Them Up', [`Write the names in a line, ${at.first} first.`, ...pairs.map(([x, y]) => `${x} goes before ${y}.`), `The line is ${line.join(', ')}.`], ans), second],
    operands: [n, pairs.length],
    difficulty: d,
  }
}

function logicMatch(r: Rand, rng: () => number, d: 1 | 2 | 3): Item {
  for (;;) {
    const m = r.pick(MATCH)
    const kids = r.shuffle(KIDS).slice(0, 3)
    const things = r.shuffle(m.things)
    // kids[i] really has things[i]
    type Clue = { kid: number; thing: number; yes: boolean }
    const clues: Clue[] =
      d === 2
        ? [
            { kid: 0, thing: 2, yes: false },
            { kid: 1, thing: 2, yes: false },
          ]
        : r.chance(0.5)
          ? [
              { kid: 0, thing: 0, yes: true },
              { kid: 1, thing: 2, yes: false },
            ]
          : [
              { kid: 0, thing: 2, yes: false },
              { kid: 1, thing: 2, yes: false },
              { kid: 1, thing: 0, yes: false },
            ]
    const askThing = d === 2 ? 2 : clues.length === 2 ? r.pick([1, 2]) : r.pick([0, 1])
    // proof: try all 6 ways to hand the things out
    const ways = perms([0, 1, 2]).filter((p) => clues.every((c) => (p[c.kid] === c.thing) === c.yes))
    const whoCould = [0, 1, 2].filter((k) => ways.some((p) => p[k] === askThing))
    if (whoCould.length !== 1) continue
    if (d === 3 && ways.length !== 1) continue
    // way 1: use the clues one by one (cross out until one choice is left)
    const can = [0, 1, 2].map(() => new Set([0, 1, 2]))
    const log: string[] = []
    for (const c of clues) {
      if (c.yes) can[c.kid] = new Set([c.thing])
      else can[c.kid].delete(c.thing)
    }
    const done = new Set<number>()
    for (let pass = 0; pass < 4; pass++) {
      for (const k of [0, 1, 2]) {
        if (can[k].size === 1 && !done.has(k)) {
          const t = [...can[k]][0]
          done.add(k)
          log.push(clues.some((c) => c.yes && c.kid === k) ? `A clue says ${kids[k]} ${m.verb} ${things[t]}.` : `${things[t]} is the only one left for ${kids[k]}.`.replace(/^./, (ch) => ch.toUpperCase()))
          for (const o of [0, 1, 2]) if (o !== k) can[o].delete(t)
        }
      }
      for (const t of [0, 1, 2]) {
        const who = [0, 1, 2].filter((k) => can[k].has(t))
        if (who.length === 1 && can[who[0]].size > 1) {
          can[who[0]] = new Set([t])
          done.add(who[0])
          log.push(`Only ${kids[who[0]]} can still have ${things[t]}. So ${kids[who[0]]} ${m.verb} ${things[t]}.`)
          for (const o of [0, 1, 2]) if (o !== who[0]) can[o].delete(t)
        }
      }
    }
    const solved = [0, 1, 2].filter((k) => can[k].size === 1 && can[k].has(askThing))
    if (solved.length !== 1 || log.length < 1) continue
    const ans = kids[whoCould[0]]
    const stepClues = clues.map((c) => `${kids[c.kid]} ${c.yes ? m.verb : m.noVerb} ${things[c.thing]}.`)
    const checks = [0, 1, 2].map((k) => {
      if (k === whoCould[0]) return `${kids[k]}? Yes, that fits every clue.`
      const direct = clues.find((c) => c.kid === k && ((!c.yes && c.thing === askThing) || (c.yes && c.thing !== askThing)))
      return direct ? `${kids[k]}? No. A clue says ${kids[k]} ${direct.yes ? m.verb : m.noVerb} ${things[direct.thing]}.` : `${kids[k]}? No. Then the clues would not all fit.`
    })
    return {
      prompt: `${andList(kids)} each ${m.verb === 'has' ? 'have' : m.verb.replace(/s$/, '')} ${m.what}. ${stepClues.join(' ')} Who ${m.verb} ${things[askThing]}?`,
      ...choice(ans, kids.filter((k) => k !== ans), rng),
      strategies: [strat('Use the Clues One by One', [`Each kid gets one. No two kids get the same one.`, ...log.slice(0, 4)], kids[solved[0]]), strat('Check Each Kid', [`Ask about each kid: could this kid be the one with ${things[askThing]}?`, ...checks], ans)],
      operands: [3, clues.length],
      difficulty: d,
    }
  }
}

const logicWho: Gen = (rng, d) => {
  const r = R(rng)
  return d > 1 && r.chance(d === 2 ? 0.3 : 0.5) ? logicMatch(r, rng, d) : logicOrder(r, rng, d)
}

/* ------------------------------ ps.number-riddles ------------------------------ */

interface Clue {
  text: string
  tag: string
  test: (n: number) => boolean
}
const tensD = (n: number) => Math.floor(n / 10)
function cluesFor(n: number, d: number): Clue[] {
  const t = tensD(n)
  const o = n % 10
  const out: Clue[] = [
    n % 2 === 0 ? { text: 'I am even.', tag: 'Even', test: (x) => x % 2 === 0 } : { text: 'I am odd.', tag: 'Odd', test: (x) => x % 2 === 1 },
    { text: `My digits add up to ${t + o}.`, tag: `Digits add up to ${t + o}`, test: (x) => tensD(x) + (x % 10) === t + o },
    t > o
      ? { text: 'My tens digit is bigger than my ones digit.', tag: 'Tens digit is bigger', test: (x) => tensD(x) > x % 10 }
      : t < o
        ? { text: 'My ones digit is bigger than my tens digit.', tag: 'Ones digit is bigger', test: (x) => tensD(x) < x % 10 }
        : { text: 'My two digits are the same.', tag: 'Both digits the same', test: (x) => tensD(x) === x % 10 },
  ]
  if (n % 5 === 0) out.push({ text: 'You say me when you count by 5s.', tag: 'Count by 5s', test: (x) => x % 5 === 0 })
  if (d >= 2) out.push({ text: `My ones digit is ${o}.`, tag: `Ones digit is ${o}`, test: (x) => x % 10 === o })
  if (d === 3 && t !== o) out.push({ text: `My two digits are ${Math.abs(t - o)} apart.`, tag: `Digits are ${Math.abs(t - o)} apart`, test: (x) => Math.abs(tensD(x) - (x % 10)) === Math.abs(t - o) })
  return out
}
const subsets = (n: number, m: number): number[][] => (m === 0 ? [[]] : n < m ? [] : [...subsets(n - 1, m - 1).map((s) => [...s, n - 1]), ...subsets(n - 1, m)])
const showList = (xs: number[]) => (xs.length <= 10 ? xs.join(', ') : `${xs.slice(0, 3).join(', ')} … ${xs[xs.length - 1]} (${xs.length} numbers)`)

const riddles: Gen = (rng, d) => {
  const r = R(rng)
  for (;;) {
    const lo = d === 1 ? 10 * r.int(1, 7) : d === 2 ? 10 * r.int(1, 5) : 10 * r.int(1, 3)
    const hi = d === 1 ? lo + 20 : d === 2 ? Math.min(100, lo + r.pick([30, 40, 50])) : Math.min(100, lo + r.pick([60, 70, 90]))
    const inside = range(lo + 1, hi - 1)
    const secret = r.pick(inside)
    const pool = r.shuffle(cluesFor(secret, d))
    const m = d === 1 ? 2 : d === 2 ? r.pick([2, 3]) : 3
    // exactly one number fits (even if you count the two ends), and no clue is wasted
    const good = r.shuffle(subsets(pool.length, m)).find((ix) => {
      const cs = ix.map((i) => pool[i])
      if (range(lo, hi).filter((x) => cs.every((c) => c.test(x))).length !== 1) return false
      return cs.every((skip) => inside.filter((x) => cs.every((c) => c === skip || c.test(x))).length > 1)
    })
    if (!good) continue
    const clues = good.map((i) => pool[i]).sort((a, b) => inside.filter(b.test).length - inside.filter(a.test).length)
    // way 1: clues in the order they are read
    let left = inside
    const s1 = [`Between ${lo} and ${hi}: ${showList(left)}`]
    for (const c of clues) {
      left = left.filter(c.test)
      s1.push(`${c.tag}: ${showList(left)}`)
    }
    // way 2: the clue that leaves the fewest numbers goes first
    const ranked = [...clues].reverse()
    let left2 = inside.filter(ranked[0].test)
    const s2 = [`Start with the clue that leaves the fewest numbers. ${ranked[0].tag}: ${showList(left2)}`]
    for (const c of ranked.slice(1)) {
      left2 = left2.filter(c.test)
      s2.push(`Now keep "${c.tag}": ${showList(left2)}`)
    }
    if (left.length !== 1 || left2.length !== 1) continue
    // numbers that fit all the clues but one
    const near = clues.map((skip) => inside.filter((x) => x !== secret && clues.every((c) => c === skip || c.test(x))).sort((a, b) => Math.abs(a - secret) - Math.abs(b - secret))[0])
    return {
      prompt: `I am a number between ${lo} and ${hi}. ${clues.map((c) => c.text).join(' ')} What number am I?`,
      input: 'number',
      answer: secret,
      strategies: [strat('List and Cross Out', s1, left[0]), strat('Best Clue First', s2, left2[0])],
      distractors: wrongs(secret, near.filter((x) => x !== undefined)),
      operands: [lo, hi, clues.length],
      difficulty: d,
    }
  }
}

/* ------------------------------ ps.guess-check ------------------------------ */

const twoBars = (big: string, small: string, extra: string) =>
  `<svg viewBox="0 0 340 112" style="width:100%;max-width:420px;display:block;margin:0 auto" role="img" aria-label="two bars"><rect x="20" y="8" width="190" height="40" rx="8" fill="#c8e6c9" stroke="#37474f" stroke-width="2.5"/><text x="115" y="35" text-anchor="middle" font-size="20" font-weight="700" fill="#1d2b36">${small}</text><rect x="210" y="8" width="110" height="40" rx="8" fill="#fff3c4" stroke="#d84315" stroke-width="2.5" stroke-dasharray="7 5"/><text x="265" y="35" text-anchor="middle" font-size="20" font-weight="700" fill="#d84315">${extra}</text><rect x="20" y="62" width="190" height="40" rx="8" fill="#c8e6c9" stroke="#37474f" stroke-width="2.5"/><text x="115" y="89" text-anchor="middle" font-size="20" font-weight="700" fill="#1d2b36">${small}</text><text x="265" y="89" text-anchor="middle" font-size="14" fill="#546e7a">${big}</text></svg>`
const GC = [
  { noun: 'cards', verb: 'have' },
  { noun: 'bricks', verb: 'have' },
  { noun: 'shells', verb: 'have' },
  { noun: 'stickers', verb: 'have' },
] as const

const guessCheck: Gen = (rng, d) => {
  const r = R(rng)
  const small = d === 1 ? r.int(2, 8) : d === 2 ? r.int(6, 20) : r.int(15, 40)
  const D = d === 1 ? r.int(1, 3) * 2 - (r.chance(0.3) ? 1 : 0) : d === 2 ? r.int(2, 12) : r.int(4, 28)
  const big = small + D
  const S = big + small
  const askBig = r.chance(0.6)
  // proof: only one pair has this sum and this gap
  const pairs = range(0, S)
    .map((y) => [S - y, y])
    .filter(([x, y]) => x >= y && x - y === D)
  if (pairs.length !== 1) throw new Error('guess-check is not unique')
  const [fx, fy] = pairs[0]
  // guess and check: start in the middle and slide until the gap is right
  let gy = Math.floor(S / 2)
  let gx = S - gy
  const first = [gx, gy]
  while (gx - gy < D) {
    gx += 1
    gy -= 1
  }
  const mid = [Math.floor((first[0] + gx) / 2), S - Math.floor((first[0] + gx) / 2)]
  const tries = [first, mid].filter(([x, y], i, a) => x - y !== D && (i === 0 || x !== a[0][0]))
  const ans = askBig ? fx : fy
  const c = r.pick(GC)
  const o = r.pick(KIDS)
  const story = d > 1 && r.chance(0.5)
  return {
    prompt: story
      ? `{n} and ${o} ${c.verb} ${S} ${c.noun} in all. {n} has ${D} more than ${o}. How many ${c.noun} does ${askBig ? '{n}' : o} have?`
      : `Two numbers add up to ${S}. One number is ${D} more than the other. What is the ${askBig ? 'bigger' : 'smaller'} number?`,
    input: 'number',
    answer: ans,
    strategies: [
      strat('Guess and Check', [...tries.map(([x, y]) => `Try ${x} and ${y}. They add up to ${S}. The gap is ${x - y}. That is too small.`), `Make one number bigger and the other smaller.`, `Try ${gx} and ${gy}: ${gx} + ${gy} = ${gx + gy} and ${gx} − ${gy} = ${gx - gy}. Yes!`], askBig ? gx : gy),
      strat('Take Off the Extra', [`Take the extra ${D} away: ${S} − ${D} = ${S - D}`, `Now both numbers are the same. Split it in half: ${S - D} ÷ 2 = ${(S - D) / 2}`, `The smaller number is ${(S - D) / 2}. The bigger is ${(S - D) / 2} + ${D} = ${(S - D) / 2 + D}`], askBig ? (S - D) / 2 + D : (S - D) / 2, { html: twoBars(`in all: ${S}`, '?', `${D} more`) }),
    ],
    // gave the other number, only split in half, only took the extra off
    distractors: wrongs(ans, [askBig ? fy : fx, ...(S % 2 ? [] : [S / 2]), S - D, D, ans + 1]),
    operands: [S, D],
    difficulty: d,
  }
}

/* ------------------------------ ps.work-backwards ------------------------------ */

type Op = { t: 'add' | 'sub'; k: number } | { t: 'dbl' } | { t: 'half' }
const applyOp = (v: number, op: Op): number | null => (op.t === 'add' ? v + op.k : op.t === 'sub' ? (v - op.k >= 0 ? v - op.k : null) : op.t === 'dbl' ? v * 2 : v % 2 === 0 ? v / 2 : null)
const run = (v: number, ops: Op[]): number[] | null => {
  const out = [v]
  for (const op of ops) {
    const nx = applyOp(out[out.length - 1], op)
    if (nx === null) return null
    out.push(nx)
  }
  return out
}
const sayOp = (op: Op) => (op.t === 'add' ? `I add ${op.k}.` : op.t === 'sub' ? `I take away ${op.k}.` : op.t === 'dbl' ? 'I double it.' : 'I cut it in half.')

const workBackwards: Gen = (rng, d) => {
  const r = R(rng)
  for (;;) {
    const start = d === 1 ? r.int(3, 15) : d === 2 ? r.int(3, 20) : r.int(4, 30)
    const n = d === 3 ? 3 : 2
    const ops: Op[] = []
    for (let i = 0; i < n; i++) {
      const kind = d === 1 ? r.pick(['add', 'sub'] as const) : r.pick(['add', 'sub', 'dbl', 'half'] as const)
      ops.push(kind === 'add' || kind === 'sub' ? { t: kind, k: r.int(2, d === 3 ? 12 : 9) } : { t: kind })
    }
    const kinds = ops.map((o) => o.t)
    if (d > 1 && !kinds.some((k) => k === 'dbl' || k === 'half')) continue
    if (d > 1 && !kinds.some((k) => k === 'add' || k === 'sub')) continue
    if (kinds.some((k, i) => i > 0 && ((k === 'dbl' && kinds[i - 1] === 'half') || (k === 'half' && kinds[i - 1] === 'dbl') || (k === kinds[i - 1] && d > 1)))) continue
    const path = run(start, ops)
    if (!path || path.some((v) => v < 1 || v > 100) || new Set(path).size !== path.length) continue
    const end = path[n]
    // proof: only one start number gets to the end
    const fits = range(0, 250).filter((s) => {
      const p = run(s, ops)
      return !!p && p[n] === end
    })
    if (fits.length !== 1) continue
    // way 1: undo each step, last step first
    let v = end
    const undo = [`Start at the end: ${end}. Go backwards and do the opposite each time.`]
    const pts = [end]
    for (const op of [...ops].reverse()) {
      if (op.t === 'add') {
        undo.push(`The opposite of adding ${op.k} is taking away ${op.k}: ${v} − ${op.k} = ${v - op.k}`)
        v -= op.k
      } else if (op.t === 'sub') {
        undo.push(`The opposite of taking away ${op.k} is adding ${op.k}: ${v} + ${op.k} = ${v + op.k}`)
        v += op.k
      } else if (op.t === 'dbl') {
        undo.push(`The opposite of doubling is cutting in half: ${v} ÷ 2 = ${v / 2}`)
        v /= 2
      } else {
        undo.push(`The opposite of cutting in half is doubling: ${v} × 2 = ${v * 2}`)
        v *= 2
      }
      pts.push(v)
    }
    // way 2: guess and check
    const g0 = [start - 2, start + 2, start - 4, start + 4, start - 1, start + 1].find((g) => g >= 1 && !!run(g, ops))
    const tryText = (g: number) => `Try ${g}: ${run(g, ops)!.join(' → ')}.`
    const guess = [...(g0 !== undefined ? [`${tryText(g0)} That ends too ${run(g0, ops)![n] > end ? 'big' : 'small'}. Pick a ${run(g0, ops)![n] > end ? 'smaller' : 'bigger'} start.`] : ['Pick a start number and do every step.']), `${tryText(fits[0])} That ends on ${end}. Yes!`]
    // slips: went forwards from the end, undid only the last step, undid in the wrong order
    const fwd = run(end, ops)
    const inv = (x: number, op: Op) => (op.t === 'add' ? x - op.k : op.t === 'sub' ? x + op.k : op.t === 'dbl' ? x / 2 : x * 2)
    const wrongOrder = ops.reduce((x, op) => inv(x, op), end)
    return {
      prompt: `I think of a number. ${ops.map((op, i) => (i === 0 ? sayOp(op) : `Then ${sayOp(op).replace(/^I/, 'I')}`)).join(' ')} Now I have ${end}. What was my number?`,
      input: 'number',
      answer: start,
      strategies: [strat('Undo Each Step', undo, v, kinds.every((k) => k === 'add' || k === 'sub') ? { line: pts } : {}), strat('Guess and Check', guess, fits[0])],
      distractors: wrongs(start, [...(fwd ? [fwd[n]] : []), pts[1], ...(Number.isInteger(wrongOrder) ? [wrongOrder] : []), start + 1, start - 1].filter((x) => x <= 400)),
      operands: [start, end, n],
      difficulty: d,
    }
  }
}

/* ------------------------------ ps.missing-digits ------------------------------ */

const digAt = (n: number, pl: number) => Math.floor(n / pl) % 10
const PLACE: Record<number, string> = { 1: 'ones', 10: 'tens', 100: 'hundreds' }
const stack = (rows: string[], op: string) =>
  `<div style="text-align:center"><div style="display:inline-block;text-align:right;font:700 30px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#1d2b36"><div>${rows[0]}</div><div><span style="color:#d84315;margin-right:14px">${op}</span>${rows[1]}</div><div style="border-top:4px solid #37474f">${rows[2]}</div></div></div>`

const missingDigits: Gen = (rng, d) => {
  const r = R(rng)
  for (;;) {
    const plus = d === 1 ? true : r.chance()
    let a: number
    let b: number
    if (d === 1) {
      a = r.int(1, 7) * 10 + r.int(1, 8)
      b = r.int(1, 8 - tensD(a)) * 10 + r.int(1, 9 - (a % 10))
    } else if (d === 2) {
      a = r.int(13, 98)
      b = plus ? r.int(12, 99 - a < 12 ? 12 : 99 - a) : r.int(12, a - 3 < 12 ? 12 : a - 3)
    } else {
      a = r.int(120, 989)
      b = plus ? r.int(25, 999 - a < 25 ? 25 : 999 - a) : r.int(25, a - 20 < 25 ? 25 : a - 20)
    }
    const c = plus ? a + b : a - b
    if (c < (d === 3 ? 100 : 10) || c > (d === 3 ? 999 : 99) || b >= (plus ? 1000 : a)) continue
    if (d === 2 && (plus ? (a % 10) + (b % 10) < 10 : a % 10 >= b % 10) && r.chance(0.8)) continue // mostly with a carry or a trade
    const nums = [a, b, c]
    const which = d === 1 ? r.int(0, 1) : r.int(0, 2)
    const len = String(nums[which]).length
    const pl = 10 ** r.int(0, len - 1)
    const hidden = digAt(nums[which], pl)
    // proof: only one digit makes it true
    const withDigit = (g: number) => nums.map((v, i) => (i === which ? v - hidden * pl + g * pl : v))
    const fits = range(pl === 10 ** (len - 1) && len > 1 ? 1 : 0, 9).filter((g) => {
      const [x, y, z] = withDigit(g)
      return plus ? x + y === z : x - y === z
    })
    if (fits.length !== 1) continue
    const show = (v: number, i: number, box: string) => (i === which ? String(v).split('').map((ch, j, all) => (10 ** (all.length - 1 - j) === pl ? box : ch)).join('') : String(v))
    const txt = nums.map((v, i) => show(v, i, '_'))
    const sg = plus ? '+' : '−'
    // way 1: find the whole hidden number with the opposite operation
    const whole = plus ? (which === 0 ? c - b : which === 1 ? c - a : a + b) : which === 0 ? c + b : which === 1 ? a - c : a - b
    const expr = plus ? (which === 0 ? `${c} − ${b}` : which === 1 ? `${c} − ${a}` : `${a} + ${b}`) : which === 0 ? `${c} + ${b}` : which === 1 ? `${a} − ${c}` : `${a} − ${b}`
    const s1 = strat('Find the Whole Number', [which === 2 ? `Just work it out: ${expr} = ${whole}` : `Use the opposite to find the whole hidden number: ${expr} = ${whole}`, `Put ${whole} next to ${txt[which]}. The hidden digit is ${digAt(whole, pl)}.`], digAt(whole, pl))
    // way 2: look only at the column with the hidden digit
    const [da, db, dc] = nums.map((v) => digAt(v, pl))
    const name = PLACE[pl]
    let s2: Strat
    if (plus) {
      const cin = pl > 1 && (a % pl) + (b % pl) >= pl ? 1 : 0
      const carried = cin ? ' + 1' : ''
      if (which === 2) {
        const t = da + db + cin
        s2 = strat('Look at One Column', [`Look at the ${name} column.${cin ? ' The column on its right carried 1 over.' : ''}`, `${da} + ${db}${carried} = ${t}`, `Write the ${t % 10}. That is the hidden digit.`], t % 10)
      } else {
        const known = which === 0 ? db : da
        const x = (dc - known - cin + 20) % 10
        s2 = strat('Look at One Column', [`Look at the ${name} column.${cin ? ' The column on its right carried 1 over.' : ''}`, `What digit plus ${known}${cin ? ' plus 1' : ''} ends in ${dc}?`, `${x} + ${known}${carried} = ${x + known + cin}. It ends in ${dc}, so the digit is ${x}.`], x)
      }
    } else {
      const gave = pl > 1 && a % pl < b % pl ? 1 : 0
      if (which === 0) {
        const t = db + dc + gave
        s2 = strat('Look at One Column', [`Look at the ${name} column. Add back: bottom plus answer makes the top.`, `${db} + ${dc}${gave ? ' + 1' : ''} = ${t}${gave ? ' (the 1 was traded away)' : ''}`, `The top digit is ${t % 10}.`], t % 10)
      } else {
        const sub = which === 1 ? dc : db
        const top = da - gave + (da - gave < sub ? 10 : 0)
        s2 = strat('Look at One Column', [`Look at the ${name} column. After any trades, the top of this column is ${top}.`, `${top} − ${sub} = ${top - sub}`, `The hidden digit is ${top - sub}.`], top - sub)
      }
    }
    return {
      prompt: `One digit is hiding. What digit makes this ${plus ? 'addition' : 'subtraction'} true?`,
      eq: `${show(a, 0, Q)} ${sg} ${show(b, 1, Q)} = ${show(c, 2, Q)}`,
      input: 'number',
      answer: fits[0],
      strategies: [s1, { ...s2, html: stack(txt.map((t) => t.replace('_', '<span style="color:#d84315">?</span>')), sg) }],
      // forgot the carry or the trade, took the small digit from the big digit, used the digit beside it
      distractors: wrongs(fits[0], [(fits[0] + 1) % 10, (fits[0] + 9) % 10, Math.abs(dc - (which === 0 ? db : da)), which === 2 ? (plus ? Math.abs(da - db) : (da + db) % 10) : dc]),
      operands: [a, b, c, pl],
      difficulty: d,
    }
  }
}

/* ------------------------------ ps.combinations ------------------------------ */

const SETS = [
  { cats: ['hats', 'shirts', 'shoes'], one: ['hat', 'shirt', 'pair of shoes'], e: [['🧢', '🎩', '👒', '🤠'], ['👕', '🎽', '👔', '🥋'], ['👟', '🥾', '🩴']], combo: 'outfits', a: 'An outfit' },
  { cats: ['snacks', 'drinks', 'treats'], one: ['snack', 'drink', 'treat'], e: [['🍎', '🍌', '🍇', '🥕'], ['🥛', '🧃', '💧', '🍵'], ['🍪', '🍩', '🧁']], combo: 'lunches', a: 'A lunch' },
  { cats: ['big bricks', 'small bricks', 'flags'], one: ['big brick', 'small brick', 'flag'], e: [['🟥', '🟦', '🟩', '🟨'], ['🔴', '🔵', '🟢', '🟡'], ['🚩', '🏁', '🏴']], combo: 'towers', a: 'A tower' },
] as const
const rowsHTML = (rows: string[]) => `<div style="display:inline-block;text-align:center">${rows.map((x) => `<div style="font-size:30px;letter-spacing:6px;margin:4px 0">${x}</div>`).join('')}</div>`

const combinations: Gen = (rng, d) => {
  const r = R(rng)
  const kind = d === 1 ? 'two' : d === 2 ? r.pick(['two', 'two', 'lineup'] as const) : r.pick(['three', 'pairs', 'firstSecond', 'two'] as const)
  if (kind === 'two' || kind === 'three') {
    const s = r.pick(SETS)
    const [A, B] = d === 1 ? r.pick([[2, 2], [2, 3], [3, 2]] as const) : d === 2 ? r.pick([[2, 4], [3, 3], [4, 2], [3, 4], [4, 3]] as const) : kind === 'two' ? r.pick([[3, 4], [4, 3], [4, 4]] as const) : r.pick([[2, 2], [2, 3], [3, 2]] as const)
    const C = kind === 'three' ? (A * B === 4 ? r.pick([2, 3]) : 2) : 1
    const ea = s.e[0].slice(0, A)
    const eb = s.e[1].slice(0, B)
    const ec = kind === 'three' ? s.e[2].slice(0, C) : ['']
    // way 1: list every one
    const all: string[] = []
    const lines: string[] = []
    for (const x of ea) {
      const mine: string[] = []
      for (const y of eb) for (const z of ec) mine.push(x + y + z)
      all.push(...mine)
      lines.push(`With ${x}: ${mine.join('  ')}`)
    }
    const ans = A * B * C
    const rule = kind === 'three' ? `${s.a} is 1 ${s.one[0]}, 1 ${s.one[1]} and 1 ${s.one[2]}.` : `${s.a} is 1 ${s.one[0]} and 1 ${s.one[1]}.`
    const have = kind === 'three' ? `${A} ${s.cats[0]}, ${B} ${s.cats[1]} and ${C} ${s.cats[2]}` : `${A} ${s.cats[0]} and ${B} ${s.cats[1]}`
    return {
      prompt: `{n} has ${have}. ${rule} How many different ${s.combo} can {n} make?`,
      visual: rowsHTML([ea.join(''), eb.join(''), ...(kind === 'three' ? [ec.join('')] : [])]),
      input: 'number',
      answer: ans,
      strategies: [
        strat('Make a List', ['List them in order so you do not miss any.', ...lines, `Count them all: ${all.length}`], all.length),
        kind === 'three'
          ? strat('Multiply', [`Each ${s.one[0]} can go with ${B} ${s.cats[1]}: ${A} × ${B} = ${A * B}`, `Each of those can go with ${C} ${s.cats[2]}.`, `${A * B} × ${C} = ${A * B * C}`], A * B * C)
          : strat('Multiply', [`Each ${s.one[0]} can go with ${B} ${s.cats[1]}.`, `There are ${A} ${s.cats[0]}. That is ${A} groups of ${B}.`, `${A} × ${B} = ${A * B}`], A * B, { html: arrayHTML(A, B) }),
      ],
      // added the piles, counted one pile only, off by one
      distractors: wrongs(ans, [A + B + (kind === 'three' ? C : 0), kind === 'three' ? A * B : Math.max(A, B), ans - 1, ans + 2]),
      operands: kind === 'three' ? [A, B, C] : [A, B],
      difficulty: d,
    }
  }
  if (kind === 'lineup') {
    const k = r.shuffle(KIDS).slice(0, 3)
    const all = perms([...k])
    const what = r.pick(['line up to bat', 'line up for the slide', 'stand in a row for a photo'] as const)
    return {
      prompt: `${andList(k)} ${what}. How many different orders can they be in?`,
      input: 'number',
      answer: 6,
      strategies: [
        strat('Make a List', [...k.map((x) => `${x} first: ${all.filter((p) => p[0] === x).map((p) => p.join(' ')).join(',  ')}`), `Count them all: ${all.length}`], all.length),
        strat('Multiply', ['3 kids can go first.', 'Then 2 kids are left to go next. Then 1 kid goes last.', `3 × 2 × 1 = ${3 * 2 * 1}`], 3 * 2 * 1),
      ],
      // one order per kid, added, squared
      distractors: wrongs(6, [3, 5, 9, 4]),
      operands: [3],
      difficulty: d,
    }
  }
  if (kind === 'firstSecond') {
    const n = r.pick([3, 4])
    const k = r.shuffle(KIDS).slice(0, n)
    const all = k.flatMap((x) => k.filter((y) => y !== x).map((y) => `${x} then ${y}`))
    return {
      prompt: `${andList(k)} run a race. One kid comes in first. One kid comes in second. How many ways can first and second go?`,
      input: 'number',
      answer: n * (n - 1),
      strategies: [
        strat('Make a List', [...k.map((x) => `${x} first: ${all.filter((p) => p.startsWith(x)).join(',  ')}`), `Count them all: ${all.length}`], all.length),
        strat('Multiply', [`${n} kids can be first.`, `Then ${n - 1} kids are left to be second.`, `${n} × ${n - 1} = ${n * (n - 1)}`], n * (n - 1)),
      ],
      // a kid cannot be first and second, added, forgot the order
      distractors: wrongs(n * (n - 1), [n * n, n + (n - 1), (n * (n - 1)) / 2, n]),
      operands: [n, 2],
      difficulty: d,
    }
  }
  const n = r.pick([3, 4, 5])
  const k = r.shuffle(KIDS).slice(0, n)
  const act = r.pick([
    { ask: 'Each kid gives a high five to every other kid one time. How many high fives?', thing: 'high fives' },
    { ask: 'Each kid plays catch with every other kid one time. How many games of catch?', thing: 'games' },
  ] as const)
  const all: string[] = []
  const lines: string[] = []
  k.forEach((x, i) => {
    const mine = k.slice(i + 1).map((y) => `${x}-${y}`)
    all.push(...mine)
    if (mine.length) lines.push(`${i ? `New ones for ${x}` : x}: ${mine.join(', ')}`)
  })
  const adds = range(1, n - 1).reverse()
  return {
    prompt: `${n} kids are at the park. ${act.ask}`,
    input: 'number',
    answer: (n * (n - 1)) / 2,
    strategies: [
      strat('Make a List', [`Call the kids ${andList(k)}. List each pair one time.`, ...lines, `Count them all: ${all.length}`], all.length),
      strat('Add as You Go', [`The first kid has ${n - 1} ${act.thing}. The next kid has ${n - 2} new ${n - 2 === 1 ? 'one' : 'ones'}, and so on.`, `${adds.join(' + ')} = ${sum(adds)}`], sum(adds)),
    ],
    // counted every pair twice, one per kid, off by one
    distractors: wrongs((n * (n - 1)) / 2, [n * (n - 1), n, n * 2, (n * (n - 1)) / 2 + 1]),
    operands: [n],
    difficulty: d,
  }
}

/* ------------------------------ ps.venn-sort ------------------------------ */

interface Rule {
  desc: string
  short: string
  not: string
  test: (x: number) => boolean
  yes: (x: number) => string
  no: (x: number) => string
  hard?: boolean
}
const RULES = (N: number, K: number): Rule[] => [
  { desc: 'even numbers', short: 'even', not: 'not even', test: (x) => x % 2 === 0, yes: (x) => `${x} is even`, no: (x) => `${x} is not even` },
  { desc: 'odd numbers', short: 'odd', not: 'not odd', test: (x) => x % 2 === 1, yes: (x) => `${x} is odd`, no: (x) => `${x} is not odd` },
  { desc: `numbers bigger than ${N}`, short: `bigger than ${N}`, not: `not bigger than ${N}`, test: (x) => x > N, yes: (x) => `${x} is bigger than ${N}`, no: (x) => `${x} is not bigger than ${N}` },
  { desc: `numbers less than ${N}`, short: `less than ${N}`, not: `not less than ${N}`, test: (x) => x < N, yes: (x) => `${x} is less than ${N}`, no: (x) => `${x} is not less than ${N}` },
  { desc: 'numbers you say when you count by 5s', short: 'count by 5s', not: 'not count by 5s', test: (x) => x % 5 === 0, yes: (x) => `${x} is a count-by-5 number`, no: (x) => `${x} is not a count-by-5 number`, hard: true },
  { desc: `numbers with the digit ${K}`, short: `has a ${K}`, not: `has no ${K}`, test: (x) => String(x).includes(String(K)), yes: (x) => `${x} has a ${K} in it`, no: (x) => `${x} has no ${K} in it`, hard: true },
  { desc: 'numbers with 2 digits', short: '2 digits', not: 'not 2 digits', test: (x) => x >= 10 && x <= 99, yes: (x) => `${x} has 2 digits`, no: (x) => `${x} does not have 2 digits`, hard: true },
]
const vennSVG = (a: string, b: string) =>
  `<svg viewBox="0 0 360 210" style="width:100%;max-width:400px;display:block;margin:0 auto" role="img" aria-label="two circles that overlap"><rect x="4" y="4" width="352" height="166" rx="12" fill="#fffdf5" stroke="#90a4ae" stroke-width="2"/><circle cx="135" cy="90" r="70" fill="#bbdefb" fill-opacity="0.7" stroke="#1565c0" stroke-width="3"/><circle cx="225" cy="90" r="70" fill="#ffe082" fill-opacity="0.6" stroke="#e65100" stroke-width="3"/><text x="100" y="97" text-anchor="middle" font-size="26" font-weight="700" fill="#0d47a1">A</text><text x="260" y="97" text-anchor="middle" font-size="26" font-weight="700" fill="#bf360c">B</text><text x="8" y="190" font-size="15" font-weight="700" fill="#0d47a1">A: ${a}</text><text x="352" y="190" text-anchor="end" font-size="15" font-weight="700" fill="#bf360c">B: ${b}</text><text x="180" y="207" text-anchor="middle" font-size="14" fill="#546e7a">the middle is in both circles</text></svg>`
const PLACES = [
  { label: 'Only A', a: true, b: false, ask: 'only in circle A' },
  { label: 'Only B', a: false, b: true, ask: 'only in circle B' },
  { label: 'Both A and B', a: true, b: true, ask: 'in both circles' },
  { label: 'Not A or B', a: false, b: false, ask: 'outside both circles' },
] as const

const vennSort: Gen = (rng, d) => {
  const r = R(rng)
  for (;;) {
    const N = r.pick([10, 15, 20, 25, 30])
    const K = r.int(1, 5)
    const pool = RULES(N, K).filter((x) => d > 1 || !x.hard)
    const [A, B] = r.shuffle(pool)
    const hi = d === 1 ? 40 : 60
    const nums = range(1, hi)
    const region = (x: number) => PLACES.find((p) => p.a === A.test(x) && p.b === B.test(x))!
    // every part of the picture must have some numbers, or the two rules are a bad pair
    if (PLACES.some((p) => nums.filter((x) => region(x) === p).length < 2)) continue
    const where = d === 1 || (d === 2 && r.chance(0.5))
    const head = `Circle A is for ${A.desc}. Circle B is for ${B.desc}.`
    if (where) {
      const want = r.pick(PLACES)
      const x = r.pick(nums.filter((v) => region(v) === want))
      const inA = A.test(x)
      const inB = B.test(x)
      // way 2: cross out the places that cannot be right
      let left = [...PLACES]
      left = left.filter((p) => p.a === inA)
      const afterA = left.map((p) => p.label)
      left = left.filter((p) => p.b === inB)
      return {
        prompt: `${head} Where does ${x} go?`,
        visual: vennSVG(A.short, B.short),
        ...choice(want.label, PLACES.map((p) => p.label), rng, true),
        strategies: [
          strat('Ask Two Questions', [`Does ${x} go in circle A? ${inA ? `Yes, ${A.yes(x)}.` : `No, ${A.no(x)}.`}`, `Does ${x} go in circle B? ${inB ? `Yes, ${B.yes(x)}.` : `No, ${B.no(x)}.`}`, `${inA && inB ? 'Yes and yes' : inA ? 'Yes for A, no for B' : inB ? 'No for A, yes for B' : 'No and no'}: ${PLACES.find((p) => p.a === inA && p.b === inB)!.label}.`], PLACES.find((p) => p.a === inA && p.b === inB)!.label),
          strat('Cross Out', [`There are 4 places: ${PLACES.map((p) => p.label).join(', ')}.`, `${inA ? A.yes(x) : A.no(x)}. Keep: ${afterA.join(', ')}.`.replace(/^./, (c) => c.toUpperCase()), `${inB ? B.yes(x) : B.no(x)}. Only one is left: ${left[0].label}.`.replace(/^./, (c) => c.toUpperCase())], left.length === 1 ? left[0].label : ''),
        ],
        operands: [x, N],
        difficulty: d,
      }
    }
    // which number goes in the asked part? one number from each part
    const want = d === 3 ? r.pick(PLACES) : r.pick([PLACES[2], PLACES[2], PLACES[3]])
    const picks = PLACES.map((p) => r.pick(nums.filter((v) => region(v) === p)))
    const fitsWant = picks.filter((v) => region(v) === want)
    if (fitsWant.length !== 1 || new Set(picks).size !== 4) continue
    const ans = fitsWant[0]
    const sorted = [...picks].sort((x, y) => x - y)
    const keepA = sorted.filter((v) => A.test(v) === want.a)
    const keepB = keepA.filter((v) => B.test(v) === want.b)
    return {
      prompt: `${head} Which number goes ${want.ask}?`,
      visual: vennSVG(A.short, B.short),
      ...choice(String(ans), picks.filter((v) => v !== ans).map(String), rng),
      strategies: [
        strat('Check Each Number', [...sorted.map((v) => `${v}: ${A.test(v) ? 'in A' : 'not in A'}, ${B.test(v) ? 'in B' : 'not in B'}. ${region(v) === want ? 'That is the one!' : `That is "${region(v).label}".`}`)], String(sorted.find((v) => region(v) === want))),
        strat('One Rule at a Time', [`You need ${want.a ? 'in A' : 'not in A'} and ${want.b ? 'in B' : 'not in B'}.`, `${want.a ? `In A (${A.short})` : `Not in A (${A.not})`}: ${keepA.join(', ')}`, `${want.b ? `Also in B (${B.short})` : `And not in B (${B.not})`}: ${keepB.join(', ')}`], keepB.length === 1 ? String(keepB[0]) : ''),
      ],
      operands: [...sorted, N],
      difficulty: d,
    }
  }
}

/* ------------------------------ ps.balance-scales ------------------------------ */

type Thing = 'triangle' | 'square' | 'circle' | 'star' | number
const drawThing = (t: Thing, cx: number, cy: number) => {
  if (typeof t === 'number') return `<rect x="${cx - 15}" y="${cy - 13}" width="30" height="27" rx="5" fill="#cfd8dc" stroke="#37474f" stroke-width="2"/><text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d2b36">${t}</text>`
  if (t === 'triangle') return `<polygon points="${cx},${cy - 14} ${cx + 14},${cy + 13} ${cx - 14},${cy + 13}" fill="#ef5350" stroke="#37474f" stroke-width="2"/>`
  if (t === 'square') return `<rect x="${cx - 13}" y="${cy - 13}" width="26" height="26" fill="#42a5f5" stroke="#37474f" stroke-width="2"/>`
  if (t === 'circle') return `<circle cx="${cx}" cy="${cy}" r="13" fill="#66bb6a" stroke="#37474f" stroke-width="2"/>`
  const pts = range(0, 9)
    .map((i) => {
      const rad = i % 2 ? 6.5 : 15
      const ang = (Math.PI / 5) * i - Math.PI / 2
      return `${(cx + rad * Math.cos(ang)).toFixed(1)},${(cy + rad * Math.sin(ang)).toFixed(1)}`
    })
    .join(' ')
  return `<polygon points="${pts}" fill="#ffb300" stroke="#37474f" stroke-width="2"/>`
}
const scaleSVG = (left: Thing[], right: Thing[], label = '') => {
  const pan = (xs: Thing[], cx: number) => xs.map((t, i) => drawThing(t, cx + (i - (xs.length - 1) / 2) * 31, 62)).join('')
  return `<svg viewBox="0 0 360 132" style="width:100%;max-width:420px;display:block;margin:0 auto" role="img" aria-label="a level balance scale">${label ? `<text x="180" y="16" text-anchor="middle" font-size="15" font-weight="700" fill="#546e7a">${label}</text>` : ''}${pan(left, 92)}${pan(right, 268)}<rect x="10" y="78" width="164" height="7" rx="3" fill="#37474f"/><rect x="186" y="78" width="164" height="7" rx="3" fill="#37474f"/><rect x="88" y="85" width="8" height="12" fill="#37474f"/><rect x="264" y="85" width="8" height="12" fill="#37474f"/><rect x="60" y="96" width="240" height="7" rx="3" fill="#8d6e63"/><polygon points="180,103 160,128 200,128" fill="#8d6e63"/></svg>`
}
const SHAPES = ['triangle', 'square', 'circle', 'star'] as const
const rep = (t: Thing, n: number): Thing[] => Array.from({ length: n }, () => t)

const balance: Gen = (rng, d) => {
  const r = R(rng)
  const [sh, sh2] = r.shuffle(SHAPES)
  const type = d === 1 ? r.pick(['share', 'plus'] as const) : d === 2 ? r.pick(['sharePlus', 'bothSides', 'sharePlus'] as const) : r.pick(['twoA', 'twoB', 'bothSides'] as const)
  const w = d === 1 ? r.int(2, 9) : d === 2 ? r.int(2, 10) : r.int(3, 12)
  const weighs = (xs: Thing[], vals: Record<string, number>) => sum(xs.map((t) => (typeof t === 'number' ? t : vals[t])))
  // every scale as [left pan, right pan]
  let scales: [Thing[], Thing[]][]
  let prompt: string
  let strategies: Strat[]
  let distractors: number[]
  let ans = w
  let operands: number[]
  const g = w > 2 ? w - 1 : w + 1 // a first guess for guess-and-check
  const tooWord = (got: number, want: number) => (got > want ? 'Too heavy.' : 'Too light.')
  if (type === 'share') {
    const n = r.int(2, 5)
    const W = n * w
    scales = [[rep(sh, n), [W]]]
    prompt = `The scale is level. On one side: ${n} ${sh}s. On the other side: a weight of ${W}. Every ${sh} weighs the same. What does 1 ${sh} weigh?`
    strategies = [strat('Share It Out', [`${n} ${sh}s weigh ${W} in all. Share ${W} into ${n} equal parts.`, `${W} ÷ ${n} = ${W / n}`], W / n), strat('Guess and Check', [`Try ${g}: ${n} × ${g} = ${n * g}. ${tooWord(n * g, W)}`, `Try ${w}: ${n} × ${w} = ${n * w}. It is level!`], 0)]
    distractors = wrongs(w, [W - n, W, w + 1, w - 1])
    operands = [n, W]
  } else if (type === 'plus') {
    const k = r.int(2, 9)
    const W = w + k
    scales = [[[sh, k], [W]]]
    prompt = `The scale is level. On one side: 1 ${sh} and a weight of ${k}. On the other side: a weight of ${W}. What does the ${sh} weigh?`
    strategies = [strat('Take the Same Off Both Sides', [`Take ${k} off both sides. The scale stays level.`, `${W} − ${k} = ${W - k}`, `Now the ${sh} is alone. It weighs ${W - k}.`], W - k), strat('Guess and Check', [`Try ${g}: ${g} + ${k} = ${g + k}. ${tooWord(g + k, W)}`, `Try ${w}: ${w} + ${k} = ${w + k}. It is level!`], 0)]
    distractors = wrongs(w, [W + k, W, k, w + 1])
    operands = [1, k, W]
  } else if (type === 'sharePlus') {
    const n = r.int(2, 4)
    const k = r.int(2, 9)
    const W = n * w + k
    scales = [[[...rep(sh, n), k], [W]]]
    prompt = `The scale is level. On one side: ${n} ${sh}s and a weight of ${k}. On the other side: a weight of ${W}. Every ${sh} weighs the same. What does 1 ${sh} weigh?`
    strategies = [strat('Take the Same Off Both Sides', [`Take ${k} off both sides: ${W} − ${k} = ${W - k}`, `Now ${n} ${sh}s weigh ${W - k}. Share it out.`, `${W - k} ÷ ${n} = ${(W - k) / n}`], (W - k) / n), strat('Guess and Check', [`Try ${g}: ${n} × ${g} + ${k} = ${n * g + k}. ${tooWord(n * g + k, W)}`, `Try ${w}: ${n} × ${w} + ${k} = ${n * w + k}. It is level!`], 0)]
    distractors = wrongs(w, [W - k, Math.floor(W / n), W - k - n, w + 1])
    operands = [n, k, W]
  } else if (type === 'bothSides') {
    const n = r.int(1, 2)
    const m = n + r.int(d === 3 ? 2 : 1, 3)
    const k = (m - n) * w
    scales = [[rep(sh, m), [...rep(sh, n), k]]]
    prompt = `The scale is level. On one side: ${m} ${sh}s. On the other side: ${plural(n, sh)} and a weight of ${k}. Every ${sh} weighs the same. What does 1 ${sh} weigh?`
    strategies = [
      strat('Take the Same Off Both Sides', m - n === 1 ? [`Take ${plural(n, sh)} off both sides. The scale stays level.`, `${m} − ${n} = 1. Now 1 ${sh} is alone. It weighs the same as ${k}.`] : [`Take ${plural(n, sh)} off both sides. The scale stays level.`, `${m} − ${n} = ${m - n}. Now ${m - n} ${sh}s weigh ${k}.`, `${k} ÷ ${m - n} = ${k / (m - n)}`], k / (m - n)),
      strat('Guess and Check', [`Try ${g}. Left: ${m} × ${g} = ${m * g}. Right: ${n} × ${g} + ${k} = ${n * g + k}. Not level.`, `Try ${w}. Left: ${m} × ${w} = ${m * w}. Right: ${n} × ${w} + ${k} = ${n * w + k}. It is level!`], 0),
    ]
    distractors = wrongs(w, [k, Math.floor(k / m), k - (m - n), w + 1, w - 1])
    operands = [m, n, k]
  } else if (type === 'twoA') {
    // scale 1 gives the first shape; scale 2 then gives the second
    const n = r.int(2, 4)
    const j = r.int(1, 2)
    const t = r.int(2, 12)
    const W1 = n * w
    const W2 = t + j * w
    scales = [
      [rep(sh, n), [W1]],
      [[sh2, ...rep(sh, j)], [W2]],
    ]
    ans = t
    prompt = `Both scales are level. Scale 1: ${n} ${sh}s weigh ${W1}. Scale 2: 1 ${sh2} and ${plural(j, sh)} weigh ${W2}. What does the ${sh2} weigh?`
    strategies = [strat('One Scale at a Time', [`Scale 1: ${W1} ÷ ${n} = ${W1 / n}. So 1 ${sh} weighs ${W1 / n}.`, j > 1 ? `Scale 2 has ${j} ${sh}s: ${j} × ${W1 / n} = ${j * (W1 / n)}` : `Scale 2 has 1 ${sh}. It weighs ${W1 / n}.`, `Take that off: ${W2} − ${j * (W1 / n)} = ${W2 - j * (W1 / n)}`], W2 - j * (W1 / n)), strat('Guess and Check', [`Try ${sh} = ${g}. Scale 1: ${n} × ${g} = ${n * g}. That is not ${W1}.`, `Try ${sh} = ${w}. Scale 1: ${n} × ${w} = ${n * w}. Level!`, `Now try ${sh2} = ${t}. Scale 2: ${t} + ${j > 1 ? `${j} × ${w}` : w} = ${t + j * w}. Level!`], 0)]
    distractors = wrongs(t, [w, W2 - W1 > 0 ? W2 - W1 : W2, W2 - w, W2])
    operands = [n, W1, j, W2]
  } else {
    // scale 2 has one more of the first shape than scale 1
    const t = r.int(2, 12)
    const S1 = t + w
    const S2 = t + 2 * w
    scales = [
      [[sh2, sh], [S1]],
      [[sh2, sh, sh], [S2]],
    ]
    ans = t
    prompt = `Both scales are level. Scale 1: 1 ${sh2} and 1 ${sh} weigh ${S1}. Scale 2: 1 ${sh2} and 2 ${sh}s weigh ${S2}. What does the ${sh2} weigh?`
    strategies = [strat('Spot What Changed', [`Scale 2 has 1 more ${sh} than scale 1.`, `It weighs ${S2} − ${S1} = ${S2 - S1} more. So 1 ${sh} weighs ${S2 - S1}.`, `Scale 1: ${S1} − ${S2 - S1} = ${S1 - (S2 - S1)}`], S1 - (S2 - S1)), strat('Guess and Check', [`Try ${sh} = ${g}. Then scale 1 makes the ${sh2} ${S1} − ${g} = ${S1 - g}.`, `Scale 2: ${S1 - g} + ${g} + ${g} = ${S1 + g}. That is not ${S2}.`, `Try ${sh} = ${w}. Then the ${sh2} is ${S1} − ${w} = ${S1 - w}.`, `Scale 2: ${S1 - w} + ${w} + ${w} = ${S1 + w}. Level!`], 0)]
    distractors = wrongs(t, [w, S1, Math.floor(S1 / 2), S2 - S1 === t ? t + 1 : S2 - S1])
    operands = [S1, S2]
  }
  // proof: try every weight from 1 to 60 for each shape; only one way keeps every scale level
  const fits: Record<string, number>[] = []
  const usesSecond = scales.some(([l, rr]) => [...l, ...rr].includes(sh2))
  for (const x of range(1, 60)) for (const y of usesSecond ? range(1, 60) : [0]) if (scales.every(([l, rr]) => weighs(l, { [sh]: x, [sh2]: y }) === weighs(rr, { [sh]: x, [sh2]: y }))) fits.push({ [sh]: x, [sh2]: y })
  if (fits.length !== 1) throw new Error('balance puzzle is not unique')
  strategies[1].result = usesSecond ? fits[0][sh2] : fits[0][sh]
  return {
    prompt,
    visual: scales.map(([l, rr], i) => scaleSVG(l, rr, scales.length > 1 ? `Scale ${i + 1}` : '')).join(''),
    input: 'number',
    answer: ans,
    strategies,
    distractors,
    operands,
    difficulty: d,
  }
}

/* ------------------------------ ps.kangaroo-mix ------------------------------ */

const TWO_KINDS = [
  { small: 'hen', big: 'cow', p: 2, q: 4, part: 'legs', intro: 'A farm has hens and cows.', fact: 'A hen has 2 legs. A cow has 4 legs.', count: (T: number, L: number) => `There are ${T} animals and ${L} legs.`, hard: 0 },
  { small: 'duck', big: 'dog', p: 2, q: 4, part: 'legs', intro: 'A park has ducks and dogs.', fact: 'A duck has 2 legs. A dog has 4 legs.', count: (T: number, L: number) => `There are ${T} animals and ${L} legs.`, hard: 0 },
  { small: 'bike', big: 'trike', p: 2, q: 3, part: 'wheels', intro: 'A shop has bikes and trikes.', fact: 'A bike has 2 wheels. A trike has 3 wheels.', count: (T: number, L: number) => `There are ${T} in all. They have ${L} wheels.`, hard: 0 },
  { small: 'nickel', big: 'dime', p: 5, q: 10, part: 'cents', intro: '{n} has nickels and dimes.', fact: 'A nickel is 5 cents. A dime is 10 cents.', count: (T: number, L: number) => `There are ${T} coins. They make ${L} cents.`, hard: 1 },
  { small: 'stool', big: 'chair', p: 3, q: 4, part: 'legs', intro: 'A room has stools and chairs.', fact: 'A stool has 3 legs. A chair has 4 legs.', count: (T: number, L: number) => `There are ${T} seats and ${L} legs.`, hard: 2 },
  { small: 'dime', big: 'quarter', p: 10, q: 25, part: 'cents', intro: '{n} has dimes and quarters.', fact: 'A dime is 10 cents. A quarter is 25 cents.', count: (T: number, L: number) => `There are ${T} coins. They make ${L} cents.`, hard: 2 },
] as const
const GROWN = [
  { who: 'big sister', pro: 'She', m: [2, 3], lo: 8, hi: 18 },
  { who: 'mom', pro: 'She', m: [3, 4, 5], lo: 27, hi: 48 },
  { who: 'dad', pro: 'He', m: [3, 4, 5], lo: 27, hi: 48 },
  { who: 'grandpa', pro: 'He', m: [6, 7, 8], lo: 56, hi: 80 },
] as const
const boxes = (n: number, label: string, color: string) => `<div style="display:flex;align-items:center;gap:6px;margin:4px 0"><span style="font:700 15px sans-serif;color:#37474f;width:92px;text-align:right">${label}</span>${`<span style="display:inline-block;width:30px;height:26px;border:2.5px solid #37474f;border-radius:5px;background:${color}"></span>`.repeat(n)}</div>`

const kangaroo: Gen = (rng, d) => {
  const r = R(rng)
  if (d > 1 && r.chance(d === 2 ? 0.3 : 0.4)) {
    // ages: one is m times the other, plus the sum (or the gap)
    const gr = r.pick(GROWN)
    const kid = r.pick(KIDS)
    let m = 0
    let k = 0
    do {
      m = r.pick(gr.m)
      k = r.int(3, 12)
    } while (m * k < gr.lo || m * k > gr.hi)
    const useGap = d === 3 && r.chance(0.5)
    const total = useGap ? m * k - k : m * k + k
    const askKid = r.chance(0.6)
    // proof: only one age works
    const fits = range(1, 120).filter((x) => (useGap ? m * x - x : m * x + x) === total)
    if (fits.length !== 1) throw new Error('age puzzle is not unique')
    const parts = useGap ? m - 1 : m + 1
    const one = total / parts
    const g = fits[0] > 3 ? fits[0] - 2 : fits[0] + 2
    const val = (x: number) => (useGap ? m * x - x : m * x + x)
    const sg = useGap ? '−' : '+'
    const ans = askKid ? k : m * k
    const who = `${kid}'s ${gr.who}`
    return {
      prompt: `${who} is ${m} times as old as ${kid}. ${useGap ? `${gr.pro} is ${total} years older than ${kid}.` : `Their ages add up to ${total}.`} How old is ${askKid ? kid : who}?`,
      input: 'number',
      answer: ans,
      unit: 'years',
      strategies: [
        strat(
          'Draw Boxes',
          [
            `${kid} is 1 box. The ${gr.who} is ${m} boxes of the same size.`,
            useGap ? `The ${gr.who} has ${m} − 1 = ${m - 1} more ${m - 1 === 1 ? 'box' : 'boxes'}. That is ${total} years.` : `That is ${m} + 1 = ${m + 1} boxes. They make ${total} years.`,
            `One box: ${total} ÷ ${parts} = ${one}. So ${kid} is ${one}.`,
            `The ${gr.who}: ${m} × ${one} = ${m * one}`,
          ],
          askKid ? one : m * one,
          { html: `<div style="display:inline-block">${boxes(1, kid, '#c8e6c9')}${boxes(m, gr.who, '#bbdefb')}</div>` },
        ),
        strat('Guess and Check', [`Try ${kid} = ${g}. The ${gr.who}: ${m} × ${g} = ${m * g}. Check: ${m * g} ${sg} ${g} = ${val(g)}. Too ${val(g) > total ? 'big' : 'small'}.`, `Try ${kid} = ${fits[0]}. The ${gr.who}: ${m} × ${fits[0]} = ${m * fits[0]}. Check: ${m * fits[0]} ${sg} ${fits[0]} = ${val(fits[0])}. Yes!`], askKid ? fits[0] : m * fits[0]),
      ],
      // gave the other age, split the total by m, split in half
      distractors: wrongs(ans, [askKid ? m * k : k, Math.floor(total / m), Math.floor(total / 2), total - m, ans + 1]),
      operands: [m, total],
      difficulty: d,
    }
  }
  for (;;) {
    const c = r.pick(TWO_KINDS.filter((x) => (d === 1 ? x.hard === 0 : d === 2 ? x.hard <= 1 : true)))
    const T = d === 1 ? r.int(3, 6) : d === 2 ? r.int(5, 9) : r.int(7, 12)
    const y = r.int(1, T - 1) // how many of the big kind
    const x = T - y
    const L = c.p * x + c.q * y
    const askBig = r.chance(0.6)
    // proof: only one mix has this many in all and this many legs / wheels / cents
    const fits = range(0, T).filter((b) => c.p * (T - b) + c.q * b === L)
    if (fits.length !== 1) continue
    const fb = fits[0]
    let gb = Math.floor(T / 2)
    if (gb === fb) gb = fb + 1 <= T ? fb + 1 : fb - 1
    const gl = c.p * (T - gb) + c.q * gb
    const extra = L - T * c.p
    const ans = askBig ? y : x
    return {
      prompt: `${c.intro} ${c.fact} ${c.count(T, L)} How many ${askBig ? c.big : c.small}s are there?`,
      input: 'number',
      answer: ans,
      strategies: [
        strat(`Pretend They Are All ${c.small[0].toUpperCase()}${c.small.slice(1)}s`, [`Pretend all ${T} are ${c.small}s: ${T} × ${c.p} = ${T * c.p} ${c.part}.`, `But there are ${L}. That is ${L} − ${T * c.p} = ${extra} extra.`, c.q - c.p === 1 ? `Each ${c.big} adds 1 more. So ${extra} extra means ${plural(extra, c.big)}.` : `Each ${c.big} adds ${c.q - c.p} more. ${extra} ÷ ${c.q - c.p} = ${extra / (c.q - c.p)}`, `So there ${extra / (c.q - c.p) === 1 ? 'is' : 'are'} ${plural(extra / (c.q - c.p), c.big)}. The rest are ${c.small}s: ${T} − ${extra / (c.q - c.p)} = ${T - extra / (c.q - c.p)}`], askBig ? extra / (c.q - c.p) : T - extra / (c.q - c.p)),
        strat('Guess and Check', [`Try ${plural(T - gb, c.small)} and ${plural(gb, c.big)}: ${T - gb} × ${c.p} + ${gb} × ${c.q} = ${gl} ${c.part}. Too ${gl > L ? 'many' : 'few'}.`, `${gl > L ? 'Fewer' : 'More'} ${c.big}s. Try ${plural(T - fb, c.small)} and ${plural(fb, c.big)}: ${T - fb} × ${c.p} + ${fb} × ${c.q} = ${c.p * (T - fb) + c.q * fb}. Yes!`], askBig ? fb : T - fb),
      ],
      // gave the other kind, shared the parts as if all were one kind, half of everything
      distractors: wrongs(ans, [askBig ? x : y, Math.floor(L / c.q), Math.floor(L / c.p) - T > 0 ? Math.floor(L / c.p) - T : T, ans + 1, T]),
      operands: [T, L, c.p, c.q],
      difficulty: d,
    }
  }
}

/* ------------------------------------------------------------------ */

export const gens: Record<string, Gen> = {
  'ps.patterns-shape': patterns,
  'ps.logic-who': logicWho,
  'ps.number-riddles': riddles,
  'ps.guess-check': guessCheck,
  'ps.work-backwards': workBackwards,
  'ps.missing-digits': missingDigits,
  'ps.combinations': combinations,
  'ps.venn-sort': vennSort,
  'ps.balance-scales': balance,
  'ps.kangaroo-mix': kangaroo,
}

export const teach: Record<string, string> = {
  'ps.patterns-shape': 'A pattern has a part that repeats, or it grows by the same jump each time. Find that part and you know what comes next.',
  'ps.logic-who': 'Use one clue at a time. Line the names up or cross out what cannot be true. The one that is left is the answer.',
  'ps.number-riddles': 'Each clue crosses out some numbers. Write a short list, use every clue, and only one number will be left.',
  'ps.guess-check': 'When two clues talk about two numbers, make a guess and check both clues. Then fix your guess a little and try again.',
  'ps.work-backwards': 'If you know the end, start there. Go back one step at a time and do the opposite of each step.',
  'ps.missing-digits': 'A hidden digit is a tiny mystery. Look at its column, or use the opposite operation to find the whole number.',
  'ps.combinations': 'To count all the ways, make a list in order so you do not miss any. Or count the groups and multiply.',
  'ps.venn-sort': 'Two circles are two rules. Ask each rule: yes or no? Yes and yes goes in the middle where the circles cross.',
  'ps.balance-scales': 'A level scale means both sides weigh the same. Take the same thing off both sides and it stays level.',
  'ps.kangaroo-mix': 'Two facts, one answer. Pretend they are all the same kind, see how far off you are, and then swap some to fix it.',
}

const num = (it: Item, lo: number, hi: number) => it.input === 'number' && typeof it.answer === 'number' && it.answer >= lo && it.answer <= hi
export const limits: Record<string, (it: Item) => boolean> = {
  'ps.patterns-shape': (it) => (it.input === 'choice' ? !!it.choices && it.choices.length >= 2 && it.choices.length <= 4 && it.operands[0] >= 2 && it.operands[0] <= 4 && it.operands[1] <= 20 : num(it, 5, 13) && it.answer === it.operands[0] + 4 * it.operands[1]),
  'ps.logic-who': (it) => it.input === 'choice' && !!it.choices && it.choices.length === it.operands[0] && it.operands[0] <= 4 && it.operands[1] >= 2 && it.operands[1] <= 3 && !it.prompt.includes('{n}'),
  'ps.number-riddles': (it) => num(it, 11, 99) && +it.answer > it.operands[0] && +it.answer < it.operands[1] && it.operands[1] <= 100 && it.operands[2] >= 2 && it.operands[2] <= 3,
  'ps.guess-check': (it) => num(it, 1, 99) && it.operands[0] <= 110 && it.operands[1] >= 1 && it.operands[1] < it.operands[0] && (it.operands[0] - it.operands[1]) % 2 === 0 && [(it.operands[0] - it.operands[1]) / 2, (it.operands[0] + it.operands[1]) / 2].includes(+it.answer),
  'ps.work-backwards': (it) => num(it, 1, 100) && it.answer === it.operands[0] && it.operands[1] >= 1 && it.operands[1] <= 100 && it.operands[2] >= 2 && it.operands[2] <= 3,
  'ps.missing-digits': (it) => num(it, 0, 9) && it.operands[0] <= 999 && it.operands[2] <= 999 && (it.operands[0] + it.operands[1] === it.operands[2] || it.operands[0] - it.operands[1] === it.operands[2]) && [1, 10, 100].includes(it.operands[3]),
  'ps.combinations': (it) => num(it, 3, 16) && it.operands.every((x) => x >= 2 && x <= 5),
  'ps.venn-sort': (it) => it.input === 'choice' && !!it.choices && it.choices.length === 4 && it.operands.every((x) => x >= 1 && x <= 60),
  'ps.balance-scales': (it) => num(it, 1, 12) && it.operands.every((x) => x >= 1 && x <= 60) && !!it.visual,
  'ps.kangaroo-mix': (it) => num(it, 1, 80) && it.operands[1] >= 4 && it.operands[1] <= 300,
}
