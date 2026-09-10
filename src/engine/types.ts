export type SystemType = 'off-grid' | 'hybrid' | 'grid-tied'
export type UsageWindow = 'day' | 'night' | 'both'
export type BusVoltage = 12 | 24 | 48
export type ControllerType = 'MPPT' | 'PWM'

export interface Explanation {
  /** Plain language, no jargon, no formula notation. */
  plain: string
  /** Symbolic form, e.g. "panels = ceil(dailyKwh / (psh x panelKw x derate))" */
  formula: string
  /** Same formula with real numbers substituted, ending in "= result". */
  substituted: string
  assumptions: string[]
}

export interface Sized<T> {
  value: T
  unit: string
  explain: Explanation
}

export interface Appliance {
  id: string
  name: string
  category: string
  watts: number
  /** Startup draw as a multiple of running watts. Resistive loads are 1. */
  surgeFactor: number
  defaultHoursPerDay: number
  defaultUsageWindow: UsageWindow
}

export interface ApplianceEntry {
  applianceId: string
  quantity: number
  hoursPerDay: number
  usageWindow: UsageWindow
  /**
   * Running watts for this row, when the user has corrected the catalogue
   * figure. Undefined means "whatever the catalogue says", so a later change
   * to the catalogue reaches every row the user never touched.
   */
  watts?: number
}

export type LoadInput =
  | { mode: 'bill'; monthlyKwh: number; nightFraction: number }
  | { mode: 'appliances'; entries: ApplianceEntry[] }

export interface DerateFactors {
  soiling: number
  temperature: number
  wiring: number
  conversion: number
}

export interface PanelSpec {
  id: string
  name: string
  watts: number
  areaM2: number
  vocVolts: number
  /** Percent change in Voc per °C, negative. */
  vocTempCoefficientPctPerC: number
}

export interface BatteryModuleSpec {
  id: string
  name: string
  nominalVolts: number
  ampHours: number
  /** Maximum charge rate as a fraction of capacity per hour. */
  maxChargeC: number
}

export interface SystemInputs {
  systemType: SystemType
  districtId: string
  /** Overrides the district table when present, in kWh/m2/day. */
  pshOverride?: number
  load: LoadInput
  autonomyDays: number
  panelId: string
  /**
   * Which battery module the design is packaged into. Undefined means the
   * engine picks one to suit the system voltage, which is the normal case:
   * the choice does not change how much battery is needed, only how many
   * boxes it arrives in, and the system voltage it has to match is itself
   * derived rather than asked for.
   */
  batteryModuleId?: string
  diversityFactor: number
  derate: DerateFactors
  /** Coldest expected morning temperature, for Voc checking. */
  minAmbientC: number
}

export interface DailyLoadProfile {
  dailyKwh: Sized<number>
  dayKwh: Sized<number>
  nightKwh: Sized<number>
  continuousPeakW: Sized<number>
  surgePeakW: Sized<number>
  /** True when peak was inferred from a bill rather than an appliance list. */
  isPeakEstimated: boolean
}

export interface InverterSpec {
  continuousW: Sized<number>
  surgeRequiredW: Sized<number>
}

export interface ArraySpec {
  designPsh: Sized<number>
  derateTotal: Sized<number>
  requiredPvKw: Sized<number>
  panelCount: Sized<number>
  installedPvKw: Sized<number>
  roofAreaM2: Sized<number>
}

export interface BatterySpec {
  usableKwh: Sized<number>
  nominalKwh: Sized<number>
  bankAh: Sized<number>
  modulesInSeries: Sized<number>
  modulesInParallel: Sized<number>
}

export interface ControllerSpec {
  amps: Sized<number>
  type: Sized<ControllerType>
  maxStringVoc: Sized<number>
}

export interface Warning {
  id: string
  severity: 'info' | 'caution'
  message: string
}

export interface SystemDesign {
  inputs: SystemInputs
  load: DailyLoadProfile
  array: ArraySpec
  inverter: InverterSpec
  /** Null for grid-tied systems, which have no battery bus. */
  busVoltage: Sized<BusVoltage> | null
  battery: BatterySpec | null
  /** The module the battery figure is packaged into. Null when there is none. */
  batteryModule: BatteryModuleSpec | null
  controller: ControllerSpec | null
  warnings: Warning[]
}
