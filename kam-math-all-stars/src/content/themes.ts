import type { Problem, Rng } from '../engine/types'
import { pickWith } from '../engine/util'

export interface Theme {
  label: string
  icon: string
  win: string
  bg: [string, string]
  acc: string
  round: string
  items: string
  praise: string[]
  streak: [string, string, string]
  retry: string[]
  miss: string[]
  fixed: string[]
  end: string[]
  stories: Record<'add' | 'sub' | 'mul' | 'div', string[]>
}
export type ThemeKey = 'baseball' | 'bricks' | 'dance' | 'surf'

export const THEMES: Record<ThemeKey, Theme> = {
  baseball: {
    label: 'Baseball', icon: '⚾', win: '⚾', bg: ['#2e7d32', '#1b5e20'], acc: '#ffca28', round: 'Inning', items: 'baseball cards',
    praise: ['Home run, {n}!', 'Crushed it!', 'That answer is a grand slam!', 'Right down the middle. Perfect!', 'Great swing, {n}!', 'Base hit! Nice work!', 'You smoked that one!', 'Out of the park!'],
    streak: ['Three in a row! You are swinging a hot bat!', 'Five straight! {n} is on fire!', 'Eight in a row! That is an all-star streak!'],
    retry: ['Foul ball! Take another swing.', 'Close! Try one more time.', 'Good cut. Give it another swing!'],
    miss: ['That is okay. Even the best hitters miss. Let us look at it another way.', 'No worries, {n}. Let us see how this one works.'],
    fixed: ['There it is! Nice adjustment!', 'You figured it out! Way to battle!', 'That is how you bounce back!'],
    end: ['Great game, {n}!', 'That is a wrap on this inning. Awesome job, {n}!'],
    stories: {
      add: ['{n} hit {a} balls at practice on Monday and {b} balls on Tuesday. How many balls did {n} hit in all?', 'The team scored {a} runs this season. Then they scored {b} more. How many runs do they have now?', 'There are {a} fans in the stands. {b} more fans walk in. How many fans are there now?'],
      sub: ['There were {a} baseballs in the bucket. {n} hit {b} of them. How many balls are left in the bucket?', 'The snack stand had {a} hot dogs. Fans ate {b} of them. How many hot dogs are left?', '{n} has {a} baseball cards. {n} trades away {b} cards. How many cards does {n} have left?'],
      mul: ['There are {a} teams. Each team has {b} players. How many players is that?', '{n} has {a} buckets with {b} baseballs in each bucket. How many baseballs in all?'],
      div: ['{a} players split into {b} equal teams. How many players are on each team?', 'The coach has {a} baseballs to put into {b} buckets, the same in each. How many go in each bucket?'],
    },
  },
  bricks: {
    label: 'Brick Builder', icon: '🧱', win: '🧱', bg: ['#d84315', '#8e2a0b'], acc: '#ffd54f', round: 'Build', items: 'bricks',
    praise: ['Snap! You built it perfectly!', 'Master builder, {n}!', 'That answer fits just right!', 'Click! Another brick in place!', 'Super build, {n}!', 'Rock solid!'],
    streak: ['Three in a row! Your tower is growing!', 'Five straight! {n} is a master builder!', 'Eight in a row! That is a skyscraper!'],
    retry: ['Almost! That piece does not fit. Try again.', 'So close! Check it and try one more time.'],
    miss: ['That is okay. Builders try again all the time. Let us look at the plans.', 'No worries, {n}. Let us see how this one fits together.'],
    fixed: ['There it is! You found the right piece!', 'Nice fix, {n}!'],
    end: ['Awesome build, {n}!', 'Look what you built, {n}!'],
    stories: {
      add: ['{n} built a tower with {a} bricks. Then {n} added {b} more bricks. How many bricks are in the tower now?', 'A box has {a} red bricks and {b} blue bricks. How many bricks are in the box?', '{n} built a car with {a} pieces and a plane with {b} pieces. How many pieces in all?'],
      sub: ['{n} had {a} bricks. {n} used {b} of them to build a rocket. How many bricks are left?', 'A tower was {a} bricks tall. {b} bricks fell off. How many bricks are still on the tower?'],
      mul: ['{n} built {a} walls. Each wall has {b} bricks. How many bricks is that?', 'There are {a} bags with {b} bricks in each bag. How many bricks in all?'],
      div: ['{n} has {a} bricks to share equally with {b} friends. How many bricks does each friend get?', '{a} bricks make {b} towers, all the same height. How many bricks are in each tower?'],
    },
  },
  dance: {
    label: 'Dance Party', icon: '🕺', win: '⭐', bg: ['#6a1b9a', '#2a1060'], acc: '#4dd0e1', round: 'Song', items: 'glow sticks',
    praise: ['Smooth move, {n}!', 'You nailed that beat!', 'Spin and shine! That is right!', 'That answer has rhythm!', 'Moonwalk worthy!', 'Showtime! You got it!'],
    streak: ['Three in a row! You are in the groove!', 'Five straight! {n} owns the dance floor!', 'Encore! Encore! What a streak!'],
    retry: ['Almost! Find the beat and try again.', 'So close. One more spin!'],
    miss: ['That is okay, dancers practice too. Let us learn the steps.', 'No worries, {n}. Let us break down the moves.'],
    fixed: ['There it is! You found the beat!', 'Nice recovery, {n}!'],
    end: ['What a show, {n}!', 'Take a bow, {n}! Great job!'],
    stories: {
      add: ['The dance crew did {a} spins, then {b} more spins. How many spins in all?', '{a} people were dancing. {b} more people joined in. How many dancers are there now?', '{n} clapped {a} times in the first song and {b} times in the second song. How many claps in all?'],
      sub: ['There were {a} people on the dance floor. {b} went to get a snack. How many are still dancing?', 'The song is {a} beats long. {n} already danced {b} beats. How many beats are left?'],
      mul: ['There are {a} rows of dancers with {b} dancers in each row. How many dancers?', '{n} did {b} spins in each of {a} songs. How many spins is that?'],
      div: ['{a} dancers line up in {b} equal rows. How many dancers are in each row?', '{n} shares {a} glow sticks equally with {b} friends. How many does each friend get?'],
    },
  },
  surf: {
    label: 'Surf Day', icon: '🏄', win: '🌊', bg: ['#0277bd', '#01467a'], acc: '#ffd54f', round: 'Set', items: 'seashells',
    praise: ['Cowabunga! You got it!', 'You caught that wave, {n}!', 'Totally right!', 'Smooth ride!', 'Hang ten! Nice work!'],
    streak: ['Three in a row! You are riding a big wave!', 'Five straight! {n} is the king of the beach!', 'Eight in a row! What a ride!'],
    retry: ['Wipeout! Paddle back and try again.', 'So close! Catch the next one.'],
    miss: ['That is okay. Every surfer wipes out. Let us look at it another way.', 'No worries, {n}. Let us check the waves.'],
    fixed: ['There it is! You stood right up!', 'Nice recovery, {n}!'],
    end: ['Great day at the beach, {n}!', 'What a session, {n}!'],
    stories: {
      add: ['{n} rode {a} waves in the morning and {b} waves after lunch. How many waves in all?', 'There are {a} surfers in the water. {b} more paddle out. How many surfers now?'],
      sub: ['There were {a} shells on the beach. The tide washed {b} away. How many shells are left?', '{n} had {a} minutes of surf time. {n} used {b} minutes. How many minutes are left?'],
      mul: ['{a} surfboards each have {b} stickers. How many stickers in all?', 'There are {a} buckets with {b} crabs in each one. How many crabs?'],
      div: ['{n} found {a} shells and shares them equally with {b} friends. How many shells does each friend get?', '{a} surfers split into {b} equal groups. How many surfers in each group?'],
    },
  },
}

const TWO: Record<string, string> = {
  '+-': '{n} had {a} {items}. {n} got {b} more, then gave away {c}. How many {items} does {n} have now?',
  '-+': '{n} had {a} {items}. {n} lost {b} of them, then found {c} more. How many {items} does {n} have now?',
  '++': '{n} collected {a} {items} on Monday, {b} on Tuesday, and {c} on Wednesday. How many {items} in all?',
  '--': '{n} had {a} {items}. {n} gave {b} to a friend and {c} to a cousin. How many {items} are left?',
}

export function fill(t: string, name: string, theme: Theme, p?: { a: number; b: number; c?: number }): string {
  return t
    .replace(/\{n\}/g, name || 'friend')
    .replace(/\{items\}/g, theme.items)
    .replace(/\{a\}/g, p ? String(p.a) : '')
    .replace(/\{b\}/g, p ? String(p.b) : '')
    .replace(/\{c\}/g, p && p.c !== undefined ? String(p.c) : '')
}

/** Write the themed word problem for a story-format problem. */
export function storyFor(p: Problem, name: string, theme: Theme, rng: Rng = Math.random): string {
  if (p.kind === 'two') return fill(TWO[p.op + p.op2!], name, theme, p)
  const k = ({ '+': 'add', '-': 'sub', '×': 'mul', '÷': 'div' } as const)[p.op]
  return fill(pickWith(rng)(theme.stories[k]), name, theme, p)
}

/** Pick a line, but never the same one twice in a row. */
let lastLine = ''
export function pickFresh(lines: string[]): string {
  const pool = lines.length > 1 ? lines.filter((l) => l !== lastLine) : lines
  return (lastLine = pool[Math.floor(Math.random() * pool.length)])
}
