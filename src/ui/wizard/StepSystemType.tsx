import { useState } from 'react'
import { Button } from '../primitives/Button'
import { ChoiceList } from '../primitives/ChoiceList'
import { NotSure } from '../primitives/NotSure'
import type { SystemType } from '../../engine/types'
import type { StepProps } from './steps'
import styles from './Wizard.module.css'

const CHOICES: { value: SystemType; label: string; description: string }[] = [
  {
    value: 'off-grid',
    label: 'No mains electricity at all',
    description: 'Solar and a battery run everything, all year round. The biggest and most expensive of the three.',
  },
  {
    value: 'hybrid',
    label: 'Mains, but it cuts often',
    description: 'Solar with a battery to carry you through the cuts, and the mains as a backstop. The common choice in Sri Lanka.',
  },
  {
    value: 'grid-tied',
    label: 'Reliable mains, I want a smaller bill',
    description: 'Solar feeding the house while the sun is up, with no battery. The cheapest way to cut a bill, and it stops when the power does.',
  },
]

export function StepSystemType({ state, dispatch }: StepProps) {
  const [asking, setAsking] = useState<'mains' | 'cuts' | 'answered'>('mains')

  function choose(systemType: SystemType) {
    dispatch({ type: 'setSystemType', systemType })
    setAsking('answered')
  }

  const chosenLabel = CHOICES.find((choice) => choice.value === state.inputs.systemType)?.label

  return (
    <>
      <ChoiceList
        legend="Select your system type"
        choices={CHOICES}
        value={state.inputs.systemType}
        onChange={choose}
      />

      <NotSure>
        <p>Two questions will settle it.</p>
        {asking === 'mains' && (
          <div className={styles.branch}>
            <p>Do you have mains electricity at this place?</p>
            <Button size="sm" onClick={() => setAsking('cuts')}>
              Yes, I have mains
            </Button>
            <Button size="sm" onClick={() => choose('off-grid')}>
              No, there is no mains
            </Button>
          </div>
        )}

        {asking === 'cuts' && (
          <div className={styles.branch}>
            <p>Does the power cut often enough to bother you?</p>
            <Button size="sm" onClick={() => choose('hybrid')}>
              Yes, it cuts often
            </Button>
            <Button size="sm" onClick={() => choose('grid-tied')}>
              No, it is reliable
            </Button>
          </div>
        )}

        {asking === 'answered' && (
          <div className={styles.branch}>
            <p>Answered: {chosenLabel}</p>
            <Button size="sm" onClick={() => setAsking('mains')}>
              Answer these again
            </Button>
          </div>
        )}
      </NotSure>
    </>
  )
}
