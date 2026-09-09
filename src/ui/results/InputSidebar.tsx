import type { Dispatch } from 'react'
import { BATTERY_MODULES, PANELS } from '../../data/components'
import { DISTRICTS } from '../../data/psh'
import type { SystemType } from '../../engine/types'
import type { Action, AppState } from '../../state/appState'
import { formatFigure } from '../format'
import { ChoiceList } from '../primitives/ChoiceList'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import { ApplianceEditor } from '../wizard/ApplianceEditor'
import styles from './InputSidebar.module.css'

const TYPES: { value: SystemType; label: string }[] = [
  { value: 'off-grid', label: 'No mains electricity' },
  { value: 'hybrid', label: 'Mains, but it cuts' },
  { value: 'grid-tied', label: 'Reliable mains' },
]

export function InputSidebar({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const { inputs } = state

  return (
    <aside className={styles.sidebar} aria-label="Your answers">
      <h2 className={styles.heading}>Your answers</h2>
      <p className={styles.note}>Change anything here and the figures update as you go.</p>

      <ChoiceList
        legend="System"
        size="compact"
        value={inputs.systemType}
        choices={TYPES}
        onChange={(systemType) => dispatch({ type: 'setSystemType', systemType })}
      />

      <SelectField
        id="sidebar-district"
        label="District"
        size="compact"
        value={inputs.districtId}
        options={DISTRICTS.map((d) => ({ value: d.id, label: d.name }))}
        onChange={(districtId) => dispatch({ type: 'setDistrict', districtId })}
      />

      {inputs.pshOverride !== undefined && (
        <div className={styles.overrideNotice}>
          <p className={styles.overrideText}>
            Using your own figure of {formatFigure(inputs.pshOverride)} sun hours a day — District will not
            change this.
          </p>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => dispatch({ type: 'setPshOverride', psh: undefined })}
          >
            Use the district figure instead
          </button>
        </div>
      )}

      <ChoiceList
        legend="Usage"
        size="compact"
        value={inputs.load.mode}
        choices={[
          { value: 'bill' as const, label: 'From my bill' },
          { value: 'appliances' as const, label: 'From my appliances' },
        ]}
        onChange={(mode) => dispatch({ type: 'setLoadMode', mode })}
      />

      {inputs.load.mode === 'bill' ? (
        <NumberField
          id="sidebar-kwh"
          label="Units a month"
          size="compact"
          value={inputs.load.monthlyKwh}
          min={0}
          max={5000}
          unit="kWh"
          onChange={(monthlyKwh) => dispatch({ type: 'setBill', monthlyKwh })}
        />
      ) : (
        <ApplianceEditor state={state} dispatch={dispatch} />
      )}

      {inputs.systemType !== 'grid-tied' && (
        <NumberField
          id="sidebar-autonomy"
          label="Days without sun"
          size="compact"
          value={inputs.autonomyDays}
          min={0}
          max={5}
          step={0.5}
          unit="days"
          onChange={(days) => dispatch({ type: 'setAutonomyDays', days })}
        />
      )}

      <SelectField
        id="sidebar-panel"
        label="Panel size"
        size="compact"
        value={inputs.panelId}
        options={PANELS.map((panel) => ({ value: panel.id, label: panel.name }))}
        onChange={(panelId) => dispatch({ type: 'setPanel', panelId })}
      />

      {inputs.systemType !== 'grid-tied' && (
        <SelectField
          id="sidebar-battery"
          label="Battery"
          size="compact"
          value={inputs.batteryModuleId}
          options={BATTERY_MODULES.map((module) => ({ value: module.id, label: module.name }))}
          onChange={(batteryModuleId) => dispatch({ type: 'setBatteryModule', batteryModuleId })}
        />
      )}
    </aside>
  )
}
