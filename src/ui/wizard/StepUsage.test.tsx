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

/** Switch to the appliance path and add `count` rows. */
function withRows(count: number) {
  render(<Harness />)
  clickRadio(/list my appliances/)
  for (let i = 0; i < count; i += 1) clickButton(/Add an appliance/)
}

const last = <T,>(list: T[]): T => list[list.length - 1] as T

describe('StepUsage', () => {
  it('starts on the bill path', () => {
    render(<Harness />)
    expect(screen.getByLabelText(/units .* last month/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /Add an appliance/ })).toBeNull()
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
    expect(screen.getByRole('button', { name: /Add an appliance/ })).toBeDefined()
    clickRadio(/I have my bill/)
    expect(screen.getByLabelText(/units .* last month/i)).toBeDefined()
  })

  it('shows no rows until one is asked for', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    expect(screen.queryAllByLabelText(/Appliance/)).toHaveLength(0)
    expect(screen.getByText(/nothing to size/i)).toBeDefined()
  })

  it('adds a row carrying the appliance, its typical watts, hours and window', () => {
    withRows(1)
    expect(screen.getByLabelText(/^Appliance$/)).toBeDefined()
    expect((screen.getByLabelText(/Watts each/) as HTMLInputElement).value).toBe('9')
    expect(screen.getByText(/"applianceId":"led-bulb"/)).toBeDefined()
    expect(screen.getByText(/"quantity":1/)).toBeDefined()
    expect(screen.getByText(/"hoursPerDay":5/)).toBeDefined()
  })

  it('adds a second row rather than replacing the first', () => {
    withRows(2)
    expect(screen.getAllByLabelText(/^Appliance$/)).toHaveLength(2)
  })

  it('changes the appliance on a row in place, reseeding its figures', () => {
    withRows(1)
    setValue(screen.getByLabelText(/^Appliance$/), 'ceiling-fan', 'select')
    expect(screen.getByText(/"applianceId":"ceiling-fan"/)).toBeDefined()
    expect((screen.getByLabelText(/Watts each/) as HTMLInputElement).value).toBe('75')
    expect(screen.getByText(/"hoursPerDay":8/)).toBeDefined()
  })

  it('lets the user correct the wattage the row started with', () => {
    withRows(1)
    setValue(screen.getByLabelText(/Watts each/), '12', 'input')
    expect(screen.getByText(/"watts":12/)).toBeDefined()
  })

  it('offers a way back to the typical wattage, and only once corrected', () => {
    withRows(1)
    expect(screen.queryByRole('button', { name: /Use the typical/ })).toBeNull()

    setValue(screen.getByLabelText(/Watts each/), '12', 'input')
    expect(screen.getByText('Reset to 9 W')).toBeDefined()

    clickButton(/Use the typical 9 W for LED bulb/)
    expect((screen.getByLabelText(/Watts each/) as HTMLInputElement).value).toBe('9')
    expect(screen.queryByText('Reset to 9 W')).toBeNull()
  })

  it('edits quantity and hours on a row', () => {
    withRows(1)
    setValue(screen.getByLabelText(/How many/), '8', 'input')
    setValue(screen.getByLabelText(/Hours a day/), '6', 'input')
    expect(screen.getByText(/"quantity":8/)).toBeDefined()
    expect(screen.getByText(/"hoursPerDay":6/)).toBeDefined()
  })

  it('removes a row', () => {
    withRows(1)
    clickButton(/Remove/)
    expect(screen.getByText(/"entries":\[\]/)).toBeDefined()
    expect(screen.getByText(/nothing to size/i)).toBeDefined()
  })

  it('runs a total from the rows as they are edited', () => {
    withRows(1)
    setValue(screen.getByLabelText(/^Appliance$/), 'ceiling-fan', 'select')
    setValue(screen.getByLabelText(/How many/), '2', 'input')
    setValue(screen.getByLabelText(/Hours a day/), '10', 'input')
    // 2 x 75 W x 10 h = 1.5 kWh; 150 W connected x 0.65 diversity = 97.5 W
    expect(screen.getByText('1.5')).toBeDefined()
    expect(screen.getByText('97.5')).toBeDefined()
  })

  it('puts the cursor in the row it just added', () => {
    withRows(1)
    expect(document.activeElement).toBe(screen.getByLabelText(/^Appliance$/))
    clickButton(/Add an appliance/)
    expect(document.activeElement).toBe(last(screen.getAllByLabelText(/^Appliance$/)))
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
    withRows(2)

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
    withRows(2)
    setValue(last(screen.getAllByLabelText(/^Appliance$/)), 'ceiling-fan', 'select')

    expect(screen.getByRole('button', { name: /Remove LED bulb/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Remove Ceiling fan/ })).toBeDefined()
  })

  it('files the appliance list under its categories', () => {
    withRows(1)
    const select = screen.getByLabelText(/^Appliance$/)
    const groups = [...select.querySelectorAll('optgroup')].map((group) => group.label)
    expect(groups).toContain('Lighting')
    expect(groups).toContain('Kitchen')
  })
})
