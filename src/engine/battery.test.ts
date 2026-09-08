import { describe, expect, it } from 'vitest'
import { sizeBattery } from './battery'
import type { BatteryModuleSpec } from './types'

const module51v: BatteryModuleSpec = {
  id: 'test-51v-100ah', name: 'Test 51.2 V 100 Ah',
  nominalVolts: 51.2, ampHours: 100, maxChargeC: 0.5,
}

describe('sizeBattery', () => {
  it('multiplies night load by autonomy to get usable energy', () => {
    expect(sizeBattery(6, 2, 48, module51v).usableKwh.value).toBeCloseTo(12, 3)
  })

  it('grosses usable energy up for depth of discharge and round-trip losses', () => {
    // 12 / (0.85 x 0.95) = 14.86 kWh
    expect(sizeBattery(6, 2, 48, module51v).nominalKwh.value).toBeCloseTo(14.86, 1)
  })

  it('converts nominal energy to amp hours at the bus voltage', () => {
    const spec = sizeBattery(6, 2, 48, module51v)
    expect(spec.bankAh.value).toBeCloseTo((spec.nominalKwh.value * 1000) / 48, 1)
  })

  it('arranges modules in series to reach the bus voltage', () => {
    // 51.2 V module on a 48 V bus -> 1 in series
    expect(sizeBattery(6, 2, 48, module51v).modulesInSeries.value).toBe(1)
    // 51.2 V module would need 1 in series for 48 V; a 12.8 V module needs 4
    const module12v: BatteryModuleSpec = { ...module51v, id: 'm12', nominalVolts: 12.8 }
    expect(sizeBattery(6, 2, 48, module12v).modulesInSeries.value).toBe(4)
  })

  it('adds parallel strings until capacity is met', () => {
    const spec = sizeBattery(6, 2, 48, module51v)
    // needs ~310 Ah at 48 V, module is 100 Ah -> 4 strings
    expect(spec.modulesInParallel.value).toBeGreaterThanOrEqual(3)
  })

  it('returns an empty bank for zero night load', () => {
    const spec = sizeBattery(0, 2, 48, module51v)
    expect(spec.nominalKwh.value).toBe(0)
    expect(spec.modulesInParallel.value).toBe(0)
  })

  it('explains the depth of discharge without using the phrase unexplained', () => {
    const spec = sizeBattery(6, 2, 48, module51v)
    expect(spec.nominalKwh.explain.plain).toMatch(/empty|flat|full/i)
  })
})
