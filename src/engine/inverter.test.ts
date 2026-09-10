import { describe, expect, it } from 'vitest'
import { roundUpToMarketSize, sizeInverterFromArray, sizeInverterFromLoad } from './inverter'
import { computeLoadProfile } from './loads'
import type { Appliance } from './types'

const catalog: Appliance[] = [
  { id: 'lamp', name: 'Lamp', category: 'Lighting', watts: 100, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
]

describe('roundUpToMarketSize', () => {
  it('rounds up to the next real inverter size', () => {
    expect(roundUpToMarketSize(2100)).toBe(3000)
    expect(roundUpToMarketSize(3000)).toBe(3000)
    expect(roundUpToMarketSize(900)).toBe(1000)
  })

  it('returns the largest size when demand exceeds the catalog', () => {
    expect(roundUpToMarketSize(99000)).toBe(15000)
  })
})

describe('sizeInverterFromLoad', () => {
  it('applies headroom then rounds up', () => {
    const load = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 20, hoursPerDay: 1, usageWindow: 'night' }] },
      1,
      catalog,
    )
    // 2000 W continuous x 1.25 = 2500 W -> next market size 3000 W
    expect(load.continuousPeakW.value).toBeCloseTo(2000, 3)
    expect(sizeInverterFromLoad(load).continuousW.value).toBe(3000)
  })

  it('carries the surge requirement through unrounded', () => {
    const load = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 20, hoursPerDay: 1, usageWindow: 'night' }] },
      1,
      catalog,
    )
    const spec = sizeInverterFromLoad(load)
    expect(spec.surgeRequiredW.value).toBeCloseTo(load.surgePeakW.value, 3)
  })

  it('explains its numbers in plain language', () => {
    const load = computeLoadProfile({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 }, 0.65)
    const spec = sizeInverterFromLoad(load)
    expect(spec.continuousW.explain.plain).toMatch(/inverter/i)
    expect(spec.continuousW.explain.substituted).toContain('=')
  })
})

describe('sizeInverterFromArray', () => {
  it('applies the DC to AC ratio for grid-tied systems', () => {
    // 5.75 kW array / 1.15 = 5000 W
    expect(sizeInverterFromArray(5.75).continuousW.value).toBe(5000)
  })

  it('reports no meaningful surge requirement', () => {
    expect(sizeInverterFromArray(5.75).surgeRequiredW.value).toBe(0)
  })
})

describe('Sized explanation contract', () => {
  it('every Sized value has plain text and substituted containing =', () => {
    const load = computeLoadProfile({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 }, 0.65)
    const loadSpec = sizeInverterFromLoad(load)
    const arraySpec = sizeInverterFromArray(5.75)

    const allSpecs = [
      loadSpec.continuousW,
      loadSpec.surgeRequiredW,
      arraySpec.continuousW,
      arraySpec.surgeRequiredW,
    ]

    for (const spec of allSpecs) {
      expect(spec.explain.plain).toBeTruthy()
      expect(spec.explain.plain.length).toBeGreaterThan(0)
      expect(spec.explain.substituted).toContain('=')
    }
  })
})
