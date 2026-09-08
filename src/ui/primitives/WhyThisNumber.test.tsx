import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Sized } from '../../engine/types'
import { WhyThisNumber } from './WhyThisNumber'

const FIELD: Sized<number> = {
  value: 5,
  unit: 'panels',
  explain: {
    plain: 'Five panels cover the energy your home uses in the worst month of the year.',
    formula: 'panels = ceil(requiredPvKw / panelKw)',
    substituted: 'panels = ceil(2.2 / 0.55) = 5',
    assumptions: ['Worst-month sun hours', 'Losses of 22%'],
  },
}

describe('WhyThisNumber', () => {
  it('keeps the explanation collapsed until asked', () => {
    render(<WhyThisNumber field={FIELD} />)
    expect(screen.getByText('Why this number?').closest('details')?.open).toBe(false)
  })

  it('shows the plain sentence and the arithmetic when opened', () => {
    render(<WhyThisNumber field={FIELD} />)
    act(() => {
      screen.getByText('Why this number?').click()
    })
    expect(screen.getByText(/Five panels cover the energy/)).toBeDefined()
    expect(screen.getByText('panels = ceil(2.2 / 0.55) = 5')).toBeDefined()
  })
})
