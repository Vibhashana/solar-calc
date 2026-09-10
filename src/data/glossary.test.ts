import { describe, expect, it } from 'vitest'
import { GLOSSARY } from './glossary'

describe('glossary', () => {
  const entries = Object.entries(GLOSSARY)

  it('covers the jargon the interface uses', () => {
    for (const id of ['mppt', 'pwm', 'peak-sun-hours', 'depth-of-discharge', 'autonomy', 'bus-voltage', 'surge', 'voc', 'derate', 'inverter', 'charge-controller', 'lifepo4']) {
      expect(Object.keys(GLOSSARY)).toContain(id)
    }
  })

  it('defines every term in plain language', () => {
    for (const [id, entry] of entries) {
      expect(entry.term.length, id).toBeGreaterThan(0)
      expect(entry.definition.length, id).toBeGreaterThan(20)
    }
  })

  it('never explains jargon with more jargon', () => {
    // A definition may name its own term, but may not lean on another
    // unexplained acronym to do the explaining.
    for (const [id, entry] of entries) {
      for (const [other, otherEntry] of entries) {
        if (other === id) continue
        const acronym = otherEntry.term
        if (acronym.length <= 4 && acronym === acronym.toUpperCase()) {
          expect(entry.definition, `${id} leans on ${acronym}`).not.toContain(acronym)
        }
      }
    }
  })
})
