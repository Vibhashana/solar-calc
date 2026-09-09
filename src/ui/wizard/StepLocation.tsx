import { DISTRICTS, PSH_SOURCE, findDistrict, worstMonthPsh } from '../../data/psh'
import { formatFigure } from '../format'
import { NotSure } from '../primitives/NotSure'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import { Term } from '../primitives/Term'
import type { StepProps } from './steps'
import styles from './Wizard.module.css'

export function StepLocation({ state, dispatch }: StepProps) {
  const district = findDistrict(state.inputs.districtId)
  const worst = district ? worstMonthPsh(district) : undefined

  return (
    <>
      <SelectField
        id="district"
        label="Which district are you in?"
        value={state.inputs.districtId}
        hint="Sunshine varies across the island. The district sets how much sun the panels can expect."
        options={DISTRICTS.map((d) => ({ value: d.id, label: d.name }))}
        onChange={(districtId) => dispatch({ type: 'setDistrict', districtId })}
      />

      {worst !== undefined && (
        <p className={styles.resolved}>
          In its dullest month, {district?.name} gets about{' '}
          <strong>{formatFigure(worst)}</strong> <Term id="peak-sun-hours" />. Off-grid and hybrid systems are
          sized for that month, so they still work in the worst part of the year.
        </p>
      )}

      <p className={styles.provenance}>
        Sun figures from {PSH_SOURCE.name}, retrieved {PSH_SOURCE.fetchedOn}.
      </p>

      <NotSure>
        Pick the district you will install the panels in, not the one you post letters to. If you are between
        two, choose the one with less sun — a system sized for the duller place still works in the brighter one.
      </NotSure>

      <details className={styles.override}>
        <summary>Somewhere else, or you have your own figure?</summary>
        <div>
          <NumberField
            id="psh-override"
            label="Peak sun hours per day"
            value={state.inputs.pshOverride ?? worst ?? 4.5}
            min={1}
            max={8}
            step={0.1}
            unit="kWh/m² per day"
            hint="Use this only if you have a figure for your own site. Leave it alone otherwise."
            onChange={(psh) => dispatch({ type: 'setPshOverride', psh })}
          />
          {state.inputs.pshOverride !== undefined && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => dispatch({ type: 'setPshOverride', psh: undefined })}
            >
              Use the district figure instead
            </button>
          )}
        </div>
      </details>
    </>
  )
}
