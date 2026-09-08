import { findBatteryModule, findPanel } from '../data/components'
import { findDistrict } from '../data/psh'
import { sizeBattery } from './battery'
import { sizeController } from './controller'
import { sizeInverterFromArray, sizeInverterFromLoad } from './inverter'
import { computeLoadProfile } from './loads'
import { resolveDesignPsh, sizeArray } from './solar'
import { selectBusVoltage } from './voltage'
import { validateDesign } from './validate'
import type { SystemDesign, SystemInputs } from './types'

export function sizeSystem(inputs: SystemInputs): SystemDesign {
  const district = findDistrict(inputs.districtId)
  if (!district) throw new Error(`Unknown district: ${inputs.districtId}`)

  const panel = findPanel(inputs.panelId)
  if (!panel) throw new Error(`Unknown panel: ${inputs.panelId}`)

  const load = computeLoadProfile(inputs.load, inputs.diversityFactor)
  const designPsh = resolveDesignPsh(inputs.systemType, district, inputs.pshOverride)

  if (inputs.systemType === 'grid-tied') {
    const array = sizeArray(load.dailyKwh.value, designPsh, inputs.derate, panel)
    const design: SystemDesign = {
      inputs,
      load,
      array,
      inverter: sizeInverterFromArray(array.installedPvKw.value),
      busVoltage: null,
      battery: null,
      controller: null,
      warnings: [],
    }
    return { ...design, warnings: validateDesign(design) }
  }

  const batteryModule = findBatteryModule(inputs.batteryModuleId)
  if (!batteryModule) throw new Error(`Unknown battery module: ${inputs.batteryModuleId}`)

  const inverter = sizeInverterFromLoad(load)
  const busVoltage = selectBusVoltage(inverter.continuousW.value)
  const array = sizeArray(load.dailyKwh.value, designPsh, inputs.derate, panel)
  const battery = sizeBattery(
    load.nightKwh.value,
    inputs.autonomyDays,
    busVoltage.value,
    batteryModule,
  )
  const controller = sizeController(
    array.installedPvKw.value,
    busVoltage.value,
    panel,
    array.panelCount.value,
    inputs.minAmbientC,
  )

  const design: SystemDesign = {
    inputs, load, array, inverter, busVoltage, battery, controller, warnings: [],
  }
  return { ...design, warnings: validateDesign(design) }
}
