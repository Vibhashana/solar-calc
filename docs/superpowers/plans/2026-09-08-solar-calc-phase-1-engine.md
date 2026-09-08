# Solar Calculator — Phase 1 (Sizing Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure TypeScript sizing engine and its data tables, so that a real solar system design can be computed from real inputs and verified against hand-worked golden cases.

**Architecture:** All calculation lives in `src/engine/`, which imports nothing from React and performs no I/O. Every computed number is returned as a `Sized<T>` — a value bound to its own plain-language explanation — so a result cannot exist without the text that explains it. `sizeSystem()` orchestrates the modules along a system-type-dependent pipeline and returns one `SystemDesign` object. Phase 1 ends with an intentionally unstyled page that renders that object, proving the engine end to end.

**Tech Stack:** Vite, React 18, TypeScript (strict), Vitest. No other runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-08-solar-calc-design.md`

## Global Constraints

These apply to every task below without being repeated.

- **No runtime dependencies** beyond `react` and `react-dom`. No chart library, no state library, no router, no UI kit, no date library, no HTTP client. Dev dependencies are limited to `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, and `@types/*`.
- **`src/engine/**` and `src/data/**` must not import from `react`, `src/ui/**`, or `src/state/**`.** The dependency arrow points one way only. A test enforces this (Task 15).
- **TypeScript `strict: true`.** No `any`, no non-null assertions (`!`), no `@ts-ignore`.
- **Every engine function that returns a number returns `Sized<number>`, never a bare `number`.** Internal helpers may return bare numbers; anything reaching `SystemDesign` is wrapped.
- **Explanation text is written for someone who has never installed a solar panel.** `explain.plain` must contain no unexplained jargon and no formula notation. Formula notation belongs in `explain.formula` and `explain.substituted`.
- **Units are metric.** kWh, kW, W, V, A, mm², m², °C.
- **Numbers in `explain.substituted` are rounded to at most 2 decimal places** so the arithmetic is readable.
- **No invented real-world data.** Peak sun hours come from the NASA POWER API via a committed generator script. Tariffs are out of scope for Phase 1. Component specifications are labelled as representative defaults and are user-overridable.
- **Every commit message ends with:**
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01JEb9EJKqn9ytxL4UzydazV
  ```

## File Structure

| File | Responsibility |
|---|---|
| `src/engine/types.ts` | All domain types. No logic. |
| `src/engine/sized.ts` | The `sized()` constructor and rounding helper. |
| `src/engine/defaults.ts` | Every tunable constant, in one place. |
| `src/engine/loads.ts` | Load input → `DailyLoadProfile`. |
| `src/engine/inverter.ts` | Load or array → `InverterSpec`. |
| `src/engine/voltage.ts` | Inverter kW → bus voltage. |
| `src/engine/solar.ts` | Derate, design PSH, array sizing. |
| `src/engine/battery.ts` | Night load + autonomy → bank. |
| `src/engine/controller.ts` | Array + bus voltage → controller. |
| `src/engine/validate.ts` | `SystemDesign` → warnings. |
| `src/engine/sizeSystem.ts` | Pipeline orchestration and branching. |
| `src/data/appliances.ts` | Appliance catalog. |
| `src/data/psh.ts` | **Generated.** Monthly PSH per district. |
| `src/data/components.ts` | Panel/battery/inverter/controller specs. |
| `scripts/fetch-psh.ts` | Generates `src/data/psh.ts` from NASA POWER. |
| `src/ui/DesignDump.tsx` | Phase 1 only: unstyled render of a `SystemDesign`. |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`
- Test: `src/engine/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` and `npm run dev`.

- [ ] **Step 1: Initialise the repository and write `package.json`**

```bash
cd /e/Sahan/solar-calc
git init
```

```json
{
  "name": "solar-calc",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "fetch:psh": "tsx scripts/fetch-psh.ts"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 3: Write `vite.config.ts`, `index.html`, and the React entry point**

`vite.config.ts` — note the import is from `vitest/config`, not `vite`. Vite's own `defineConfig` does not accept a `test` key, and `npm run typecheck` fails if you import it from `vite`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
})
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Solar System Calculator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx`:
```tsx
export function App() {
  return <h1>Solar System Calculator</h1>
}
```

`.gitignore`:
```
node_modules
dist
.remember
*.local
```

- [ ] **Step 4: Write the smoke test**

`src/engine/smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

describe('toolchain', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Install and verify**

Run: `npm install && npm test && npm run typecheck`
Expected: one passing test, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript + Vitest"
```

---

### Task 2: Domain types and the `sized()` constructor

**Files:**
- Create: `src/engine/types.ts`, `src/engine/sized.ts`
- Test: `src/engine/sized.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every type used by every later task, plus
  `sized<T>(value: T, unit: string, explain: Explanation): Sized<T>` and
  `round2(n: number): number`.

- [ ] **Step 1: Write `src/engine/types.ts`**

```ts
export type SystemType = 'off-grid' | 'hybrid' | 'grid-tied'
export type UsageWindow = 'day' | 'night' | 'both'
export type BusVoltage = 12 | 24 | 48
export type ControllerType = 'MPPT' | 'PWM'

export interface Explanation {
  /** Plain language, no jargon, no formula notation. */
  plain: string
  /** Symbolic form, e.g. "panels = ceil(dailyKwh / (psh x panelKw x derate))" */
  formula: string
  /** Same formula with real numbers substituted, ending in "= result". */
  substituted: string
  assumptions: string[]
}

export interface Sized<T> {
  value: T
  unit: string
  explain: Explanation
}

export interface Appliance {
  id: string
  name: string
  category: string
  watts: number
  /** Startup draw as a multiple of running watts. Resistive loads are 1. */
  surgeFactor: number
  defaultHoursPerDay: number
  defaultUsageWindow: UsageWindow
}

export interface ApplianceEntry {
  applianceId: string
  quantity: number
  hoursPerDay: number
  usageWindow: UsageWindow
}

export type LoadInput =
  | { mode: 'bill'; monthlyKwh: number; nightFraction: number }
  | { mode: 'appliances'; entries: ApplianceEntry[] }

export interface DerateFactors {
  soiling: number
  temperature: number
  wiring: number
  conversion: number
}

export interface PanelSpec {
  id: string
  name: string
  watts: number
  areaM2: number
  vocVolts: number
  /** Percent change in Voc per °C, negative. */
  vocTempCoefficientPctPerC: number
}

export interface BatteryModuleSpec {
  id: string
  name: string
  nominalVolts: number
  ampHours: number
  /** Maximum charge rate as a fraction of capacity per hour. */
  maxChargeC: number
}

export interface SystemInputs {
  systemType: SystemType
  districtId: string
  /** Overrides the district table when present, in kWh/m2/day. */
  pshOverride?: number
  load: LoadInput
  autonomyDays: number
  panelId: string
  batteryModuleId: string
  diversityFactor: number
  derate: DerateFactors
  /** Coldest expected morning temperature, for Voc checking. */
  minAmbientC: number
}

export interface DailyLoadProfile {
  dailyKwh: Sized<number>
  dayKwh: Sized<number>
  nightKwh: Sized<number>
  continuousPeakW: Sized<number>
  surgePeakW: Sized<number>
  /** True when peak was inferred from a bill rather than an appliance list. */
  isPeakEstimated: boolean
}

export interface InverterSpec {
  continuousW: Sized<number>
  surgeRequiredW: Sized<number>
}

export interface ArraySpec {
  designPsh: Sized<number>
  derateTotal: Sized<number>
  requiredPvKw: Sized<number>
  panelCount: Sized<number>
  installedPvKw: Sized<number>
  roofAreaM2: Sized<number>
}

export interface BatterySpec {
  usableKwh: Sized<number>
  nominalKwh: Sized<number>
  bankAh: Sized<number>
  modulesInSeries: Sized<number>
  modulesInParallel: Sized<number>
}

export interface ControllerSpec {
  amps: Sized<number>
  type: Sized<ControllerType>
  maxStringVoc: Sized<number>
}

export interface Warning {
  id: string
  severity: 'info' | 'caution'
  message: string
}

export interface SystemDesign {
  inputs: SystemInputs
  load: DailyLoadProfile
  array: ArraySpec
  inverter: InverterSpec
  /** Null for grid-tied systems, which have no battery bus. */
  busVoltage: Sized<BusVoltage> | null
  battery: BatterySpec | null
  controller: ControllerSpec | null
  warnings: Warning[]
}
```

- [ ] **Step 2: Write the failing test**

`src/engine/sized.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { round2, sized } from './sized'

describe('round2', () => {
  it('rounds to two decimal places', () => {
    expect(round2(12.3456)).toBe(12.35)
  })

  it('leaves whole numbers alone', () => {
    expect(round2(8)).toBe(8)
  })

  it('does not produce negative zero', () => {
    expect(Object.is(round2(-0.001), 0)).toBe(true)
  })
})

describe('sized', () => {
  it('binds a value to its explanation', () => {
    const result = sized(8, 'panels', {
      plain: 'You need 8 panels.',
      formula: 'panels = ceil(a / b)',
      substituted: 'ceil(12.4 / 1.8) = 8',
      assumptions: ['550 W panels'],
    })
    expect(result.value).toBe(8)
    expect(result.unit).toBe('panels')
    expect(result.explain.plain).toBe('You need 8 panels.')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/engine/sized.test.ts`
Expected: FAIL — cannot resolve `./sized`.

- [ ] **Step 4: Write `src/engine/sized.ts`**

```ts
import type { Explanation, Sized } from './types'

/** Rounds to 2 decimal places so substituted arithmetic stays readable. */
export function round2(n: number): number {
  const r = Math.round(n * 100) / 100
  return r === 0 ? 0 : r
}

export function sized<T>(value: T, unit: string, explain: Explanation): Sized<T> {
  return { value, unit, explain }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/engine/sized.test.ts && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/sized.ts src/engine/sized.test.ts
git commit -m "feat(engine): add domain types and Sized constructor"
```

---

### Task 3: Default constants

**Files:**
- Create: `src/engine/defaults.ts`
- Test: `src/engine/defaults.test.ts`

**Interfaces:**
- Consumes: `DerateFactors` from Task 2.
- Produces: `DERATE_DEFAULTS: DerateFactors`, `DEFAULTS`, `INVERTER_MARKET_SIZES_W`, `BUS_VOLTAGE_THRESHOLDS_W`, `defaultInputs(systemType, districtId): SystemInputs`.

- [ ] **Step 1: Write the failing test**

`src/engine/defaults.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { DEFAULTS, INVERTER_MARKET_SIZES_W, defaultInputs } from './defaults'

describe('DEFAULTS', () => {
  it('uses the agreed diversity factor', () => {
    expect(DEFAULTS.diversityFactor).toBe(0.65)
  })

  it('combines derate factors to approximately 0.78', () => {
    const { soiling, temperature, wiring, conversion } = DEFAULTS.derate
    expect(soiling * temperature * wiring * conversion).toBeCloseTo(0.78, 2)
  })

  it('lists inverter market sizes in ascending order', () => {
    const sorted = [...INVERTER_MARKET_SIZES_W].sort((a, b) => a - b)
    expect(INVERTER_MARKET_SIZES_W).toEqual(sorted)
  })
})

describe('defaultInputs', () => {
  it('gives off-grid two days of autonomy', () => {
    expect(defaultInputs('off-grid', 'colombo').autonomyDays).toBe(2)
  })

  it('gives hybrid half a day of autonomy', () => {
    expect(defaultInputs('hybrid', 'colombo').autonomyDays).toBe(0.5)
  })

  it('gives grid-tied no autonomy', () => {
    expect(defaultInputs('grid-tied', 'colombo').autonomyDays).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/defaults.test.ts`
Expected: FAIL — cannot resolve `./defaults`.

- [ ] **Step 3: Write `src/engine/defaults.ts`**

```ts
import type { DerateFactors, SystemInputs, SystemType } from './types'

export const DERATE_DEFAULTS: DerateFactors = {
  soiling: 0.95,
  temperature: 0.89,
  wiring: 0.97,
  conversion: 0.95,
}

export const DEFAULTS = {
  diversityFactor: 0.65,
  derate: DERATE_DEFAULTS,
  /** Domestic loads skew towards the evening. */
  billNightFraction: 0.6,
  /** Ratio of peak demand to mean demand, used only on the bill path. */
  billPeakToMeanRatio: 3.5,
  /** Days per month, averaged over a Gregorian year. */
  daysPerMonth: 30.44,
  autonomyDays: { 'off-grid': 2, hybrid: 0.5, 'grid-tied': 0 } as const,
  battery: { depthOfDischarge: 0.85, roundTripEfficiency: 0.95 },
  /**
   * How many worst-month days may pass before a flat bank is refilled while
   * still running the house. Refilling in a single day is not a realistic
   * target — a 2-day bank inherently needs 2 to 3 days — so this only warns
   * when recovery is genuinely slow.
   */
  maxAcceptableRechargeDays: 3,
  inverter: { continuousHeadroom: 1.25, surgeHoldSeconds: 5 },
  controller: { headroom: 1.25, mpptThresholdW: 400 },
  /** Grid-tied DC:AC overbuild. */
  gridTiedDcAcRatio: 1.15,
  defaultPanelId: 'generic-550',
  defaultBatteryModuleId: 'lfp-51v-100ah',
  /** Coolest morning in the Sri Lankan lowlands; hill country is colder. */
  minAmbientC: 18,
} as const

export const INVERTER_MARKET_SIZES_W = [
  1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000,
] as const

export const BUS_VOLTAGE_THRESHOLDS_W = { to12V: 1000, to24V: 3000 } as const

export function defaultInputs(systemType: SystemType, districtId: string): SystemInputs {
  return {
    systemType,
    districtId,
    load: { mode: 'bill', monthlyKwh: 200, nightFraction: DEFAULTS.billNightFraction },
    autonomyDays: DEFAULTS.autonomyDays[systemType],
    panelId: DEFAULTS.defaultPanelId,
    batteryModuleId: DEFAULTS.defaultBatteryModuleId,
    diversityFactor: DEFAULTS.diversityFactor,
    derate: { ...DERATE_DEFAULTS },
    minAmbientC: DEFAULTS.minAmbientC,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/defaults.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/defaults.ts src/engine/defaults.test.ts
git commit -m "feat(engine): add default constants and input factory"
```

---

### Task 4: Appliance catalog

**Files:**
- Create: `src/data/appliances.ts`
- Test: `src/data/appliances.test.ts`

**Interfaces:**
- Consumes: `Appliance` from Task 2.
- Produces: `APPLIANCES: Appliance[]`, `findAppliance(id): Appliance | undefined`.

Wattages below are typical figures for the Sri Lankan domestic market and are user-overridable in the UI. They are starting points, not measurements.

- [ ] **Step 1: Write the failing test**

`src/data/appliances.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { APPLIANCES, findAppliance } from './appliances'

describe('APPLIANCES', () => {
  it('has unique ids', () => {
    const ids = APPLIANCES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('draws positive power for every entry', () => {
    for (const a of APPLIANCES) expect(a.watts).toBeGreaterThan(0)
  })

  it('never has a surge factor below 1', () => {
    for (const a of APPLIANCES) expect(a.surgeFactor).toBeGreaterThanOrEqual(1)
  })

  it('keeps default runtime within a day', () => {
    for (const a of APPLIANCES) {
      expect(a.defaultHoursPerDay).toBeGreaterThan(0)
      expect(a.defaultHoursPerDay).toBeLessThanOrEqual(24)
    }
  })

  it('gives motor loads a surge factor above 1', () => {
    const motors = ['fridge', 'water-pump', 'air-conditioner-12k', 'washing-machine']
    for (const id of motors) {
      const a = findAppliance(id)
      expect(a).toBeDefined()
      expect(a?.surgeFactor).toBeGreaterThan(1)
    }
  })
})

describe('findAppliance', () => {
  it('returns undefined for an unknown id', () => {
    expect(findAppliance('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/appliances.test.ts`
Expected: FAIL — cannot resolve `./appliances`.

- [ ] **Step 3: Write `src/data/appliances.ts`**

```ts
import type { Appliance } from '../engine/types'

/**
 * Typical wattages for the Sri Lankan domestic market. These are starting
 * points for planning, not measurements; every value is editable in the UI.
 * Surge factors express startup draw as a multiple of running watts.
 */
export const APPLIANCES: Appliance[] = [
  // Lighting
  { id: 'led-bulb', name: 'LED bulb', category: 'Lighting', watts: 9, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'led-tube', name: 'LED tube light', category: 'Lighting', watts: 20, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'cfl-bulb', name: 'CFL bulb', category: 'Lighting', watts: 20, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },

  // Cooling
  { id: 'ceiling-fan', name: 'Ceiling fan', category: 'Cooling', watts: 75, surgeFactor: 2, defaultHoursPerDay: 8, defaultUsageWindow: 'both' },
  { id: 'stand-fan', name: 'Stand fan', category: 'Cooling', watts: 55, surgeFactor: 2, defaultHoursPerDay: 6, defaultUsageWindow: 'both' },
  { id: 'air-conditioner-12k', name: 'Air conditioner (12,000 BTU)', category: 'Cooling', watts: 1100, surgeFactor: 3, defaultHoursPerDay: 6, defaultUsageWindow: 'night' },
  { id: 'air-conditioner-18k', name: 'Air conditioner (18,000 BTU)', category: 'Cooling', watts: 1700, surgeFactor: 3, defaultHoursPerDay: 6, defaultUsageWindow: 'night' },

  // Kitchen
  { id: 'fridge', name: 'Refrigerator', category: 'Kitchen', watts: 150, surgeFactor: 3, defaultHoursPerDay: 8, defaultUsageWindow: 'both' },
  { id: 'chest-freezer', name: 'Chest freezer', category: 'Kitchen', watts: 200, surgeFactor: 3, defaultHoursPerDay: 9, defaultUsageWindow: 'both' },
  { id: 'rice-cooker', name: 'Rice cooker', category: 'Kitchen', watts: 700, surgeFactor: 1, defaultHoursPerDay: 1, defaultUsageWindow: 'both' },
  { id: 'electric-kettle', name: 'Electric kettle', category: 'Kitchen', watts: 1500, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'both' },
  { id: 'microwave', name: 'Microwave oven', category: 'Kitchen', watts: 1200, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'both' },
  { id: 'blender', name: 'Blender / grinder', category: 'Kitchen', watts: 400, surgeFactor: 2, defaultHoursPerDay: 0.25, defaultUsageWindow: 'day' },

  // Laundry and water
  { id: 'washing-machine', name: 'Washing machine', category: 'Laundry & water', watts: 500, surgeFactor: 3, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
  { id: 'iron', name: 'Clothes iron', category: 'Laundry & water', watts: 1000, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'day' },
  { id: 'water-pump', name: 'Water pump', category: 'Laundry & water', watts: 750, surgeFactor: 4, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
  { id: 'water-heater', name: 'Instant water heater', category: 'Laundry & water', watts: 3000, surgeFactor: 1, defaultHoursPerDay: 0.5, defaultUsageWindow: 'both' },

  // Electronics
  { id: 'tv-led-32', name: 'LED television (32 in)', category: 'Electronics', watts: 60, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'tv-led-55', name: 'LED television (55 in)', category: 'Electronics', watts: 120, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'laptop', name: 'Laptop', category: 'Electronics', watts: 65, surgeFactor: 1, defaultHoursPerDay: 6, defaultUsageWindow: 'both' },
  { id: 'desktop-pc', name: 'Desktop computer', category: 'Electronics', watts: 250, surgeFactor: 1, defaultHoursPerDay: 6, defaultUsageWindow: 'both' },
  { id: 'wifi-router', name: 'Wi-Fi router', category: 'Electronics', watts: 12, surgeFactor: 1, defaultHoursPerDay: 24, defaultUsageWindow: 'both' },
  { id: 'phone-charger', name: 'Phone charger', category: 'Electronics', watts: 15, surgeFactor: 1, defaultHoursPerDay: 3, defaultUsageWindow: 'night' },

  // Workshop
  { id: 'power-tools', name: 'Power tools', category: 'Workshop', watts: 800, surgeFactor: 3, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
  { id: 'welding-machine', name: 'Welding machine', category: 'Workshop', watts: 3500, surgeFactor: 2, defaultHoursPerDay: 0.5, defaultUsageWindow: 'day' },
]

export function findAppliance(id: string): Appliance | undefined {
  return APPLIANCES.find((a) => a.id === id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/appliances.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/appliances.ts src/data/appliances.test.ts
git commit -m "feat(data): add Sri Lankan domestic appliance catalog"
```

---

### Task 5: Peak sun hours table, generated from NASA POWER

**Files:**
- Create: `scripts/fetch-psh.ts`, `src/data/psh.ts` (generated)
- Test: `src/data/psh.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `DISTRICTS: District[]`, `PSH_SOURCE: { name: string; url: string; fetchedOn: string }`,
  `findDistrict(id): District | undefined`,
  `worstMonthPsh(d): number`, `annualMeanPsh(d): number`, where
  `District = { id: string; name: string; latitude: number; longitude: number; monthlyPsh: number[] }`
  and `monthlyPsh` has exactly 12 entries in kWh/m²/day, January first.

**This table must not be hand-written.** NASA POWER's climatology endpoint returns
long-term monthly mean all-sky insolation in kWh/m²/day, which is numerically
identical to peak sun hours. The script fetches it; the generated file is committed
so the app stays offline.

- [ ] **Step 1: Write the generator script**

`scripts/fetch-psh.ts`:
```ts
/**
 * Regenerates src/data/psh.ts from the NASA POWER climatology API.
 * Run with: npm run fetch:psh
 *
 * Parameter ALLSKY_SFC_SW_DWN is long-term monthly mean all-sky surface
 * shortwave downward irradiance in kWh/m^2/day, which equals peak sun hours.
 */
import { writeFileSync } from 'node:fs'

interface Place {
  id: string
  name: string
  latitude: number
  longitude: number
}

const DISTRICT_CAPITALS: Place[] = [
  { id: 'colombo', name: 'Colombo', latitude: 6.93, longitude: 79.86 },
  { id: 'gampaha', name: 'Gampaha', latitude: 7.09, longitude: 80.0 },
  { id: 'kalutara', name: 'Kalutara', latitude: 6.58, longitude: 79.96 },
  { id: 'kandy', name: 'Kandy', latitude: 7.29, longitude: 80.63 },
  { id: 'matale', name: 'Matale', latitude: 7.47, longitude: 80.62 },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', latitude: 6.97, longitude: 80.79 },
  { id: 'galle', name: 'Galle', latitude: 6.05, longitude: 80.22 },
  { id: 'matara', name: 'Matara', latitude: 5.95, longitude: 80.54 },
  { id: 'hambantota', name: 'Hambantota', latitude: 6.12, longitude: 81.12 },
  { id: 'jaffna', name: 'Jaffna', latitude: 9.66, longitude: 80.02 },
  { id: 'kilinochchi', name: 'Kilinochchi', latitude: 9.4, longitude: 80.4 },
  { id: 'mannar', name: 'Mannar', latitude: 8.98, longitude: 79.9 },
  { id: 'vavuniya', name: 'Vavuniya', latitude: 8.75, longitude: 80.5 },
  { id: 'mullaitivu', name: 'Mullaitivu', latitude: 9.27, longitude: 80.81 },
  { id: 'batticaloa', name: 'Batticaloa', latitude: 7.71, longitude: 81.69 },
  { id: 'ampara', name: 'Ampara', latitude: 7.3, longitude: 81.67 },
  { id: 'trincomalee', name: 'Trincomalee', latitude: 8.59, longitude: 81.21 },
  { id: 'kurunegala', name: 'Kurunegala', latitude: 7.49, longitude: 80.36 },
  { id: 'puttalam', name: 'Puttalam', latitude: 8.03, longitude: 79.83 },
  { id: 'anuradhapura', name: 'Anuradhapura', latitude: 8.31, longitude: 80.4 },
  { id: 'polonnaruwa', name: 'Polonnaruwa', latitude: 7.94, longitude: 81.0 },
  { id: 'badulla', name: 'Badulla', latitude: 6.99, longitude: 81.06 },
  { id: 'monaragala', name: 'Monaragala', latitude: 6.87, longitude: 81.35 },
  { id: 'ratnapura', name: 'Ratnapura', latitude: 6.68, longitude: 80.4 },
  { id: 'kegalle', name: 'Kegalle', latitude: 7.25, longitude: 80.35 },
]

const MONTH_KEYS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const

async function fetchMonthlyPsh(place: Place): Promise<number[]> {
  const url =
    'https://power.larc.nasa.gov/api/temporal/climatology/point' +
    `?parameters=ALLSKY_SFC_SW_DWN&community=RE` +
    `&latitude=${place.latitude}&longitude=${place.longitude}&format=JSON`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`${place.id}: HTTP ${response.status}`)

  const body = (await response.json()) as {
    properties: { parameter: { ALLSKY_SFC_SW_DWN: Record<string, number> } }
  }
  const monthly = body.properties.parameter.ALLSKY_SFC_SW_DWN

  return MONTH_KEYS.map((key) => {
    const value = monthly[key]
    if (typeof value !== 'number' || value <= 0) {
      throw new Error(`${place.id}: missing or invalid value for ${key}`)
    }
    return Math.round(value * 100) / 100
  })
}

async function main(): Promise<void> {
  const rows: string[] = []
  for (const place of DISTRICT_CAPITALS) {
    const monthlyPsh = await fetchMonthlyPsh(place)
    rows.push(
      `  { id: '${place.id}', name: '${place.name}', latitude: ${place.latitude}, ` +
        `longitude: ${place.longitude}, monthlyPsh: [${monthlyPsh.join(', ')}] },`,
    )
    console.log(`fetched ${place.id}`)
  }

  const file = `// GENERATED FILE - DO NOT EDIT BY HAND.
// Regenerate with: npm run fetch:psh
//
// Source: NASA POWER, parameter ALLSKY_SFC_SW_DWN (climatology),
//         https://power.larc.nasa.gov/
// Units:  kWh/m^2/day, which is numerically equal to peak sun hours.
// Fetched: ${new Date().toISOString().slice(0, 10)}

export interface District {
  id: string
  name: string
  latitude: number
  longitude: number
  /** 12 entries, January first, in kWh/m2/day. */
  monthlyPsh: number[]
}

export const PSH_SOURCE = {
  name: 'NASA POWER climatology (ALLSKY_SFC_SW_DWN)',
  url: 'https://power.larc.nasa.gov/',
  fetchedOn: '${new Date().toISOString().slice(0, 10)}',
} as const

export const DISTRICTS: District[] = [
${rows.join('\n')}
]

export function findDistrict(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id)
}

export function worstMonthPsh(district: District): number {
  return Math.min(...district.monthlyPsh)
}

export function annualMeanPsh(district: District): number {
  const total = district.monthlyPsh.reduce((sum, v) => sum + v, 0)
  return Math.round((total / district.monthlyPsh.length) * 100) / 100
}
`
  writeFileSync(new URL('../src/data/psh.ts', import.meta.url), file, 'utf8')
  console.log(`wrote ${DISTRICT_CAPITALS.length} districts`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
```

- [ ] **Step 2: Write the failing test**

`src/data/psh.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { DISTRICTS, PSH_SOURCE, annualMeanPsh, findDistrict, worstMonthPsh } from './psh'

describe('DISTRICTS', () => {
  it('covers all 25 districts', () => {
    expect(DISTRICTS).toHaveLength(25)
  })

  it('has unique ids', () => {
    const ids = DISTRICTS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has twelve monthly values per district', () => {
    for (const d of DISTRICTS) expect(d.monthlyPsh).toHaveLength(12)
  })

  it('reports peak sun hours in a physically plausible tropical range', () => {
    for (const d of DISTRICTS) {
      for (const psh of d.monthlyPsh) {
        expect(psh).toBeGreaterThan(2.5)
        expect(psh).toBeLessThan(8)
      }
    }
  })

  it('places every district within Sri Lanka', () => {
    for (const d of DISTRICTS) {
      expect(d.latitude).toBeGreaterThan(5.8)
      expect(d.latitude).toBeLessThan(10)
      expect(d.longitude).toBeGreaterThan(79.5)
      expect(d.longitude).toBeLessThan(82)
    }
  })

  it('records its provenance', () => {
    expect(PSH_SOURCE.url).toContain('nasa.gov')
    expect(PSH_SOURCE.fetchedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('worstMonthPsh / annualMeanPsh', () => {
  it('returns the minimum and the mean of the monthly series', () => {
    const colombo = findDistrict('colombo')
    expect(colombo).toBeDefined()
    if (!colombo) return
    expect(worstMonthPsh(colombo)).toBe(Math.min(...colombo.monthlyPsh))
    expect(annualMeanPsh(colombo)).toBeGreaterThan(worstMonthPsh(colombo))
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/psh.test.ts`
Expected: FAIL — cannot resolve `./psh`.

- [ ] **Step 4: Generate the data file**

Run: `npm run fetch:psh`
Expected: 25 `fetched <id>` lines, then `wrote 25 districts`, and `src/data/psh.ts` now exists.

If the API is unreachable, stop and report it. Do not hand-write substitute values — an invented irradiance table is indistinguishable from a real one to the user and would silently mis-size every system built with it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/data/psh.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/fetch-psh.ts src/data/psh.ts src/data/psh.test.ts
git commit -m "feat(data): generate district peak sun hours from NASA POWER"
```

---

### Task 6: Component specifications

**Files:**
- Create: `src/data/components.ts`
- Test: `src/data/components.test.ts`

**Interfaces:**
- Consumes: `PanelSpec`, `BatteryModuleSpec` from Task 2.
- Produces: `PANELS: PanelSpec[]`, `BATTERY_MODULES: BatteryModuleSpec[]`,
  `findPanel(id): PanelSpec | undefined`, `findBatteryModule(id): BatteryModuleSpec | undefined`.

Phase 1 carries electrical specifications only. Pricing arrives in Phase 3, where it belongs with the economics module.

- [ ] **Step 1: Write the failing test**

`src/data/components.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { BATTERY_MODULES, PANELS, findBatteryModule, findPanel } from './components'
import { DEFAULTS } from '../engine/defaults'

describe('PANELS', () => {
  it('has unique ids', () => {
    const ids = PANELS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every panel a positive rating and area', () => {
    for (const p of PANELS) {
      expect(p.watts).toBeGreaterThan(0)
      expect(p.areaM2).toBeGreaterThan(0)
    }
  })

  it('has a negative Voc temperature coefficient', () => {
    for (const p of PANELS) expect(p.vocTempCoefficientPctPerC).toBeLessThan(0)
  })

  it('contains the default panel', () => {
    expect(findPanel(DEFAULTS.defaultPanelId)).toBeDefined()
  })
})

describe('BATTERY_MODULES', () => {
  it('contains the default module', () => {
    expect(findBatteryModule(DEFAULTS.defaultBatteryModuleId)).toBeDefined()
  })

  it('gives every module a positive capacity and charge rate', () => {
    for (const m of BATTERY_MODULES) {
      expect(m.ampHours).toBeGreaterThan(0)
      expect(m.nominalVolts).toBeGreaterThan(0)
      expect(m.maxChargeC).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/components.test.ts`
Expected: FAIL — cannot resolve `./components`.

- [ ] **Step 3: Write `src/data/components.ts`**

```ts
import type { BatteryModuleSpec, PanelSpec } from '../engine/types'

/**
 * Representative specifications for commonly available hardware. These are
 * planning defaults, not endorsements or a supplier catalog; the user can
 * override any figure with the datasheet values of the parts they buy.
 */
export const PANELS: PanelSpec[] = [
  { id: 'generic-450', name: '450 W monocrystalline', watts: 450, areaM2: 2.1, vocVolts: 49.3, vocTempCoefficientPctPerC: -0.27 },
  { id: 'generic-550', name: '550 W monocrystalline', watts: 550, areaM2: 2.58, vocVolts: 49.9, vocTempCoefficientPctPerC: -0.27 },
  { id: 'generic-600', name: '600 W monocrystalline', watts: 600, areaM2: 2.79, vocVolts: 55.1, vocTempCoefficientPctPerC: -0.26 },
  { id: 'generic-330', name: '330 W polycrystalline', watts: 330, areaM2: 1.95, vocVolts: 45.9, vocTempCoefficientPctPerC: -0.31 },
]

export const BATTERY_MODULES: BatteryModuleSpec[] = [
  { id: 'lfp-12v-100ah', name: 'LiFePO4 12 V 100 Ah', nominalVolts: 12.8, ampHours: 100, maxChargeC: 0.5 },
  { id: 'lfp-12v-200ah', name: 'LiFePO4 12 V 200 Ah', nominalVolts: 12.8, ampHours: 200, maxChargeC: 0.5 },
  { id: 'lfp-24v-100ah', name: 'LiFePO4 24 V 100 Ah', nominalVolts: 25.6, ampHours: 100, maxChargeC: 0.5 },
  { id: 'lfp-51v-100ah', name: 'LiFePO4 51.2 V 100 Ah rack', nominalVolts: 51.2, ampHours: 100, maxChargeC: 0.5 },
  { id: 'lfp-51v-200ah', name: 'LiFePO4 51.2 V 200 Ah rack', nominalVolts: 51.2, ampHours: 200, maxChargeC: 0.5 },
]

export function findPanel(id: string): PanelSpec | undefined {
  return PANELS.find((p) => p.id === id)
}

export function findBatteryModule(id: string): BatteryModuleSpec | undefined {
  return BATTERY_MODULES.find((m) => m.id === id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/components.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/components.ts src/data/components.test.ts
git commit -m "feat(data): add representative panel and battery specifications"
```

---

### Task 7: Load profile

**Files:**
- Create: `src/engine/loads.ts`
- Test: `src/engine/loads.test.ts`

**Interfaces:**
- Consumes: `LoadInput`, `DailyLoadProfile`, `Appliance` (Task 2); `DEFAULTS` (Task 3); `APPLIANCES` (Task 4).
- Produces: `computeLoadProfile(load: LoadInput, diversityFactor: number, catalog?: Appliance[]): DailyLoadProfile`.

- [ ] **Step 1: Write the failing test**

`src/engine/loads.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { computeLoadProfile } from './loads'
import { DEFAULTS } from './defaults'
import type { Appliance } from './types'

const catalog: Appliance[] = [
  { id: 'lamp', name: 'Lamp', category: 'Lighting', watts: 100, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
  { id: 'pump', name: 'Pump', category: 'Water', watts: 1000, surgeFactor: 4, defaultHoursPerDay: 1, defaultUsageWindow: 'day' },
]

describe('computeLoadProfile — appliance path', () => {
  it('sums energy across entries', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [
        { applianceId: 'lamp', quantity: 4, hoursPerDay: 5, usageWindow: 'night' },
        { applianceId: 'pump', quantity: 1, hoursPerDay: 1, usageWindow: 'day' },
      ] },
      DEFAULTS.diversityFactor,
      catalog,
    )
    // 4 x 100 x 5 = 2000 Wh, plus 1 x 1000 x 1 = 1000 Wh -> 3.0 kWh
    expect(profile.dailyKwh.value).toBeCloseTo(3.0, 3)
    expect(profile.nightKwh.value).toBeCloseTo(2.0, 3)
    expect(profile.dayKwh.value).toBeCloseTo(1.0, 3)
  })

  it('splits a both-window appliance evenly', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 1, hoursPerDay: 10, usageWindow: 'both' }] },
      DEFAULTS.diversityFactor,
      catalog,
    )
    expect(profile.dayKwh.value).toBeCloseTo(0.5, 3)
    expect(profile.nightKwh.value).toBeCloseTo(0.5, 3)
  })

  it('applies the diversity factor to connected load', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 10, hoursPerDay: 1, usageWindow: 'night' }] },
      0.65,
      catalog,
    )
    // 10 x 100 W = 1000 W connected, x 0.65 = 650 W
    expect(profile.continuousPeakW.value).toBeCloseTo(650, 3)
  })

  it('adds the largest single surge on top of continuous peak', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [
        { applianceId: 'lamp', quantity: 1, hoursPerDay: 1, usageWindow: 'night' },
        { applianceId: 'pump', quantity: 1, hoursPerDay: 1, usageWindow: 'day' },
      ] },
      1,
      catalog,
    )
    // continuous 1100 W, largest extra surge = 1000 x (4 - 1) = 3000 W
    expect(profile.continuousPeakW.value).toBeCloseTo(1100, 3)
    expect(profile.surgePeakW.value).toBeCloseTo(4100, 3)
  })

  it('marks appliance-derived peaks as measured, not estimated', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 1, hoursPerDay: 1, usageWindow: 'night' }] },
      1,
      catalog,
    )
    expect(profile.isPeakEstimated).toBe(false)
  })

  it('ignores entries referencing an unknown appliance', () => {
    const profile = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'ghost', quantity: 1, hoursPerDay: 1, usageWindow: 'day' }] },
      1,
      catalog,
    )
    expect(profile.dailyKwh.value).toBe(0)
  })
})

describe('computeLoadProfile — bill path', () => {
  it('converts a monthly bill to a daily figure', () => {
    const profile = computeLoadProfile(
      { mode: 'bill', monthlyKwh: 304.4, nightFraction: 0.6 },
      DEFAULTS.diversityFactor,
    )
    expect(profile.dailyKwh.value).toBeCloseTo(10, 2)
    expect(profile.nightKwh.value).toBeCloseTo(6, 2)
    expect(profile.dayKwh.value).toBeCloseTo(4, 2)
  })

  it('estimates peak from mean demand and flags it', () => {
    const profile = computeLoadProfile(
      { mode: 'bill', monthlyKwh: 304.4, nightFraction: 0.6 },
      DEFAULTS.diversityFactor,
    )
    // 10 kWh/day -> 416.67 W mean -> x 3.5 = 1458.3 W
    expect(profile.continuousPeakW.value).toBeCloseTo(1458.3, 0)
    expect(profile.isPeakEstimated).toBe(true)
  })

  it('says plainly that the peak is an estimate', () => {
    const profile = computeLoadProfile(
      { mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 },
      DEFAULTS.diversityFactor,
    )
    expect(profile.continuousPeakW.explain.plain.toLowerCase()).toContain('estimate')
  })
})

describe('computeLoadProfile — explanations', () => {
  it('explains every value it returns', () => {
    const profile = computeLoadProfile({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 }, 0.65)
    for (const key of ['dailyKwh', 'dayKwh', 'nightKwh', 'continuousPeakW', 'surgePeakW'] as const) {
      expect(profile[key].explain.plain.length).toBeGreaterThan(0)
      expect(profile[key].explain.substituted).toContain('=')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/loads.test.ts`
Expected: FAIL — cannot resolve `./loads`.

- [ ] **Step 3: Write `src/engine/loads.ts`**

```ts
import { APPLIANCES } from '../data/appliances'
import { DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { Appliance, DailyLoadProfile, LoadInput } from './types'

interface Accumulator {
  dayWh: number
  nightWh: number
  connectedW: number
  largestExtraSurgeW: number
}

function accumulate(load: Extract<LoadInput, { mode: 'appliances' }>, catalog: Appliance[]): Accumulator {
  const acc: Accumulator = { dayWh: 0, nightWh: 0, connectedW: 0, largestExtraSurgeW: 0 }

  for (const entry of load.entries) {
    const appliance = catalog.find((a) => a.id === entry.applianceId)
    if (!appliance) continue

    const wh = appliance.watts * entry.quantity * entry.hoursPerDay
    if (entry.usageWindow === 'day') acc.dayWh += wh
    else if (entry.usageWindow === 'night') acc.nightWh += wh
    else {
      acc.dayWh += wh / 2
      acc.nightWh += wh / 2
    }

    acc.connectedW += appliance.watts * entry.quantity
    const extraSurge = appliance.watts * (appliance.surgeFactor - 1)
    if (extraSurge > acc.largestExtraSurgeW) acc.largestExtraSurgeW = extraSurge
  }

  return acc
}

export function computeLoadProfile(
  load: LoadInput,
  diversityFactor: number,
  catalog: Appliance[] = APPLIANCES,
): DailyLoadProfile {
  if (load.mode === 'appliances') {
    const acc = accumulate(load, catalog)
    const dayKwh = acc.dayWh / 1000
    const nightKwh = acc.nightWh / 1000
    const dailyKwh = dayKwh + nightKwh
    const continuousPeakW = acc.connectedW * diversityFactor
    const surgePeakW = continuousPeakW + acc.largestExtraSurgeW

    return {
      dailyKwh: sized(dailyKwh, 'kWh per day', {
        plain: `Your appliances use about ${round2(dailyKwh)} units of electricity a day.`,
        formula: 'dailyKwh = sum(watts x quantity x hoursPerDay) / 1000',
        substituted: `${round2(acc.dayWh + acc.nightWh)} Wh / 1000 = ${round2(dailyKwh)} kWh`,
        assumptions: ['Each appliance runs for the hours you entered, every day.'],
      }),
      dayKwh: sized(dayKwh, 'kWh per day', {
        plain: `About ${round2(dayKwh)} units are used during daylight, when the panels are working.`,
        formula: 'dayKwh = sum(daytime appliance energy) / 1000',
        substituted: `${round2(acc.dayWh)} Wh / 1000 = ${round2(dayKwh)} kWh`,
        assumptions: ['Appliances marked "both" are split evenly between day and night.'],
      }),
      nightKwh: sized(nightKwh, 'kWh per day', {
        plain: `About ${round2(nightKwh)} units are used after dark, so the battery has to cover them.`,
        formula: 'nightKwh = sum(night-time appliance energy) / 1000',
        substituted: `${round2(acc.nightWh)} Wh / 1000 = ${round2(nightKwh)} kWh`,
        assumptions: ['Appliances marked "both" are split evenly between day and night.'],
      }),
      continuousPeakW: sized(continuousPeakW, 'W', {
        plain: `If everything you listed were plugged in you would draw ${round2(acc.connectedW)} watts, but in practice not everything runs at once, so we plan for about ${round2(continuousPeakW)} watts.`,
        formula: 'continuousPeakW = connectedW x diversityFactor',
        substituted: `${round2(acc.connectedW)} x ${diversityFactor} = ${round2(continuousPeakW)} W`,
        assumptions: [`Diversity factor of ${diversityFactor} — roughly two thirds of your appliances running together.`],
      }),
      surgePeakW: sized(surgePeakW, 'W', {
        plain: `Motors draw extra power for a second when they start. Your biggest starter adds ${round2(acc.largestExtraSurgeW)} watts on top, so the inverter must briefly handle about ${round2(surgePeakW)} watts.`,
        formula: 'surgePeakW = continuousPeakW + max(watts x (surgeFactor - 1))',
        substituted: `${round2(continuousPeakW)} + ${round2(acc.largestExtraSurgeW)} = ${round2(surgePeakW)} W`,
        assumptions: ['Only one motor is assumed to start at any given moment.'],
      }),
      isPeakEstimated: false,
    }
  }

  const dailyKwh = load.monthlyKwh / DEFAULTS.daysPerMonth
  const nightKwh = dailyKwh * load.nightFraction
  const dayKwh = dailyKwh - nightKwh
  const meanW = (dailyKwh * 1000) / 24
  const continuousPeakW = meanW * DEFAULTS.billPeakToMeanRatio
  const surgePeakW = continuousPeakW * 2

  return {
    dailyKwh: sized(dailyKwh, 'kWh per day', {
      plain: `A bill of ${round2(load.monthlyKwh)} units a month works out to about ${round2(dailyKwh)} units a day.`,
      formula: 'dailyKwh = monthlyKwh / daysPerMonth',
      substituted: `${round2(load.monthlyKwh)} / ${DEFAULTS.daysPerMonth} = ${round2(dailyKwh)} kWh`,
      assumptions: [`An average month is ${DEFAULTS.daysPerMonth} days.`],
    }),
    dayKwh: sized(dayKwh, 'kWh per day', {
      plain: `We assume about ${round2(dayKwh)} units are used during daylight.`,
      formula: 'dayKwh = dailyKwh x (1 - nightFraction)',
      substituted: `${round2(dailyKwh)} x ${round2(1 - load.nightFraction)} = ${round2(dayKwh)} kWh`,
      assumptions: [`${Math.round(load.nightFraction * 100)}% of household use happens after dark.`],
    }),
    nightKwh: sized(nightKwh, 'kWh per day', {
      plain: `We assume about ${round2(nightKwh)} units are used after dark, which the battery must cover.`,
      formula: 'nightKwh = dailyKwh x nightFraction',
      substituted: `${round2(dailyKwh)} x ${load.nightFraction} = ${round2(nightKwh)} kWh`,
      assumptions: [`${Math.round(load.nightFraction * 100)}% of household use happens after dark.`],
    }),
    continuousPeakW: sized(continuousPeakW, 'W', {
      plain: `Your bill does not say how much you draw at once, so this is an estimate: about ${round2(continuousPeakW)} watts. List your appliances instead if you want the inverter size to be reliable.`,
      formula: 'continuousPeakW = (dailyKwh x 1000 / 24) x peakToMeanRatio',
      substituted: `${round2(meanW)} x ${DEFAULTS.billPeakToMeanRatio} = ${round2(continuousPeakW)} W`,
      assumptions: [`Peak demand is about ${DEFAULTS.billPeakToMeanRatio} times average demand in a typical home.`],
    }),
    surgePeakW: sized(surgePeakW, 'W', {
      plain: `Allowing for motors starting up, the inverter should briefly handle about ${round2(surgePeakW)} watts. This is also an estimate.`,
      formula: 'surgePeakW = continuousPeakW x 2',
      substituted: `${round2(continuousPeakW)} x 2 = ${round2(surgePeakW)} W`,
      assumptions: ['A typical home has at least one motor load that doubles the momentary draw.'],
    }),
    isPeakEstimated: true,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/loads.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/loads.ts src/engine/loads.test.ts
git commit -m "feat(engine): compute daily load profile from bill or appliances"
```

---

### Task 8: Inverter sizing

**Files:**
- Create: `src/engine/inverter.ts`
- Test: `src/engine/inverter.test.ts`

**Interfaces:**
- Consumes: `DailyLoadProfile`, `InverterSpec` (Task 2); `DEFAULTS`, `INVERTER_MARKET_SIZES_W` (Task 3).
- Produces: `sizeInverterFromLoad(load: DailyLoadProfile): InverterSpec`,
  `sizeInverterFromArray(installedPvKw: number): InverterSpec`,
  `roundUpToMarketSize(watts: number): number`.

- [ ] **Step 1: Write the failing test**

`src/engine/inverter.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { roundUpToMarketSize, sizeInverterFromArray, sizeInverterFromLoad } from './inverter'
import { computeLoadProfile } from './loads'
import type { Appliance } from './types'

const catalog: Appliance[] = [
  { id: 'lamp', name: 'Lamp', category: 'Lighting', watts: 100, surgeFactor: 1, defaultHoursPerDay: 5, defaultUsageWindow: 'night' },
]

describe('roundUpToMarketSize', () => {
  it('rounds up to the next real inverter size', () => {
    expect(roundUpToMarketSize(2100)).toBe(3000)
    expect(roundUpToMarketSize(3000)).toBe(3000)
    expect(roundUpToMarketSize(900)).toBe(1000)
  })

  it('returns the largest size when demand exceeds the catalog', () => {
    expect(roundUpToMarketSize(99000)).toBe(15000)
  })
})

describe('sizeInverterFromLoad', () => {
  it('applies headroom then rounds up', () => {
    const load = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 20, hoursPerDay: 1, usageWindow: 'night' }] },
      1,
      catalog,
    )
    // 2000 W continuous x 1.25 = 2500 W -> next market size 3000 W
    expect(load.continuousPeakW.value).toBeCloseTo(2000, 3)
    expect(sizeInverterFromLoad(load).continuousW.value).toBe(3000)
  })

  it('carries the surge requirement through unrounded', () => {
    const load = computeLoadProfile(
      { mode: 'appliances', entries: [{ applianceId: 'lamp', quantity: 20, hoursPerDay: 1, usageWindow: 'night' }] },
      1,
      catalog,
    )
    const spec = sizeInverterFromLoad(load)
    expect(spec.surgeRequiredW.value).toBeCloseTo(load.surgePeakW.value, 3)
  })

  it('explains its numbers in plain language', () => {
    const load = computeLoadProfile({ mode: 'bill', monthlyKwh: 200, nightFraction: 0.6 }, 0.65)
    const spec = sizeInverterFromLoad(load)
    expect(spec.continuousW.explain.plain).toMatch(/inverter/i)
    expect(spec.continuousW.explain.substituted).toContain('=')
  })
})

describe('sizeInverterFromArray', () => {
  it('applies the DC to AC ratio for grid-tied systems', () => {
    // 5.75 kW array / 1.15 = 5000 W
    expect(sizeInverterFromArray(5.75).continuousW.value).toBe(5000)
  })

  it('reports no meaningful surge requirement', () => {
    expect(sizeInverterFromArray(5.75).surgeRequiredW.value).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/inverter.test.ts`
Expected: FAIL — cannot resolve `./inverter`.

- [ ] **Step 3: Write `src/engine/inverter.ts`**

```ts
import { DEFAULTS, INVERTER_MARKET_SIZES_W } from './defaults'
import { round2, sized } from './sized'
import type { DailyLoadProfile, InverterSpec } from './types'

export function roundUpToMarketSize(watts: number): number {
  const match = INVERTER_MARKET_SIZES_W.find((size) => size >= watts)
  return match ?? INVERTER_MARKET_SIZES_W[INVERTER_MARKET_SIZES_W.length - 1] ?? 0
}

export function sizeInverterFromLoad(load: DailyLoadProfile): InverterSpec {
  const withHeadroom = load.continuousPeakW.value * DEFAULTS.inverter.continuousHeadroom
  const continuousW = roundUpToMarketSize(withHeadroom)
  const surgeRequiredW = load.surgePeakW.value

  return {
    continuousW: sized(continuousW, 'W', {
      plain: `A ${round2(continuousW / 1000)} kW inverter suits you. That covers the ${round2(load.continuousPeakW.value)} watts you are likely to draw at once, with room to spare so it is never running flat out.`,
      formula: 'continuousW = roundUpToMarketSize(continuousPeakW x headroom)',
      substituted: `roundUp(${round2(load.continuousPeakW.value)} x ${DEFAULTS.inverter.continuousHeadroom}) = ${continuousW} W`,
      assumptions: [
        `${Math.round((DEFAULTS.inverter.continuousHeadroom - 1) * 100)}% headroom above your expected draw.`,
        'Rounded up to a size actually sold.',
      ],
    }),
    surgeRequiredW: sized(surgeRequiredW, 'W', {
      plain: `Check the inverter can handle ${round2(surgeRequiredW)} watts for a few seconds. Sellers call this the surge or peak rating, and it is separate from the ${round2(continuousW / 1000)} kW continuous figure.`,
      formula: 'surgeRequiredW = surgePeakW',
      substituted: `${round2(surgeRequiredW)} W for at least ${DEFAULTS.inverter.surgeHoldSeconds} seconds`,
      assumptions: ['One motor starting at a time while everything else runs.'],
    }),
  }
}

export function sizeInverterFromArray(installedPvKw: number): InverterSpec {
  const targetW = (installedPvKw * 1000) / DEFAULTS.gridTiedDcAcRatio
  const continuousW = roundUpToMarketSize(targetW)

  return {
    continuousW: sized(continuousW, 'W', {
      plain: `A ${round2(continuousW / 1000)} kW grid-tied inverter suits a ${round2(installedPvKw)} kW array. It is deliberately a little smaller than the panels, because panels rarely hit their full rating and a slightly smaller inverter costs less while losing almost nothing.`,
      formula: 'continuousW = roundUpToMarketSize(installedPvKw x 1000 / dcAcRatio)',
      substituted: `roundUp(${round2(installedPvKw * 1000)} / ${DEFAULTS.gridTiedDcAcRatio}) = ${continuousW} W`,
      assumptions: [`A DC to AC ratio of ${DEFAULTS.gridTiedDcAcRatio}, which is standard practice.`],
    }),
    surgeRequiredW: sized(0, 'W', {
      plain: 'A grid-tied inverter does not start your appliances — the grid does — so it has no surge requirement.',
      formula: 'surgeRequiredW = 0 for grid-tied systems',
      substituted: '0 W',
      assumptions: ['The grid supplies starting current for motors.'],
    }),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/inverter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/inverter.ts src/engine/inverter.test.ts
git commit -m "feat(engine): size inverter from load or from array"
```

---

### Task 9: Bus voltage selection

**Files:**
- Create: `src/engine/voltage.ts`
- Test: `src/engine/voltage.test.ts`

**Interfaces:**
- Consumes: `BusVoltage`, `Sized` (Task 2); `BUS_VOLTAGE_THRESHOLDS_W` (Task 3).
- Produces: `selectBusVoltage(inverterContinuousW: number): Sized<BusVoltage>`.

- [ ] **Step 1: Write the failing test**

`src/engine/voltage.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { selectBusVoltage } from './voltage'

describe('selectBusVoltage', () => {
  it('uses 12 V below 1 kW', () => {
    expect(selectBusVoltage(800).value).toBe(12)
  })

  it('uses 24 V from 1 kW up to 3 kW', () => {
    expect(selectBusVoltage(1000).value).toBe(24)
    expect(selectBusVoltage(3000).value).toBe(24)
  })

  it('uses 48 V above 3 kW', () => {
    expect(selectBusVoltage(3001).value).toBe(48)
    expect(selectBusVoltage(10000).value).toBe(48)
  })

  it('explains the choice without jargon', () => {
    const v = selectBusVoltage(5000)
    expect(v.explain.plain.length).toBeGreaterThan(0)
    expect(v.explain.plain).not.toMatch(/\bbus\b/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/voltage.test.ts`
Expected: FAIL — cannot resolve `./voltage`.

- [ ] **Step 3: Write `src/engine/voltage.ts`**

```ts
import { BUS_VOLTAGE_THRESHOLDS_W } from './defaults'
import { round2, sized } from './sized'
import type { BusVoltage, Sized } from './types'

export function selectBusVoltage(inverterContinuousW: number): Sized<BusVoltage> {
  const value: BusVoltage =
    inverterContinuousW < BUS_VOLTAGE_THRESHOLDS_W.to12V
      ? 12
      : inverterContinuousW <= BUS_VOLTAGE_THRESHOLDS_W.to24V
        ? 24
        : 48

  return sized(value, 'V', {
    plain: `Build the battery side at ${value} volts. Higher voltage means less current for the same power, which means thinner cables and less wasted heat — so bigger systems use higher voltage.`,
    formula: 'busVoltage = 12 below 1 kW, 24 up to 3 kW, 48 above 3 kW',
    substituted: `${round2(inverterContinuousW)} W inverter -> ${value} V`,
    assumptions: ['Standard practice for battery-based systems.'],
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/voltage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/voltage.ts src/engine/voltage.test.ts
git commit -m "feat(engine): select battery bus voltage from inverter size"
```

---

### Task 10: Array sizing

**Files:**
- Create: `src/engine/solar.ts`
- Test: `src/engine/solar.test.ts`

**Interfaces:**
- Consumes: `DerateFactors`, `ArraySpec`, `PanelSpec`, `SystemType` (Task 2); `District`, `worstMonthPsh`, `annualMeanPsh` (Task 5).
- Produces: `combinedDerate(d: DerateFactors): number`,
  `resolveDesignPsh(systemType, district, override): Sized<number>`,
  `sizeArray(dailyKwh: number, designPsh: Sized<number>, derate: DerateFactors, panel: PanelSpec): ArraySpec`.

- [ ] **Step 1: Write the failing test**

`src/engine/solar.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { combinedDerate, resolveDesignPsh, sizeArray } from './solar'
import { DERATE_DEFAULTS } from './defaults'
import type { District } from '../data/psh'
import type { PanelSpec } from './types'

const panel: PanelSpec = {
  id: 'test-500', name: 'Test 500 W', watts: 500, areaM2: 2.5,
  vocVolts: 50, vocTempCoefficientPctPerC: -0.3,
}

const district: District = {
  id: 'test', name: 'Test', latitude: 7, longitude: 80,
  monthlyPsh: [5.5, 6, 6, 5.5, 5, 4.5, 4.5, 4.5, 5, 4.5, 4, 4.5],
}

describe('combinedDerate', () => {
  it('multiplies the four loss factors', () => {
    expect(combinedDerate(DERATE_DEFAULTS)).toBeCloseTo(0.95 * 0.89 * 0.97 * 0.95, 6)
  })
})

describe('resolveDesignPsh', () => {
  it('uses the worst month for off-grid', () => {
    expect(resolveDesignPsh('off-grid', district).value).toBe(4)
  })

  it('uses the worst month for hybrid', () => {
    expect(resolveDesignPsh('hybrid', district).value).toBe(4)
  })

  it('uses the annual mean for grid-tied', () => {
    const mean = district.monthlyPsh.reduce((s, v) => s + v, 0) / 12
    expect(resolveDesignPsh('grid-tied', district).value).toBeCloseTo(mean, 2)
  })

  it('prefers an explicit override', () => {
    expect(resolveDesignPsh('off-grid', district, 3.2).value).toBe(3.2)
  })
})

describe('sizeArray', () => {
  it('sizes the array from daily energy, sun hours and losses', () => {
    const derate = { soiling: 1, temperature: 1, wiring: 1, conversion: 1 }
    const psh = resolveDesignPsh('off-grid', district) // 4
    const spec = sizeArray(10, psh, derate, panel)
    // 10 kWh / (4 h x 1.0) = 2.5 kW -> ceil(2.5 / 0.5) = 5 panels
    expect(spec.requiredPvKw.value).toBeCloseTo(2.5, 3)
    expect(spec.panelCount.value).toBe(5)
    expect(spec.installedPvKw.value).toBeCloseTo(2.5, 3)
    expect(spec.roofAreaM2.value).toBeCloseTo(12.5, 3)
  })

  it('always rounds panel count up', () => {
    const derate = { soiling: 1, temperature: 1, wiring: 1, conversion: 1 }
    const psh = resolveDesignPsh('off-grid', district)
    // 10.1 kWh / 4 = 2.525 kW -> 5.05 panels -> 6
    expect(sizeArray(10.1, psh, derate, panel).panelCount.value).toBe(6)
  })

  it('needs more panels once losses are included', () => {
    const psh = resolveDesignPsh('off-grid', district)
    const lossless = sizeArray(10, psh, { soiling: 1, temperature: 1, wiring: 1, conversion: 1 }, panel)
    const realistic = sizeArray(10, psh, DERATE_DEFAULTS, panel)
    expect(realistic.panelCount.value).toBeGreaterThan(lossless.panelCount.value)
  })

  it('returns zero panels for zero load', () => {
    const psh = resolveDesignPsh('off-grid', district)
    expect(sizeArray(0, psh, DERATE_DEFAULTS, panel).panelCount.value).toBe(0)
  })

  it('names the heat loss in its assumptions', () => {
    const psh = resolveDesignPsh('off-grid', district)
    const spec = sizeArray(10, psh, DERATE_DEFAULTS, panel)
    expect(spec.derateTotal.explain.assumptions.join(' ')).toMatch(/heat|temperature/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/solar.test.ts`
Expected: FAIL — cannot resolve `./solar`.

- [ ] **Step 3: Write `src/engine/solar.ts`**

```ts
import { annualMeanPsh, worstMonthPsh, type District } from '../data/psh'
import { round2, sized } from './sized'
import type { ArraySpec, DerateFactors, PanelSpec, Sized, SystemType } from './types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function combinedDerate(d: DerateFactors): number {
  return d.soiling * d.temperature * d.wiring * d.conversion
}

export function resolveDesignPsh(
  systemType: SystemType,
  district: District,
  override?: number,
): Sized<number> {
  if (override !== undefined) {
    return sized(override, 'sun hours per day', {
      plain: `Using your own figure of ${round2(override)} good sun hours a day.`,
      formula: 'designPsh = userOverride',
      substituted: `${round2(override)} hours`,
      assumptions: ['You supplied this figure yourself.'],
    })
  }

  if (systemType === 'grid-tied') {
    const mean = annualMeanPsh(district)
    return sized(mean, 'sun hours per day', {
      plain: `${district.name} averages about ${round2(mean)} hours of full-strength sunshine a day across the year. Since the grid covers any shortfall, we design to the yearly average.`,
      formula: 'designPsh = mean(monthlyPsh)',
      substituted: `mean of 12 monthly values = ${round2(mean)} hours`,
      assumptions: ['Long-term monthly averages from NASA POWER.'],
    })
  }

  const worst = worstMonthPsh(district)
  const worstIndex = district.monthlyPsh.indexOf(worst)
  const monthName = MONTH_NAMES[worstIndex] ?? 'the worst month'

  return sized(worst, 'sun hours per day', {
    plain: `${monthName} is the cloudiest month in ${district.name}, with about ${round2(worst)} hours of full-strength sunshine a day. We size for that month so the system still works when sunshine is at its worst.`,
    formula: 'designPsh = min(monthlyPsh)',
    substituted: `min of 12 monthly values = ${round2(worst)} hours (${monthName})`,
    assumptions: [
      'Long-term monthly averages from NASA POWER.',
      'Designing for the worst month costs more panels but avoids running short in the rainy season.',
    ],
  })
}

export function sizeArray(
  dailyKwh: number,
  designPsh: Sized<number>,
  derate: DerateFactors,
  panel: PanelSpec,
): ArraySpec {
  const derateTotal = combinedDerate(derate)
  const psh = designPsh.value
  const requiredPvKw = psh > 0 && derateTotal > 0 ? dailyKwh / (psh * derateTotal) : 0
  const panelKw = panel.watts / 1000
  const panelCount = panelKw > 0 ? Math.ceil(requiredPvKw / panelKw) : 0
  const installedPvKw = panelCount * panelKw
  const roofAreaM2 = panelCount * panel.areaM2

  return {
    designPsh,
    derateTotal: sized(derateTotal, 'fraction', {
      plain: `Panels never deliver their full rating in the real world. After dust, heat, cable losses and conversion, expect about ${Math.round(derateTotal * 100)}% of the number printed on the panel.`,
      formula: 'derateTotal = soiling x temperature x wiring x conversion',
      substituted: `${derate.soiling} x ${derate.temperature} x ${derate.wiring} x ${derate.conversion} = ${round2(derateTotal)}`,
      assumptions: [
        `Dust and dirt: ${Math.round((1 - derate.soiling) * 100)}% loss.`,
        `Heat: ${Math.round((1 - derate.temperature) * 100)}% loss — panels lose output as they get hot, and Sri Lankan roofs get very hot.`,
        `Cables: ${Math.round((1 - derate.wiring) * 100)}% loss.`,
        `Conversion: ${Math.round((1 - derate.conversion) * 100)}% loss.`,
      ],
    }),
    requiredPvKw: sized(requiredPvKw, 'kW', {
      plain: `You need about ${round2(requiredPvKw)} kW of panels to generate ${round2(dailyKwh)} units a day.`,
      formula: 'requiredPvKw = dailyKwh / (designPsh x derateTotal)',
      substituted: `${round2(dailyKwh)} / (${round2(psh)} x ${round2(derateTotal)}) = ${round2(requiredPvKw)} kW`,
      assumptions: ['Panels face the sun without significant shading.'],
    }),
    panelCount: sized(panelCount, 'panels', {
      plain: `That is ${panelCount} panels of ${panel.watts} W each. We always round up, because a partial panel does not exist.`,
      formula: 'panelCount = ceil(requiredPvKw / panelKw)',
      substituted: `ceil(${round2(requiredPvKw)} / ${panelKw}) = ${panelCount}`,
      assumptions: [`Using ${panel.name}.`],
    }),
    installedPvKw: sized(installedPvKw, 'kW', {
      plain: `${panelCount} panels comes to ${round2(installedPvKw)} kW installed.`,
      formula: 'installedPvKw = panelCount x panelKw',
      substituted: `${panelCount} x ${panelKw} = ${round2(installedPvKw)} kW`,
      assumptions: [],
    }),
    roofAreaM2: sized(roofAreaM2, 'm2', {
      plain: `You need roughly ${round2(roofAreaM2)} square metres of unshaded roof — check you have that much before buying anything.`,
      formula: 'roofAreaM2 = panelCount x panelAreaM2',
      substituted: `${panelCount} x ${panel.areaM2} = ${round2(roofAreaM2)} m2`,
      assumptions: ['Panels laid flat against the roof with no walking space between rows.'],
    }),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/solar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/solar.ts src/engine/solar.test.ts
git commit -m "feat(engine): size panel array from load, sun hours and losses"
```

---

### Task 11: Battery bank sizing

**Files:**
- Create: `src/engine/battery.ts`
- Test: `src/engine/battery.test.ts`

**Interfaces:**
- Consumes: `BatterySpec`, `BatteryModuleSpec`, `BusVoltage` (Task 2); `DEFAULTS` (Task 3).
- Produces: `sizeBattery(nightKwh: number, autonomyDays: number, busVoltage: BusVoltage, module: BatteryModuleSpec): BatterySpec`.

- [ ] **Step 1: Write the failing test**

`src/engine/battery.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { sizeBattery } from './battery'
import type { BatteryModuleSpec } from './types'

const module51v: BatteryModuleSpec = {
  id: 'test-51v-100ah', name: 'Test 51.2 V 100 Ah',
  nominalVolts: 51.2, ampHours: 100, maxChargeC: 0.5,
}

describe('sizeBattery', () => {
  it('multiplies night load by autonomy to get usable energy', () => {
    expect(sizeBattery(6, 2, 48, module51v).usableKwh.value).toBeCloseTo(12, 3)
  })

  it('grosses usable energy up for depth of discharge and round-trip losses', () => {
    // 12 / (0.85 x 0.95) = 14.86 kWh
    expect(sizeBattery(6, 2, 48, module51v).nominalKwh.value).toBeCloseTo(14.86, 1)
  })

  it('converts nominal energy to amp hours at the bus voltage', () => {
    const spec = sizeBattery(6, 2, 48, module51v)
    expect(spec.bankAh.value).toBeCloseTo((spec.nominalKwh.value * 1000) / 48, 1)
  })

  it('arranges modules in series to reach the bus voltage', () => {
    // 51.2 V module on a 48 V bus -> 1 in series
    expect(sizeBattery(6, 2, 48, module51v).modulesInSeries.value).toBe(1)
    // 51.2 V module would need 1 in series for 48 V; a 12.8 V module needs 4
    const module12v: BatteryModuleSpec = { ...module51v, id: 'm12', nominalVolts: 12.8 }
    expect(sizeBattery(6, 2, 48, module12v).modulesInSeries.value).toBe(4)
  })

  it('adds parallel strings until capacity is met', () => {
    const spec = sizeBattery(6, 2, 48, module51v)
    // needs ~310 Ah at 48 V, module is 100 Ah -> 4 strings
    expect(spec.modulesInParallel.value).toBeGreaterThanOrEqual(3)
  })

  it('returns an empty bank for zero night load', () => {
    const spec = sizeBattery(0, 2, 48, module51v)
    expect(spec.nominalKwh.value).toBe(0)
    expect(spec.modulesInParallel.value).toBe(0)
  })

  it('explains the depth of discharge without using the phrase unexplained', () => {
    const spec = sizeBattery(6, 2, 48, module51v)
    expect(spec.nominalKwh.explain.plain).toMatch(/empty|flat|full/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/battery.test.ts`
Expected: FAIL — cannot resolve `./battery`.

- [ ] **Step 3: Write `src/engine/battery.ts`**

```ts
import { DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { BatteryModuleSpec, BatterySpec, BusVoltage } from './types'

export function sizeBattery(
  nightKwh: number,
  autonomyDays: number,
  busVoltage: BusVoltage,
  module: BatteryModuleSpec,
): BatterySpec {
  const { depthOfDischarge, roundTripEfficiency } = DEFAULTS.battery
  const usableKwh = nightKwh * autonomyDays
  const nominalKwh = usableKwh / (depthOfDischarge * roundTripEfficiency)
  const bankAh = (nominalKwh * 1000) / busVoltage

  const modulesInSeries = Math.max(1, Math.round(busVoltage / module.nominalVolts))
  const stringAh = module.ampHours
  const modulesInParallel = bankAh > 0 ? Math.ceil(bankAh / stringAh) : 0

  return {
    usableKwh: sized(usableKwh, 'kWh', {
      plain: `The battery has to supply ${round2(nightKwh)} units a night for ${autonomyDays} ${autonomyDays === 1 ? 'day' : 'days'}, so ${round2(usableKwh)} units have to come out of it.`,
      formula: 'usableKwh = nightKwh x autonomyDays',
      substituted: `${round2(nightKwh)} x ${autonomyDays} = ${round2(usableKwh)} kWh`,
      assumptions: [`${autonomyDays} days of cloudy weather with no useful sunshine.`],
    }),
    nominalKwh: sized(nominalKwh, 'kWh', {
      plain: `Buy about ${round2(nominalKwh)} kWh of battery. That is more than the ${round2(usableKwh)} units you need out of it, because running a battery completely flat ruins it, and a little energy is lost every time you charge and discharge.`,
      formula: 'nominalKwh = usableKwh / (depthOfDischarge x roundTripEfficiency)',
      substituted: `${round2(usableKwh)} / (${depthOfDischarge} x ${roundTripEfficiency}) = ${round2(nominalKwh)} kWh`,
      assumptions: [
        `Never discharged below ${Math.round((1 - depthOfDischarge) * 100)}% remaining, which is normal practice for lithium batteries.`,
        `${Math.round((1 - roundTripEfficiency) * 100)}% lost in charging and discharging.`,
      ],
    }),
    bankAh: sized(bankAh, 'Ah', {
      plain: `At ${busVoltage} volts that is about ${round2(bankAh)} amp hours — the number most battery sellers quote.`,
      formula: 'bankAh = nominalKwh x 1000 / busVoltage',
      substituted: `${round2(nominalKwh)} x 1000 / ${busVoltage} = ${round2(bankAh)} Ah`,
      assumptions: [],
    }),
    modulesInSeries: sized(modulesInSeries, 'modules', {
      plain: `Wire ${modulesInSeries} ${modulesInSeries === 1 ? 'battery' : 'batteries'} in series to reach ${busVoltage} volts.`,
      formula: 'modulesInSeries = round(busVoltage / moduleVolts)',
      substituted: `round(${busVoltage} / ${module.nominalVolts}) = ${modulesInSeries}`,
      assumptions: [`Using ${module.name}.`],
    }),
    modulesInParallel: sized(modulesInParallel, 'strings', {
      plain: `Then put ${modulesInParallel} of those ${modulesInParallel === 1 ? 'set' : 'sets'} side by side to get enough capacity. That is ${modulesInSeries * modulesInParallel} batteries in total.`,
      formula: 'modulesInParallel = ceil(bankAh / moduleAh)',
      substituted: `ceil(${round2(bankAh)} / ${module.ampHours}) = ${modulesInParallel}`,
      assumptions: [`Using ${module.name}.`],
    }),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/battery.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/battery.ts src/engine/battery.test.ts
git commit -m "feat(engine): size LiFePO4 battery bank from night load and autonomy"
```

---

### Task 12: Charge controller sizing

**Files:**
- Create: `src/engine/controller.ts`
- Test: `src/engine/controller.test.ts`

**Interfaces:**
- Consumes: `ControllerSpec`, `PanelSpec`, `BusVoltage` (Task 2); `DEFAULTS` (Task 3).
- Produces: `sizeController(installedPvKw: number, busVoltage: BusVoltage, panel: PanelSpec, panelCount: number, minAmbientC: number): ControllerSpec`.

- [ ] **Step 1: Write the failing test**

`src/engine/controller.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { sizeController } from './controller'
import type { PanelSpec } from './types'

const panel: PanelSpec = {
  id: 'test-500', name: 'Test 500 W', watts: 500, areaM2: 2.5,
  vocVolts: 50, vocTempCoefficientPctPerC: -0.3,
}

describe('sizeController', () => {
  it('sizes current from array power, bus voltage and headroom', () => {
    // 5000 W / 48 V = 104.17 A x 1.25 = 130.2 A
    expect(sizeController(5, 48, panel, 10, 18).amps.value).toBeCloseTo(130.2, 0)
  })

  it('recommends MPPT for arrays above the threshold', () => {
    expect(sizeController(5, 48, panel, 10, 18).type.value).toBe('MPPT')
  })

  it('allows PWM for very small arrays', () => {
    expect(sizeController(0.3, 12, panel, 1, 18).type.value).toBe('PWM')
  })

  it('raises string Voc as temperature falls below 25 C', () => {
    const cold = sizeController(5, 48, panel, 10, 5)
    const warm = sizeController(5, 48, panel, 10, 25)
    expect(cold.maxStringVoc.value).toBeGreaterThan(warm.maxStringVoc.value)
  })

  it('returns the panel Voc unchanged at standard test temperature', () => {
    // At 25 C there is no correction; 10 panels in one string = 500 V
    expect(sizeController(5, 48, panel, 10, 25).maxStringVoc.value).toBeCloseTo(500, 1)
  })

  it('explains why MPPT was chosen', () => {
    const spec = sizeController(5, 48, panel, 10, 18)
    expect(spec.type.explain.plain.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/controller.test.ts`
Expected: FAIL — cannot resolve `./controller`.

- [ ] **Step 3: Write `src/engine/controller.ts`**

```ts
import { DEFAULTS } from './defaults'
import { round2, sized } from './sized'
import type { BusVoltage, ControllerSpec, ControllerType, PanelSpec } from './types'

const STC_TEMPERATURE_C = 25

export function sizeController(
  installedPvKw: number,
  busVoltage: BusVoltage,
  panel: PanelSpec,
  panelCount: number,
  minAmbientC: number,
): ControllerSpec {
  const arrayW = installedPvKw * 1000
  const amps = (arrayW / busVoltage) * DEFAULTS.controller.headroom

  const type: ControllerType = arrayW > DEFAULTS.controller.mpptThresholdW ? 'MPPT' : 'PWM'

  const degreesBelowStc = STC_TEMPERATURE_C - minAmbientC
  const vocRise = 1 + (Math.abs(panel.vocTempCoefficientPctPerC) / 100) * degreesBelowStc
  const maxStringVoc = panel.vocVolts * panelCount * vocRise

  return {
    amps: sized(amps, 'A', {
      plain: `The charge controller must handle at least ${round2(amps)} amps. Buy the next size up that you can find — controllers are usually sold as 30 A, 40 A, 60 A, 80 A or 100 A.`,
      formula: 'amps = (arrayW / busVoltage) x headroom',
      substituted: `(${round2(arrayW)} / ${busVoltage}) x ${DEFAULTS.controller.headroom} = ${round2(amps)} A`,
      assumptions: [`${Math.round((DEFAULTS.controller.headroom - 1) * 100)}% margin for bright, cool days when panels exceed their rating.`],
    }),
    type: sized(type, '', {
      plain:
        type === 'MPPT'
          ? `Use an MPPT controller. It converts the panels' higher voltage down to battery voltage instead of wasting the difference, which typically recovers 20-30% more energy. At ${round2(arrayW)} watts that difference is worth far more than the extra cost.`
          : `A simple PWM controller is fine at this size. MPPT controllers recover more energy, but on an array of only ${round2(arrayW)} watts the saving would not repay the extra cost.`,
      formula: `type = arrayW > ${DEFAULTS.controller.mpptThresholdW} ? 'MPPT' : 'PWM'`,
      substituted: `${round2(arrayW)} W -> ${type}`,
      assumptions: [`MPPT is worth its cost above about ${DEFAULTS.controller.mpptThresholdW} W.`],
    }),
    maxStringVoc: sized(maxStringVoc, 'V', {
      plain: `On the coldest morning your panels could reach ${round2(maxStringVoc)} volts with nothing connected. The controller's maximum input voltage must be higher than this, or it will be damaged. Panels produce more voltage when cold, which catches people out.`,
      formula: 'maxStringVoc = panelVoc x panelCount x (1 + |tempCoefficient| / 100 x (25 - minAmbientC))',
      substituted: `${panel.vocVolts} x ${panelCount} x ${round2(vocRise)} = ${round2(maxStringVoc)} V`,
      assumptions: [
        `Coldest expected temperature of ${minAmbientC} °C.`,
        'All panels wired in a single series string — wiring them in two strings halves this voltage.',
      ],
    }),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/controller.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/controller.ts src/engine/controller.test.ts
git commit -m "feat(engine): size charge controller with cold-morning Voc check"
```

---

### Task 13: Pipeline orchestration

**Files:**
- Create: `src/engine/sizeSystem.ts`
- Test: `src/engine/sizeSystem.test.ts`

**Interfaces:**
- Consumes: every engine module and data table from Tasks 4–12.
- Produces: `sizeSystem(inputs: SystemInputs): SystemDesign`.

`validate()` is wired in at Task 14; until then `warnings` is an empty array.

- [ ] **Step 1: Write the failing test**

`src/engine/sizeSystem.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'

describe('sizeSystem — battery systems', () => {
  it('produces a complete design for off-grid', () => {
    const design = sizeSystem(defaultInputs('off-grid', 'colombo'))
    expect(design.busVoltage).not.toBeNull()
    expect(design.battery).not.toBeNull()
    expect(design.controller).not.toBeNull()
    expect(design.array.panelCount.value).toBeGreaterThan(0)
    expect(design.inverter.continuousW.value).toBeGreaterThan(0)
  })

  it('produces a complete design for hybrid', () => {
    const design = sizeSystem(defaultInputs('hybrid', 'kandy'))
    expect(design.battery).not.toBeNull()
  })

  it('needs a smaller battery for hybrid than for off-grid', () => {
    const offGrid = sizeSystem(defaultInputs('off-grid', 'colombo'))
    const hybrid = sizeSystem(defaultInputs('hybrid', 'colombo'))
    expect(hybrid.battery?.nominalKwh.value).toBeLessThan(offGrid.battery?.nominalKwh.value ?? 0)
  })
})

describe('sizeSystem — grid-tied', () => {
  it('omits the battery, bus voltage and controller', () => {
    const design = sizeSystem(defaultInputs('grid-tied', 'colombo'))
    expect(design.busVoltage).toBeNull()
    expect(design.battery).toBeNull()
    expect(design.controller).toBeNull()
  })

  it('still sizes panels and an inverter', () => {
    const design = sizeSystem(defaultInputs('grid-tied', 'colombo'))
    expect(design.array.panelCount.value).toBeGreaterThan(0)
    expect(design.inverter.continuousW.value).toBeGreaterThan(0)
  })

  it('needs fewer panels than off-grid because it designs to the yearly average', () => {
    const gridTied = sizeSystem(defaultInputs('grid-tied', 'colombo'))
    const offGrid = sizeSystem(defaultInputs('off-grid', 'colombo'))
    expect(gridTied.array.panelCount.value).toBeLessThan(offGrid.array.panelCount.value)
  })
})

describe('sizeSystem — input handling', () => {
  it('honours a peak sun hours override', () => {
    const inputs = { ...defaultInputs('off-grid', 'colombo'), pshOverride: 3 }
    expect(sizeSystem(inputs).array.designPsh.value).toBe(3)
  })

  it('throws a readable error for an unknown district', () => {
    const inputs = { ...defaultInputs('off-grid', 'atlantis') }
    expect(() => sizeSystem(inputs)).toThrow(/district/i)
  })

  it('throws a readable error for an unknown panel', () => {
    const inputs = { ...defaultInputs('off-grid', 'colombo'), panelId: 'nope' }
    expect(() => sizeSystem(inputs)).toThrow(/panel/i)
  })

  it('echoes its inputs back on the design', () => {
    const inputs = defaultInputs('off-grid', 'galle')
    expect(sizeSystem(inputs).inputs).toEqual(inputs)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/sizeSystem.test.ts`
Expected: FAIL — cannot resolve `./sizeSystem`.

- [ ] **Step 3: Write `src/engine/sizeSystem.ts`**

```ts
import { findBatteryModule, findPanel } from '../data/components'
import { findDistrict } from '../data/psh'
import { sizeBattery } from './battery'
import { sizeController } from './controller'
import { sizeInverterFromArray, sizeInverterFromLoad } from './inverter'
import { computeLoadProfile } from './loads'
import { resolveDesignPsh, sizeArray } from './solar'
import { selectBusVoltage } from './voltage'
import type { SystemDesign, SystemInputs } from './types'

export function sizeSystem(inputs: SystemInputs): SystemDesign {
  const district = findDistrict(inputs.districtId)
  if (!district) throw new Error(`Unknown district: ${inputs.districtId}`)

  const panel = findPanel(inputs.panelId)
  if (!panel) throw new Error(`Unknown panel: ${inputs.panelId}`)

  const load = computeLoadProfile(inputs.load, inputs.diversityFactor)
  const designPsh = resolveDesignPsh(inputs.systemType, district, inputs.pshOverride)

  if (inputs.systemType === 'grid-tied') {
    const array = sizeArray(load.dailyKwh.value, designPsh, inputs.derate, panel)
    return {
      inputs,
      load,
      array,
      inverter: sizeInverterFromArray(array.installedPvKw.value),
      busVoltage: null,
      battery: null,
      controller: null,
      warnings: [],
    }
  }

  const batteryModule = findBatteryModule(inputs.batteryModuleId)
  if (!batteryModule) throw new Error(`Unknown battery module: ${inputs.batteryModuleId}`)

  const inverter = sizeInverterFromLoad(load)
  const busVoltage = selectBusVoltage(inverter.continuousW.value)
  const array = sizeArray(load.dailyKwh.value, designPsh, inputs.derate, panel)
  const battery = sizeBattery(
    load.nightKwh.value,
    inputs.autonomyDays,
    busVoltage.value,
    batteryModule,
  )
  const controller = sizeController(
    array.installedPvKw.value,
    busVoltage.value,
    panel,
    array.panelCount.value,
    inputs.minAmbientC,
  )

  return { inputs, load, array, inverter, busVoltage, battery, controller, warnings: [] }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/sizeSystem.test.ts && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/sizeSystem.ts src/engine/sizeSystem.test.ts
git commit -m "feat(engine): orchestrate sizing pipeline with grid-tied branch"
```

---

### Task 14: Sanity warnings

**Files:**
- Create: `src/engine/validate.ts`
- Modify: `src/engine/sizeSystem.ts` — replace `warnings: []` with a call to `validateDesign`
- Test: `src/engine/validate.test.ts`

**Interfaces:**
- Consumes: `SystemDesign`, `Warning` (Task 2).
- Produces: `validateDesign(design: SystemDesign): Warning[]`.

`validateDesign` takes a design whose `warnings` may be empty and returns the list to place on it. `sizeSystem` builds the design object, then calls this and assigns the result.

- [ ] **Step 1: Write the failing test**

`src/engine/validate.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { validateDesign } from './validate'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'
import type { SystemInputs } from './types'

function ids(inputs: SystemInputs): string[] {
  return validateDesign(sizeSystem(inputs)).map((w) => w.id)
}

describe('validateDesign', () => {
  it('flags a peak load that was estimated from a bill', () => {
    expect(ids(defaultInputs('off-grid', 'colombo'))).toContain('estimated-peak')
  })

  it('does not flag an estimated peak when appliances were listed', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'appliances', entries: [
        { applianceId: 'led-bulb', quantity: 6, hoursPerDay: 5, usageWindow: 'night' },
        { applianceId: 'fridge', quantity: 1, hoursPerDay: 8, usageWindow: 'both' },
      ] },
    }
    expect(ids(inputs)).not.toContain('estimated-peak')
  })

  it('flags a bank the array cannot recharge in one bad day', () => {
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      autonomyDays: 10,
    }
    expect(ids(inputs)).toContain('slow-recharge')
  })

  it('flags a charge current above the battery C-rate', () => {
    // A big daytime workshop load with almost nothing at night: the array is
    // sized for 40+ kWh a day while the battery only has to carry a lamp, so
    // the panels can push far more current than that small bank will accept.
    const inputs: SystemInputs = {
      ...defaultInputs('off-grid', 'colombo'),
      load: { mode: 'appliances', entries: [
        { applianceId: 'welding-machine', quantity: 2, hoursPerDay: 6, usageWindow: 'day' },
        { applianceId: 'led-bulb', quantity: 1, hoursPerDay: 1, usageWindow: 'night' },
      ] },
      batteryModuleId: 'lfp-12v-100ah',
    }
    expect(ids(inputs)).toContain('charge-current-high')
  })

  it('returns no warnings object without a message', () => {
    for (const w of validateDesign(sizeSystem(defaultInputs('off-grid', 'colombo')))) {
      expect(w.message.length).toBeGreaterThan(0)
      expect(['info', 'caution']).toContain(w.severity)
    }
  })

  it('produces no battery warnings for grid-tied systems', () => {
    const list = ids(defaultInputs('grid-tied', 'colombo'))
    expect(list).not.toContain('slow-recharge')
    expect(list).not.toContain('charge-current-high')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/validate.test.ts`
Expected: FAIL — cannot resolve `./validate`.

- [ ] **Step 3: Write `src/engine/validate.ts`**

```ts
import { findBatteryModule } from '../data/components'
import { DEFAULTS } from './defaults'
import { round2 } from './sized'
import type { SystemDesign, Warning } from './types'

export function validateDesign(design: SystemDesign): Warning[] {
  const warnings: Warning[] = []

  if (design.load.isPeakEstimated) {
    warnings.push({
      id: 'estimated-peak',
      severity: 'info',
      message:
        'Your inverter size is a rough estimate, because a bill does not say how much power you use at any one moment. List your appliances instead if you want a number you can buy from.',
    })
  }

  if (design.battery && design.busVoltage) {
    const dailyGenerationKwh =
      design.array.installedPvKw.value * design.array.designPsh.value * design.array.derateTotal.value
    const rechargeNeedKwh = design.battery.usableKwh.value + design.load.dailyKwh.value

    if (dailyGenerationKwh > 0) {
      const days = rechargeNeedKwh / dailyGenerationKwh
      if (days > DEFAULTS.maxAcceptableRechargeDays) {
        warnings.push({
          id: 'slow-recharge',
          severity: 'caution',
          message:
            `Once this battery is empty, your panels would take about ${round2(days)} days to refill it while also running the house. ` +
            'Either add panels or reduce the number of backup days you asked for.',
        })
      }
    }

    const module = findBatteryModule(design.inputs.batteryModuleId)
    if (module) {
      const chargeAmps = (design.array.installedPvKw.value * 1000) / design.busVoltage.value
      const maxChargeAmps =
        module.ampHours * design.battery.modulesInParallel.value * module.maxChargeC

      if (maxChargeAmps > 0 && chargeAmps > maxChargeAmps) {
        warnings.push({
          id: 'charge-current-high',
          severity: 'caution',
          message:
            `Your panels could push about ${round2(chargeAmps)} amps into a battery rated to accept ${round2(maxChargeAmps)} amps. ` +
            'Use a bigger battery bank, or a charge controller that can be limited to a safe current.',
        })
      }
    }
  }

  return warnings
}
```

- [ ] **Step 4: Wire it into `sizeSystem`**

In `src/engine/sizeSystem.ts`, add the import:

```ts
import { validateDesign } from './validate'
```

Replace the grid-tied return with:

```ts
    const design: SystemDesign = {
      inputs,
      load,
      array,
      inverter: sizeInverterFromArray(array.installedPvKw.value),
      busVoltage: null,
      battery: null,
      controller: null,
      warnings: [],
    }
    return { ...design, warnings: validateDesign(design) }
```

Replace the final return with:

```ts
  const design: SystemDesign = {
    inputs, load, array, inverter, busVoltage, battery, controller, warnings: [],
  }
  return { ...design, warnings: validateDesign(design) }
```

- [ ] **Step 5: Run the whole suite**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/validate.ts src/engine/validate.test.ts src/engine/sizeSystem.ts
git commit -m "feat(engine): add sanity warnings and wire into pipeline"
```

---

### Task 15: Golden cases, invariants, and architectural guards

**Files:**
- Create: `src/engine/golden.test.ts`, `src/engine/invariants.test.ts`, `src/engine/architecture.test.ts`

**Interfaces:**
- Consumes: `sizeSystem` (Task 13), `defaultInputs` (Task 3).
- Produces: no source; this task is the regression net.

Golden expectations are written as ranges, not exact equalities, because the PSH table is regenerated from a live dataset and will drift slightly. A range wide enough to absorb data drift but narrow enough to catch a broken formula is the right instrument here.

- [ ] **Step 1: Write the golden case tests**

`src/engine/golden.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'
import type { SystemInputs } from './types'

describe('golden case: small off-grid cabin', () => {
  const inputs: SystemInputs = {
    ...defaultInputs('off-grid', 'anuradhapura'),
    load: { mode: 'appliances', entries: [
      { applianceId: 'led-bulb', quantity: 4, hoursPerDay: 5, usageWindow: 'night' },
      { applianceId: 'ceiling-fan', quantity: 1, hoursPerDay: 8, usageWindow: 'both' },
      { applianceId: 'phone-charger', quantity: 2, hoursPerDay: 3, usageWindow: 'night' },
      { applianceId: 'wifi-router', quantity: 1, hoursPerDay: 24, usageWindow: 'both' },
    ] },
    panelId: 'generic-450',
    batteryModuleId: 'lfp-12v-200ah',
  }
  const design = sizeSystem(inputs)

  it('uses well under 2 units a day', () => {
    expect(design.load.dailyKwh.value).toBeGreaterThan(0.9)
    expect(design.load.dailyKwh.value).toBeLessThan(1.6)
  })

  it('lands on a small inverter and a low-voltage bus', () => {
    expect(design.inverter.continuousW.value).toBeLessThanOrEqual(1500)
    expect(design.busVoltage?.value).toBeLessThanOrEqual(24)
  })

  it('needs only a handful of panels', () => {
    expect(design.array.panelCount.value).toBeGreaterThanOrEqual(1)
    expect(design.array.panelCount.value).toBeLessThanOrEqual(3)
  })
})

describe('golden case: typical Sri Lankan hybrid home', () => {
  const inputs: SystemInputs = {
    ...defaultInputs('hybrid', 'colombo'),
    load: { mode: 'bill', monthlyKwh: 250, nightFraction: 0.6 },
  }
  const design = sizeSystem(inputs)

  it('works out to roughly 8 units a day', () => {
    expect(design.load.dailyKwh.value).toBeGreaterThan(7.5)
    expect(design.load.dailyKwh.value).toBeLessThan(8.5)
  })

  it('recommends a 48 V system', () => {
    expect(design.busVoltage?.value).toBe(48)
  })

  it('sizes the array between 2.5 and 5 kW', () => {
    expect(design.array.installedPvKw.value).toBeGreaterThan(2.5)
    expect(design.array.installedPvKw.value).toBeLessThan(5)
  })

  it('recommends MPPT', () => {
    expect(design.controller?.type.value).toBe('MPPT')
  })
})

describe('golden case: grid-tied rooftop', () => {
  const inputs: SystemInputs = {
    ...defaultInputs('grid-tied', 'colombo'),
    load: { mode: 'bill', monthlyKwh: 400, nightFraction: 0.6 },
  }
  const design = sizeSystem(inputs)

  it('carries no battery hardware', () => {
    expect(design.battery).toBeNull()
    expect(design.controller).toBeNull()
    expect(design.busVoltage).toBeNull()
  })

  it('pairs an inverter smaller than the array', () => {
    expect(design.inverter.continuousW.value).toBeLessThan(design.array.installedPvKw.value * 1000)
  })
})

describe('explanation coverage', () => {
  const designs = [
    sizeSystem(defaultInputs('off-grid', 'colombo')),
    sizeSystem(defaultInputs('hybrid', 'kandy')),
    sizeSystem(defaultInputs('grid-tied', 'jaffna')),
  ]

  it('explains every number in every design', () => {
    for (const design of designs) {
      const groups = [design.load, design.array, design.inverter, design.battery, design.controller]
      for (const group of groups) {
        if (!group) continue
        for (const [key, field] of Object.entries(group)) {
          if (typeof field !== 'object' || field === null || !('explain' in field)) continue
          const sizedField = field as { explain: { plain: string; substituted: string } }
          expect(sizedField.explain.plain.trim(), `${key}.explain.plain`).not.toBe('')
          expect(sizedField.explain.substituted.trim(), `${key}.explain.substituted`).not.toBe('')
        }
      }
      if (design.busVoltage) expect(design.busVoltage.explain.plain.trim()).not.toBe('')
    }
  })
})
```

- [ ] **Step 2: Write the invariant tests**

`src/engine/invariants.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { sizeSystem } from './sizeSystem'
import { defaultInputs } from './defaults'
import type { SystemInputs } from './types'

function withBill(monthlyKwh: number): SystemInputs {
  return {
    ...defaultInputs('off-grid', 'colombo'),
    load: { mode: 'bill', monthlyKwh, nightFraction: 0.6 },
  }
}

describe('monotonicity', () => {
  const bills = [50, 100, 200, 400, 800, 1600]

  it('never reduces panel count as load grows', () => {
    let previous = -1
    for (const bill of bills) {
      const count = sizeSystem(withBill(bill)).array.panelCount.value
      expect(count).toBeGreaterThanOrEqual(previous)
      previous = count
    }
  })

  it('never reduces battery capacity as load grows', () => {
    let previous = -1
    for (const bill of bills) {
      const kwh = sizeSystem(withBill(bill)).battery?.nominalKwh.value ?? 0
      expect(kwh).toBeGreaterThanOrEqual(previous)
      previous = kwh
    }
  })

  it('never reduces inverter size as load grows', () => {
    let previous = -1
    for (const bill of bills) {
      const w = sizeSystem(withBill(bill)).inverter.continuousW.value
      expect(w).toBeGreaterThanOrEqual(previous)
      previous = w
    }
  })

  it('never reduces battery capacity as autonomy grows', () => {
    let previous = -1
    for (const days of [0.5, 1, 2, 3, 5]) {
      const kwh = sizeSystem({ ...withBill(200), autonomyDays: days }).battery?.nominalKwh.value ?? 0
      expect(kwh).toBeGreaterThanOrEqual(previous)
      previous = kwh
    }
  })

  it('needs more panels in a cloudier location', () => {
    const sunny = sizeSystem({ ...withBill(200), pshOverride: 6 })
    const cloudy = sizeSystem({ ...withBill(200), pshOverride: 3 })
    expect(cloudy.array.panelCount.value).toBeGreaterThan(sunny.array.panelCount.value)
  })
})

describe('degenerate input', () => {
  it('handles zero consumption without crashing or dividing by zero', () => {
    const design = sizeSystem(withBill(0))
    expect(design.array.panelCount.value).toBe(0)
    expect(Number.isFinite(design.battery?.nominalKwh.value ?? 0)).toBe(true)
  })
})
```

- [ ] **Step 3: Write the architectural guard test**

`src/engine/architecture.test.ts`:
```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [full] : []
  })
}

describe('engine and data purity', () => {
  const files = [...sourceFiles('src/engine'), ...sourceFiles('src/data')]

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('never imports React or UI code', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from ['"]react/)
      expect(source, file).not.toMatch(/from ['"].*\/ui\//)
      expect(source, file).not.toMatch(/from ['"].*\/state\//)
    }
  })

  it('performs no I/O and reads no globals', () => {
    for (const file of files) {
      if (file.includes('architecture.test')) continue
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/\bfetch\s*\(/)
      expect(source, file).not.toMatch(/\blocalStorage\b/)
      expect(source, file).not.toMatch(/\bwindow\./)
    }
  })
})
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS. If a golden range fails, first check whether the PSH table changed; if the formula is correct and the data simply moved, widen the range and note why in a comment. Do not widen a range to hide a formula error.

- [ ] **Step 5: Commit**

```bash
git add src/engine/golden.test.ts src/engine/invariants.test.ts src/engine/architecture.test.ts
git commit -m "test(engine): add golden cases, invariants and purity guards"
```

---

### Task 16: Unstyled design dump

**Files:**
- Create: `src/ui/DesignDump.tsx`
- Modify: `src/App.tsx`
- Test: `src/ui/DesignDump.test.tsx`

**Interfaces:**
- Consumes: `sizeSystem` (Task 13), `defaultInputs` (Task 3), `DISTRICTS` (Task 5).
- Produces: nothing consumed by later Phase 1 tasks. Phase 2 replaces this component entirely.

This is scaffolding that proves the engine works end to end in a browser. It is deliberately unstyled; Phase 2 deletes it.

- [ ] **Step 1: Add the test environment dependencies**

Run: `npm install -D jsdom @testing-library/react @testing-library/dom`

Then in `vite.config.ts`, change the `test` block to:

```ts
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
```

- [ ] **Step 2: Write the failing test**

`src/ui/DesignDump.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DesignDump } from './DesignDump'
import { sizeSystem } from '../engine/sizeSystem'
import { defaultInputs } from '../engine/defaults'

// Query by heading role, not by text. The explanation prose repeats words
// like "panels" and "battery" many times on the page, so getByText would
// match multiple elements and throw.
describe('DesignDump', () => {
  it('shows the headline sections for a battery system', () => {
    render(<DesignDump design={sizeSystem(defaultInputs('off-grid', 'colombo'))} />)
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Battery' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Inverter' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Charge controller' })).toBeDefined()
  })

  it('renders a grid-tied design without battery sections', () => {
    render(<DesignDump design={sizeSystem(defaultInputs('grid-tied', 'colombo'))} />)
    expect(screen.getByRole('heading', { name: 'Panels' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Charge controller' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Battery' })).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/ui/DesignDump.test.tsx`
Expected: FAIL — cannot resolve `./DesignDump`.

- [ ] **Step 4: Write `src/ui/DesignDump.tsx`**

```tsx
import type { Sized, SystemDesign } from '../engine/types'

function Row({ label, field }: { label: string; field: Sized<unknown> }) {
  return (
    <li>
      <strong>{label}:</strong> {String(field.value)} {field.unit}
      <div>{field.explain.plain}</div>
      <code>{field.explain.substituted}</code>
    </li>
  )
}

export function DesignDump({ design }: { design: SystemDesign }) {
  return (
    <div>
      <h2>Panels</h2>
      <ul>
        <Row label="Sun hours used" field={design.array.designPsh} />
        <Row label="Panel count" field={design.array.panelCount} />
        <Row label="Installed size" field={design.array.installedPvKw} />
        <Row label="Roof area" field={design.array.roofAreaM2} />
      </ul>

      <h2>Inverter</h2>
      <ul>
        <Row label="Continuous rating" field={design.inverter.continuousW} />
        <Row label="Surge required" field={design.inverter.surgeRequiredW} />
      </ul>

      {design.battery && design.busVoltage && (
        <>
          <h2>Battery</h2>
          <ul>
            <Row label="System voltage" field={design.busVoltage} />
            <Row label="Capacity" field={design.battery.nominalKwh} />
            <Row label="Amp hours" field={design.battery.bankAh} />
            <Row label="In series" field={design.battery.modulesInSeries} />
            <Row label="In parallel" field={design.battery.modulesInParallel} />
          </ul>
        </>
      )}

      {design.controller && (
        <>
          <h2>Charge controller</h2>
          <ul>
            <Row label="Current" field={design.controller.amps} />
            <Row label="Type" field={design.controller.type} />
            <Row label="Maximum panel voltage" field={design.controller.maxStringVoc} />
          </ul>
        </>
      )}

      {design.warnings.length > 0 && (
        <>
          <h2>Things to check</h2>
          <ul>
            {design.warnings.map((w) => (
              <li key={w.id}>
                [{w.severity}] {w.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire it into `src/App.tsx`**

```tsx
import { useState } from 'react'
import { DISTRICTS } from './data/psh'
import { defaultInputs } from './engine/defaults'
import { sizeSystem } from './engine/sizeSystem'
import type { SystemType } from './engine/types'
import { DesignDump } from './ui/DesignDump'

export function App() {
  const [systemType, setSystemType] = useState<SystemType>('hybrid')
  const [districtId, setDistrictId] = useState('colombo')
  const [monthlyKwh, setMonthlyKwh] = useState(250)

  const design = sizeSystem({
    ...defaultInputs(systemType, districtId),
    load: { mode: 'bill', monthlyKwh, nightFraction: 0.6 },
  })

  return (
    <main>
      <h1>Solar System Calculator</h1>
      <p>Phase 1 engine check. The real interface arrives in Phase 2.</p>

      <label>
        System type{' '}
        <select value={systemType} onChange={(e) => setSystemType(e.target.value as SystemType)}>
          <option value="off-grid">Off-grid</option>
          <option value="hybrid">Hybrid</option>
          <option value="grid-tied">Grid-tied</option>
        </select>
      </label>

      <label>
        District{' '}
        <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <label>
        Monthly units{' '}
        <input
          type="number"
          value={monthlyKwh}
          min={0}
          onChange={(e) => setMonthlyKwh(Math.max(0, Number(e.target.value)))}
        />
      </label>

      <DesignDump design={design} />
    </main>
  )
}
```

- [ ] **Step 6: Run everything**

Run: `npm test && npm run typecheck && npm run build`
Expected: all tests pass, no type errors, build succeeds.

- [ ] **Step 7: Check it in a browser**

Run: `npm run dev`
Open the printed URL. Change the district and the monthly units, and confirm the panel count and battery size move sensibly. Switch to grid-tied and confirm the battery and controller sections disappear.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): add unstyled design dump to verify engine end to end"
```

---

## Phase 1 Definition of Done

- `npm test`, `npm run typecheck`, and `npm run build` all pass.
- The three golden cases produce sensible designs.
- Every `Sized` value carries a non-empty plain explanation and substituted arithmetic.
- `src/data/psh.ts` was generated from NASA POWER, not written by hand, and records its source and fetch date.
- The dev server renders a real design that responds to input changes.

## Not in Phase 1

Deferred to their own plans: the wizard and live sidebar (Phase 2); cable and breaker sizing, the twelve-month chart, CEB tariff data, cost and payback, and the print stylesheet (Phase 3). `src/engine/wiring.ts`, `production.ts`, `economics.ts`, and `src/data/tariffs.ts` do not exist yet and no Phase 1 task references them.
