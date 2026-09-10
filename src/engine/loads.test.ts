import { describe, expect, it } from 'vitest'
import { computeLoadProfile } from './loads'
import { DEFAULTS } from './defaults'
import type { Appliance } from './types'

const catalog: Appliance[] = [
  { id: 'lamp', name: 'Lamp', category: 'Lighting', watts: 100, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'pump', name: 'Pump', category: 'Water', watts: 1000, surgeFactor: 4, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
]

describe('computeLoadProfile — appliance path', () => {
  it('sums energy across entries', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [
        { applianceId: 'lamp', quantity: 4, hoursPerDay: 5, usageWindow: 'night' },
        { applianceId: 'pump', quantity: 1, hoursPerDay: 1, usageWindow: 'day' },
      ] },
      DEFAULTS.diversityFactor,
      catalog,
    )
    // 4 x 100 x 5 = 2000 Wh, plus 1 x 1000 x 1 = 1000 Wh -> 3.0 kWh
    expect(profile.dailyKwh.value).toBeCloseTo(3.0, 3)
    expect(profile.nightKwh.value).toBeCloseTo(2.0, 3)
    expect(profile.dayKwh.value).toBeCloseTo(1.0, 3)
  })

  it('uses the watts on a row in place of the catalogue figure', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 2, hoursPerDay: 5, usageWindow: 'night', watts: 20 }] },
      1,
      catalog,
    )
    // 2 x 20 x 5 = 200 Wh, not the catalogue's 2 x 100 x 5 = 1000 Wh
    expect(profile.dailyKwh.value).toBeCloseTo(0.2, 3)
    expect(profile.continuousPeakW.value).toBeCloseTo(40, 3)
  })

  it('scales surge with the watts on a row, not the catalogue watts', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'pump', quantity: 1, hoursPerDay: 1, usageWindow: 'day', watts: 500 }] },
      1,
      catalog,
    )
    // continuous 500 W, extra surge = 500 x (4 - 1) = 1500 W
    expect(profile.continuousPeakW.value).toBeCloseTo(500, 3)
    expect(profile.surgePeakW.value).toBeCloseTo(2000, 3)
  })

  it('falls back to the catalogue when a row carries no watts', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 1, hoursPerDay: 1, usageWindow: 'night' }] },
      1,
      catalog,
    )
    expect(profile.continuousPeakW.value).toBeCloseTo(100, 3)
  })

  it('treats zero watts as a real answer rather than falling back', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 1, hoursPerDay: 5, usageWindow: 'night', watts: 0 }] },
      1,
      catalog,
    )
    expect(profile.dailyKwh.value).toBe(0)
    expect(profile.continuousPeakW.value).toBe(0)
  })

  it('splits a both-window appliance evenly', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 1, hoursPerDay: 10, usageWindow: 'both' }] },
      DEFAULTS.diversityFactor,
      catalog,
    )
    expect(profile.dayKwh.value).toBeCloseTo(0.5, 3)
    expect(profile.nightKwh.value).toBeCloseTo(0.5, 3)
  })

  it('applies the diversity factor to connected load', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 10, hoursPerDay: 1, usageWindow: 'night' }] },
      0.65,
      catalog,
    )
    // 10 x 100 W = 1000 W connected, x 0.65 = 650 W
    expect(profile.continuousPeakW.value).toBeCloseTo(650, 3)
  })

  it('adds the largest single surge on top of continuous peak', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [
        { applianceId: 'lamp', quantity: 1, hoursPerDay: 1, usageWindow: 'night' },
        { applianceId: 'pump', quantity: 1, hoursPerDay: 1, usageWindow: 'day' },
      ] },
      1,
      catalog,
    )
    // continuous 1100 W, largest extra surge = 1000 x (4 - 1) = 3000 W
    expect(profile.continuousPeakW.value).toBeCloseTo(1100, 3)
    expect(profile.surgePeakW.value).toBeCloseTo(4100, 3)
  })

  it('marks appliance-derived peaks as measured, not estimated', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 1, hoursPerDay: 1, usageWindow: 'night' }] },
      1,
      catalog,
    )
    expect(profile.isPeakEstimated).toBe(false)
  })

  it('ignores entries referencing an unknown appliance', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'ghost', quantity: 1, hoursPerDay: 1, usageWindow: 'day' }] },
      1,
      catalog,
    )
    expect(profile.dailyKwh.value).toBe(0)
  })
})

describe('computeLoadProfile — bill path', () => {
  it('converts a monthly bill to a daily figure', () => {
    const profile = computeLoadProfile(
      { mode: 'bill', monthlyKwh: 304.4, nightFraction: 0.6 },
      DEFAULTS.diversityFactor,
    )
    expect(profile.dailyKwh.value).toBeCloseTo(10, 2)
    expect(profile.nightKwh.value).toBeCloseTo(6, 2)
    expect(profile.dayKwh.value).toBeCloseTo(4, 2)
  })

  it('estimates peak from mean demand and flags it', () => {
    const profile = computeLoadProfile(
      { mode: 'bill', monthlyKwh: 304.4, nightFraction: 0.6 },
      DEFAULTS.diversityFactor,
    )
    // 10 kWh/day -> 416.67 W mean -> x 3.5 = 1458.3 W
    expect(profile.continuousPeakW.value).toBeCloseTo(1458.3, 0)
    expect(profile.isPeakEstimated).toBe(true)
  })

  it('says plainly that the peak is an estimate', () => {
    const profile = computeLoadProfile(
      { mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 },
      DEFAULTS.diversityFactor,
    )
    expect(profile.continuousPeakW.explain.plain.toLowerCase()).toContain('estimate')
  })
})

describe('computeLoadProfile — explanations', () => {
  it('explains every value it returns', () => {
    const profile = computeLoadProfile({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 }, 0.65)
    for (const key of ['dailyKwh', 'dayKwh', 'nightKwh', 'continuousPeakW', 'surgePeakW'] as const) {
      expect(profile[key].explain.plain.length).toBeGreaterThan(0)
      expect(profile[key].explain.substituted).toContain('=')
    }
  })

  it('rounds non-integer inputs to 2 decimal places in substituted strings', () => {
    // diversityFactor = 1/3 produces repeating decimals
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 1, hoursPerDay: 1, usageWindow: 'night' }] },
      1 / 3,
      catalog,
    )
    // continuousPeakW.explain.substituted should contain 0.33, not 0.333333...
    expect(profile.continuousPeakW.explain.substituted).toMatch(/100 x 0\.33 =/)
    expect(profile.continuousPeakW.explain.substituted).not.toMatch(/0\.3{4,}/)
  })

  it('bill path rounds nightFraction to 2 decimal places in substituted strings', () => {
    // nightFraction = 2/3 produces repeating decimals
    const profile = computeLoadProfile(
      { mode: 'bill', monthlyKwh: 300, nightFraction: 2 / 3 },
      0.65,
    )
    // nightKwh.explain.substituted should contain 0.67, not 0.666666...
    expect(profile.nightKwh.explain.substituted).toMatch(/x 0\.67 =/)
    expect(profile.nightKwh.explain.substituted).not.toMatch(/0\.6{4,}/)
  })

  it('adds only one appliance unit\'s surge, not multiple, when quantity > 1', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'pump', quantity: 2, hoursPerDay: 1, usageWindow: 'day' }] },
      1,
      catalog,
    )
    // 2 pumps × 1000W = 2000W connected
    // continuous peak = 2000W (no diversity, factor=1)
    // largest surge = 1000 × (4-1) = 3000W from ONE pump, not TWO
    // surgePeakW = 2000 + 3000 = 5000W (not 2000 + 6000)
    expect(profile.continuousPeakW.value).toBeCloseTo(2000, 3)
    expect(profile.surgePeakW.value).toBeCloseTo(5000, 3)
  })
})
