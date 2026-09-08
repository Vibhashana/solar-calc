import { describe, expect, it } from 'vitest'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'
import { selectBusVoltage } from './voltage'
import type { SystemInputs } from './types'

function withBill(monthlyKwh: number): SystemInputs {
  return {
    ...defaultInputs('off-grid', 'colombo'),
    load: { mode: 'bill', monthlyKwh, nightFraction: 0.6 },
  }
}

describe('monotonicity', () => {
  const bills = [50, 100, 200, 400, 800, 1600]

  it('never reduces panel count as load grows', () => {
    let previous = -1
    for (const bill of bills) {
      const count = sizeSystem(withBill(bill)).array.panelCount.value
      expect(count).toBeGreaterThanOrEqual(previous)
      previous = count
    }
  })

  it('never reduces battery capacity as load grows', () => {
    let previous = -1
    for (const bill of bills) {
      const kwh = sizeSystem(withBill(bill)).battery?.nominalKwh.value ?? 0
      expect(kwh).toBeGreaterThanOrEqual(previous)
      previous = kwh
    }
  })

  it('never reduces inverter size as load grows', () => {
    let previous = -1
    for (const bill of bills) {
      const w = sizeSystem(withBill(bill)).inverter.continuousW.value
      expect(w).toBeGreaterThanOrEqual(previous)
      previous = w
    }
  })

  it('never reduces battery capacity as autonomy grows', () => {
    let previous = -1
    for (const days of [0.5, 1, 2, 3, 5]) {
      const kwh = sizeSystem({ ...withBill(200), autonomyDays: days }).battery?.nominalKwh.value ?? 0
      expect(kwh).toBeGreaterThanOrEqual(previous)
      previous = kwh
    }
  })

  it('needs more panels in a cloudier location', () => {
    const sunny = sizeSystem({ ...withBill(200), pshOverride: 6 })
    const cloudy = sizeSystem({ ...withBill(200), pshOverride: 3 })
    expect(cloudy.array.panelCount.value).toBeGreaterThan(sunny.array.panelCount.value)
  })

  // Asserts the CONTINUOUS requirement, not the rounded panel count. The
  // sizeSystem suite compares panelCount, which collapses at some loads —
  // at 250 kWh/month both types round to 4 panels and that test passes only
  // because its fixture happens to straddle an integer boundary. requiredPvKw
  // is monotonic, so this pins the behaviour the comparison actually names.
  it('always needs less array for grid-tied than off-grid at the same load', () => {
    for (const bill of [100, 200, 250, 400, 800]) {
      const offGrid = sizeSystem({ ...withBill(bill), systemType: 'off-grid' })
      const gridTied = sizeSystem({ ...withBill(bill), systemType: 'grid-tied' })
      expect(
        gridTied.array.requiredPvKw.value,
        `grid-tied should need less array than off-grid at ${bill} kWh/month`,
      ).toBeLessThan(offGrid.array.requiredPvKw.value)
    }
  })
})

describe('orchestration wiring', () => {
  // The sizeSystem suite asserts mostly not-null / greater-than-zero, so a
  // transposed argument or a wrong-function call in the pipeline would compile
  // and pass. These pin the values that only come out right when each module
  // is fed the correct input.
  it('derives bus voltage from the inverter size and the array size, not the raw load peak', () => {
    const design = sizeSystem(withBill(200))
    expect(design.inverter.continuousW.value).toBeGreaterThan(0)
    // Derived from the real source (selectBusVoltage) rather than hand-copied
    // threshold constants, so this stays correct if the thresholds ever change.
    // It still pins the wiring: sizeSystem must feed selectBusVoltage the
    // inverter's continuousW and the array's installedPvKw, in that order —
    // a transposed argument would fail this because the two inputs have
    // different units and different threshold tables.
    const expected = selectBusVoltage(
      design.inverter.continuousW.value,
      design.array.installedPvKw.value,
    ).value
    expect(design.busVoltage?.value).toBe(expected)
  })

  it('sizes the grid-tied inverter from the array, below its rated kW', () => {
    const design = sizeSystem({ ...withBill(400), systemType: 'grid-tied' })
    expect(design.inverter.continuousW.value).toBeLessThan(design.array.installedPvKw.value * 1000)
    expect(design.inverter.surgeRequiredW.value).toBe(0)
  })

  it('feeds the controller the array size and panel count, not one for the other', () => {
    const design = sizeSystem(withBill(400))
    const busV = design.busVoltage?.value ?? 0
    const expectedAmps = (design.array.installedPvKw.value * 1000) / busV * 1.25
    expect(design.controller?.amps.value).toBeCloseTo(expectedAmps, 1)
  })

  // Proves validateDesign is wired into the GRID-TIED return path. Every other
  // warning test uses battery-side checks, which are null-guarded off for
  // grid-tied — so dropping the call from that branch alone would pass them all.
  // estimated-peak is the only warning a grid-tied design can raise.
  it('runs validation on the grid-tied path too', () => {
    const design = sizeSystem({ ...withBill(200), systemType: 'grid-tied' })
    expect(design.load.isPeakEstimated).toBe(true)
    expect(design.warnings.map((w) => w.id)).toContain('estimated-peak')
  })
})

describe('degenerate input', () => {
  it('handles zero consumption without crashing or dividing by zero', () => {
    const design = sizeSystem(withBill(0))
    expect(design.array.panelCount.value).toBe(0)
    expect(Number.isFinite(design.battery?.nominalKwh.value ?? 0)).toBe(true)
  })
})
