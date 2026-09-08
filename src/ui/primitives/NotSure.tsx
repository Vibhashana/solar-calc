import type { ReactNode } from 'react'
import styles from './fields.module.css'

/** The help disclosure that parent §7.1 requires on every wizard screen. */
export function NotSure({ children }: { children: ReactNode }) {
  return (
    <details className={styles.notSure}>
      <summary>Not sure?</summary>
      <div className={styles.notSureBody}>{children}</div>
    </details>
  )
}
