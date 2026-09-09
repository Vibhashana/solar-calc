import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SystemType } from '../../engine/types'
import { initialState, reducer } from '../../state/appState'
import { StepLocation } from './StepLocation'

function Harness({ systemType = 'hybrid' }: { systemType?: SystemType } = {}) {
  const [state, dispatch] = useReducer(
    reducer,
    { systemType, districtId: 'colombo' },
    (init) => {
      const s = initialState()
      return { ...s, inputs: { ...s.inputs, systemType: init.systemType, districtId: init.districtId } }
    },
  )
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

function setOverride(value: string) {
  const input = document.getElementById('psh-override') as HTMLInputElement
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('change', { bubbles: true }))
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
    expect(screen.getAllByText(/4\.95/).length).toBeGreaterThan(0)
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

  it('entering an override changes the headline figure to the user value', () => {
    render(<Harness />)
    // Initially shows Colombo worst month 4.95
    expect(screen.getAllByText(/4\.95/).length).toBeGreaterThan(0)
    // Enter a different value in the override field
    setOverride('6.5')
    // Now should show the user's figure and the override attribution
    expect(screen.getAllByText(/6\.5/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Using your own figure/)).toBeDefined()
  })

  it('a grid-tied system shows its annual-mean figure, not worst-month', () => {
    render(<Harness systemType="grid-tied" />)
    selectDistrict('vavuniya')
    // Vavuniya's worst month is 3.95, annual mean is about 5.3
    // Grid-tied systems show the annual mean, not worst-month
    expect(screen.getByText(/averages about/)).toBeDefined()
    // Should not show the worst month value
    expect(screen.queryByText(/3\.95/)).toBeNull()
  })
})
