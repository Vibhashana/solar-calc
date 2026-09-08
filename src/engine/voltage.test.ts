import { describe, expect, it } from 'vitest'
import { selectBusVoltage } from './voltage'

describe('selectBusVoltage', () => {
  it('uses 12 V below 1 kW', () => {
    expect(selectBusVoltage(800).value).toBe(12)
  })

  it('uses 24 V from 1 kW up to 3 kW', () => {
    expect(selectBusVoltage(1000).value).toBe(24)
    expect(selectBusVoltage(3000).value).toBe(24)
  })

  it('uses 48 V above 3 kW', () => {
    expect(selectBusVoltage(3001).value).toBe(48)
    expect(selectBusVoltage(10000).value).toBe(48)
  })

  it('explains the choice without jargon', () => {
    const v = selectBusVoltage(5000)
    expect(v.explain.plain.length).toBeGreaterThan(0)
    expect(v.explain.plain).not.toMatch(/\bbus\b/i)
  })
})
