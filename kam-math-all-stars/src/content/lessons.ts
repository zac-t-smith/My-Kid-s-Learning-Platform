import { fracHTML } from '../engine/util'
import { Q } from '../engine/format'
import { areaHTML, arrayHTML, barHTML, groupsHTML, numberLineSVG, placeTable } from '../engine/visuals'

/** What a lesson scene can do to the stage (base-ten blocks + an extra visual area). */
export interface StageApi {
  eq(html: string): void
  clear(): void
  set(h: number, t: number, o: number): void
  add(k: 'h' | 't' | 'o', n: number, cls?: string): void
  remove(k: 'h' | 't' | 'o', n: number, delay?: number): void
  breakTen(): void
  breakHundred(): void
  bundle(): void
  bundleTens(): void
  extra(html?: string): void
  lightGroups(): void
}
export interface Scene {
  eq?: string
  do?: (s: StageApi) => void
  extra?: () => string
  say: string
}

const G = '<span style="color:#2e7d32">'

/** One narrated lesson per level, ported from the prototype. */
export const LESSONS: Scene[][] = [
  [
    { eq: '54', do: (s) => s.set(0, 5, 4), say: 'This is 54. Each tall stick is a ten, and each little cube is a one. 5 tens and 4 ones.' },
    { eq: '54 − 20', do: (s) => s.remove('t', 2, 600), say: '54 minus 20. Twenty is just 2 tens! So we take away 2 tens.' },
    { eq: `54 − 20 = ${G}34</span>`, say: 'Look, the ones did not change! 3 tens and 4 ones. That is 34.' },
    { eq: '34 + 30', do: (s) => s.add('t', 3, 'new'), say: 'Adding tens works the same way. 34 plus 30. Add 3 more tens.' },
    { eq: `34 + 30 = ${G}64</span>`, extra: () => numberLineSVG([34, 44, 54, 64]), say: '6 tens and 4 ones. 64! On a number line, that is 3 hops of ten. Only the tens number changes.' },
  ],
  [
    { eq: '47', do: (s) => s.set(0, 4, 7), say: 'Here is 47. 4 tens and 7 ones.' },
    { eq: '47 − 5', do: (s) => s.remove('o', 5, 500), say: '47 minus 5. We only take away ones. Bye bye, 5 ones!' },
    { eq: `47 − 5 = ${G}42</span>`, say: 'The tens stayed the same. 4 tens and 2 ones is 42.' },
    { eq: '42 + 6', do: (s) => s.add('o', 6, 'new'), say: 'Now adding. 42 plus 6. Add 6 ones.' },
    { eq: `42 + 6 = ${G}48</span>`, say: '2 plus 6 is 8, so the answer is 48. The tens just watch!' },
  ],
  [
    { eq: '54 − 23', do: (s) => s.set(0, 5, 4), say: 'Let us do 54 minus 23. Here is 54.' },
    { eq: '54 − <u>2</u>3', do: (s) => s.remove('t', 2, 600), say: 'Tens first. 23 has 2 tens. Take away 2 tens.' },
    { eq: '54 − 2<u>3</u>', do: (s) => s.remove('o', 3, 600), say: 'Now the ones. 23 has 3 ones. Take away 3 ones.' },
    { eq: `54 − 23 = ${G}31</span>`, say: '3 tens and 1 one. That is 31! Tens with tens, ones with ones.' },
    { extra: () => numberLineSVG([54, 44, 34, 31]), say: 'On a number line, that is 2 hops of ten, then a little hop of 3. Same answer!' },
  ],
  [
    { eq: '25 − 9', do: (s) => s.set(0, 2, 5), say: 'Here is a tricky one. 25 minus 9. We only have 5 ones, but we need to take away 9!' },
    { eq: '25 − 5 = 20', do: (s) => s.extra(numberLineSVG([25, 20])), say: 'Trick number one: hop to a friendly ten. Take away 5 to land on 20. We still need to take away 4 more.' },
    { eq: `20 − 4 = ${G}16</span>`, do: (s) => s.extra(numberLineSVG([25, 20, 16])), say: '20 minus 4 is 16. So 25 minus 9 equals 16!' },
    { eq: '25 − 10 = 15 → 16', do: (s) => s.extra(numberLineSVG([25, 15, 16])), say: 'Trick number two: round and fix. 9 is almost 10. 25 minus 10 is 15. But we took away one too many, so give one back. 16!' },
    { eq: `25 − 9 = ${G}16</span>`, say: 'Two different ways, same answer. Use the one that feels easiest for you!' },
  ],
  [
    { eq: '38 + 27', do: (s) => s.set(0, 3, 8), say: '38 plus 27. Here is 38.' },
    { do: (s) => { s.add('t', 2, 'new'); s.add('o', 7, 'new') }, say: 'Now add 27. That is 2 more tens and 7 more ones.' },
    { eq: '8 + 7 = 15 ones!', say: 'Whoa, look at all those ones. 8 plus 7 is 15 ones. That is more than 10!' },
    { eq: '10 ones = 1 ten', do: (s) => s.bundle(), say: 'Ten ones snap together to make one ten. Bundle it!' },
    { eq: `38 + 27 = ${G}65</span>`, say: 'Now count: 6 tens and 5 ones. 65!' },
    { eq: `40 + 25 = ${G}65</span>`, do: (s) => s.extra(numberLineSVG([38, 40, 65])), say: 'Another way: 38 needs 2 more to make 40. Take 2 from 27, and that leaves 25. 40 plus 25 is 65!' },
  ],
  [
    { eq: '54 − 27', do: (s) => s.set(0, 5, 4), say: '54 minus 27. We need to take away 7 ones, but we only have 4. Uh oh!' },
    { eq: 'Break a ten!', do: (s) => s.breakTen(), say: 'So we break a ten! One ten turns into 10 ones. Now we have 4 tens and 14 ones.' },
    { eq: '14 − 7 = 7', do: (s) => s.remove('o', 7, 400), say: 'Now we can take away 7 ones. 14 minus 7 is 7.' },
    { eq: '4 tens − 2 tens = 2 tens', do: (s) => s.remove('t', 2, 400), say: 'Then take away 2 tens. 4 tens minus 2 tens is 2 tens.' },
    { eq: `54 − 27 = ${G}27</span>`, say: '2 tens and 7 ones. 27!' },
    { eq: '54 − 30 + 3', do: (s) => s.extra(numberLineSVG([54, 24, 27])), say: 'Round and fix works too. 27 is close to 30. 54 minus 30 is 24. We took away 3 too many, so add 3 back. 27!' },
  ],
  [
    { eq: '240', do: (s) => s.set(2, 4, 0), say: 'Meet the hundreds! Each big square is 100. That is 10 tens stuck together. Here is 240. 2 hundreds and 4 tens.' },
    { eq: '240 + 30', do: (s) => s.add('t', 3, 'new'), say: '240 plus 30. Just add 3 tens.' },
    { eq: `240 + 30 = ${G}270</span>`, say: '2 hundreds and 7 tens. 270! It is just like 24 plus 3, with a zero on the end.' },
    { eq: '270 + 200', do: (s) => s.add('h', 2, 'new'), say: 'Adding hundreds? 270 plus 200. Add 2 big squares.' },
    { eq: `270 + 200 = ${G}470</span>`, say: '4 hundreds and 7 tens. 470! Same tricks, bigger numbers.' },
  ],
  [
    { eq: '3 groups of 4', do: (s) => { s.clear(); s.extra(groupsHTML(3, 4)) }, say: 'Here are 3 groups. Each group has 4 dots.' },
    { eq: '4, 8, 12', do: (s) => s.lightGroups(), say: 'We could count every dot, but skip counting is faster. 4. 8. 12!' },
    { eq: `3 × 4 = ${G}12</span>`, say: '3 groups of 4 is 12. We write it 3 times 4 equals 12. That is multiplying!' },
    { eq: `4 × 3 = ${G}12</span>`, do: (s) => s.extra(groupsHTML(4, 3)), say: 'Cool trick. 4 groups of 3 is also 12! Flip it around, and you get the same answer.' },
  ],
  [
    { eq: '278 + 145', do: (s) => s.set(2, 7, 8), say: '278 plus 145. Here is 278. 2 hundreds, 7 tens, and 8 ones.' },
    { do: (s) => { s.add('h', 1, 'new'); s.add('t', 4, 'new'); s.add('o', 5, 'new') }, say: 'Add 145. That is 1 hundred, 4 tens, and 5 ones.' },
    { eq: '8 + 5 = 13 ones', do: (s) => s.bundle(), say: 'Ones first. 8 plus 5 is 13 ones. Ten ones bundle into a ten!' },
    { eq: '7 + 4 + 1 = 12 tens', do: (s) => s.bundleTens(), say: 'Now we have 12 tens. Ten tens bundle into a hundred!' },
    { eq: `278 + 145 = ${G}423</span>`, say: '4 hundreds, 2 tens, and 3 ones. 423! It is the same bundling trick, just one more time.' },
  ],
  [
    { eq: '352 − 178', do: (s) => s.set(3, 5, 2), say: '352 minus 178. Here is 352.' },
    { eq: '2 − 8? Break a ten!', do: (s) => s.breakTen(), say: 'We need to take away 8 ones, but we only have 2. Break a ten into 10 ones. Now we have 12 ones.' },
    { eq: '12 − 8 = 4', do: (s) => s.remove('o', 8, 300), say: '12 minus 8 is 4 ones.' },
    { eq: '4 − 7? Break a hundred!', do: (s) => s.breakHundred(), say: 'Now the tens. We need to take away 7 tens, but we only have 4. Break a hundred into 10 tens. Now we have 14 tens.' },
    { eq: '14 − 7 = 7 tens', do: (s) => s.remove('t', 7, 300), say: '14 tens minus 7 tens is 7 tens.' },
    { eq: '2 − 1 = 1 hundred', do: (s) => s.remove('h', 1, 300), say: 'And 2 hundreds minus 1 hundred is 1 hundred.' },
    { eq: `352 − 178 = ${G}174</span>`, extra: () => numberLineSVG([352, 252, 182, 174]), say: '1 hundred, 7 tens, 4 ones. 174! You can also take it away in parts. 352 minus 100, minus 70, minus 8. Same answer!' },
  ],
  [
    { eq: '4 groups of 5', do: (s) => { s.clear(); s.extra(groupsHTML(4, 5)) }, say: 'Here are 4 groups with 5 in each group.' },
    { eq: '5, 10, 15, 20', do: (s) => s.lightGroups(), say: 'Count by fives. 5, 10, 15, 20. So 4 times 5 is 20!' },
    { eq: '2 × 7 = 7 + 7 = 14', do: (s) => s.extra(groupsHTML(2, 7)), say: 'Times 2 is just a double. 2 times 7 is 7 plus 7. 14!' },
    { eq: `6 × 10 = ${G}60</span>`, do: (s) => s.extra(arrayHTML(6, 10)), say: 'Times 10 is the easiest. 6 times 10 is 6 tens. 60! Just add a zero.' },
  ],
  [
    { eq: '7 × 8', do: (s) => { s.clear(); s.extra(arrayHTML(7, 8)) }, say: '7 times 8. That is 7 rows with 8 in each row. Counting them all takes forever. Let us use a trick.' },
    { eq: '7 × 5 + 7 × 3', do: (s) => s.extra(arrayHTML(7, 8, 5)), say: 'Split the 8 into 5 and 3. Fives are easy!' },
    { eq: `35 + 21 = ${G}56</span>`, say: '7 times 5 is 35. 7 times 3 is 21. Add them up. 35 plus 21 is 56!' },
    { eq: '8 × 7 = 56 too!', say: 'And 8 times 7 is the same. Flip it any time you want. Break hard facts into easy ones!' },
  ],
  [
    { eq: '12 ÷ 3', do: (s) => { s.clear(); s.extra(arrayHTML(2, 6)) }, say: '12 divided by 3 means share 12 into 3 equal groups.' },
    { eq: `12 ÷ 3 = ${G}4</span>`, do: (s) => s.extra(groupsHTML(3, 4)), say: 'Share them out fair and square. Each group gets 4. So 12 divided by 3 is 4!' },
    { eq: '3 × 4 = 12', say: 'Division is multiplying backwards. 3 times 4 is 12, so 12 divided by 3 is 4.' },
    { eq: '20 ÷ 5 = ?', do: (s) => s.extra(''), say: 'Try 20 divided by 5. Count by fives until you hit 20. 5, 10, 15, 20. That is 4 jumps. The answer is 4!' },
  ],
  [
    { eq: '45 + 28 − 19', do: (s) => { s.clear(); s.extra('') }, say: 'Two steps! 45 plus 28 minus 19. Do one step at a time.' },
    { eq: '45 + 28 = 73', do: (s) => s.extra(numberLineSVG([45, 73])), say: 'Step one. 45 plus 28 is 73.' },
    { eq: `73 − 19 = ${G}54</span>`, do: (s) => s.extra(numberLineSVG([45, 73, 54])), say: 'Step two. 73 minus 19. Round and fix: 73 minus 20 is 53, give one back, 54!' },
    { eq: `45 + 28 − 19 = ${G}54</span>`, say: 'In a word problem, find the two things that happen. Solve the first one, then the second one.' },
  ],
  [
    { eq: `${fracHTML(1, 4)} of 20`, do: (s) => { s.clear(); s.extra(barHTML(4, 5, 0)) }, say: 'One fourth of 20. Fourths means split it into 4 equal parts.' },
    { eq: `20 ÷ 4 = ${G}5</span>`, do: (s) => s.extra(barHTML(4, 5, 1)), say: '20 split into 4 equal parts is 5 in each part. So one fourth of 20 is 5!' },
    { eq: `${fracHTML(3, 4)} of 20 = ${G}15</span>`, do: (s) => s.extra(barHTML(4, 5, 3)), say: 'Three fourths means take 3 of those parts. 5, 10, 15. Three fourths of 20 is 15!' },
    { eq: `${fracHTML(1, 2)} of 18 = ${G}9</span>`, do: (s) => s.extra(barHTML(2, 9, 1)), say: 'One half means 2 equal parts. Half of 18 is 9. The bottom number tells you how many parts!' },
  ],
  [
    { eq: '23 × 4', do: (s) => { s.clear(); s.extra('') }, say: '23 times 4. That is a big one. Let us break 23 apart.' },
    { eq: '20 × 4 + 3 × 4', do: (s) => s.extra(areaHTML([20, 3], [4])), say: '23 is 20 and 3. Multiply each part by 4.' },
    { eq: `80 + 12 = ${G}92</span>`, say: '20 times 4 is 80. Think 2 times 4 is 8, then add a zero. 3 times 4 is 12. 80 plus 12 is 92!' },
    { eq: `29 × 3 = 90 − 3 = ${G}87</span>`, do: (s) => s.extra(''), say: 'Another trick. 29 times 3? 29 is almost 30. 30 times 3 is 90. That is one extra 3, so take it away. 87!' },
  ],
  [
    { eq: `${Q} × 6 = 42`, do: (s) => { s.clear(); s.extra('') }, say: 'Mystery number! Something times 6 is 42. What is it?' },
    { eq: '6, 12, 18, 24, 30, 36, 42', say: 'Count by sixes until you reach 42. 6, 12, 18, 24, 30, 36, 42. That is 7 jumps!' },
    { eq: `42 ÷ 6 = ${G}7</span>`, say: 'Or flip it. If something times 6 is 42, then 42 divided by 6 is the mystery number. 7!' },
    { eq: `100 − ${Q} = 37`, do: (s) => s.extra(numberLineSVG([37, 40, 100])), say: '100 minus what is 37? Count up from 37. 3 more makes 40, and 60 more makes 100. 3 plus 60 is 63!' },
  ],
  [
    { eq: '3,456 + 1,278', do: (s) => { s.clear(); s.extra(placeTable(3456, 1278, '+')) }, say: 'Thousands! 3456 plus 1278. Line up the places. Thousands, hundreds, tens, and ones.' },
    { eq: '6 + 8 = 14', say: 'Ones first. 6 plus 8 is 14. Write the 4, and bundle 1 ten.' },
    { eq: '5 + 7 + 1 = 13', say: 'Tens. 5 plus 7, plus the 1 we bundled, is 13 tens. Write the 3, and bundle 1 hundred.' },
    { eq: '4 + 2 + 1 = 7', say: 'Hundreds. 4 plus 2 plus 1 is 7.' },
    { eq: `3,456 + 1,278 = ${G}4,734</span>`, do: (s) => s.extra(placeTable(3456, 1278, '+', 4734)), say: 'Thousands. 3 plus 1 is 4. The answer is 4734! The same tricks work no matter how big the numbers get.' },
  ],
]
/** Block size per level so hundreds flats fit on screen. */
export const UNIT: Record<number, string> = { 6: '9px', 8: '8px', 9: '8px' }
