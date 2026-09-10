import type { Explanation, Sized } from './types'

/** Rounds to 2 decimal places so substituted arithmetic stays readable. */
export function round2(n: number): number {
  const r = Math.round(n * 100) / 100
  return r === 0 ? 0 : r
}

export function sized<T>(value: T, unit: string, explain: Explanation): Sized<T> {
  return { value, unit, explain }
}
