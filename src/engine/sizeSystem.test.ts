import { describe, expect, it } from 'vitest'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'

describe('sizeSystem — battery systems', () => {
  it('produces a complete design for off-grid', () => {
    const design = sizeSystem(defaultInputs('off-grid', 'colombo'))
    expect(design.busVoltage).not.toBeNull()
    expect(design.battery).not.toBeNull()
    expect(design.controller).not.toBeNull()
    expect(design.array.panelCount.value).toBeGreaterThan(0)
    expect(design.inverter.continuousW.value).toBeGreaterThan(0)
  })

  it('produces a complete design for hybrid', () => {
    const design = sizeSystem(defaultInputs('hybrid', 'kandy'))
    expect(design.battery).not.toBeNull()
  })

  it('needs a smaller battery for hybrid than for off-grid', () => {
    const offGrid = sizeSystem(defaultInputs('off-grid', 'colombo'))
    const hybrid = sizeSystem(defaultInputs('hybrid', 'colombo'))
    expect(hybrid.battery?.nominalKwh.value).toBeLessThan(offGrid.battery?.nominalKwh.value ?? 0)
  })
})

describe('sizeSystem — grid-tied', () => {
  it('omits the battery, bus voltage and controller', () => {
    const design = sizeSystem(defaultInputs('grid-tied', 'colombo'))
    expect(design.busVoltage).toBeNull()
    expect(design.battery).toBeNull()
    expect(design.controller).toBeNull()
  })

  it('still sizes panels and an inverter', () => {
    const design = sizeSystem(defaultInputs('grid-tied', 'colombo'))
    expect(design.array.panelCount.value).toBeGreaterThan(0)
    expect(design.inverter.continuousW.value).toBeGreaterThan(0)
  })

  it('needs fewer panels than off-grid because it designs to the yearly average', () => {
    const gridTied = sizeSystem(defaultInputs('grid-tied', 'colombo'))
    const offGrid = sizeSystem(defaultInputs('off-grid', 'colombo'))
    expect(gridTied.array.panelCount.value).toBeLessThan(offGrid.array.panelCount.value)
  })
})

describe('sizeSystem — input handling', () => {
  it('honours a peak sun hours override', () => {
    const inputs = { ...defaultInputs('off-grid', 'colombo'), pshOverride: 3 }
    expect(sizeSystem(inputs).array.designPsh.value).toBe(3)
  })

  it('throws a readable error for an unknown district', () => {
    const inputs = { ...defaultInputs('off-grid', 'atlantis') }
    expect(() => sizeSystem(inputs)).toThrow(/district/i)
  })

  it('throws a readable error for an unknown panel', () => {
    const inputs = { ...defaultInputs('off-grid', 'colombo'), panelId: 'nope' }
    expect(() => sizeSystem(inputs)).toThrow(/panel/i)
  })

  it('echoes its inputs back on the design', () => {
    const inputs = defaultInputs('off-grid', 'galle')
    expect(sizeSystem(inputs).inputs).toEqual(inputs)
  })
})
