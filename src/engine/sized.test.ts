import { describe, expect, it } from 'vitest'
import { round2, sized } from './sized'

describe('round2', () => {
  it('rounds to two decimal places', () => {
    expect(round2(12.3456)).toBe(12.35)
  })

  it('leaves whole numbers alone', () => {
    expect(round2(8)).toBe(8)
  })

  it('does not produce negative zero', () => {
    expect(Object.is(round2(-0.001), 0)).toBe(true)
  })
})

describe('sized', () => {
  it('binds a value to its explanation', () => {
    const result = sized(8, 'panels', {
      plain: 'You need 8 panels.',
      formula: 'panels = ceil(a / b)',
      substituted: 'ceil(12.4 / 1.8) = 8',
      assumptions: ['550 W panels'],
    })
    expect(result.value).toBe(8)
    expect(result.unit).toBe('panels')
    expect(result.explain.plain).toBe('You need 8 panels.')
  })
})
