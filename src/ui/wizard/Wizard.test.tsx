import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { Wizard } from './Wizard'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  if (state.view === 'results') return <p>Results view</p>
  return <Wizard state={state} dispatch={dispatch} />
}

function clickButton(name: RegExp) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

describe('Wizard', () => {
  it('opens on the first question with no way back', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('What are you building?')
    expect(screen.queryByRole('button', { name: /Back/ })).toBeNull()
  })

  it('reports progress on every screen', () => {
    render(<Harness />)
    expect(screen.getByText('Step 1 of 4')).toBeDefined()
    clickButton(/Next/)
    expect(screen.getByText('Step 2 of 4')).toBeDefined()
  })

  it('walks forward to results and back again', () => {
    render(<Harness />)
    clickButton(/Next/)
    clickButton(/Next/)
    clickButton(/Next/)
    expect(screen.getByRole('button', { name: /See my system/ })).toBeDefined()
    clickButton(/Back/)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Your usage')
  })

  it('finishes into the results view', () => {
    render(<Harness />)
    clickButton(/Next/)
    clickButton(/Next/)
    clickButton(/Next/)
    clickButton(/See my system/)
    expect(screen.getByText('Results view')).toBeDefined()
  })

  it('moves focus to the heading on every step change', () => {
    render(<Harness />)
    clickButton(/Next/)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
  })
})
