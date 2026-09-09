import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function setQuery(search: string) {
  window.history.replaceState(null, '', search === '' ? '/' : `/?${search}`)
}

afterEach(() => {
  setQuery('')
  vi.restoreAllMocks()
})

describe('App', () => {
  it('starts the wizard when the URL carries no design', () => {
    setQuery('')
    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: 'What are you building?' })).toBeDefined()
  })

  it('opens straight to results when the URL carries a design', () => {
    setQuery('t=hybrid&d=colombo&l=b&kwh=250&nf=0.6&a=0.5&p=generic-550&b=lfp-51v-100ah')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Your system' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
  })

  it('writes the design back to the URL without adding history entries', () => {
    setQuery('t=hybrid&d=colombo&l=b&kwh=250&nf=0.6&a=0.5&p=generic-550&b=lfp-51v-100ah')
    const push = vi.spyOn(window.history, 'pushState')
    render(<App />)
    const input = screen.getByLabelText(/Units a month/)
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '640')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(window.location.search).toContain('kwh=640')
    expect(push).not.toHaveBeenCalled()
  })

  it('round-trips its own URL back into the same design', () => {
    setQuery('t=off-grid&d=kandy&l=b&kwh=310&nf=0.6&a=2&p=generic-550&b=lfp-51v-100ah')
    const { unmount } = render(<App />)
    const first = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent
    const written = window.location.search
    unmount()

    setQuery(written.slice(1))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent).toBe(first)
  })
})
