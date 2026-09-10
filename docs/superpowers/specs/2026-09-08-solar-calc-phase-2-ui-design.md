# Solar System Calculator — Phase 2 UI Design

**Date:** 2026-09-08
**Status:** Approved design, pending implementation plan
**Extends:** `2026-09-08-solar-calc-design.md` (the parent spec). Where the two
disagree, the parent spec wins and this document is wrong and must be fixed.

## 1. Purpose and scope

Phase 1 delivered a pure sizing engine and an unstyled dump proving it runs end to
end. Phase 2 delivers the interface that makes the engine usable by the person the
parent spec was written for: someone with an electricity bill, no solar vocabulary,
and no installer to ask.

Phase 2 is **shippable v1**. Done when a beginner can complete the tool unaided and
leave with a system size they understand and can share.

### In scope

- The five-screen wizard of parent §7.1.
- The live-editing input sidebar of parent §7.2.
- Results tiers 1, 2 and 6: system cards, warnings, "Show me the maths".
- The glossary and the no-jargon-travels-unescorted rule.
- URL encoding of inputs, which is the app's only persistence.
- A visual system: tokens, layout, responsive behaviour.

### Out of scope, deferred to Phase 3

Shopping list, twelve-month chart, cost and payback, cable and breaker sizing, print
stylesheet. Recorded here so they are not re-litigated mid-implementation.

### Out of scope, permanently

`localStorage` or any device storage. The parent spec's non-goals rule out saved
projects and data collection; the URL carries a design, and nothing else does.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Styling | CSS custom properties in one global stylesheet, plus co-located `*.module.css` per component | Scoping without naming discipline; styles live beside the component that owns them. Native to Vite, no dependency |
| Persistence | The URL, and only the URL | Matches "no data collection"; keeps "saved projects" genuinely deferred; a reload keeps the design because the URL does |
| Wizard/sidebar sharing | Shared input primitives, separately composed surfaces | Clamping, validation display and glossary behaviour written once; the wizard's help panel does not bleed into the sidebar's markup |
| State | One reducer | Parent §4.3: no state library |
| Routing | `view` and `step` in state | Parent §4.3: no router |
| Tone | Calm reference document | Comprehension is the defining constraint. Nothing may compete with the sentence explaining the number |

## 3. Module layout

```
src/state/appState.ts      reducer: view, step, inputs, touched
src/state/url.ts           SystemInputs <-> query string codec
src/data/glossary.ts       term id -> plain definition, typed keys
src/ui/primitives/         ChoiceList, NumberField, SelectField, Term, WhyThisNumber
src/ui/wizard/             Wizard + four step components
src/ui/results/            Results, SystemCard, Warnings, ShowTheMaths, InputSidebar
src/ui/ErrorBoundary.tsx
src/styles/tokens.css      custom properties and reset — the only global stylesheet
src/ui/**/*.module.css     everything else
```

`src/ui/DesignDump.tsx` and `DesignDump.test.tsx` are deleted. They existed to prove
the engine ran end to end; the results page now does that, and two renderings of the
same design would drift.

### Import boundary

The Phase 1 rule stands: `src/engine/**` and `src/data/**` must not import from
`react`, `src/ui/**`, or `src/state/**`. Phase 2 adds one permitted arrow:
`src/state/**` may import `src/engine/**` and `src/data/**`, never the reverse. The
existing boundary test is extended to assert this.

`src/data/glossary.ts` is data, not UI: plain strings, no React import. It sits in
`data/` so the boundary test covers it.

## 4. State

```ts
type View = 'wizard' | 'results'
type TouchedField = 'autonomyDays' | 'panelId'

interface AppState {
  view: View
  step: number          // 0..3, the four question screens
  inputs: SystemInputs  // from engine/types, unchanged
  touched: TouchedField[]
}
```

`inputs` is the engine's own `SystemInputs`. The UI introduces no parallel input type
and no bare-number escape hatch.

### The `touched` rule

`autonomyDays` has a per-system-type default (off-grid 2, hybrid 0.5, grid-tied 0).
Changing system type must re-apply the new default **unless the user has set autonomy
themselves**, in which case their value survives. Without this flag one of two bugs is
unavoidable: switching type silently keeps a value that is wrong for the new type, or
it silently discards a choice the user deliberately made. `panelId` follows the same
rule for the same reason.

A field enters `touched` when the user edits it, in the wizard or the sidebar. Nothing
removes it.

### Running the engine

`sizeSystem(inputs)` runs inside a `useMemo` keyed on `inputs`. It is pure and cheap;
there is no debounce, no effect, and no loading state. Every edit re-runs it and the
figures update in the same render.

## 5. URL codec

`url.ts` exposes `encodeInputs(inputs): string` and `decodeInputs(query): SystemInputs | null`.

- Encoding produces a compact query string — short keys, no JSON blob, appliance
  entries as a delimited list.
- Decoding is **defensive and total**: it never throws. An unknown district id, a
  non-numeric figure, a truncated appliance list, an unknown appliance id, or a missing
  key each fall back to that field's default.
- `null` has one precise meaning: **the query does not identify a design**. Because
  `defaultInputs` needs a system type and a district before any other field has a
  default, a query missing or garbling either of those returns `null` and the wizard
  starts. Everything else degrades to a default and still yields a design.
- `App` writes the query with `history.replaceState` on every input change, not
  `pushState`. The back button must not become an undo stack.
- A URL carrying decodable inputs opens at `view: 'results'`; a bare URL opens the
  wizard at step 0.

Round-tripping is a property test: for generated inputs, `decodeInputs(encodeInputs(x))`
deep-equals `x`.

## 6. Wizard

Four question screens, then results, per parent §7.1.

1. **What are you building?** Off-grid, hybrid, grid-tied, each described in plain
   language with no jargon in the option label. A "Not sure?" path asks two questions —
   do you have mains power, and does it cut often — and chooses.
2. **Where are you?** District select resolving to monthly PSH, with manual PSH override
   behind a disclosure.
3. **Your usage.** The fork: "I have my bill" or "Let me list my appliances." The
   appliance path is a real editor — add an appliance, set quantity, hours per day, and
   whether it runs by day, at night, or both. This is the only path that yields a real
   peak-demand figure, which is the reason the fork exists.
4. **Preferences.** Autonomy days, panel wattage, all pre-filled and skippable in one
   action.

Two rules hold on every screen, from parent §7.1: each carries a **"Not sure?"**
disclosure giving a plain explanation and the safe default, and **no jargon travels
unescorted**.

Focus moves to the screen heading on every step change, so a keyboard or screen-reader
user is not left at the top of the document.

## 7. Results

### Tier 1 — Your system

Four cards: panels, battery, inverter, charge controller. Each leads with one plain
sentence stating the result, with the figure typographically dominant, and carries a
"Why this number?" disclosure rendering `explain.plain` followed by
`explain.substituted`.

Battery and controller cards are absent for grid-tied. The engine already returns
`null` for `battery`, `controller` and `busVoltage` on that path; the UI reads that
null and renders nothing rather than carrying its own rule about system types.

### Tier 2 — Warnings

`design.warnings` rendered as non-blocking notices. `caution` and `info` are visually
distinct. Warnings never block progress and are never modal.

### Tier 6 — Show me the maths

Collapsed by default. Expanded, it walks every `Sized` field in the design and renders
`plain`, `formula`, `substituted` and `assumptions` in full.

### The sidebar

The same inputs in compact form, persisting alongside the results so that after the
first run the app behaves as a live calculator. Sticky column on desktop, bottom sheet
on mobile. It composes the same primitives as the wizard.

## 8. Primitives

`ChoiceList`, `NumberField`, `SelectField`. Each owns its label, its clamp note, and
its glossary-annotated hint. Wizard screens compose them at full size alongside the
"Not sure?" panel; sidebar rows compose the same primitives compactly.

`Term` renders a `<button>` with a dotted underline that toggles an inline definition
panel — no floating library, no portal, no hover-only interaction. Ids are
`keyof typeof GLOSSARY`, so a term with no definition is a compile error rather than a
review catch.

`WhyThisNumber` wraps a `Sized<T>` in a `<details>` disclosure and is the single place
explanation text is rendered.

## 9. Failure handling

Three tiers, matching parent §8.

1. **Input guards.** Values clamp at the primitive, with an inline note naming the clamp
   ("A bill above 5,000 units is unusual — using 5,000"). Nothing silently rejects
   input. The reducer therefore only ever sees values the engine can size.
2. **Sanity warnings.** Already produced by `validate.ts` in plain English; rendered as
   tier 2 above.
3. **Engine invariants.** `ErrorBoundary` wraps the results tree, catches a throw from
   `sizeSystem`, and offers "start over" rather than a blank page.

## 10. Visual system

Tokens in `tokens.css`: an off-white ground, near-black text, a single accent reserved
for result figures and the primary action, and a caution amber for warnings. A
four-step type scale, a 4px spacing scale, two radii. Tabular numerals wherever a
figure appears.

Mobile-first, with one breakpoint where the sidebar becomes a sticky column. The
restraint is functional, not decorative: a beginner reading a sentence that explains a
number must not be competing with the interface for attention, and the layout has to
survive a cheap phone in daylight.

## 11. Testing

Light on the UI, per parent §9, and unit-heavy where logic actually lives.

- **Reducer** — transitions, the fork, and the `touched` rule in both directions:
  switching system type re-defaults untouched autonomy, and preserves touched autonomy.
- **URL codec** — round-trip property test; decode of malformed, partial and hostile
  queries returns defaults rather than throwing.
- **Wizard** — navigation forward and back, the bill/appliance fork, and that a
  completed wizard lands on results.
- **Results** — renders for all three system types, and that grid-tied omits the
  battery and controller cards.
- **Glossary** — every `Term` id resolves to a non-empty definition.

Engine and data coverage is untouched: 131 of the current 133 tests, all of which must
stay green. The other two belong to `DesignDump` and are deleted with it.

## 12. Acceptance

Phase 2 is complete when, on a real browser against the dev server:

1. A bare URL starts the wizard, and a beginner can reach results without encountering
   an unexplained term.
2. Editing any sidebar field re-runs the engine and updates the figures immediately.
3. The resulting URL, opened in a fresh tab, reproduces the same design.
4. Grid-tied results show no battery or controller card.
5. Every figure on the page has a "Why this number?" that explains it in plain language.
6. `npm test`, `npm run typecheck` and `npm run build` all pass.
