import { DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { BatteryModuleSpec, BatterySpec, BusVoltage } from './types'

export function sizeBattery(
  nightKwh: number,
  autonomyDays: number,
  busVoltage: BusVoltage,
  module: BatteryModuleSpec,
): BatterySpec {
  const { depthOfDischarge, roundTripEfficiency } = DEFAULTS.battery
  const usableKwh = nightKwh * autonomyDays
  const nominalKwh = usableKwh / (depthOfDischarge * roundTripEfficiency)
  const bankAh = (nominalKwh * 1000) / busVoltage

  const modulesInSeries = Math.max(1, Math.round(busVoltage / module.nominalVolts))
  const stringAh = module.ampHours
  const modulesInParallel = bankAh > 0 ? Math.ceil(bankAh / stringAh) : 0

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
      plain: `Wire ${modulesInSeries} ${modulesInSeries === 1 ? 'battery' : 'batteries'} in series to reach ${busVoltage} volts.`,
      formula: 'modulesInSeries = round(busVoltage / moduleVolts)',
      substituted: `round(${busVoltage} / ${round2(module.nominalVolts)}) = ${modulesInSeries}`,
      assumptions: [`Using ${module.name}.`],
    }),
    modulesInParallel: sized(modulesInParallel, 'strings', {
      plain: `Then put ${modulesInParallel} of those ${modulesInParallel === 1 ? 'set' : 'sets'} side by side to get enough capacity. That is ${modulesInSeries * modulesInParallel} batteries in total.`,
      formula: 'modulesInParallel = ceil(bankAh / moduleAh)',
      substituted: `ceil(${round2(bankAh)} / ${round2(module.ampHours)}) = ${modulesInParallel}`,
      assumptions: [`Using ${module.name}.`],
    }),
  }
}
