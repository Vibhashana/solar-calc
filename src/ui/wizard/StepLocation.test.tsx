import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { StepLocation } from './StepLocation'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  return (
    <>
      <StepLocation state={state} dispatch={dispatch} />
      <p>District: {state.inputs.districtId}</p>
      <p>Override: {String(state.inputs.pshOverride)}</p>
    </>
  )
}

function selectDistrict(value: string) {
  const select = screen.getByLabelText(/Which district/) as HTMLSelectElement
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    setter?.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('StepLocation', () => {
  it('lists districts and records the choice', () => {
    render(<Harness />)
    selectDistrict('jaffna')
    expect(screen.getByText('District: jaffna')).toBeDefined()
  })

  it('shows the worst-month sun hours the district resolves to', () => {
    render(<Harness />)
    // Colombo's worst month is 4.95 kWh/m2/day in the committed table.
    expect(screen.getByText(/4\.95/)).toBeDefined()
  })

  it('names where the sun figures came from', () => {
    render(<Harness />)
    expect(screen.getByText(/NASA POWER/)).toBeDefined()
  })

  it('keeps the manual override out of the way until opened', () => {
    render(<Harness />)
    expect(screen.getByText(/Somewhere else, or you have your own figure/).closest('details')?.open).toBe(false)
  })

  it('carries the help disclosure every screen must have', () => {
    render(<Harness />)
    expect(screen.getByText('Not sure?')).toBeDefined()
  })
})
