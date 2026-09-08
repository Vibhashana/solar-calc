import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Term } from './Term'

function click(element: HTMLElement) {
  act(() => {
    element.click()
  })
}

describe('Term', () => {
  it('shows the term and hides the definition until asked', () => {
    render(<Term id="mppt" />)
    expect(screen.getByRole('button', { name: /MPPT/ })).toBeDefined()
    expect(screen.queryByText(/charge controller/i)).toBeNull()
  })

  it('reveals and hides the definition on click', () => {
    render(<Term id="mppt" />)
    const button = screen.getByRole('button', { name: /MPPT/ })
    expect(button.getAttribute('aria-expanded')).toBe('false')

    click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/more power out of the same panels/i)).toBeDefined()

    click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('lets the caller override the visible wording', () => {
    render(<Term id="peak-sun-hours">sun hours</Term>)
    expect(screen.getByRole('button', { name: /sun hours/ })).toBeDefined()
  })
})
