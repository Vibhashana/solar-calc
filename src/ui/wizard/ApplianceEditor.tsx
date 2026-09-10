import { useEffect, useId, useRef } from 'react'
import { APPLIANCES, findAppliance } from '../../data/appliances'
import { computeLoadProfile } from '../../engine/loads'
import type { ApplianceEntry, UsageWindow } from '../../engine/types'
import { formatFigure } from '../format'
import { Button } from '../primitives/Button'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import type { StepProps } from './steps'
import styles from './ApplianceEditor.module.css'

const WINDOWS: { value: UsageWindow; label: string }[] = [
  { value: 'day', label: 'Daytime' },
  { value: 'night', label: 'After dark' },
  { value: 'both', label: 'Day and night' },
]

const APPLIANCE_OPTIONS = APPLIANCES.map((appliance) => ({
  value: appliance.id,
  label: appliance.name,
  group: appliance.category,
}))

/** The watts a row is working from: what the user typed, else the catalogue. */
function wattsOf(entry: ApplianceEntry): number {
  return entry.watts ?? findAppliance(entry.applianceId)?.watts ?? 0
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.6 9a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L12 4M6.5 7v4M9.5 7v4" />
    </svg>
  )
}

export function ApplianceEditor({ state, dispatch }: StepProps) {
  const fieldId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const justAdded = useRef(false)

  const entries = state.inputs.load.mode === 'appliances' ? state.inputs.load.entries : []
  const profile = computeLoadProfile({ mode: 'appliances', entries }, state.inputs.diversityFactor)

  // A row the user asked for should be a row the user is already typing in.
  useEffect(() => {
    if (!justAdded.current) return
    justAdded.current = false
    const rows = listRef.current?.children
    const newest = rows?.[rows.length - 1]
    newest?.querySelector('select')?.focus()
  }, [entries.length])

  function addRow() {
    justAdded.current = true
    dispatch({ type: 'addAppliance' })
  }

  const addButton = (
    <Button variant="primary" onClick={addRow}>
      <span aria-hidden="true">+</span> Add an appliance
    </Button>
  )

  return (
    <div className={styles.editor}>
      <p className={styles.rationale}>
        A bill cannot tell this tool how much power you draw at any one moment, and that is what decides the
        inverter size. Listing appliances gives a figure you can buy from.
      </p>

      {entries.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyLead}>Nothing listed yet, so there is nothing to size.</p>
          <p className={styles.emptyBody}>
            Add a row for each thing you run, starting with whatever you cannot do without: lights, a fan, the
            fridge. Every row starts with a typical wattage you can correct.
          </p>
          {addButton}
        </div>
      ) : (
        <>
          <div className={styles.headings} aria-hidden="true">
            <span>Appliance</span>
            <span>Watts each</span>
            <span>How many</span>
            <span>Hours a day</span>
            <span>When</span>
            <span />
          </div>

          <ul className={styles.rows} ref={listRef}>
            {entries.map((entry, index) => {
              const appliance = findAppliance(entry.applianceId)
              const name = appliance?.name ?? entry.applianceId
              const typical = appliance?.watts
              const corrected = entry.watts !== undefined && entry.watts !== typical

              return (
                // The index is the key on purpose. An appliance can be changed
                // in place now, and keying on its id would tear the row down
                // and take the focus with it mid-edit.
                // eslint-disable-next-line react/no-array-index-key
                <li key={index} className={styles.row}>
                  <SelectField
                    id={`${fieldId}-appliance-${index}`}
                    label="Appliance"
                    size="row"
                    value={entry.applianceId}
                    options={APPLIANCE_OPTIONS}
                    onChange={(applianceId) => dispatch({ type: 'setApplianceType', index, applianceId })}
                  />

                  <NumberField
                    id={`${fieldId}-watts-${index}`}
                    label="Watts each"
                    size="row"
                    value={wattsOf(entry)}
                    min={0}
                    max={20000}
                    unit="W"
                    after={
                      corrected && typical !== undefined ? (
                        <Button
                          variant="ghost"
                          className={styles.reset}
                          aria-label={`Use the typical ${formatFigure(typical)} W for ${name}`}
                          onClick={() => dispatch({ type: 'updateAppliance', index, patch: { watts: undefined } })}
                        >
                          Reset to {formatFigure(typical)} W
                        </Button>
                      ) : null
                    }
                    onChange={(watts) => dispatch({ type: 'updateAppliance', index, patch: { watts } })}
                  />

                  <NumberField
                    id={`${fieldId}-quantity-${index}`}
                    label="How many"
                    size="row"
                    value={entry.quantity}
                    min={1}
                    max={50}
                    onChange={(quantity) => dispatch({ type: 'updateAppliance', index, patch: { quantity } })}
                  />

                  <NumberField
                    id={`${fieldId}-hours-${index}`}
                    label="Hours a day"
                    size="row"
                    value={entry.hoursPerDay}
                    min={0}
                    max={24}
                    step={0.5}
                    onChange={(hoursPerDay) => dispatch({ type: 'updateAppliance', index, patch: { hoursPerDay } })}
                  />

                  <SelectField
                    id={`${fieldId}-window-${index}`}
                    label="When"
                    size="row"
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

                  <div className={styles.removeCell}>
                    <Button
                      variant="danger"
                      className={styles.removeButton}
                      aria-label={`Remove ${name}`}
                      title={`Remove ${name}`}
                      onClick={() => dispatch({ type: 'removeAppliance', index })}
                    >
                      <TrashIcon />
                      {/* Carried by the column of icons once the row has
                          columns; spelled out while it has a line to itself. */}
                      <span className={styles.removeLabel}>Remove</span>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className={styles.footer}>
            {addButton}
            <p className={styles.total}>
              <span className={styles.totalPart}>
                <strong>{formatFigure(profile.dailyKwh.value)}</strong> kWh a day
              </span>
              <span className={styles.totalPart}>
                about <strong>{formatFigure(profile.continuousPeakW.value)}</strong> W at once
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
