import { describe, expect, it } from 'vitest'
import { BATTERY_MODULES, PANELS, findBatteryModule, findPanel } from './components'
import { DEFAULTS } from '../engine/defaults'

describe('PANELS', () => {
  it('has unique ids', () => {
    const ids = PANELS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every panel a positive rating and area', () => {
    for (const p of PANELS) {
      expect(p.watts).toBeGreaterThan(0)
      expect(p.areaM2).toBeGreaterThan(0)
    }
  })

  it('has a negative Voc temperature coefficient', () => {
    for (const p of PANELS) expect(p.vocTempCoefficientPctPerC).toBeLessThan(0)
  })

  it('contains the default panel', () => {
    expect(findPanel(DEFAULTS.defaultPanelId)).toBeDefined()
  })
})

describe('BATTERY_MODULES', () => {
  it('contains the default module', () => {
    expect(findBatteryModule(DEFAULTS.defaultBatteryModuleId)).toBeDefined()
  })

  it('gives every module a positive capacity and charge rate', () => {
    for (const m of BATTERY_MODULES) {
      expect(m.ampHours).toBeGreaterThan(0)
      expect(m.nominalVolts).toBeGreaterThan(0)
      expect(m.maxChargeC).toBeGreaterThan(0)
    }
  })
})
