import { describe, expect, it } from 'vitest'
import { selectBusVoltage } from './voltage'

// A small array (0.5 kW) that never pushes the array-driven tier above 12 V,
// so these cases exercise the inverter-driven path in isolation.
const SMALL_ARRAY_KW = 0.5

describe('selectBusVoltage', () => {
  it('uses 12 V below 1 kW inverter, with a small array', () => {
    expect(selectBusVoltage(800, SMALL_ARRAY_KW).value).toBe(12)
  })

  it('uses 24 V from 1 kW up to 3 kW inverter, with a small array', () => {
    expect(selectBusVoltage(1000, SMALL_ARRAY_KW).value).toBe(24)
    expect(selectBusVoltage(3000, SMALL_ARRAY_KW).value).toBe(24)
  })

  it('uses 48 V above 3 kW inverter, with a small array', () => {
    expect(selectBusVoltage(3001, SMALL_ARRAY_KW).value).toBe(48)
    expect(selectBusVoltage(10000, SMALL_ARRAY_KW).value).toBe(48)
  })

  it('forces 48 V when the array is above 2 kW, even with a small inverter', () => {
    const v = selectBusVoltage(800, 2.5)
    expect(v.value).toBe(48)
  })

  it('leaves a small inverter at 12 V when the array is under 0.8 kW', () => {
    const v = selectBusVoltage(800, 0.5)
    expect(v.value).toBe(12)
  })

  it('holds 0.8 kW array exactly at 12 V', () => {
    expect(selectBusVoltage(800, 0.8).value).toBe(12)
  })

  it('holds 2 kW array exactly at 24 V', () => {
    expect(selectBusVoltage(800, 2).value).toBe(24)
  })

  it('picks the higher of the two requirements', () => {
    // Small inverter (12 V tier) paired with a large array (48 V tier) — the
    // panels must win.
    expect(selectBusVoltage(500, 2.1).value).toBe(48)
    // Large inverter (48 V tier) paired with a tiny array (12 V tier) — the
    // inverter must win.
    expect(selectBusVoltage(5000, 0.1).value).toBe(48)
  })

  it('explains the choice without jargon', () => {
    const v = selectBusVoltage(5000, SMALL_ARRAY_KW)
    expect(v.explain.plain.length).toBeGreaterThan(0)
    expect(v.explain.plain).not.toMatch(/\bbus\b/i)
  })

  it('names the array as the driver when the array forces the higher voltage', () => {
    const v = selectBusVoltage(800, 2.5)
    expect(v.explain.plain).toMatch(/panel/i)
  })
})
