import { useEffect, useRef } from 'react'
import { WIZARD_STEP_COUNT } from '../../state/appState'
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
    <section className={styles.wizard} aria-labelledby="wizard-heading">
      <p className={styles.progress}>
        Step {state.step + 1} of {WIZARD_STEP_COUNT}
      </p>
      <h2 id="wizard-heading" className={styles.heading} tabIndex={-1} ref={headingRef}>
        {step.title}
      </h2>

      <Step state={state} dispatch={dispatch} />

      <div className={styles.actions}>
        {state.step > 0 && (
          <button type="button" className={styles.secondary} onClick={() => dispatch({ type: 'back' })}>
            Back
          </button>
        )}
        <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'next' })}>
          {isLast ? 'See my system' : 'Next'}
        </button>
      </div>
    </section>
  )
}
