import { BUS_VOLTAGE_ARRAY_THRESHOLDS_KW, BUS_VOLTAGE_THRESHOLDS_W, DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { BusVoltage, Sized } from './types'

export function selectBusVoltage(
  inverterContinuousW: number,
  installedPvKw: number,
): Sized<BusVoltage> {
  const inverterVoltage: BusVoltage =
    inverterContinuousW < BUS_VOLTAGE_THRESHOLDS_W.to12V
      ? 12
      : inverterContinuousW <= BUS_VOLTAGE_THRESHOLDS_W.to24V
        ? 24
        : 48

  const arrayVoltage: BusVoltage =
    installedPvKw <= BUS_VOLTAGE_ARRAY_THRESHOLDS_KW.to12V
      ? 12
      : installedPvKw <= BUS_VOLTAGE_ARRAY_THRESHOLDS_KW.to24V
        ? 24
        : 48

  const value: BusVoltage = arrayVoltage > inverterVoltage ? arrayVoltage : inverterVoltage
  const drivenByArray = arrayVoltage > inverterVoltage

  // Illustrative only: what the charge controller would have to handle if the
  // panels were forced onto the smaller, inverter-only voltage. Uses the same
  // headroom the charge controller itself is sized with (see controller.ts),
  // so the number a user sees here matches what they'd see there.
  const arrayW = installedPvKw * 1000
  const ampsAtInverterVoltage =
    inverterVoltage > 0 ? (arrayW / inverterVoltage) * DEFAULTS.controller.headroom : 0

  const plain = drivenByArray
    ? `Build the battery side at ${value} volts. Your panels are what require it — at a lower voltage the charge controller would need to handle about ${round2(ampsAtInverterVoltage)} amps, which is expensive and needs very thick cable. Higher voltage means less current for the same power, which means thinner cables and less wasted heat.`
    : `Build the battery side at ${value} volts. Your inverter size is what requires this. Higher voltage means less current for the same power, which means thinner cables and less wasted heat — so bigger systems use higher voltage.`

  return sized(value, 'V', {
    plain,
    formula:
      'busVoltage = higher of (inverter tier: 12 below 1 kW, 24 up to 3 kW, 48 above) and (array tier: 12 up to 0.8 kW, 24 up to 2 kW, 48 above)',
    substituted: `busVoltage = max(${inverterVoltage} V from a ${round2(inverterContinuousW)} W inverter, ${arrayVoltage} V from a ${round2(installedPvKw)} kW array) = ${value} V`,
    assumptions: ['Standard practice for battery-based systems.'],
  })
}
