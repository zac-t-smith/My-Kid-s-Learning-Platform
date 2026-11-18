import { freshFields, type Attempt, type Fields, type Profile } from './model'

/** Fields a kid earns by playing. Two devices merge these by keeping the higher value. */
const EARNED: (keyof Fields)[] = ['unlocked', 'climbBest']

/**
 * Merge two copies of the profile (two devices, or device + cloud, or device + backup file).
 * - Normal fields: the most recently changed copy wins, field by field.
 * - Earned fields: the higher value wins, unless a parent has since set/erased it by hand.
 * - Lessons seen: union.
 */
export function mergeProfiles(a: Profile, b: Profile): Profile {
  const out: Profile = { fields: { ...freshFields() }, times: {} }
  const f = out.fields as unknown as Record<string, unknown>
  const parentAt = Math.max(a.fields.parentAt || 0, b.fields.parentAt || 0)
  for (const k of Object.keys(out.fields) as (keyof Fields)[]) {
    const ta = a.times[k] ?? 0,
      tb = b.times[k] ?? 0
    const va = a.fields[k] ?? out.fields[k],
      vb = b.fields[k] ?? out.fields[k]
    if (EARNED.includes(k) && ta >= parentAt && tb >= parentAt) {
      f[k] = Math.max(va as number, vb as number)
    } else if (k === 'wordTaps') {
      // per word, keep the higher count
      const m: Record<string, number> = { ...(va as Record<string, number>) }
      for (const [w, n] of Object.entries(vb as Record<string, number>)) m[w] = Math.max(m[w] || 0, n)
      f[k] = m
    } else if (k === 'seenLesson') {
      const ra = a.fields.resetAt || 0,
        rb = b.fields.resetAt || 0
      // union, but a copy that predates the other side's erase does not count
      f[k] = { ...(ta >= rb ? (va as object) : {}), ...(tb >= ra ? (vb as object) : {}) }
    } else {
      f[k] = tb > ta ? vb : va
    }
    const t = Math.max(ta, tb)
    if (t) out.times[k] = t
  }
  return out
}

/** Union of two attempt logs by id, minus anything the parent erased. */
export function mergeAttempts(a: Attempt[], b: Attempt[], resetAt = 0): Attempt[] {
  const m = new Map<string, Attempt>()
  for (const x of [...a, ...b]) {
    if (x.ts <= resetAt) continue
    const have = m.get(x.id)
    // keep the copy that knows it is already uploaded
    if (!have || (x.synced && !have.synced)) m.set(x.id, x)
  }
  return [...m.values()].sort((x, y) => x.ts - y.ts || (x.id < y.id ? -1 : 1))
}

/** Union of two game logs by id, minus anything the parent erased. */
export function mergeGames<T extends { id: string; ts: number; synced: 0 | 1 }>(a: T[], b: T[], resetAt = 0): T[] {
  const m = new Map<string, T>()
  for (const x of [...a, ...b]) {
    if (x.ts <= resetAt) continue
    const have = m.get(x.id)
    if (!have || (x.synced && !have.synced)) m.set(x.id, x)
  }
  return [...m.values()].sort((x, y) => x.ts - y.ts)
}

export function profilesEqual(a: Profile, b: Profile): boolean {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b))
}
function canon(p: Profile) {
  const sort = (o: object) => Object.fromEntries(Object.entries(o).sort(([x], [y]) => (x < y ? -1 : 1)))
  return { fields: sort({ ...p.fields, seenLesson: sort(p.fields.seenLesson), wordTaps: sort(p.fields.wordTaps || {}) }), times: sort(p.times) }
}
