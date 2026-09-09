import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './fields.module.css'

interface NumberFieldProps {
  id: string
  label: ReactNode
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  hint?: ReactNode
  size?: 'full' | 'compact'
  clampNote?: (clampedTo: number, bound: 'min' | 'max') => string
  onChange: (value: number) => void
}

function defaultClampNote(clampedTo: number, bound: 'min' | 'max', unit?: string) {
  const shown = `${clampedTo.toLocaleString('en-GB')}${unit ? ` ${unit}` : ''}`
  return bound === 'max'
    ? `That is higher than this tool plans for, so it is using ${shown}.`
    : `That is lower than this tool plans for, so it is using ${shown}.`
}

export function NumberField({ id, label, value, min, max, step, unit, hint, size = 'full', clampNote, onChange }: NumberFieldProps) {
  const [note, setNote] = useState<string | null>(null)
  // Tracks the value this field itself last reported via onChange, so we can
  // tell "the parent echoed my own clamp back" (value === lastReported.current,
  // note should stay) apart from "the parent changed this out from under me"
  // (value differs, the note is stale and must clear). The second case
  // matters when a row identity is reused for different underlying data, e.g.
  // an appliance row sliding into a removed row's list index/key.
  const lastReported = useRef(value)

  useEffect(() => {
    if (value !== lastReported.current) {
      lastReported.current = value
      setNote(null)
    }
  }, [value])

  function handle(raw: string) {
    if (raw.trim() === '') {
      setNote(null)
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return

    const clamped = Math.min(max, Math.max(min, parsed))
    lastReported.current = clamped
    if (clamped !== parsed) {
      const bound = parsed > max ? 'max' : 'min'
      setNote(clampNote ? clampNote(clamped, bound) : defaultClampNote(clamped, bound, unit))
    } else {
      setNote(null)
    }
    onChange(clamped)
  }

  return (
    <div className={size === 'compact' ? styles.fieldCompact : styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <span className={styles.inputRow}>
        <input
          id={id}
          className={styles.input}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => handle(event.target.value)}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
    </div>
  )
}
