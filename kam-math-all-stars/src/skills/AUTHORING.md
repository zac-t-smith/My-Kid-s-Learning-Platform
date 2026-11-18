# Writing skill generators

The learner is **Kam, 7–8 years old**: strong at math, **reading is behind his math**, loves baseball
(also building bricks, surfing, dance, puzzles, trampoline park). Feedback must never make him feel he failed.

A skill is listed in `manifest.ts` (id, name, grade, prerequisites, standard). Each strand file in
`src/skills/strands/<strand>.ts` supplies, for every skill id in that strand:

```ts
import { R, strat, wrongs, choice, fmtN, Q, type Gen, type Item, type StrandModule } from '../kit'

export const gens: Record<string, Gen> = { 'xx.some-skill': (rng, d) => ({ ...Item }) , ... }
export const teach: Record<string, string> = { 'xx.some-skill': 'The big idea in 1-2 short spoken sentences.' , ... }
export const limits: Record<string, (it: Item) => boolean> = { 'xx.some-skill': (it) => ... , ... }
```

The file is picked up automatically. **Only create/edit your own strand file.** Do not edit any other file
(not kit.ts, types.ts, check.ts, manifest.ts, index.css, tests). If a helper is missing, write it inside your file.

Read `types.ts` (the `Item` contract), `kit.ts` (helpers) and `check.ts` (`validateItem`) first.

## Rules for every item

1. **Correctness first.** Compute the answer from the operands in code. Never hand-write an answer.
2. **Seeded randomness only.** Use `R(rng)` (`int`, `pick`, `chance`, `shuffle`). Never `Math.random`. Same seed must give the same item.
3. **Difficulty `d` (1, 2, 3)** changes number sizes or steps *inside* the skill; return `difficulty: d`.
   d=1 should be the gentlest fair version of the skill, d=3 the hardest that still belongs to it.
4. **Prompt**: the whole question in plain words, **1st–2nd grade reading level**: short sentences, common words,
   under ~35 words. It is read aloud with word highlighting. Use `{n}` for the kid's name. Baseball contexts are
   welcome (also bricks, surfing, dance), but vary them. Never "wrong", "fail", "bad".
   - Text numbers plainly (`1,250` via `fmtN`). Use `−` `×` `÷` (not `-` `*` `/`) for operations in text.
   - If the equation alone is the whole question, set `eq` and `eqOnly: true` and still give a spoken `prompt`
     ("What is 47 plus 38?"). Otherwise the prompt is shown; `eq` and `visual` are optional extras.
5. **Input type**
   - `'number'`: whole-number answer (`answer` is a JS integer). `signed: true` if it can be negative. `unit` optional.
   - `'decimal'`: `answer` is a string like `"0.75"` (use `dec()` from kit).
   - `'fraction'`: `answer` is `"3/4"`. Mixed numbers are entered as improper fractions (`"7/4"`); say so in the prompt
     when needed. `exact: true` only when simplest form is the point of the skill.
   - `'choice'`: use `choice(answer, others, rng)` (2–5 options). Good for `<`/`=`/`>`, names, yes/no, picking a shape.
     Prefer `'number'` when the answer is a number he can type: typing is better practice than picking.
6. **At least 2 strategies**, really different ways to think (e.g. number line vs. place value; draw it vs. use a fact;
   count up vs. take away; a "check it" strategy counts only if it re-derives the answer another way).
   - `strat(name, steps, result, { line?, html? })`. 2–6 short steps, each under ~120 characters, kid language.
   - **`result` must be computed by that strategy's own arithmetic**, not copied from `answer` (it is a cross-check).
   - Every equation written in a step (`40 + 12 = 52`, `1/4 + 2/4 = 3/4`, `0.3 + 0.4 = 0.7`) is machine-checked with
     exact arithmetic. If you write a mixed number in words, write "1 and 3/4", never "1 3/4".
     Equations touching `?`, letters, `$`, brackets or `:` are skipped by the checker; that is fine.
   - Add a picture when it helps: `line: [start, ..., end]` draws an animated number line of hops;
     `html` takes `groupsHTML`, `arrayHTML`, `areaHTML`, `barHTML`, `placeTable`, `numberLineSVG` from kit, or your own
     inline-styled HTML/SVG (no CSS classes of your own, no scripts, no external images; keep SVG `viewBox` based,
     `width:100%;max-width:…px`, text ≥ 14px, colors with good contrast on a cream card `#fffdf5`).
7. **Distractors**: at least 1 (aim for 2–4) wrong answers that come from **real mistakes** kids make at this skill
   (forgot to regroup, added instead of multiplied, compared denominators the wrong way, read the hour hand wrong…).
   Same type as the answer, never equal in value. Use `wrongs(answer, [...])` for numbers.
8. **`operands`**: the numbers the problem was built from.
9. **`limits[id]`**: returns true when an item is inside what the skill allows (operand sizes, answer range, input type).
   Make it a real check (bounds per the skill), not `() => true`.
10. **`teach[id]`**: 20–260 characters, the big idea said simply, as if a kind coach is talking.
11. **Variety**: 10,000 items must give many different problems (at least a dozen distinct prompts, more than one answer).
12. No floating-point surprises: build decimals from integers (`dec(n / 100)`), fractions from integer pairs.

## Check your work

```bash
cd kam-math-all-stars
STRAND=<your strand> npx vitest run tests/skills.test.ts     # 10,000 problems per skill
npx tsc --noEmit
```

Both must pass before you finish. When a test fails it prints the item; fix the generator (do not weaken the test).
Then print ~5 sample items per skill for yourself and read them as a 7-year-old would: is the question clear,
is it actually this skill, are the steps true and helpful, do the pictures make sense?

## Two examples

```ts
// number input, equation + number line, three strategies
'as.make-100': (rng, d) => {
  const r = R(rng)
  const a = d === 1 ? r.int(1, 9) * 10 : d === 2 ? r.int(1, 19) * 5 : r.int(11, 89)
  const ans = 100 - a
  const toTen = (10 - (a % 10)) % 10
  return {
    prompt: `${a} plus what number makes 100?`,
    eq: `${a} + ${Q} = 100`,
    eqOnly: true,
    input: 'number',
    answer: ans,
    strategies: [
      toTen
        ? strat('Count Up', [`Start at ${a}. Hop ${toTen} to get to ${a + toTen}.`, `Then hop ${100 - a - toTen} more to 100.`, `${toTen} + ${100 - a - toTen} = ${ans}`], toTen + (100 - a - toTen), { line: [a, a + toTen, 100] })
        : strat('Count Up by Tens', [`Start at ${a} and count by tens to 100.`, `That is ${(100 - a) / 10} tens.`, `${(100 - a) / 10} × 10 = ${ans}`], ((100 - a) / 10) * 10, { line: [a, 100] }),
      strat('Take It Away', [`100 − ${a} is the missing number.`, `100 − ${a - (a % 10)} = ${100 - (a - (a % 10))}`, ...(a % 10 ? [`${100 - (a - (a % 10))} − ${a % 10} = ${ans}`] : [])], 100 - (a - (a % 10)) - (a % 10)),
    ],
    // tens add to 100 AND ones add to 10 (a classic), off by ten, off by one
    distractors: wrongs(ans, [a % 10 ? ans + 10 : ans + 1, ans - 10, ans + 1]),
    operands: [a, 100],
    difficulty: d,
  }
},

// choice input with a picture
'nv.compare-1000': (rng, d) => {
  const r = R(rng)
  const hi = d === 1 ? 99 : 999
  let a = r.int(d === 3 ? 100 : 10, hi), b = r.chance(0.15) ? a : r.int(d === 3 ? 100 : 10, hi)
  if (d === 3 && a !== b && r.chance(0.6)) b = Math.floor(a / 100) * 100 + ((b % 100) || 1)   // same hundreds: look closer
  const ans = a > b ? '>' : a < b ? '<' : '='
  const bigger = Math.max(a, b)
  return {
    prompt: `Which sign goes between ${fmtN(a)} and ${fmtN(b)}? Is ${fmtN(a)} bigger, smaller, or the same?`,
    eq: `${fmtN(a)} ${Q} ${fmtN(b)}`,
    ...choice(ans, ['<', '=', '>'], rng, true),
    strategies: [
      strat('Biggest Place First', a === b ? [`Check each place. Every digit matches.`, `The numbers are the same, so use =.`] : [`Look at the biggest place first. Find the first place where the digits are different.`, `${fmtN(bigger)} has more there, so ${fmtN(bigger)} is bigger.`, `The open mouth eats the bigger number: ${fmtN(a)} ${ans} ${fmtN(b)}`], ans),
      strat('Number Line', [`Find both numbers on a number line.`, a === b ? `They sit at the same spot. Use =.` : `${fmtN(bigger)} is farther to the right, so it is bigger.`, `${fmtN(a)} ${ans} ${fmtN(b)}`], ans, a === b ? {} : { line: [Math.min(a, b), bigger] }),
    ],
    operands: [a, b],
    difficulty: d,
  }
},
```

`teach` / `limits` for those:

```ts
teach['as.make-100'] = 'Partners of 100 are two numbers that add up to 100. Count up to the next ten, then on to 100.'
limits['as.make-100'] = (it) => it.input === 'number' && it.operands[0] >= 1 && it.operands[0] <= 99 && +it.answer >= 1 && +it.answer <= 99
```
