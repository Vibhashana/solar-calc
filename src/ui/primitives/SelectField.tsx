import type { ReactNode } from 'react'
import styles from './fields.module.css'

export interface SelectOption {
  value: string
  label: string
  /** Optional heading to file this option under, e.g. an appliance category. */
  group?: string
}

interface SelectFieldProps {
  id: string
  label: ReactNode
  value: string
  hint?: ReactNode
  size?: 'full' | 'compact' | 'row'
  options: SelectOption[]
  onChange: (value: string) => void
}

const SIZES = { full: styles.field, compact: styles.fieldCompact, row: styles.fieldRow }

/** Options in their given order, bucketed by group, groups in first-seen order. */
function grouped(options: SelectOption[]): [string, SelectOption[]][] {
  const buckets = new Map<string, SelectOption[]>()
  for (const option of options) {
    const key = option.group ?? ''
    const bucket = buckets.get(key)
    if (bucket) bucket.push(option)
    else buckets.set(key, [option])
  }
  return [...buckets]
}

export function SelectField({ id, label, value, hint, size = 'full', options, onChange }: SelectFieldProps) {
  const hasGroups = options.some((option) => option.group !== undefined)

  return (
    <div className={SIZES[size]}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <span className={styles.selectWrap}>
        <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
          {hasGroups
            ? grouped(options).map(([group, members]) => (
                <optgroup key={group} label={group}>
                  {members.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>
        <span className={styles.chevron} aria-hidden="true" />
      </span>
    </div>
  )
}
