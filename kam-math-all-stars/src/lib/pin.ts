import { S, update } from '../db/store'

/* The parent PIN is a kid gate, not a vault: a 4-digit code keeps Kam out of the settings.
   We store a salted check value rather than the PIN itself. */
function check(pin: string, salt: string): string {
  // cyrb53 string hash
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57
  const str = `${salt}:${pin}`
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
export const hasPin = () => !!S().pin
export const pinMatches = (pin: string) => check(pin, S().pinSalt) === S().pin
export function setPin(pin: string) {
  const pinSalt = Math.random().toString(36).slice(2, 10)
  update({ pin: check(pin, pinSalt), pinSalt })
}
export const clearPin = () => update({ pin: '', pinSalt: '' })
