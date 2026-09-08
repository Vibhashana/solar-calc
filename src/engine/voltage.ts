import { BUS_VOLTAGE_THRESHOLDS_W } from './defaults'
import { round2, sized } from './sized'
import type { BusVoltage, Sized } from './types'

export function selectBusVoltage(inverterContinuousW: number): Sized<BusVoltage> {
  const value: BusVoltage =
    inverterContinuousW < BUS_VOLTAGE_THRESHOLDS_W.to12V
      ? 12
      : inverterContinuousW <= BUS_VOLTAGE_THRESHOLDS_W.to24V
        ? 24
        : 48

  return sized(value, 'V', {
    plain: `Build the battery side at ${value} volts. Higher voltage means less current for the same power, which means thinner cables and less wasted heat — so bigger systems use higher voltage.`,
    formula: 'busVoltage = 12 below 1 kW, 24 up to 3 kW, 48 above 3 kW',
    substituted: `busVoltage = ${value} V (from a ${round2(inverterContinuousW)} W inverter)`,
    assumptions: ['Standard practice for battery-based systems.'],
  })
}
