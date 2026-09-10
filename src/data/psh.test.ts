import { describe, expect, it } from 'vitest'
import { DISTRICTS, PSH_SOURCE, annualMeanPsh, findDistrict, worstMonthPsh } from './psh'

describe('DISTRICTS', () => {
  it('covers all 25 districts', () => {
    expect(DISTRICTS).toHaveLength(25)
  })

  it('has unique ids', () => {
    const ids = DISTRICTS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has twelve monthly values per district', () => {
    for (const d of DISTRICTS) expect(d.monthlyPsh).toHaveLength(12)
  })

  it('reports peak sun hours in a physically plausible tropical range', () => {
    for (const d of DISTRICTS) {
      for (const psh of d.monthlyPsh) {
        expect(psh).toBeGreaterThan(2.5)
        expect(psh).toBeLessThan(8)
      }
    }
  })

  it('places every district within Sri Lanka', () => {
    for (const d of DISTRICTS) {
      expect(d.latitude).toBeGreaterThan(5.8)
      expect(d.latitude).toBeLessThan(10)
      expect(d.longitude).toBeGreaterThan(79.5)
      expect(d.longitude).toBeLessThan(82)
    }
  })

  it('records its provenance', () => {
    expect(PSH_SOURCE.url).toContain('nasa.gov')
    expect(PSH_SOURCE.fetchedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('worstMonthPsh / annualMeanPsh', () => {
  it('returns the minimum and the mean of the monthly series', () => {
    const colombo = findDistrict('colombo')
    expect(colombo).toBeDefined()
    if (!colombo) return
    expect(worstMonthPsh(colombo)).toBe(Math.min(...colombo.monthlyPsh))
    expect(annualMeanPsh(colombo)).toBeGreaterThan(worstMonthPsh(colombo))
  })
})
