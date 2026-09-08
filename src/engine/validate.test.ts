import { describe, expect, it } from 'vitest'
import { validateDesign } from './validate'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'
import type { SystemInputs } from './types'

function ids(inputs: SystemInputs): string[] {
  return validateDesign(sizeSystem(inputs)).map((w) => w.id)
}

describe('validateDesign', () => {
  it('flags a peak load that was estimated from a bill', () => {
    expect(ids(defaultInputs('off-grid', 'colombo'))).toContain('estimated-peak')
  })

  it('does not flag an estimated peak when appliances were listed', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'appliances', entries: [
        { applianceId: 'led-bulb', quantity: 6, hoursPerDay: 5, usageWindow: 'night' },
        { applianceId: 'fridge', quantity: 1, hoursPerDay: 8, usageWindow: 'both' },
      ] },
    }
    expect(ids(inputs)).not.toContain('estimated-peak')
  })

  it('flags a bank the array cannot recharge in one bad day', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      autonomyDays: 10,
    }
    expect(ids(inputs)).toContain('slow-recharge')
  })

  it('flags a charge current above the battery C-rate', () => {
    // A big daytime workshop load with almost nothing at night: the array is
    // sized for 40+ kWh a day while the battery only has to carry a lamp, so
    // the panels can push far more current than that small bank will accept.
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'appliances', entries: [
        { applianceId: 'welding-machine', quantity: 2, hoursPerDay: 6, usageWindow: 'day' },
        { applianceId: 'led-bulb', quantity: 1, hoursPerDay: 1, usageWindow: 'night' },
      ] },
      batteryModuleId: 'lfp-12v-100ah',
    }
    expect(ids(inputs)).toContain('charge-current-high')
  })

  it('returns no warnings object without a message', () => {
    for (const w of validateDesign(sizeSystem(defaultInputs('off-grid', 'colombo')))) {
      expect(w.message.length).toBeGreaterThan(0)
      expect(['info', 'caution']).toContain(w.severity)
    }
  })

  it('flags a battery whose voltage cannot build the system voltage', () => {
    // Default inputs at a modest bill give a 24 V bus, while the default module is
    // 51.2 V — one in series is 51.2 V, not 24 V. This was a real user-facing defect.
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 },
      batteryModuleId: 'lfp-51v-100ah',
    }
    expect(ids(inputs)).toContain('battery-voltage-mismatch')
  })

  it('does not flag a battery that matches the system voltage', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 },
      batteryModuleId: 'lfp-24v-100ah',
    }
    expect(ids(inputs)).not.toContain('battery-voltage-mismatch')
  })

  it('produces no battery warnings for grid-tied systems', () => {
    const list = ids(defaultInputs('grid-tied', 'colombo'))
    expect(list).not.toContain('slow-recharge')
    expect(list).not.toContain('charge-current-high')
  })
})
