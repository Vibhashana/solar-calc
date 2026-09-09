import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { StepSystemType } from './StepSystemType'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  return (
    <>
      <StepSystemType state={state} dispatch={dispatch} />
      <p>Chosen: {state.inputs.systemType}</p>
      <p>Autonomy: {state.inputs.autonomyDays}</p>
    </>
  )
}

function click(name: RegExp | string) {
  act(() => {
    screen.getByRole(typeof name === 'string' ? 'button' : 'radio', { name }).click()
  })
}

describe('StepSystemType', () => {
  it('offers all three system types in plain language', () => {
    render(<Harness />)
    expect(screen.getByRole('radio', { name: /No mains electricity/ })).toBeDefined()
    expect(screen.getByRole('radio', { name: /Mains, but it cuts/ })).toBeDefined()
    expect(screen.getByRole('radio', { name: /Reliable mains/ })).toBeDefined()
  })

  it('records the choice and re-applies the matching autonomy default', () => {
    render(<Harness />)
    click(/No mains electricity/)
    expect(screen.getByText('Chosen: off-grid')).toBeDefined()
    expect(screen.getByText('Autonomy: 2')).toBeDefined()
  })

  it('chooses off-grid for someone with no mains power', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /No, there is no mains/ }).click()
    })
    expect(screen.getByText('Chosen: off-grid')).toBeDefined()
  })

  it('chooses hybrid when mains exists but cuts often', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /Yes, I have mains/ }).click()
    })
    act(() => {
      screen.getByRole('button', { name: /Yes, it cuts often/ }).click()
    })
    expect(screen.getByText('Chosen: hybrid')).toBeDefined()
  })

  it('chooses grid-tied when mains is reliable', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /Yes, I have mains/ }).click()
    })
    act(() => {
      screen.getByRole('button', { name: /No, it is reliable/ }).click()
    })
    expect(screen.getByText('Chosen: grid-tied')).toBeDefined()
  })

  it('shows a confirmation after answering the not-sure path', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /No, there is no mains/ }).click()
    })
    expect(screen.getByText(/Answered: No mains electricity at all/)).toBeDefined()
  })

  it('allows redoing the not-sure path from the confirmation', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /No, there is no mains/ }).click()
    })
    act(() => {
      screen.getByRole('button', { name: /Answer these again/ }).click()
    })
    expect(screen.getByRole('button', { name: /Yes, I have mains/ })).toBeDefined()
  })
})
