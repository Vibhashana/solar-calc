import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../engine/defaults'
import type { SystemInputs, SystemType } from '../engine/types'
import { decodeInputs, encodeInputs } from './url'

const TYPES: SystemType[] = ['off-grid', 'hybrid', 'grid-tied']
const DISTRICTS = ['colombo', 'kandy', 'jaffna', 'nuwara-eliya']
const PANELS = ['generic-450', 'generic-550', 'generic-600', 'generic-330']

/** Deterministic pseudo-random generator, so a failure is reproducible. */
function makeRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

function generateInputs(random: () => number): SystemInputs {
  const pick = <T,>(list: T[], fallback: T): T => list[Math.floor(random() * list.length)] ?? fallback
  const systemType = pick(TYPES, 'hybrid')
  const districtId = pick(DISTRICTS, 'colombo')
  const base = defaultInputs(systemType, districtId)
  const useAppliances = random() < 0.5
  return {
    ...base,
    pshOverride: random() < 0.3 ? Math.round(random() * 600) / 100 : undefined,
    autonomyDays: Math.round(random() * 10) / 2,
    panelId: pick(PANELS, 'generic-550'),
    load: useAppliances
      ? {
          mode: 'appliances',
          entries: [
            { applianceId: 'led-bulb', quantity: 1 + Math.floor(random() * 20), hoursPerDay: Math.round(random() * 240) / 10, usageWindow: 'night' },
            { applianceId: 'ceiling-fan', quantity: 1 + Math.floor(random() * 5), hoursPerDay: Math.round(random() * 240) / 10, usageWindow: 'both' },
          ],
        }
      : { mode: 'bill', monthlyKwh: Math.round(random() * 5000), nightFraction: Math.round(random() * 100) / 100 },
  }
}

describe('round trip', () => {
  it('survives 200 generated designs unchanged', () => {
    const random = makeRandom(20260908)
    for (let i = 0; i < 200; i += 1) {
      const inputs = generateInputs(random)
      expect(decodeInputs(encodeInputs(inputs)), `case ${i}`).toEqual(inputs)
    }
  })

  it('produces a query with no JSON blob in it', () => {
    const encoded = encodeInputs(defaultInputs('hybrid', 'colombo'))
    expect(encoded).not.toContain('{')
    expect(encoded).toContain('t=hybrid')
    expect(encoded).toContain('d=colombo')
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
})
