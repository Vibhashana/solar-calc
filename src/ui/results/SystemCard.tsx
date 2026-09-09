import type { ReactNode } from 'react'
import type { Sized } from '../../engine/types'
import { WhyThisNumber } from '../primitives/WhyThisNumber'
import styles from './SystemCard.module.css'

interface SystemCardProps {
  title: string
  figure: string
  unit: string
  /** One plain sentence saying what the figure means. */
  sentence: ReactNode
  /** The engine value whose explanation backs the figure. */
  field: Sized<unknown>
}

export function SystemCard({ title, figure, unit, sentence, field }: SystemCardProps) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.figure}>
        <span className={styles.value}>{figure}</span> <span className={styles.unit}>{unit}</span>
      </p>
      <p className={styles.sentence}>{sentence}</p>
      <WhyThisNumber field={field} />
    </article>
  )
}
