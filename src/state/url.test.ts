import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../engine/defaults'
import type { SystemInputs, SystemType, UsageWindow } from '../engine/types'
import { decodeInputs, encodeInputs } from './url'

const TYPES: SystemType[] = ['off-grid', 'hybrid', 'grid-tied']
const DISTRICTS = ['colombo', 'kandy', 'jaffna', 'nuwara-eliya']
const PANELS = ['generic-450', 'generic-550', 'generic-600', 'generic-330']
const BATTERIES = ['lfp-12v-100ah', 'lfp-12v-200ah', 'lfp-24v-100ah', 'lfp-51v-100ah', 'lfp-51v-200ah']
const APPLIANCES = ['led-bulb', 'led-tube', 'cfl-bulb', 'ceiling-fan', 'stand-fan', 'fridge', 'blender']
const USAGE_WINDOWS: UsageWindow[] = ['day', 'night', 'both']

/** Deterministic pseudo-random generator, so a failure is reproducible. */
function makeRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

/** Tracks edge case coverage in the property test generator. */
const edgeCaseCounts = { hoursPerDay0: 0, monthlyKwh0: 0, pshOverride0: 0, emptyEntries: 0 }

function generateInputs(random: () => number, caseIndex: number): SystemInputs {
  const pick = <T,>(list: T[], fallback: T): T => list[Math.floor(random() * list.length)] ?? fallback
  const systemType = pick(TYPES, 'hybrid')
  const districtId = pick(DISTRICTS, 'colombo')
  const base = defaultInputs(systemType, districtId)

  // Decide mode FIRST, then force edge cases appropriate to that mode
  const useAppliances = random() < 0.5

  // Force pshOverride=0 in the first case (applies to both modes)
  let pshOverride: number | undefined
  if (caseIndex === 0) {
    pshOverride = 0
    edgeCaseCounts.pshOverride0 += 1
  } else if (random() < 0.3) {
    pshOverride = Math.round(random() * 600) / 100
  }

  const load: SystemInputs['load'] = useAppliances
    ? {
        mode: 'appliances',
        entries:
          random() < 0.1
            ? (() => {
                edgeCaseCounts.emptyEntries += 1
                return []
              })()
            : [
                {
                  applianceId: pick(APPLIANCES, 'led-bulb'),
                  quantity: 1 + Math.floor(random() * 20),
                  // Force hoursPerDay=0 when we're in appliances mode and have hit case 1
                  hoursPerDay: caseIndex % 2 === 1 ? (() => { edgeCaseCounts.hoursPerDay0 += 1; return 0 })() : Math.round(random() * 240) / 10,
                  usageWindow: pick(USAGE_WINDOWS, 'night'),
                },
                {
                  applianceId: pick(APPLIANCES, 'ceiling-fan'),
                  quantity: 1 + Math.floor(random() * 5),
                  hoursPerDay: Math.round(random() * 240) / 10,
                  usageWindow: pick(USAGE_WINDOWS, 'both'),
                },
              ],
      }
    : (() => {
        // Force monthlyKwh=0 when we're in bill mode and have hit an even case
        const monthlyKwh = caseIndex % 2 === 0 && caseIndex !== 0 ? (() => { edgeCaseCounts.monthlyKwh0 += 1; return 0 })() : Math.round(random() * 5000)
        return { mode: 'bill', monthlyKwh, nightFraction: Math.round(random() * 100) / 100 }
      })()

  return {
    ...base,
    pshOverride,
    autonomyDays: Math.round(random() * 10) / 2,
    panelId: pick(PANELS, 'generic-550'),
    batteryModuleId: pick(BATTERIES, 'lfp-51v-100ah'),
    load,
  }
}

describe('round trip', () => {
  it('survives 200 generated designs unchanged', () => {
    edgeCaseCounts.hoursPerDay0 = 0
    edgeCaseCounts.monthlyKwh0 = 0
    edgeCaseCounts.pshOverride0 = 0
    edgeCaseCounts.emptyEntries = 0
    const random = makeRandom(20260908)
    for (let i = 0; i < 200; i += 1) {
      const inputs = generateInputs(random, i)
      // psh=0 is not a valid override (the only control that writes it clamps to
      // 1..8), so decodeInputs falls back to the district figure — pshOverride
      // undefined — rather than round-tripping the 0 unchanged.
      const expected = inputs.pshOverride === 0 ? { ...inputs, pshOverride: undefined } : inputs
      expect(decodeInputs(encodeInputs(inputs)), `case ${i}`).toEqual(expected)
    }
    // Verify edge cases are actually generated
    expect(edgeCaseCounts.hoursPerDay0).toBeGreaterThan(0)
    expect(edgeCaseCounts.monthlyKwh0).toBeGreaterThan(0)
    expect(edgeCaseCounts.pshOverride0).toBeGreaterThan(0)
    expect(edgeCaseCounts.emptyEntries).toBeGreaterThan(0)
  })

  it('produces a query with no JSON blob in it', () => {
    const encoded = encodeInputs(defaultInputs('hybrid', 'colombo'))
    expect(encoded).not.toContain('{')
    expect(encoded).toContain('t=hybrid')
    expect(encoded).toContain('d=colombo')
  })

  it('round-trips a changed battery module', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      batteryModuleId: 'lfp-51v-200ah',
    }
    const encoded = encodeInputs(inputs)
    expect(encoded).toContain('b=lfp-51v-200ah')
    expect(decodeInputs(encoded)?.batteryModuleId).toBe('lfp-51v-200ah')
  })

  it('round-trips hoursPerDay: 0 correctly', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: {
        mode: 'appliances',
        entries: [{ applianceId: 'led-bulb', quantity: 1, hoursPerDay: 0, usageWindow: 'day' }],
      },
    }
    const encoded = encodeInputs(inputs)
    const decoded = decodeInputs(encoded)
    expect(decoded).toEqual(inputs)
    expect(decoded?.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 1, hoursPerDay: 0, usageWindow: 'day' }],
    })
  })
})

describe('decoding is total', () => {
  it('returns null when the query is empty', () => {
    expect(decodeInputs('')).toBeNull()
    expect(decodeInputs('?')).toBeNull()
  })

  it('returns null when the system type is missing or unknown', () => {
    expect(decodeInputs('d=colombo')).toBeNull()
    expect(decodeInputs('t=underwater&d=colombo')).toBeNull()
  })

  it('returns null when the district is missing or unknown', () => {
    expect(decodeInputs('t=hybrid')).toBeNull()
    expect(decodeInputs('t=hybrid&d=atlantis')).toBeNull()
  })

  it('falls back to defaults for every other unusable field', () => {
    const decoded = decodeInputs('t=off-grid&d=kandy&kwh=lots&a=NaN&p=unobtainium&nf=9')
    expect(decoded).not.toBeNull()
    const defaults = defaultInputs('off-grid', 'kandy')
    expect(decoded?.autonomyDays).toBe(defaults.autonomyDays)
    expect(decoded?.panelId).toBe(defaults.panelId)
    expect(decoded?.load).toEqual(defaults.load)
  })

  it('drops unknown appliances but keeps the rest of the list', () => {
    const decoded = decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:4:5:night,flux-capacitor:1:1:day')
    expect(decoded?.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 4, hoursPerDay: 5, usageWindow: 'night' }],
    })
  })

  it('survives a truncated appliance list without throwing', () => {
    expect(() => decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:4')).not.toThrow()
    expect(decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:4')?.load).toEqual({ mode: 'appliances', entries: [] })
  })

  it('never throws on hostile input', () => {
    for (const query of ['t=%%%', 't=hybrid&d=colombo&ap=' + '::::'.repeat(500), 't=hybrid&d=colombo&kwh=' + '9'.repeat(400), 'a=&b=&c=']) {
      expect(() => decodeInputs(query), query.slice(0, 20)).not.toThrow()
    }
  })

  it('restores the fields it does not encode from defaults', () => {
    const decoded = decodeInputs('t=hybrid&d=colombo')
    const defaults = defaultInputs('hybrid', 'colombo')
    expect(decoded?.derate).toEqual(defaults.derate)
    expect(decoded?.diversityFactor).toBe(defaults.diversityFactor)
    expect(decoded?.minAmbientC).toBe(defaults.minAmbientC)
  })

  it('rejects hex-encoded numbers and falls back to default', () => {
    const decoded = decodeInputs('t=hybrid&d=colombo&a=0x10')
    expect(decoded).not.toBeNull()
    const defaults = defaultInputs('hybrid', 'colombo')
    expect(decoded?.autonomyDays).toBe(defaults.autonomyDays)
  })

  it('rejects negative kwh and falls back to default', () => {
    const decoded = decodeInputs('t=hybrid&d=colombo&l=b&kwh=-100&nf=0.6')
    expect(decoded).not.toBeNull()
    const defaults = defaultInputs('hybrid', 'colombo')
    expect(decoded?.load).toEqual(defaults.load)
  })

  it('drops appliance entry with negative hoursPerDay, keeps valid ones', () => {
    const decoded = decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:4:5:night,ceiling-fan:2:-3:both')
    expect(decoded?.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 4, hoursPerDay: 5, usageWindow: 'night' }],
    })
  })

  it('preserves kwh=0 and round-trips it correctly', () => {
    const inputs = decodeInputs('t=hybrid&d=colombo&l=b&kwh=0&nf=0.5')
    expect(inputs).not.toBeNull()
    expect(inputs?.load).toEqual({ mode: 'bill', monthlyKwh: 0, nightFraction: 0.5 })
    const encoded = inputs ? encodeInputs(inputs) : ''
    expect(encoded).toContain('kwh=0')
  })

  it('rejects negative autonomyDays and falls back to default', () => {
    const decoded = decodeInputs('t=hybrid&d=colombo&a=-2.5')
    expect(decoded).not.toBeNull()
    const defaults = defaultInputs('hybrid', 'colombo')
    expect(decoded?.autonomyDays).toBe(defaults.autonomyDays)
  })

  it('rejects negative pshOverride and falls back to undefined', () => {
    const decoded = decodeInputs('t=hybrid&d=colombo&psh=-1.5')
    expect(decoded).not.toBeNull()
    expect(decoded?.pshOverride).toBeUndefined()
  })

  it('rejects a zero pshOverride and falls back to the district figure', () => {
    // The only control that writes psh clamps to 1..8, so ?psh=0 is a
    // hand-edited or hostile value. It must not survive as a real override —
    // that would zero out the array — so it falls back to undefined, same as
    // an absent psh.
    const decoded = decodeInputs('t=hybrid&d=colombo&psh=0')
    expect(decoded).not.toBeNull()
    expect(decoded?.pshOverride).toBeUndefined()
  })

  it('drops appliance entry with negative quantity, keeps valid ones', () => {
    const decoded = decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:-1:5:night,ceiling-fan:2:3:both')
    expect(decoded?.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'ceiling-fan', quantity: 2, hoursPerDay: 3, usageWindow: 'both' }],
    })
  })
})
