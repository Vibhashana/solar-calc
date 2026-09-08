import type { DerateFactors, SystemInputs, SystemType } from './types'

export const DERATE_DEFAULTS: DerateFactors = {
  soiling: 0.95,
  temperature: 0.89,
  wiring: 0.97,
  conversion: 0.95,
}

export const DEFAULTS = {
  diversityFactor: 0.65,
  derate: DERATE_DEFAULTS,
  /** Domestic loads skew towards the evening. */
  billNightFraction: 0.6,
  /** Ratio of peak demand to mean demand, used only on the bill path. */
  billPeakToMeanRatio: 3.5,
  /** Days per month, averaged over a Gregorian year. */
  daysPerMonth: 30.44,
  autonomyDays: { 'off-grid': 2, hybrid: 0.5, 'grid-tied': 0 } as const,
  battery: { depthOfDischarge: 0.85, roundTripEfficiency: 0.95 },
  /**
   * How many worst-month days may pass before a flat bank is refilled while
   * still running the house. Refilling in a single day is not a realistic
   * target — a 2-day bank inherently needs 2 to 3 days — so this only warns
   * when recovery is genuinely slow.
   */
  maxAcceptableRechargeDays: 3,
  inverter: { continuousHeadroom: 1.25, surgeHoldSeconds: 5 },
  controller: { headroom: 1.25, mpptThresholdW: 400 },
  /** Grid-tied DC:AC overbuild. */
  gridTiedDcAcRatio: 1.15,
  defaultPanelId: 'generic-550',
  defaultBatteryModuleId: 'lfp-51v-100ah',
  /** Coolest morning in the Sri Lankan lowlands; hill country is colder. */
  minAmbientC: 18,
} as const

export const INVERTER_MARKET_SIZES_W = [
  1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000,
] as const

export const BUS_VOLTAGE_THRESHOLDS_W = { to12V: 1000, to24V: 3000 } as const

export function defaultInputs(systemType: SystemType, districtId: string): SystemInputs {
  return {
    systemType,
    districtId,
    load: { mode: 'bill', monthlyKwh: 200, nightFraction: DEFAULTS.billNightFraction },
    autonomyDays: DEFAULTS.autonomyDays[systemType],
    panelId: DEFAULTS.defaultPanelId,
    batteryModuleId: DEFAULTS.defaultBatteryModuleId,
    diversityFactor: DEFAULTS.diversityFactor,
    derate: { ...DERATE_DEFAULTS },
    minAmbientC: DEFAULTS.minAmbientC,
  }
}
