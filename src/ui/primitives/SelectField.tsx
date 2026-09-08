import type { ReactNode } from 'react'
import styles from './fields.module.css'

interface SelectFieldProps {
  id: string
  label: ReactNode
  value: string
  hint?: ReactNode
  size?: 'full' | 'compact'
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export function SelectField({ id, label, value, hint, size = 'full', options, onChange }: SelectFieldProps) {
  return (
    <div className={size === 'compact' ? styles.fieldCompact : styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
