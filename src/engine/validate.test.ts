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
    // 150 kWh/month off-grid in Colombo keeps both the inverter (1000 W) and the
    // array (1.65 kW) inside their 24 V tiers, so the system lands on a 24 V bus.
    // (200 kWh/month, used here before the bus-voltage fix, now correctly resolves
    // to 48 V because its 2.2 kW array crosses the array's 48 V threshold — and at
    // 48 V a 51.2 V module is the *correct* pairing, only 6.7% off, so it no longer
    // demonstrates a mismatch.) Against a genuine 24 V bus, the 51.2 V module is
    // 113% out — one module in series is already 51.2 V, and no whole number of
    // them lands within 10% of 24 V. This was a real user-facing defect.
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'bill', monthlyKwh: 150, nightFraction: 0.6 },
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

  it('flags a design with zero daily load as info, not a real answer', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'bill', monthlyKwh: 0, nightFraction: 0.6 },
    }
    const warnings = validateDesign(sizeSystem(inputs))
    const noLoad = warnings.find((w) => w.id === 'no-load')
    expect(noLoad).toBeDefined()
    expect(noLoad?.severity).toBe('info')
  })

  it('does not flag zero load when appliances or a bill were actually entered', () => {
    expect(ids(defaultInputs('off-grid', 'colombo'))).not.toContain('no-load')
  })

  it('produces no battery warnings for grid-tied systems', () => {
    const list = ids(defaultInputs('grid-tied', 'colombo'))
    expect(list).not.toContain('slow-recharge')
    expect(list).not.toContain('charge-current-high')
  })
})
