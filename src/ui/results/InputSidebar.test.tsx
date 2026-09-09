import { act, useReducer } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../../engine/defaults'
import { sizeSystem } from '../../engine/sizeSystem'
import { initialState, reducer } from '../../state/appState'
import { Results } from './Results'

function LiveHarness({ pshOverride }: { pshOverride?: number } = {}) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState({
      ...defaultInputs('hybrid', 'colombo'),
      load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 },
      pshOverride,
    }),
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

  it('offers a battery control and hides it for grid-tied', () => {
    render(<LiveHarness />)
    expect(screen.getByLabelText(/battery/i)).toBeDefined()
    act(() => {
      screen.getByRole('radio', { name: /Reliable mains/ }).click()
    })
    expect(screen.queryByLabelText(/battery/i)).toBeNull()
  })

  it('writes a battery module change into state', () => {
    render(<LiveHarness />)
    const select = screen.getByLabelText(/battery/i) as HTMLSelectElement
    expect(select.value).toBe('lfp-12v-100ah')
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, 'lfp-51v-200ah')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(select.value).toBe('lfp-51v-200ah')
  })

  it('shows a manual sun-hours override is in force, and clearing it restores the district figure', () => {
    render(<LiveHarness pshOverride={6.5} />)
    const sidebar = screen.getByRole('complementary', { name: /Your answers/ })
    expect(within(sidebar).getByText(/Using your own figure of 6\.5/)).toBeDefined()

    const before = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent

    act(() => {
      within(sidebar).getByRole('button', { name: /Use the district figure instead/ }).click()
    })

    expect(within(sidebar).queryByText(/Using your own figure/)).toBeNull()
    const after = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent
    expect(after).not.toBe(before)
  })

  it('shows no override notice when no override is set', () => {
    render(<LiveHarness />)
    const sidebar = screen.getByRole('complementary', { name: /Your answers/ })
    expect(within(sidebar).queryByText(/Using your own figure/)).toBeNull()
  })
})
