import { describe, expect, it } from 'vitest'
import { APPLIANCES, findAppliance } from './appliances'

describe('APPLIANCES', () => {
  it('has unique ids', () => {
    const ids = APPLIANCES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('draws positive power for every entry', () => {
    for (const a of APPLIANCES) expect(a.watts).toBeGreaterThan(0)
  })

  it('never has a surge factor below 1', () => {
    for (const a of APPLIANCES) expect(a.surgeFactor).toBeGreaterThanOrEqual(1)
  })

  it('keeps default runtime within a day', () => {
    for (const a of APPLIANCES) {
      expect(a.defaultHoursPerDay).toBeGreaterThan(0)
      expect(a.defaultHoursPerDay).toBeLessThanOrEqual(24)
    }
  })

  it('gives motor loads a surge factor above 1', () => {
    const motors = ['fridge', 'water-pump', 'air-conditioner-12k', 'washing-machine']
    for (const id of motors) {
      const a = findAppliance(id)
      expect(a).toBeDefined()
      expect(a?.surgeFactor).toBeGreaterThan(1)
    }
  })
})

describe('findAppliance', () => {
  it('returns undefined for an unknown id', () => {
    expect(findAppliance('nope')).toBeUndefined()
  })
})
