import type { Warning } from '../../engine/types'
import styles from './Warnings.module.css'

export function Warnings({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="warnings-heading">
      <h2 id="warnings-heading" className={styles.heading}>
        Worth knowing
      </h2>
      <ul className={styles.list}>
        {warnings.map((warning) => (
          <li key={warning.id} className={warning.severity === 'caution' ? styles.caution : styles.info}>
            {warning.message}
          </li>
        ))}
      </ul>
    </section>
  )
}
