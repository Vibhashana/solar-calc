import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../../engine/defaults'
import { sizeSystem } from '../../engine/sizeSystem'
import { ShowTheMaths, collectSizedFields } from './ShowTheMaths'
import { Warnings } from './Warnings'

const offGrid = sizeSystem({ ...defaultInputs('off-grid', 'colombo'), load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 } })
const gridTied = sizeSystem({ ...defaultInputs('grid-tied', 'colombo'), load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 } })

// The full, ordered label set a battery design (off-grid or hybrid) must explain.
// Written out literally so adding a field to the engine without updating
// collectSizedFields fails this test, rather than passing silently.
const batteryDesignLabels = [
  'Energy per day',
  'Used during the day',
  'Used at night',
  'Peak demand',
  'Startup surge',
  'Sun hours used',
  'Losses',
  'Solar needed',
  'Panel count',
  'Installed size',
  'Roof area',
  'Continuous rating',
  'Surge required',
  'System voltage',
  'Usable energy',
  'Battery size',
  'Bank capacity',
  'Modules in series',
  'Modules in parallel',
  'Current rating',
  'Controller type',
  'Highest panel voltage',
]

// A grid-tied design has no bus, battery or charge controller, so it drops
// every label past the shared load/array/inverter fields.
const gridTiedLabels = [
  'Energy per day',
  'Used during the day',
  'Used at night',
  'Peak demand',
  'Startup surge',
  'Sun hours used',
  'Losses',
  'Solar needed',
  'Panel count',
  'Installed size',
  'Roof area',
  'Continuous rating',
  'Surge required',
]

describe('collectSizedFields', () => {
  it('finds every explained value in a battery design', () => {
    const fields = collectSizedFields(offGrid)
    expect(fields.map((f) => f.label)).toEqual(batteryDesignLabels)
    for (const { label, field } of fields) {
      expect(field.explain.plain.length, label).toBeGreaterThan(0)
      expect(field.explain.substituted.length, label).toBeGreaterThan(0)
    }
  })

  it('skips the branches a grid-tied design does not have', () => {
    const labels = collectSizedFields(gridTied).map((f) => f.label)
    expect(labels).toEqual(gridTiedLabels)
    // Named explicitly, one per nullable branch, so none of the three rests
    // only on the aggregate array comparison above.
    expect(labels).not.toContain('System voltage')
    expect(labels).not.toContain('Battery size')
    expect(labels).not.toContain('Current rating')
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

  it('formats numeric values as rounded figures, not raw floats', () => {
    render(<ShowTheMaths design={offGrid} />)
    act(() => {
      screen.getByText('Show me the maths').click()
    })
    // The dayKwh field has a long float value (3.28515111695138 kWh per day).
    // It should render rounded (e.g., "3.29"), not the raw float.
    // Verify the raw float is NOT rendered anywhere on the page.
    expect(screen.queryByText(/3\.28515111695138/)).toBeNull()
    // Check that the formatted value appears by looking at all term labels.
    const terms = screen.getAllByRole('term')
    const dayTerm = terms.find((term) => term.textContent?.includes('Used during the day'))
    const dayRow = dayTerm?.closest('div')
    const valueParagraph = dayRow?.querySelector('p')
    expect(valueParagraph?.textContent).toContain('3.29')
  })

  it('renders string-typed values as-is', () => {
    render(<ShowTheMaths design={offGrid} />)
    act(() => {
      screen.getByText('Show me the maths').click()
    })
    // The controller type field is a string ('MPPT' or 'PWM').
    // It should render as the string value, not converted or modified.
    const fields = collectSizedFields(offGrid)
    const typeField = fields.find((f) => f.label === 'Controller type')
    if (typeField && typeof typeField.field.value === 'string') {
      const terms = screen.getAllByRole('term')
      const typeTerm = terms.find((term) => term.textContent?.includes('Controller type'))
      const typeRow = typeTerm?.closest('div')
      const valueParagraph = typeRow?.querySelector('p')
      // The value should be the string (MPPT or PWM) followed by the unit.
      expect(valueParagraph?.textContent).toMatch(new RegExp(`${typeField.field.value}`))
    }
  })
})

describe('Warnings', () => {
  it('renders nothing when the design is clean', () => {
    const { container } = render(<Warnings warnings={[]} />)
    expect(container.firstChild).toBeNull()
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

  it('distinguishes severity by text content, not colour alone', () => {
    render(
      <Warnings
        warnings={[
          { id: 'estimated-peak', severity: 'info', message: 'Your inverter size is a rough estimate.' },
          { id: 'slow-recharge', severity: 'caution', message: 'The array recharges the bank slowly.' },
        ]}
      />,
    )
    const [infoItem, cautionItem] = screen.getAllByRole('listitem')
    expect(infoItem?.textContent).toMatch(/^Note/)
    expect(cautionItem?.textContent).toMatch(/^Caution/)
    // The engine's message itself must survive untouched, as its own text.
    expect(infoItem?.textContent).toContain('Your inverter size is a rough estimate.')
    expect(cautionItem?.textContent).toContain('The array recharges the bank slowly.')
  })
})
