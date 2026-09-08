import { findAppliance } from '../data/appliances'
import { DEFAULTS, defaultInputs } from '../engine/defaults'
import type { ApplianceEntry, SystemInputs, SystemType } from '../engine/types'

export type View = 'wizard' | 'results'
export type TouchedField = 'autonomyDays' | 'panelId'

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
  | { type: 'addAppliance'; applianceId: string }
  | { type: 'updateAppliance'; index: number; patch: Partial<ApplianceEntry> }
  | { type: 'removeAppliance'; index: number }
  | { type: 'setAutonomyDays'; days: number }
  | { type: 'setPanel'; panelId: string }
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
      const appliance = findAppliance(action.applianceId)
      if (!entries || !appliance) return state
      const entry: ApplianceEntry = {
        applianceId: appliance.id,
        quantity: 1,
        hoursPerDay: appliance.defaultHoursPerDay,
        usageWindow: appliance.defaultUsageWindow,
      }
      return withInputs(state, { ...state.inputs, load: { mode: 'appliances', entries: [...entries, entry] } })
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

    case 'next':
      if (state.step >= WIZARD_STEP_COUNT - 1) return { ...state, view: 'results' }
      return { ...state, step: state.step + 1 }

    case 'back':
      return { ...state, step: Math.max(0, state.step - 1) }

    case 'restart':
      return initialState()
  }
}
