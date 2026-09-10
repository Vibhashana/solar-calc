import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceList } from './ChoiceList'

const CHOICES = [
  { value: 'bill' as const, label: 'I have my bill', description: 'Quickest' },
  { value: 'appliances' as const, label: 'Let me list my appliances' },
]

describe('ChoiceList', () => {
  it('renders every choice as a radio in a labelled group', () => {
    render(<ChoiceList legend="Your usage" choices={CHOICES} value="bill" onChange={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Your usage' })).toBeDefined()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect((screen.getByRole('radio', { name: /I have my bill/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('reports the chosen value', () => {
    const onChange = vi.fn()
    render(<ChoiceList legend="Your usage" choices={CHOICES} value="bill" onChange={onChange} />)
    act(() => {
      screen.getByRole('radio', { name: /list my appliances/ }).click()
    })
    expect(onChange).toHaveBeenCalledWith('appliances')
  })
})
