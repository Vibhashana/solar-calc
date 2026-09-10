import { BATTERY_MODULES } from '../data/components'
import { DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { BatteryModuleSpec, BatterySpec, BusVoltage } from './types'

/**
 * How far a bank may sit from the nominal system voltage. 10%, not tighter:
 * LiFePO4 packs are 12.8/25.6/51.2 V but are sold as 12/24/48 V systems, so
 * every correct pairing sits at 6.7% drift and a 5% tolerance would reject
 * all of them. A real mismatch is 113% out.
 */
export const VOLTAGE_TOLERANCE = 0.1

export function modulesInSeriesFor(busVoltage: BusVoltage, module: BatteryModuleSpec): number {
  return Math.max(1, Math.round(busVoltage / module.nominalVolts))
}

/** True when whole modules in series actually reach the system voltage. */
export function isVoltageCompatible(busVoltage: BusVoltage, module: BatteryModuleSpec): boolean {
  const actualVolts = modulesInSeriesFor(busVoltage, module) * module.nominalVolts
  return Math.abs(actualVolts - busVoltage) / busVoltage <= VOLTAGE_TOLERANCE
}

/**
 * The module a design is packaged into when the user has not named one.
 *
 * Which module is chosen never changes how much battery the design needs —
 * that figure comes from the load — only how many boxes it arrives in. So the
 * ranking is: it must reach the system voltage; it should accept the current
 * the panels will push at it; then the least capacity bought over what is
 * needed; then the fewest boxes to wire together.
 */
export function selectBatteryModule(
  busVoltage: BusVoltage,
  nominalKwh: number,
  installedPvKw: number,
  catalog: BatteryModuleSpec[] = BATTERY_MODULES,
): BatteryModuleSpec | undefined {
  const compatible = catalog.filter((module) => isVoltageCompatible(busVoltage, module))
  // Falling back to the whole catalog keeps this total: a bus voltage no
  // module fits still yields a design, and validateDesign raises the mismatch.
  const pool = compatible.length > 0 ? compatible : catalog
  const bankAh = (nominalKwh * 1000) / busVoltage
  const chargeAmps = (installedPvKw * 1000) / busVoltage

  const ranked = pool
    .map((module) => {
      const series = modulesInSeriesFor(busVoltage, module)
      const parallel = bankAh > 0 ? Math.ceil(bankAh / module.ampHours) : 0
      const boxes = series * parallel
      const maxChargeAmps = module.ampHours * parallel * module.maxChargeC
      return {
        module,
        boxes,
        installedKwh: (boxes * module.nominalVolts * module.ampHours) / 1000,
        acceptsCharge: maxChargeAmps <= 0 || chargeAmps <= maxChargeAmps,
      }
    })
    .sort(
      (a, b) =>
        Number(b.acceptsCharge) - Number(a.acceptsCharge) ||
        a.installedKwh - b.installedKwh ||
        a.boxes - b.boxes,
    )

  return ranked[0]?.module ?? pool[0]
}

/**
 * The capacity to buy, before any module is considered. Shared with
 * selectBatteryModule, which needs the bank size to rank modules against a
 * figure that does not depend on which module wins.
 */
export function nominalBankKwh(nightKwh: number, autonomyDays: number): number {
  const { depthOfDischarge, roundTripEfficiency } = DEFAULTS.battery
  return (nightKwh * autonomyDays) / (depthOfDischarge * roundTripEfficiency)
}

export function sizeBattery(
  nightKwh: number,
  autonomyDays: number,
  busVoltage: BusVoltage,
  module: BatteryModuleSpec,
): BatterySpec {
  const { depthOfDischarge, roundTripEfficiency } = DEFAULTS.battery
  const usableKwh = nightKwh * autonomyDays
  const nominalKwh = nominalBankKwh(nightKwh, autonomyDays)
  const bankAh = (nominalKwh * 1000) / busVoltage

  const modulesInSeries = modulesInSeriesFor(busVoltage, module)
  const actualBankVolts = modulesInSeries * module.nominalVolts
  const isCompatible = isVoltageCompatible(busVoltage, module)
  const stringAh = module.ampHours
  const modulesInParallel = bankAh > 0 ? Math.ceil(bankAh / stringAh) : 0

  const seriesPlain = isCompatible
    ? `Wire ${modulesInSeries} ${modulesInSeries === 1 ? 'battery' : 'batteries'} in series to reach ${busVoltage} volts.`
    : `These batteries are ${round2(module.nominalVolts)} V each, so they cannot be wired into a ${busVoltage} V bank — ${modulesInSeries} in series would give ${round2(actualBankVolts)} V. Choose a battery whose voltage divides into ${busVoltage} V.`

  return {
    usableKwh: sized(usableKwh, 'kWh', {
      plain: `The battery has to supply ${round2(nightKwh)} units a night for ${autonomyDays} ${autonomyDays === 1 ? 'day' : 'days'}, so ${round2(usableKwh)} units have to come out of it.`,
      formula: 'usableKwh = nightKwh x autonomyDays',
      substituted: `${round2(nightKwh)} x ${round2(autonomyDays)} = ${round2(usableKwh)} kWh`,
      assumptions: [`${autonomyDays} days of cloudy weather with no useful sunshine.`],
    }),
    nominalKwh: sized(nominalKwh, 'kWh', {
      plain: `Buy about ${round2(nominalKwh)} kWh of battery. That is more than the ${round2(usableKwh)} units you need out of it, because running a battery completely flat ruins it, and a little energy is lost every time you charge and discharge.`,
      formula: 'nominalKwh = usableKwh / (depthOfDischarge x roundTripEfficiency)',
      substituted: `${round2(usableKwh)} / (${depthOfDischarge} x ${roundTripEfficiency}) = ${round2(nominalKwh)} kWh`,
      assumptions: [
        `Never discharged below ${Math.round((1 - depthOfDischarge) * 100)}% remaining, which is normal practice for lithium batteries.`,
        `${Math.round((1 - roundTripEfficiency) * 100)}% lost in charging and discharging.`,
      ],
    }),
    bankAh: sized(bankAh, 'Ah', {
      plain: `At ${busVoltage} volts that is about ${round2(bankAh)} amp hours — the number most battery sellers quote.`,
      formula: 'bankAh = nominalKwh x 1000 / busVoltage',
      substituted: `${round2(nominalKwh)} x 1000 / ${busVoltage} = ${round2(bankAh)} Ah`,
      assumptions: [],
    }),
    modulesInSeries: sized(modulesInSeries, 'modules', {
      plain: seriesPlain,
      formula: 'modulesInSeries = round(busVoltage / moduleVolts)',
      substituted: `round(${busVoltage} / ${round2(module.nominalVolts)}) = ${modulesInSeries}`,
      assumptions: [
        `Using ${module.name}.`,
        `Bank voltage must match the system voltage (within 10%).`,
      ],
    }),
    modulesInParallel: sized(modulesInParallel, 'strings', {
      plain: `Then put ${modulesInParallel} of those ${modulesInParallel === 1 ? 'set' : 'sets'} side by side to get enough capacity. That is ${modulesInSeries * modulesInParallel} batteries in total.`,
      formula: 'modulesInParallel = ceil(bankAh / moduleAh)',
      substituted: `ceil(${round2(bankAh)} / ${round2(module.ampHours)}) = ${modulesInParallel}`,
      assumptions: [`Using ${module.name}.`],
    }),
  }
}
