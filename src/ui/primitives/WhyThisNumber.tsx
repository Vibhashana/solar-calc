import type { Sized } from '../../engine/types'
import styles from './WhyThisNumber.module.css'

/** The only component that renders explanation text. */
export function WhyThisNumber({ field }: { field: Sized<unknown> }) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Why this number?</summary>
      <div className={styles.body}>
        <p className={styles.plain}>{field.explain.plain}</p>
        <code className={styles.substituted}>{field.explain.substituted}</code>
        {field.explain.assumptions.length > 0 && (
          <ul className={styles.assumptions}>
            {field.explain.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}
