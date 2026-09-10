import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SelectField } from './SelectField'

describe('SelectField', () => {
  it('associates the label with the select input', () => {
    render(
      <SelectField
        id="test-select"
        label="Pick one"
        value="a"
        options={[{ value: 'a', label: 'Option A' }]}
        onChange={() => {}}
      />
    )
    expect(screen.getByLabelText('Pick one')).toBeDefined()
  })

  it('renders every option from the options array', () => {
    const options = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
      { value: 'c', label: 'Option C' },
    ]
    render(
      <SelectField id="test-select" label="Pick one" value="a" options={options} onChange={() => {}} />
    )
    options.forEach((option) => {
      expect(screen.getByText(option.label)).toBeDefined()
    })
  })

  it('calls onChange with the new value when selection changes', () => {
    const onChange = vi.fn()
    render(
      <SelectField
        id="test-select"
        label="Pick one"
        value="a"
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ]}
        onChange={onChange}
      />
    )
    const select = screen.getByLabelText('Pick one') as HTMLSelectElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      setter?.call(select, 'b')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
