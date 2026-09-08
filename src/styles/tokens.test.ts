import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const REQUIRED_TOKENS = [
  '--color-ground',
  '--color-surface',
  '--color-ink',
  '--color-ink-quiet',
  '--color-line',
  '--color-accent',
  '--color-accent-ink',
  '--color-caution',
  '--color-caution-ground',
  '--font-size-figure',
  '--font-size-heading',
  '--font-size-body',
  '--font-size-small',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--radius-sm',
  '--radius-lg',
]

describe('design tokens', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8')

  it('defines every token the components rely on', () => {
    for (const token of REQUIRED_TOKENS) {
      expect(css, token).toContain(`${token}:`)
    }
  })

  it('renders figures with tabular numerals', () => {
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })
})
