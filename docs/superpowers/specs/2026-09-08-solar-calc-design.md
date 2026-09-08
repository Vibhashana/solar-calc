# Solar System Calculator — Design

**Date:** 2026-09-08
**Status:** Approved design, pending implementation plan

## 1. Purpose

A web calculator that tells someone with no solar experience what size system they need: how many panels, how big a battery, what inverter, what it will cost, and roughly when it pays for itself.

The defining constraint is comprehension. A correct answer the user does not understand is a failed answer. Every number the tool produces must be accompanied by a plain-language reason, and the tool must be finishable by someone who does not know what "MPPT" or "depth of discharge" means.

### Goals

- Size panels, battery, inverter, and charge controller for off-grid, hybrid, and grid-tied systems.
- Produce a shopping list a user can take to a supplier.
- Explain every number in plain language, with the arithmetic available on demand.
- Work offline, with no backend, no account, and no data collection.
- Be accurate for Sri Lanka first, and structured to extend elsewhere.

### Non-goals

- Not a design tool for installers. No string layout, no shading analysis, no roof modelling, no single-line diagrams.
- Not a substitute for a licensed electrician. Cable and breaker figures are planning guidance and are labelled as such.
- No accounts, no saved projects, no server. A design is shared by URL.
- No net-metering scheme modelling beyond simple bill offset in v1.

## 2. Audience

1. **Primary — the beginner.** Has an electricity bill and a vague idea that solar might help. Knows no terminology. Needs to be led one question at a time and told what the answer means.
2. **Secondary — the DIY builder.** Knows roughly what they want, wants to check their sizing and explore trade-offs quickly.

The design serves the first through a guided wizard and the second through a live-editing results page. Both drive the same engine.

## 3. Decisions

| Decision | Choice |
|---|---|
| System types | Off-grid, hybrid, and grid-tied |
| Load input | User picks: monthly bill (quick) or appliance list (detailed) |
| Sun data | Built-in monthly table by district, with manual override |
| Platform | Static web app: Vite + React + TypeScript. No backend |
| Outputs | Panels, battery, inverter, controller, cable/breakers, cost/payback, 12-month chart |
| Region | Sri Lanka first: LKR, CEB tariffs, mm² cable, metric |
| Interaction | Wizard on first run, live-editing sidebar thereafter |
| Battery chemistry | LiFePO₄ only |
| Diversity factor | 0.65 |
| Off-grid autonomy | 2 days |
| Off-grid design month | Worst month |

## 4. Architecture

The central rule: **the UI performs no arithmetic.** All calculation lives in a pure, synchronous, React-free TypeScript module. The UI renders what the engine returns.

```
src/
  engine/
    types.ts        Domain types: SystemInputs, SystemDesign, Sized<T>
    loads.ts        Appliance list | monthly kWh -> DailyLoadProfile
    voltage.ts      System bus voltage selection
    solar.ts        PSH + derate -> array size, panel count, roof area
    battery.ts      Autonomy + DoD -> bank capacity and configuration
    inverter.ts     Continuous + surge -> inverter rating
    controller.ts   MPPT/PWM choice and required amperage
    wiring.ts       Cable cross-section and protection per run
    production.ts   Monthly generation vs consumption
    economics.ts    Capital cost, bill offset, payback
    validate.ts     Cross-checks -> plain-English warnings
    sizeSystem.ts   Orchestrator: SystemInputs -> SystemDesign
  data/
    appliances.ts   Appliance presets: watts, surge factor, category
    psh.ts          Monthly peak sun hours by district
    tariffs.ts      CEB domestic block tariff, with effective date
    components.ts   Panel/battery/inverter/controller catalog, LKR
    glossary.ts     Term -> plain-language definition
  ui/
    wizard/         Five-step guided flow
    results/        Tiered results page and editable sidebar
    shared/         Glossary term, expander, number card, chart
  state/            Single reducer + context
```

### 4.1 The `Sized<T>` contract

Engine functions never return bare numbers. They return a value bound to its own explanation:

```ts
type Sized<T> = {
  value: T
  unit: string
  explain: {
    plain: string         // "8 panels, because your roof gets 4.2 good sun hours a day"
    formula: string       // "panels = ceil(dailyKwh / (psh x panelKw x derate))"
    substituted: string   // "ceil(12.4 / (4.2 x 0.55 x 0.78)) = 8"
    assumptions: string[]
  }
}
```

This is the mechanism that makes the comprehension goal enforceable rather than aspirational. A result cannot exist without its explanation, because the type does not permit it. The "Why this number?" expanders and the "Show me the maths" section are pure renderings of `explain`; there is no separately maintained prose that can drift out of sync with the code.

### 4.2 Data flow

A single reducer holds `SystemInputs`. Every change — a wizard answer or a sidebar tweak — dispatches an action, and `sizeSystem()` re-runs over the new inputs. The computation is pure arithmetic over roughly thirty values and completes in well under a millisecond, so there is no memoisation, no async, and no loading state anywhere in the app.

`SystemInputs` serialises to the URL hash, making any finished design a shareable link that requires no server.

The pipeline order inside `sizeSystem` is fixed by data dependency, is not the alphabetical order of the file listing above, and **branches by system type**:

```
                loads
                  |
   +--------------+---------------+
   | off-grid / hybrid            | grid-tied
   v                              v
inverter (from load)           solar (annual-mean PSH)
   -> solar (worst-month PSH)     -> inverter (from array, DC:AC 1.15)
   -> voltage (from inverter
               AND array)
   -> battery
   -> controller
   |                              |
   +--------------+---------------+
                  v
      wiring -> production -> economics -> validate
```

On the battery branch, both inverter and array sizing precede bus-voltage selection, because the voltage is the higher of the requirements those two impose (§5.2). Battery, controller, and wiring all consume the resolved bus voltage and therefore follow it.

Grid-tied reverses this: with no battery to serve overnight load, the inverter is sized to the array it must convert rather than to instantaneous demand. Array kW is derived from annual-mean PSH, and the inverter is `installedPvKw / 1.15`, rounded to a market size — the standard DC:AC overbuild that trades a few clipped peak hours for better shoulder-hour output. Grid-tied designs therefore produce no bus voltage, no battery, and no charge controller.

### 4.3 Dependencies

Vite, React, TypeScript, Vitest. Nothing else. Specifically excluded: no chart library (the twelve-bar chart is hand-written SVG), no state library (one reducer suffices), no router (wizard step is state), no UI kit.

## 5. Sizing model

All constants below are defaults, defined in one `defaults.ts` and overridable by the user in the sidebar.

### 5.1 Load profile

**Appliance path.** For each entry:

```
dailyWh += quantity * watts * hoursPerDay
```

Each appliance carries a `surgeFactor` (resistive 1.0, ceiling fan 2.0, fridge/freezer 3.0, air conditioner 3.0, washing machine 3.0, water pump 4.0) and a `usageWindow` of `day`, `night`, or `both`, which splits `dailyWh` into `dayWh` and `nightWh`.

```
continuousPeakW = sum(quantity * watts) * DIVERSITY_FACTOR   // 0.65
surgePeakW      = continuousPeakW + max(watts * (surgeFactor - 1))
```

**Quick path.** `dailyKwh = monthlyKwh / 30.44`. The bill carries no information about instantaneous demand, so peak load is estimated as `dailyKwh * 1000 / 24 * 3.5` and the result is explicitly flagged as an estimate, with a prompt to use the appliance path for a trustworthy inverter size. Day/night split defaults to 40/60 for domestic use and is user-adjustable.

### 5.2 System bus voltage

The bus voltage is the **higher** of two requirements, because both the inverter and the array impose one:

| Driver | 12 V | 24 V | 48 V |
|---|---|---|---|
| Inverter continuous | < 1 kW | 1–3 kW | > 3 kW |
| Installed array | ≤ 0.8 kW | 0.8–2 kW | > 2 kW |

Grid-tied systems have no battery bus; this step is skipped.

Sizing from the inverter alone — the original rule — produces unbuildable systems across the middle of the target market. A 400 kWh/month off-grid home draws a modest peak but needs a large array; the inverter-only rule put a 3.85 kW array on a 24 V bus, demanding a **201 A** charge controller. Nothing like that is sold at consumer prices, and the DC cabling would be impractical. At 48 V the same array needs about 100 A, which is ordinary. The failure was concentrated at 200–400 kWh/month, the most common Sri Lankan household size.

Because the array requirement is needed to choose the voltage, the array is sized **before** voltage selection. This is safe: array sizing depends only on daily energy, sun hours, losses and panel choice — never on the bus voltage. Battery and charge-controller sizing still follow voltage selection, as they must.

### 5.3 Array

```
requiredPvKw = dailyKwh / (psh_designMonth * derate)
panelCount   = ceil(requiredPvKw / panelKw)
roofAreaM2   = panelCount * panelAreaM2
```

Derate is the product of four factors:

| Factor | Default | Rationale |
|---|---|---|
| Soiling | 0.95 | Dust and bird fouling between cleanings |
| Temperature | 0.89 | Cell ≈58 °C at 32 °C ambient, −0.35 %/°C |
| Wiring | 0.97 | DC and AC conductor losses |
| Conversion | 0.95 | Inverter and charge-path efficiency |
| **Combined** | **0.78** | |

The temperature factor is the one that matters most here. Generic calculators built for temperate climates assume a combined derate near 0.85, which overstates year-round yield in Sri Lanka by roughly eight per cent. The app states this factor openly in the assumptions list.

Design month by system type: off-grid uses the **worst** month (conservative, and correct when there is no fallback supply); hybrid uses the worst month but surfaces the grid-import shortfall rather than oversizing; grid-tied uses the annual mean.

### 5.4 Battery (off-grid and hybrid)

```
usableKwh  = nightKwh * autonomyDays
nominalKwh = usableKwh / (DOD * ROUND_TRIP)     // 0.85, 0.95
bankAh     = nominalKwh * 1000 / busVoltage
```

Autonomy defaults to 2.0 days off-grid and 0.5 days hybrid. The bank is then expressed as a concrete series/parallel arrangement of catalog modules.

Two cross-checks, both surfaced as warnings rather than silent adjustments:

1. **Recharge feasibility.** The array must replace `usableKwh` plus the following day's load within three worst-month solar days. One day is not a realistic target — a two-day bank inherently takes two to three days to recover — so a one-day test would fire on every off-grid design and become noise. Three days is the point at which recovery is genuinely too slow to trust.
2. **Charge current.** `arrayW / busVoltage` must remain within the bank's C-rate limit (default 0.5C charge for LiFePO₄).
3. **Bank voltage reachability.** The chosen module's nominal voltage must divide into the system voltage. Because the series count is a rounded integer, a mismatched module silently yields a bank at the wrong voltage — a 51.2 V module against a 24 V bus gives one module in series, so 51.2 V. Connecting that to a 24 V inverter destroys it, and a beginner has no way to catch the error. Where the achievable bank voltage drifts more than **10 %** from the system voltage, the design says so plainly and the explanation must not claim the target voltage was reached.

The 10 % figure is not arbitrary and must not be tightened. LiFePO₄ cells are 3.2 V nominal, so real packs are 12.8 V, 25.6 V and 51.2 V — all sold as "12 V", "24 V" and "48 V" systems. Every correct pairing therefore sits at exactly 6.7 % drift. A tolerance below that rejects every valid LiFePO₄ bank in existence and tells users their right answer is wrong. A genuine mismatch is far larger: a 51.2 V module against a 24 V bus is 113 % out.

### 5.5 Inverter

```
continuousW = continuousPeakW * 1.25
surgeW      = surgePeakW
```

`continuousW` is rounded up to the next real market size (1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15 kW), and that rounded figure is the recommended inverter rating. `surgeW` is not rounded: it is a requirement carried into the shopping list, where the selected unit's published surge rating must meet or exceed it for at least five seconds. Where no catalog unit at the recommended continuous rating satisfies the surge requirement, the next size up is recommended and the reason is stated in `explain.plain`.

### 5.6 Charge controller (off-grid and hybrid)

```
controllerA = arrayW / busVoltage * 1.25
```

MPPT is recommended above 400 W of array, or wherever array V_mp materially exceeds battery voltage; PWM only for small, voltage-matched arrays. The controller's maximum PV input voltage is checked against the string's cold-morning V_oc, using the panel's temperature coefficient of V_oc at the district's record low.

### 5.7 Cable and protection

For each run — PV to controller, controller to battery, battery to inverter — sized on voltage drop and confirmed on ampacity:

```
mm2 = (2 * lengthM * amps * RHO) / maxDropVolts     // RHO = 0.0175
```

Maximum drop is 3 % for DC runs and 5 % for AC. The result is rounded up to a standard cross-section (1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95 mm²) and then checked against that conductor's ampacity at 45 °C ambient. Protection is the next standard breaker or fuse at or above 1.25 × continuous current, and never above the cable's ampacity.

This section renders beneath a persistent, prominent disclaimer: the figures are for planning and budgeting, and the installation must be carried out or verified by a qualified electrician in accordance with local regulations.

### 5.8 Monthly production

```
genKwh[m] = pvKw * psh[m] * derate * daysInMonth[m]
```

Plotted against monthly consumption, with shortfall months highlighted. For a beginner this single chart communicates seasonality more effectively than any amount of prose.

### 5.9 Economics

**Capital cost** is the sum of catalog unit prices times quantities, plus an installation and sundries allowance of 18 %. Every unit price is editable, because catalog prices go stale and local pricing varies.

**Savings** are computed as *bill before minus bill after*, evaluated through the CEB domestic block tariff — not as offset kWh times an average rate. Because the tariff is progressive, generation displaces the most expensive blocks first, and the averaging shortcut understates real savings substantially. The app shows both the before and after bill so the difference is visible.

**Payback** is capital cost divided by first-year savings, presented as a range with its assumptions stated (panel degradation, tariff movement). For off-grid systems, payback against a grid connection that does not exist is meaningless; those systems show capital cost and cost-per-kWh-delivered instead.

## 6. Data tables

Four tables must be populated before Phase 1 is complete. Two of them contain real-world figures that **must be sourced, not estimated**, and each carries provenance and an effective date rendered in the UI:

| Table | Source requirement |
|---|---|
| `psh.ts` | Monthly peak sun hours per district, taken from a named public dataset (Global Solar Atlas, NASA POWER, or PVGIS) with the source and extraction date recorded in the file |
| `tariffs.ts` | Current CEB domestic block rates and fixed charges, transcribed from the published tariff schedule, with its effective date shown wherever a cost figure appears |
| `appliances.ts` | Typical wattages for the Sri Lankan domestic appliance mix, with surge factors |
| `components.ts` | Representative locally-available panels, batteries, inverters, controllers with indicative LKR pricing |

Sourcing these is an explicit implementation task. Plausible-looking invented figures would undermine the tool more than a missing feature would, because the user cannot tell them apart.

## 7. User interface

### 7.1 Wizard

Five screens, one question each:

1. **What are you building?** Off-grid, hybrid, or grid-tied, described in plain language. A "Not sure?" path asks two questions — do you have mains power, and does it cut often — and chooses for the user.
2. **Where are you?** District dropdown resolving to monthly PSH. "Elsewhere" falls back to a broader region or manual entry.
3. **Your usage.** The fork: "I have my bill" or "Let me list my appliances."
4. **Preferences.** Autonomy days, locally available panel wattage, budget bias. All pre-filled with defaults and skippable in one tap.
5. **Results.**

Two rules hold on every screen. Each carries a **"Not sure?"** link giving a plain explanation and a safe default. And **no jargon travels unescorted**: terms such as MPPT, depth of discharge, and peak sun hours are rendered with a dotted underline and a tap-to-define interaction backed by `glossary.ts`.

### 7.2 Results

An editable input sidebar persists alongside the results — sticky on desktop, a bottom sheet on mobile — so that after the first run the app behaves as a live calculator. Every edit re-runs the engine and the figures update immediately.

The page is tiered so one layout serves both audiences:

1. **Your system.** Four cards — panels, battery, inverter, controller — each stating its result in one plain sentence, each with a "Why this number?" expander.
2. **Warnings.** Non-blocking, plain-English notices from `validate.ts`.
3. **Shopping list.** A bill of materials with quantities, specifications, and editable LKR unit prices.
4. **Twelve-month chart.** Generation against consumption.
5. **Cost and payback.**
6. **Show me the maths.** Collapsed by default; renders every `explain` block on the page in full.

A print stylesheet renders the whole page as a document the user can take to a supplier.

## 8. Validation and error handling

The absence of a network, a database, and authentication eliminates the entire class of asynchronous failures. What remains is three tiers:

1. **Input guards.** Values clamp to sane ranges with an inline note explaining the clamp. Nothing silently rejects input.
2. **Sanity warnings** from `validate.ts` — non-blocking, always in plain English. Examples: the appliance list accounts for only 40 % of the stated bill; the inverter is far larger than the array can feed; the array cannot recharge the bank within one worst-month day; the controller's PV voltage ceiling is below the string's cold V_oc.
3. **Engine invariants.** `sizeSystem` throws only on genuinely impossible input. A React error boundary catches this and shows a recoverable message rather than a blank page.

## 9. Testing

Vitest, with the weight of the suite on the engine.

- **Unit tests per module**, table-driven, covering boundaries: zero load, single appliance, bus-voltage thresholds, cable sizes at rounding edges.
- **Golden cases** — three end-to-end scenarios with hand-verified expected output: a small off-grid cabin, a typical Sri Lankan hybrid home, and a grid-tied rooftop. These are the primary regression net.
- **Property tests** — monotonicity invariants: increasing load never reduces panel count, battery capacity, or inverter size.
- **Explanation coverage** — every `Sized` value produced by a full `sizeSystem` run must carry a non-empty `plain` and `substituted` string. This makes the comprehension goal a build-breaking requirement rather than a matter of diligence.
- **UI tests** are deliberately light: wizard navigation, the fork between input paths, and results rendering.

## 10. Phasing

Each phase ends with something that runs.

| Phase | Contents | Done when |
|---|---|---|
| 1 | Engine, data tables, minimal unstyled results | Golden cases pass; a real design can be computed |
| 2 | Wizard, live sidebar, explanations, glossary | **Shippable v1** — a beginner can complete it unaided |
| 3 | Cable and breaker sizing, monthly chart, cost and payback, print | Full output set delivered |

## 11. Deferred

Recorded so they are not re-litigated: PVGIS or NASA POWER live lookup behind the existing sun-data interface; tilt and azimuth optimisation; lead-acid support; shading estimation; net-metering and net-accounting scheme modelling; PWA install; multi-region expansion beyond South Asia; saved projects.
