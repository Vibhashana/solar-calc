import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer, type AppState } from '../../state/appState'
import { StepPreferences } from './StepPreferences'

function Harness({ start }: { start?: Partial<AppState['inputs']> }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const base = initialState()
    return { ...base, inputs: { ...base.inputs, ...start } }
  })
  return (
    <>
      <StepPreferences state={state} dispatch={dispatch} />
      <p>Autonomy: {state.inputs.autonomyDays}</p>
      <p>Panel: {state.inputs.panelId}</p>
      <p>Touched: {state.touched.join(',')}</p>
    </>
  )
}

describe('StepPreferences', () => {
  it('says the defaults are safe to accept', () => {
    render(<Harness />)
    expect(screen.getByText(/already filled in/i)).toBeDefined()
  })

  it('records an autonomy the user sets, and marks it touched', () => {
    render(<Harness />)
    const input = screen.getByLabelText(/days .* run the house/i)
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '3')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(screen.getByText('Autonomy: 3')).toBeDefined()
    expect(screen.getByText('Touched: autonomyDays')).toBeDefined()
  })

  it('hides autonomy for grid-tied, which has no battery', () => {
    render(<Harness start={{ systemType: 'grid-tied' }} />)
    expect(screen.queryByLabelText(/days .* run the house/i)).toBeNull()
  })

  it('still carries a help disclosure when autonomy is hidden', () => {
    render(<Harness start={{ systemType: 'grid-tied' }} />)
    expect(screen.getAllByText('Not sure?').length).toBeGreaterThan(0)
  })

  it('offers the panel sizes in the data table', () => {
    render(<Harness />)
    const select = screen.getByLabelText(/panel size/i)
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, 'generic-330')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(screen.getByText('Panel: generic-330')).toBeDefined()
  })
})
