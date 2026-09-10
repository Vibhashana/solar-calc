import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const REQUIRED_TOKENS = [
  '--color-ground',
  '--color-sunken',
  '--color-surface',
  '--color-ink',
  '--color-ink-quiet',
  '--color-ink-faint',
  '--color-line',
  '--color-line-strong',
  '--color-control-line',
  '--color-accent',
  '--color-accent-strong',
  '--color-accent-ink',
  '--color-accent-soft',
  '--color-accent-line',
  '--color-caution',
  '--color-caution-ground',
  '--color-caution-line',
  '--color-danger',
  '--color-danger-soft',
  '--font-size-figure',
  '--font-size-heading',
  '--font-size-subheading',
  '--font-size-body',
  '--font-size-small',
  '--font-size-tiny',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-pill',
  '--shadow-sm',
  '--shadow-md',
  '--duration',
  '--ease-out',
  '--z-dropdown',
  '--z-sticky',
  '--z-modal',
  '--z-tooltip',
]

const css = readFileSync('src/styles/tokens.css', 'utf8')

const DARK_AT = css.indexOf('@media (prefers-color-scheme: dark)')

/**
 * The colour tokens in force under one scheme. Light is everything declared
 * before the dark media query; dark is the light set with the media query's
 * overrides applied, which is what the browser actually resolves.
 */
function palette(scheme: 'light' | 'dark'): Record<string, string> {
  const source = scheme === 'light' ? css.slice(0, DARK_AT) : css
  const found: Record<string, string> = {}
  for (const match of source.matchAll(/(--color-[a-z-]+):\s*(oklch\([^)]*\))/g)) {
    const [, name, value] = match
    if (name && value) found[name] = value
  }
  return found
}

/**
 * OKLCH to linear sRGB, per the Oklab specification. Linear channels are what
 * WCAG's relative luminance is defined over, so no gamma step is needed here.
 */
function linearRgb(colour: string): [number, number, number] {
  const match = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/.exec(colour)
  if (!match) throw new Error(`Not an oklch() colour: ${colour}`)
  const lightness = Number(match[1]) / 100
  const chroma = Number(match[2])
  const hue = (Number(match[3]) * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function contrast(foreground: string, background: string): number {
  const luminance = (colour: string) => {
    const [r, g, b] = linearRgb(colour)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}

/**
 * Every foreground/background pair the interface actually renders, with the
 * ratio it has to clear. 4.5 is WCAG AA for body text, 3 is AA for the border
 * of a control the user has to find. `--color-line` is absent on purpose: it
 * is a hairline between rows, never the only thing marking a control.
 */
const PAIRS: [foreground: string, background: string, minimum: number][] = [
  ['--color-ink', '--color-ground', 7],
  ['--color-ink', '--color-surface', 7],
  ['--color-ink', '--color-sunken', 7],
  ['--color-ink', '--color-accent-soft', 4.5],
  ['--color-ink-quiet', '--color-ground', 4.5],
  ['--color-ink-quiet', '--color-surface', 4.5],
  ['--color-ink-quiet', '--color-sunken', 4.5],
  ['--color-accent', '--color-ground', 4.5],
  ['--color-accent', '--color-surface', 4.5],
  ['--color-accent', '--color-accent-soft', 4.5],
  ['--color-accent-ink', '--color-accent', 4.5],
  ['--color-caution', '--color-caution-ground', 4.5],
  ['--color-ink', '--color-caution-ground', 4.5],
  ['--color-caution', '--color-surface', 4.5],
  ['--color-danger', '--color-surface', 4.5],
  ['--color-danger', '--color-danger-soft', 4.5],
  ['--color-control-line', '--color-surface', 3],
  ['--color-control-line', '--color-ground', 3],
  ['--color-accent-line', '--color-surface', 3],
  ['--color-accent-line', '--color-ground', 3],
]

describe('design tokens', () => {
  it('defines every token the components rely on', () => {
    for (const token of REQUIRED_TOKENS) {
      expect(css, token).toContain(`${token}:`)
    }
  })

  it('renders figures with tabular numerals', () => {
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })

  it('ships a dark scheme that redefines the whole colour set', () => {
    expect(DARK_AT).toBeGreaterThan(-1)
    const light = Object.keys(palette('light')).sort()
    const dark = Object.keys(palette('dark')).sort()
    expect(dark).toEqual(light)
  })

  it('honours a reduced-motion preference', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  for (const scheme of ['light', 'dark'] as const) {
    describe(`${scheme} scheme`, () => {
      const colours = palette(scheme)

      for (const [foreground, background, minimum] of PAIRS) {
        it(`renders ${foreground} on ${background} at ${minimum}:1 or better`, () => {
          const fg = colours[foreground]
          const bg = colours[background]
          expect(fg, foreground).toBeDefined()
          expect(bg, background).toBeDefined()
          expect(contrast(fg ?? '', bg ?? '')).toBeGreaterThanOrEqual(minimum)
        })
      }
    })
  }
})
