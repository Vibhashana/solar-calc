import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Exploding(): JSX.Element {
  throw new Error('impossible design')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; silence it so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary onReset={() => {}}>
        <p>All well</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('All well')).toBeDefined()
  })

  it('shows a recoverable message instead of a blank page', () => {
    render(
      <ErrorBoundary onReset={() => {}}>
        <Exploding />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/could not work out a system/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Start over/ })).toBeDefined()
  })
})
