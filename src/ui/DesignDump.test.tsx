import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DesignDump } from './DesignDump'
import { sizeSystem } from '../engine/sizeSystem'
import { defaultInputs } from '../engine/defaults'

// Query by heading role, not by text. The explanation prose repeats words
// like "panels" and "battery" many times on the page, so getByText would
// match multiple elements and throw.
describe('DesignDump', () => {
  it('shows the headline sections for a battery system', () => {
    render(<DesignDump design={sizeSystem(defaultInputs('off-grid', 'colombo'))} />)
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Battery' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Inverter' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Charge controller' })).toBeDefined()
  })

  it('renders a grid-tied design without battery sections', () => {
    render(<DesignDump design={sizeSystem(defaultInputs('grid-tied', 'colombo'))} />)
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Charge controller' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Battery' })).toBeNull()
  })
})
