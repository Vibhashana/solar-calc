# Solar Calculator Phase 2 — UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interface that turns the Phase 1 sizing engine into a tool a Sri Lankan beginner can finish unaided — a five-screen wizard, a live-editing results page, plain-language explanations for every number, and a shareable URL.

**Architecture:** One reducer holds the engine's own `SystemInputs` plus `view`, `step` and a `touched` set; `sizeSystem` runs in a `useMemo` on every change because it is pure and cheap. A small set of input primitives (`ChoiceList`, `NumberField`, `SelectField`) is composed at full size by the wizard and compactly by the sidebar, so clamping, glossary annotation and validation display are written once. Styling is CSS custom properties in one global stylesheet plus co-located `*.module.css` files. The URL is the only persistence.

**Tech Stack:** Vite, React 18, TypeScript (strict), Vitest, @testing-library/react. No new dependencies of any kind.

**Spec:** `docs/superpowers/specs/2026-09-08-solar-calc-phase-2-ui-design.md`, which extends the parent design `docs/superpowers/specs/2026-09-08-solar-calc-design.md`. Read both. Where they disagree, the parent wins.

## Global Constraints

These apply to every task below without being repeated.

- **No new dependencies, runtime or dev.** Runtime stays `react` and `react-dom`. No chart library, no state library, no router, no UI kit, no CSS framework, no popover/floating library, no test-data generator. CSS Modules and `import.meta.env` are native to Vite and need nothing installed.
- **No `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.** The URL is the only persistence. Task 15 adds a test that enforces this across all of `src`.
- **Import direction.** `src/engine/**` and `src/data/**` must not import `react`, `src/ui/**`, or `src/state/**`. `src/state/**` may import `src/engine/**` and `src/data/**`, and must not import `react` or `src/ui/**`. `src/ui/**` may import anything. Task 15 extends the existing test in `src/engine/architecture.test.ts`.
- **TypeScript `strict: true`, plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.** No `any`, no non-null assertions (`!`), no `@ts-ignore`. `noUncheckedIndexedAccess` means every array index yields `T | undefined` — `STEPS[state.step]` does not type-check without a fallback. Expect this and write `?? FALLBACK` rather than reaching for `!`.
- **The UI introduces no parallel input type.** It reads and writes the engine's `SystemInputs` from `src/engine/types.ts`. No duplicated shape, no bare-number escape hatch.
- **Copy is written for someone who has never installed a solar panel.** No unexplained jargon anywhere in the interface. Any term a beginner would not know is wrapped in `<Term>`, which is backed by `src/data/glossary.ts`.
- **Units are metric**, matching the engine: kWh, kW, W, V, A, mm², m², °C. Currency, when it arrives in Phase 3, is LKR.
- **Tests never assert on CSS Module class names.** Vitest does not process CSS by default, so class values are placeholders. Query by role, label, and text.
- **Every commit message ends with:**
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01KvW8FpSxYqbmDc7zVFxbLX
  ```

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/styles/tokens.css` | Custom properties and the base reset. The only global stylesheet |
| `src/vite-env.d.ts` | Vite client types, which is what makes `*.module.css` imports type-check |
| `src/data/glossary.ts` | Term id → plain definition. Data, not UI: no React import |
| `src/state/appState.ts` | `AppState`, `Action`, `initialState`, `reducer` |
| `src/state/url.ts` | `encodeInputs` / `decodeInputs` |
| `src/ui/format.ts` | `formatFigure` — how a number is rendered on screen |
| `src/ui/primitives/*.tsx` | `NumberField`, `SelectField`, `ChoiceList`, `NotSure`, `Term`, `WhyThisNumber` |
| `src/ui/wizard/*.tsx` | `Wizard` and its four step components |
| `src/ui/results/*.tsx` | `Results`, `SystemCard`, `Warnings`, `ShowTheMaths`, `InputSidebar` |
| `src/ui/ErrorBoundary.tsx` | Catches a throw from `sizeSystem` and offers a way back |

**Modified:** `src/App.tsx` (becomes the wiring: reducer, engine memo, URL sync, view routing), `src/main.tsx` (imports `tokens.css`), `src/engine/architecture.test.ts` (boundary and storage rules).

**Deleted:** `src/ui/DesignDump.tsx` and `src/ui/DesignDump.test.tsx`, in Task 15, once the results page replaces them.

---

### Task 1: Visual foundation

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/vite-env.d.ts`
- Create: `src/styles/tokens.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: the custom properties every later `*.module.css` uses. Later tasks must reference these names and never hard-code a colour, a font size, or a spacing value.

The token names are a contract between fifteen stylesheets written at different times, so the test pins them. It is a cheap guard against a later task inventing `--color-warning` when the token is `--color-caution`.

- [ ] **Step 1: Write the failing test**

```ts
// src/styles/tokens.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open 'src/styles/tokens.css'`

- [ ] **Step 3: Write the stylesheet and the Vite types**

```css
/* src/styles/tokens.css */
:root {
  --color-ground: #faf9f6;
  --color-surface: #ffffff;
  --color-ink: #1a1a18;
  --color-ink-quiet: #5c5c56;
  --color-line: #e2e0d8;
  --color-accent: #1f6f5c;
  --color-accent-ink: #ffffff;
  --color-caution: #8a5a00;
  --color-caution-ground: #fdf6e6;

  --font-size-figure: 2.25rem;
  --font-size-heading: 1.375rem;
  --font-size-body: 1rem;
  --font-size-small: 0.875rem;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 40px;

  --radius-sm: 4px;
  --radius-lg: 10px;

  --measure: 34rem;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-ground);
  color: var(--color-ink);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--font-size-body);
  line-height: 1.55;
}

/* Every figure on the page is a number the user compares against another
   number, so digits must not shift width between renders. */
.figure,
output,
td,
input[type='number'] {
  font-variant-numeric: tabular-nums;
}

button {
  font: inherit;
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
```

Add the import as the first line of `src/main.tsx`:

```tsx
import './styles/tokens.css'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: PASS (2)

- [ ] **Step 5: Verify the whole suite and the build still pass**

Run: `npm test && npm run build`
Expected: 135 tests pass, build succeeds. If `*.module.css` imports later fail to type-check, `src/vite-env.d.ts` is missing or `tsconfig.json` does not include it.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/vite-env.d.ts src/main.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add design tokens and pin the token contract

Fifteen stylesheets will reference these names over the course of Phase 2.
The test exists so a later component cannot quietly invent a near-miss
token name and half-style itself.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KvW8FpSxYqbmDc7zVFxbLX
EOF
)"
```

---

### Task 2: Glossary and the `Term` primitive

**Files:**
- Create: `src/data/glossary.ts`
- Create: `src/data/glossary.test.ts`
- Create: `src/ui/primitives/Term.tsx`
- Create: `src/ui/primitives/Term.module.css`
- Create: `src/ui/primitives/Term.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces:
  ```ts
  export interface GlossaryEntry { term: string; definition: string }
  export const GLOSSARY: Record<string, GlossaryEntry>  // literal object, `as const`-typed keys
  export type TermId = keyof typeof GLOSSARY
  export function Term(props: { id: TermId; children?: ReactNode }): JSX.Element
  ```
  `TermId` being derived from the object is the whole point: `<Term id="mpt">` is a compile error, not a runtime blank.

- [ ] **Step 1: Write the failing tests**

```ts
// src/data/glossary.test.ts
import { describe, expect, it } from 'vitest'
import { GLOSSARY } from './glossary'

describe('glossary', () => {
  const entries = Object.entries(GLOSSARY)

  it('covers the jargon the interface uses', () => {
    for (const id of ['mppt', 'pwm', 'peak-sun-hours', 'depth-of-discharge', 'autonomy', 'bus-voltage', 'surge', 'voc', 'derate', 'inverter', 'charge-controller', 'lifepo4']) {
      expect(Object.keys(GLOSSARY)).toContain(id)
    }
  })

  it('defines every term in plain language', () => {
    for (const [id, entry] of entries) {
      expect(entry.term.length, id).toBeGreaterThan(0)
      expect(entry.definition.length, id).toBeGreaterThan(20)
    }
  })

  it('never explains jargon with more jargon', () => {
    // A definition may name its own term, but may not lean on another
    // unexplained acronym to do the explaining.
    for (const [id, entry] of entries) {
      const others = Object.keys(GLOSSARY).filter((k) => k !== id)
      for (const other of others) {
        const acronym = GLOSSARY[other]?.term ?? ''
        if (acronym.length <= 4 && acronym === acronym.toUpperCase()) {
          expect(entry.definition, `${id} leans on ${acronym}`).not.toContain(acronym)
        }
      }
    }
  })
})
```

```tsx
// src/ui/primitives/Term.test.tsx
import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Term } from './Term'

function click(element: HTMLElement) {
  act(() => {
    element.click()
  })
}

describe('Term', () => {
  it('shows the term and hides the definition until asked', () => {
    render(<Term id="mppt" />)
    expect(screen.getByRole('button', { name: /MPPT/ })).toBeDefined()
    expect(screen.queryByText(/charge controller/i)).toBeNull()
  })

  it('reveals and hides the definition on click', () => {
    render(<Term id="mppt" />)
    const button = screen.getByRole('button', { name: /MPPT/ })
    expect(button.getAttribute('aria-expanded')).toBe('false')

    click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/more power out of the same panels/i)).toBeDefined()

    click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('lets the caller override the visible wording', () => {
    render(<Term id="peak-sun-hours">sun hours</Term>)
    expect(screen.getByRole('button', { name: /sun hours/ })).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/glossary.test.ts src/ui/primitives/Term.test.tsx`
Expected: FAIL — cannot resolve `./glossary` and `./Term`.

- [ ] **Step 3: Write the glossary**

```ts
// src/data/glossary.ts

/** Plain definitions for every term the interface is allowed to use. */
export interface GlossaryEntry {
  term: string
  definition: string
}

export const GLOSSARY = {
  mppt: {
    term: 'MPPT',
    definition:
      'A smarter type of controller that squeezes more power out of the same panels, especially on cloudy days and cold mornings. It costs more than the simple type and is worth it on all but the smallest systems.',
  },
  pwm: {
    term: 'PWM',
    definition:
      'The simple, cheaper type of controller. It works well when the panels and the battery are closely matched in voltage, and wastes power when they are not.',
  },
  'peak-sun-hours': {
    term: 'peak sun hours',
    definition:
      'A way of summing up a whole day of sunshine as a number of hours of strong, midday-quality sun. Four peak sun hours means the day produced as much energy as four hours of bright noon sun.',
  },
  'depth-of-discharge': {
    term: 'depth of discharge',
    definition:
      'How much of a battery you actually use before recharging it. Batteries last longer if you leave some in reserve, so the usable size is smaller than the size printed on the box.',
  },
  autonomy: {
    term: 'days of autonomy',
    definition:
      'How many days the battery should keep the house running with no useful sun at all. More days means a bigger, more expensive battery.',
  },
  'bus-voltage': {
    term: 'system voltage',
    definition:
      'The voltage the battery and the rest of the system run at. Bigger systems use a higher voltage so that the same power flows as less current, which allows thinner, cheaper cable.',
  },
  surge: {
    term: 'surge',
    definition:
      'The brief spike of power some appliances draw the moment they switch on. A fridge or a pump can pull several times its normal power for a second or two, and the inverter has to survive that.',
  },
  voc: {
    term: 'open-circuit voltage',
    definition:
      'The highest voltage a panel can produce, which happens on a cold morning before anything is drawing power. Equipment has to be rated above it or it can be damaged.',
  },
  derate: {
    term: 'losses',
    definition:
      'The gap between what panels produce in a laboratory and what they produce on your roof. Dust, heat, cable resistance and conversion losses all take a share.',
  },
  inverter: {
    term: 'inverter',
    definition:
      'The box that turns the low-voltage electricity from panels and batteries into the mains electricity your appliances expect.',
  },
  'charge-controller': {
    term: 'charge controller',
    definition:
      'The box between the panels and the battery. It decides how fast to charge and stops the battery being overfilled.',
  },
  lifepo4: {
    term: 'LiFePO4',
    definition:
      'The battery chemistry this tool sizes for. It lasts far longer than the older lead-acid type, tolerates being emptied further, and needs no topping up with water.',
  },
} as const satisfies Record<string, GlossaryEntry>

export type TermId = keyof typeof GLOSSARY
```

- [ ] **Step 4: Write the `Term` component**

```tsx
// src/ui/primitives/Term.tsx
import { useId, useState, type ReactNode } from 'react'
import { GLOSSARY, type TermId } from '../../data/glossary'
import styles from './Term.module.css'

interface TermProps {
  id: TermId
  /** Overrides the visible wording; the definition is unchanged. */
  children?: ReactNode
}

export function Term({ id, children }: TermProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const entry = GLOSSARY[id]

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span id={panelId} role="note" className={styles.panel}>
          {entry.definition}
        </span>
      )}
    </span>
  )
}
```

```css
/* src/ui/primitives/Term.module.css */
.wrapper {
  position: relative;
}

.trigger {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
  cursor: help;
}

.panel {
  display: block;
  margin: var(--space-2) 0;
  padding: var(--space-3);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
}
```

The definition renders inline in the flow rather than as a floating popover. That is deliberate: no positioning library, nothing that clips inside the mobile bottom sheet, and it reflows correctly at any width.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/data/glossary.test.ts src/ui/primitives/Term.test.tsx`
Expected: PASS (6)

- [ ] **Step 6: Commit**

```bash
git add src/data/glossary.ts src/data/glossary.test.ts src/ui/primitives
git commit -m "feat(ui): add glossary and the Term primitive"
```

---

### Task 3: Application state

**Files:**
- Create: `src/state/appState.ts`
- Create: `src/state/appState.test.ts`

**Interfaces:**
- Consumes: `SystemInputs`, `SystemType`, `ApplianceEntry` from `src/engine/types.ts`; `defaultInputs`, `DEFAULTS` from `src/engine/defaults.ts`; `findAppliance` from `src/data/appliances.ts`.
- Produces:
  ```ts
  export type View = 'wizard' | 'results'
  export type TouchedField = 'autonomyDays' | 'panelId'
  export const WIZARD_STEP_COUNT = 4
  export interface AppState { view: View; step: number; inputs: SystemInputs; touched: TouchedField[] }
  export type Action = /* the union below */
  export function initialState(restored?: SystemInputs | null): AppState
  export function reducer(state: AppState, action: Action): AppState
  ```

This file is plain TypeScript. It must not import `react` — `useReducer` takes the function, the function does not need React.

- [ ] **Step 1: Write the failing tests**

```ts
// src/state/appState.test.ts
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../engine/defaults'
import { initialState, reducer, type AppState } from './appState'

function wizardStart(): AppState {
  return initialState()
}

describe('initialState', () => {
  it('starts the wizard when nothing was restored', () => {
    const state = wizardStart()
    expect(state.view).toBe('wizard')
    expect(state.step).toBe(0)
    expect(state.touched).toEqual([])
  })

  it('opens straight to results when inputs were restored', () => {
    const restored = defaultInputs('hybrid', 'colombo')
    expect(initialState(restored).view).toBe('results')
  })

  it('marks a restored field touched when it differs from the default', () => {
    const restored = { ...defaultInputs('off-grid', 'kandy'), autonomyDays: 3 }
    expect(initialState(restored).touched).toContain('autonomyDays')
  })

  it('leaves a restored field untouched when it matches the default', () => {
    const restored = defaultInputs('off-grid', 'kandy') // autonomyDays === 2
    expect(initialState(restored).touched).not.toContain('autonomyDays')
  })
})

describe('navigation', () => {
  it('moves forward through the four question screens', () => {
    let state = wizardStart()
    for (const expected of [1, 2, 3]) {
      state = reducer(state, { type: 'next' })
      expect(state.step).toBe(expected)
      expect(state.view).toBe('wizard')
    }
  })

  it('lands on results from the last screen', () => {
    let state = { ...wizardStart(), step: 3 }
    state = reducer(state, { type: 'next' })
    expect(state.view).toBe('results')
  })

  it('goes back, and never before the first screen', () => {
    let state = { ...wizardStart(), step: 1 }
    state = reducer(state, { type: 'back' })
    expect(state.step).toBe(0)
    state = reducer(state, { type: 'back' })
    expect(state.step).toBe(0)
  })

  it('restarts into a clean wizard', () => {
    const dirty = reducer({ ...wizardStart(), view: 'results' }, { type: 'setBill', monthlyKwh: 700 })
    const state = reducer(dirty, { type: 'restart' })
    expect(state.view).toBe('wizard')
    expect(state.step).toBe(0)
    expect(state.inputs.load).toEqual(defaultInputs('hybrid', 'colombo').load)
  })
})

describe('the touched rule', () => {
  it('re-applies the autonomy default when system type changes and the user has not set it', () => {
    let state = wizardStart() // hybrid, autonomy 0.5
    state = reducer(state, { type: 'setSystemType', systemType: 'off-grid' })
    expect(state.inputs.autonomyDays).toBe(2)
  })

  it('keeps an autonomy the user chose when system type changes', () => {
    let state = reducer(wizardStart(), { type: 'setAutonomyDays', days: 3 })
    expect(state.touched).toContain('autonomyDays')
    state = reducer(state, { type: 'setSystemType', systemType: 'off-grid' })
    expect(state.inputs.autonomyDays).toBe(3)
  })

  it('keeps a panel the user chose when system type changes', () => {
    let state = reducer(wizardStart(), { type: 'setPanel', panelId: 'generic-330' })
    state = reducer(state, { type: 'setSystemType', systemType: 'grid-tied' })
    expect(state.inputs.panelId).toBe('generic-330')
  })
})

describe('the load fork', () => {
  it('switches to an empty appliance list', () => {
    const state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    expect(state.inputs.load).toEqual({ mode: 'appliances', entries: [] })
  })

  it('switches back to the bill with its default night share', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    state = reducer(state, { type: 'setLoadMode', mode: 'bill' })
    expect(state.inputs.load).toEqual({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 })
  })

  it('adds an appliance seeded from its own defaults', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    state = reducer(state, { type: 'addAppliance', applianceId: 'led-bulb' })
    expect(state.inputs.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 1, hoursPerDay: 5, usageWindow: 'night' }],
    })
  })

  it('ignores an unknown appliance rather than adding a broken row', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    const before = state.inputs.load
    state = reducer(state, { type: 'addAppliance', applianceId: 'flux-capacitor' })
    expect(state.inputs.load).toEqual(before)
  })

  it('updates and removes a row by index', () => {
    let state = reducer(wizardStart(), { type: 'setLoadMode', mode: 'appliances' })
    state = reducer(state, { type: 'addAppliance', applianceId: 'led-bulb' })
    state = reducer(state, { type: 'updateAppliance', index: 0, patch: { quantity: 6 } })
    expect(state.inputs.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 6, hoursPerDay: 5, usageWindow: 'night' }],
    })
    state = reducer(state, { type: 'removeAppliance', index: 0 })
    expect(state.inputs.load).toEqual({ mode: 'appliances', entries: [] })
  })

  it('ignores appliance edits while on the bill path', () => {
    const state = reducer(wizardStart(), { type: 'updateAppliance', index: 0, patch: { quantity: 6 } })
    expect(state.inputs.load).toEqual({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 })
  })
})

describe('purity', () => {
  it('never mutates the state it was given', () => {
    const before = wizardStart()
    const snapshot = structuredClone(before)
    reducer(before, { type: 'setBill', monthlyKwh: 999 })
    reducer(before, { type: 'setSystemType', systemType: 'off-grid' })
    expect(before).toEqual(snapshot)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/appState.test.ts`
Expected: FAIL — cannot resolve `./appState`.

- [ ] **Step 3: Write the reducer**

```ts
// src/state/appState.ts
import { findAppliance } from '../data/appliances'
import { DEFAULTS, defaultInputs } from '../engine/defaults'
import type { ApplianceEntry, SystemInputs, SystemType } from '../engine/types'

export type View = 'wizard' | 'results'
export type TouchedField = 'autonomyDays' | 'panelId'

export const WIZARD_STEP_COUNT = 4

export interface AppState {
  view: View
  step: number
  inputs: SystemInputs
  touched: TouchedField[]
}

export type Action =
  | { type: 'setSystemType'; systemType: SystemType }
  | { type: 'setDistrict'; districtId: string }
  | { type: 'setPshOverride'; psh: number | undefined }
  | { type: 'setLoadMode'; mode: 'bill' | 'appliances' }
  | { type: 'setBill'; monthlyKwh: number }
  | { type: 'setNightFraction'; fraction: number }
  | { type: 'addAppliance'; applianceId: string }
  | { type: 'updateAppliance'; index: number; patch: Partial<ApplianceEntry> }
  | { type: 'removeAppliance'; index: number }
  | { type: 'setAutonomyDays'; days: number }
  | { type: 'setPanel'; panelId: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'restart' }

const START = defaultInputs('hybrid', 'colombo')

function billLoad(): SystemInputs['load'] {
  return { mode: 'bill', monthlyKwh: START.load.mode === 'bill' ? START.load.monthlyKwh : 200, nightFraction: DEFAULTS.billNightFraction }
}

export function initialState(restored?: SystemInputs | null): AppState {
  if (!restored) {
    return { view: 'wizard', step: 0, inputs: START, touched: [] }
  }
  // A restored design carries no record of what the user typed, so infer it:
  // anything that differs from the default for its system type was chosen.
  const defaults = defaultInputs(restored.systemType, restored.districtId)
  const touched: TouchedField[] = []
  if (restored.autonomyDays !== defaults.autonomyDays) touched.push('autonomyDays')
  if (restored.panelId !== defaults.panelId) touched.push('panelId')
  return { view: 'results', step: WIZARD_STEP_COUNT - 1, inputs: restored, touched }
}

function touch(state: AppState, field: TouchedField): TouchedField[] {
  return state.touched.includes(field) ? state.touched : [...state.touched, field]
}

function withInputs(state: AppState, inputs: SystemInputs): AppState {
  return { ...state, inputs }
}

function entriesOf(inputs: SystemInputs): ApplianceEntry[] | null {
  return inputs.load.mode === 'appliances' ? inputs.load.entries : null
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setSystemType': {
      const defaults = defaultInputs(action.systemType, state.inputs.districtId)
      return withInputs(state, {
        ...state.inputs,
        systemType: action.systemType,
        autonomyDays: state.touched.includes('autonomyDays') ? state.inputs.autonomyDays : defaults.autonomyDays,
        panelId: state.touched.includes('panelId') ? state.inputs.panelId : defaults.panelId,
      })
    }

    case 'setDistrict':
      return withInputs(state, { ...state.inputs, districtId: action.districtId })

    case 'setPshOverride':
      return withInputs(state, { ...state.inputs, pshOverride: action.psh })

    case 'setLoadMode':
      if (action.mode === state.inputs.load.mode) return state
      return withInputs(state, {
        ...state.inputs,
        load: action.mode === 'bill' ? billLoad() : { mode: 'appliances', entries: [] },
      })

    case 'setBill':
      if (state.inputs.load.mode !== 'bill') return state
      return withInputs(state, { ...state.inputs, load: { ...state.inputs.load, monthlyKwh: action.monthlyKwh } })

    case 'setNightFraction':
      if (state.inputs.load.mode !== 'bill') return state
      return withInputs(state, { ...state.inputs, load: { ...state.inputs.load, nightFraction: action.fraction } })

    case 'addAppliance': {
      const entries = entriesOf(state.inputs)
      const appliance = findAppliance(action.applianceId)
      if (!entries || !appliance) return state
      const entry: ApplianceEntry = {
        applianceId: appliance.id,
        quantity: 1,
        hoursPerDay: appliance.defaultHoursPerDay,
        usageWindow: appliance.defaultUsageWindow,
      }
      return withInputs(state, { ...state.inputs, load: { mode: 'appliances', entries: [...entries, entry] } })
    }

    case 'updateAppliance': {
      const entries = entriesOf(state.inputs)
      const current = entries?.[action.index]
      if (!entries || !current) return state
      const next = entries.map((entry, i) => (i === action.index ? { ...entry, ...action.patch } : entry))
      return withInputs(state, { ...state.inputs, load: { mode: 'appliances', entries: next } })
    }

    case 'removeAppliance': {
      const entries = entriesOf(state.inputs)
      if (!entries) return state
      return withInputs(state, {
        ...state.inputs,
        load: { mode: 'appliances', entries: entries.filter((_, i) => i !== action.index) },
      })
    }

    case 'setAutonomyDays':
      return { ...withInputs(state, { ...state.inputs, autonomyDays: action.days }), touched: touch(state, 'autonomyDays') }

    case 'setPanel':
      return { ...withInputs(state, { ...state.inputs, panelId: action.panelId }), touched: touch(state, 'panelId') }

    case 'next':
      if (state.step >= WIZARD_STEP_COUNT - 1) return { ...state, view: 'results' }
      return { ...state, step: state.step + 1 }

    case 'back':
      return { ...state, step: Math.max(0, state.step - 1) }

    case 'restart':
      return initialState()
  }
}
```

The switch has no `default` case on purpose: `Action` is a closed union, so if a later task adds a variant and forgets to handle it, the function stops returning `AppState` on every path and TypeScript rejects it. A `default` would silence exactly the error worth having.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/appState.test.ts`
Expected: PASS (17)

- [ ] **Step 5: Commit**

```bash
git add src/state/appState.ts src/state/appState.test.ts
git commit -m "feat(state): add the app reducer with the touched-field rule"
```

---

### Task 4: URL codec

**Files:**
- Create: `src/state/url.ts`
- Create: `src/state/url.test.ts`

**Interfaces:**
- Consumes: `SystemInputs` from `src/engine/types.ts`; `defaultInputs`, `DEFAULTS` from `src/engine/defaults.ts`; `findDistrict`, `findPanel`, `findBatteryModule`, `findAppliance` from the data modules.
- Produces:
  ```ts
  export function encodeInputs(inputs: SystemInputs): string   // "t=hybrid&d=colombo&l=b&kwh=250&nf=0.6&a=0.5&p=generic-550&b=lfp-51v-100ah"
  export function decodeInputs(query: string): SystemInputs | null
  ```

The codec covers the user-editable subset: system type, district, PSH override, load, autonomy, panel, battery module. `diversityFactor`, `derate` and `minAmbientC` are not editable in Phase 2, so they are not encoded and decode restores them from `defaultInputs`. State that in a comment — a reader who does not know it will read the round-trip test as incomplete.

- [ ] **Step 1: Write the failing tests**

```ts
// src/state/url.test.ts
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../engine/defaults'
import type { SystemInputs, SystemType } from '../engine/types'
import { decodeInputs, encodeInputs } from './url'

const TYPES: SystemType[] = ['off-grid', 'hybrid', 'grid-tied']
const DISTRICTS = ['colombo', 'kandy', 'jaffna', 'nuwara-eliya']
const PANELS = ['generic-450', 'generic-550', 'generic-600', 'generic-330']

/** Deterministic pseudo-random generator, so a failure is reproducible. */
function makeRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

function generateInputs(random: () => number): SystemInputs {
  const pick = <T,>(list: T[], fallback: T): T => list[Math.floor(random() * list.length)] ?? fallback
  const systemType = pick(TYPES, 'hybrid')
  const districtId = pick(DISTRICTS, 'colombo')
  const base = defaultInputs(systemType, districtId)
  const useAppliances = random() < 0.5
  return {
    ...base,
    pshOverride: random() < 0.3 ? Math.round(random() * 600) / 100 : undefined,
    autonomyDays: Math.round(random() * 10) / 2,
    panelId: pick(PANELS, 'generic-550'),
    load: useAppliances
      ? {
          mode: 'appliances',
          entries: [
            { applianceId: 'led-bulb', quantity: 1 + Math.floor(random() * 20), hoursPerDay: Math.round(random() * 240) / 10, usageWindow: 'night' },
            { applianceId: 'ceiling-fan', quantity: 1 + Math.floor(random() * 5), hoursPerDay: Math.round(random() * 240) / 10, usageWindow: 'both' },
          ],
        }
      : { mode: 'bill', monthlyKwh: Math.round(random() * 5000), nightFraction: Math.round(random() * 100) / 100 },
  }
}

describe('round trip', () => {
  it('survives 200 generated designs unchanged', () => {
    const random = makeRandom(20260908)
    for (let i = 0; i < 200; i += 1) {
      const inputs = generateInputs(random)
      expect(decodeInputs(encodeInputs(inputs)), `case ${i}`).toEqual(inputs)
    }
  })

  it('produces a query with no JSON blob in it', () => {
    const encoded = encodeInputs(defaultInputs('hybrid', 'colombo'))
    expect(encoded).not.toContain('{')
    expect(encoded).toContain('t=hybrid')
    expect(encoded).toContain('d=colombo')
  })
})

describe('decoding is total', () => {
  it('returns null when the query is empty', () => {
    expect(decodeInputs('')).toBeNull()
    expect(decodeInputs('?')).toBeNull()
  })

  it('returns null when the system type is missing or unknown', () => {
    expect(decodeInputs('d=colombo')).toBeNull()
    expect(decodeInputs('t=underwater&d=colombo')).toBeNull()
  })

  it('returns null when the district is missing or unknown', () => {
    expect(decodeInputs('t=hybrid')).toBeNull()
    expect(decodeInputs('t=hybrid&d=atlantis')).toBeNull()
  })

  it('falls back to defaults for every other unusable field', () => {
    const decoded = decodeInputs('t=off-grid&d=kandy&kwh=lots&a=NaN&p=unobtainium&nf=9')
    expect(decoded).not.toBeNull()
    const defaults = defaultInputs('off-grid', 'kandy')
    expect(decoded?.autonomyDays).toBe(defaults.autonomyDays)
    expect(decoded?.panelId).toBe(defaults.panelId)
    expect(decoded?.load).toEqual(defaults.load)
  })

  it('drops unknown appliances but keeps the rest of the list', () => {
    const decoded = decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:4:5:night,flux-capacitor:1:1:day')
    expect(decoded?.load).toEqual({
      mode: 'appliances',
      entries: [{ applianceId: 'led-bulb', quantity: 4, hoursPerDay: 5, usageWindow: 'night' }],
    })
  })

  it('survives a truncated appliance list without throwing', () => {
    expect(() => decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:4')).not.toThrow()
    expect(decodeInputs('t=off-grid&d=kandy&l=a&ap=led-bulb:4')?.load).toEqual({ mode: 'appliances', entries: [] })
  })

  it('never throws on hostile input', () => {
    for (const query of ['t=%%%', 't=hybrid&d=colombo&ap=' + '::::'.repeat(500), 't=hybrid&d=colombo&kwh=' + '9'.repeat(400), 'a=&b=&c=']) {
      expect(() => decodeInputs(query), query.slice(0, 20)).not.toThrow()
    }
  })

  it('restores the fields it does not encode from defaults', () => {
    const decoded = decodeInputs('t=hybrid&d=colombo')
    const defaults = defaultInputs('hybrid', 'colombo')
    expect(decoded?.derate).toEqual(defaults.derate)
    expect(decoded?.diversityFactor).toBe(defaults.diversityFactor)
    expect(decoded?.minAmbientC).toBe(defaults.minAmbientC)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/url.test.ts`
Expected: FAIL — cannot resolve `./url`.

- [ ] **Step 3: Write the codec**

```ts
// src/state/url.ts
import { findAppliance } from '../data/appliances'
import { findBatteryModule, findPanel } from '../data/components'
import { findDistrict } from '../data/psh'
import { defaultInputs } from '../engine/defaults'
import type { ApplianceEntry, SystemInputs, SystemType, UsageWindow } from '../engine/types'

/**
 * Only the fields the interface lets a user change are encoded. Derate,
 * diversity factor and minimum ambient temperature are fixed in Phase 2, so
 * decoding restores them from `defaultInputs` rather than trusting the query.
 */

const SYSTEM_TYPES: SystemType[] = ['off-grid', 'hybrid', 'grid-tied']
const USAGE_WINDOWS: UsageWindow[] = ['day', 'night', 'both']

function isSystemType(value: string): value is SystemType {
  return (SYSTEM_TYPES as string[]).includes(value)
}

function isUsageWindow(value: string): value is UsageWindow {
  return (USAGE_WINDOWS as string[]).includes(value)
}

/** A finite number, or undefined. Rejects '', 'NaN', 'Infinity' and prose. */
function num(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export function encodeInputs(inputs: SystemInputs): string {
  const params = new URLSearchParams()
  params.set('t', inputs.systemType)
  params.set('d', inputs.districtId)
  if (inputs.pshOverride !== undefined) params.set('psh', String(inputs.pshOverride))
  params.set('a', String(inputs.autonomyDays))
  params.set('p', inputs.panelId)
  params.set('b', inputs.batteryModuleId)

  if (inputs.load.mode === 'bill') {
    params.set('l', 'b')
    params.set('kwh', String(inputs.load.monthlyKwh))
    params.set('nf', String(inputs.load.nightFraction))
  } else {
    params.set('l', 'a')
    params.set(
      'ap',
      inputs.load.entries.map((e) => `${e.applianceId}:${e.quantity}:${e.hoursPerDay}:${e.usageWindow}`).join(','),
    )
  }

  return params.toString()
}

function decodeEntries(raw: string | null): ApplianceEntry[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((chunk): ApplianceEntry | null => {
      const [applianceId, quantity, hours, window] = chunk.split(':')
      if (!applianceId || !findAppliance(applianceId)) return null
      const q = num(quantity ?? null)
      const h = num(hours ?? null)
      if (q === undefined || h === undefined || !window || !isUsageWindow(window)) return null
      return { applianceId, quantity: q, hoursPerDay: h, usageWindow: window }
    })
    .filter((entry): entry is ApplianceEntry => entry !== null)
}

export function decodeInputs(query: string): SystemInputs | null {
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)

  const type = params.get('t')
  const district = params.get('d')
  if (!type || !isSystemType(type)) return null
  if (!district || !findDistrict(district)) return null

  const defaults = defaultInputs(type, district)
  const panelId = params.get('p')
  const batteryModuleId = params.get('b')
  const autonomy = num(params.get('a'))
  const psh = num(params.get('psh'))
  const nightFraction = num(params.get('nf'))
  const monthlyKwh = num(params.get('kwh'))

  const load: SystemInputs['load'] =
    params.get('l') === 'a'
      ? { mode: 'appliances', entries: decodeEntries(params.get('ap')) }
      : monthlyKwh === undefined
        ? defaults.load
        : {
            mode: 'bill',
            monthlyKwh,
            nightFraction: nightFraction !== undefined && nightFraction >= 0 && nightFraction <= 1 ? nightFraction : 0.6,
          }

  return {
    ...defaults,
    pshOverride: psh,
    autonomyDays: autonomy ?? defaults.autonomyDays,
    panelId: panelId && findPanel(panelId) ? panelId : defaults.panelId,
    batteryModuleId: batteryModuleId && findBatteryModule(batteryModuleId) ? batteryModuleId : defaults.batteryModuleId,
    load,
  }
}
```

Note the `nf=9` case in the tests: a night fraction outside 0–1 is not a number the engine can use, so it falls back to the documented default rather than being passed through.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/url.test.ts`
Expected: PASS (10)

If the round-trip test fails on a `bill` case where `monthlyKwh` is `0`, check `num()` — `Number('0')` is falsy but valid, and a `!value` guard would break it. The implementation above uses `=== undefined` for exactly this reason.

- [ ] **Step 5: Commit**

```bash
git add src/state/url.ts src/state/url.test.ts
git commit -m "feat(state): encode and decode a design in the URL"
```

---

### Task 5: Input primitives

**Files:**
- Create: `src/ui/primitives/NumberField.tsx`, `SelectField.tsx`, `ChoiceList.tsx`, `NotSure.tsx`
- Create: `src/ui/primitives/fields.module.css` (shared by all four)
- Create: `src/ui/primitives/NumberField.test.tsx`, `ChoiceList.test.tsx`, `NotSure.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces:
  ```ts
  export function NumberField(props: {
    id: string; label: ReactNode; value: number; min: number; max: number
    step?: number; unit?: string; hint?: ReactNode; size?: 'full' | 'compact'
    clampNote?: (clampedTo: number, bound: 'min' | 'max') => string
    onChange: (value: number) => void
  }): JSX.Element

  export function SelectField(props: {
    id: string; label: ReactNode; value: string; hint?: ReactNode; size?: 'full' | 'compact'
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }): JSX.Element

  export function ChoiceList<T extends string>(props: {
    legend: ReactNode; value: T; size?: 'full' | 'compact'
    choices: { value: T; label: string; description?: ReactNode }[]
    onChange: (value: T) => void
  }): JSX.Element

  export function NotSure(props: { children: ReactNode }): JSX.Element
  ```

`size` is the only concession the primitives make to their two hosts: `'full'` for a wizard screen, `'compact'` for a sidebar row. It changes spacing and type size, nothing structural.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/primitives/NumberField.test.tsx
import { act } from 'react'
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
})
```

```tsx
// src/ui/primitives/ChoiceList.test.tsx
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
```

```tsx
// src/ui/primitives/NotSure.test.tsx
import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotSure } from './NotSure'

describe('NotSure', () => {
  it('hides its help until opened', () => {
    render(<NotSure>Pick hybrid if the power cuts often.</NotSure>)
    const summary = screen.getByText('Not sure?')
    expect(screen.getByText(/Pick hybrid/).closest('details')?.open).toBe(false)
    act(() => {
      summary.click()
    })
    expect(screen.getByText(/Pick hybrid/).closest('details')?.open).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/primitives`
Expected: FAIL — cannot resolve `./NumberField`, `./ChoiceList`, `./NotSure`.

- [ ] **Step 3: Write the primitives**

```tsx
// src/ui/primitives/NumberField.tsx
import { useState, type ReactNode } from 'react'
import styles from './fields.module.css'

interface NumberFieldProps {
  id: string
  label: ReactNode
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  hint?: ReactNode
  size?: 'full' | 'compact'
  clampNote?: (clampedTo: number, bound: 'min' | 'max') => string
  onChange: (value: number) => void
}

function defaultClampNote(clampedTo: number, bound: 'min' | 'max', unit?: string) {
  const shown = `${clampedTo.toLocaleString('en-GB')}${unit ? ` ${unit}` : ''}`
  return bound === 'max'
    ? `That is higher than this tool plans for, so it is using ${shown}.`
    : `That is lower than this tool plans for, so it is using ${shown}.`
}

export function NumberField({ id, label, value, min, max, step, unit, hint, size = 'full', clampNote, onChange }: NumberFieldProps) {
  const [note, setNote] = useState<string | null>(null)

  function handle(raw: string) {
    if (raw.trim() === '') return
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return

    const clamped = Math.min(max, Math.max(min, parsed))
    if (clamped !== parsed) {
      const bound = parsed > max ? 'max' : 'min'
      setNote(clampNote ? clampNote(clamped, bound) : defaultClampNote(clamped, bound, unit))
    } else {
      setNote(null)
    }
    onChange(clamped)
  }

  return (
    <div className={size === 'compact' ? styles.fieldCompact : styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <span className={styles.inputRow}>
        <input
          id={id}
          className={styles.input}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => handle(event.target.value)}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
    </div>
  )
}
```

```tsx
// src/ui/primitives/SelectField.tsx
import type { ReactNode } from 'react'
import styles from './fields.module.css'

interface SelectFieldProps {
  id: string
  label: ReactNode
  value: string
  hint?: ReactNode
  size?: 'full' | 'compact'
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export function SelectField({ id, label, value, hint, size = 'full', options, onChange }: SelectFieldProps) {
  return (
    <div className={size === 'compact' ? styles.fieldCompact : styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

```tsx
// src/ui/primitives/ChoiceList.tsx
import { useId, type ReactNode } from 'react'
import styles from './fields.module.css'

interface Choice<T extends string> {
  value: T
  label: string
  description?: ReactNode
}

interface ChoiceListProps<T extends string> {
  legend: ReactNode
  value: T
  size?: 'full' | 'compact'
  choices: Choice<T>[]
  onChange: (value: T) => void
}

export function ChoiceList<T extends string>({ legend, value, size = 'full', choices, onChange }: ChoiceListProps<T>) {
  const name = useId()
  return (
    <fieldset className={size === 'compact' ? styles.choicesCompact : styles.choices}>
      <legend className={styles.legend}>{legend}</legend>
      {choices.map((choice) => (
        <label key={choice.value} className={styles.choice}>
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={choice.value === value}
            onChange={() => onChange(choice.value)}
          />
          <span>
            <span className={styles.choiceLabel}>{choice.label}</span>
            {choice.description && <span className={styles.choiceDescription}>{choice.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
```

```tsx
// src/ui/primitives/NotSure.tsx
import type { ReactNode } from 'react'
import styles from './fields.module.css'

/** The help disclosure that parent §7.1 requires on every wizard screen. */
export function NotSure({ children }: { children: ReactNode }) {
  return (
    <details className={styles.notSure}>
      <summary>Not sure?</summary>
      <div className={styles.notSureBody}>{children}</div>
    </details>
  )
}
```

```css
/* src/ui/primitives/fields.module.css */
.field {
  margin: 0 0 var(--space-4);
}

.fieldCompact {
  margin: 0 0 var(--space-3);
}

.label {
  display: block;
  font-weight: 600;
}

.hint {
  margin: var(--space-1) 0 var(--space-2);
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
}

.inputRow {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
}

.input,
.select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
}

.input {
  width: 8rem;
}

.select {
  width: 100%;
  max-width: var(--measure);
}

.unit {
  color: var(--color-ink-quiet);
}

.note {
  margin: var(--space-2) 0 0;
  color: var(--color-caution);
  font-size: var(--font-size-small);
}

.choices,
.choicesCompact {
  margin: 0 0 var(--space-4);
  padding: 0;
  border: 0;
}

.choicesCompact {
  margin-bottom: var(--space-3);
}

.legend {
  padding: 0;
  font-weight: 600;
}

.choice {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
}

.choiceLabel {
  display: block;
  font-weight: 600;
}

.choiceDescription {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
}

.notSure {
  margin: var(--space-3) 0 0;
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
}

.notSure > summary {
  cursor: pointer;
  color: var(--color-accent);
}

.notSureBody {
  max-width: var(--measure);
  margin-top: var(--space-2);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/primitives`
Expected: PASS (11, including Task 2's three `Term` tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/primitives
git commit -m "feat(ui): add input primitives with clamping notes"
```

---

### Task 6: Explanation disclosure and figure formatting

**Files:**
- Create: `src/ui/format.ts`, `src/ui/format.test.ts`
- Create: `src/ui/primitives/WhyThisNumber.tsx`, `WhyThisNumber.module.css`, `WhyThisNumber.test.tsx`

**Interfaces:**
- Consumes: `Sized<T>` from `src/engine/types.ts`.
- Produces:
  ```ts
  export function formatFigure(value: number): string      // 1234.5 -> "1,234.5"; 6 -> "6"; 2.2449 -> "2.24"
  export function WhyThisNumber(props: { field: Sized<unknown> }): JSX.Element
  ```

`WhyThisNumber` is the single place explanation text is rendered. No other component may read `field.explain` directly — one renderer means one place to fix when the wording rules change.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ui/format.test.ts
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
```

```tsx
// src/ui/primitives/WhyThisNumber.test.tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/format.test.ts src/ui/primitives/WhyThisNumber.test.tsx`
Expected: FAIL — cannot resolve `./format` and `./WhyThisNumber`.

- [ ] **Step 3: Write both**

```ts
// src/ui/format.ts

/**
 * How every figure on the page is rendered: grouped thousands, at most two
 * decimals, and no trailing zeros. The engine already rounds its explanation
 * text to two decimals; this keeps the headline figures consistent with it.
 */
export function formatFigure(value: number): string {
  const normalised = Object.is(value, -0) ? 0 : value
  return normalised.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}
```

```tsx
// src/ui/primitives/WhyThisNumber.tsx
import type { Sized } from '../../engine/types'
import styles from './WhyThisNumber.module.css'

/** The only component that renders explanation text. */
export function WhyThisNumber({ field }: { field: Sized<unknown> }) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Why this number?</summary>
      <div className={styles.body}>
        <p className={styles.plain}>{field.explain.plain}</p>
        <code className={styles.substituted}>{field.explain.substituted}</code>
        {field.explain.assumptions.length > 0 && (
          <ul className={styles.assumptions}>
            {field.explain.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}
```

```css
/* src/ui/primitives/WhyThisNumber.module.css */
.details {
  margin-top: var(--space-3);
  font-size: var(--font-size-small);
}

.summary {
  cursor: pointer;
  color: var(--color-accent);
}

.body {
  max-width: var(--measure);
  margin-top: var(--space-2);
}

.plain {
  margin: 0 0 var(--space-2);
  color: var(--color-ink);
  font-size: var(--font-size-body);
}

.substituted {
  display: block;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-ground);
  color: var(--color-ink-quiet);
  font-variant-numeric: tabular-nums;
  overflow-x: auto;
}

.assumptions {
  margin: var(--space-2) 0 0;
  padding-left: var(--space-4);
  color: var(--color-ink-quiet);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/format.test.ts src/ui/primitives/WhyThisNumber.test.tsx`
Expected: PASS (6)

- [ ] **Step 5: Commit**

```bash
git add src/ui/format.ts src/ui/format.test.ts src/ui/primitives/WhyThisNumber.tsx src/ui/primitives/WhyThisNumber.module.css src/ui/primitives/WhyThisNumber.test.tsx
git commit -m "feat(ui): add figure formatting and the explanation disclosure"
```

---

### Task 7: Wizard shell

**Files:**
- Create: `src/ui/wizard/Wizard.tsx`, `Wizard.module.css`, `Wizard.test.tsx`
- Create: `src/ui/wizard/steps.tsx` (`.tsx`, not `.ts` — it holds JSX)

**Interfaces:**
- Consumes: `AppState`, `Action`, `WIZARD_STEP_COUNT` from `src/state/appState.ts`.
- Produces:
  ```ts
  export interface StepProps { state: AppState; dispatch: Dispatch<Action> }
  export interface StepDefinition { id: string; title: string; Component: (props: StepProps) => JSX.Element }
  export const STEPS: StepDefinition[]        // in src/ui/wizard/steps.ts
  export function Wizard(props: StepProps): JSX.Element
  ```

Tasks 8–11 each replace one placeholder entry in `STEPS`. Build the shell against placeholders now so navigation is tested independently of any screen's content.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/wizard/Wizard.test.tsx
import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { Wizard } from './Wizard'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  if (state.view === 'results') return <p>Results view</p>
  return <Wizard state={state} dispatch={dispatch} />
}

function clickButton(name: RegExp) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

describe('Wizard', () => {
  it('opens on the first question with no way back', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('What are you building?')
    expect(screen.queryByRole('button', { name: /Back/ })).toBeNull()
  })

  it('reports progress on every screen', () => {
    render(<Harness />)
    expect(screen.getByText('Step 1 of 4')).toBeDefined()
    clickButton(/Next/)
    expect(screen.getByText('Step 2 of 4')).toBeDefined()
  })

  it('walks forward to results and back again', () => {
    render(<Harness />)
    clickButton(/Next/)
    clickButton(/Next/)
    clickButton(/Next/)
    expect(screen.getByRole('button', { name: /See my system/ })).toBeDefined()
    clickButton(/Back/)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Your usage')
  })

  it('finishes into the results view', () => {
    render(<Harness />)
    clickButton(/Next/)
    clickButton(/Next/)
    clickButton(/Next/)
    clickButton(/See my system/)
    expect(screen.getByText('Results view')).toBeDefined()
  })

  it('moves focus to the heading on every step change', () => {
    render(<Harness />)
    clickButton(/Next/)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/wizard/Wizard.test.tsx`
Expected: FAIL — cannot resolve `./Wizard`.

- [ ] **Step 3: Write the shell and placeholder steps**

```tsx
// src/ui/wizard/steps.tsx
import type { Dispatch } from 'react'
import type { Action, AppState } from '../../state/appState'

export interface StepProps {
  state: AppState
  dispatch: Dispatch<Action>
}

export interface StepDefinition {
  id: string
  title: string
  Component: (props: StepProps) => JSX.Element
}

// Tasks 8-11 replace each Component below with the real screen. The titles are
// final: the Wizard renders them as the page heading and focus target.
export const STEPS: StepDefinition[] = [
  { id: 'system-type', title: 'What are you building?', Component: () => <p /> },
  { id: 'location', title: 'Where are you?', Component: () => <p /> },
  { id: 'usage', title: 'Your usage', Component: () => <p /> },
  { id: 'preferences', title: 'Preferences', Component: () => <p /> },
]
```

```tsx
// src/ui/wizard/Wizard.tsx
import { useEffect, useRef } from 'react'
import { WIZARD_STEP_COUNT } from '../../state/appState'
import { STEPS, type StepProps } from './steps'
import styles from './Wizard.module.css'

export function Wizard({ state, dispatch }: StepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // noUncheckedIndexedAccess: the reducer clamps `step`, but the compiler
  // cannot know that, and a non-null assertion is banned.
  const step = STEPS[state.step] ?? STEPS[0]

  useEffect(() => {
    headingRef.current?.focus()
  }, [state.step])

  if (!step) return <p>No wizard steps are defined.</p>
  const isLast = state.step === WIZARD_STEP_COUNT - 1
  const Step = step.Component

  return (
    <section className={styles.wizard} aria-labelledby="wizard-heading">
      <p className={styles.progress}>
        Step {state.step + 1} of {WIZARD_STEP_COUNT}
      </p>
      <h2 id="wizard-heading" className={styles.heading} tabIndex={-1} ref={headingRef}>
        {step.title}
      </h2>

      <Step state={state} dispatch={dispatch} />

      <div className={styles.actions}>
        {state.step > 0 && (
          <button type="button" className={styles.secondary} onClick={() => dispatch({ type: 'back' })}>
            Back
          </button>
        )}
        <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'next' })}>
          {isLast ? 'See my system' : 'Next'}
        </button>
      </div>
    </section>
  )
}
```

```css
/* src/ui/wizard/Wizard.module.css */
.wizard {
  max-width: var(--measure);
  margin: 0 auto;
  padding: var(--space-5) var(--space-3);
}

.progress {
  margin: 0;
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.heading {
  margin: var(--space-2) 0 var(--space-4);
  font-size: var(--font-size-heading);
  line-height: 1.25;
}

.heading:focus {
  outline: none;
}

.actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.primary,
.secondary {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.primary {
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: var(--color-accent-ink);
}

.secondary {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink);
}
```

`.heading:focus { outline: none }` is safe here because the heading is only focusable programmatically (`tabIndex={-1}`); keyboard users still see `:focus-visible` outlines on every real control.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/wizard/Wizard.test.tsx`
Expected: PASS (5)

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard
git commit -m "feat(ui): add the wizard shell with focus management"
```

---

### Task 8: Screen 1 — what are you building?

**Files:**
- Create: `src/ui/wizard/StepSystemType.tsx`, `StepSystemType.test.tsx`
- Modify: `src/ui/wizard/steps.tsx`

**Interfaces:**
- Consumes: `StepProps` from `./steps`; `ChoiceList`, `NotSure` from Task 5; `Term` from Task 2.
- Produces: `export function StepSystemType(props: StepProps): JSX.Element`, wired into `STEPS[0]`.

Parent §7.1 requires a "Not sure?" path here that asks two questions — mains power, and whether it cuts often — and chooses for the user. That is a local `useState` inside the step, not reducer state: it is a conversational aid, not part of the design being computed.

The mapping: no mains → off-grid. Mains that cuts often → hybrid. Mains that is reliable → grid-tied.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/wizard/StepSystemType.test.tsx
import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { StepSystemType } from './StepSystemType'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  return (
    <>
      <StepSystemType state={state} dispatch={dispatch} />
      <p>Chosen: {state.inputs.systemType}</p>
      <p>Autonomy: {state.inputs.autonomyDays}</p>
    </>
  )
}

function click(name: RegExp | string) {
  act(() => {
    screen.getByRole(typeof name === 'string' ? 'button' : 'radio', { name }).click()
  })
}

describe('StepSystemType', () => {
  it('offers all three system types in plain language', () => {
    render(<Harness />)
    expect(screen.getByRole('radio', { name: /No mains electricity/ })).toBeDefined()
    expect(screen.getByRole('radio', { name: /Mains, but it cuts/ })).toBeDefined()
    expect(screen.getByRole('radio', { name: /Reliable mains/ })).toBeDefined()
  })

  it('records the choice and re-applies the matching autonomy default', () => {
    render(<Harness />)
    click(/No mains electricity/)
    expect(screen.getByText('Chosen: off-grid')).toBeDefined()
    expect(screen.getByText('Autonomy: 2')).toBeDefined()
  })

  it('chooses off-grid for someone with no mains power', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /No, there is no mains/ }).click()
    })
    expect(screen.getByText('Chosen: off-grid')).toBeDefined()
  })

  it('chooses hybrid when mains exists but cuts often', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /Yes, I have mains/ }).click()
    })
    act(() => {
      screen.getByRole('button', { name: /Yes, it cuts often/ }).click()
    })
    expect(screen.getByText('Chosen: hybrid')).toBeDefined()
  })

  it('chooses grid-tied when mains is reliable', () => {
    render(<Harness />)
    act(() => {
      screen.getByText('Not sure?').click()
    })
    act(() => {
      screen.getByRole('button', { name: /Yes, I have mains/ }).click()
    })
    act(() => {
      screen.getByRole('button', { name: /No, it is reliable/ }).click()
    })
    expect(screen.getByText('Chosen: grid-tied')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/wizard/StepSystemType.test.tsx`
Expected: FAIL — cannot resolve `./StepSystemType`.

- [ ] **Step 3: Write the screen**

```tsx
// src/ui/wizard/StepSystemType.tsx
import { useState } from 'react'
import { ChoiceList } from '../primitives/ChoiceList'
import { NotSure } from '../primitives/NotSure'
import type { SystemType } from '../../engine/types'
import type { StepProps } from './steps'
import styles from './Wizard.module.css'

const CHOICES: { value: SystemType; label: string; description: string }[] = [
  {
    value: 'off-grid',
    label: 'No mains electricity at all',
    description: 'Solar and a battery run everything, all year round. The biggest and most expensive of the three.',
  },
  {
    value: 'hybrid',
    label: 'Mains, but it cuts often',
    description: 'Solar with a battery to carry you through the cuts, and the mains as a backstop. The common choice in Sri Lanka.',
  },
  {
    value: 'grid-tied',
    label: 'Reliable mains, I want a smaller bill',
    description: 'Solar feeding the house while the sun is up, with no battery. The cheapest way to cut a bill, and it stops when the power does.',
  },
]

export function StepSystemType({ state, dispatch }: StepProps) {
  const [asking, setAsking] = useState<'mains' | 'cuts' | null>(null)

  function choose(systemType: SystemType) {
    dispatch({ type: 'setSystemType', systemType })
    setAsking(null)
  }

  return (
    <>
      <ChoiceList
        legend="What are you building?"
        choices={CHOICES}
        value={state.inputs.systemType}
        onChange={choose}
      />

      <NotSure>
        <p>Two questions will settle it.</p>
        {asking === null && (
          <button type="button" className={styles.secondary} onClick={() => setAsking('mains')}>
            Ask me the two questions
          </button>
        )}

        {asking === 'mains' && (
          <div className={styles.branch}>
            <p>Do you have mains electricity at this place?</p>
            <button type="button" className={styles.secondary} onClick={() => setAsking('cuts')}>
              Yes, I have mains
            </button>
            <button type="button" className={styles.secondary} onClick={() => choose('off-grid')}>
              No, there is no mains here
            </button>
          </div>
        )}

        {asking === 'cuts' && (
          <div className={styles.branch}>
            <p>Does the power cut often enough to bother you?</p>
            <button type="button" className={styles.secondary} onClick={() => choose('hybrid')}>
              Yes, it cuts often
            </button>
            <button type="button" className={styles.secondary} onClick={() => choose('grid-tied')}>
              No, it is reliable
            </button>
          </div>
        )}
      </NotSure>
    </>
  )
}
```

Add to `src/ui/wizard/Wizard.module.css`:

```css
.branch {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
  margin-top: var(--space-2);
}
```

Wire it into `steps.tsx`, replacing the first placeholder:

```tsx
import { StepSystemType } from './StepSystemType'
// ...
{ id: 'system-type', title: 'What are you building?', Component: StepSystemType },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/wizard`
Expected: PASS (10)

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard
git commit -m "feat(ui): add the system-type screen with its not-sure path"
```

---

### Task 9: Screen 2 — where are you?

**Files:**
- Create: `src/ui/wizard/StepLocation.tsx`, `StepLocation.test.tsx`
- Modify: `src/ui/wizard/steps.tsx`

**Interfaces:**
- Consumes: `DISTRICTS`, `findDistrict`, `worstMonthPsh`, `PSH_SOURCE` from `src/data/psh.ts`; `SelectField`, `NumberField`, `NotSure`; `Term`.
- Produces: `export function StepLocation(props: StepProps): JSX.Element`, wired into `STEPS[1]`.

The district drives sun hours, so this screen shows what it resolved to and where the figure came from. Parent §6 requires provenance to be rendered in the UI; `PSH_SOURCE` carries it.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/wizard/StepLocation.test.tsx
import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { StepLocation } from './StepLocation'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  return (
    <>
      <StepLocation state={state} dispatch={dispatch} />
      <p>District: {state.inputs.districtId}</p>
      <p>Override: {String(state.inputs.pshOverride)}</p>
    </>
  )
}

function selectDistrict(value: string) {
  const select = screen.getByLabelText(/Which district/) as HTMLSelectElement
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    setter?.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('StepLocation', () => {
  it('lists districts and records the choice', () => {
    render(<Harness />)
    selectDistrict('jaffna')
    expect(screen.getByText('District: jaffna')).toBeDefined()
  })

  it('shows the worst-month sun hours the district resolves to', () => {
    render(<Harness />)
    // Colombo's worst month is 4.95 kWh/m2/day in the committed table.
    expect(screen.getByText(/4\.95/)).toBeDefined()
  })

  it('names where the sun figures came from', () => {
    render(<Harness />)
    expect(screen.getByText(/NASA POWER/)).toBeDefined()
  })

  it('keeps the manual override out of the way until opened', () => {
    render(<Harness />)
    expect(screen.getByText(/Somewhere else, or you have your own figure/).closest('details')?.open).toBe(false)
  })

  it('carries the help disclosure every screen must have', () => {
    render(<Harness />)
    expect(screen.getByText('Not sure?')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/wizard/StepLocation.test.tsx`
Expected: FAIL — cannot resolve `./StepLocation`.

- [ ] **Step 3: Write the screen**

```tsx
// src/ui/wizard/StepLocation.tsx
import { DISTRICTS, PSH_SOURCE, findDistrict, worstMonthPsh } from '../../data/psh'
import { formatFigure } from '../format'
import { NotSure } from '../primitives/NotSure'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import { Term } from '../primitives/Term'
import type { StepProps } from './steps'
import styles from './Wizard.module.css'

export function StepLocation({ state, dispatch }: StepProps) {
  const district = findDistrict(state.inputs.districtId)
  const worst = district ? worstMonthPsh(district) : undefined

  return (
    <>
      <SelectField
        id="district"
        label="Which district are you in?"
        value={state.inputs.districtId}
        hint="Sunshine varies across the island. The district sets how much sun the panels can expect."
        options={DISTRICTS.map((d) => ({ value: d.id, label: d.name }))}
        onChange={(districtId) => dispatch({ type: 'setDistrict', districtId })}
      />

      {worst !== undefined && (
        <p className={styles.resolved}>
          In its dullest month, {district?.name} gets about{' '}
          <strong>{formatFigure(worst)}</strong> <Term id="peak-sun-hours" />. Off-grid and hybrid systems are
          sized for that month, so they still work in the worst part of the year.
        </p>
      )}

      <p className={styles.provenance}>
        Sun figures from {PSH_SOURCE.name}, retrieved {PSH_SOURCE.fetchedOn}.
      </p>

      <NotSure>
        Pick the district you will install the panels in, not the one you post letters to. If you are between
        two, choose the one with less sun — a system sized for the duller place still works in the brighter one.
      </NotSure>

      <details className={styles.override}>
        <summary>Somewhere else, or you have your own figure?</summary>
        <div>
          <NumberField
            id="psh-override"
            label="Peak sun hours per day"
            value={state.inputs.pshOverride ?? worst ?? 4.5}
            min={1}
            max={8}
            step={0.1}
            unit="kWh/m² per day"
            hint="Use this only if you have a figure for your own site. Leave it alone otherwise."
            onChange={(psh) => dispatch({ type: 'setPshOverride', psh })}
          />
          {state.inputs.pshOverride !== undefined && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => dispatch({ type: 'setPshOverride', psh: undefined })}
            >
              Use the district figure instead
            </button>
          )}
        </div>
      </details>
    </>
  )
}
```

Add to `Wizard.module.css`:

```css
.resolved {
  max-width: var(--measure);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.provenance {
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
}

.override {
  margin-top: var(--space-3);
  font-size: var(--font-size-small);
}

.override > summary {
  cursor: pointer;
  color: var(--color-accent);
}
```

Wire into `steps.tsx` as `STEPS[1]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/wizard`
Expected: PASS (15)

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard
git commit -m "feat(ui): add the location screen with sun-hour provenance"
```

---

### Task 10: Screen 3 — your usage, and the appliance editor

**Files:**
- Create: `src/ui/wizard/StepUsage.tsx`, `StepUsage.test.tsx`
- Create: `src/ui/wizard/ApplianceEditor.tsx`, `ApplianceEditor.module.css`
- Modify: `src/ui/wizard/steps.tsx`

**Interfaces:**
- Consumes: `APPLIANCES`, `findAppliance` from `src/data/appliances.ts`; the primitives; the reducer's appliance actions.
- Produces:
  ```ts
  export function StepUsage(props: StepProps): JSX.Element
  export function ApplianceEditor(props: StepProps): JSX.Element
  ```

This is the largest screen in the plan because the appliance path is a real editor. It is also the fork the whole tool hinges on: a bill cannot say how much power you draw at one moment, so only this path produces an inverter size worth buying from.

The night-share choice on the bill path maps to `nightFraction`: 0.35 mostly by day, 0.5 evenly, 0.6 mostly in the evening (the engine default).

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/wizard/StepUsage.test.tsx
import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../../state/appState'
import { StepUsage } from './StepUsage'

function Harness() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  return (
    <>
      <StepUsage state={state} dispatch={dispatch} />
      <p>Load: {JSON.stringify(state.inputs.load)}</p>
    </>
  )
}

function clickRadio(name: RegExp) {
  act(() => {
    screen.getByRole('radio', { name }).click()
  })
}

function clickButton(name: RegExp) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

function setValue(element: HTMLElement, value: string, tag: 'input' | 'select') {
  act(() => {
    const proto = tag === 'input' ? HTMLInputElement.prototype : HTMLSelectElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(element, value)
    element.dispatchEvent(new Event(tag === 'input' ? 'input' : 'change', { bubbles: true }))
  })
}

describe('StepUsage', () => {
  it('starts on the bill path', () => {
    render(<Harness />)
    expect(screen.getByLabelText(/units .* last month/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /Add appliance/ })).toBeNull()
  })

  it('records the bill figure', () => {
    render(<Harness />)
    setValue(screen.getByLabelText(/units .* last month/i), '420', 'input')
    expect(screen.getByText(/"monthlyKwh":420/)).toBeDefined()
  })

  it('records when the power is used', () => {
    render(<Harness />)
    clickRadio(/Mostly during the day/)
    expect(screen.getByText(/"nightFraction":0.35/)).toBeDefined()
  })

  it('switches to the appliance path and back', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    expect(screen.getByRole('button', { name: /Add appliance/ })).toBeDefined()
    clickRadio(/I have my bill/)
    expect(screen.getByLabelText(/units .* last month/i)).toBeDefined()
  })

  it('adds an appliance with its own sensible defaults', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'ceiling-fan', 'select')
    clickButton(/Add appliance/)
    expect(screen.getByText(/"applianceId":"ceiling-fan"/)).toBeDefined()
    expect(screen.getByText(/"quantity":1/)).toBeDefined()
  })

  it('edits quantity and hours on a row', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'led-bulb', 'select')
    clickButton(/Add appliance/)
    setValue(screen.getByLabelText(/How many/), '8', 'input')
    setValue(screen.getByLabelText(/Hours a day/), '6', 'input')
    expect(screen.getByText(/"quantity":8/)).toBeDefined()
    expect(screen.getByText(/"hoursPerDay":6/)).toBeDefined()
  })

  it('removes a row', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    setValue(screen.getByLabelText(/Appliance to add/), 'led-bulb', 'select')
    clickButton(/Add appliance/)
    clickButton(/Remove/)
    expect(screen.getByText(/"entries":\[\]/)).toBeDefined()
  })

  it('tells the user why the appliance path is worth the effort', () => {
    render(<Harness />)
    clickRadio(/list my appliances/)
    expect(screen.getByText(/at any one moment/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/wizard/StepUsage.test.tsx`
Expected: FAIL — cannot resolve `./StepUsage`.

- [ ] **Step 3: Write the appliance editor**

```tsx
// src/ui/wizard/ApplianceEditor.tsx
import { useState } from 'react'
import { APPLIANCES, findAppliance } from '../../data/appliances'
import type { UsageWindow } from '../../engine/types'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import type { StepProps } from './steps'
import styles from './ApplianceEditor.module.css'

const WINDOWS: { value: UsageWindow; label: string }[] = [
  { value: 'day', label: 'While the sun is up' },
  { value: 'night', label: 'In the evening or at night' },
  { value: 'both', label: 'Both' },
]

export function ApplianceEditor({ state, dispatch }: StepProps) {
  const [toAdd, setToAdd] = useState(APPLIANCES[0]?.id ?? '')
  const entries = state.inputs.load.mode === 'appliances' ? state.inputs.load.entries : []

  return (
    <div>
      <p className={styles.rationale}>
        A bill cannot tell this tool how much power you draw at any one moment, and that is what decides the
        inverter size. Listing appliances gives a figure you can buy from.
      </p>

      <div className={styles.adder}>
        <SelectField
          id="appliance-to-add"
          label="Appliance to add"
          size="compact"
          value={toAdd}
          options={APPLIANCES.map((a) => ({ value: a.id, label: `${a.name} — ${a.watts} W` }))}
          onChange={setToAdd}
        />
        <button
          type="button"
          className={styles.add}
          onClick={() => dispatch({ type: 'addAppliance', applianceId: toAdd })}
        >
          Add appliance
        </button>
      </div>

      {entries.length === 0 && <p className={styles.empty}>Nothing listed yet. Add the things you cannot do without first.</p>}

      <ul className={styles.rows}>
        {entries.map((entry, index) => {
          const appliance = findAppliance(entry.applianceId)
          return (
            <li key={`${entry.applianceId}-${index}`} className={styles.row}>
              <p className={styles.rowName}>
                {appliance?.name ?? entry.applianceId} <span className={styles.watts}>{appliance?.watts ?? 0} W each</span>
              </p>
              <NumberField
                id={`quantity-${index}`}
                label="How many"
                size="compact"
                value={entry.quantity}
                min={1}
                max={50}
                onChange={(quantity) => dispatch({ type: 'updateAppliance', index, patch: { quantity } })}
              />
              <NumberField
                id={`hours-${index}`}
                label="Hours a day"
                size="compact"
                value={entry.hoursPerDay}
                min={0}
                max={24}
                step={0.5}
                onChange={(hoursPerDay) => dispatch({ type: 'updateAppliance', index, patch: { hoursPerDay } })}
              />
              <SelectField
                id={`window-${index}`}
                label="When"
                size="compact"
                value={entry.usageWindow}
                options={WINDOWS}
                onChange={(value) =>
                  dispatch({
                    type: 'updateAppliance',
                    index,
                    patch: { usageWindow: WINDOWS.find((w) => w.value === value)?.value ?? 'both' },
                  })
                }
              />
              <button type="button" className={styles.remove} onClick={() => dispatch({ type: 'removeAppliance', index })}>
                Remove
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

```css
/* src/ui/wizard/ApplianceEditor.module.css */
.rationale {
  max-width: var(--measure);
  color: var(--color-ink-quiet);
}

.adder {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
  flex-wrap: wrap;
}

.add {
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  cursor: pointer;
}

.empty {
  color: var(--color-ink-quiet);
}

.rows {
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

@media (min-width: 40rem) {
  .row {
    grid-template-columns: 1fr auto auto auto auto;
    align-items: end;
  }
}

.rowName {
  margin: 0;
  font-weight: 600;
}

.watts {
  color: var(--color-ink-quiet);
  font-weight: 400;
  font-size: var(--font-size-small);
}

.remove {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
}
```

- [ ] **Step 4: Write the screen**

```tsx
// src/ui/wizard/StepUsage.tsx
import { ChoiceList } from '../primitives/ChoiceList'
import { NotSure } from '../primitives/NotSure'
import { NumberField } from '../primitives/NumberField'
import { ApplianceEditor } from './ApplianceEditor'
import type { StepProps } from './steps'

const NIGHT_SHARES = [
  { value: '0.35', label: 'Mostly during the day' },
  { value: '0.5', label: 'About evenly' },
  { value: '0.6', label: 'Mostly in the evening and at night' },
]

export function StepUsage({ state, dispatch }: StepProps) {
  const load = state.inputs.load

  return (
    <>
      <ChoiceList
        legend="How would you like to tell us what you use?"
        value={load.mode}
        choices={[
          { value: 'bill' as const, label: 'I have my bill', description: 'One number, and you are done. Good enough to size panels and a battery.' },
          { value: 'appliances' as const, label: 'Let me list my appliances', description: 'Takes a few minutes and gives a much better inverter size.' },
        ]}
        onChange={(mode) => dispatch({ type: 'setLoadMode', mode })}
      />

      {load.mode === 'bill' ? (
        <>
          <NumberField
            id="monthly-kwh"
            label="How many units did you use last month?"
            value={load.monthlyKwh}
            min={0}
            max={5000}
            unit="kWh"
            hint="Your bill calls these units or kWh. If it varies, use a typical month."
            onChange={(monthlyKwh) => dispatch({ type: 'setBill', monthlyKwh })}
          />
          <ChoiceList
            legend="When do you use most of it?"
            value={String(load.nightFraction)}
            choices={NIGHT_SHARES}
            onChange={(value) => dispatch({ type: 'setNightFraction', fraction: Number(value) })}
          />
          <NotSure>
            Look for the line on your CEB bill showing units consumed. If two months differ a lot, use the
            higher one — a system sized for the busy month copes with the quiet one.
          </NotSure>
        </>
      ) : (
        <ApplianceEditor state={state} dispatch={dispatch} />
      )}
    </>
  )
}
```

The night-share `ChoiceList` binds `String(load.nightFraction)`. A restored URL can carry a night fraction that is not one of the three options, in which case no radio is checked — which is correct: the user's own figure is preserved and the group simply shows nothing selected until they choose.

Wire into `steps.tsx` as `STEPS[2]`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/ui/wizard`
Expected: PASS (23)

- [ ] **Step 6: Commit**

```bash
git add src/ui/wizard
git commit -m "feat(ui): add the usage fork and the appliance editor"
```

---

### Task 11: Screen 4 — preferences

**Files:**
- Create: `src/ui/wizard/StepPreferences.tsx`, `StepPreferences.test.tsx`
- Modify: `src/ui/wizard/steps.tsx`

**Interfaces:**
- Consumes: `PANELS` from `src/data/components.ts`; `NumberField`, `SelectField`, `NotSure`, `Term`.
- Produces: `export function StepPreferences(props: StepProps): JSX.Element`, wired into `STEPS[3]`.

Everything here is pre-filled, so the screen must make clear that moving on unchanged is a legitimate choice. Autonomy is hidden entirely for grid-tied, where the engine ignores it.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/wizard/StepPreferences.test.tsx
import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialState, reducer, type AppState } from '../../state/appState'
import { StepPreferences } from './StepPreferences'

function Harness({ start }: { start?: Partial<AppState['inputs']> }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const base = initialState()
    return { ...base, inputs: { ...base.inputs, ...start } }
  })
  return (
    <>
      <StepPreferences state={state} dispatch={dispatch} />
      <p>Autonomy: {state.inputs.autonomyDays}</p>
      <p>Panel: {state.inputs.panelId}</p>
      <p>Touched: {state.touched.join(',')}</p>
    </>
  )
}

describe('StepPreferences', () => {
  it('says the defaults are safe to accept', () => {
    render(<Harness />)
    expect(screen.getByText(/already filled in/i)).toBeDefined()
  })

  it('records an autonomy the user sets, and marks it touched', () => {
    render(<Harness />)
    const input = screen.getByLabelText(/days .* run the house/i)
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '3')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(screen.getByText('Autonomy: 3')).toBeDefined()
    expect(screen.getByText('Touched: autonomyDays')).toBeDefined()
  })

  it('hides autonomy for grid-tied, which has no battery', () => {
    render(<Harness start={{ systemType: 'grid-tied' }} />)
    expect(screen.queryByLabelText(/days .* run the house/i)).toBeNull()
  })

  it('still carries a help disclosure when autonomy is hidden', () => {
    render(<Harness start={{ systemType: 'grid-tied' }} />)
    expect(screen.getAllByText('Not sure?').length).toBeGreaterThan(0)
  })

  it('offers the panel sizes in the data table', () => {
    render(<Harness />)
    const select = screen.getByLabelText(/panel size/i)
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, 'generic-330')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(screen.getByText('Panel: generic-330')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/wizard/StepPreferences.test.tsx`
Expected: FAIL — cannot resolve `./StepPreferences`.

- [ ] **Step 3: Write the screen**

```tsx
// src/ui/wizard/StepPreferences.tsx
import { PANELS } from '../../data/components'
import { NotSure } from '../primitives/NotSure'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import { Term } from '../primitives/Term'
import type { StepProps } from './steps'
import styles from './Wizard.module.css'

export function StepPreferences({ state, dispatch }: StepProps) {
  const hasBattery = state.inputs.systemType !== 'grid-tied'

  return (
    <>
      <p className={styles.resolved}>
        These are already filled in with sensible values. Move on unless you have a reason to change them.
      </p>

      {hasBattery && (
        <>
          <NumberField
            id="autonomy"
            label="How many days should the battery run the house with no sun?"
            value={state.inputs.autonomyDays}
            min={0}
            max={5}
            step={0.5}
            unit="days"
            hint="More days means a bigger and more expensive battery."
            onChange={(days) => dispatch({ type: 'setAutonomyDays', days })}
          />
          <NotSure>
            This is called <Term id="autonomy" />. Two days suits a place with no mains at all. Half a day is
            plenty when the mains is there to fall back on.
          </NotSure>
        </>
      )}

      <SelectField
        id="panel"
        label="What panel size can you buy locally?"
        value={state.inputs.panelId}
        hint="Suppliers stock different sizes. Pick what is available near you; the tool works out how many you need."
        options={PANELS.map((panel) => ({ value: panel.id, label: panel.name }))}
        onChange={(panelId) => dispatch({ type: 'setPanel', panelId })}
      />

      <NotSure>
        Panel size changes how many you need, not how much solar you get — six 450 W panels and five 550 W
        panels produce nearly the same. Pick whatever your local supplier actually stocks.
      </NotSure>
    </>
  )
}
```

The second `NotSure` sits outside the battery branch deliberately: a grid-tied user never sees the autonomy question, and every screen must carry help.

Wire into `steps.tsx` as `STEPS[3]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/wizard`
Expected: PASS (28)

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard
git commit -m "feat(ui): add the preferences screen"
```

---

### Task 12: Results — the four system cards

**Files:**
- Create: `src/ui/results/SystemCard.tsx`, `SystemCard.module.css`
- Create: `src/ui/results/Results.tsx`, `Results.module.css`, `Results.test.tsx`

**Interfaces:**
- Consumes: `SystemDesign`, `Sized` from `src/engine/types.ts`; `formatFigure`; `WhyThisNumber`; `Term`.
- Produces:
  ```ts
  export function SystemCard(props: {
    title: string; figure: string; unit: string; sentence: ReactNode; field: Sized<unknown>
  }): JSX.Element

  export function Results(props: {
    design: SystemDesign; state: AppState; dispatch: Dispatch<Action>
  }): JSX.Element
  ```

Tasks 13 and 14 add the warnings, the maths section and the sidebar into `Results`. Build tier 1 first and leave the slots empty.

Grid-tied omission is not a rule this component owns: `design.battery`, `design.controller` and `design.busVoltage` are already `null` on that path, and the card renders only when its data exists.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/results/Results.test.tsx
import { useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../../engine/defaults'
import { sizeSystem } from '../../engine/sizeSystem'
import type { SystemType } from '../../engine/types'
import { initialState, reducer } from '../../state/appState'
import { Results } from './Results'

function Harness({ systemType }: { systemType: SystemType }) {
  const inputs = { ...defaultInputs(systemType, 'colombo'), load: { mode: 'bill' as const, monthlyKwh: 250, nightFraction: 0.6 } }
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(inputs))
  return <Results design={sizeSystem(inputs)} state={state} dispatch={dispatch} />
}

describe('Results', () => {
  it('shows all four cards for an off-grid system', () => {
    render(<Harness systemType="off-grid" />)
    for (const title of ['Panels', 'Battery', 'Inverter', 'Charge controller']) {
      expect(screen.getByRole('heading', { name: title }), title).toBeDefined()
    }
  })

  it('shows all four cards for a hybrid system', () => {
    render(<Harness systemType="hybrid" />)
    expect(screen.getByRole('heading', { name: 'Battery' })).toBeDefined()
  })

  it('omits the battery and controller cards for grid-tied', () => {
    render(<Harness systemType="grid-tied" />)
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Battery' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Charge controller' })).toBeNull()
  })

  it('gives every card an explanation', () => {
    render(<Harness systemType="off-grid" />)
    expect(screen.getAllByText('Why this number?')).toHaveLength(4)
  })

  it('leads each card with a figure', () => {
    render(<Harness systemType="hybrid" />)
    const panels = screen.getByRole('heading', { name: 'Panels' }).closest('article')
    expect(panels?.textContent).toMatch(/\d/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/results/Results.test.tsx`
Expected: FAIL — cannot resolve `./Results`.

- [ ] **Step 3: Write the card**

```tsx
// src/ui/results/SystemCard.tsx
import type { ReactNode } from 'react'
import type { Sized } from '../../engine/types'
import { WhyThisNumber } from '../primitives/WhyThisNumber'
import styles from './SystemCard.module.css'

interface SystemCardProps {
  title: string
  figure: string
  unit: string
  /** One plain sentence saying what the figure means. */
  sentence: ReactNode
  /** The engine value whose explanation backs the figure. */
  field: Sized<unknown>
}

export function SystemCard({ title, figure, unit, sentence, field }: SystemCardProps) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.figure}>
        <span className={styles.value}>{figure}</span> <span className={styles.unit}>{unit}</span>
      </p>
      <p className={styles.sentence}>{sentence}</p>
      <WhyThisNumber field={field} />
    </article>
  )
}
```

```css
/* src/ui/results/SystemCard.module.css */
.card {
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.title {
  margin: 0;
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.figure {
  margin: var(--space-2) 0 var(--space-2);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.value {
  color: var(--color-accent);
  font-size: var(--font-size-figure);
  font-weight: 700;
}

.unit {
  color: var(--color-ink-quiet);
}

.sentence {
  max-width: var(--measure);
  margin: 0;
}
```

- [ ] **Step 4: Write the results page**

```tsx
// src/ui/results/Results.tsx
import type { Dispatch } from 'react'
import type { SystemDesign } from '../../engine/types'
import type { Action, AppState } from '../../state/appState'
import { formatFigure } from '../format'
import { Term } from '../primitives/Term'
import { SystemCard } from './SystemCard'
import styles from './Results.module.css'

interface ResultsProps {
  design: SystemDesign
  state: AppState
  dispatch: Dispatch<Action>
}

export function Results({ design }: ResultsProps) {
  const { array, inverter, battery, controller, busVoltage } = design

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <h2 className={styles.heading}>Your system</h2>

        <div className={styles.cards}>
          <SystemCard
            title="Panels"
            figure={formatFigure(array.panelCount.value)}
            unit={array.panelCount.value === 1 ? 'panel' : 'panels'}
            sentence={`That is ${formatFigure(array.installedPvKw.value)} kW of solar, needing about ${formatFigure(array.roofAreaM2.value)} m² of roof.`}
            field={array.panelCount}
          />

          {battery && busVoltage && (
            <SystemCard
              title="Battery"
              figure={formatFigure(battery.nominalKwh.value)}
              unit="kWh"
              sentence={
                <>
                  A {formatFigure(busVoltage.value)} V bank, which is the <Term id="bus-voltage" /> this size of
                  system runs at.
                </>
              }
              field={battery.nominalKwh}
            />
          )}

          <SystemCard
            title="Inverter"
            figure={formatFigure(inverter.continuousW.value)}
            unit="W"
            sentence={
              <>
                It also has to survive a {formatFigure(inverter.surgeRequiredW.value)} W <Term id="surge" /> when
                motors start.
              </>
            }
            field={inverter.continuousW}
          />

          {controller && (
            <SystemCard
              title="Charge controller"
              figure={formatFigure(controller.amps.value)}
              unit="A"
              sentence={
                <>
                  An <Term id={controller.type.value === 'MPPT' ? 'mppt' : 'pwm'} /> type, sized for the current
                  the panels can push into the battery.
                </>
              }
              field={controller.amps}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

```css
/* src/ui/results/Results.module.css */
.layout {
  max-width: 68rem;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3) var(--space-5);
}

.main {
  min-width: 0;
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-heading);
}

.cards {
  display: grid;
  gap: var(--space-3);
}

@media (min-width: 44rem) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

`Results` takes `state` and `dispatch` it does not yet use, which `noUnusedParameters` will not flag (they are destructured away) but a reviewer will notice. Task 14 uses them for the sidebar; leave the props in the signature so the interface stays stable across tasks.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/ui/results`
Expected: PASS (5)

- [ ] **Step 6: Commit**

```bash
git add src/ui/results
git commit -m "feat(ui): add the results cards for each part of the system"
```

---

### Task 13: Warnings and "Show me the maths"

**Files:**
- Create: `src/ui/results/Warnings.tsx`, `Warnings.module.css`
- Create: `src/ui/results/ShowTheMaths.tsx`, `ShowTheMaths.module.css`
- Create: `src/ui/results/ShowTheMaths.test.tsx`
- Modify: `src/ui/results/Results.tsx`, `Results.test.tsx`

**Interfaces:**
- Consumes: `Warning`, `SystemDesign`, `Sized` from the engine types.
- Produces:
  ```ts
  export function Warnings(props: { warnings: Warning[] }): JSX.Element | null
  export function ShowTheMaths(props: { design: SystemDesign }): JSX.Element
  export function collectSizedFields(design: SystemDesign): { group: string; label: string; field: Sized<unknown> }[]
  ```

`collectSizedFields` is exported because it is the one piece here with real logic: walking a `SystemDesign` and finding every `Sized` value, including the nullable branches. Test it directly.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/results/ShowTheMaths.test.tsx
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
```

Add to `src/ui/results/Results.test.tsx`:

```tsx
  it('shows the warnings the engine produced', () => {
    render(<Harness systemType="hybrid" />)
    // A bill-based design always carries the estimated-peak notice.
    expect(screen.getByText(/rough estimate/i)).toBeDefined()
  })

  it('offers the full arithmetic', () => {
    render(<Harness systemType="hybrid" />)
    expect(screen.getByText('Show me the maths')).toBeDefined()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/results`
Expected: FAIL — cannot resolve `./ShowTheMaths` and `./Warnings`.

- [ ] **Step 3: Write both components**

```tsx
// src/ui/results/Warnings.tsx
import type { Warning } from '../../engine/types'
import styles from './Warnings.module.css'

export function Warnings({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="warnings-heading">
      <h2 id="warnings-heading" className={styles.heading}>
        Worth knowing
      </h2>
      <ul className={styles.list}>
        {warnings.map((warning) => (
          <li key={warning.id} className={warning.severity === 'caution' ? styles.caution : styles.info}>
            {warning.message}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

```css
/* src/ui/results/Warnings.module.css */
.section {
  margin-top: var(--space-5);
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-heading);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.info,
.caution {
  max-width: var(--measure);
  margin-bottom: var(--space-2);
  padding: var(--space-3);
  border-left: 3px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.caution {
  border-left-color: var(--color-caution);
  background: var(--color-caution-ground);
  color: var(--color-caution);
}
```

```tsx
// src/ui/results/ShowTheMaths.tsx
import type { Sized, SystemDesign } from '../../engine/types'
import styles from './ShowTheMaths.module.css'

interface CollectedField {
  group: string
  label: string
  field: Sized<unknown>
}

/** Every explained value in a design, in the order the engine derives them. */
export function collectSizedFields(design: SystemDesign): CollectedField[] {
  const fields: CollectedField[] = [
    { group: 'Your usage', label: 'Energy per day', field: design.load.dailyKwh },
    { group: 'Your usage', label: 'Used during the day', field: design.load.dayKwh },
    { group: 'Your usage', label: 'Used at night', field: design.load.nightKwh },
    { group: 'Your usage', label: 'Peak demand', field: design.load.continuousPeakW },
    { group: 'Your usage', label: 'Startup surge', field: design.load.surgePeakW },
    { group: 'Panels', label: 'Sun hours used', field: design.array.designPsh },
    { group: 'Panels', label: 'Losses', field: design.array.derateTotal },
    { group: 'Panels', label: 'Solar needed', field: design.array.requiredPvKw },
    { group: 'Panels', label: 'Panel count', field: design.array.panelCount },
    { group: 'Panels', label: 'Installed size', field: design.array.installedPvKw },
    { group: 'Panels', label: 'Roof area', field: design.array.roofAreaM2 },
    { group: 'Inverter', label: 'Continuous rating', field: design.inverter.continuousW },
    { group: 'Inverter', label: 'Surge required', field: design.inverter.surgeRequiredW },
  ]

  if (design.busVoltage) {
    fields.push({ group: 'Battery', label: 'System voltage', field: design.busVoltage })
  }
  if (design.battery) {
    fields.push(
      { group: 'Battery', label: 'Usable energy', field: design.battery.usableKwh },
      { group: 'Battery', label: 'Battery size', field: design.battery.nominalKwh },
      { group: 'Battery', label: 'Bank capacity', field: design.battery.bankAh },
      { group: 'Battery', label: 'Modules in series', field: design.battery.modulesInSeries },
      { group: 'Battery', label: 'Modules in parallel', field: design.battery.modulesInParallel },
    )
  }
  if (design.controller) {
    fields.push(
      { group: 'Charge controller', label: 'Current rating', field: design.controller.amps },
      { group: 'Charge controller', label: 'Controller type', field: design.controller.type },
      { group: 'Charge controller', label: 'Highest panel voltage', field: design.controller.maxStringVoc },
    )
  }

  return fields
}

export function ShowTheMaths({ design }: { design: SystemDesign }) {
  const fields = collectSizedFields(design)

  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Show me the maths</summary>
      <dl className={styles.list}>
        {fields.map(({ group, label, field }) => (
          <div key={`${group}-${label}`} className={styles.row}>
            <dt className={styles.label}>
              {group} — {label}
            </dt>
            <dd className={styles.body}>
              <p className={styles.value}>
                {String(field.value)} {field.unit}
              </p>
              <p>{field.explain.plain}</p>
              <code className={styles.code}>{field.explain.formula}</code>
              <code className={styles.code}>{field.explain.substituted}</code>
              {field.explain.assumptions.length > 0 && (
                <ul className={styles.assumptions}>
                  {field.explain.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
```

`<dt>` carries the implicit ARIA role `term`, which is what the test counts.

```css
/* src/ui/results/ShowTheMaths.module.css */
.details {
  margin-top: var(--space-5);
}

.summary {
  cursor: pointer;
  color: var(--color-accent);
  font-size: var(--font-size-heading);
}

.list {
  margin: var(--space-3) 0 0;
}

.row {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-line);
}

.label {
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.body {
  max-width: var(--measure);
  margin: var(--space-2) 0 0;
}

.value {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-heading);
  font-variant-numeric: tabular-nums;
}

.code {
  display: block;
  margin-top: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-ground);
  font-variant-numeric: tabular-nums;
  overflow-x: auto;
}

.assumptions {
  margin: var(--space-2) 0 0;
  padding-left: var(--space-4);
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
}
```

- [ ] **Step 4: Wire them into `Results`**

In `src/ui/results/Results.tsx`, import both and render them after the cards, inside `.main`:

```tsx
        <Warnings warnings={design.warnings} />
        <ShowTheMaths design={design} />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/ui/results`
Expected: PASS (13)

- [ ] **Step 6: Commit**

```bash
git add src/ui/results
git commit -m "feat(ui): add warnings and the full arithmetic section"
```

---

### Task 14: The live input sidebar

**Files:**
- Create: `src/ui/results/InputSidebar.tsx`, `InputSidebar.module.css`, `InputSidebar.test.tsx`
- Modify: `src/ui/results/Results.tsx`, `Results.module.css`

**Interfaces:**
- Consumes: `AppState`, `Action`; the primitives; `DISTRICTS`; `PANELS`; `ApplianceEditor` from Task 10.
- Produces: `export function InputSidebar(props: { state: AppState; dispatch: Dispatch<Action> }): JSX.Element`

The sidebar composes the same primitives at `size="compact"`. It reuses `ApplianceEditor` outright rather than growing a second appliance UI.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/results/InputSidebar.test.tsx
import { act, useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultInputs } from '../../engine/defaults'
import { sizeSystem } from '../../engine/sizeSystem'
import { initialState, reducer } from '../../state/appState'
import { Results } from './Results'

function LiveHarness() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState({ ...defaultInputs('hybrid', 'colombo'), load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 } }),
  )
  return <Results design={sizeSystem(state.inputs)} state={state} dispatch={dispatch} />
}

function setInput(label: RegExp, value: string) {
  const input = screen.getByLabelText(label)
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('the live sidebar', () => {
  it('offers every input beside the results', () => {
    render(<LiveHarness />)
    expect(screen.getByRole('complementary', { name: /Your answers/ })).toBeDefined()
    expect(screen.getByLabelText(/units/i)).toBeDefined()
    expect(screen.getByLabelText(/district/i)).toBeDefined()
  })

  it('re-sizes the system when an input changes', () => {
    render(<LiveHarness />)
    const before = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent
    setInput(/units/i, '900')
    const after = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent
    expect(after).not.toBe(before)
  })

  it('drops the battery card when the system type changes to grid-tied', () => {
    render(<LiveHarness />)
    expect(screen.getByRole('heading', { name: 'Battery' })).toBeDefined()
    act(() => {
      screen.getByRole('radio', { name: /Reliable mains/ }).click()
    })
    expect(screen.queryByRole('heading', { name: 'Battery' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/results/InputSidebar.test.tsx`
Expected: FAIL — no `complementary` role in the document, because `Results` renders no sidebar yet.

- [ ] **Step 3: Write the sidebar**

```tsx
// src/ui/results/InputSidebar.tsx
import type { Dispatch } from 'react'
import { PANELS } from '../../data/components'
import { DISTRICTS } from '../../data/psh'
import type { SystemType } from '../../engine/types'
import type { Action, AppState } from '../../state/appState'
import { ChoiceList } from '../primitives/ChoiceList'
import { NumberField } from '../primitives/NumberField'
import { SelectField } from '../primitives/SelectField'
import { ApplianceEditor } from '../wizard/ApplianceEditor'
import styles from './InputSidebar.module.css'

const TYPES: { value: SystemType; label: string }[] = [
  { value: 'off-grid', label: 'No mains electricity' },
  { value: 'hybrid', label: 'Mains, but it cuts' },
  { value: 'grid-tied', label: 'Reliable mains' },
]

export function InputSidebar({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const { inputs } = state

  return (
    <aside className={styles.sidebar} aria-label="Your answers">
      <h2 className={styles.heading}>Your answers</h2>
      <p className={styles.note}>Change anything here and the figures update as you go.</p>

      <ChoiceList
        legend="System"
        size="compact"
        value={inputs.systemType}
        choices={TYPES}
        onChange={(systemType) => dispatch({ type: 'setSystemType', systemType })}
      />

      <SelectField
        id="sidebar-district"
        label="District"
        size="compact"
        value={inputs.districtId}
        options={DISTRICTS.map((d) => ({ value: d.id, label: d.name }))}
        onChange={(districtId) => dispatch({ type: 'setDistrict', districtId })}
      />

      <ChoiceList
        legend="Usage"
        size="compact"
        value={inputs.load.mode}
        choices={[
          { value: 'bill' as const, label: 'From my bill' },
          { value: 'appliances' as const, label: 'From my appliances' },
        ]}
        onChange={(mode) => dispatch({ type: 'setLoadMode', mode })}
      />

      {inputs.load.mode === 'bill' ? (
        <NumberField
          id="sidebar-kwh"
          label="Units a month"
          size="compact"
          value={inputs.load.monthlyKwh}
          min={0}
          max={5000}
          unit="kWh"
          onChange={(monthlyKwh) => dispatch({ type: 'setBill', monthlyKwh })}
        />
      ) : (
        <ApplianceEditor state={state} dispatch={dispatch} />
      )}

      {inputs.systemType !== 'grid-tied' && (
        <NumberField
          id="sidebar-autonomy"
          label="Days without sun"
          size="compact"
          value={inputs.autonomyDays}
          min={0}
          max={5}
          step={0.5}
          unit="days"
          onChange={(days) => dispatch({ type: 'setAutonomyDays', days })}
        />
      )}

      <SelectField
        id="sidebar-panel"
        label="Panel size"
        size="compact"
        value={inputs.panelId}
        options={PANELS.map((panel) => ({ value: panel.id, label: panel.name }))}
        onChange={(panelId) => dispatch({ type: 'setPanel', panelId })}
      />
    </aside>
  )
}
```

```css
/* src/ui/results/InputSidebar.module.css */
.sidebar {
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.heading {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-heading);
}

.note {
  margin: 0 0 var(--space-4);
  color: var(--color-ink-quiet);
  font-size: var(--font-size-small);
}

@media (min-width: 60rem) {
  .sidebar {
    position: sticky;
    top: var(--space-3);
    max-height: calc(100vh - var(--space-5));
    overflow-y: auto;
  }
}
```

- [ ] **Step 4: Put it into the layout**

In `Results.tsx`, render `<InputSidebar state={state} dispatch={dispatch} />` as a sibling of `.main`, and stop discarding the props:

```tsx
export function Results({ design, state, dispatch }: ResultsProps) {
```

In `Results.module.css`, make `.layout` two columns on desktop and put the sidebar first on mobile — a live calculator whose controls are below a long results page is not live in any useful sense:

```css
.layout {
  display: grid;
  gap: var(--space-4);
  max-width: 68rem;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3) var(--space-5);
}

@media (min-width: 60rem) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 20rem;
  }

  .main {
    order: 1;
  }
}
```

With `.main` ordered after the sidebar in the DOM but placed first visually on desktop, keep the sidebar first in the markup so mobile gets it first without a media query for order.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/ui/results`
Expected: PASS (16)

- [ ] **Step 6: Commit**

```bash
git add src/ui/results
git commit -m "feat(ui): add the live-editing input sidebar"
```

---

### Task 15: Wire the app together

**Files:**
- Create: `src/ui/ErrorBoundary.tsx`, `ErrorBoundary.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx` (create)
- Modify: `src/engine/architecture.test.ts`
- Delete: `src/ui/DesignDump.tsx`, `src/ui/DesignDump.test.tsx`

**Interfaces:**
- Consumes: everything built so far.
- Produces: `export function App(): JSX.Element`, `export class ErrorBoundary extends Component<...>`

This is where the URL becomes real: `App` seeds the reducer from `window.location.search` and writes it back with `replaceState` on every change.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/App.test.tsx
import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function setQuery(search: string) {
  window.history.replaceState(null, '', search === '' ? '/' : `/?${search}`)
}

afterEach(() => {
  setQuery('')
  vi.restoreAllMocks()
})

describe('App', () => {
  it('starts the wizard when the URL carries no design', () => {
    setQuery('')
    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: 'What are you building?' })).toBeDefined()
  })

  it('opens straight to results when the URL carries a design', () => {
    setQuery('t=hybrid&d=colombo&l=b&kwh=250&nf=0.6&a=0.5&p=generic-550&b=lfp-51v-100ah')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Your system' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
  })

  it('writes the design back to the URL without adding history entries', () => {
    setQuery('t=hybrid&d=colombo&l=b&kwh=250&nf=0.6&a=0.5&p=generic-550&b=lfp-51v-100ah')
    const push = vi.spyOn(window.history, 'pushState')
    render(<App />)
    const input = screen.getByLabelText(/Units a month/)
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '640')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(window.location.search).toContain('kwh=640')
    expect(push).not.toHaveBeenCalled()
  })

  it('round-trips its own URL back into the same design', () => {
    setQuery('t=off-grid&d=kandy&l=b&kwh=310&nf=0.6&a=2&p=generic-550&b=lfp-51v-100ah')
    const { unmount } = render(<App />)
    const first = screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent
    const written = window.location.search
    unmount()

    setQuery(written.slice(1))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Panels' }).closest('article')?.textContent).toBe(first)
  })
})
```

```tsx
// src/ui/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Exploding(): JSX.Element {
  throw new Error('impossible design')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; silence it so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary onReset={() => {}}>
        <p>All well</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('All well')).toBeDefined()
  })

  it('shows a recoverable message instead of a blank page', () => {
    render(
      <ErrorBoundary onReset={() => {}}>
        <Exploding />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/could not work out a system/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Start over/ })).toBeDefined()
  })
})
```

Add to `src/engine/architecture.test.ts`:

```ts
describe('state layer boundaries', () => {
  const files = sourceFiles('src/state')

  it('finds the state modules', () => {
    expect(files.length).toBeGreaterThan(1)
  })

  it('never imports React or UI code', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from ['"]react/)
      expect(source, file).not.toMatch(/from ['"].*\/ui\//)
    }
  })
})

describe('storage', () => {
  it('keeps the URL as the only persistence', () => {
    const files = [...sourceFiles('src/engine'), ...sourceFiles('src/data'), ...sourceFiles('src/state'), ...sourceFiles('src/ui')]
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/\blocalStorage\b/)
      expect(source, file).not.toMatch(/\bsessionStorage\b/)
      expect(source, file).not.toMatch(/\bindexedDB\b/)
      expect(source, file).not.toMatch(/document\.cookie/)
    }
  })
})
```

`sourceFiles` only collects `.ts`, so extend its filter to `.tsx` before adding the UI directory, or the storage test silently checks nothing in `src/ui`:

```ts
    const isSource = (name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')
    return isSource ? [full] : []
```

That change also brings `src/ui/*.tsx` under the existing rules, which is intended.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.test.tsx src/ui/ErrorBoundary.test.tsx src/engine/architecture.test.ts`
Expected: FAIL — no `ErrorBoundary` module; `App` still renders the Phase 1 dump.

- [ ] **Step 3: Write the error boundary**

```tsx
// src/ui/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset: () => void
}

interface State {
  failed: boolean
}

/** Parent §8 tier 3: sizeSystem throws only on impossible input. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Sizing failed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <section>
        <h2>This tool could not work out a system from those answers.</h2>
        <p>That is a fault in the tool, not in what you typed. Starting again with the usual answers should work.</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ failed: false })
            this.props.onReset()
          }}
        >
          Start over
        </button>
      </section>
    )
  }
}
```

- [ ] **Step 4: Rewrite `App`**

```tsx
// src/App.tsx
import { useEffect, useMemo, useReducer } from 'react'
import { sizeSystem } from './engine/sizeSystem'
import { initialState, reducer } from './state/appState'
import { decodeInputs, encodeInputs } from './state/url'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { Results } from './ui/results/Results'
import { Wizard } from './ui/wizard/Wizard'

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(decodeInputs(window.location.search)))

  const design = useMemo(() => sizeSystem(state.inputs), [state.inputs])

  // replaceState, not pushState: the back button must not become an undo stack.
  useEffect(() => {
    window.history.replaceState(null, '', `?${encodeInputs(state.inputs)}`)
  }, [state.inputs])

  return (
    <main>
      <header>
        <h1>Solar system calculator</h1>
        <p>Work out what size solar system you need, and understand why.</p>
      </header>

      <ErrorBoundary onReset={() => dispatch({ type: 'restart' })}>
        {state.view === 'wizard' ? (
          <Wizard state={state} dispatch={dispatch} />
        ) : (
          <Results design={design} state={state} dispatch={dispatch} />
        )}
      </ErrorBoundary>
    </main>
  )
}
```

`sizeSystem` runs during render, so a throw happens before the boundary can catch it from a child. If the App test for hostile URLs ever surfaces that, move the `useMemo` inside a small `<Design>` child that the boundary wraps. Do not add a try/catch that returns a half-design — a design the engine refused to produce must not be rendered as if it were real.

Give `App` a stylesheet only if the header needs it; the tokens already carry the page.

- [ ] **Step 5: Delete the Phase 1 dump**

```bash
git rm src/ui/DesignDump.tsx src/ui/DesignDump.test.tsx
```

- [ ] **Step 6: Run the whole suite**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green. The DesignDump tests are gone; every other test from Tasks 1–14 passes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): wire the wizard, results and URL together"
```

---

### Task 16: Real-browser acceptance pass

**Files:** none created. This task changes code only if it finds something.

**Interfaces:** none.

Every task so far proved itself in jsdom. jsdom does not lay anything out, has no viewport, and cannot tell you that the sidebar covers the results at 380 px or that the accent green is unreadable on the off-white ground. This step is not optional and must not be reported as done from test output alone.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Note the URL it prints (usually `http://localhost:5173`).

- [ ] **Step 2: Walk the wizard as a beginner would**

In a real browser, at a phone-width viewport (around 390 px):

1. Confirm the wizard opens at "What are you building?" with no Back button.
2. Use the "Not sure?" path: answer that you have mains and it cuts often, and confirm it selects "Mains, but it cuts".
3. Move through location, usage (bill path, 250 units), and preferences.
4. Confirm every screen has a "Not sure?" and that no term you would not know appears without a dotted underline.
5. Reach the results.

- [ ] **Step 3: Exercise the live sidebar**

1. Change units from 250 to 900 and confirm the panel count and battery size both rise.
2. Switch the system to "Reliable mains" and confirm the battery and charge controller cards disappear and the surge figure drops.
3. Switch back to "Mains, but it cuts" and confirm they return.
4. Switch the district to Nuwara Eliya and confirm the panel count changes.

- [ ] **Step 4: Verify the URL is a real share link**

1. Copy the address bar.
2. Open it in a new tab.
3. Confirm it opens directly on results with identical figures and no wizard.
4. Press the browser Back button once and confirm it leaves the app rather than stepping through your edits.

- [ ] **Step 5: Check the layout at both sizes**

At 390 px and at 1280 px: no horizontal scrolling, the sidebar reachable without scrolling past the whole results page on mobile, and sticky beside the results on desktop. Open "Show me the maths" and confirm long substituted formulas scroll inside their own box rather than widening the page.

- [ ] **Step 6: Record the outcome**

Append what you exercised, and anything you fixed, to `docs/superpowers/phase-1-execution-log.md` under a Phase 2 heading — the Phase 1 log is where this project keeps its rulings, and a reviewer will look there.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(ui): corrections from the real-browser acceptance pass"
```

If nothing needed fixing, commit only the log entry.

---

## Definition of Done

- All sixteen tasks complete, each reviewed.
- `npm test`, `npm run typecheck` and `npm run build` all pass.
- The six acceptance criteria in §12 of the Phase 2 spec verified in a real browser, not in jsdom.
- No new dependency in `package.json`.
- No `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie` anywhere in `src`, enforced by test.
