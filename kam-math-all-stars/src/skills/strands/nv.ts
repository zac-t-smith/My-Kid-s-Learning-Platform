import { R, strat, wrongs, choice, fmtN, Q, dec, dig, pieces, expand, placesOf, fracHTML, type Gen, type Item, type Rng, type Strat } from '../kit'

/* Numbers & Place Value: hundreds-tens-ones through decimals to negative numbers. */

type RR = ReturnType<typeof R>
type Part = Omit<Item, 'difficulty'>

/* ------------------------------------------------------------------ words and small helpers */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
/** 342 → "three hundred forty-two" (0 to 999,999,999). */
export function words(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + words(n % 100) : '')
  if (n < 1_000_000) return words(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + words(n % 1000) : '')
  return words(Math.floor(n / 1_000_000)) + ' million' + (n % 1_000_000 ? ' ' + words(n % 1_000_000) : '')
}

const PLACE: Record<number, [string, string]> = {
  1: ['one', 'ones'],
  10: ['ten', 'tens'],
  100: ['hundred', 'hundreds'],
  1000: ['thousand', 'thousands'],
  10000: ['ten thousand', 'ten thousands'],
  100000: ['hundred thousand', 'hundred thousands'],
}
const nPlace = (k: number, pl: number) => `${k} ${PLACE[pl][k === 1 ? 0 : 1]}`
const digitsOf = (n: number) => placesOf(n).map((pl) => dig(n, pl))
const list = (xs: string[], and = 'and') => (xs.length <= 2 ? xs.join(` ${and} `) : xs.slice(0, -1).join(', ') + `, ${and} ` + xs[xs.length - 1])
/** −3 with a real minus sign. */
const neg = (n: number) => (n < 0 ? '−' + fmtN(-n) : fmtN(n))
/** v counted in units of 10^-p, written with exactly p digits after the dot: fx(45, 2) → "0.45". */
const fx = (v: number, p: number) => {
  if (!p) return fmtN(v)
  const s = String(v).padStart(p + 1, '0')
  return fmtN(Number(s.slice(0, -p))) + '.' + s.slice(-p)
}
/** Wrong decimal answers: valid, different in value from the answer and from each other. */
function dwrongs(ans: string, cands: string[]): string[] {
  const seen = new Set<number>([Number(ans)])
  const out: string[] = []
  for (const x of cands) {
    if (!/^\d+(\.\d{1,3})?$/.test(x) || seen.has(Number(x))) continue
    seen.add(Number(x))
    out.push(x)
  }
  return out.length ? out.slice(0, 4) : [dec(Number(ans) + 1)]
}
/** A random number in [lo, hi] that passes `ok` (seeded; falls back after many tries). */
function numWith(r: RR, lo: number, hi: number, ok: (n: number) => boolean, fallback: number): number {
  for (let i = 0; i < 300; i++) {
    const n = r.int(lo, hi)
    if (ok(n)) return n
  }
  return fallback
}
const noZero = (n: number) => digitsOf(n).every((x) => x > 0)
const hasZero = (n: number) => digitsOf(n).some((x) => x === 0)
const allDiff = (n: number) => new Set(digitsOf(n)).size === digitsOf(n).length
const uniqueNonZero = (n: number) => digitsOf(n).filter((x, _, a) => x > 0 && a.filter((y) => y === x).length === 1)

/* ------------------------------------------------------------------ pictures (inline styles only) */

const INK = '#1d2b36'
const svg = (w: number, h: number, label: string, body: string, max = w) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" style="width:100%;max-width:${max}px;height:auto;display:block;margin:6px auto">${body}</svg>`

/** Base-ten blocks: flats (100), rods (10), cubes (1). */
function blocksSVG(h: number, t: number, o: number): string {
  const u = 7
  let x = 6
  let body = ''
  const groups: [number, string][] = []
  if (h) {
    const cols = h > 5 ? Math.ceil(h / 2) : h
    for (let i = 0; i < h; i++) {
      const fx0 = x + (i % cols) * 78
      const fy = 4 + Math.floor(i / cols) * 78
      body += `<rect x="${fx0}" y="${fy}" width="70" height="70" fill="#90caf9" stroke="#1565c0" stroke-width="2"/>`
      for (let k = 1; k < 10; k++) body += `<line x1="${fx0 + k * u}" y1="${fy}" x2="${fx0 + k * u}" y2="${fy + 70}" stroke="#1565c0" stroke-width="0.6"/><line x1="${fx0}" y1="${fy + k * u}" x2="${fx0 + 70}" y2="${fy + k * u}" stroke="#1565c0" stroke-width="0.6"/>`
    }
    const w = cols * 78 - 8
    groups.push([x + w / 2, nPlace(h, 100)])
    x += Math.max(w, 96) + 22
  }
  if (t) {
    for (let i = 0; i < t; i++) {
      const rx = x + i * 13
      body += `<rect x="${rx}" y="4" width="${u + 2}" height="70" fill="#a5d6a7" stroke="#2e7d32" stroke-width="1.6"/>`
      for (let k = 1; k < 10; k++) body += `<line x1="${rx}" y1="${4 + k * u}" x2="${rx + u + 2}" y2="${4 + k * u}" stroke="#2e7d32" stroke-width="0.6"/>`
    }
    const w = t * 13 - 4
    groups.push([x + w / 2, nPlace(t, 10)])
    x += Math.max(w, 60) + 22
  }
  if (o) {
    for (let i = 0; i < o; i++) body += `<rect x="${x + Math.floor(i / 5) * 14}" y="${4 + (i % 5) * 14}" width="10" height="10" fill="#ffcc80" stroke="#e65100" stroke-width="1.6"/>`
    const w = o > 5 ? 24 : 10
    groups.push([x + w / 2, nPlace(o, 1)])
    x += Math.max(w, 60) + 10
  }
  const H = h > 5 ? 190 : 112
  for (const [gx, lab] of groups) body += `<text x="${gx}" y="${H - 8}" text-anchor="middle" font-size="15" font-weight="700" fill="${INK}">${lab}</text>`
  return svg(Math.max(x, 120), H, 'place value blocks', body)
}

/** A place chart: one header row, one row of digits. `hi` = column to light up. */
function chart(cols: [string, string][], hi = -1): string {
  return (
    `<table style="margin:8px auto;border-collapse:collapse;text-align:center"><tr>` +
    cols.map(([h]) => `<th style="font-size:14px;line-height:1.1;color:#37474f;padding:2px 5px;font-weight:700;vertical-align:bottom">${h}</th>`).join('') +
    '</tr><tr>' +
    cols
      .map(([, v], i) =>
        v === '.'
          ? `<td style="font-size:30px;font-weight:700;padding:2px 3px;color:${INK}">.</td>`
          : `<td style="font-size:28px;font-weight:700;padding:4px 11px;border:2px solid #90a4ae;color:${i === hi ? '#bf360c' : INK};background:${i === hi ? '#ffe0b2' : '#ffffff'}">${v}</td>`,
      )
      .join('') +
    '</tr></table>'
  )
}
const HEAD: Record<number, string> = { 1: 'Ones', 10: 'Tens', 100: 'Hund', 1000: 'Thou', 10000: 'Ten<br>Thou', 100000: 'Hund<br>Thou' }
const chartN = (n: number, hiPl?: number) =>
  chart(
    placesOf(n).map((pl) => [HEAD[pl], String(dig(n, pl))]),
    hiPl ? placesOf(n).indexOf(hiPl) : -1,
  )
/** Decimal place chart from a count of thousandths, showing p digits after the dot. */
function chartD(v: number, p: number, hi = -1): string {
  const s = fx(v / 10 ** (3 - p), p).replace(/,/g, '')
  const [w, f] = s.split('.')
  const names = ['Tenths', 'Hund-<br>redths', 'Thou-<br>sandths']
  const wn = ['Ones', 'Tens', 'Hund', 'Thou', 'Ten<br>Thou', 'Hund<br>Thou']
  const cols: [string, string][] = [...w].map((c, i) => [wn[w.length - 1 - i], c])
  if (f) cols.push(['', '.'], ...[...f].map((c, i): [string, string] => [names[i], c]))
  return chart(cols, hi)
}

/** A plain number line. Ticks: [value, label, tall?]. Dots: [value, label, color?]. */
function lineSVG(lo: number, hi: number, ticks: [number, string, boolean?][], dots: [number, string, string?][] = [], label = 'number line'): string {
  const W = 560
  const x = (v: number) => 34 + ((v - lo) / (hi - lo)) * (W - 68)
  let body = `<line x1="10" y1="62" x2="${W - 10}" y2="62" stroke="#37474f" stroke-width="3" stroke-linecap="round"/><path d="M10 62 l10 -6 v12 z M${W - 10} 62 l-10 -6 v12 z" fill="#37474f"/>`
  for (const [v, lab, tall] of ticks) {
    body += `<line x1="${x(v)}" y1="${tall ? 48 : 54}" x2="${x(v)}" y2="${tall ? 76 : 70}" stroke="#37474f" stroke-width="${tall ? 3 : 2}"/>`
    if (lab) body += `<text x="${x(v)}" y="98" text-anchor="middle" font-size="17" font-weight="700" fill="${INK}">${lab}</text>`
  }
  for (const [v, lab, color] of dots) {
    body += `<circle cx="${x(v)}" cy="62" r="9" fill="${color || '#e65100'}" stroke="#ffffff" stroke-width="2"/>`
    if (lab) body += `<text x="${x(v)}" y="34" text-anchor="middle" font-size="18" font-weight="700" fill="${color || '#bf360c'}">${lab}</text>`
  }
  return svg(W, 108, label, body)
}

/** Strips cut into 10 parts; `tenths` parts are shaded (full strips first). */
function stripSVG(tenths: number): string {
  const strips = Math.max(1, Math.ceil(tenths / 10))
  let body = ''
  for (let s = 0; s < strips; s++)
    for (let i = 0; i < 10; i++) body += `<rect x="${4 + i * 34}" y="${4 + s * 54}" width="34" height="42" fill="${s * 10 + i < tenths ? '#ffb74d' : '#ffffff'}" stroke="#37474f" stroke-width="2"/>`
  return svg(348, strips * 54, `${tenths} tenths shaded`, body)
}
/** 10 × 10 grids; `hund` small squares are shaded, column by column (a full column is one tenth). */
function gridSVG(hund: number): string {
  const grids = Math.max(1, Math.ceil(hund / 100))
  const c = 15
  let body = ''
  for (let g = 0; g < grids; g++) {
    const x0 = 4 + g * (c * 10 + 18)
    for (let col = 0; col < 10; col++)
      for (let row = 0; row < 10; row++) body += `<rect x="${x0 + col * c}" y="${4 + row * c}" width="${c}" height="${c}" fill="${g * 100 + col * 10 + row < hund ? '#ffb74d' : '#ffffff'}" stroke="#607d8b" stroke-width="1"/>`
    body += `<rect x="${x0}" y="4" width="${c * 10}" height="${c * 10}" fill="none" stroke="#37474f" stroke-width="2.5"/>`
  }
  return svg(grids * (c * 10 + 18) - 10, c * 10 + 8, `${hund} hundredths shaded`, body)
}
/** Dots lined up two by two; a leftover dot is orange. */
function pairsSVG(n: number): string {
  const cols = Math.ceil(n / 2)
  let body = ''
  for (let i = 0; i < n; i++) {
    const lone = n % 2 === 1 && i === n - 1
    body += `<circle cx="${20 + Math.floor(i / 2) * 34}" cy="${20 + (i % 2) * 34}" r="12" fill="${lone ? '#ef6c00' : '#42a5f5'}" stroke="${INK}" stroke-width="1.5"/>`
  }
  for (let p = 0; p < Math.floor(n / 2); p++) body += `<rect x="${5 + p * 34}" y="5" width="30" height="64" rx="14" fill="none" stroke="#78909c" stroke-width="1.5" stroke-dasharray="4 3"/>`
  return svg(cols * 34 + 8, 76, `${n} dots in pairs`, body)
}
/** Two bars to compare lengths (values in hundredths). */
function barsSVG(a: number, b: number, la: string, lb: string): string {
  const max = Math.max(100, Math.ceil(Math.max(a, b) / 100) * 100)
  const w = (v: number) => (v / max) * 300
  const bar = (v: number, lab: string, y: number, col: string) =>
    `<text x="62" y="${y + 20}" text-anchor="end" font-size="18" font-weight="700" fill="${INK}">${lab}</text><rect x="70" y="${y}" width="300" height="28" fill="#ffffff" stroke="#90a4ae" stroke-width="1.5"/><rect x="70" y="${y}" width="${w(v)}" height="28" fill="${col}" stroke="#37474f" stroke-width="1.5"/>`
  return svg(380, 80, 'two bars to compare', bar(a, la, 6, '#64b5f6') + bar(b, lb, 44, '#ffb74d'))
}

/* ------------------------------------------------------------------ shared question builders: whole numbers */

/** Likely slips when reading or writing a number: dropped zero, swapped digits, -teen / -ty mix-ups, a zero in the wrong spot. */
function slips(n: number): number[] {
  const ds = digitsOf(n)
  const out: number[] = []
  if (ds.includes(0)) out.push(Number(ds.filter((x) => x).join('')))
  for (const i of [ds.length - 2, 0, 1]) {
    if (i < 0 || i + 1 >= ds.length || ds[i] === ds[i + 1] || (i === 0 && ds[1] === 0)) continue
    const c = [...ds]
    ;[c[i], c[i + 1]] = [c[i + 1], c[i]]
    out.push(Number(c.join('')))
  }
  const tt = n % 100
  if (tt >= 13 && tt <= 19) out.push(n - tt + (tt - 10) * 10)
  if (tt >= 30 && tt % 10 === 0) out.push(n - tt + 10 + tt / 10)
  if (tt && n % 10 === 0) out.push(n - tt + tt / 10)
  if (n % 10 && dig(n, 10) === 0) out.push(n - (n % 10) + (n % 10) * 10)
  return [...new Set(out)].filter((x) => x > 0 && x !== n)
}

/** The two chunks of a number name: thousands and the rest (or hundreds and the rest). */
function chunks(n: number): [number, number, string] {
  if (n >= 1000) return [Math.floor(n / 1000) * 1000, n % 1000, `${words(Math.floor(n / 1000))} thousand`]
  return [Math.floor(n / 100) * 100, n % 100, `${ONES[Math.floor(n / 100)]} hundred`]
}

function qWordsToDigits(n: number, r: RR): Part {
  const [big, rest, bigWords] = chunks(n)
  const asHeard = big && rest ? Number(`${big}${rest}`) : 0
  const lead = r.pick(['Write this number with digits:', 'What number is this?', 'Type this number:'])
  const zeros = placesOf(n).filter((pl) => dig(n, pl) === 0)
  return {
    prompt: `${lead} ${words(n)}.`,
    input: 'number',
    answer: n,
    strategies: [
      big
        ? strat(
            'Say It in Chunks',
            rest
              ? [`"${bigWords}" is ${fmtN(big)}.`, `"${words(rest)}" is ${fmtN(rest)}.`, `Put them together: ${fmtN(big)} + ${fmtN(rest)} = ${fmtN(big + rest)}`]
              : [`"${bigWords}" is ${fmtN(big)}.`, `Nothing comes after it, so the other places are zeros.`, `The number is ${fmtN(big)}.`],
            big + rest,
          )
        : strat('Say It in Chunks', [`"${words(n - (n % 10))}" is ${n - (n % 10)}.`, n % 10 ? `"${ONES[n % 10]}" is ${n % 10}.` : `There are no extra ones.`, `${n - (n % 10)} + ${n % 10} = ${n}`], n - (n % 10) + (n % 10)),
      strat(
        'Place Chart',
        [
          `Put each digit in its place: ${list(placesOf(n).filter((pl) => dig(n, pl)).map((pl) => nPlace(dig(n, pl), pl)))}.`,
          zeros.length ? `You did not hear any ${list(zeros.map((pl) => PLACE[pl][1]), 'or')}. Write 0 there to hold the spot.` : `Every place has a digit. No zeros are needed.`,
          `Read the chart: ${fmtN(n)}`,
        ],
        Number(digitsOf(n).join('')),
        { html: chartN(n) },
      ),
    ],
    distractors: wrongs(n, [...slips(n).slice(0, 3), asHeard || n + 10]),
    operands: [n],
  }
}

function qDigitsToWords(n: number, r: RR, rng: Rng): Part {
  const others = r.shuffle(slips(n)).slice(0, 3)
  for (const extra of [n + 10, n + 1, n + 100]) if (others.length < 2 && !others.includes(extra)) others.push(extra)
  const [big, rest, bigWords] = chunks(n)
  const chunked = big ? bigWords + (rest ? ' ' + words(rest) : '') : words(n)
  return {
    prompt: `Which words say ${fmtN(n)}?`,
    ...choice(words(n), others.map(words), rng),
    strategies: [
      strat(
        'Read It in Chunks',
        big
          ? [`First read the big part: "${bigWords}".`, rest ? `Then read the rest, ${fmtN(rest)}: "${words(rest)}".` : `The rest is all zeros, so there is nothing more to say.`, `Together: "${chunked}".`]
          : [`Read the tens first: "${words(n - (n % 10))}".`, n % 10 ? `Then the ones: "${ONES[n % 10]}".` : `There are no extra ones.`, `Together: "${words(n)}".`],
        chunked,
      ),
      strat('Place Chart', [`Put ${fmtN(n)} in a place chart.`, `It has ${list(placesOf(n).filter((pl) => dig(n, pl)).map((pl) => nPlace(dig(n, pl), pl)))}.`, `Say each part from left to right: "${words(n)}".`], words(n), { html: chartN(n) }),
    ],
    operands: [n],
  }
}

/** "What is the 4 worth in 342?" Needs a digit that is not zero and shows up only once. */
function qValue(n: number, r: RR): Part {
  const digit = r.pick(uniqueNonZero(n))
  const pl = placesOf(n).find((p) => dig(n, p) === digit)!
  const part = pieces(n).find((p) => String(p)[0] === String(digit) && p === digit * 10 ** (String(p).length - 1))!
  return {
    prompt: r.pick([`What is the ${digit} worth in ${fmtN(n)}?`, `Look at ${fmtN(n)}. What is the value of the ${digit}?`]),
    input: 'number',
    answer: digit * pl,
    strategies: [
      strat('Place Chart', [`Find the ${digit} in the chart. It sits in the ${PLACE[pl][1]} place.`, `${nPlace(digit, pl)} is ${digit} × ${fmtN(pl)} = ${fmtN(digit * pl)}`], digit * pl, { html: chartN(n, pl) }),
      strat('Break It Apart', [`${fmtN(n)} = ${expand(n)}`, `The part that comes from the ${digit} is ${fmtN(part)}.`], part),
    ],
    distractors: wrongs(digit * pl, [digit, digit * pl * 10, pl >= 100 ? (digit * pl) / 10 : digit * 100, pl]),
    operands: [n, digit],
  }
}

/** "Which digit is in the tens place?" Needs all digits different. */
function qDigit(n: number, r: RR): Part {
  const pl = r.pick(placesOf(n))
  const i = placesOf(n).indexOf(pl)
  const ans = dig(n, pl)
  return {
    prompt: `Look at ${fmtN(n)}. Which digit is in the ${PLACE[pl][1]} place?`,
    input: 'number',
    answer: ans,
    strategies: [
      strat('Place Chart', [`Put ${fmtN(n)} in a place chart.`, `Look under ${PLACE[pl][1]}. The digit there is ${ans}.`], ans, { html: chartN(n, pl) }),
      strat('Count Places from the Right', [`Start at the right: ${list(placesOf(n).reverse().map((p) => PLACE[p][1]))}.`, `The ${PLACE[pl][1]} place is spot ${placesOf(n).length - i} from the right.`, `The digit there is ${String(n)[i]}.`], Number(String(n)[i])),
    ],
    distractors: wrongs(ans, [...digitsOf(n).filter((x) => x !== ans), ans * pl]),
    operands: [n, pl],
  }
}

/** "What number has 4 thousands, 3 hundreds, and 5 ones?" */
function qBuild(n: number, r: RR, shuffle: boolean, pic = false): Part {
  const pls = placesOf(n).filter((pl) => dig(n, pl) > 0)
  let order = pls
  if (shuffle && pls.length > 1) for (let i = 0; i < 5 && order.join() === pls.join(); i++) order = r.shuffle(pls)
  const zeros = placesOf(n).filter((pl) => dig(n, pl) === 0)
  const parts = pls.map((pl) => dig(n, pl) * pl)
  const sum = parts.reduce((s, x) => s + x, 0)
  const ds = digitsOf(n)
  return {
    prompt: `What number has ${list(order.map((pl) => nPlace(dig(n, pl), pl)))}?`,
    visual: pic && n < 1000 ? blocksSVG(dig(n, 100), dig(n, 10), dig(n, 1)) : undefined,
    input: 'number',
    answer: n,
    strategies: [
      strat('Add the Parts', parts.length > 1 ? [`Write each part as a number: ${list(parts.map(fmtN))}.`, `Add them, biggest first: ${parts.map(fmtN).join(' + ')} = ${fmtN(sum)}`] : [`${nPlace(dig(n, pls[0]), pls[0])} is ${fmtN(parts[0])}.`, `There are no other parts, so the number is ${fmtN(sum)}.`], sum),
      strat(
        'Place Chart',
        [`Make a place chart. Put each digit under its place name.`, zeros.length ? `There are no ${list(zeros.map((pl) => PLACE[pl][1]), 'or')}. Write 0 there to hold the spot.` : `Every place has a digit.`, `Read the chart: ${fmtN(n)}`],
        Number(ds.join('')),
        { html: chartN(n) },
      ),
    ],
    distractors: wrongs(n, [Number(order.map((pl) => dig(n, pl)).join('')), Number(ds.filter((x) => x).join('')), ...(n < 1000 ? [ds.reduce((s, x) => s + x, 0)] : []), ...slips(n).slice(0, 2)]),
    operands: [n],
  }
}

/** a ? b with <, =, > */
function qCompare(a: number, b: number, rng: Rng): Part {
  const ans = a > b ? '>' : a < b ? '<' : '='
  const bigger = Math.max(a, b)
  const sa = String(a).padStart(String(bigger).length, '0'),
    sb = String(b).padStart(String(bigger).length, '0')
  let k = 0
  while (k < sa.length && sa[k] === sb[k]) k++
  const byPlace = k === sa.length ? '=' : sa[k] > sb[k] ? '>' : '<'
  const place = k < sa.length ? PLACE[10 ** (sa.length - 1 - k)][1] : ''
  const shorter = String(a).length !== String(b).length
  return {
    prompt: `Which sign goes between ${fmtN(a)} and ${fmtN(b)}? Is ${fmtN(a)} bigger, smaller, or the same?`,
    eq: `${fmtN(a)} ${Q} ${fmtN(b)}`,
    ...choice(ans, ['<', '=', '>'], rng, true),
    strategies: [
      strat(
        'Biggest Place First',
        a === b
          ? [`Check each place. Every digit matches.`, `The numbers are the same, so use the equals sign.`]
          : [
              shorter ? `${fmtN(bigger)} has more digits, so it has ${place} and the other number has none.` : `Start at the left. The first place where the digits are different is the ${place} place.`,
              shorter ? `That makes ${fmtN(bigger)} bigger.` : `There, ${sa[k]} is ${sa[k] > sb[k] ? 'more' : 'less'} than ${sb[k]}. So ${fmtN(bigger)} is bigger.`,
              `The open mouth faces the bigger number: ${fmtN(a)} ${byPlace} ${fmtN(b)}`,
            ],
        byPlace,
      ),
      strat('Number Line', [`Find both numbers on a number line.`, a === b ? `They sit at the same spot. Use the equals sign.` : `${fmtN(bigger)} is farther to the right, so it is bigger.`, `${fmtN(a)} ${ans} ${fmtN(b)}`], ans, a === b ? {} : { line: [Math.min(a, b), bigger] }),
    ],
    operands: [a, b],
  }
}

/** "Which number is the biggest: 342, 324, or 432?" */
function qPick3(nums: number[], big: boolean, rng: Rng): Part {
  const len = Math.max(...nums.map((x) => String(x).length))
  const pad = (x: number) => String(x).padStart(len, '0')
  const sorted = [...nums].sort((x, y) => (pad(x) < pad(y) ? -1 : 1))
  const byPlace = big ? sorted[sorted.length - 1] : sorted[0]
  const byLine = big ? Math.max(...nums) : Math.min(...nums)
  const lo = Math.min(...nums),
    hi = Math.max(...nums)
  const word = big ? 'biggest' : 'smallest'
  const m = Math.max((hi - lo) * 0.08, 1)
  return {
    prompt: `Which number is the ${word}: ${list(nums.map(fmtN), 'or')}?`,
    ...choice(fmtN(byLine), nums.map(fmtN), rng, true),
    strategies: [
      strat('Biggest Place First', [`Line the numbers up by place. Start at the left, with the biggest place.`, `Compare the digits there. If they tie, move one place to the right.`, `In order from small to big: ${sorted.map(fmtN).join(', ')}.`, `The ${word} is ${fmtN(byPlace)}.`], fmtN(byPlace)),
      strat('Number Line', [`Put all the numbers on a number line.`, big ? `The biggest number is the one farthest to the right.` : `The smallest number is the one farthest to the left.`, `That is ${fmtN(byLine)}.`], fmtN(byLine), {
        html: lineSVG(
          lo - m,
          hi + m,
          [],
          nums.map((v): [number, string, string] => [v, fmtN(v), v === byLine ? '#2e7d32' : '#546e7a']),
        ),
      }),
    ],
    operands: nums,
  }
}

/* ------------------------------------------------------------------ rounding (whole numbers and decimals share this) */

interface RoundText {
  /** how to write a number: the one being rounded ('n'), an end of the line ('end'), or the halfway point ('mid') */
  f: (v: number, kind: 'n' | 'end' | 'mid') => string
  /** name of the place we round to, e.g. "tens" or "tenths" */
  place: string
  /** what happens to the digits after it */
  tail: string
}
function roundCore(n: number, unit: number, t: RoundText): { ans: number; lo: number; hi: number; strategies: (res: (v: number) => number | string) => Strat[] } {
  const lo = Math.floor(n / unit) * unit,
    hi = lo + unit,
    mid = lo + unit / 2
  const ans = Math.round(n / unit) * unit
  const viaLine = n >= mid ? hi : lo
  const next = dig(n, unit / 10)
  const viaDigit = (Math.floor(n / unit) + (next >= 5 ? 1 : 0)) * unit
  const N = t.f(n, 'n'),
    LO = t.f(lo, 'end'),
    HI = t.f(hi, 'end'),
    MID = t.f(mid, 'mid')
  return {
    ans,
    lo,
    hi,
    strategies: (res) => [
      strat(
        'Number Line',
        [
          `${N} is between ${LO} and ${HI}.`,
          `Halfway is ${MID}.`,
          n === mid ? `${N} is right at halfway. Halfway always rounds up, so go to ${HI}.` : n > mid ? `${N} is past halfway, so it is closer to ${HI}.` : `${N} is before halfway, so it is closer to ${LO}.`,
        ],
        res(viaLine),
        { html: lineSVG(lo - unit * 0.08, hi + unit * 0.08, [[lo, LO, true], [mid, MID], [hi, HI, true]], [[n, N]]) },
      ),
      strat(
        'Look Next Door',
        [
          `Find the ${t.place} place. The digit there is ${dig(n, unit)}.`,
          `Look at the digit one place to the right. It is ${next}.`,
          next >= 5 ? `${next} is 5 or more, so round up to ${HI}.` : `${next} is less than 5, so stay at ${LO}.`,
          `${t.tail} ${N} rounds to ${t.f(viaDigit, 'end')}.`,
        ],
        res(viaDigit),
      ),
    ],
  }
}
const ROUND_NAME: Record<number, string> = { 10: 'ten', 100: 'hundred', 1000: 'thousand', 10000: 'ten thousand', 100000: 'hundred thousand' }
function roundWhole(n: number, unit: number, r: RR, stories: boolean): Part {
  const name = ROUND_NAME[unit]
  const core = roundCore(n, unit, { f: (v) => fmtN(v), place: PLACE[unit][1], tail: 'The digits after it turn into zeros.' })
  const N = fmtN(n)
  const prompt = !stories
    ? `Round ${N} to the nearest ${name}.`
    : r.pick([
        `Round ${N} to the nearest ${name}.`,
        `What is ${N} rounded to the nearest ${name}?`,
        `${N} fans came to the game. About how many is that? Round to the nearest ${name}.`,
        `{n} has ${N} baseball cards. Round ${N} to the nearest ${name}.`,
        `A puzzle has ${N} pieces. Round ${N} to the nearest ${name}.`,
      ])
  const otherUnit = unit >= 100 ? unit / 10 : unit * 10
  return {
    prompt,
    input: 'number',
    answer: core.ans,
    strategies: core.strategies((v) => v),
    // rounded the other way, rounded to a different place, just chopped the digits
    distractors: wrongs(core.ans, [core.ans === core.lo ? core.hi : core.lo, Math.round(n / otherUnit) * otherUnit, unit >= 100 ? Math.round(n / (unit * 10)) * unit * 10 : n - (n % 10) + 10, core.ans === core.hi ? core.hi + unit : core.lo - unit].filter((x) => x > 0)),
    operands: [n, unit],
  }
}

/* ------------------------------------------------------------------ the skills */

export const gens: Record<string, Gen> = {
  'nv.hundreds-tens-ones': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['build', 'build', 'digit']) : d === 2 ? r.pick(['build', 'build', 'value', 'digit']) : r.pick(['build', 'value', 'tens', 'tensIn'])
    let part: Part
    if (kind === 'build') {
      const n = d === 1 ? numWith(r, 111, 999, noZero, 342) : d === 2 ? numWith(r, 100, 999, (x) => r.chance(0.5) || hasZero(x), 305) : r.int(101, 999)
      part = qBuild(n, r, d === 3, d < 3)
    } else if (kind === 'digit') part = qDigit(numWith(r, 123, 987, (x) => noZero(x) && allDiff(x), 472), r)
    else if (kind === 'value') part = qValue(numWith(r, 102, 998, (x) => uniqueNonZero(x).length > 0, 472), r)
    else if (kind === 'tens') {
      const k = r.int(11, 99),
        hund = Math.floor(k / 10),
        rest = k % 10
      part = {
        prompt: `${k} tens make what number?`,
        input: 'number',
        answer: k * 10,
        strategies: [
          strat('Ten Tens Make 100', [`10 tens make 100.`, `${k} tens is ${hund} ${hund === 1 ? 'group' : 'groups'} of 10 tens${rest ? `, and ${rest} more ${rest === 1 ? 'ten' : 'tens'}` : ''}.`, `${hund * 100} + ${rest * 10} = ${hund * 100 + rest * 10}`], hund * 100 + rest * 10),
          strat('Count by Tens', [`Each ten is worth 10.`, `${k} × 10 = ${k * 10}`], k * 10),
        ],
        distractors: wrongs(k * 10, [k, k * 100, k + 10]),
        operands: [k, 10],
      }
    } else {
      const h = r.int(1, 9),
        t = r.int(1, 9),
        n = h * 100 + t * 10
      part = {
        prompt: `How many tens make ${n}? Count the tens inside the hundreds too.`,
        input: 'number',
        answer: n / 10,
        strategies: [
          strat('Hundreds Are Tens Too', [`Each hundred is 10 tens. ${nPlace(h, 100)} is ${h * 10} tens.`, `There ${t === 1 ? 'is' : 'are'} ${t} more ${t === 1 ? 'ten' : 'tens'}.`, `${h * 10} + ${t} = ${h * 10 + t}`], h * 10 + t),
          strat('Share into Tens', [`How many groups of 10 fit in ${n}?`, `${n} ÷ 10 = ${n / 10}`], n / 10),
        ],
        distractors: wrongs(n / 10, [t, h, n, h + t]),
        operands: [n, 10],
      }
    }
    return { ...part, difficulty: d }
  },

  'nv.read-1000': (rng, d) => {
    const r = R(rng)
    const tricky = (x: number) => hasZero(x) || (x % 100 >= 11 && x % 100 <= 19)
    const n = d === 1 ? (r.chance(0.5) ? r.int(21, 99) : numWith(r, 121, 999, (x) => noZero(x) && dig(x, 10) > 1, 342)) : d === 2 ? r.int(100, 999) : numWith(r, 101, 999, tricky, 507)
    const part = r.chance(0.6) ? qWordsToDigits(n, r) : qDigitsToWords(n, r, rng)
    return { ...part, difficulty: d }
  },

  'nv.compare-1000': (rng, d) => {
    const r = R(rng)
    const lo = d === 3 ? 100 : 10,
      hi = d === 1 ? 99 : 999
    let part: Part
    if (d > 1 && r.chance(0.3)) {
      const a = r.int(lo, hi)
      const ds = digitsOf(a)
      const mixed = Number(r.shuffle(ds).join(''))
      const pool = [a, mixed >= lo && mixed !== a ? mixed : r.int(lo, hi), d === 3 ? Math.floor(a / 100) * 100 + r.int(0, 99) : r.int(lo, hi)]
      while (new Set(pool).size < 3) pool[new Set(pool).size] = r.int(lo, hi)
      part = qPick3(r.shuffle([...new Set(pool)]), r.chance(), rng)
    } else {
      const a = r.int(lo, hi)
      let b = r.chance(0.12) ? a : r.int(lo, hi)
      if (d === 3 && a !== b && r.chance(0.6)) b = Math.floor(a / 100) * 100 + (b % 100 || 1) // same hundreds: look closer
      else if (d === 2 && a >= 100 && a !== b && r.chance(0.3)) b = dig(a, 100) * 100 + dig(a, 1) * 10 + dig(a, 10) // same digits, tens and ones swapped
      part = qCompare(a, b, rng)
    }
    return { ...part, difficulty: d }
  },

  'nv.skip-count': (rng, d) => {
    const r = R(rng)
    const step = d === 1 ? r.pick([2, 5, 10]) : d === 2 ? r.pick([5, 10, 100]) : r.pick([2, 5, 10, 100])
    const dir = d === 3 && r.chance(0.5) ? -1 : 1
    const span = step * 4
    let first: number
    if (d === 1) first = step * r.int(0, step === 10 ? 5 : 12)
    else if (step === 5) first = 5 * r.int(dir > 0 ? 20 : 24, dir > 0 ? 190 : 199)
    else if (step === 2) first = r.int(dir > 0 ? 100 : 108, dir > 0 ? 990 : 998)
    else first = r.int(dir > 0 ? 1 : span + 1, dir > 0 ? 999 - span : 999)
    const seq = [0, 1, 2, 3, 4].map((i) => first + dir * i * step)
    const m = d === 1 ? 4 : d === 2 ? r.pick([4, 4, 2, 3]) : r.int(1, 4)
    const ans = seq[m]
    const viaBefore = seq[m - 1] + dir * step
    const viaOther = m < 4 ? seq[m + 1] - dir * step : seq[0] + dir * m * step
    const [p, q] = m >= 2 ? [seq[0], seq[1]] : [seq[2], seq[3]]
    const sign = dir > 0 ? '+' : '−'
    const altStep = step === 5 ? 10 : step === 10 ? 5 : step === 100 ? 10 : 1
    return {
      prompt: m === 4 ? `Skip count: ${seq.slice(0, 4).map(fmtN).join(', ')}. What number comes next?` : `Skip count: ${seq.map((v, i) => (i === m ? 'a missing number' : fmtN(v))).join(', ')}. What number is missing?`,
      eq: seq.map((v, i) => (i === m ? Q : fmtN(v))).join(', '),
      eqOnly: true,
      input: 'number',
      answer: ans,
      strategies: [
        strat('Find the Jump', [`Look at two neighbors: ${fmtN(p)} and ${fmtN(q)}. The count goes ${dir > 0 ? 'up' : 'down'} by ${step} each time.`, `The number before the blank is ${fmtN(seq[m - 1])}.`, `${fmtN(seq[m - 1])} ${sign} ${step} = ${fmtN(viaBefore)}`], viaBefore, { line: [seq[m - 1], viaBefore] }),
        m < 4
          ? strat('Check from the Other Side', [`The number after the blank is ${fmtN(seq[m + 1])}.`, `Go one jump back the other way: ${fmtN(seq[m + 1])} ${dir > 0 ? '−' : '+'} ${step} = ${fmtN(viaOther)}`, `Both ways land on ${fmtN(viaOther)}.`], viaOther)
          : strat('Count All the Jumps', [`Start at ${fmtN(seq[0])}. The blank is ${m} jumps away.`, `${m} jumps of ${step} is ${m} × ${step} = ${m * step}`, `${fmtN(seq[0])} ${sign} ${m * step} = ${fmtN(viaOther)}`], viaOther),
      ],
      // counted by ones, used the wrong jump, went the wrong way, said the last number again
      distractors: wrongs(ans, [seq[m - 1] + dir, seq[m - 1] + dir * altStep, seq[m - 1] - dir * step, seq[m - 1]]),
      operands: [first, step * dir, m],
      difficulty: d,
    }
  },

  'nv.even-odd': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['is', 'is', 'pairs']) : r.pick(['is', 'is', 'pairs', 'which'])
    const n = d === 1 ? r.int(2, 20) : d === 2 ? r.int(21, 99) : r.int(100, 999)
    const half = Math.floor(n / 2)
    const left = n - half * 2
    const ones = n % 10
    const viaPairs = left === 0 ? 'even' : 'odd'
    const viaOnes = [0, 2, 4, 6, 8].includes(ones) ? 'even' : 'odd'
    const pairSteps = [
      n <= 20 ? `Put ${n} dots in pairs.` : `Try to split ${n} into two equal teams.`,
      left ? `${half} + ${half} + 1 = ${n}. One is left over with no partner.` : `${half} + ${half} = ${n}. Nothing is left over.`,
      left ? `A leftover means ${n} is odd.` : `No leftover means ${n} is even.`,
    ]
    const onesSteps = [n > 9 ? `Look only at the ones digit of ${n}. It is ${ones}.` : `Think of the even numbers: 2, 4, 6, 8, 10.`, `Even numbers end in 0, 2, 4, 6, or 8. Odd numbers end in 1, 3, 5, 7, or 9.`, `${ones} is ${viaOnes}, so ${n} is ${viaOnes}.`]
    const pic = n <= 20 ? { html: pairsSVG(n) } : {}
    if (kind === 'is')
      return {
        prompt: `Is ${n} even or odd?`,
        ...choice(n % 2 ? 'odd' : 'even', ['even', 'odd'], rng, true),
        strategies: [strat('Make Pairs', pairSteps, viaPairs, pic), strat('Look at the Ones', onesSteps, viaOnes)],
        operands: [n],
        difficulty: d,
      }
    if (kind === 'pairs') {
      const [thing, ask] = r.pick([
        ['baseball cards', 'Can he put them in pairs with none left over?'],
        ['socks', 'Can he match them all in pairs with none left over?'],
        ['bricks', 'Can he make two towers that are the same height and use every brick?'],
        ['players', 'Can they make two equal teams with nobody left out?'],
      ])
      return {
        prompt: thing === 'players' ? `There are ${n} players. ${ask}` : `{n} has ${n} ${thing}. ${ask}`,
        ...choice(n % 2 ? 'no' : 'yes', ['yes', 'no'], rng, true),
        strategies: [
          strat('Make Pairs', [...pairSteps, left ? `So the answer is no.` : `So the answer is yes.`], viaPairs === 'even' ? 'yes' : 'no', pic),
          strat('Look at the Ones', [...onesSteps, viaOnes === 'even' ? `Even numbers split into pairs. The answer is yes.` : `Odd numbers always have one left over. The answer is no.`], viaOnes === 'even' ? 'yes' : 'no'),
        ],
        operands: [n],
        difficulty: d,
      }
    }
    // which of these four numbers is even (or odd)?
    const wantEven = r.chance()
    const lo = d === 2 ? 11 : 100,
      hi = d === 2 ? 99 : 999
    const target = numWith(r, lo, hi, (x) => (x % 2 === 0) === wantEven, wantEven ? 48 : 57)
    const rest = new Set<number>()
    // tempting choices: the "other" kind, some with an even digit in front
    for (let i = 0; i < 60 && rest.size < 3; i++) {
      const x = r.int(lo, hi)
      if ((x % 2 === 0) !== wantEven && x !== target) rest.add(x)
    }
    for (let x = wantEven ? 13 + (lo > 99 ? 100 : 0) : 12 + (lo > 99 ? 100 : 0); rest.size < 3; x += 2) rest.add(x)
    const all = [target, ...rest]
    const want = wantEven ? 'even' : 'odd'
    const viaHalf = all.find((x) => (x - Math.floor(x / 2) * 2 === 0) === wantEven)!
    const viaDigit = all.find((x) => [0, 2, 4, 6, 8].includes(x % 10) === wantEven)!
    const th = Math.floor(target / 2)
    return {
      prompt: `Which number is ${want}?`,
      ...choice(String(target), [...rest].map(String), rng),
      strategies: [
        strat('Look at the Ones', [`Only the ones digit tells you. Even numbers end in 0, 2, 4, 6, or 8.`, `Ones digits: ${all.map((x) => `${x} ends in ${x % 10}`).join(', ')}.`, `Only ${viaDigit} ends in an ${want === 'even' ? 'even' : 'odd'} digit. So ${viaDigit} is ${want}.`], String(viaDigit)),
        strat('Make Two Equal Teams', [`An even number splits into two equal teams. An odd number has one left over.`, wantEven ? `${th} + ${th} = ${target}. Nothing is left over.` : `${th} + ${th} + 1 = ${target}. One is left over.`, `So ${viaHalf} is ${want}.`], String(viaHalf)),
      ],
      operands: all,
      difficulty: d,
    }
  },

  'nv.round-10-100': (rng, d) => {
    const r = R(rng)
    let n: number, unit: number
    if (d === 1) {
      unit = 10
      n = numWith(r, 11, 99, (x) => x % 10 !== 0, 47)
    } else if (d === 2) {
      unit = r.pick([10, 100])
      n = numWith(r, 101, 989, (x) => x % unit !== 0 && (unit === 100 || dig(x, 10) < 9 || x % 10 < 5), 347)
    } else {
      unit = r.pick([10, 100, 100])
      const kind = r.pick(['carry', 'half', 'small', 'any'])
      if (unit === 10) n = kind === 'carry' ? r.int(1, 9) * 100 + 90 + r.int(5, 9) : kind === 'half' ? r.int(10, 98) * 10 + 5 : numWith(r, 101, 989, (x) => x % 10 !== 0, 347)
      else n = kind === 'small' ? r.int(51, 99) : kind === 'half' ? r.int(1, 9) * 100 + 50 : kind === 'carry' ? r.int(1, 9) * 100 + r.int(45, 54) : numWith(r, 101, 949, (x) => x % 100 !== 0, 347)
    }
    return { ...roundWhole(n, unit, r, true), difficulty: d }
  },

  'nv.to-10000': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['w2d', 'value', 'build', 'digit']) : d === 2 ? r.pick(['w2d', 'w2d', 'd2w', 'value', 'build']) : r.pick(['w2d', 'd2w', 'build', 'compare', 'pick3', 'value'])
    const n = d === 1 ? numWith(r, 1111, 9999, (x) => noZero(x) && allDiff(x), 4352) : d === 2 ? numWith(r, 1001, 9999, (x) => r.chance(0.4) || hasZero(x), 4305) : numWith(r, 1001, 9999, (x) => hasZero(x) || x % 100 < 20, 4035)
    let part: Part
    if (kind === 'w2d') part = qWordsToDigits(n, r)
    else if (kind === 'd2w') part = qDigitsToWords(n, r, rng)
    else if (kind === 'digit') part = qDigit(n, r)
    else if (kind === 'value') part = qValue(uniqueNonZero(n).length ? n : numWith(r, 1023, 9876, (x) => uniqueNonZero(x).length > 0, 4305), r)
    else if (kind === 'build') part = qBuild(n, r, d === 3)
    else if (kind === 'compare') {
      const b = r.chance(0.1) ? n : r.chance(0.6) ? Math.floor(n / 100) * 100 + r.int(0, 99) : r.int(1000, 9999)
      part = qCompare(n, b, rng)
    } else {
      const pool = new Set<number>([n, Math.floor(n / 1000) * 1000 + r.int(0, 999)])
      const mixed = Number(r.shuffle(digitsOf(n)).join(''))
      if (mixed >= 1000) pool.add(mixed)
      while (pool.size < 3) pool.add(r.int(1000, 9999))
      part = qPick3(r.shuffle([...pool].slice(0, 3)), r.chance(), rng)
    }
    return { ...part, difficulty: d }
  },

  'nv.expanded': (rng, d) => {
    const r = R(rng)
    const n = d === 1 ? numWith(r, 111, 9999, noZero, 4352) : d === 2 ? numWith(r, 1001, 99999, (x) => hasZero(x) && pieces(x).length >= 2, 40305) : numWith(r, 10001, 999999, (x) => pieces(x).length >= 3, 405320)
    const parts = pieces(n)
    const kind = d === 1 ? r.pick(['toNumber', 'toNumber', 'missing']) : r.pick(['toNumber', 'missing', 'which'])
    const shown = d === 3 && kind === 'toNumber' ? r.shuffle(parts) : parts
    const sum = parts.reduce((s, x) => s + x, 0)
    const zeros = placesOf(n).filter((pl) => dig(n, pl) === 0)
    const ds = digitsOf(n)
    let part: Part
    if (kind === 'toNumber') {
      part = {
        prompt: `What number is ${shown.map(fmtN).join(' plus ')}?`,
        eq: `${shown.map(fmtN).join(' + ')} = ${Q}`,
        eqOnly: true,
        input: 'number',
        answer: n,
        strategies: [
          strat('Add the Parts', [`Put the parts in order, biggest first: ${list(parts.map(fmtN))}.`, `Add them: ${parts.map(fmtN).join(' + ')} = ${fmtN(sum)}`], sum),
          strat(
            'Place Chart',
            [`Each part fills one place: ${list(placesOf(n).filter((pl) => dig(n, pl)).map((pl) => nPlace(dig(n, pl), pl)))}.`, zeros.length ? `No part for the ${list(zeros.map((pl) => PLACE[pl][1]), 'or')} place. Write 0 there to hold the spot.` : `Every place gets a digit.`, `Read the chart: ${fmtN(n)}`],
            Number(ds.join('')),
            { html: chartN(n) },
          ),
        ],
        // squeezed the digits together, lost a zero, wrote them in the order shown
        distractors: wrongs(n, [Number(ds.filter((x) => x).join('')), Number(shown.map((x) => String(x)[0]).join('')), ...slips(n).slice(0, 2), n * 10]),
        operands: [n],
      }
    } else if (kind === 'missing') {
      const i = r.int(0, parts.length - 1)
      const miss = parts[i]
      const pl = 10 ** (String(miss).length - 1)
      const others = parts.filter((_, j) => j !== i)
      const viaTake = others.reduce((s, x) => s - x, n)
      part = {
        prompt: `${fmtN(n)} is broken into parts. One part is missing. What is the missing part?`,
        eq: `${fmtN(n)} = ${parts.map((x, j) => (j === i ? Q : fmtN(x))).join(' + ')}`,
        input: 'number',
        answer: miss,
        strategies: [
          strat('Place Chart', [`The parts go in order of place. The missing one is the ${PLACE[pl][1]} part.`, `${fmtN(n)} has ${dig(n, pl)} in the ${PLACE[pl][1]} place.`, `${dig(n, pl)} × ${fmtN(pl)} = ${fmtN(dig(n, pl) * pl)}`], dig(n, pl) * pl, { html: chartN(n, pl) }),
          strat('Take Away the Other Parts', [`Start with ${fmtN(n)} and take away the parts you can see.`, `${fmtN(n)} − ${others.map(fmtN).join(' − ')} = ${fmtN(viaTake)}`], viaTake),
        ],
        distractors: wrongs(miss, [dig(n, pl), miss * 10, miss / 10 >= 1 ? miss / 10 : miss * 100, pl]),
        operands: [n, miss],
      }
    } else {
      const form = (xs: number[]) => xs.map(fmtN).join(' + ')
      const right = form(parts)
      const bad = new Set<string>()
      bad.add(form(ds.filter((x) => x))) // just the digits
      const j = r.int(0, parts.length - 1)
      bad.add(form(parts.map((x, k) => (k === j ? (x >= 10 ? x / 10 : x * 10) : x)))) // one part in the wrong place
      if (zeros.length) bad.add(form(ds.filter((x) => x).map((x, k, a) => x * 10 ** (a.length - 1 - k)))) // skipped the zero place
      else bad.add(form(parts.map((x, k) => (k === 0 ? x * 10 : x))))
      bad.delete(right)
      part = {
        prompt: `Which one shows ${fmtN(n)} in expanded form?`,
        ...choice(right, [...bad], rng),
        strategies: [
          strat('Place Chart', [`Put ${fmtN(n)} in a place chart.`, `Write what each digit is worth: ${list(placesOf(n).filter((pl) => dig(n, pl)).map((pl) => `${nPlace(dig(n, pl), pl)} is ${fmtN(dig(n, pl) * pl)}`))}.`, `So ${fmtN(n)} = ${right}`], form(placesOf(n).filter((pl) => dig(n, pl)).map((pl) => dig(n, pl) * pl)), { html: chartN(n) }),
          strat('Add to Check', [`Add the parts in each choice. Only the right one makes ${fmtN(n)}.`, `${right} = ${fmtN(sum)}`, `That one matches.`], sum === n ? right : ''),
        ],
        operands: [n],
      }
    }
    return { ...part, difficulty: d }
  },

  'nv.ten-times': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['times', 'times', 'howMany']) : d === 2 ? r.pick(['times', 'divide', 'howMany', 'ofWhat']) : r.pick(['times', 'divide', 'howMany', 'ofWhat'])
    const p = d === 3 && r.chance(0.5) ? 100 : 10
    const k = p === 10 ? 1 : 2
    const pw = p === 10 ? '10' : '100'
    let part: Part
    if (kind === 'times' || kind === 'divide' || kind === 'ofWhat') {
      const n = d === 1 ? r.int(2, 99) : d === 2 ? r.int(11, 999) : r.int(11, 990)
      const big = n * p
      const slid = Number(String(n) + '0'.repeat(k))
      const ps = pieces(n)
      const viaParts = ps.reduce((s, x) => s + x * p, 0)
      if (kind === 'times') {
        const story = r.chance(0.4)
        part = {
          prompt: story ? r.pick([`Each box holds ${pw} baseballs. How many baseballs are in ${fmtN(n)} boxes?`, `A brick set has ${fmtN(n)} bricks. How many bricks are in ${pw} sets?`]) : `What is ${pw} times ${fmtN(n)}?`,
          eq: story ? undefined : `${pw} × ${fmtN(n)} = ${Q}`,
          eqOnly: !story,
          input: 'number',
          answer: big,
          strategies: [
            strat('Slide the Digits', [`Times ${pw} makes every digit ${k === 1 ? 'slide one place' : 'slide two places'} to the left.`, `The empty ${k === 1 ? 'ones place gets a 0' : 'tens and ones places get 0s'}.`, `${fmtN(n)} becomes ${fmtN(slid)}.`], slid, { html: chartN(slid) }),
            strat('Break It Apart', ps.length > 1 ? [`${fmtN(n)} = ${expand(n)}`, `Times ${pw} for each part: ${list(ps.map((x) => `${fmtN(x)} × ${pw} = ${fmtN(x * p)}`))}.`, `${ps.map((x) => fmtN(x * p)).join(' + ')} = ${fmtN(viaParts)}`] : [`${fmtN(n)} × ${pw} is ${fmtN(n)} ${p === 10 ? 'tens' : 'hundreds'}.`, `${fmtN(n)} ${p === 10 ? 'tens' : 'hundreds'} is ${fmtN(viaParts)}.`], viaParts),
          ],
          // added instead, put the zero on wrong, too many zeros
          distractors: wrongs(big, [n + p, big * 10, p === 100 ? n * 10 : n * 100, Number(String(n)[0] + '0' + String(n).slice(1))]),
          operands: [n, p],
        }
      } else {
        const back = Number(String(big).slice(0, -k))
        let found = 0
        for (let x = 1; x <= big; x++) if (x * p === big) { found = x; break } // prettier-ignore
        part = {
          prompt: kind === 'divide' ? `What is ${fmtN(big)} divided by ${pw}?` : `${fmtN(big)} is ${pw} times as big as what number?`,
          eq: kind === 'divide' ? `${fmtN(big)} ÷ ${pw} = ${Q}` : `${pw} × ${Q} = ${fmtN(big)}`,
          eqOnly: kind === 'divide',
          input: 'number',
          answer: n,
          strategies: [
            strat('Slide the Digits', [`Dividing by ${pw} makes every digit ${k === 1 ? 'slide one place' : 'slide two places'} to the right.`, `The ${k === 1 ? 'zero' : 'two zeros'} at the end ${k === 1 ? 'drops' : 'drop'} off.`, `${fmtN(big)} becomes ${fmtN(back)}.`], back),
            strat('Think Times', [`Ask: ${pw} times what number makes ${fmtN(big)}?`, `${pw} × ${fmtN(found)} = ${fmtN(found * p)}`, `So the number is ${fmtN(found)}.`], found),
          ],
          distractors: wrongs(n, [big * p, p === 100 ? n * 10 : Math.floor(n / 10), big - p, big]),
          operands: [big, p],
        }
      }
    } else {
      // how many times as big: same digit, places apart
      const digit = r.int(1, 9)
      const smallPl = r.pick(d === 1 ? [1, 10] : [1, 10, 100, 1000])
      const small = digit * smallPl,
        big = small * p
      let hops = 0
      for (let x = small; x < big; x *= 10) hops++
      part = {
        prompt: `${fmtN(big)} is how many times as big as ${fmtN(small)}?`,
        eq: `${fmtN(small)} × ${Q} = ${fmtN(big)}`,
        input: 'number',
        answer: p,
        strategies: [
          strat('Count the Places', [`The ${digit} moved ${hops === 1 ? 'one place' : 'two places'} to the left.`, `Each place to the left is 10 times as big.`, hops === 1 ? `One place is 10 times.` : `Two places: 10 × 10 = 100`], 10 ** hops, { html: chartN(big) + chartN(small) }),
          strat('Divide to Check', [`How many groups of ${fmtN(small)} fit in ${fmtN(big)}?`, `${fmtN(big)} ÷ ${fmtN(small)} = ${big / small}`, `Check: ${fmtN(small)} × ${big / small} = ${fmtN(small * (big / small))}`], big / small),
        ],
        distractors: wrongs(p, [p === 10 ? 100 : 10, 1000, digit, hops]),
        operands: [big, small],
      }
    }
    return { ...part, difficulty: d }
  },

  'nv.millions': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['w2d', 'value', 'build', 'pick3']) : d === 2 ? r.pick(['w2d', 'value', 'build', 'compare', 'pick3']) : r.pick(['w2d', 'w2d', 'build', 'compare', 'value', 'million'])
    const [lo, hi] = d === 1 ? [10000, 99999] : [100000, 999999]
    const n = d === 3 ? numWith(r, lo, hi, hasZero, 405020) : r.int(lo + 1, hi)
    let part: Part
    if (kind === 'w2d') part = qWordsToDigits(n, r)
    else if (kind === 'value') part = qValue(uniqueNonZero(n).length ? n : numWith(r, lo, hi, (x) => uniqueNonZero(x).length > 0, d === 1 ? 43052 : 430521), r)
    else if (kind === 'build') part = qBuild(n, r, d === 3)
    else if (kind === 'compare') {
      const b = r.chance(0.1) ? n : r.chance(0.5) ? Math.floor(n / 1000) * 1000 + r.int(0, 999) : r.chance(0.5) ? Math.floor(n / 10) : r.int(lo, hi)
      part = r.chance() ? qCompare(n, b, rng) : qCompare(b, n, rng)
    } else if (kind === 'pick3') {
      const pool = new Set<number>([n, Math.floor(n / 10000) * 10000 + r.int(0, 9999), Math.floor(n / 10) + r.int(0, 9)])
      while (pool.size < 3) pool.add(r.int(lo, hi))
      part = qPick3(r.shuffle([...pool]), r.chance(), rng)
    } else {
      // one million itself
      const unit = r.pick([1000, 10000, 100000])
      const count = 1_000_000 / unit
      let jumps = 0
      for (let x = unit; x <= 1_000_000; x += unit) jumps++
      part = {
        prompt: `How many ${PLACE[unit][1]} make one million?`,
        eq: `${Q} × ${fmtN(unit)} = 1,000,000`,
        input: 'number',
        answer: count,
        strategies: [
          strat('Slide the Digits', [`1,000,000 has 6 zeros. ${fmtN(unit)} has ${String(unit).length - 1}.`, `Take away the same zeros from both: 1,000,000 ÷ ${fmtN(unit)} = ${fmtN(count)}`], count),
          strat('Skip Count', [`Count by ${fmtN(unit)} until you reach 1,000,000.`, `${fmtN(unit)}, ${fmtN(unit * 2)}, ${fmtN(unit * 3)}, and on to 1,000,000.`, `That takes ${fmtN(jumps)} counts. Check: ${fmtN(jumps)} × ${fmtN(unit)} = 1,000,000`], jumps),
        ],
        distractors: wrongs(count, [count * 10, count / 10, String(unit).length - 1, 6]),
        operands: [1000000, unit],
      }
    }
    return { ...part, difficulty: d }
  },

  'nv.round-any': (rng, d) => {
    const r = R(rng)
    let n: number, unit: number
    if (d === 1) {
      unit = r.pick([10, 100, 1000])
      n = numWith(r, 1001, 9989, (x) => x % unit !== 0 && dig(x, unit) < 9, 4352)
    } else if (d === 2) {
      unit = r.pick([100, 1000, 10000])
      n = numWith(r, 10001, 99989, (x) => x % unit !== 0, 43520)
    } else {
      unit = r.pick([100, 1000, 10000, 100000])
      // lots of nines, so rounding up spills into the next place
      n = r.chance(0.4) ? Math.floor(r.int(100000, 989999) / (unit * 10)) * unit * 10 + 9 * unit + r.int(unit / 2, unit - 1) : numWith(r, 100001, 989999, (x) => x % unit !== 0, 435210)
    }
    return { ...roundWhole(n, unit, r, d > 1 && r.chance(0.3)), difficulty: d }
  },

  'nv.tenths': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['strip', 'strip', 'f2d', 'd2f', 'words']) : d === 2 ? r.pick(['line', 'strip', 'f2d', 'count', 'd2f']) : r.pick(['line', 'words', 'count', 'f2d', 'mixed', 'strip'])
    const k = r.int(1, 9)
    let whole = d === 1 ? 0 : d === 2 ? r.int(0, 1) : r.int(1, 2)
    if (d === 2 && (kind === 'count' || kind === 'strip')) whole = 1
    if (d === 2 && kind === 'line') whole = 0
    const T = whole * 10 + k
    const shown = fx(T, 1)
    const ans = dec(T / 10)
    const tenthsWords = `${words(k)} ${k === 1 ? 'tenth' : 'tenths'}`
    const name = whole ? `${words(whole)} and ${tenthsWords}` : tenthsWords
    const countList = T <= 4 ? Array.from({ length: T }, (_, i) => fx(i + 1, 1)).join(', ') : `0.1, 0.2, 0.3, and on up to ${shown}`
    const decStrats = (pic?: string): Strat[] => [
      strat('Count the Tenths', [`One tenth is written 0.1.`, `Count ${T} tenths: ${countList}.`, ...(whole ? [`10 tenths make 1 whole. So ${T} tenths is ${whole} whole${whole > 1 ? 's' : ''} and ${k} ${k === 1 ? 'tenth' : 'tenths'}: ${shown}.`] : [])], dec(T / 10), pic ? { html: pic } : {}),
      strat('Place Chart', [`Wholes go left of the dot. Tenths go just right of the dot.`, `Write ${whole} for the wholes and ${k} for the tenths.`, `That is ${whole}.${k}`], `${whole}.${k}`, { html: chartD(T * 100, 1, String(whole).length + 1) }),
    ]
    const decWrong = (extra: string[] = []) => dwrongs(ans, [...extra, String(T), whole ? `${whole}.0${k}` : `0.0${k}`, whole ? `${k}.${whole}` : `${k}.0`])
    let part: Part
    if (kind === 'strip') {
      part = {
        prompt: whole ? `Each strip is 1 whole, cut into 10 equal parts. What decimal shows the shaded part?` : `The strip is 1 whole. It has 10 equal parts, and ${k} ${k === 1 ? 'is' : 'are'} shaded. What decimal shows the shaded part?`,
        visual: stripSVG(T),
        input: 'decimal',
        answer: ans,
        strategies: decStrats(stripSVG(T)),
        distractors: decWrong([dec((whole * 10 + (10 - k)) / 10)]),
        operands: [T, 10],
      }
    } else if (kind === 'line') {
      const top = (whole + 1) * 10
      const pic = (dot: boolean) =>
        lineSVG(
          -0.4,
          top + 0.4,
          Array.from({ length: top + 1 }, (_, i): [number, string, boolean] => [i, i % 10 === 0 ? String(i / 10) : '', i % 10 === 0]),
          dot ? [[T, '']] : [[T, shown]],
        )
      const hops = T - whole * 10
      part = {
        prompt: `Each small hop on the line is one tenth. What decimal is the dot on?`,
        visual: pic(true),
        input: 'decimal',
        answer: ans,
        strategies: [
          strat('Count the Hops', [`Start at ${whole}. Each hop is one tenth, 0.1.`, `The dot is ${hops} ${hops === 1 ? 'hop' : 'hops'} past ${whole}.`, `${whole} and ${hops} ${hops === 1 ? 'tenth' : 'tenths'} is ${fx(whole * 10 + hops, 1)}.`], dec((whole * 10 + hops) / 10), { html: pic(false) }),
          strat('Count Back from the Next Whole', [`The next whole number is ${whole + 1}.`, `The dot is ${10 - k} ${10 - k === 1 ? 'hop' : 'hops'} before ${whole + 1}.`, `${whole + 1} − ${fx(10 - k, 1)} = ${fx((whole + 1) * 10 - (10 - k), 1)}`], dec(((whole + 1) * 10 - (10 - k)) / 10)),
        ],
        distractors: decWrong([dec((T + 1) / 10), dec((T - 1) / 10), dec((whole * 10 + (10 - k)) / 10)]),
        operands: [T, 10],
      }
    } else if (kind === 'f2d' || kind === 'words' || kind === 'mixed') {
      const mixed = kind === 'mixed' || (kind === 'words' && whole > 0)
      part = {
        prompt: kind === 'f2d' ? `Write ${words(T)} ${T === 1 ? 'tenth' : 'tenths'} as a decimal.` : kind === 'words' ? `Write "${name}" as a decimal.` : `Write ${whole} and ${k} ${k === 1 ? 'tenth' : 'tenths'} as a decimal.`,
        eq: kind === 'f2d' ? `${fracHTML(T, 10)} = ${Q}` : kind === 'mixed' ? `${whole} ${fracHTML(k, 10)} = ${Q}` : undefined,
        input: 'decimal',
        answer: ans,
        strategies: decStrats(stripSVG(T)),
        distractors: decWrong(mixed ? [dec((whole + k) / 10)] : [`${T}.10`]),
        operands: [T, 10],
      }
    } else if (kind === 'd2f') {
      const fracAns = `${T}/10`
      part = {
        prompt: `Write ${shown} as a fraction.${whole ? ' Use tenths. The top number can be bigger than 10.' : ''}`,
        input: 'fraction',
        answer: fracAns,
        strategies: [
          strat('Read the Places', [`In ${shown}, the ${k} is in the tenths place.`, whole ? `${whole} whole is 10 tenths. ${whole * 10} + ${k} = ${whole * 10 + k} tenths in all.` : `So ${shown} is ${k} ${k === 1 ? 'tenth' : 'tenths'}.`, `Tenths means the bottom number is 10: ${whole * 10 + k}/10`], `${whole * 10 + k}/10`, { html: chartD(T * 100, 1) }),
          strat('Draw It', [`Draw ${whole ? 'strips' : 'a strip'} cut into 10 equal parts.`, `Shade ${shown}. That is ${T} parts, and each part is 1/10.`, `${T} parts out of 10 is ${T}/10.`], `${T}/10`, { html: stripSVG(T) }),
        ],
        distractors: [`${T}/100`, `10/${T}`, ...(whole ? [`${k}/10`] : [`1/${T === 1 ? 100 : T}`])].filter((x, i, a) => a.indexOf(x) === i),
        operands: [T, 10],
      }
    } else {
      const viaRead = Number(shown.replace('.', ''))
      part = {
        prompt: `How many tenths are in ${shown} in all?`,
        input: 'number',
        answer: T,
        strategies: [
          strat('Wholes Are Tenths Too', [`1 whole is 10 tenths. So ${whole} whole${whole > 1 ? 's are' : ' is'} ${whole * 10} tenths.`, `There ${k === 1 ? 'is' : 'are'} ${k} more ${k === 1 ? 'tenth' : 'tenths'} after the dot.`, `${whole * 10} + ${k} = ${whole * 10 + k}`], whole * 10 + k, { html: stripSVG(T) }),
          strat('Read It as a Fraction', [`${shown} = ${viaRead}/10`, `The top number tells how many tenths: ${viaRead}.`], viaRead),
        ],
        distractors: wrongs(T, [k, whole + k, T * 10, whole]),
        operands: [T, 10],
      }
    }
    return { ...part, difficulty: d }
  },

  'nv.hundredths': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['grid', 'grid', 'f2d', 'd2f']) : d === 2 ? r.pick(['grid', 'f2d', 'parts', 'count', 'words', 'd2f']) : r.pick(['grid', 'f2d', 'parts', 'digit', 'mixed', 'count'])
    let H = d === 1 ? numWith(r, 11, 99, (x) => x % 10 !== 0, 37) : d === 2 ? (r.chance(0.4) ? r.int(1, 9) : r.int(11, 99)) : 100 * r.int(1, 2) + (r.chance(0.3) ? r.int(1, 9) : numWith(r, 11, 99, (x) => x % 10 !== 0, 37))
    if (kind === 'count') H = d === 2 ? r.int(1, 9) * 10 : r.int(11, 29) * 10
    if (kind === 'parts') H = H % 100 || 37
    if (kind === 'parts' && H < 10) H += 10 * r.int(1, 9)
    if (kind === 'digit') H = numWith(r, 123, 987, (x) => noZero(x) && allDiff(x), 247)
    const whole = Math.floor(H / 100),
      t = dig(H, 10),
      h = H % 10
    const shown = fx(H, 2)
    const ans = dec(H / 100)
    const viaParts = dec((whole * 100 + t * 10 + h) / 100)
    const partList = [whole ? String(whole) : '', t ? fx(t, 1) : '', h ? fx(h, 2) : ''].filter((x) => x)
    const decStrats = (pic?: string): Strat[] => [
      strat(
        'Tenths and Hundredths',
        [
          `10 hundredths make 1 tenth. ${H % 100} hundredths is ${t} ${t === 1 ? 'tenth' : 'tenths'} and ${h} ${h === 1 ? 'hundredth' : 'hundredths'}.`,
          ...(whole ? [`There ${whole === 1 ? 'is' : 'are'} also ${whole} whole${whole > 1 ? 's' : ''}.`] : []),
          partList.length > 1 ? `${partList.join(' + ')} = ${fx(H, 2)}` : `That is ${fx(H, 2)}.`,
        ],
        viaParts,
        pic ? { html: pic } : {},
      ),
      strat('Place Chart', [`After the dot come tenths, then hundredths.`, `Write ${whole} for the wholes, ${t} for the tenths, and ${h} for the hundredths.`, `That is ${whole}.${t}${h}`], `${whole}.${t}${h}`, { html: chartD(H * 10, 2) }),
    ]
    // slid to the wrong place, forgot the dot, digits swapped
    const decWrong = (extra: string[] = []) => dwrongs(ans, [...extra, dec(H / 10), dec(H / 1000), String(H), t !== h ? dec((whole * 100 + h * 10 + t) / 100) : ''])
    let part: Part
    if (kind === 'grid') {
      part = {
        prompt: whole ? `Each big square is 1 whole, cut into 100 small squares. What decimal shows the shaded part?` : `The big square is 1 whole. It has 100 small squares, and ${H} ${H === 1 ? 'is' : 'are'} shaded. What decimal shows the shaded part?`,
        visual: gridSVG(H),
        input: 'decimal',
        answer: ans,
        strategies: decStrats(gridSVG(H)),
        distractors: decWrong([dec((whole * 100 + 100 - (H % 100)) / 100)]),
        operands: [H, 100],
      }
    } else if (kind === 'f2d' || kind === 'words' || kind === 'mixed') {
      const hw = `${words(H % 100)} ${H % 100 === 1 ? 'hundredth' : 'hundredths'}`
      part = {
        prompt: kind === 'f2d' ? `Write ${fmtN(H)} ${H === 1 ? 'hundredth' : 'hundredths'} as a decimal.` : kind === 'words' ? `Write "${hw}" as a decimal.` : `Write ${whole} and ${H % 100} ${H % 100 === 1 ? 'hundredth' : 'hundredths'} as a decimal.`,
        eq: kind === 'f2d' ? `${fracHTML(H, 100)} = ${Q}` : kind === 'mixed' ? `${whole} ${fracHTML(H % 100, 100)} = ${Q}` : undefined,
        input: 'decimal',
        answer: ans,
        strategies: decStrats(gridSVG(H)),
        distractors: decWrong(),
        operands: [H, 100],
      }
    } else if (kind === 'parts') {
      part = {
        prompt: `What decimal is ${t} ${t === 1 ? 'tenth' : 'tenths'} and ${h} ${h === 1 ? 'hundredth' : 'hundredths'}?`,
        input: 'decimal',
        answer: ans,
        strategies: [
          strat('Add the Parts', [`${t} ${t === 1 ? 'tenth' : 'tenths'} is ${fx(t, 1)}. ${h} ${h === 1 ? 'hundredth' : 'hundredths'} is ${fx(h, 2)}.`, h ? `${fx(t, 1)} + ${fx(h, 2)} = ${fx(t * 10 + h, 2)}` : `There are no extra hundredths, so it is ${fx(t, 1)}.`], dec((t * 10 + h) / 100), { html: gridSVG(H) }),
          strat('Place Chart', [`After the dot come tenths, then hundredths.`, `Write ${t} in the tenths place and ${h} in the hundredths place.`, `That is 0.${t}${h}`], `0.${t}${h}`, { html: chartD(H * 10, 2) }),
        ],
        distractors: decWrong([dec((t + h) / 10), dec((h * 10 + t) / 100), `${t}.${h}`]),
        operands: [t, h],
      }
    } else if (kind === 'd2f') {
      part = {
        prompt: `Write ${shown} as a fraction. Use hundredths.`,
        input: 'fraction',
        answer: `${H}/100`,
        strategies: [
          strat('Read the Places', [`The last digit of ${shown} is in the hundredths place.`, `So read the digits after the dot as hundredths: ${t * 10 + h} hundredths.`, `Hundredths means the bottom number is 100: ${t * 10 + h}/100`], `${t * 10 + h}/100`, { html: chartD(H * 10, 2) }),
          strat('Draw It', [`Draw a big square cut into 100 small squares.`, `Shade ${shown}. That is ${H} small squares, and each one is 1/100.`, `${H} out of 100 is ${H}/100.`], `${H}/100`, { html: gridSVG(H) }),
        ],
        distractors: [`${H}/10`, `100/${H}`, `${H}/1000`],
        operands: [H, 100],
      }
    } else if (kind === 'count') {
      const T = H / 10
      const sh = fx(T, 1)
      part = {
        prompt: `How many hundredths are the same as ${sh}?`,
        eq: `${sh} = ${fracHTML(0, 100).replace('>0<', `>${Q}<`)}`,
        input: 'number',
        answer: H,
        strategies: [
          strat('Trade Tenths', [`${sh} is ${T} tenths.`, `Each tenth is 10 hundredths.`, `${T} × 10 = ${T * 10}`], T * 10, { html: gridSVG(H) }),
          strat('Add a Zero at the End', [`A zero at the end of a decimal does not change it: ${sh} = ${fx(H, 2)}`, `Now read the digits as hundredths: ${Number(fx(H, 2).replace('.', ''))} hundredths.`], Number(fx(H, 2).replace('.', ''))),
        ],
        distractors: wrongs(H, [T, T % 10, H * 10, T + 10]),
        operands: [T, 10],
      }
    } else {
      // which digit is in the ... place? (H is a three-digit count of hundredths, like 2.47)
      const which = r.pick([0, 1, 2])
      const nm = ['ones', 'tenths', 'hundredths'][which]
      const digit = [whole, t, h][which]
      const s = shown.replace('.', '')
      part = {
        prompt: `Look at ${shown}. Which digit is in the ${nm} place?`,
        input: 'number',
        answer: digit,
        strategies: [
          strat('Place Chart', [`Put ${shown} in a place chart. The dot sits between ones and tenths.`, `Look under ${nm}. The digit there is ${digit}.`], digit, { html: chartD(H * 10, 2, which === 0 ? 0 : which + 1) }),
          strat('Start at the Dot', [`The dot is your starting spot.`, which === 0 ? `The ones place is just left of the dot.` : which === 1 ? `The tenths place is the first spot right of the dot.` : `The hundredths place is the second spot right of the dot.`, `The digit there is ${s[which]}.`], Number(s[which])),
        ],
        distractors: wrongs(digit, [whole, t, h]),
        operands: [H, which],
      }
    }
    return { ...part, difficulty: d }
  },

  'nv.compare-decimals': (rng, d) => {
    const r = R(rng)
    type D = { v: number; s: string } // v in hundredths
    const tenth = (w: number): D => {
      const v = w * 100 + r.int(1, 9) * 10
      return { v, s: fx(v / 10, 1) }
    }
    const hund = (w: number): D => {
      const v = w * 100 + numWith(r, 1, 99, (x) => x % 10 !== 0, 45)
      return { v, s: fx(v, 2) }
    }
    const signOf = (x: number, y: number) => (x > y ? '>' : x < y ? '<' : '=')
    let A: D, B: D
    if (d === 1) {
      const w = r.chance(0.6) ? 0 : r.int(1, 5)
      A = tenth(w)
      B = r.chance(0.1) ? A : tenth(w)
    } else if (d === 2) {
      const w = r.chance(0.7) ? 0 : r.int(1, 3)
      A = tenth(w)
      const k = r.int(0, 3)
      const t = dig(A.v, 10)
      if (k === 0) B = { v: A.v, s: fx(A.v, 2) } // 0.3 and 0.30
      else if (k === 1) B = { v: w * 100 + t, s: fx(w * 100 + t, 2) } // 0.3 and 0.03
      else if (k === 2) {
        const v = w * 100 + Math.max(t - 1, 0) * 10 + r.int(2, 9) // 0.5 and 0.45: more digits but less
        B = { v, s: fx(v, 2) }
      } else B = hund(w)
      if (r.chance()) [A, B] = [B, A]
    } else {
      const w = r.int(0, 9)
      A = r.chance() ? tenth(w) : hund(w)
      const k = r.int(0, 3)
      if (k === 0) B = r.chance() ? tenth(w) : hund(w)
      else if (k === 1) {
        const v = w * 100 + dig(A.v, 10) + dig(A.v, 1) * 10 || w * 100 + 7 // digits after the dot swapped: 1.08 and 1.80
        B = v % 10 ? { v, s: fx(v, 2) } : { v, s: fx(v / 10, 1) }
      } else if (k === 2) B = r.chance() ? tenth(w + 1) : hund(Math.max(w - 1, 0))
      else B = hund(w)
    }
    const fmt2 = (x: D) => fx(x.v, 2)
    if (d === 3 && r.chance(0.3)) {
      // biggest or smallest of three
      const w = Math.floor(A.v / 100)
      const pool: D[] = [A]
      for (const c of [B, hund(w), tenth(w), hund(w), tenth(w + 1)]) if (pool.length < 3 && !pool.some((p) => p.v === c.v)) pool.push(c)
      const nums = r.shuffle(pool)
      const big = r.chance()
      const word = big ? 'biggest' : 'smallest'
      const byHund = nums.reduce((best, x) => ((big ? x.v > best.v : x.v < best.v) ? x : best))
      const key = (x: D) => fmt2(x).padStart(6, '0')
      const sorted = [...nums].sort((x, y) => (key(x) < key(y) ? -1 : 1))
      const byPlace = big ? sorted[2] : sorted[0]
      return {
        prompt: `Which number is the ${word}: ${list(nums.map((x) => x.s), 'or')}?`,
        ...choice(byHund.s, nums.map((x) => x.s), rng, true),
        strategies: [
          strat('Make Them Match', [`Write each one with two digits after the dot: ${nums.map(fmt2).join(', ')}.`, `Now compare them like whole numbers of hundredths: ${nums.map((x) => fmtN(x.v)).join(', ')}.`, `The ${word} is ${fmtN(byHund.v)} hundredths. That is ${byHund.s}.`], byHund.s),
          strat('Place by Place', [`Compare the ones first. If they tie, compare the tenths. Then the hundredths.`, `In order from small to big: ${sorted.map((x) => x.s).join(', ')}.`, `The ${word} is ${byPlace.s}.`], byPlace.s),
        ],
        operands: nums.map((x) => x.v),
        difficulty: d,
      }
    }
    const ans = signOf(A.v, B.v)
    const a2 = fmt2(A).padStart(6, '0'),
      b2 = fmt2(B).padStart(6, '0')
    let i = 0
    while (i < a2.length && a2[i] === b2[i]) i++
    const byPlace = i === a2.length ? '=' : a2[i] > b2[i] ? '>' : '<'
    const placeName = i >= 4 ? (i === 4 ? 'tenths' : 'hundredths') : 'ones'
    const story = d > 1 && A.v !== B.v && r.chance(0.25)
    const base = {
      strategies: [
        strat(
          'Make Them Match',
          [
            `Write both with two digits after the dot: ${fmt2(A)} and ${fmt2(B)}.`,
            `That is ${fmtN(A.v)} hundredths and ${fmtN(B.v)} hundredths.`,
            A.v === B.v ? `They are the same amount, so ${A.s} = ${B.s}` : `${fmtN(A.v)} is ${A.v > B.v ? 'more' : 'less'} than ${fmtN(B.v)}, so ${A.s} ${ans} ${B.s}`,
          ],
          ans,
          { html: barsSVG(A.v, B.v, A.s, B.s) },
        ),
        strat(
          'Place by Place',
          i === a2.length
            ? [`Compare the ones, then the tenths, then the hundredths.`, `Every place matches. A zero at the end does not change a decimal.`, `So they are equal.`]
            : [`Compare the ones first, then the tenths, then the hundredths.`, `The first place that is different is the ${placeName} place: ${a2[i]} and ${b2[i]}.`, `${a2[i]} is ${a2[i] > b2[i] ? 'more' : 'less'} than ${b2[i]}, so ${A.s} ${byPlace} ${B.s}`],
          byPlace,
        ),
      ],
      operands: [A.v, B.v],
      difficulty: d,
    }
    if (story) {
      const [lead, ask, wantBig] = r.pick([
        [`One bat weighs ${A.s} kilograms. Another weighs ${B.s} kilograms.`, 'Which bat is heavier?', true],
        [`{n} jumped ${A.s} meters. His friend jumped ${B.s} meters.`, 'Which jump is longer?', true],
        [`One runner took ${A.s} seconds. Another took ${B.s} seconds.`, 'Which time is faster? Faster means fewer seconds.', false],
      ] as [string, string, boolean][])
      const pickS = (sgn: string) => ((sgn === '>') === wantBig ? A.s : B.s)
      return {
        prompt: `${lead} ${ask}`,
        ...choice(pickS(ans), [A.s, B.s], rng, true),
        ...base,
        strategies: [
          strat(base.strategies[0].name, [...base.strategies[0].steps, `The ${wantBig ? 'bigger' : 'smaller'} number is ${pickS(ans)}.`], pickS(ans), { html: base.strategies[0].html }),
          strat(base.strategies[1].name, [...base.strategies[1].steps, `The ${wantBig ? 'bigger' : 'smaller'} number is ${pickS(byPlace)}.`], pickS(byPlace)),
        ],
      }
    }
    return {
      prompt: `Which sign goes between ${A.s} and ${B.s}? Is ${A.s} bigger, smaller, or the same?`,
      eq: `${A.s} ${Q} ${B.s}`,
      ...choice(ans, ['<', '=', '>'], rng, true),
      ...base,
    }
  },

  'nv.decimal-add-sub': (rng, d) => {
    const r = R(rng)
    const add = r.chance()
    // everything is counted in hundredths
    let A: number, B: number, pa: number, pb: number // pa, pb = digits shown after the dot
    if (d === 1) {
      pa = pb = 1
      const ta = r.int(1, 8),
        tb = add ? r.int(1, 9 - ta) : r.int(1, ta)
      const wa = r.int(0, 5),
        wb = add ? r.int(0, 4) : r.int(0, wa)
      A = wa * 100 + ta * 10
      B = wb * 100 + tb * 10
      if (!add && A === B) A += 100
    } else if (d === 2) {
      if (r.chance()) {
        pa = pb = 1
        const ta = r.int(1, 9)
        const tb = add ? r.int(10 - ta, 9) : numWith(r, 1, 9, (x) => x > (add ? 0 : ta - 10) && (add || x > ta || ta === 9), 9)
        const wa = add ? r.int(0, 8) : r.int(2, 9),
          wb = add ? r.int(0, 8) : r.int(0, wa - 1)
        A = wa * 100 + ta * 10
        B = wb * 100 + (add ? tb : ta === 9 ? r.int(1, 8) : tb) * 10
      } else {
        pa = pb = 2
        A = r.int(0, 4) * 100 + numWith(r, 11, 99, (x) => x % 10 !== 0, 45)
        B = r.int(0, 3) * 100 + numWith(r, 11, 99, (x) => x % 10 !== 0, 32)
        if (!add && A < B) [A, B] = [B, A]
        if (!add && A === B) A += 100
      }
    } else {
      // different numbers of digits after the dot
      pa = r.pick([1, 2])
      pb = 3 - pa
      const mk = (p: number, wmax: number) => r.int(0, wmax) * 100 + (p === 1 ? r.int(1, 9) * 10 : numWith(r, 1, 99, (x) => x % 10 !== 0, 75))
      A = mk(pa, 12)
      B = mk(pb, 9)
      if (!add && A < B) {
        ;[A, B] = [B, A]
        ;[pa, pb] = [pb, pa]
      }
    }
    const C = add ? A + B : A - B
    const sa = fx(A / 10 ** (2 - pa), pa),
      sb = fx(B / 10 ** (2 - pb), pb)
    const ans = dec(C / 100)
    const p = Math.max(pa, pb)
    const unit = p === 1 ? 'tenths' : 'hundredths'
    const sc = 10 ** (2 - p)
    const ai = A / sc,
      bi = B / sc,
      ci = add ? ai + bi : ai - bi
    const op = add ? '+' : '−'
    const show = (v: number) => (v % 10 ? fx(v, 2) : v % 100 ? fx(v / 10, 1) : fmtN(v / 100))
    const lineUp = strat(
      'Line Up the Dots',
      [pa !== pb ? `Give both numbers ${p} digits after the dot: ${fx(ai, p)} and ${fx(bi, p)}.` : `Line up the dots so tenths sit under tenths: ${sa} and ${sb}.`, `Think of them as ${unit}: ${fmtN(ai)} ${op} ${fmtN(bi)} = ${fmtN(ci)}`, `${fmtN(ci)} ${unit} is ${fx(ci, p)}.`],
      dec(ci / 10 ** p),
      { html: chartD(A * 10, p) + chartD(B * 10, p) },
    )
    const wa = Math.floor(A / 100),
      wb = Math.floor(B / 100),
      fa = A % 100,
      fb = B % 100
    let second: Strat
    const money = () =>
      strat('Think Money', [`Think of dollars and cents. ${sa} is ${fmtN(A)} cents. ${sb} is ${fmtN(B)} cents.`, `${fmtN(A)} ${op} ${fmtN(B)} = ${fmtN(add ? A + B : A - B)} cents`, `${fmtN(add ? A + B : A - B)} cents is ${show(add ? A + B : A - B)} in dollars.`], dec((add ? A + B : A - B) / 100))
    if (add) {
      second =
        wa + wb > 0
          ? strat('Wholes, Then Parts', [`Add the wholes: ${wa} + ${wb} = ${wa + wb}`, `Add the parts after the dot: ${show(fa)} + ${show(fb)} = ${show(fa + fb)}`, `Put them together: ${wa + wb} + ${show(fa + fb)} = ${show((wa + wb) * 100 + fa + fb)}`], dec(((wa + wb) * 100 + fa + fb) / 100))
          : money()
    } else {
      const mid = Math.ceil(B / 100) * 100
      second =
        mid > B && mid < A
          ? strat('Count Up', [`Start at ${sb}. Hop ${show(mid - B)} to get to ${show(mid)}.`, `Then hop ${show(A - mid)} more to get to ${sa}.`, `Add the hops: ${show(mid - B)} + ${show(A - mid)} = ${show(mid - B + (A - mid))}`], dec((mid - B + (A - mid)) / 100))
          : wb > 0 && fb > 0 && A - wb * 100 >= fb
            ? strat('Take Away in Parts', [`Take away the wholes first: ${sa} − ${wb} = ${show(A - wb * 100)}`, `Then take away the rest: ${show(A - wb * 100)} − ${show(fb)} = ${show(A - wb * 100 - fb)}`], dec((A - wb * 100 - fb) / 100))
            : money()
    }
    // lined up the last digits instead of the dots; forgot to regroup; did the other operation
    const rightAligned = pa !== pb ? (add ? (pa === 2 ? A + B / 10 : A / 10 + B) : pa === 2 ? A - B / 10 : A - B * 10) : -1
    const noCarry = add ? (wa + wb) * 100 + ((Math.floor(fa / 10) + Math.floor(fb / 10)) % 10) * 10 + ((fa + fb) % 10) : wa * 100 - wb * 100 + Math.abs(Math.floor(fa / 10) - Math.floor(fb / 10)) * 10 + Math.abs((fa % 10) - (fb % 10))
    const stuck = add && p === 1 && fa + fb >= 100 ? `${wa + wb}.${(fa + fb) / 10}` : ''
    const distractors = dwrongs(ans, [stuck, rightAligned > 0 ? dec(rightAligned / 100) : '', noCarry >= 0 ? dec(noCarry / 100) : '', dec((add ? Math.abs(A - B) : A + B) / 100), dec((C + 10) / 100)])
    const story = r.chance(0.35)
    const [text, unitWord] = add
      ? r.pick([
          [`{n} ran ${sa} miles on Monday and ${sb} miles on Tuesday. How many miles is that in all?`, 'miles'],
          [`One board is ${sa} meters long. Another is ${sb} meters long. How long are they end to end?`, 'meters'],
          [`A bat weighs ${sa} pounds. A glove weighs ${sb} pounds. How many pounds are they together?`, 'pounds'],
        ])
      : r.pick([
          [`A rope is ${sa} meters long. {n} cuts off ${sb} meters. How many meters are left?`, 'meters'],
          [`{n} threw the ball ${sa} meters. His friend threw it ${sb} meters. How much farther did {n} throw?`, 'meters'],
          [`A jug holds ${sa} liters. {n} pours out ${sb} liters. How many liters are left?`, 'liters'],
        ])
    return {
      prompt: story ? text : `What is ${sa} ${add ? 'plus' : 'minus'} ${sb}?`,
      eq: story ? undefined : `${sa} ${op} ${sb} = ${Q}`,
      eqOnly: !story,
      input: 'decimal',
      answer: ans,
      unit: story ? unitWord : undefined,
      strategies: [lineUp, second],
      distractors,
      operands: [A, B],
      difficulty: d,
    }
  },

  'nv.round-decimals': (rng, d) => {
    const r = R(rng)
    // V is counted in thousandths; `shownP` digits are shown after the dot; `unit` is the place we round to (also in thousandths)
    let V: number, shownP: number, unit: number
    if (d === 1) {
      shownP = 1
      unit = 1000
      V = (r.int(0, 20) * 10 + r.int(1, 9)) * 100
    } else if (d === 2) {
      shownP = 2
      unit = r.pick([100, 100, 1000])
      V = (r.int(0, 12) * 100 + numWith(r, 1, 99, (x) => x % 10 !== 0 && (unit === 1000 || x < 95), 47)) * 10
    } else {
      shownP = r.pick([3, 3, 2])
      unit = shownP === 3 ? r.pick([10, 10, 100, 1000]) : 100
      V = shownP === 3 ? r.int(0, 9) * 1000 + numWith(r, 1, 999, (x) => x % 10 !== 0, 286) : (r.int(0, 9) * 100 + 90 + r.int(5, 9)) * 10 // 2.96 → 3.0
    }
    const up = unit === 1000 ? 0 : unit === 100 ? 1 : 2 // digits after the dot in the answer
    const name = ['whole number', 'tenth', 'hundredth'][up]
    const f = (v: number, kind: 'n' | 'end' | 'mid') => (kind === 'n' ? fx(v / 10 ** (3 - shownP), shownP) : kind === 'end' ? fx(v / 10 ** (3 - up), up) : fx(v / 10 ** (2 - up), up + 1))
    const core = roundCore(V, unit, { f, place: ['ones', 'tenths', 'hundredths'][up], tail: 'Drop the digits after it.' })
    const ans = dec(core.ans / 1000)
    const N = f(V, 'n')
    const other = core.ans === core.lo ? core.hi : core.lo
    const unit2 = unit === 1000 ? 100 : unit === 100 ? 1000 : 100
    const prompt =
      d === 3 && unit === 10 && V < 1000 && r.chance(0.5)
        ? `A batting average is ${N}. Round it to the nearest hundredth.`
        : r.pick([`Round ${N} to the nearest ${name}.`, `What is ${N} rounded to the nearest ${name}?`, ...(unit === 1000 ? [`A fish is ${N} pounds. About how many pounds is that? Round to the nearest whole number.`] : [`A race took ${N} seconds. Round ${N} to the nearest ${name}.`])])
    return {
      prompt,
      input: 'decimal',
      answer: ans,
      strategies: core.strategies((v) => dec(v / 1000)),
      // rounded the other way, rounded to a different place, just chopped
      distractors: dwrongs(ans, [dec(other / 1000), unit2 < 10 ** (4 - shownP) ? '' : dec((Math.round(V / unit2) * unit2) / 1000), dec(core.lo / 1000), dec((core.ans + unit) / 1000)]),
      operands: [V, unit],
      difficulty: d,
    }
  },

  'nv.powers-of-ten': (rng, d) => {
    const r = R(rng)
    // all values are counted in thousandths so the arithmetic stays exact
    const UNIT: [number, string, string][] = [
      [1, 'thousandth', 'thousandths'],
      [10, 'hundredth', 'hundredths'],
      [100, 'tenth', 'tenths'],
      [1000, 'one', 'ones'],
      [10000, 'ten', 'tens'],
      [100000, 'hundred', 'hundreds'],
      [1000000, 'thousand', 'thousands'],
      [10000000, 'ten thousand', 'ten thousands'],
      [100000000, 'hundred thousand', 'hundred thousands'],
      [1000000000, 'million', 'millions'],
    ]
    const f = (v: number) => fmtN(v / 1000)
    const times = r.chance()
    const p = d === 1 ? r.pick([10, 100, 1000]) : d === 2 ? r.pick([10, 100]) : r.pick([10, 100, 1000, 1000])
    const k = String(p).length - 1
    // the smaller of the two numbers, s; the bigger is s × p
    let s: number
    if (d === 1) s = r.int(2, 99) * 1000 * (r.chance(0.3) ? 10 : 1)
    else if (d === 2) s = r.pick([numWith(r, 1, 99, (x) => x % 10 !== 0, 34) * 100, numWith(r, 1, 999, (x) => x % 10 !== 0, 245) * 10, r.int(1, 9) * 100])
    else s = p === 1000 ? numWith(r, 1, 999, (x) => x % 10 !== 0, 45) * r.pick([1, 10, 100]) : numWith(r, 1, 999, (x) => x % 10 !== 0, 45) * r.pick([1, 10])
    if (d === 2 && !times && s % 100 !== 0 && p === 100) s *= 10 // keep answers to thousandths or bigger
    const big = s * p
    const from = times ? s : big,
      to = times ? big : s
    const opS = times ? '×' : '÷'
    const dir = times ? 'left' : 'right'
    const slid = times ? Number(String(from) + '0'.repeat(k)) : Number(String(from).slice(0, -k))
    const ui = UNIT.findIndex(([u]) => from % (u * 10) !== 0)
    const count = from / UNIT[ui][0]
    const newUnit = UNIT[ui + (times ? k : -k)]
    const viaPlace = count * newUnit[0]
    const nm = (u: [number, string, string], c: number) => (c === 1 ? u[1] : u[2])
    const whole = d === 1
    const asAns = (v: number): number | string => (whole ? v / 1000 : dec(v / 1000))
    if (d === 3 && r.chance(0.25)) {
      // which power of ten did it?
      let found = 0
      const tries: string[] = []
      for (const q of [10, 100, 1000]) {
        if (!found) tries.push(`${f(s)} × ${fmtN(q)} = ${f(s * q)}`)
        if (!found && s * q === big) found = q
      }
      return {
        prompt: times ? `${f(s)} times what number makes ${f(big)}?` : `${f(big)} divided by what number makes ${f(s)}?`,
        eq: times ? `${f(s)} × ${Q} = ${f(big)}` : `${f(big)} ÷ ${Q} = ${f(s)}`,
        ...choice(fmtN(p), ['10', '100', '1,000'], rng, true),
        strategies: [
          strat('Count the Slides', [`Watch one digit. From ${f(from)} to ${f(to)}, each digit slid ${k} ${k === 1 ? 'place' : 'places'} to the ${dir}.`, `Each slide is one 10. ${k} ${k === 1 ? 'slide' : 'slides'} means a 1 with ${k} ${k === 1 ? 'zero' : 'zeros'}.`, `That is ${fmtN(10 ** k)}.`], fmtN(10 ** k)),
          strat('Try Each One', [`Try 10, then 100, then 1,000.`, ...tries, times ? `So the missing number is ${fmtN(found)}.` : `Times and divide undo each other, so the missing number is ${fmtN(found)}.`], fmtN(found)),
        ],
        operands: [from, to],
        difficulty: d,
      }
    }
    const story = d < 3 && times && r.chance(0.2)
    return {
      prompt: story ? `One baseball weighs ${f(from)} ${whole ? 'ounces' : 'pounds'}. How much do ${fmtN(p)} baseballs weigh?` : `What is ${f(from)} ${times ? 'times' : 'divided by'} ${fmtN(p)}?`,
      eq: story ? undefined : `${f(from)} ${opS} ${fmtN(p)} = ${Q}`,
      eqOnly: !story,
      input: whole ? 'number' : 'decimal',
      answer: asAns(to),
      strategies: [
        strat('Slide the Digits', [`${fmtN(p)} has ${k} ${k === 1 ? 'zero' : 'zeros'}. So every digit slides ${k} ${k === 1 ? 'place' : 'places'} to the ${dir}.`, times ? `Sliding left makes the number bigger.` : `Sliding right makes the number smaller.`, `${f(from)} becomes ${f(slid)}.`], asAns(slid)),
        strat('Think Place Value', [`${f(from)} is ${fmtN(count)} ${nm(UNIT[ui], count)}.`, `${times ? 'Times' : 'Dividing by'} ${fmtN(p)} turns ${UNIT[ui][2]} into ${newUnit[2]}.`, `${fmtN(count)} ${nm(newUnit, count)} is ${f(viaPlace)}.`, `Check: ${f(from)} ${opS} ${fmtN(p)} = ${f(viaPlace)}`], asAns(viaPlace)),
      ],
      // slid the wrong number of places, slid the wrong way, just stuck zeros on
      distractors: whole
        ? wrongs(to / 1000, [(times ? to * 10 : to / 10) / 1000, (times ? to / 10 : to * 10) / 1000, times ? from / 1000 + p : big / 1000 - p].filter((x) => Number.isInteger(x)))
        : dwrongs(dec(to / 1000), [dec((times ? to * 10 : to / 10) / 1000), times ? dec(to / 10000) : dec((to * 10) / 1000), times ? dec(from / 1000) + '0'.repeat(k) : dec((from * p) / 1000), dec(from / 1000)].filter((x) => /^\d+(\.\d{1,3})?$/.test(x))),
      operands: [from, p],
      difficulty: d,
    }
  },

  'nv.negatives-line': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['dot', 'dot', 'story']) : d === 2 ? r.pick(['dot', 'story', 'story', 'opposite', 'hop']) : r.pick(['dot', 'opposite', 'distance', 'story'])
    let part: Part
    if (kind === 'dot') {
      const s = d === 3 ? r.pick([2, 5]) : 1
      const c = numWith(r, 1, 9, (x) => x % 5 !== 0, 3)
      const n = (r.chance(0.8) ? -1 : 1) * c * s
      const L = Math.round(n / (5 * s)) * 5 * s
      const off = n - L
      const pic = (label: string) =>
        lineSVG(
          -10.6 * s,
          10.6 * s,
          Array.from({ length: 21 }, (_, i): [number, string, boolean] => [(i - 10) * s, (i - 10) % 5 === 0 ? neg((i - 10) * s) : '', (i - 10) % 5 === 0]),
          [[n, label]],
        )
      const viaZero = n < 0 ? 0 - c * s : c * s
      part = {
        prompt: s === 1 ? `What number is the dot on?` : `Each small hop on this line is ${s}. What number is the dot on?`,
        visual: pic(''),
        input: 'number',
        signed: true,
        answer: n,
        strategies: [
          strat(
            'Hop from Zero',
            [`Start at 0. The dot is ${c} ${c === 1 ? 'hop' : 'hops'} to the ${n < 0 ? 'left' : 'right'}.`, ...(s > 1 ? [`Each hop is ${s}. ${c} × ${s} = ${c * s}`] : []), n < 0 ? `Left of zero the numbers are negative. The dot is on ${neg(viaZero)}.` : `Right of zero the numbers are positive. The dot is on ${neg(viaZero)}.`],
            viaZero,
            { html: pic(neg(n)) },
          ),
          strat('Use a Label You Know', [`The closest label is ${neg(L)}.`, `The dot is ${Math.abs(off) / s} ${Math.abs(off) / s === 1 ? 'hop' : 'hops'} to the ${off < 0 ? 'left' : 'right'} of ${neg(L)}${s > 1 ? `, and each hop is ${s}` : ''}.`, `Going ${off < 0 ? 'left' : 'right'} from ${neg(L)} by ${Math.abs(off)} lands on ${neg(L + off)}.`], L + off),
        ],
        // forgot the minus sign, counted from the wrong label, off by one hop
        distractors: wrongs(n, [-n, L - off, n + s, n - s], true),
        operands: [n, s],
      }
    } else if (kind === 'story') {
      const k = d === 1 ? r.int(1, 10) : d === 2 ? r.int(2, 20) : r.int(11, 50)
      const text = r.pick([
        `It is ${k} ${k === 1 ? 'degree' : 'degrees'} below zero outside. What number shows that?`,
        `A parking garage is ${k} ${k === 1 ? 'floor' : 'floors'} below the ground. The ground is floor 0. What number is that floor?`,
        `A team lost ${k} ${k === 1 ? 'yard' : 'yards'} on a play. What number shows a loss of ${k}?`,
        `A fish swims ${k} feet below the top of the water. The top is 0. What number shows where the fish is?`,
        `{n} owes ${k} points in a game. His score is ${k} below zero. What number is his score?`,
      ])
      part = {
        prompt: text,
        input: 'number',
        signed: true,
        answer: -k,
        strategies: [
          strat('Hop Down from Zero', [`Zero is the starting line.`, `That is ${k} below zero. Go ${k} to the left of zero (or down).`, `Numbers below zero get a minus sign: ${neg(0 - k)}.`], 0 - k, { line: [0, -k] }),
          strat('Find the Opposite', [`${k} above zero is just ${k}.`, `${k} below zero is its opposite. It is the same distance from 0, on the other side.`, `The opposite of ${k} is ${neg(-1 * k)}.`], -1 * k),
        ],
        distractors: wrongs(-k, [k, 0, -k - 1, -k + 1], true),
        operands: [k],
      }
    } else if (kind === 'hop') {
      const k = r.int(2, 12)
      const left = r.chance(0.75)
      const n = left ? -k : k
      part = {
        prompt: `Start at 0 on the number line. Hop ${k} to the ${left ? 'left' : 'right'}. What number are you on?`,
        input: 'number',
        signed: true,
        answer: n,
        strategies: [
          strat('Count the Hops', [`Start at 0. Each hop ${left ? 'left goes down by 1' : 'right goes up by 1'}.`, left ? `Count: −1, −2, and on to ${neg(n)}.` : `Count: 1, 2, and on to ${n}.`, `After ${k} hops you are on ${neg(left ? 0 - k : 0 + k)}.`], left ? 0 - k : 0 + k, { line: [0, n] }),
          strat('Left Is Negative', [`Right of zero is positive. Left of zero is negative.`, `You are ${k} away from zero, on the ${left ? 'left' : 'right'} side.`, `So the number is ${neg((left ? -1 : 1) * k)}.`], (left ? -1 : 1) * k),
        ],
        distractors: wrongs(n, [-n, n + 1, n - 1], true),
        operands: [0, n],
      }
    } else if (kind === 'opposite') {
      const k = r.int(1, d === 2 ? 12 : 30)
      const n = d === 2 ? k : r.chance(0.7) ? -k : k
      const flipped = n < 0 ? Math.abs(n) : 0 - n
      part = {
        prompt: `What is the opposite of ${neg(n)}? The opposite is just as far from 0, on the other side.`,
        input: 'number',
        signed: true,
        answer: -n,
        strategies: [
          strat(
            'Flip Over Zero',
            [`${neg(n)} is ${k} ${k === 1 ? 'hop' : 'hops'} to the ${n < 0 ? 'left' : 'right'} of 0.`, `Flip to the other side: ${k} ${k === 1 ? 'hop' : 'hops'} to the ${n < 0 ? 'right' : 'left'} of 0.`, `That is ${neg(flipped)}.`],
            flipped,
            k <= 10 ? { html: lineSVG(-10.6, 10.6, Array.from({ length: 21 }, (_, i): [number, string, boolean] => [i - 10, (i - 10) % 5 === 0 ? neg(i - 10) : '', (i - 10) % 5 === 0]), [[n, neg(n), '#546e7a'], [flipped, neg(flipped), '#2e7d32']]) } : {},
          ),
          strat('Change the Sign', [n < 0 ? `${neg(n)} has a minus sign.` : `${neg(n)} has no minus sign.`, n < 0 ? `Take the minus sign away to get the opposite.` : `Put a minus sign on to get the opposite.`, `The opposite is ${neg(-1 * n)}.`], -1 * n),
        ],
        distractors: wrongs(-n, [n, 0, -n + 1, -n - 1], true),
        operands: [n],
      }
    } else {
      const k = r.int(2, 30)
      const n = r.chance(0.8) ? -k : k
      let hops = 0
      for (let x = n; x !== 0; x += n < 0 ? 1 : -1) hops++
      part = {
        prompt: `How far is ${neg(n)} from 0 on the number line? Count the hops.`,
        input: 'number',
        answer: k,
        strategies: [
          strat('Count the Hops', [`Start at ${neg(n)} and hop to 0, one at a time.`, `It takes ${hops} ${hops === 1 ? 'hop' : 'hops'}.`, `Distance is never negative. It is just how many hops: ${hops}.`], hops, { line: [n, 0] }),
          strat('Use the Opposite', [`${neg(n)} and ${neg(-n)} are opposites. They are the same distance from 0.`, `${Math.abs(n)} is ${Math.abs(n)} away from 0.`, `So ${neg(n)} is ${Math.abs(n)} away from 0 too.`], Math.abs(n)),
        ],
        distractors: wrongs(k, [0, k + 1, k - 1, k * 2]),
        operands: [n, 0],
      }
    }
    return { ...part, difficulty: d }
  },

  'nv.negatives-compare': (rng, d) => {
    const r = R(rng)
    const rule = (a: number, b: number) => (a === b ? '=' : a < 0 && b < 0 ? (Math.abs(a) > Math.abs(b) ? '<' : '>') : a < 0 ? '<' : b < 0 ? '>' : a > b ? '>' : '<')
    const ruleSteps = (a: number, b: number): string[] =>
      a === b
        ? [`Both numbers are the same.`, `So use the equals sign.`]
        : a < 0 && b < 0
          ? [`Both are below zero. Think of a thermometer.`, `${neg(a)} is ${-a} below zero. ${neg(b)} is ${-b} below zero.`, `Farther below zero is colder, and colder is smaller. So ${neg(Math.abs(a) > Math.abs(b) ? a : b)} is the smaller one.`]
          : a < 0 || b < 0
            ? [`One number is below zero and the other is not.`, `Any number below zero is smaller than zero and smaller than every positive number.`, `So ${neg(Math.min(a, b))} is the smaller one.`]
            : [`Neither number is below zero.`, `Compare them the usual way: ${neg(Math.max(a, b))} is bigger.`]
    const small = (x: number) => Math.abs(x) <= 10
    const pic = (vals: number[], hi?: number) =>
      vals.every(small)
        ? {
            html: lineSVG(
              -10.6,
              10.6,
              Array.from({ length: 21 }, (_, i): [number, string, boolean] => [i - 10, (i - 10) % 5 === 0 ? neg(i - 10) : '', (i - 10) % 5 === 0]),
              vals.map((v): [number, string, string] => [v, neg(v), v === hi ? '#2e7d32' : '#e65100']),
            ),
          }
        : {}
    const kind = d === 1 ? 'sign' : d === 2 ? r.pick(['sign', 'sign', 'story']) : r.pick(['sign', 'story', 'pick3', 'pick3'])
    if (kind === 'pick3') {
      const pool = new Set<number>()
      const a = -r.int(2, 30)
      pool.add(a)
      pool.add(-a)
      pool.add(a + r.pick([-3, -1, 1, 2]))
      if (r.chance(0.4)) pool.add(0)
      while (pool.size < 3) pool.add(r.int(-30, 30))
      const nums = r.shuffle([...pool]).slice(0, 3)
      const big = r.chance(0.4)
      const word = big ? 'biggest' : 'smallest'
      const byLine = big ? Math.max(...nums) : Math.min(...nums)
      const byRule = nums.reduce((best, x) => (rule(x, best) === (big ? '>' : '<') ? x : best))
      const order = [...nums].sort((x, y) => x - y)
      return {
        prompt: `Which number is the ${word}: ${list(nums.map(neg), 'or')}?`,
        ...choice(neg(byLine), nums.map(neg), rng, true),
        strategies: [
          strat('Number Line', [`Put the numbers on a number line. Left is smaller. Right is bigger.`, `From left to right: ${order.map(neg).join(', ')}.`, `The ${word} is ${neg(byLine)}.`], neg(byLine), pic(nums, byLine)),
          strat('Think Thermometer', [`Think of them as temperatures. Below zero is cold.`, big ? `The warmest one is the biggest. A number above zero beats any number below zero.` : `The coldest one is the smallest. The one farthest below zero is the coldest.`, `The ${word} is ${neg(byRule)}.`], neg(byRule)),
        ],
        operands: nums,
        difficulty: d,
      }
    }
    let a: number, b: number
    if (d === 1) {
      a = -r.int(1, 9)
      b = r.chance(0.5) ? r.int(0, 9) : -r.int(1, 9)
    } else if (d === 2) {
      a = -r.int(1, 20)
      b = r.chance(0.7) ? -r.int(1, 20) : r.chance(0.3) ? -a : r.int(0, 20)
    } else {
      a = -r.int(11, 99)
      const sw = -Number(String(-a).split('').reverse().join(''))
      b = r.chance(0.4) && sw !== a && sw <= -10 ? sw : r.chance(0.3) ? -a : r.chance(0.5) ? a + r.pick([-2, -1, 1, 2]) : r.int(-99, 20)
    }
    b = Math.max(b, -99)
    if (kind === 'story' && a === b) b = a <= -99 ? a + 1 : a - 1
    if (r.chance()) [a, b] = [b, a]
    const ans = a > b ? '>' : a < b ? '<' : '='
    const viaRule = rule(a, b)
    if (kind === 'story') {
      const [lead, ask, wantBig] = r.pick([
        [`Monday was ${neg(a)} degrees. Tuesday was ${neg(b)} degrees.`, 'Which temperature is colder?', false],
        [`Monday was ${neg(a)} degrees. Tuesday was ${neg(b)} degrees.`, 'Which temperature is warmer?', true],
        [`In a game, {n} has ${neg(a)} points. His friend has ${neg(b)} points.`, 'Which score is higher?', true],
        [`One fish is at ${neg(a)} feet. Another is at ${neg(b)} feet. Zero is the top of the water.`, 'Which fish is deeper? Deeper means the lower number.', false],
      ] as [string, string, boolean][])
      const pickN = (sgn: string) => ((sgn === '>') === wantBig ? a : b)
      return {
        prompt: `${lead} ${ask}`,
        ...choice(neg(pickN(ans)), [neg(a), neg(b)], rng, true),
        strategies: [
          strat('Number Line', [`Find both numbers on a number line.`, `${neg(Math.max(a, b))} is farther right, so it is the bigger number. ${neg(Math.min(a, b))} is the smaller one.`, `${wantBig ? 'You want the bigger number' : 'You want the smaller number'}: ${neg(pickN(ans))}.`], neg(pickN(ans)), pic([a, b], pickN(ans))),
          strat('Think Thermometer', [...ruleSteps(a, b), `${wantBig ? 'You want the bigger number' : 'You want the smaller number'}: ${neg(pickN(viaRule))}.`], neg(pickN(viaRule))),
        ],
        operands: [a, b],
        difficulty: d,
      }
    }
    return {
      prompt: `Which sign goes between ${neg(a)} and ${neg(b)}? Is ${neg(a)} bigger, smaller, or the same?`,
      eq: `${neg(a)} ${Q} ${neg(b)}`,
      ...choice(ans, ['<', '=', '>'], rng, true),
      strategies: [
        strat('Number Line', [`Find both numbers on a number line.`, a === b ? `They sit at the same spot. Use the equals sign.` : `${neg(Math.max(a, b))} is farther to the right, so it is bigger.`, `The open mouth faces the bigger number: ${neg(a)} ${ans} ${neg(b)}`], ans, a === b ? {} : pic([a, b], Math.max(a, b))),
        strat('Think Thermometer', [...ruleSteps(a, b), `${neg(a)} ${viaRule} ${neg(b)}`], viaRule),
      ],
      operands: [a, b],
      difficulty: d,
    }
  },

  'nv.negatives-add': (rng, d) => {
    const r = R(rng)
    const kind = d === 1 ? r.pick(['pos-minus', 'neg-plus']) : d === 2 ? r.pick(['pos-minus', 'neg-plus', 'neg-minus', 'neg-minus']) : r.pick(['plus-neg', 'neg-plus-neg', 'minus-neg', 'neg-minus-neg', 'neg-minus', 'neg-plus'])
    const top = d === 1 ? 10 : d === 2 ? 20 : 15
    const x = r.int(1, top),
      y = r.int(1, top)
    // s = where you start, m = the hop (negative means left)
    let s: number, m: number, text: string, how: string, say: string
    if (kind === 'pos-minus') {
      s = Math.min(x, y) === Math.max(x, y) ? x - 1 : Math.min(x, y)
      m = -(Math.max(x, y) === s ? s + 1 : Math.max(x, y))
      text = `${s} − ${-m}`
      say = `${s} minus ${-m}`
      how = `Taking away ${-m} means hop ${-m} to the left.`
    } else if (kind === 'neg-plus') {
      s = -x
      m = y
      text = `−${x} + ${y}`
      say = `negative ${x} plus ${y}`
      how = `Adding ${y} means hop ${y} to the right.`
    } else if (kind === 'neg-minus') {
      s = -x
      m = -y
      text = `−${x} − ${y}`
      say = `negative ${x} minus ${y}`
      how = `Taking away ${y} means hop ${y} to the left.`
    } else if (kind === 'plus-neg') {
      s = x
      m = -y
      text = `${x} + (−${y})`
      say = `${x} plus negative ${y}`
      how = `Adding a negative number means hop to the left: ${y} hops.`
    } else if (kind === 'neg-plus-neg') {
      s = -x
      m = -y
      text = `−${x} + (−${y})`
      say = `negative ${x} plus negative ${y}`
      how = `Adding a negative number means hop to the left: ${y} hops.`
    } else if (kind === 'minus-neg') {
      s = x
      m = y
      text = `${x} − (−${y})`
      say = `${x} minus negative ${y}`
      how = `Taking away a negative is the same as adding. Hop ${y} to the right.`
    } else {
      s = -x
      m = y
      text = `−${x} − (−${y})`
      say = `negative ${x} minus negative ${y}`
      how = `Taking away a negative is the same as adding. Hop ${y} to the right.`
    }
    const ans = s + m
    const crosses = (s < 0 && ans > 0) || (s > 0 && ans < 0)
    const toZero = Math.abs(s)
    const rest = Math.abs(m) - toZero
    const viaLine = crosses ? (m > 0 ? 0 + rest : 0 - rest) : s + m
    // chips: every + chip and − chip together make zero
    const P = (s > 0 ? s : 0) + (m > 0 ? m : 0),
      N = (s < 0 ? -s : 0) + (m < 0 ? -m : 0)
    const pairs = Math.min(P, N)
    const viaChips = P >= N ? P - N : -(N - P)
    const chipHow = kind === 'minus-neg' || kind === 'neg-minus-neg' ? `Taking away ${y} minus chips is like adding ${y} plus chips.` : kind === 'pos-minus' || kind === 'neg-minus' ? `Taking away ${-m} is like adding ${-m} minus chips.` : `A plus chip and a minus chip together make zero.`
    const plain = kind === 'pos-minus' || kind === 'neg-plus' || kind === 'neg-minus'
    const story = plain && r.chance(0.4)
    const stories: string[] =
      m < 0
        ? [
            `It was ${neg(s)} degrees. Then it got ${-m} degrees colder. What is the temperature now?`,
            `An elevator is on floor ${neg(s)}. The ground is floor 0. It goes down ${-m} floors. What floor is it on now?`,
            `{n} has ${neg(s)} points in a game. He loses ${-m} points. What is his score now?`,
          ]
        : [
            `It was ${neg(s)} degrees. Then it got ${m} degrees warmer. What is the temperature now?`,
            `An elevator is on floor ${neg(s)}. The ground is floor 0. It goes up ${m} floors. What floor is it on now?`,
            `{n} has ${neg(s)} points in a game. He wins ${m} points. What is his score now?`,
          ]
    return {
      prompt: story ? r.pick(stories) : `What is ${say}?`,
      eq: story ? undefined : `${text} = ${Q}`,
      eqOnly: !story,
      input: 'number',
      signed: true,
      answer: ans,
      strategies: [
        strat(
          'Hop on the Line',
          [
            `Start at ${neg(s)}. ${story ? (m < 0 ? `Going down by ${-m} means hop ${-m} to the left.` : `Going up by ${m} means hop ${m} to the right.`) : how}`,
            ...(crosses ? [`It takes ${toZero} ${toZero === 1 ? 'hop' : 'hops'} to get to 0. Then there ${rest === 1 ? 'is' : 'are'} ${rest} more ${rest === 1 ? 'hop' : 'hops'} to go.`] : []),
            `You land on ${neg(viaLine)}.`,
          ],
          viaLine,
          { line: crosses ? [s, 0, ans] : [s, ans] },
        ),
        strat(
          'Plus and Minus Chips',
          [
            chipHow,
            `Now you have ${P} plus ${P === 1 ? 'chip' : 'chips'} and ${N} minus ${N === 1 ? 'chip' : 'chips'}.`,
            pairs && viaChips === 0 ? `Every chip has a partner. All ${pairs} ${pairs === 1 ? 'pair makes' : 'pairs make'} zero, so no chips are left.` : pairs ? `${pairs} ${pairs === 1 ? 'pair makes' : 'pairs make'} zero and ${pairs === 1 ? 'goes' : 'go'} away. ${Math.abs(viaChips)} ${viaChips < 0 ? 'minus' : 'plus'} ${Math.abs(viaChips) === 1 ? 'chip is' : 'chips are'} left.` : `No pairs can cancel. All ${Math.abs(viaChips)} chips are ${viaChips < 0 ? 'minus' : 'plus'} chips.`,
            `That is ${neg(viaChips)}.`,
          ],
          viaChips,
        ),
      ],
      // lost the sign, added the sizes, hopped the wrong way
      distractors: wrongs(ans, [-ans, Math.abs(s) + Math.abs(m), -(Math.abs(s) + Math.abs(m)), s - m, Math.abs(Math.abs(s) - Math.abs(m))], true),
      operands: [s, m],
      difficulty: d,
    }
  },
}

export const teach: Record<string, string> = {
  'nv.hundreds-tens-ones': 'Every digit has a place. In 342, the 3 means 3 hundreds, the 4 means 4 tens, and the 2 means 2 ones. Ten ones make a ten, and ten tens make a hundred.',
  'nv.read-1000': 'To read a number, say the hundreds first, then the tens and ones. To write one, give every place a digit. If a place is empty, a zero holds its spot.',
  'nv.compare-1000': 'To see which number is bigger, look at the biggest place first. The first place where the digits are different tells you. The open mouth faces the bigger number.',
  'nv.skip-count': 'Skip counting means making the same size jump every time. Find the jump, then make one more jump to get the next number.',
  'nv.even-odd': 'Even numbers can be put in pairs with none left over. Odd numbers always have one left over. Just look at the ones digit: 0, 2, 4, 6, 8 are even.',
  'nv.round-10-100': 'Rounding finds the closest friendly number. Look at the digit next door on the right. If it is 5 or more, round up. If it is less than 5, stay.',
  'nv.to-10000': 'Big numbers have a thousands place too. Read the thousands first, then the rest. Each place is worth ten times the place to its right.',
  'nv.expanded': 'Expanded form stretches a number out to show what each digit is worth. 4,305 is 4,000 + 300 + 5. A zero means that place adds nothing.',
  'nv.ten-times': 'When you multiply by 10, every digit slides one place to the left and gets ten times bigger. When you divide by 10, the digits slide back to the right.',
  'nv.millions': 'Read big numbers in chunks of three digits. Say the first chunk, say "thousand", then read the rest. A thousand thousands make one million.',
  'nv.round-any': 'You can round to any place. Find that place, then look at the digit next door on the right. 5 or more rounds up. Less than 5 stays. The digits after it turn to zeros.',
  'nv.tenths': 'Cut one whole into 10 equal parts. Each part is one tenth. We write one tenth as 0.1. The first spot after the dot is the tenths place.',
  'nv.hundredths': 'Cut one whole into 100 equal parts. Each part is one hundredth, written 0.01. The second spot after the dot is the hundredths place. Ten hundredths make one tenth.',
  'nv.compare-decimals': 'To compare decimals, line up the dots and go place by place from the left. More digits does not mean bigger: 0.5 is the same as 0.50, and that is more than 0.45.',
  'nv.decimal-add-sub': 'To add or take away decimals, line up the dots first. Then tenths go with tenths and hundredths go with hundredths, just like with whole numbers.',
  'nv.round-decimals': 'Decimals round just like whole numbers. Find the place you want, then look at the digit next door on the right. 5 or more rounds up. Less than 5 stays.',
  'nv.powers-of-ten': 'Times 10 slides every digit one place to the left. Divide by 10 slides them one place to the right. For 100 slide two places, and for 1,000 slide three.',
  'nv.negatives-line': 'The number line keeps going to the left of zero. Those numbers are negative, like −3. They show things below zero, like very cold days or floors under the ground.',
  'nv.negatives-compare': 'On the number line, numbers get bigger as you go right. So −2 is bigger than −7, just like 2 below zero is warmer than 7 below zero.',
  'nv.negatives-add': 'Adding means hop to the right. Taking away means hop to the left. You can hop right past zero into the negative numbers and back again.',
}

const isNum = (it: Item) => it.input === 'number' && typeof it.answer === 'number'
const isDec = (it: Item, max: number, places: number) => it.input === 'decimal' && typeof it.answer === 'string' && Number(it.answer) >= 0 && Number(it.answer) <= max && (it.answer.split('.')[1] || '').length <= places
const isSign = (it: Item) => it.input === 'choice' && ['<', '=', '>'].includes(String(it.answer))
const opsIn = (it: Item, lo: number, hi: number) => it.operands.every((x) => x >= lo && x <= hi)

export const limits: Record<string, (it: Item) => boolean> = {
  'nv.hundreds-tens-ones': (it) => isNum(it) && +it.answer >= 0 && +it.answer <= 999 && it.operands[0] >= 10 && it.operands[0] <= 999,
  'nv.read-1000': (it) => it.operands[0] >= 20 && it.operands[0] <= 999 && (it.input === 'choice' || (isNum(it) && it.answer === it.operands[0])),
  'nv.compare-1000': (it) => it.input === 'choice' && opsIn(it, 10, 999) && (it.operands.length === 2 ? isSign(it) : it.operands.length === 3),
  'nv.skip-count': (it) => isNum(it) && +it.answer >= 0 && +it.answer <= 1000 && it.operands[0] >= 0 && it.operands[0] <= 1000 && [2, 5, 10, 100].includes(Math.abs(it.operands[1])),
  'nv.even-odd': (it) => it.input === 'choice' && opsIn(it, 1, 999) && it.operands.every(Number.isInteger),
  'nv.round-10-100': (it) => isNum(it) && it.operands[0] >= 11 && it.operands[0] <= 999 && [10, 100].includes(it.operands[1]) && +it.answer % it.operands[1] === 0 && Math.abs(+it.answer - it.operands[0]) <= it.operands[1] / 2 && +it.answer <= 1000,
  'nv.to-10000': (it) => opsIn(it, 0, 9999) && it.operands[0] >= 1000 && (it.input === 'choice' || (isNum(it) && +it.answer >= 0 && +it.answer <= 9999)),
  'nv.expanded': (it) => it.operands[0] >= 111 && it.operands[0] <= 999999 && (it.input === 'choice' || (isNum(it) && +it.answer >= 1 && +it.answer <= 999999)),
  'nv.ten-times': (it) => isNum(it) && +it.answer >= 2 && +it.answer <= 900000 && opsIn(it, 1, 900000),
  'nv.millions': (it) => it.operands[0] >= 1000 && opsIn(it, 1, 1000000) && (it.input === 'choice' || (isNum(it) && +it.answer >= 1 && +it.answer <= 999999)),
  'nv.round-any': (it) => isNum(it) && it.operands[0] >= 1001 && it.operands[0] <= 999999 && [10, 100, 1000, 10000, 100000].includes(it.operands[1]) && +it.answer % it.operands[1] === 0 && Math.abs(+it.answer - it.operands[0]) <= it.operands[1] / 2,
  'nv.tenths': (it) => it.operands[0] >= 1 && it.operands[0] <= 29 && it.operands[1] === 10 && (it.input === 'decimal' ? isDec(it, 2.9, 1) : it.input === 'fraction' ? /^\d+\/10$/.test(String(it.answer)) : isNum(it) && +it.answer >= 11 && +it.answer <= 29),
  'nv.hundredths': (it) => opsIn(it, 0, 999) && (it.input === 'decimal' ? isDec(it, 9.99, 2) : it.input === 'fraction' ? /^\d+\/100$/.test(String(it.answer)) : isNum(it) && +it.answer >= 1 && +it.answer <= 290),
  'nv.compare-decimals': (it) => it.input === 'choice' && opsIn(it, 1, 1100) && (it.operands.length === 3 || it.operands.length === 2),
  'nv.decimal-add-sub': (it) => isDec(it, 25, 2) && opsIn(it, 1, 1299) && it.operands.length === 2,
  'nv.round-decimals': (it) => isDec(it, 21, 2) && it.operands[0] >= 1 && it.operands[0] <= 21000 && [10, 100, 1000].includes(it.operands[1]) && Math.abs(Number(it.answer) * 1000 - it.operands[0]) <= it.operands[1] / 2 + 1e-6,
  'nv.powers-of-ten': (it) => it.operands.every((x) => x >= 1 && x <= 990_000_000) && (it.input === 'choice' ? ['10', '100', '1,000'].includes(String(it.answer)) : it.input === 'number' ? +it.answer >= 2 && +it.answer <= 990000 : isDec(it, 999000, 3)),
  'nv.negatives-line': (it) => isNum(it) && +it.answer >= -50 && +it.answer <= 50 && opsIn(it, -50, 50) && (it.signed === true || +it.answer >= 0),
  'nv.negatives-compare': (it) => it.input === 'choice' && opsIn(it, -99, 99) && it.operands.some((x) => x < 0),
  'nv.negatives-add': (it) => isNum(it) && it.signed === true && opsIn(it, -20, 20) && +it.answer >= -40 && +it.answer <= 40 && (it.operands[0] < 0 || it.operands[1] < 0 || +it.answer < 0 || it.operands.length === 2),
}
