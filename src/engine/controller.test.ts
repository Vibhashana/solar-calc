import { describe, expect, it } from 'vitest'
import { sizeController } from './controller'
import type { PanelSpec } from './types'

const panel: PanelSpec = {
  id: 'test-500', name: 'Test 500 W', watts: 500, areaM2: 2.5,
  vocVolts: 50, vocTempCoefficientPctPerC: -0.3,
}

describe('sizeController', () => {
  it('sizes current from array power, bus voltage and headroom', () => {
    // 5000 W / 48 V = 104.17 A x 1.25 = 130.2 A
    expect(sizeController(5, 48, panel, 10, 18).amps.value).toBeCloseTo(130.2, 0)
  })

  it('recommends MPPT for arrays above the threshold', () => {
    expect(sizeController(5, 48, panel, 10, 18).type.value).toBe('MPPT')
  })

  it('allows PWM for very small arrays', () => {
    expect(sizeController(0.3, 12, panel, 1, 18).type.value).toBe('PWM')
  })

  it('raises string Voc as temperature falls below 25 C', () => {
    const cold = sizeController(5, 48, panel, 10, 5)
    const warm = sizeController(5, 48, panel, 10, 25)
    expect(cold.maxStringVoc.value).toBeGreaterThan(warm.maxStringVoc.value)
  })

  it('returns the panel Voc unchanged at standard test temperature', () => {
    // At 25 C there is no correction; 10 panels in one string = 500 V
    expect(sizeController(5, 48, panel, 10, 25).maxStringVoc.value).toBeCloseTo(500, 1)
  })

  it('explains why MPPT was chosen', () => {
    const spec = sizeController(5, 48, panel, 10, 18)
    expect(spec.type.explain.plain.length).toBeGreaterThan(0)
  })
})
