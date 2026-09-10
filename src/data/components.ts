import type { BatteryModuleSpec, PanelSpec } from '../engine/types'

/**
 * Representative specifications for commonly available hardware. These are
 * planning defaults, not endorsements or a supplier catalog; the user can
 * override any figure with the datasheet values of the parts they buy.
 */
export const PANELS: PanelSpec[] = [
  { id: 'generic-450', name: '450 W monocrystalline', watts: 450, areaM2: 2.1, vocVolts: 49.3, vocTempCoefficientPctPerC: -0.27 },
  { id: 'generic-550', name: '550 W monocrystalline', watts: 550, areaM2: 2.58, vocVolts: 49.9, vocTempCoefficientPctPerC: -0.27 },
  { id: 'generic-600', name: '600 W monocrystalline', watts: 600, areaM2: 2.79, vocVolts: 55.1, vocTempCoefficientPctPerC: -0.26 },
  { id: 'generic-330', name: '330 W polycrystalline', watts: 330, areaM2: 1.95, vocVolts: 45.9, vocTempCoefficientPctPerC: -0.31 },
]

export const BATTERY_MODULES: BatteryModuleSpec[] = [
  { id: 'lfp-12v-100ah', name: 'LiFePO4 12 V 100 Ah', nominalVolts: 12.8, ampHours: 100, maxChargeC: 0.5 },
  { id: 'lfp-12v-200ah', name: 'LiFePO4 12 V 200 Ah', nominalVolts: 12.8, ampHours: 200, maxChargeC: 0.5 },
  { id: 'lfp-24v-100ah', name: 'LiFePO4 24 V 100 Ah', nominalVolts: 25.6, ampHours: 100, maxChargeC: 0.5 },
  { id: 'lfp-51v-100ah', name: 'LiFePO4 51.2 V 100 Ah rack', nominalVolts: 51.2, ampHours: 100, maxChargeC: 0.5 },
  { id: 'lfp-51v-200ah', name: 'LiFePO4 51.2 V 200 Ah rack', nominalVolts: 51.2, ampHours: 200, maxChargeC: 0.5 },
]

export function findPanel(id: string): PanelSpec | undefined {
  return PANELS.find((p) => p.id === id)
}

export function findBatteryModule(id: string): BatteryModuleSpec | undefined {
  return BATTERY_MODULES.find((m) => m.id === id)
}
