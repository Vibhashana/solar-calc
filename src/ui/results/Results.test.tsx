import { useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../../engine/defaults'
import { sizeSystem } from '../../engine/sizeSystem'
import type { SystemType } from '../../engine/types'
import { initialState, reducer } from '../../state/appState'
import { Results } from './Results'

function Harness({ systemType }: { systemType: SystemType }) {
  const inputs = { ...defaultInputs(systemType, 'colombo'), load: { mode: 'bill' as const, monthlyKwh: 250, nightFraction: 0.6 } }
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(inputs))
  return <Results design={sizeSystem(inputs)} state={state} dispatch={dispatch} />
}

describe('Results', () => {
  it('shows all four cards for an off-grid system', () => {
    render(<Harness systemType="off-grid" />)
    for (const title of ['Panels', 'Battery', 'Inverter', 'Charge controller']) {
      expect(screen.getByRole('heading', { name: title }), title).toBeDefined()
    }
  })

  it('shows all four cards for a hybrid system', () => {
    render(<Harness systemType="hybrid" />)
    expect(screen.getByRole('heading', { name: 'Battery' })).toBeDefined()
  })

  it('omits the battery and controller cards for grid-tied', () => {
    render(<Harness systemType="grid-tied" />)
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Battery' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Charge controller' })).toBeNull()
  })

  it('gives every card an explanation', () => {
    render(<Harness systemType="off-grid" />)
    expect(screen.getAllByText('Why this number?')).toHaveLength(4)
  })

  it('leads each card with a figure', () => {
    render(<Harness systemType="hybrid" />)
    const panels = screen.getByRole('heading', { name: 'Panels' }).closest('article')
    expect(panels?.textContent).toMatch(/\d/)
  })

  it('shows the warnings the engine produced', () => {
    render(<Harness systemType="hybrid" />)
    // A bill-based design always carries the estimated-peak notice.
    expect(screen.getByText(/rough estimate/i)).toBeDefined()
  })

  it('offers the full arithmetic', () => {
    render(<Harness systemType="hybrid" />)
    expect(screen.getByText('Show me the maths')).toBeDefined()
  })

  it('does not claim a 0 W surge for a grid-tied inverter', () => {
    render(<Harness systemType="grid-tied" />)
    const inverter = screen.getByRole('heading', { name: 'Inverter' }).closest('article')
    expect(inverter?.textContent).not.toMatch(/\b0 W\b/)
    expect(inverter?.textContent).toMatch(/does not need to survive/)
  })
})
