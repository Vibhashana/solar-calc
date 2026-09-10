import { describe, expect, it } from 'vitest'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'
import type { SystemInputs } from './types'

describe('golden case: small off-grid cabin', () => {
  const inputs: SystemInputs = {
    ...defaultInputs('off-grid', 'anuradhapura'),
    load: { mode: 'appliances', entries: [
      { applianceId: 'led-bulb', quantity: 4, hoursPerDay: 5, usageWindow: 'night' },
      { applianceId: 'ceiling-fan', quantity: 1, hoursPerDay: 8, usageWindow: 'both' },
      { applianceId: 'phone-charger', quantity: 2, hoursPerDay: 3, usageWindow: 'night' },
      { applianceId: 'wifi-router', quantity: 1, hoursPerDay: 24, usageWindow: 'both' },
    ] },
    panelId: 'generic-450',
    batteryModuleId: 'lfp-12v-200ah',
  }
  const design = sizeSystem(inputs)

  it('uses well under 2 units a day', () => {
    expect(design.load.dailyKwh.value).toBeGreaterThan(0.9)
    expect(design.load.dailyKwh.value).toBeLessThan(1.6)
  })

  it('lands on a small inverter and a low-voltage bus', () => {
    expect(design.inverter.continuousW.value).toBeLessThanOrEqual(1500)
    expect(design.busVoltage?.value).toBeLessThanOrEqual(24)
  })

  it('needs only a handful of panels', () => {
    expect(design.array.panelCount.value).toBeGreaterThanOrEqual(1)
    expect(design.array.panelCount.value).toBeLessThanOrEqual(3)
  })
})

describe('golden case: typical Sri Lankan hybrid home', () => {
  const inputs: SystemInputs = {
    ...defaultInputs('hybrid', 'colombo'),
    load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 },
  }
  const design = sizeSystem(inputs)

  it('works out to roughly 8 units a day', () => {
    expect(design.load.dailyKwh.value).toBeGreaterThan(7.5)
    expect(design.load.dailyKwh.value).toBeLessThan(8.5)
  })

  it('recommends a 48 V system', () => {
    // Was failing before the Task 15b fix: the 1500 W inverter alone only
    // implies 24 V, but this design's ~2.2 kW array crosses the array's own
    // 48 V threshold (>2 kW, see voltage.ts / defaults.ts
    // BUS_VOLTAGE_ARRAY_THRESHOLDS_KW). The bus voltage is the higher of the
    // inverter-implied and array-implied tiers, so this design correctly
    // lands on 48 V once selectBusVoltage accounts for the array.
    expect(design.busVoltage?.value).toBe(48)
  })

  it('sizes the array between 2 and 5 kW', () => {
    // Lower bound widened from 2.5 to 2 after first run: Colombo's live NASA
    // POWER worst-month PSH (November, 4.95 kWh/m2/day, fetched 2026-09-08 —
    // see src/data/psh.ts) sits just above the 4.79 threshold that would push
    // this load onto a 5th panel. At 4 panels of 550 W the array lands at
    // 2.2 kW. This is PSH data drift, not a formula defect: the sizing
    // formula (dailyKwh / (designPsh x derateTotal), rounded up to whole
    // panels) is unchanged, and the range still catches a broken formula —
    // it would not, for example, tolerate the ~0.5-1 kW a load-vs-array
    // mismatch or a wrong panel wattage would produce.
    expect(design.array.installedPvKw.value).toBeGreaterThan(2)
    expect(design.array.installedPvKw.value).toBeLessThan(5)
  })

  it('recommends MPPT', () => {
    expect(design.controller?.type.value).toBe('MPPT')
  })
})

describe('golden case: grid-tied rooftop', () => {
  const inputs: SystemInputs = {
    ...defaultInputs('grid-tied', 'colombo'),
    load: { mode: 'bill', monthlyKwh: 400, nightFraction: 0.6 },
  }
  const design = sizeSystem(inputs)

  it('carries no battery hardware', () => {
    expect(design.battery).toBeNull()
    expect(design.controller).toBeNull()
    expect(design.busVoltage).toBeNull()
  })

  it('pairs an inverter smaller than the array', () => {
    expect(design.inverter.continuousW.value).toBeLessThan(design.array.installedPvKw.value * 1000)
  })
})

describe('explanation coverage', () => {
  const designs = [
    sizeSystem(defaultInputs('off-grid', 'colombo')),
    sizeSystem(defaultInputs('hybrid', 'kandy')),
    sizeSystem(defaultInputs('grid-tied', 'jaffna')),
  ]

  // Single source of truth for what "explained" means, so every Sized value —
  // whether it lives inside a grouped object (load, array, inverter, battery,
  // controller) or stands alone (busVoltage) — gets the identical three
  // checks. Before this helper existed, busVoltage only got the non-empty
  // `plain` check, so a regression in its `substituted` string (a dropped
  // `=`, or an unrounded decimal) would have passed silently.
  function expectSizedIsExplained(field: { explain: { plain: string; substituted: string } }, label: string) {
    expect(field.explain.plain.trim(), `${label}.explain.plain`).not.toBe('')
    expect(field.explain.substituted.trim(), `${label}.explain.substituted`).not.toBe('')
    // types.ts documents substituted as "ending in = result". Task 8 shipped two
    // strings that broke that contract and no test caught it, because coverage
    // only checked non-emptiness. This is that missing assertion.
    expect(field.explain.substituted, `${label}.explain.substituted`).toContain('=')
    // No number in substituted may carry more than 2 decimal places.
    for (const numeral of field.explain.substituted.match(/\d+\.\d+/g) ?? []) {
      const decimals = numeral.split('.')[1] ?? ''
      expect(decimals.length, `${label}.explain.substituted has "${numeral}"`).toBeLessThanOrEqual(2)
    }
  }

  it('explains every number in every design', () => {
    for (const design of designs) {
      const groups = [design.load, design.array, design.inverter, design.battery, design.controller]
      for (const group of groups) {
        if (!group) continue
        for (const [key, field] of Object.entries(group)) {
          if (typeof field !== 'object' || field === null || !('explain' in field)) continue
          expectSizedIsExplained(field as { explain: { plain: string; substituted: string } }, key)
        }
      }
      if (design.busVoltage) expectSizedIsExplained(design.busVoltage, 'busVoltage')
    }
  })
})
