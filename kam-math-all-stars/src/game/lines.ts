/* Announcer lines. {n} = Kam's name, {o} = the other team. */
export const HIT_LINES: Record<number, string[]> = {
  1: ['{n} lines a single to left!', '{n} slaps a single up the middle!', 'Base hit for {n}!', '{n} pokes a single into right field!'],
  2: ['{n} crushes a double to the gap!', '{n} rips a double down the line!', 'Off the wall! A double for {n}!'],
  3: ['{n} smokes a triple to the wall!', 'It rolls all the way to the fence! A triple for {n}!', '{n} is flying around the bases! Triple!'],
  4: ['It is going, going, gone! Home run, {n}!', '{n} crushes it over the fence! Home run!', 'See you later! That ball is out of here, {n}!'],
}
export const QUICK_LINES = [' What exit velocity!', ' That one was smoked!', ' Fast hands!']
export const ADJUST_LINES = ['Nice adjustment! ', 'Way to battle! ', 'Good second swing! ']
export const STRIKE_LINES = ['Strike one! Good cut. Take another swing.', 'Foul ball! You get another swing.', 'Swing and a miss. Dig in and try again.']
export const STRIKEOUT_LINES = ['Strike three. Even the best hitters strike out. Let us see how that one works.', 'Struck out, but that was a tough pitch. Let us look at it together.']
export const DEF_OUT_LINES = ['Got him! That is an out!', 'Out! What a play, {n}!', 'Nice one, {n}! Batter is out!']
export const BALL_LINES = ['Ball! Just outside. Try one more pitch.', 'Ball! Close one. Throw it again.']

export function runsLine(runs: number): string {
  return runs === 4 ? ' It is a grand slam! 4 runs score!' : runs > 1 ? ` ${runs} runs score!` : runs === 1 ? ' 1 run scores!' : ''
}
