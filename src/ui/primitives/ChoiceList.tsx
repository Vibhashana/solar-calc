import { useId, type ReactNode } from 'react'
import styles from './fields.module.css'

interface Choice<T extends string> {
  value: T
  label: string
  description?: ReactNode
}

interface ChoiceListProps<T extends string> {
  legend: ReactNode
  value: T
  size?: 'full' | 'compact'
  choices: Choice<T>[]
  onChange: (value: T) => void
}

export function ChoiceList<T extends string>({ legend, value, size = 'full', choices, onChange }: ChoiceListProps<T>) {
  const name = useId()
  return (
    <fieldset className={size === 'compact' ? styles.choicesCompact : styles.choices}>
      <legend className={styles.legend}>{legend}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className={choice.value === value ? `${styles.choice} ${styles.choiceSelected}` : styles.choice}
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={choice.value === value}
            onChange={() => onChange(choice.value)}
          />
          <span>
            <span className={styles.choiceLabel}>{choice.label}</span>
            {choice.description && <span className={styles.choiceDescription}>{choice.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
