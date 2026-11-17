export interface Level {
  name: string
  icon: string
  desc: string
  ex: string
}
export const LEVELS: Level[] = [
  { name: 'Tens Jumps', icon: '🔟', desc: 'Add and take away tens', ex: '54 − 20' },
  { name: 'Ones Only', icon: '1️⃣', desc: 'Add and take away ones', ex: '47 − 5' },
  { name: 'Tens & Ones', icon: '🧮', desc: 'Two-digit numbers, no trading', ex: '54 − 23' },
  { name: 'Cross the Ten', icon: '🌉', desc: 'Hop over a ten', ex: '25 − 9' },
  { name: 'Bundle a Ten', icon: '📦', desc: 'Adding with trading', ex: '38 + 27' },
  { name: 'Break a Ten', icon: '🔨', desc: 'Subtracting with trading', ex: '54 − 27' },
  { name: 'Hundreds Club', icon: '💯', desc: 'Big numbers up to 1,000', ex: '240 + 30' },
  { name: 'Groups Of', icon: '🍪', desc: 'Sneak peek: multiplying', ex: '3 groups of 4' },
  { name: 'Big Bundles', icon: '🏗️', desc: '3-digit adding with trading', ex: '278 + 145' },
  { name: 'Big Breaks', icon: '💥', desc: '3-digit subtracting with trading', ex: '352 − 178' },
  { name: 'Times 2, 5, 10', icon: '✋', desc: 'The easy times tables', ex: '7 × 5' },
  { name: 'Times Tables', icon: '🧠', desc: 'All the facts to 10 × 10', ex: '7 × 8' },
  { name: 'Fair Shares', icon: '🍕', desc: 'Dividing', ex: '24 ÷ 6' },
  { name: 'Two-Step', icon: '👣', desc: 'Two things happen', ex: '45 + 28 − 19' },
  { name: 'Fractions', icon: '🥧', desc: 'Parts of a number', ex: '¾ of 20' },
  { name: 'Big Times', icon: '🚀', desc: '2-digit times 1-digit', ex: '23 × 4' },
  { name: 'Mystery Number', icon: '🕵️', desc: 'Find the missing number', ex: '? × 6 = 42' },
  { name: 'Thousands', icon: '🏔️', desc: '4-digit adding & subtracting', ex: '3,456 + 1,278' },
]
export const TOP = LEVELS.length - 1
export const rungName = (r: number) => (r <= TOP ? LEVELS[r].name : `Super Rung ${r - TOP}`)
