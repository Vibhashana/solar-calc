import { describe, expect, it } from 'vitest'
import { formatFigure } from './format'

describe('formatFigure', () => {
  it('leaves whole numbers whole', () => {
    expect(formatFigure(6)).toBe('6')
    expect(formatFigure(0)).toBe('0')
  })

  it('groups thousands', () => {
    expect(formatFigure(1500)).toBe('1,500')
    expect(formatFigure(12000)).toBe('12,000')
  })

  it('shows at most two decimals', () => {
    expect(formatFigure(2.2449)).toBe('2.24')
    expect(formatFigure(4.95)).toBe('4.95')
    expect(formatFigure(1.1)).toBe('1.1')
  })

  it('does not render a negative zero', () => {
    expect(formatFigure(-0)).toBe('0')
  })
})
