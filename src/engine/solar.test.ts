import { describe, expect, it } from 'vitest'
import { combinedDerate, resolveDesignPsh, sizeArray } from './solar'
import { DERATE_DEFAULTS } from './defaults'
import type { District } from '../data/psh'
import type { PanelSpec } from './types'

const panel: PanelSpec = {
  id: 'test-500', name: 'Test 500 W', watts: 500, areaM2: 2.5,
  vocVolts: 50, vocTempCoefficientPctPerC: -0.3,
}

const district: District = {
  id: 'test', name: 'Test', latitude: 7, longitude: 80,
  monthlyPsh: [5.5, 6, 6, 5.5, 5, 4.5, 4.5, 4.5, 5, 4.5, 4, 4.5],
}

describe('combinedDerate', () => {
  it('multiplies the four loss factors', () => {
    expect(combinedDerate(DERATE_DEFAULTS)).toBeCloseTo(0.95 * 0.89 * 0.97 * 0.95, 6)
  })
})

describe('resolveDesignPsh', () => {
  it('uses the worst month for off-grid', () => {
    expect(resolveDesignPsh('off-grid', district).value).toBe(4)
  })

  it('uses the worst month for hybrid', () => {
    expect(resolveDesignPsh('hybrid', district).value).toBe(4)
  })

  it('uses the annual mean for grid-tied', () => {
    const mean = district.monthlyPsh.reduce((s, v) => s + v, 0) / 12
    expect(resolveDesignPsh('grid-tied', district).value).toBeCloseTo(mean, 2)
  })

  it('prefers an explicit override', () => {
    expect(resolveDesignPsh('off-grid', district, 3.2).value).toBe(3.2)
  })
})

describe('sizeArray', () => {
  it('sizes the array from daily energy, sun hours and losses', () => {
    const derate = { soiling: 1, temperature: 1, wiring: 1, conversion: 1 }
    const psh = resolveDesignPsh('off-grid', district) // 4
    const spec = sizeArray(10, psh, derate, panel)
    // 10 kWh / (4 h x 1.0) = 2.5 kW -> ceil(2.5 / 0.5) = 5 panels
    expect(spec.requiredPvKw.value).toBeCloseTo(2.5, 3)
    expect(spec.panelCount.value).toBe(5)
    expect(spec.installedPvKw.value).toBeCloseTo(2.5, 3)
    expect(spec.roofAreaM2.value).toBeCloseTo(12.5, 3)
  })

  it('always rounds panel count up', () => {
    const derate = { soiling: 1, temperature: 1, wiring: 1, conversion: 1 }
    const psh = resolveDesignPsh('off-grid', district)
    // 10.1 kWh / 4 = 2.525 kW -> 5.05 panels -> 6
    expect(sizeArray(10.1, psh, derate, panel).panelCount.value).toBe(6)
  })

  it('needs more panels once losses are included', () => {
    const psh = resolveDesignPsh('off-grid', district)
    const lossless = sizeArray(10, psh, { soiling: 1, temperature: 1, wiring: 1, conversion: 1 }, panel)
    const realistic = sizeArray(10, psh, DERATE_DEFAULTS, panel)
    expect(realistic.panelCount.value).toBeGreaterThan(lossless.panelCount.value)
  })

  it('returns zero panels for zero load', () => {
    const psh = resolveDesignPsh('off-grid', district)
    expect(sizeArray(0, psh, DERATE_DEFAULTS, panel).panelCount.value).toBe(0)
  })

  it('names the heat loss in its assumptions', () => {
    const psh = resolveDesignPsh('off-grid', district)
    const spec = sizeArray(10, psh, DERATE_DEFAULTS, panel)
    expect(spec.derateTotal.explain.assumptions.join(' ')).toMatch(/heat|temperature/i)
  })
})
