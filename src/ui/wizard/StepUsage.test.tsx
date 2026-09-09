import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { StepUsage } from './StepUsage'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  return (
    <>
      <StepUsage state={state} dispatch={dispatch} />
      <p>Load: {JSON.stringify(state.inputs.load)}</p>
    </>
  )
}

function clickRadio(name: RegExp) {
  act(() => {
    screen.getByRole('radio', { name }).click()
  })
}

function clickButton(name: RegExp) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

function setValue(element: HTMLElement, value: string, tag: 'input' | 'select') {
  act(() => {
    const proto = tag === 'input' ? HTMLInputElement.prototype : HTMLSelectElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(element, value)
    element.dispatchEvent(new Event(tag === 'input' ? 'input' : 'change', { bubbles: true }))
  })
}

describe('StepUsage', () => {
  it('starts on the bill path', () => {
    render(<Harness />)
    expect(screen.getByLabelText(/units .* last month/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /Add appliance/ })).toBeNull()
  })

  it('records the bill figure', () => {
    render(<Harness />)
    setValue(screen.getByLabelText(/units .* last month/i), '420', 'input')
    expect(screen.getByText(/"monthlyKwh":420/)).toBeDefined()
  })

  it('records when the power is used', () => {
    render(<Harness />)
    clickRadio(/Mostly during the day/)
    expect(screen.getByText(/"nightFraction":0.35/)).toBeDefined()
  })

  it('switches to the appliance path and back', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    expect(screen.getByRole('button', { name: /Add appliance/ })).toBeDefined()
    clickRadio(/I have my bill/)
    expect(screen.getByLabelText(/units .* last month/i)).toBeDefined()
  })

  it('adds an appliance with its own sensible defaults', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'ceiling-fan', 'select')
    clickButton(/Add appliance/)
    expect(screen.getByText(/"applianceId":"ceiling-fan"/)).toBeDefined()
    expect(screen.getByText(/"quantity":1/)).toBeDefined()
  })

  it('edits quantity and hours on a row', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'led-bulb', 'select')
    clickButton(/Add appliance/)
    setValue(screen.getByLabelText(/How many/), '8', 'input')
    setValue(screen.getByLabelText(/Hours a day/), '6', 'input')
    expect(screen.getByText(/"quantity":8/)).toBeDefined()
    expect(screen.getByText(/"hoursPerDay":6/)).toBeDefined()
  })

  it('removes a row', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'led-bulb', 'select')
    clickButton(/Add appliance/)
    clickButton(/Remove/)
    expect(screen.getByText(/"entries":\[\]/)).toBeDefined()
  })

  it('tells the user why the appliance path is worth the effort', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    expect(screen.getByText(/at any one moment/i)).toBeDefined()
  })

  it('tells the user what to do when nothing is listed yet', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    expect(screen.getByText(/nothing to size/i)).toBeDefined()
  })

  it('carries the help disclosure on both the bill and appliance paths', () => {
    render(<Harness />)
    expect(screen.getByText('Not sure?')).toBeDefined()
    clickRadio(/list my appliances/)
    expect(screen.getByText('Not sure?')).toBeDefined()
  })

  it('does not carry a stale clamp note into a row that slides into a reused list key', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'led-bulb', 'select')
    clickButton(/Add appliance/)
    clickButton(/Add appliance/)

    const hoursFields = () => screen.getAllByLabelText(/Hours a day/)
    setValue(hoursFields()[0] as HTMLElement, '999', 'input')
    expect(screen.getByRole('status').textContent).toMatch(/24/)

    setValue(hoursFields()[1] as HTMLElement, '3', 'input')

    act(() => {
      screen.getAllByRole('button', { name: /Remove/ })[0]?.click()
    })

    expect(screen.getByText(/"hoursPerDay":3/)).toBeDefined()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('gives each Remove button an accessible name naming its appliance', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'led-bulb', 'select')
    clickButton(/Add appliance/)
    setValue(screen.getByLabelText(/Appliance to add/), 'ceiling-fan', 'select')
    clickButton(/Add appliance/)

    expect(screen.getByRole('button', { name: /Remove LED bulb/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Remove Ceiling fan/ })).toBeDefined()
  })
})
