import { useEffect, useRef } from 'react'
import { WIZARD_STEP_COUNT } from '../../state/appState'
import { Button } from '../primitives/Button'
import { STEPS, type StepProps } from './steps'
import styles from './Wizard.module.css'

export function Wizard({ state, dispatch }: StepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // noUncheckedIndexedAccess: the reducer clamps `step`, but the compiler
  // cannot know that, and a non-null assertion is banned.
  const step = STEPS[state.step] ?? STEPS[0]

  useEffect(() => {
    headingRef.current?.focus()
  }, [state.step])

  if (!step) return <p>No wizard steps are defined.</p>
  const isLast = state.step === WIZARD_STEP_COUNT - 1
  const Step = step.Component

  return (
    <section
      className={step.wide ? `${styles.wizard} ${styles.wizardWide}` : styles.wizard}
      aria-labelledby="wizard-heading"
    >
      <div className={styles.progress}>
        <p className={styles.progressText}>
          Step {state.step + 1} of {WIZARD_STEP_COUNT} — {step.shortTitle}
        </p>
        {/* Decoration: the sentence above already says where the user is, and
            reading four unlabelled bars out loud tells nobody anything. */}
        <ol className={styles.ticks} aria-hidden="true">
          {STEPS.map((definition, index) => (
            <li
              key={definition.id}
              className={
                index < state.step
                  ? `${styles.tick} ${styles.tickDone}`
                  : index === state.step
                    ? `${styles.tick} ${styles.tickCurrent}`
                    : styles.tick
              }
            />
          ))}
        </ol>
      </div>

      <h2 id="wizard-heading" className={styles.heading} tabIndex={-1} ref={headingRef}>
        {step.title}
      </h2>

      <Step state={state} dispatch={dispatch} />

      <div className={styles.actions}>
        {state.step > 0 && (
          <Button variant="secondary" onClick={() => dispatch({ type: 'back' })}>
            Back
          </Button>
        )}
        <Button variant="primary" className={styles.next} onClick={() => dispatch({ type: 'next' })}>
          {isLast ? 'See my system' : 'Next'}
        </Button>
      </div>
    </section>
  )
}
