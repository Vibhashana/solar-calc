import { useId, useState, type ReactNode } from 'react'
import { GLOSSARY, type TermId } from '../../data/glossary'
import styles from './Term.module.css'

interface TermProps {
  id: TermId
  /** Overrides the visible wording; the definition is unchanged. */
  children?: ReactNode
}

export function Term({ id, children }: TermProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const entry = GLOSSARY[id]

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span id={panelId} role="note" className={styles.panel}>
          {entry.definition}
        </span>
      )}
    </span>
  )
}
