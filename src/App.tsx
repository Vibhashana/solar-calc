import { useEffect, useMemo, useReducer } from 'react'
import { sizeSystem } from './engine/sizeSystem'
import { initialState, reducer } from './state/appState'
import { decodeInputs, encodeInputs } from './state/url'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { Results } from './ui/results/Results'
import { Wizard } from './ui/wizard/Wizard'

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(decodeInputs(window.location.search)))

  const design = useMemo(() => sizeSystem(state.inputs), [state.inputs])

  // replaceState, not pushState: the back button must not become an undo stack.
  useEffect(() => {
    window.history.replaceState(null, '', `?${encodeInputs(state.inputs)}`)
  }, [state.inputs])

  return (
    <main>
      <header>
        <h1>Solar system calculator</h1>
        <p>Work out what size solar system you need, and understand why.</p>
      </header>

      <ErrorBoundary onReset={() => dispatch({ type: 'restart' })}>
        {state.view === 'wizard' ? (
          <Wizard state={state} dispatch={dispatch} />
        ) : (
          <Results design={design} state={state} dispatch={dispatch} />
        )}
      </ErrorBoundary>
    </main>
  )
}
