import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotSure } from './NotSure'

describe('NotSure', () => {
  it('hides its help until opened', () => {
    render(<NotSure>Pick hybrid if the power cuts often.</NotSure>)
    const summary = screen.getByText('Not sure?')
    expect(screen.getByText(/Pick hybrid/).closest('details')?.open).toBe(false)
    act(() => {
      summary.click()
    })
    expect(screen.getByText(/Pick hybrid/).closest('details')?.open).toBe(true)
  })
})
