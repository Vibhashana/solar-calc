import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../../engine/defaults'
import { sizeSystem } from '../../engine/sizeSystem'
import { initialState, reducer } from '../../state/appState'
import { Results } from './Results'

function LiveHarness() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState({ ...defaultInputs('hybrid', 'colombo'), load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 } }),
  )
  return <Results design={sizeSystem(state.inputs)} state={state} dispatch={dispatch} />
}

function setInput(label: RegExp, value: string) {
  const input = screen.getByLabelText(label)
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('the live sidebar', () => {
  it('offers every input beside the results', () => {
    render(<LiveHarness />)
    expect(screen.getByRole('complementary', { name: /Your answers/ })).toBeDefined()
    expect(screen.getByLabelText(/units/i)).toBeDefined()
    expect(screen.getByLabelText(/district/i)).toBeDefined()
  })

  it('re-sizes the system when an input changes', () => {
    render(<LiveHarness />)
    const before = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent
    setInput(/units/i, '900')
    const after = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent
    expect(after).not.toBe(before)
  })

  it('drops the battery card when the system type changes to grid-tied', () => {
    render(<LiveHarness />)
    expect(screen.getByRole('heading', { name: 'Battery' })).toBeDefined()
    act(() => {
      screen.getByRole('radio', { name: /Reliable mains/ }).click()
    })
    expect(screen.queryByRole('heading', { name: 'Battery' })).toBeNull()
  })
})
