import { APPLIANCES, findAppliance } from '../data/appliances'
import { DEFAULTS, defaultInputs } from '../engine/defaults'
import type { Appliance, ApplianceEntry, SystemInputs, SystemType } from '../engine/types'

export type View = 'wizard' | 'results'
export type TouchedField = 'autonomyDays' | 'panelId' | 'batteryModuleId'

export const WIZARD_STEP_COUNT = 4

export interface AppState {
  view: View
  step: number
  inputs: SystemInputs
  touched: TouchedField[]
}

export type Action =
  | { type: 'setSystemType'; systemType: SystemType }
  | { type: 'setDistrict'; districtId: string }
  | { type: 'setPshOverride'; psh: number | undefined }
  | { type: 'setLoadMode'; mode: 'bill' | 'appliances' }
  | { type: 'setBill'; monthlyKwh: number }
  | { type: 'setNightFraction'; fraction: number }
  | { type: 'addAppliance'; applianceId?: string }
  | { type: 'setApplianceType'; index: number; applianceId: string }
  | { type: 'updateAppliance'; index: number; patch: Partial<ApplianceEntry> }
  | { type: 'removeAppliance'; index: number }
  | { type: 'setAutonomyDays'; days: number }
  | { type: 'setPanel'; panelId: string }
  | { type: 'setBatteryModule'; batteryModuleId: string | undefined }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'restart' }

const START = defaultInputs('hybrid', 'colombo')

function billLoad(): SystemInputs['load'] {
  return { mode: 'bill', monthlyKwh: START.load.mode === 'bill' ? START.load.monthlyKwh : 200, nightFraction: DEFAULTS.billNightFraction }
}

export function initialState(restored?: SystemInputs | null): AppState {
  if (!restored) {
    return { view: 'wizard', step: 0, inputs: START, touched: [] }
  }
  // A restored design carries no record of what the user typed, so infer it:
  // anything that differs from the default for its system type was chosen.
  const defaults = defaultInputs(restored.systemType, restored.districtId)
  const touched: TouchedField[] = []
  if (restored.autonomyDays !== defaults.autonomyDays) touched.push('autonomyDays')
  if (restored.panelId !== defaults.panelId) touched.push('panelId')
  if (restored.batteryModuleId !== defaults.batteryModuleId) touched.push('batteryModuleId')
  return { view: 'results', step: WIZARD_STEP_COUNT - 1, inputs: restored, touched }
}

function touch(state: AppState, field: TouchedField): TouchedField[] {
  return state.touched.includes(field) ? state.touched : [...state.touched, field]
}

function withInputs(state: AppState, inputs: SystemInputs): AppState {
  return { ...state, inputs }
}

function entriesOf(inputs: SystemInputs): ApplianceEntry[] | null {
  return inputs.load.mode === 'appliances' ? inputs.load.entries : null
}

/**
 * A fresh row for an appliance. `watts` is deliberately absent rather than
 * copied from the catalogue: the row shows the catalogue figure either way,
 * and leaving it absent is what marks the wattage as still untouched.
 */
function seedEntry(appliance: Appliance): ApplianceEntry {
  return {
    applianceId: appliance.id,
    quantity: 1,
    hoursPerDay: appliance.defaultHoursPerDay,
    usageWindow: appliance.defaultUsageWindow,
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setSystemType': {
      const defaults = defaultInputs(action.systemType, state.inputs.districtId)
      return withInputs(state, {
        ...state.inputs,
        systemType: action.systemType,
        autonomyDays: state.touched.includes('autonomyDays') ? state.inputs.autonomyDays : defaults.autonomyDays,
        panelId: state.touched.includes('panelId') ? state.inputs.panelId : defaults.panelId,
      })
    }

    case 'setDistrict':
      return withInputs(state, { ...state.inputs, districtId: action.districtId })

    case 'setPshOverride':
      return withInputs(state, { ...state.inputs, pshOverride: action.psh })

    case 'setLoadMode':
      if (action.mode === state.inputs.load.mode) return state
      return withInputs(state, {
        ...state.inputs,
        load: action.mode === 'bill' ? billLoad() : { mode: 'appliances', entries: [] },
      })

    case 'setBill':
      if (state.inputs.load.mode !== 'bill') return state
      return withInputs(state, { ...state.inputs, load: { ...state.inputs.load, monthlyKwh: action.monthlyKwh } })

    case 'setNightFraction':
      if (state.inputs.load.mode !== 'bill') return state
      return withInputs(state, { ...state.inputs, load: { ...state.inputs.load, nightFraction: action.fraction } })

    case 'addAppliance': {
      const entries = entriesOf(state.inputs)
      // The editor adds a blank row first and lets the user pick the appliance
      // in the row itself, so the action carries no id in the normal case.
      const appliance = findAppliance(action.applianceId ?? APPLIANCES[0]?.id ?? '')
      if (!entries || !appliance) return state
      return withInputs(state, {
        ...state.inputs,
        load: { mode: 'appliances', entries: [...entries, seedEntry(appliance)] },
      })
    }

    case 'setApplianceType': {
      const entries = entriesOf(state.inputs)
      const current = entries?.[action.index]
      const appliance = findAppliance(action.applianceId)
      if (!entries || !current || !appliance) return state
      if (appliance.id === current.applianceId) return state
      // A different appliance means different typical hours, a different time
      // of day and a different wattage, so the row is reseeded rather than
      // left carrying a fan's eight hours against a kettle. Quantity survives:
      // "three of them" is about the household, not the appliance.
      const next = entries.map((entry, i) =>
        i === action.index ? { ...seedEntry(appliance), quantity: entry.quantity } : entry,
      )
      return withInputs(state, { ...state.inputs, load: { mode: 'appliances', entries: next } })
    }

    case 'updateAppliance': {
      const entries = entriesOf(state.inputs)
      const current = entries?.[action.index]
      if (!entries || !current) return state
      const next = entries.map((entry, i) => (i === action.index ? { ...entry, ...action.patch } : entry))
      return withInputs(state, { ...state.inputs, load: { mode: 'appliances', entries: next } })
    }

    case 'removeAppliance': {
      const entries = entriesOf(state.inputs)
      if (!entries) return state
      return withInputs(state, {
        ...state.inputs,
        load: { mode: 'appliances', entries: entries.filter((_, i) => i !== action.index) },
      })
    }

    case 'setAutonomyDays':
      return { ...withInputs(state, { ...state.inputs, autonomyDays: action.days }), touched: touch(state, 'autonomyDays') }

    case 'setPanel':
      return { ...withInputs(state, { ...state.inputs, panelId: action.panelId }), touched: touch(state, 'panelId') }

    case 'setBatteryModule':
      return {
        ...withInputs(state, { ...state.inputs, batteryModuleId: action.batteryModuleId }),
        touched: touch(state, 'batteryModuleId'),
      }

    case 'next':
      if (state.step >= WIZARD_STEP_COUNT - 1) return { ...state, view: 'results' }
      return { ...state, step: state.step + 1 }

    case 'back':
      return { ...state, step: Math.max(0, state.step - 1) }

    case 'restart':
      return initialState()
  }
}
