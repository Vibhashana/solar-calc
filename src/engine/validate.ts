import { findBatteryModule } from '../data/components'
import { DEFAULTS } from './defaults'
import { round2 } from './sized'
import type { SystemDesign, Warning } from './types'

export function validateDesign(design: SystemDesign): Warning[] {
  const warnings: Warning[] = []

  if (design.load.dailyKwh.value === 0) {
    warnings.push({
      id: 'no-load',
      severity: 'info',
      message:
        "You haven't said what you use electricity for yet, so there is nothing to size — no panels, no battery, no real inverter number. Enter your monthly units, or list your appliances, to get a design you can actually use.",
    })
  }

  if (design.load.isPeakEstimated) {
    warnings.push({
      id: 'estimated-peak',
      severity: 'info',
      message:
        'Your inverter size is a rough estimate, because a bill does not say how much power you use at any one moment. List your appliances instead if you want a number you can buy from.',
    })
  }

  if (design.battery && design.busVoltage) {
    const dailyGenerationKwh =
      design.array.installedPvKw.value * design.array.designPsh.value * design.array.derateTotal.value
    const rechargeNeedKwh = design.battery.usableKwh.value + design.load.dailyKwh.value

    if (dailyGenerationKwh > 0) {
      const days = rechargeNeedKwh / dailyGenerationKwh
      if (days > DEFAULTS.maxAcceptableRechargeDays) {
        warnings.push({
          id: 'slow-recharge',
          severity: 'caution',
          message:
            `Once this battery is empty, your panels would take about ${round2(days)} days to refill it while also running the house. ` +
            'Either add panels or reduce the number of backup days you asked for.',
        })
      }
    }

    const module = findBatteryModule(design.inputs.batteryModuleId)
    if (module) {
      // The bank must physically reach the system voltage. modulesInSeries is a
      // rounded integer, so a module whose nominal voltage does not divide the bus
      // produces a bank at the wrong voltage — reachable with default inputs, where
      // a 51.2 V module against a 24 V bus yields one module in series (51.2 V).
      // Connecting that to a 24 V inverter destroys equipment, so this warns loudly.
      const actualBankVolts = design.battery.modulesInSeries.value * module.nominalVolts
      const drift = Math.abs(actualBankVolts - design.busVoltage.value) / design.busVoltage.value
      // 10%, not tighter. LiFePO4 packs are 12.8/25.6/51.2 V but are sold as
      // 12/24/48 V systems, so EVERY correct pairing sits at 6.7% drift. A 5%
      // tolerance would reject every valid bank. A real mismatch is 113% out.
      if (drift > 0.1) {
        warnings.push({
          id: 'battery-voltage-mismatch',
          severity: 'caution',
          message:
            `These batteries are ${round2(module.nominalVolts)} V each, which cannot be wired into a ` +
            `${design.busVoltage.value} V bank — you would end up with ${round2(actualBankVolts)} V. ` +
            'Connecting that to the inverter would damage it. Pick a battery whose voltage divides ' +
            `into ${design.busVoltage.value} V, or change the system voltage.`,
        })
      }

      const chargeAmps = (design.array.installedPvKw.value * 1000) / design.busVoltage.value
      const maxChargeAmps =
        module.ampHours * design.battery.modulesInParallel.value * module.maxChargeC

      if (maxChargeAmps > 0 && chargeAmps > maxChargeAmps) {
        warnings.push({
          id: 'charge-current-high',
          severity: 'caution',
          message:
            `Your panels could push about ${round2(chargeAmps)} amps into a battery rated to accept ${round2(maxChargeAmps)} amps. ` +
            'Use a bigger battery bank, or a charge controller that can be limited to a safe current.',
        })
      }
    }
  }

  return warnings
}
