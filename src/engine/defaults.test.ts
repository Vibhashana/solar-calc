import { describe, expect, it } from 'vitest'
import { DEFAULTS, INVERTER_MARKET_SIZES_W, defaultInputs } from './defaults'

describe('DEFAULTS', () => {
  it('uses the agreed diversity factor', () => {
    expect(DEFAULTS.diversityFactor).toBe(0.65)
  })

  it('combines derate factors to approximately 0.78', () => {
    const { soiling, temperature, wiring, conversion } = DEFAULTS.derate
    expect(soiling * temperature * wiring * conversion).toBeCloseTo(0.78, 2)
  })

  it('lists inverter market sizes in ascending order', () => {
    const sorted = [...INVERTER_MARKET_SIZES_W].sort((a, b) => a - b)
    expect(INVERTER_MARKET_SIZES_W).toEqual(sorted)
  })
})

describe('defaultInputs', () => {
  it('gives off-grid two days of autonomy', () => {
    expect(defaultInputs('off-grid', 'colombo').autonomyDays).toBe(2)
  })

  it('gives hybrid half a day of autonomy', () => {
    expect(defaultInputs('hybrid', 'colombo').autonomyDays).toBe(0.5)
  })

  it('gives grid-tied no autonomy', () => {
    expect(defaultInputs('grid-tied', 'colombo').autonomyDays).toBe(0)
  })
})
