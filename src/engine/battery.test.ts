import { describe, expect, it } from 'vitest'
import { BATTERY_MODULES } from '../data/components'
import { isVoltageCompatible, modulesInSeriesFor, selectBatteryModule, sizeBattery } from './battery'
import type { BatteryModuleSpec } from './types'

/** A test module at a given nominal voltage; nothing else matters to the fit. */
const module = (nominalVolts: number): BatteryModuleSpec => ({
  id: `m${nominalVolts}`, name: `Test ${nominalVolts} V`, nominalVolts, ampHours: 100, maxChargeC: 0.5,
})

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
    expect(spec.modulesInParallel.value).toBe(4)
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

  it('explains series wiring truthfully when voltage is compatible', () => {
    // 12.8 V module on 48 V bus: round(48 / 12.8) = 4, actual = 4 x 12.8 = 51.2 V (~6.7% above 48 V)
    const module12v: BatteryModuleSpec = { ...module51v, id: 'm12', nominalVolts: 12.8 }
    const spec = sizeBattery(6, 2, 48, module12v)
    expect(spec.modulesInSeries.explain.plain).toMatch(/reach.*48/)
  })

  it('refuses to build a bank when module voltage is incompatible', () => {
    // 51.2 V module on 24 V bus: round(24 / 51.2) = 0 -> clamped to 1, actual = 1 x 51.2 = 51.2 V (113% mismatch)
    const spec = sizeBattery(6, 2, 24, module51v)
    expect(spec.modulesInSeries.explain.plain).not.toMatch(/reach.*24/)
    expect(spec.modulesInSeries.explain.plain).toMatch(/cannot/)
  })
})

describe('isVoltageCompatible', () => {
  it('accepts the 6.7% drift every correct LiFePO4 pairing has', () => {
    // 12.8 V packs are sold as 12 V, and 4 of them make a "48 V" bank.
    expect(isVoltageCompatible(12, module(12.8))).toBe(true)
    expect(isVoltageCompatible(24, module(12.8))).toBe(true)
    expect(isVoltageCompatible(48, module(12.8))).toBe(true)
    expect(isVoltageCompatible(24, module(25.6))).toBe(true)
    expect(isVoltageCompatible(48, module(51.2))).toBe(true)
  })

  it('rejects a module too large to wire into the bank at all', () => {
    expect(isVoltageCompatible(12, module(25.6))).toBe(false)
    expect(isVoltageCompatible(24, module(51.2))).toBe(false)
  })
})

describe('selectBatteryModule', () => {
  it('never picks a module that cannot reach the system voltage', () => {
    for (const busVoltage of [12, 24, 48] as const) {
      const chosen = selectBatteryModule(busVoltage, 10, 2, BATTERY_MODULES)
      expect(chosen, `${busVoltage} V`).toBeDefined()
      expect(isVoltageCompatible(busVoltage, chosen as BatteryModuleSpec), `${busVoltage} V`).toBe(true)
    }
  })

  it('prefers a module that can accept the current the panels will push', () => {
    // A 48 V bank of about 228 Ah. In 100 Ah modules that rounds to 3 strings,
    // accepting 150 A; in 200 Ah modules it rounds to 2, accepting 200 A. An
    // array pushing 170 A therefore rules the smaller module out.
    const chosen = selectBatteryModule(48, 10.98, 8.2, BATTERY_MODULES)
    expect(chosen?.ampHours).toBe(200)
  })

  it('buys no more capacity than the bank needs when nothing forces it', () => {
    const chosen = selectBatteryModule(48, 5, 1, BATTERY_MODULES)
    const series = modulesInSeriesFor(48, chosen as BatteryModuleSpec)
    const parallel = Math.ceil(((5 * 1000) / 48) / (chosen?.ampHours ?? 1))
    const installedKwh = (series * parallel * (chosen?.nominalVolts ?? 0) * (chosen?.ampHours ?? 0)) / 1000

    for (const other of BATTERY_MODULES.filter((m) => isVoltageCompatible(48, m))) {
      const otherSeries = modulesInSeriesFor(48, other)
      const otherParallel = Math.ceil(((5 * 1000) / 48) / other.ampHours)
      const otherKwh = (otherSeries * otherParallel * other.nominalVolts * other.ampHours) / 1000
      expect(installedKwh).toBeLessThanOrEqual(otherKwh + 1e-9)
    }
  })

  it('still returns a module when the catalogue fits nothing, so sizing can go on', () => {
    const oddball: BatteryModuleSpec[] = [{ ...module51v, nominalVolts: 7 }]
    expect(selectBatteryModule(48, 5, 1, oddball)).toBe(oddball[0])
  })

  it('copes with a design that needs no battery at all', () => {
    expect(selectBatteryModule(12, 0, 0, BATTERY_MODULES)).toBeDefined()
  })
})
