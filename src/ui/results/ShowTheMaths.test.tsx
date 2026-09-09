import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../../engine/defaults'
import { sizeSystem } from '../../engine/sizeSystem'
import { ShowTheMaths, collectSizedFields } from './ShowTheMaths'
import { Warnings } from './Warnings'

const offGrid = sizeSystem({ ...defaultInputs('off-grid', 'colombo'), load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 } })
const gridTied = sizeSystem({ ...defaultInputs('grid-tied', 'colombo'), load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 } })

describe('collectSizedFields', () => {
  it('finds every explained value in a battery design', () => {
    const fields = collectSizedFields(offGrid)
    expect(fields.length).toBeGreaterThan(14)
    for (const { label, field } of fields) {
      expect(field.explain.plain.length, label).toBeGreaterThan(0)
      expect(field.explain.substituted.length, label).toBeGreaterThan(0)
    }
  })

  it('skips the branches a grid-tied design does not have', () => {
    const labels = collectSizedFields(gridTied).map((f) => f.label)
    expect(labels).not.toContain('Battery size')
    expect(collectSizedFields(gridTied).length).toBeLessThan(collectSizedFields(offGrid).length)
  })
})

describe('ShowTheMaths', () => {
  it('stays collapsed until asked', () => {
    render(<ShowTheMaths design={offGrid} />)
    expect(screen.getByText('Show me the maths').closest('details')?.open).toBe(false)
  })

  it('renders every field once opened', () => {
    render(<ShowTheMaths design={offGrid} />)
    act(() => {
      screen.getByText('Show me the maths').click()
    })
    const rendered = screen.getAllByRole('term')
    expect(rendered.length).toBe(collectSizedFields(offGrid).length)
  })
})

describe('Warnings', () => {
  it('renders nothing when the design is clean', () => {
    const { container } = render(<Warnings warnings={[]} />)
    expect(container.textContent).toBe('')
  })

  it('lists each warning with its severity', () => {
    render(
      <Warnings
        warnings={[
          { id: 'estimated-peak', severity: 'info', message: 'Your inverter size is a rough estimate.' },
          { id: 'slow-recharge', severity: 'caution', message: 'The array recharges the bank slowly.' },
        ]}
      />,
    )
    expect(screen.getByText(/rough estimate/)).toBeDefined()
    expect(screen.getByText(/recharges the bank slowly/)).toBeDefined()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
