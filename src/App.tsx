import { useEffect, useMemo, useReducer, type Dispatch } from 'react'
import { sizeSystem } from './engine/sizeSystem'
import { type Action, type AppState, initialState, reducer } from './state/appState'
import { decodeInputs, encodeInputs } from './state/url'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { Results } from './ui/results/Results'
import { Wizard } from './ui/wizard/Wizard'
import styles from './App.module.css'

interface DesignProps {
  state: AppState
  dispatch: Dispatch<Action>
}

// Isolated from App so sizeSystem's throw happens below the ErrorBoundary,
// where it can be caught, and so it only runs once there is a design to size.
function Design({ state, dispatch }: DesignProps) {
  const design = useMemo(() => sizeSystem(state.inputs), [state.inputs])
  return <Results design={design} state={state} dispatch={dispatch} />
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(decodeInputs(window.location.search)))

  // replaceState, not pushState: the back button must not become an undo stack.
  // Kept here rather than in Design: it does not depend on the engine's output,
  // and a failed render in Design would skip its effects entirely, leaving the
  // URL out of sync with the user's inputs right when things have gone wrong.
  useEffect(() => {
    window.history.replaceState(null, '', `?${encodeInputs(state.inputs)}`)
  }, [state.inputs])

  return (
    <main>
      <header className={styles.header}>
        <h1>Solar system calculator</h1>
        <p>Work out what size solar system you need, and understand why.</p>
      </header>

      {state.view === 'wizard' ? (
        <Wizard state={state} dispatch={dispatch} />
      ) : (
        <ErrorBoundary onReset={() => dispatch({ type: 'restart' })}>
          <Design state={state} dispatch={dispatch} />
        </ErrorBoundary>
      )}
    </main>
  )
}
