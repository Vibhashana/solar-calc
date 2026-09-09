import { ChoiceList } from '../primitives/ChoiceList'
import { NotSure } from '../primitives/NotSure'
import { NumberField } from '../primitives/NumberField'
import { ApplianceEditor } from './ApplianceEditor'
import type { StepProps } from './steps'

const NIGHT_SHARES = [
  { value: '0.35', label: 'Mostly during the day' },
  { value: '0.5', label: 'About evenly' },
  { value: '0.6', label: 'Mostly in the evening and at night' },
]

export function StepUsage({ state, dispatch }: StepProps) {
  const load = state.inputs.load

  return (
    <>
      <ChoiceList
        legend="How would you like to tell us what you use?"
        value={load.mode}
        choices={[
          {
            value: 'bill' as const,
            label: 'I have my bill',
            description: 'One number, and you are done. Good enough to size panels and a battery.',
          },
          {
            value: 'appliances' as const,
            label: 'Let me list my appliances',
            description: 'Takes a few minutes and gives a much better inverter size.',
          },
        ]}
        onChange={(mode) => dispatch({ type: 'setLoadMode', mode })}
      />

      {load.mode === 'bill' ? (
        <>
          <NumberField
            id="monthly-kwh"
            label="How many units did you use last month?"
            value={load.monthlyKwh}
            min={0}
            max={5000}
            unit="kWh"
            hint="Your bill calls these units or kWh. If it varies, use a typical month."
            onChange={(monthlyKwh) => dispatch({ type: 'setBill', monthlyKwh })}
          />
          <ChoiceList
            legend="When do you use most of it?"
            value={String(load.nightFraction)}
            choices={NIGHT_SHARES}
            onChange={(value) => dispatch({ type: 'setNightFraction', fraction: Number(value) })}
          />
          <NotSure>
            Look for the line on your CEB bill showing units consumed. If two months differ a lot, use the
            higher one — a system sized for the busy month copes with the quiet one.
          </NotSure>
        </>
      ) : (
        <>
          <ApplianceEditor state={state} dispatch={dispatch} />
          <NotSure>
            List only what you actually use — lights, fans, the fridge, a water pump. Guess at the hours if you
            are not sure; you can always come back and change it. Leaving something out just means the design
            will not cover it.
          </NotSure>
        </>
      )}
    </>
  )
}
