import { act, useState } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NumberField } from './NumberField'

function type(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('NumberField', () => {
  it('reports the value the user typed', () => {
    const onChange = vi.fn()
    render(<NumberField id="bill" label="Monthly units" value={200} min={0} max={5000} unit="kWh" onChange={onChange} />)
    type(screen.getByLabelText(/Monthly units/) as HTMLInputElement, '350')
    expect(onChange).toHaveBeenCalledWith(350)
  })

  it('clamps above the maximum and says so', () => {
    const onChange = vi.fn()
    render(<NumberField id="bill" label="Monthly units" value={200} min={0} max={5000} unit="kWh" onChange={onChange} />)
    type(screen.getByLabelText(/Monthly units/) as HTMLInputElement, '99999')
    expect(onChange).toHaveBeenCalledWith(5000)
    expect(screen.getByRole('status').textContent).toMatch(/5,?000/)
  })

  it('clamps below the minimum', () => {
    const onChange = vi.fn()
    render(<NumberField id="bill" label="Monthly units" value={200} min={0} max={5000} onChange={onChange} />)
    type(screen.getByLabelText(/Monthly units/) as HTMLInputElement, '-40')
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('ignores input that is not a number rather than reporting NaN', () => {
    const onChange = vi.fn()
    render(<NumberField id="bill" label="Monthly units" value={200} min={0} max={5000} onChange={onChange} />)
    type(screen.getByLabelText(/Monthly units/) as HTMLInputElement, 'abc')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows no clamp note when the value is in range', () => {
    render(<NumberField id="bill" label="Monthly units" value={200} min={0} max={5000} onChange={vi.fn()} />)
    type(screen.getByLabelText(/Monthly units/) as HTMLInputElement, '250')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('clears a stale clamp note when the value prop changes for a reason other than its own onChange', () => {
    function Harness() {
      const [value, setValue] = useState(200)
      return (
        <>
          <NumberField id="bill" label="Monthly units" value={value} min={0} max={5000} unit="kWh" onChange={setValue} />
          <button type="button" onClick={() => setValue(3)}>
            jump
          </button>
        </>
      )
    }
    render(<Harness />)
    type(screen.getByLabelText(/Monthly units/) as HTMLInputElement, '99999')
    // The parent echoes the field's own clamped value straight back (a controlled
    // component pattern) — that must not be mistaken for an external change.
    expect(screen.getByRole('status').textContent).toMatch(/5,?000/)

    act(() => {
      screen.getByRole('button', { name: /jump/ }).click()
    })
    // Now the value changed to something the field never reported itself.
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('clears a stale clamp note when the field is emptied', () => {
    const onChange = vi.fn()
    render(<NumberField id="bill" label="Monthly units" value={200} min={0} max={5000} unit="kWh" onChange={onChange} />)
    const input = screen.getByLabelText(/Monthly units/) as HTMLInputElement
    type(input, '99999')
    expect(screen.getByRole('status')).toBeDefined()
    type(input, '')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
