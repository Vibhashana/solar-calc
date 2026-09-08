# SDD ledger — plan: docs/superpowers/plans/2026-09-08-solar-calc-phase-1-engine.md

Spec: docs/superpowers/specs/2026-09-08-solar-calc-design.md (read; binding authority)
Branch: feat/phase-1-engine (repo initialised at setup; greenfield, no prior commits)

## Setup

Ruling: worked on `feat/phase-1-engine`, not `main` — the plan's Task 1 runs `git init`
on an empty directory, so no worktree existed to isolate. Branching costs nothing and
keeps `main` clean. If wrong: a trivial `git branch -m` fixes it.

## Pre-flight scan

### Interface pairs (producer -> consumer)

| Producer | Consumer | Produces / consumes | Finding |
|---|---|---|---|
| T2 types.ts | T3-T16 | all domain types, `Sized<T>` | OK — single definition site, no redefinition anywhere |
| T2 sized.ts | T7-T12 | `sized()`, `round2()` | OK — signatures match every call site |
| T3 defaults.ts | T6,T7,T8,T9,T11,T12,T13,T14,T15,T16 | `DEFAULTS`, `DERATE_DEFAULTS`, `INVERTER_MARKET_SIZES_W`, `BUS_VOLTAGE_THRESHOLDS_W`, `defaultInputs` | OK after Interfaces block corrected in plan self-review |
| T3 DEFAULTS ids | T6 catalog | `defaultPanelId: 'generic-550'`, `defaultBatteryModuleId: 'lfp-51v-100ah'` | OK — both ids exist in T6's PANELS / BATTERY_MODULES |
| T4 appliances.ts | T7 (default catalog), T14 test | `APPLIANCES`, ids `led-bulb`/`fridge`/`welding-machine` | OK — all three ids present in T4 |
| T5 psh.ts | T10, T13, T16 | `District`, `DISTRICTS`, `findDistrict`, `worstMonthPsh`, `annualMeanPsh`, `PSH_SOURCE` | OK after Interfaces block corrected |
| T6 components.ts | T13, T14 | `findPanel`, `findBatteryModule` | OK |
| T7 loads.ts | T8 test, T13 | `computeLoadProfile(load, diversity, catalog?)` | OK — T13 calls with 2 args, third defaults |
| T8 inverter.ts | T13 | `sizeInverterFromLoad`, `sizeInverterFromArray` | OK — both branches of T13 use the right one |
| T9 voltage.ts | T13 | `selectBusVoltage(inverterContinuousW)` | OK |
| T10 solar.ts | T13 | `resolveDesignPsh`, `sizeArray(dailyKwh, Sized<number>, derate, panel)` | OK — T13 passes `designPsh` as `Sized`, not a bare number |
| T11 battery.ts | T13 | `sizeBattery(nightKwh, autonomyDays, busVoltage, module)` | OK |
| T12 controller.ts | T13 | `sizeController(pvKw, busV, panel, panelCount, minAmbientC)` | OK |
| T13 sizeSystem.ts | T14 (modifies), T15, T16 | `sizeSystem(inputs)` | OK — T14's edit targets `warnings: []`, present in both return sites; `SystemDesign` already imported as a type |
| T1 vite.config.ts | T16 (modifies) | `test.environment` node -> jsdom | OK — engine tests are pure and pass under either environment |
| T1 App.tsx | T16 (modifies) | placeholder replaced | OK |
| T15 architecture guard | T5 generated psh.ts | forbids `/\bfetch\s*\(/` in src/data | OK — generated file contains `fetchedOn:`, which the word-boundary-plus-paren pattern does not match |
| T15 architecture guard | scripts/fetch-psh.ts | scans only src/engine + src/data | OK — script lives in scripts/, out of scan scope |

### Task-internal consistency

| Task | Finding |
|---|---|
| T1 | **P1, P2, P3** — three defects, see rulings |
| T2 | OK — test asserts exactly what the code provides |
| T3 | OK — derate product asserted `toBeCloseTo(0.78, 2)`; actual 0.7797 passes |
| T4 | OK |
| T5 | OK — 25 districts listed, test asserts 25 |
| T6 | OK |
| T7 | OK — arithmetic in every test hand-checked against the implementation |
| T8 | OK — 2000 W x 1.25 = 2500 -> rounds to 3000; 5750/1.15 = 5000 exactly |
| T9 | OK — boundary cases at 1000 and 3000 match the `<` / `<=` operators |
| T10 | OK — worst month of the fixture is 4.0; 10/(4x1) = 2.5 kW -> 5 panels |
| T11 | OK — 12/(0.85x0.95) = 14.86; series `round(48/51.2) = 1`, `round(48/12.8) = 4` |
| T12 | OK — 300 W stays under the 400 W MPPT threshold; Voc 500 V at 25 C exactly |
| T13 | OK — district checked before panel, matching the test's expectation order |
| T14 | OK after the two defects fixed during plan self-review (dead C-rate fixture, always-firing recharge warning) |
| T15 | OK — `sourceFiles` excludes `.test.ts`, so the guard does not scan itself |
| T16 | **P4** — see rulings |

### Rulings

Ruling: P1 — `vite.config.ts` imported `defineConfig` from `vite`, which has no `test`
key in its type, so `npm run typecheck` would fail at Task 1. Changed the import to
`vitest/config`. If wrong: typecheck fails immediately on Task 1 and is obvious.

Ruling: P2 — `@types/node` was absent, but `tsconfig.json` includes `scripts/` (which
uses `node:fs`) and Task 15's guard test uses `node:fs`/`node:path`. Added
`@types/node` to devDependencies. If wrong: an unused dev dependency, no runtime cost.

Ruling: P3 — `"build": "tsc -b"` conflicts with `noEmit: true` on a non-composite
project. Changed to `tsc --noEmit && vite build`. If wrong: the build script errors
visibly the first time Task 16 runs it.

Ruling: P4 — Task 16's tests used `getByText(/panels/i)`, but the explanation prose
repeats "panels" and "battery" throughout the rendered page, so Testing Library would
throw "found multiple elements" rather than pass. Rewrote both tests to query by
heading role with exact names, and added the negative assertion for Battery on the
grid-tied case. If wrong: the Task 16 tests fail visibly and are cheap to re-target.

## Progress

BASE for Task 1: 05d2f89 (docs commit)
Task 1: implementer DONE — commit 20ccd6c, 1/1 passing, reported output pristine.
  Deviation reported by implementer: pinned `vite` to 5.4.x rather than the brief's
  ^6.0.3, to resolve a type incompatibility with the Vite 5.4.21 that vitest 2.1.8
  bundles. Not yet adjudicated — sent to review without pre-judgement.
Task 1: review dispatched (sonnet) over 05d2f89..20ccd6c.
Task 1: review returned spec ✅, quality Approved, 0 Critical, 0 Important, 1 Minor.
Task 1: two ⚠️ items resolved by controller — commit trailer verified present verbatim
  via `git log -1 --format=%B 20ccd6c`; test output verified pristine (1/1, no warnings).
Task 1: minor (deferred): `vite` pinned as `"5.4.x"` while every other dep uses a caret
  range. Functionally equivalent, style inconsistency only.
Ruling: accepted the implementer's `vite` 5.4.x deviation from the brief's ^6.0.3. The
  reviewer independently verified against the lockfile that vitest 2.1.9 declares a
  `vite: ^5.0.0` peer requirement, so Vite 6 was genuinely incompatible — this is a
  correctly diagnosed fix, not drift, and stays inside the allowed devDependency set.
  If wrong: a later Vite-6-only feature would be unavailable; none is planned in Phase 1.
Task 1: complete (commits 05d2f89..20ccd6c, review clean)

BASE for Task 2: 20ccd6c
Task 2: implementer DONE — commit 19035b8, 5/5 passing (4 new + smoke), typecheck clean.
Task 2: review dispatched (sonnet) over 20ccd6c..19035b8.
Task 2: review returned spec ✅, quality Approved, 0 Critical, 1 Important, 0 Minor.
  Important finding was evidentiary, not code: report's GREEN output used a
  `PASS (4) FAIL (0)` format vitest never emits — reconstructed, not pasted.
  Reviewer independently confirmed the code is a byte-exact match to the brief.
Task 2: controller independently re-ran suite — 5/5 passing, typecheck clean. The
  reported RESULTS were accurate; only the output FORMAT was reconstructed.
Ruling: ran fix round 1 for the evidentiary finding but verified the corrected report
  myself instead of dispatching a scoped re-reviewer. The fix touches only the report
  file, which lives in git-ignored scratch, so `review-package` would hand a re-reviewer
  an empty diff — there is nothing for it to verify that I cannot read directly. If
  wrong: one report correction goes unwitnessed by a second pair of eyes, on a task
  whose code two parties have already verified byte-exact.
Ruling: from Task 3 onward, every implementer dispatch explicitly requires raw verbatim
  terminal output in the report, ANSI escapes included. Cheap to state, and it prevents
  the same finding recurring across fourteen remaining reports. If wrong: slightly
  noisier report files.
Task 2: fix round 1/5 (1 addressed, 0 open; no commit — report-only fix).
  Controller verified: report lines 47-73 now carry raw vitest output with ANSI escapes
  intact; the reconstructed block is replaced, and its only surviving mention (line 137)
  explicitly labels it as the original defect. Finding ADDRESSED.
Task 2: complete (commits 20ccd6c..19035b8, review clean after 1 fix round)

BASE for Task 3: 19035b8
Task 3: implementer DONE — commit f9cee0a, 11/11 passing (6 new), typecheck clean.
Task 3: review dispatched (sonnet) over 19035b8..f9cee0a.
Task 3: review returned spec ✅, quality Approved, 0 Critical, 1 Important, 2 Minor.
  Important is evidentiary again (same class as Task 2): RED output was a bare
  one-liner, missing vitest's FAIL banner and summary block. Reviewer independently
  confirmed the derate-product assertion discriminates — substituting temperature 0.85
  for 0.89 lands 0.0359 outside the 0.005 tolerance, so the test is not vacuous.
Task 3: ⚠️ commit trailer resolved by controller — verified present verbatim on f9cee0a.
Task 3: minor (deferred): report claimed defaults.ts is 57 lines (actually 56); report
  claimed the brief's Step 4 focused command was run when `npm test` was run instead.
  Both folded into the fix round rather than deferred, since the implementer was already
  being resumed.
Task 3: fix round 1/5 (1 addressed + 2 minors addressed, 0 open; no commit).
  Controller verified: report now carries a genuine FAIL banner with ANSI escapes and a
  `Test Files 1 failed (1)` block, and line 13 discloses the RED state was reproduced
  after the fact rather than captured originally — honest, not passed off. Tree clean,
  HEAD still f9cee0a, 11/11 passing. Finding ADDRESSED.
Task 3: complete (commits 19035b8..f9cee0a, review clean after 1 fix round)

BASE for Task 4: f9cee0a
Task 4: implementer DONE — commit 1f4242c, 17/17 passing (6 new), typecheck clean.
Task 4: review dispatched (sonnet) over f9cee0a..1f4242c. First dispatch carrying the
  operational verbatim-output definition; report spot-check shows 12 real output markers.
Task 4: review returned spec ✅, quality Needs fixes, 0 Critical, 1 Important, 0 Minor.
  Code verified byte-for-byte across all 25 appliances; all six downstream-referenced ids
  present; planning-defaults comment intact. Important is evidentiary AGAIN (third
  consecutive): RED output a single retyped line, GREEN and full-suite captures genuine.
  Reviewer also confirmed on request that four of the five catalog tests would pass
  vacuously on an empty array, but the fifth (motor-load ids via findAppliance) would
  not — so the suite is not vacuous overall. That vacuity is inherited from the plan's
  own test design, not introduced by the implementer.
Task 4: fix round 1/5 (1 addressed, 0 open; no commit — report-only fix).
  Controller verified: task-4-red.txt written by shell redirect (981B, carries RUN/FAIL/
  Test Files markers), report line 50 discloses the reproduction explicitly, tree clean,
  HEAD still 1f4242c, 17/17 passing. Mechanical capture works. Finding ADDRESSED.
Task 4: complete (commits f9cee0a..1f4242c, review clean after 1 fix round)

BASE for Task 5: 1f4242c
Task 5: implementer DONE — commit 933ecf5, 24/24 passing (7 new), typecheck clean.
  Reported all 25 districts fetched live from NASA POWER, no partial failures.
Task 5: controller verified data independently — 25 district rows, 12 values each,
  range 3.89-6.54 (inside the 2.5-8 assertion), fetchedOn 2026-09-08 (today), PSH_SOURCE
  provenance present.
Task 5: OPEN PRODUCT CONCERN (not a task defect) — 25 districts yield only 10 distinct
  monthly series. Verified `gampaha` and `kandy` are byte-identical despite ~70 km and
  different climate zones; `ampara`/`batticaloa`/`polonnaruwa` likewise. Consistent with
  NASA POWER's ~0.5 degree climatology grid placing several district capitals in one cell.
  The script is faithful; the UI's district dropdown nonetheless implies a precision the
  source does not have. Nuwara Eliya does get its own (correctly lower) series.
  -> Carry to Phase 2/3 planning: either say so in the UI, or move to a finer source
  (PVGIS ~1 km) behind the sun-data interface the spec already anticipates in §11.
  Flagged to reviewer to judge independently rather than accept the implementer's
  grid-resolution explanation.
Task 5: review dispatched (sonnet) over 1f4242c..933ecf5.
Task 5: review returned spec ✅, quality Approved, 0 Critical, 0 Important, 2 Minor.
  Data-integrity verdict: NO fabrication. Reviewer independently queried the live NASA
  POWER endpoint (outside the generator) for 4 coordinate pairs and reproduced the
  committed values exactly, including the widest-separated collision pair. This rules out
  a script bug — the API itself returns identical series for those points.
Task 5: ⚠️ commit trailer resolved by controller — verified present verbatim on 933ecf5.
Task 5: minor (deferred): scripts/fetch-psh.ts calls `new Date().toISOString()` twice
  (header comment + PSH_SOURCE.fetchedOn); a run crossing UTC midnight would disagree by
  a day. Compute once into a const.
Task 5: minor (deferred): worstMonthPsh returns Infinity for an empty monthlyPsh, since
  the type is `number[]` rather than a 12-tuple. Not reachable today (generator-controlled
  data, test asserts 12 entries) but unguarded if the module is reused.
Task 5: complete (commits 1f4242c..933ecf5, review clean)

*** ESCALATED PRODUCT CONCERN — needs a human decision, does not block Phase 1 ***
  The reviewer's independent API queries confirmed something worse than coarse precision:
  GALLE (coastal, ~sea level) and NUWARA ELIYA (hill country, ~1868 m) receive BYTE-
  IDENTICAL monthly irradiance from NASA POWER — 102 km apart, utterly different climates.
  Nuwara Eliya is materially cloudier in reality; a hill-country user would be handed
  coastal Galle's sunshine and would UNDER-SIZE their array.
  This is not a code defect — the fetch is faithful and the reviewer proved it. It is the
  data source being unfit for Sri Lankan hill country at this resolution.
  Options for Phase 2/3: (a) move to PVGIS (~1 km) behind the sun-data interface the spec
  already anticipates in §11; (b) apply an elevation correction; (c) surface shared cells
  honestly in the UI and let the user override PSH. Recorded, not decided — the choice
  affects what the tool promises its users.

BASE for Task 6: 933ecf5
Task 6: implementer DONE — commit 5441b28, 30/30 passing (6 new), typecheck clean.
  Mechanical capture files task-6-red.txt / task-6-green.txt both present; trailer
  pre-verified by controller so the reviewer need not spend a ⚠️ on it.
Task 6: review dispatched (sonnet) over 933ecf5..5441b28. Asked it to check the sign of
  every vocTempCoefficientPctPerC specifically — a positive value would invert Task 12's
  cold-morning Voc check, which exists to stop a user destroying a charge controller.
Task 6: review returned spec ✅, quality Approved, 0 Critical, 0 Important, 2 Minor.
  All four Voc coefficients confirmed negative (-0.27, -0.27, -0.26, -0.31) and the
  per-element assertion would fail on a positive one. Reviewer also sanity-checked
  physical coherence: implied module efficiencies 21.3-21.5% for the mono panels and
  16.9% for the poly one (correctly lower), and LiFePO4 nominal voltages match 4S/8S/16S
  at 3.2 V per cell. Data is physically sound, not just well-formed.
Task 6: ⚠️ full-suite claim resolved by controller — `npm test` confirms 30/30 in 6 files.
Task 6: minor (deferred): report asserted a 30-test aggregate without a capture file for
  the full-suite run; only the single-file RED/GREEN runs were captured.
Task 6: minor (deferred): a catalog truncated to only the two default-id entries would
  pass every test — the loop assertions are per-element and the only non-vacuous checks
  are the two default-id lookups. Inherited from the plan's test design (mine), not the
  implementer's. Same class as the Task 4 vacuity note.
Task 6: complete (commits 933ecf5..5441b28, review clean)

BASE for Task 7: 5441b28

*** CORRECTION — I WAS WRONG ABOUT THE "FABRICATED EVIDENCE" FINDINGS ***
  Root cause found at Task 7: `rtk` (a token-optimising CLI proxy at
  C:/Users/Novaline/.rtk/bin/rtk, documented in the user's global CLAUDE.md) intercepts
  commands via a Claude Code hook and REPLACES their output with condensed summaries like
  `PASS (4) FAIL (0)` and `FAIL (1) ... (1 test suite)`, and inserts `[N more lines]`
  truncation markers.
  Proof: `npx vitest run src/engine/sized.test.ts > probe.txt 2>&1` wrote ZERO bytes to
  the file while still displaying `PASS (4) FAIL (0)` — the redirect captured nothing
  because rtk had already swallowed the real stream.
  `rtk proxy "<cmd>"` bypasses the filter and yields genuine output (verified: raw vitest
  banner, per-file checkmarks, Test Files / Tests block, ANSI escapes, 470 bytes).
  CONSEQUENCE: the Important "fabricated/reconstructed evidence" findings on Tasks 2, 3
  and 4 were very likely NOT dishonesty. Those implementers were pasting exactly what
  their terminal showed them. The reviewers reached the same wrong conclusion because
  they run inside the same filtered environment and judged the format against what
  vitest normally prints. Three fix rounds were spent on a non-problem.
  The `[10 more lines]` marker I read as a hand-written placeholder is rtk's truncation
  marker. That was the strongest-looking evidence and it was the filter's, not a human's.
Ruling: I own this — I escalated a tooling artefact into an integrity accusation three
  times without first checking whether the environment was altering output. The check
  that settled it (redirect to a file, then measure the file) cost one command and should
  have come before the first accusation. If wrong: nothing further, this is the
  correction.
Ruling: from Task 8, every implementer captures evidence with `rtk proxy "<command>" >
  file 2>&1`, and every reviewer is told that condensed `PASS (n) FAIL (m)` output is
  legitimate rtk output rather than a sign of fabrication. If wrong: slightly longer
  commands, and reviewers stop spending findings on a format artefact.
Note: Task 4 and Task 6 red-captures were 981B of genuine raw vitest, so rtk's
  interception is not uniform across invocations. Using `rtk proxy` explicitly removes
  the ambiguity rather than relying on when the filter happens to engage.

Task 7: implementer DONE — commit a1c58d6, reported 40/40 across 7 files.
Task 7: controller verified independently via `rtk proxy` — genuine raw vitest output,
  10/10 in loads.test.ts, 40/40 full suite, typecheck clean. Evidence was real.
Task 7: review dispatched (sonnet) over 5441b28..a1c58d6, with the rtk correction supplied
  so it would spend its attention on arithmetic rather than output format.
Task 7: review returned spec ✅, quality Needs fixes, 0 Critical, 2 Important, 2 Minor.
  Reviewer hand-re-derived four expectations independently (energy summation, largest-
  single-surge, bill-path chain, diversity-applied-to-connected-watts-not-energy) and
  confirmed all correct for the right reasons. The core arithmetic is sound.
  Both Importants: `explain.substituted` interpolates a caller-supplied value unrounded,
  violating the global 2dp constraint — `diversityFactor` at loads.ts:71 and
  `load.nightFraction` at loads.ts:107. Invisible today only because every test uses
  values already <=2dp. A UI slider yielding 0.6666666666666666 would print it in full
  inside beginner-facing explanation text.
  Both defects originate in MY brief's reference code, not the implementer's work.
Task 7: fix round 1/5 dispatched — round2 both, plus two regression tests I asked for
  beyond the review's Minors: a non-round diversityFactor/nightFraction case (which is
  what would have caught this), and a quantity>1 surge case guarding the "one motor
  starts at a time" assumption the whole surge model rests on.
Ruling: swept the plan for the same defect class before it recurs. Distinguished
  user-supplied interpolations (risk) from fixed constants and catalog values (safe).
  Two more genuine instances found and corrected in the plan text NOW, ahead of dispatch:
    - Task 10 solar.ts: all four `derate.*` factors interpolated raw. SystemInputs.derate
      is user-editable per the spec's sidebar, so this is live.
    - Task 11 battery.ts: `autonomyDays` interpolated raw. Also user-supplied.
  Left alone as safe: DEFAULTS constants (daysPerMonth, headroom, DoD, ratios), BusVoltage
  literals, and catalog-controlled panel/module fields, none of which a user can set to an
  arbitrary-precision value.
  If wrong: two harmless extra round2 calls on values that were already short.
  Briefs 10 and 11 must be re-extracted from the corrected plan before dispatch.
Task 7: fix round 1/5 (3 addressed, 0 open; commits a1c58d6..caf357d).
  Re-reviewer confirmed both round2 fixes landed and that all three new regression tests
  genuinely discriminate: the 1/3 and 2/3 cases would render repeating decimals on
  pre-fix code, and the quantity>1 surge test would yield 8000 rather than 5000 had the
  implementation used `watts * quantity`. Real guards, not decoration. No new breakage.
Task 7: controller verified via `rtk proxy` — 43/43 across 7 files, typecheck clean.
Task 7: complete (commits 5441b28..caf357d, review clean after 1 fix round)
Briefs 10 and 11 re-extracted from the corrected plan; both corrections confirmed present.

BASE for Task 8: caf357d
Task 8: implementer DONE — commit adcaa7c, 50/50 passing (7 new), typecheck clean.
  Controller verified via `rtk proxy`; trailer verified present.
Task 8: review dispatched (sonnet) over caf357d..adcaa7c. Asked it to (a) re-derive the
  market-size rounding boundary (3000 -> 3000 requires >= not >), (b) confirm surge is
  carried through UNROUNDED since it is a requirement rather than a size you buy, and
  (c) judge whether the tests would catch an inverted DC:AC ratio — multiplying by 1.15
  instead of dividing would oversize every grid-tied inverter by ~32% and still look
  plausible.
Task 8: review returned spec ❌ (one contract gap), quality Needs fixes, 0 Critical,
  1 Important, 2 Minor. All arithmetic hand-verified correct by the reviewer: the >=
  boundary at 3000, the 1.25 headroom path, exact 5750/1.15 = 5000, and the unrounded
  surge pass-through. Reviewer further confirmed the existing tests WOULD catch both an
  inverted DC:AC ratio (would compute 6612.5 -> 8000, failing toBe(5000)) and a >/>= slip.
  Important: two `substituted` strings contain no `=`, breaking the contract types.ts
  documents ("ending in = result") — surgeRequiredW in both functions. Originates in MY
  brief's sample code again, faithfully reproduced.
Task 8: fix round 1/5 dispatched — fix both strings, add a test iterating every Sized
  value from both functions (the assertion whose absence let this through), and add the
  missing consequence clause to the surge copy ("a fridge or pump may refuse to start
  even though the inverter looks big enough"), which is exactly the beginner-facing
  point the tool exists to make.
Ruling: swept the plan for the same contract violation before it recurs, as with the
  rounding class at Task 7. Three more instances found and corrected in the plan text
  ahead of dispatch:
    - Task 9 voltage.ts: `... W inverter -> ${value} V` had no `=`.
    - Task 10 solar.ts: the PSH-override branch was bare `${round2(override)} hours`.
    - Task 12 controller.ts: `${round2(arrayW)} W -> ${type}` used an arrow, not `=`.
  If wrong: three slightly wordier explanation strings.
Ruling: also strengthened Task 15's explanation-coverage test — the systemic guard. It
  now asserts every `Sized.explain.substituted` contains `=` AND that no numeral in it
  carries more than 2 decimals. Those are precisely the two defect classes that reached
  review in Tasks 7 and 8; with this in place they fail the build instead of costing a
  review round each. If wrong: the golden test is stricter than the contract, which
  surfaces immediately at Task 15 rather than silently.
  Briefs 9, 10, 12 and 15 must be re-extracted from the corrected plan before dispatch.
Task 8: fix round 1/5 (3 addressed, 0 open; commits adcaa7c..60a9d40).
  Re-reviewer confirmed both strings now carry `=`, the new test genuinely discriminates
  (pre-fix `'0 W'` and the bare surge string both fail its toContain('=')), and the added
  consequence clause is plain-language with no jargon leak. No new breakage.
Task 8: controller verified via `rtk proxy` — 51/51, typecheck clean; all four
  substituted strings inspected directly and all contain `=`.
Task 8: complete (commits caf357d..60a9d40, review clean after 1 fix round)
Briefs 9, 10, 12, 15 re-extracted from the corrected plan.

BASE for Task 9: 60a9d40
Task 9: implementer DONE — commit 2a26b58, 55/55 passing (4 new), typecheck clean.
  Controller verified via `rtk proxy`; trailer verified present.
Task 9: review dispatched (haiku — small single-function diff, 2.3 KB). Asked it to
  derive the returned voltage at 999/1000/3000/3001 by reading the operators rather than
  trusting the tests, since the rule is asymmetric (`<` lower, `<=` upper) and an
  off-by-one would silently propagate into battery configuration and cable sizing.
Task 9: review returned spec ✅, quality Approved, 0 Critical, 0 Important, 0 Minor.
  First task in the plan to come back with no findings at all. Reviewer derived all four
  boundaries from the operators directly: 999->12, 1000->24, 3000->24, 3001->48, and
  confirmed the tests pin both exact thresholds rather than only interior values.
Task 9: ⚠️ threshold constants resolved by controller — defaults.ts confirms
  `{ to12V: 1000, to24V: 3000 }`, matching what the boundary derivation assumed.
Task 9: complete (commits 60a9d40..2a26b58, review clean, no fix round)

BASE for Task 10: 2a26b58
Task 10: implementer DONE — commit 14bdaea, 65/65 passing (10 new), typecheck clean.
  Controller verified via `rtk proxy`; trailer verified present.
  FORWARD SWEEP CONFIRMED WORKING: solar.ts ships with `round2(derate.soiling)` etc
  already in place, so the Task 7 rounding defect did NOT recur here. Correcting the
  plan ahead of dispatch was the right call and saved a review round.
Task 10: review dispatched (sonnet — highest-stakes arithmetic in the engine). Asked it
  to check three inversions that would look plausible while being badly wrong: derate
  applied as a multiplier rather than a divisor (would REDUCE panel count), Math.floor
  substituted for Math.ceil, and grid-tied accidentally using worst month instead of the
  annual mean. Also asked what happens when two months tie for the minimum, since the
  month name is derived by indexOf on the minimum value.
Task 10: review returned spec ❌ (one formatting gap), quality Needs fixes, 0 Critical,
  1 Important, 2 Minor. Arithmetic verified correct by independent hand-derivation:
  derate as divisor, Math.ceil, zero-load guard, and all four design-month paths incl.
  override precedence (override=0 is honoured, since the check is `!== undefined`).
  Reviewer confirmed each of the three inversions I flagged WOULD fail a test — an
  inverted derate yields 4 panels against the lossless 5, tripping toBeGreaterThan.
  Tie-breaking on indexOf judged harmless: a tie means both months share the minimum, so
  the numeric answer is unaffected and the named month is still factually a worst month.

*** CORRECTION TO MY OWN TASK 7 SWEEP ***
  Important finding: solar.ts:89,95,101 interpolate `panelKw` (from `panel.watts`) and
  `panel.areaM2` into `substituted` unwrapped. When I swept the rounding class at Task 7
  I explicitly classified "catalog-controlled panel/module fields" as SAFE. That was
  wrong. The spec lets users override component specs with datasheet values from panels
  they actually buy, so those fields are caller-supplied in exactly the sense the rule
  cares about. Today's catalog is decimal-clean (450/550/600/330 W) which is the only
  reason nothing failed — a 555 W panel gives panelKw = 0.555.
  Note also that Task 15's strengthened guard is necessary but NOT sufficient here: it
  only fires if the shipped data actually produces >2 decimals, which the clean catalog
  never does. A fixture with awkward values is required, so I asked for one.
Ruling: re-swept with the corrected classification. Wrapped three more catalog-derived
  interpolations in the plan ahead of dispatch — Task 11's `module.nominalVolts` and
  `module.ampHours`, Task 12's `panel.vocVolts`. If wrong: three redundant round2 calls
  on values that were already short. Briefs 11 and 12 need re-extraction.
Task 10: fix round 1/5 dispatched — wrap the three interpolations, plus a regression test
  using a deliberately awkward PanelSpec (555 W, 2.583 m²) that must fail pre-fix.
Task 10: minor (deferred): unit string is 'm2' rather than 'm²'.
Task 10: minor (deferred): the worst-month assumption text states monsoon causation as
  unconditional fact rather than a simplification.
Task 10: fix round 1/5 (2 addressed, 0 open; commits 14bdaea..9cce363).
  Re-reviewer confirmed all three sites wrapped, scanned the rest of solar.ts for missed
  interpolations (none), and verified the new test genuinely discriminates: its regex
  /\d+\.\d{3,}/ matches the pre-fix `0.555` and not the post-fix `0.56`. Report shows
  pre-fix FAIL, post-fix PASS. No new breakage.
Task 10: controller verified via `rtk proxy` — 66/66, typecheck clean.
Task 10: complete (commits 2a26b58..9cce363, review clean after 1 fix round)
Briefs 11 and 12 re-extracted with the corrected catalog-value wrapping.

BASE for Task 11: 9cce363
Task 11: implementer DONE — commit 441d7c8, 73/73 passing (7 new), typecheck clean.
  Controller verified via `rtk proxy`; trailer verified present.
Task 11: review dispatched (sonnet). Beyond the arithmetic, asked for an explicit design
  judgement on `Math.round(busVoltage / module.nominalVolts)`: a module whose nominal
  voltage does not divide the bus cleanly gets silently rounded to a series count that
  yields the WRONG bank voltage. Told the reviewer to report it as a design gap in plain
  terms if that is what it is, rather than forcing it into a severity bucket — this is a
  question about what the tool should do, not whether the code matches the brief.
Task 11: review returned spec ✅, quality Approved, 0 Critical, 2 Important, 1 Minor.
  Arithmetic verified correct by hand: 6x2=12 usable, 12/0.8075=14.86 nominal (division
  confirmed, not multiplication — inverting would give 9.69 and trip the test), 309.6 Ah,
  both series cases, ceil on parallel, guarded zero-load.

*** ESCALATED: REAL USER-FACING BUG, REACHABLE FROM DEFAULTS ***
  The reviewer flagged Math.round on modulesInSeries as a LATENT design gap, judging it
  unreachable with the shipped catalog. I checked that judgement by running the engine
  and it is wrong — the defect is on the DEFAULT path:
    bill 100-500 kWh/mo -> inverter 1000-3000 W -> bus 24 V
    default module is lfp-51v-100ah (51.2 V)
    round(24 / 51.2) = round(0.47) = 0, clamped by Math.max(1, ...) to 1
    actual bank = 51.2 V, reported as 24 V — a 113% mismatch at every bill tested
  The plain text asserts "Wire 1 battery in series to reach 24 volts", which is false.
  Wiring a 51.2 V bank to a 24 V inverter destroys the inverter, and the beginner this
  tool is built for has no way to catch it. This is the most serious defect found so far
  and it was NOT a coding error — it is a spec gap I authored: the plan never stated that
  the module must divide into the system voltage.
Ruling: fixing at three levels rather than one, because one alone leaves a hole.
  (a) Task 11 fix round — battery.ts must stop claiming it reached the bus voltage when
      it did not, with a truthful alternative message and a test proving the old wording
      is gone. Numeric outputs unchanged.
  (b) Task 14 plan amended — validate.ts gains a `battery-voltage-mismatch` caution
      (>5% drift), plus two tests: the default 51.2V/24V case must warn, and a matched
      lfp-24v-100ah case must not.
  (c) Spec §5.4 amended — added "Bank voltage reachability" as a third cross-check, so
      the requirement is recorded where the design lives rather than only in the code.
  If wrong: a warning fires on an edge case someone considers acceptable, which is
  visible and easy to relax. The converse — staying silent — ships a recommendation that
  damages hardware.
Task 11: also fixing the plan-mandated weak assertion (toBeGreaterThanOrEqual(3) where
  the answer is exactly 4, so a Math.floor regression would pass silently).
Task 11: fix round 1/5 dispatched.
Task 11: minor (deferred): total battery count is recomputed inline in prose rather than
  exposed as its own Sized field.
Task 11: fix round 1/5 (1 addressed, 1 flagged NOT ADDRESSED; commits 441d7c8..0d52c85).
  Re-reviewer verified the tightened toBe(4), confirmed actualBankVolts is computed from
  the real series count (not circularly), numeric values unchanged, substituted contract
  still met, and no Warning object smuggled in. It flagged Finding 2 NOT ADDRESSED solely
  because the implementer used a 10% tolerance where I had specified 5%.

*** RULING: THE IMPLEMENTER WAS RIGHT AND MY SPEC WAS WRONG ***
  I checked the deviation instead of enforcing it, by computing drift for every
  module/bus pairing in the catalog. Result: EVERY legitimate LiFePO4 pairing sits at
  exactly 6.7% drift — 12.8V on 12V, 25.6V on 24V, 51.2V on 48V, and every multi-module
  series combination. The cause is physical: LiFePO4 cells are 3.2 V nominal, so real
  packs are 12.8/25.6/51.2 V while the industry sells them as "12/24/48 V" systems.
  A 5% tolerance would therefore have fired on every correct battery choice a user could
  make — telling them their right answer is wrong, which is worse than the original bug
  because it would train users to ignore the warning. A genuine mismatch is 113% out, so
  10% separates the two cleanly with a wide margin either side.
  Accepting 10%. Corrected the spec (§5.4, with the reasoning recorded so nobody
  "tightens" it later) and the Task 14 plan code (0.05 -> 0.1, with the same note).
  If wrong: a pairing between 10% and 113% out would pass unwarned; no such pairing
  exists in the catalog, and the arithmetic above shows none is physically plausible.
  Process note: the implementer should have reported the discrepancy rather than
  silently deviating — the outcome was right but the deviation was invisible until the
  re-review caught it. Not worth a further round; the code is correct.
Task 11: complete (commits 9cce363..0d52c85, review clean after 1 fix round + 1 ruling)

BASE for Task 12: 0d52c85
Task 12: implementer DONE — commit 2d3b557, 81/81 passing (6 new), typecheck clean.
Ruling: the range 0d52c85..2d3b557 contains TWO commits, not one. My uncommitted plan and
  spec edits (the Task 14 warning, the 10% tolerance correction, the spec §5.4 amendment)
  were still sitting in the working tree when I dispatched, and the implementer staged
  everything, so 90b3b36 carries my doc changes under a "feat(engine): size charge
  controller" subject. My mistake, not the implementer's.
  Decided NOT to rewrite history: the content is correct and committed, interactive
  rebase is unavailable in this environment, and rewriting a shared branch to fix a
  commit subject is a worse trade than a mislabelled message. Scoped the review package
  to 90b3b36..2d3b557 instead, so the reviewer sees only Task 12's actual code.
  If wrong: one commit in the history has a subject that does not describe its contents,
  recorded here so the final review is not confused by it.
Ruling: from Task 13, commit my own plan/spec edits BEFORE dispatching any implementer.
  Agents stage the whole tree; leaving my edits uncommitted makes them somebody else's
  commit. If wrong: one extra commit per doc change, which is the correct granularity
  anyway.
Task 12: review dispatched (sonnet) over 90b3b36..2d3b557. Asked it to verify the cold-Voc
  safety check specifically — above all that Math.abs is applied to the temperature
  coefficient. The stored coefficients are negative; using the sign directly would make
  the correction REDUCE voltage as temperature falls, inverting a safety check into a
  false reassurance and telling a user a dangerous string is safe.
Task 12: review returned spec ✅, quality Approved, 0 Critical, 0 Important, 3 Minor.
  SAFETY CHECK CONFIRMED CORRECT: Math.abs IS applied to the temperature coefficient
  (controller.ts:83), hand-derived 500 V at 25 °C and 530 V at 5 °C both match, and the
  reviewer verified the existing test WOULD catch its removal — without Math.abs the
  cold case yields 470 V against the warm 500 V, failing the toBeGreaterThan assertion.
  Also confirmed the tests would catch an inverted MPPT comparison and a dropped 1.25
  headroom.
Task 12: minor (deferred): no test at exactly 400 W to pin the strict-`>` MPPT boundary.
  The reviewer notes this is the one place a `>` vs `>=` typo would go undetected today.
  Inherited from my brief's test file. Worth adding — flagging for final-review triage
  rather than opening a fix round, since Minors do not enter the loop.
Task 12: minor (deferred): `toBeCloseTo(130.2, 0)` is a ±0.5 tolerance where the exact
  value is 130.21 — looser than necessary. Also inherited from my brief.
Task 12: minor (deferred): the `type` substituted string trails a parenthetical after the
  result, matching the accepted pattern already in inverter.ts. Consistent, not a defect.
Task 12: complete (commits 0d52c85..2d3b557, review clean, no fix round)

BASE for Task 13: 2d3b557
Working tree confirmed clean before dispatching Task 13, per the ruling above.
Task 13: implementer DONE — commit d9e0da3, 91/91 passing (10 new), typecheck clean.
  Implementer raised no concerns; reported the brief matched all upstream signatures.
Task 13: controller ran the completed pipeline end to end for all three system types at
  250 kWh/month, Colombo. Engine works. Design PSH resolves correctly per branch (4.95 h
  worst-month for off-grid/hybrid, 5.62 h annual mean for grid-tied — both match the
  Colombo data by hand). Grid-tied correctly returns null bus/battery/controller.

OBSERVATIONS FROM THAT RUN — sent to the reviewer to judge rather than assumed:
  (1) At 250 kWh/mo, grid-tied and off-grid BOTH give 4 panels, because Math.ceil
      collapses 3.87 and 3.41 to the same integer. The brief's test asserting grid-tied
      needs strictly FEWER panels passes only because defaultInputs happens to use
      200 kWh/mo (3.10 -> 4 vs 2.73 -> 3). That test may be passing by fixture luck
      rather than guarding the behaviour it names. Asked the reviewer to judge and to
      suggest pinning requiredPvKw instead of the rounded count.
  (2) Off-grid at 250 kWh/mo yields a 1500 W inverter -> 24 V bus, but a 2.2 kW array,
      requiring a 115 A controller. Real installers would build that array at 48 V; 115 A
      controllers are expensive and unusual. Root cause: bus voltage is selected from
      INVERTER size alone, with no reference to ARRAY size. That is what the spec says,
      so it is a spec-level limitation rather than a Task 13 defect — but it produces
      impractical hardware recommendations whenever daily energy is high relative to peak
      load, which is exactly the off-grid profile. Asked the reviewer to confirm the
      attribution. Carry to Phase 2/3: the voltage rule likely needs an array-size term.
  (3) The battery-voltage mismatch is now visible at system level: off-grid returns
      1S x 6P of 51.2 V modules on a 24 V bus. Task 14's warning will catch it.
Task 13: review returned spec ✅, quality Approved, 0 Critical, 0 Important, 3 Minor.
  Reviewer independently re-verified EVERY call site against the real signatures of all
  six modules, including the one genuinely transposable pair (sizeController's
  installedPvKw and panelCount, both bare numbers feeding unrelated formulas) — correctly
  ordered. Also noted sizeBattery's first two args are commutative, so that pair is inert.
  Both my observations CONFIRMED: (1) the panel-count test is fixture-lucky, not a real
  pin; (2) the 115 A controller is correct-per-spec and a spec-level limitation, since
  voltage.ts cannot see array size given the brief's mandated pipeline order — attribution
  to spec rather than to Task 13 confirmed.
Task 13: my brief contained a FALSE claim. It stated "a test depends on that order" about
  the district-before-panel guards. The reviewer checked: no test supplies both an invalid
  district and an invalid panel, so reordering the guards would break nothing. I asserted
  a test constraint that does not exist. Recorded rather than fixed — the guard order is
  harmless either way, and inventing a test to justify my claim would be backwards.
Task 13: minor (deferred): sizeSystem tests assert mostly not-null / greater-than-zero,
  so an orchestration-level transposition would compile and pass.
Ruling: addressed that last Minor systemically in Task 15 rather than opening a fix loop
  (Minors do not enter the loop, and Task 15 is the task that owns regression guarding).
  Added to its brief: an `orchestration wiring` block asserting bus voltage derives from
  inverter size, the grid-tied inverter is below its array kW with zero surge, and the
  controller current matches array-size-over-bus-voltage — the three values that only
  come out right when each module is fed the correct input. Also added a monotonic
  grid-tied-needs-less-array-than-off-grid assertion on requiredPvKw across five bills,
  replacing the fixture-lucky rounded comparison.
  If wrong: Task 15 carries a few more assertions than the plan originally specified,
  which is the correct direction for a regression net.
Task 13: complete (commits 2d3b557..d9e0da3, review clean, no fix round)
Doc edits committed as 06dce5d BEFORE dispatching Task 14, per the earlier ruling.
Briefs 14 and 15 re-extracted from the corrected plan.

BASE for Task 14: 06dce5d
Task 14: implementer DONE — commit 2b9a531 (single commit; explicit-path staging worked),
  99/99 passing (8 new), typecheck clean. Implementer raised no concerns and confirmed it
  kept both protected thresholds.
Task 14: controller ran the pipeline and inspected real warning output:
  - off-grid default (200 kWh): estimated-peak (info) + battery-voltage-mismatch (caution)
  - off-grid with matched lfp-24v-100ah: estimated-peak only — no false alarm
  - grid-tied: estimated-peak only — no battery warnings
  The mismatch message names the problem, the consequence, and two ways to fix it. The
  bug found at Task 11 is now both honestly described by battery.ts and caught here.
Task 14: review dispatched (sonnet). Framed the asymmetry explicitly: a warning that
  misses a dangerous design costs equipment, but a warning that fires on a SOUND design
  is arguably worse, because it teaches users to dismiss all warnings including the one
  that matters. Asked for both directions to be checked per rule. Also told the reviewer
  the two protected thresholds are deliberate, with the numbers, and that it must argue
  with numbers if it still disagrees rather than reflexively recommending tightening.
Task 14: review returned spec ✅, quality Approved, 0 Critical, 0 Important, 2 Minor.
  Reviewer checked BOTH directions per rule — what makes each warning fire and what keeps
  it silent — and confirmed the mismatch threshold matches battery.ts's own compatibility
  calculation rather than being an independently invented number that could drift.
Task 14: minor -> acted on: nothing proved validateDesign was wired into the GRID-TIED
  return path, since every warning test uses battery-side checks that are null-guarded off
  there. Added a test to Task 15's brief (commit 4242662) rather than opening a fix loop.
Task 14: minor (deferred): modulesInParallel === 0 skips charge-current-high via the
  maxChargeAmps > 0 guard rather than warning about a degenerate battery selection.
Task 14: complete (commits 06dce5d..2b9a531, review clean, no fix round)

BASE for Task 15: 2b9a531 (plus doc commits 4242662, e8fa356)
Task 15: implementer returned DONE_WITH_CONCERNS — commit a800e73, 122/123 passing.
  It did exactly what the brief asked: reported a failing golden case instead of editing
  it green. It also widened ONE array lower bound (2.5 -> 2 kW) after tracing the cause to
  genuine live-PSH drift, and documented that inline and in its report — the legitimate
  use of the escape hatch.

*** GOLDEN TEST CAUGHT A REAL DEFECT — ADJUDICATED, ENGINE FIXED, NOT THE TEST ***
  Failing case: 'typical Sri Lankan hybrid home > recommends a 48 V system' — engine gave
  24 V. I traced it rather than accepting either side, and modelled the whole input range:
    bill  type      invW  bus  arraykW  controllerA
    200   off-grid  1500  24   2.20     115
    250   off-grid  1500  24   2.20     115
    400   off-grid  3000  24   3.85     201   <-- 201 AMPS
    400   hybrid    3000  24   3.85     201
  Root cause: voltage.ts selects from INVERTER size alone. A household with modest peak
  draw but high daily energy — the off-grid profile — gets a small inverter and therefore
  a low bus, while needing a large array. The rule then demands charge controllers that
  are not sold at consumer prices, on impractical DC cabling. Worst cases sit at 200-400
  kWh/month, the most common household size in the target market.
  This is the Task 13 observation I recorded as a "limitation" turning out to be a defect
  that produces unbuildable output on the typical case. My earlier attribution was too
  generous to the spec.
Ruling: fixed the ENGINE, not the test. The golden expectation of 48 V was correct.
  Bus voltage is now the higher of the inverter-implied and array-implied requirements
  (array: <=0.8 kW -> 12 V, 0.8-2 kW -> 24 V, >2 kW -> 48 V), and the array is sized
  BEFORE voltage selection. That reordering is safe because sizeArray depends only on
  daily energy, sun hours, derate and panel — never on bus voltage; battery and controller
  still follow voltage as they must.
  Spec §4.2 and §5.2 amended and committed (e8fa356) with the 201 A evidence recorded, so
  the reasoning survives this session. Dispatched a cross-module fix covering defaults.ts,
  voltage.ts, sizeSystem.ts and voltage.test.ts.
  This touches two already-approved tasks (9 and 13), which I would normally avoid — but
  shipping Phase 1 with a knowingly unbuildable recommendation for the most typical
  Sri Lankan home is the worse trade. If wrong: bus voltage is one tier higher than
  strictly needed for some mid-range systems, which costs slightly more copper and is
  visible and reversible; the converse ships hardware nobody can buy.
Note: Tasks 1-6 were data and config. From Task 7 the engine computes, so RED evidence
  starts proving that a test exercises arithmetic rather than passing by construction.
Ruling: three consecutive identical evidentiary findings with byte-exact code each time
  means the defect is in my instructions, not the implementers. Prose asking an agent to
  "paste output verbatim" leaves a transcription step it keeps shortcutting. From Task 5
  every dispatch requires mechanical capture instead: redirect the command to a file
  (`cmd > task-N-<phase>.txt 2>&1`), then paste that file's contents. The shell does the
  copying, so there is no transcription step left to get wrong. If wrong: a few extra
  scratch files in a git-ignored directory, and slightly longer report sections.
Note: RED evidence is near-tautological for the data/config tasks (1-6) but becomes
  genuinely load-bearing from Task 7 onward, where it proves a test actually exercises
  the arithmetic rather than passing by construction. Keeping the requirement, fixing
  the capture method.
Ruling: the same evidentiary defect in two consecutive haiku reports is a prompt defect,
  not two implementer defects — "raw verbatim output" was too abstract. From Task 4 the
  dispatch defines it operationally: complete output, first line to last, including
  banners, timing lines, summary blocks and ANSI escapes. If wrong: report files carry
  more noise than a reader needs, which costs nothing.

=== APPEND-ORDERED FROM HERE (earlier entries were inserted mid-file by anchored edits) ===

Voltage fix landed — commit bdfc242, 129/129 passing (was 122/123).
Controller verified the effect across the input range: the 400 kWh off-grid controller
  requirement fell 201 A -> 100 A; 200-600 kWh now resolve to 48 V; and the default
  configuration's battery-voltage-mismatch warning DISAPPEARED, because at 48 V the
  default 51.2 V module is the correct pairing. That second-order effect is the sign the
  fix hit a root cause rather than a symptom: one change made the default configuration
  coherent AND removed a warning that had been unavoidable. The warning still fires on
  genuinely small systems (50-150 kWh), which is correct.
  Voltage explanation now names the driver: "Your panels are what require it — at a lower
  voltage the charge controller would need to handle about 114.58 amps."

Task 15 + voltage fix: review returned spec ✅, quality Approved, 0 Critical, 1 Important,
  3 Minor. The reviewer hand-recomputed every golden and fixture number against the real
  data tables instead of trusting code comments. It confirmed:
   - the 2.5 -> 2 kW widening was genuine PSH drift (Colombo worst month 4.95, November,
     checked against psh.ts) and still leaves an assertion that bites;
   - the 200 -> 150 kWh fixture move still exercises a real 113% mismatch and would fail
     if the warning were removed;
   - the adjacent "matched module" test still passes for the RIGHT reason post-fix
     (25.6 V module, 2 in series, 51.2 V, 6.7% drift, inside tolerance).
  Neither change was a hollowing-out.
Task 15: Important (plan-mandated, MINE): the explanation-coverage test checks busVoltage
  only for non-empty `plain`, omitting the `=`-contains and 2-decimal assertions every
  other field receives. A regression in voltage.ts's substituted string would pass a test
  whose name promises to catch exactly that.
Task 15: fix round 1/5 dispatched — extract the three assertions into one helper applied
  to every field INCLUDING busVoltage, so no field can structurally receive weaker checks
  than its neighbours; prove the helper bites by deliberately breaking voltage.ts's
  substituted string and confirming failure. Also removing dead code in
  architecture.test.ts (a guard clause that can never execute, since sourceFiles()
  already excludes every *.test.ts).
Task 15: minor (deferred): the orchestration-wiring test duplicates the voltage thresholds
  rather than calling selectBusVoltage; a swapped-argument bug at its fixture would
  coincidentally still pass, though voltage.test.ts covers argument semantics directly.
Task 15: minor (deferred): the cabin golden case's `continuousW <= 1500` bound is loose
  given the market-size table starts at 1000 W.
Note: rtk also filters my own inspection commands (grep/tail returned mangled output while
  the file was intact). Use `rtk proxy "<cmd>"` when reading files for verification, not
  just when capturing test evidence.

Task 15: fix round 1/5 (2 addressed, 0 open; commit b9a5ed9).
  Re-reviewer confirmed all three assertions survived extraction into the helper, that
  coverage now includes busVoltage, and that the deliberate break produced a real failure
  naming `busVoltage.explain.substituted` before voltage.ts was restored byte-identical.
  NOTE: that re-review's closing "out-of-scope observation" claims the golden 48 V case
  still fails. That is stale and self-contradictory (it says 129 passed in the same
  report). I verified 129/129 independently — bdfc242 fixed it. Recorded so the final
  review is not misled by a stale claim in a prior report.
Task 15: complete (commits 2b9a531..b9a5ed9, review clean after 1 fix round)

BASE for Task 16: b9a5ed9
Task 16: implementer DONE_WITH_CONCERNS — commit 7db398e, 131/131 across 18 files,
  typecheck clean, production build succeeds (171 KB, 55 KB gzipped).
  It honoured the non-optional Step 7: drove a REAL Chrome tab against the dev server,
  changed district (Colombo -> Nuwara Eliya) and units (250 -> 500), watched panel count
  and battery size move sensibly and a charge-rate warning appear, and confirmed the
  Battery and Charge controller sections vanish on grid-tied with surge dropping to 0 W.
  That is the only point in all 16 tasks where the artefact was exercised as a human
  would use it, and it was worth insisting on.
Ruling: accepted the implementer's OPENLY REPORTED deviation — it added `test.globals:
  true` to vite.config.ts, which the brief did not specify. @testing-library/react only
  registers its afterEach(cleanup) hook when a global `afterEach` exists; without it, DOM
  from the first DesignDump test leaked into the second, which failed with "multiple
  elements ... Panels". The implementer chose to add the one config line rather than edit
  the specified test file, and documented the reason inline with the exact failure.
  This is precisely the behaviour the Task 12 dispatch note asked for after Task 11's
  silent deviation: deviate if you must, but say so prominently. Accepting.
  If wrong: `globals: true` exposes vitest globals project-wide, a common default that
  costs nothing here and is one line to revert.
Task 16: complete (commits b9a5ed9..7db398e, pending final whole-branch review)

ALL 16 TASKS COMPLETE. Final whole-branch review dispatched (opus, most capable model per
  Model Selection) over 05d2f89..7db398e — 26 commits, 36 code files, ~2,350 lines.
  Handed it the ten deferred minors for triage and the three recorded limitations to
  confirm or challenge, so it spends its effort on what has not already been examined.

Final review attempt 1 FAILED — opus hit a session rate limit (HTTP 429) after reading
  only the spec and plan. No findings produced.
Ruling: re-dispatched the final whole-branch review on sonnet rather than waiting ~1.5
  hours for the opus limit to reset at 22:40. The skill asks for "the most capable
  AVAILABLE model"; opus is not available to this session right now, so sonnet is that
  model. Sonnet has carried every substantive per-task review in this plan and caught
  real defects at every stage, including the two that originated in my own plan text.
  Also gave the retry an explicit pass order (engine calculations first, throwaway UI
  scaffold last) so that if it too is cut short, the most consequential code is reviewed
  before the least.
  If wrong: the branch gets a slightly less capable final read than intended. Mitigated
  by 16 independent per-task reviews already completed, and the user can re-run
  /code-review ultra on the branch later if they want a deeper pass.

FINAL REVIEW (sonnet, retry after opus rate limit): **Ready to merge — Yes.**
  0 Critical, 1 Important, 2 Minor. The reviewer read all 36 code files directly rather
  than only the diff, and independently hand-verified: the import boundary and I/O
  freedom, the Sized<T> contract (no bare-number escapes, no any/!/@ts-ignore anywhere),
  the bus-voltage fix against the amended spec, and both battery-branch golden cases
  (cabin: 1.158 kWh/day, 1000 W inverter, 1 panel; hybrid Colombo: 8.21 kWh/day, 1500 W,
  worst-month PSH 4.95 November, 2.2 kW array, 48 V bus).
  It confirmed all ten deferred minors were accurately characterised, endorsed both
  protected thresholds after checking the arithmetic itself, and gave a domain verdict:
  a real system built to these numbers would work.
  Important finding was MINE — package.json carries jsdom + testing-library while the
  plan's constraint list did not mention them. I authorised those at Task 16 dispatch but
  never amended the plan. Fixed in the document, not the code (commit 709118a).
Fix wave (one dispatch, per process): commit 841bef7 — MPPT boundary pinned at exactly
  400 W; orchestration test now derives its expectation from selectBusVoltage instead of
  hand-copied thresholds; warm-morning Voc branch covered. Test-only, no production
  change. 133/133.
  The fix-wave implementer also corrected an error in MY instructions: the duplicated
  thresholds lived in invariants.test.ts, not sizeSystem.test.ts as I had written.
Scoped re-review of the fix wave: all three ADDRESSED, no new breakage, and it judged my
  suggested selectBusVoltage import NOT circular — the test extracts values from the
  design result and calls with known-correct ordering, so a transposition in the pipeline
  produces a different value and fails. Good: I raised that risk precisely because the
  fix I proposed could have hollowed out the test it was meant to strengthen.

=== PHASE 1 COMPLETE ===
  28 commits, 36 code files, 133 tests across 18 files, typecheck clean, build succeeds.
  All 16 tasks complete, each independently reviewed. 23 rulings recorded.
