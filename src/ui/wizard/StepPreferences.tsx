import { PANELS } from '../../data/components'
import { NotSure } from '../primitives/NotSure'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import { Term } from '../primitives/Term'
import type { StepProps } from './steps'
import styles from './Wizard.module.css'

export function StepPreferences({ state, dispatch }: StepProps) {
  const hasBattery = state.inputs.systemType !== 'grid-tied'

  return (
    <>
      <p className={styles.resolved}>
        These are already filled in with sensible values. Move on unless you have a reason to change them.
      </p>

      {hasBattery && (
        <>
          <NumberField
            id="autonomy"
            label="How many days should the battery run the house with no sun?"
            value={state.inputs.autonomyDays}
            min={0}
            max={5}
            step={0.5}
            unit="days"
            hint="More days means a bigger and more expensive battery."
            onChange={(days) => dispatch({ type: 'setAutonomyDays', days })}
          />
          <NotSure>
            This is called <Term id="autonomy" />. Two days suits a place with no mains at all. Half a day is
            plenty when the mains is there to fall back on.
          </NotSure>
        </>
      )}

      <SelectField
        id="panel"
        label="What panel size can you buy locally?"
        value={state.inputs.panelId}
        hint="Suppliers stock different sizes. Pick what is available near you; the tool works out how many you need."
        options={PANELS.map((panel) => ({ value: panel.id, label: panel.name }))}
        onChange={(panelId) => dispatch({ type: 'setPanel', panelId })}
      />

      <NotSure>
        Panel size changes how many you need, not how much solar you get — six 450 W panels and five 550 W
        panels produce nearly the same. Pick whatever your local supplier actually stocks.
      </NotSure>

      {/* No battery question here on purpose. Which module a bank is built
          from has to match the system voltage, and the system voltage is
          derived from the inverter and array rather than asked for — so the
          tool already knows which modules are valid, and the choice changes
          only how many boxes the same capacity arrives in. It is offered on
          the results screen, next to a real design, for anyone shopping. */}
    </>
  )
}
