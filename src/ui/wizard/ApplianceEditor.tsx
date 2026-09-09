import { useState } from 'react'
import { APPLIANCES, findAppliance } from '../../data/appliances'
import type { UsageWindow } from '../../engine/types'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import type { StepProps } from './steps'
import styles from './ApplianceEditor.module.css'

const WINDOWS: { value: UsageWindow; label: string }[] = [
  { value: 'day', label: 'While the sun is up' },
  { value: 'night', label: 'In the evening or at night' },
  { value: 'both', label: 'Both' },
]

export function ApplianceEditor({ state, dispatch }: StepProps) {
  const [toAdd, setToAdd] = useState(APPLIANCES[0]?.id ?? '')
  const entries = state.inputs.load.mode === 'appliances' ? state.inputs.load.entries : []

  return (
    <div>
      <p className={styles.rationale}>
        A bill cannot tell this tool how much power you draw at any one moment, and that is what decides the
        inverter size. Listing appliances gives a figure you can buy from.
      </p>

      <div className={styles.adder}>
        <SelectField
          id="appliance-to-add"
          label="Appliance to add"
          size="compact"
          value={toAdd}
          options={APPLIANCES.map((a) => ({ value: a.id, label: `${a.name} — ${a.watts} W` }))}
          onChange={setToAdd}
        />
        <button
          type="button"
          className={styles.add}
          onClick={() => dispatch({ type: 'addAppliance', applianceId: toAdd })}
        >
          Add appliance
        </button>
      </div>

      {entries.length === 0 && (
        <p className={styles.empty}>Nothing listed yet. Add the things you cannot do without first.</p>
      )}

      <ul className={styles.rows}>
        {entries.map((entry, index) => {
          const appliance = findAppliance(entry.applianceId)
          return (
            <li key={`${entry.applianceId}-${index}`} className={styles.row}>
              <p className={styles.rowName}>
                {appliance?.name ?? entry.applianceId}{' '}
                <span className={styles.watts}>{appliance?.watts ?? 0} W each</span>
              </p>
              <NumberField
                id={`quantity-${index}`}
                label="How many"
                size="compact"
                value={entry.quantity}
                min={1}
                max={50}
                onChange={(quantity) => dispatch({ type: 'updateAppliance', index, patch: { quantity } })}
              />
              <NumberField
                id={`hours-${index}`}
                label="Hours a day"
                size="compact"
                value={entry.hoursPerDay}
                min={0}
                max={24}
                step={0.5}
                onChange={(hoursPerDay) => dispatch({ type: 'updateAppliance', index, patch: { hoursPerDay } })}
              />
              <SelectField
                id={`window-${index}`}
                label="When"
                size="compact"
                value={entry.usageWindow}
                options={WINDOWS}
                onChange={(value) =>
                  dispatch({
                    type: 'updateAppliance',
                    index,
                    patch: { usageWindow: WINDOWS.find((w) => w.value === value)?.value ?? 'both' },
                  })
                }
              />
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${appliance?.name ?? entry.applianceId}`}
                onClick={() => dispatch({ type: 'removeAppliance', index })}
              >
                Remove
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
