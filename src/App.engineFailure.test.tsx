import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./engine/sizeSystem', () => ({
  sizeSystem: () => {
    throw new Error('impossible design')
  },
}))

import { App } from './App'

function setQuery(search: string) {
  window.history.replaceState(null, '', search === '' ? '/' : `/?${search}`)
}

describe('App when the engine throws', () => {
  beforeEach(() => {
    // React logs the caught error; silence it so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    setQuery('')
    vi.restoreAllMocks()
  })

  it('shows a recoverable message instead of a blank page', () => {
    setQuery('t=hybrid&d=colombo&l=b&kwh=250&nf=0.6&a=0.5&p=generic-550&b=lfp-51v-100ah')
    render(<App />)
    expect(screen.getByText(/could not work out a system/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Start over/ })).toBeDefined()
  })
})
