# XAU Morning / Night Setup Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, replay-safe Morning Setup and Night Setup evidence detectors and compare them with existing BBMA/HTF evidence without merging or rewriting either evidence domain.

**Architecture:** Add a new `macro/setups` domain for normalized intraday candles and setup state, a narrow `macro/confluence/setup-bbma.mjs` relationship classifier, evidence/context composition under `macro/evidence`, and a presentation/meaningful-change boundary under `macro/alerts`. Reuse existing BBMA MTF evidence, MYT time utilities, event-risk normalization, data-health concepts, and Phase-5 replay machinery; do not refactor BBMA detectors or introduce live execution.

**Tech Stack:** Node.js 22 ESM, `node:test`, existing `macro/bbma`, `macro/core`, `macro/adapters`, `macro/replay`, GitHub Actions HELIX VEYRA CI.

**Spec:** `docs/superpowers/specs/2026-09-26-xau-morning-night-setup-design.md`

## Global Constraints

- UTC is canonical; MYT rendering uses `Asia/Kuala_Lumpur`; no manual `+8 hours` conversion.
- Internal setup identifiers may exist only in internal/audit data. User-facing text must use `Morning Setup` and `Night Setup` and must never expose the internal identifiers.
- Setup structure and BBMA/HTF remain independent evidence objects; no `combinedDirection` field.
- Allowed setup states: `UP`, `DOWN`, `RANGE`, `RETEST`, `FALSE_BREAK`, `UNRESOLVED`, `UNKNOWN`.
- Allowed relationship states: `ALIGNED`, `OPPOSITE_CONFLICT`, `PULLBACK_RETEST`, `REVERSAL_CANDIDATE`, `RANGE`, `FALSE_BREAK`, `UNRESOLVED`, `UNKNOWN`.
- Only closed candles are decision evidence. A wick-only excursion cannot establish a directional break.
- Missing/invalid/stale required evidence produces `UNKNOWN`; incomplete but present evidence may produce `UNRESOLVED`.
- News/event, session, spread, volatility and data health are context only and cannot manufacture or reverse direction.
- Shadow/evidence only: no broker execution, lot sizing, SL/TP, order creation, or live cutover.
- Unchanged evidence is silent.

## Review Focus

1. Candle close exactly at an observation/checkpoint is eligible while a later close is excluded; pinned in Task 2 and Task 8.
2. Duplicate/out-of-order or wrong-symbol intraday candles cannot create a structure; pinned in Task 2.
3. Wick-only range excursions remain non-directional and can become false-break evidence only under deterministic rules; pinned in Task 4.
4. Missing BBMA/HTF, news, spread, volatility, or stale price evidence stays explicit `UNKNOWN` and never changes setup direction; pinned in Tasks 6-7.
5. Public rendering and alert reasons cannot leak either internal setup identifier, including nested reason/context strings; pinned in Task 9.

---

## File Structure

### New setup domain
- `macro/setups/constants.mjs` — internal enums, anchors, rule version, public labels.
- `macro/setups/input.mjs` — validate/normalize XAUUSD intraday candles and closed-candle observation windows.
- `macro/setups/range.mjs` — deterministic range construction from eligible candles.
- `macro/setups/breakout.mjs` — closed-candle UP/DOWN/wick-only break classification.
- `macro/setups/retest.mjs` — `NONE|TOUCH|HOLD|FAIL|UNKNOWN` lifecycle evidence.
- `macro/setups/lifecycle.mjs` — top-level setup state transition/classification.
- `macro/setups/morning.mjs` — Morning Setup orchestration using 08:00 MYT anchor.
- `macro/setups/night.mjs` — Night Setup orchestration using 20:00 MYT anchor.

### New join/context/presentation domain
- `macro/confluence/setup-bbma.mjs` — relationship classifier; consumes but never mutates setup and BBMA/HTF evidence.
- `macro/evidence/setup-context.mjs` — normalize session/event/spread/volatility/data-health context.
- `macro/evidence/setup-snapshot.mjs` — immutable auditable joined snapshot.
- `macro/alerts/public-setup-labels.mjs` — user-facing label/redaction boundary.
- `macro/alerts/setup-alert-policy.mjs` — meaningful-change fingerprint and shadow notification eligibility.

### Narrow integration changes
- `macro/replay/replay-record.mjs` — optional setup replay payload while retaining no-look-ahead validation.
- `macro/replay/shadow-replay.mjs` — replay setup snapshots chronologically beside existing BBMA/news shadow observations.
- `.github/workflows/macro-desk-ci.yml` — syntax checks and source-safety check for setup modules/internal-label leakage.

### Tests
- `tests/js/setup-constants.test.mjs`
- `tests/js/setup-input.test.mjs`
- `tests/js/setup-range.test.mjs`
- `tests/js/setup-breakout.test.mjs`
- `tests/js/setup-retest.test.mjs`
- `tests/js/setup-lifecycle.test.mjs`
- `tests/js/setup-morning.test.mjs`
- `tests/js/setup-night.test.mjs`
- `tests/js/setup-confluence.test.mjs`
- `tests/js/setup-context.test.mjs`
- `tests/js/setup-snapshot.test.mjs`
- `tests/js/setup-alert-policy.test.mjs`
- `tests/js/setup-replay.test.mjs`

---

### Task 1: Setup constants and public-label contract

**Files:**
- Create: `macro/setups/constants.mjs`
- Create: `macro/alerts/public-setup-labels.mjs`
- Test: `tests/js/setup-constants.test.mjs`

**Interfaces:**
- Produces: `SETUP_KINDS`, `SETUP_STATES`, `SETUP_DIRECTIONS`, `RETEST_STATES`, `RELATIONSHIP_STATES`, `SETUP_RULE_VERSION`, `SETUP_ANCHORS_MYT`, `publicSetupLabel(setupKind)`, `assertNoInternalSetupNames(value)`.

- [ ] **Step 1: Write failing contract tests** asserting immutable allowed enums, Morning anchor `08:00`, Night anchor `20:00`, rule version is non-empty, and `publicSetupLabel()` returns exactly `Morning Setup` / `Night Setup` while rejecting unknown kinds.
- [ ] **Step 2: Run** `node --test tests/js/setup-constants.test.mjs`; expected FAIL because modules do not exist.
- [ ] **Step 3: Implement the constants and label/redaction functions** without exposing internal names from the public-label module output.
- [ ] **Step 4: Run** `node --test tests/js/setup-constants.test.mjs`; expected PASS.
- [ ] **Step 5: Commit** `feat: add setup evidence contracts`.

### Task 2: Intraday input validation and closed-candle cutoff

**Files:**
- Create: `macro/setups/input.mjs`
- Test: `tests/js/setup-input.test.mjs`

**Interfaces:**
- Consumes: setup constants; existing `MYT_ZONE` from `macro/core/time-myt.mjs`.
- Produces: `normalizeSetupCandles({ candles, symbol, observedUtc })` and `eligibleClosedCandles({ candles, observedUtc })`.

- [ ] **Step 1: Write failing tests** for valid XAUUSD OHLC, required `open_time_utc`, `close_time_utc`, `closed`, `source`, ingestion timestamp, numeric OHLC consistency, exact-cutoff inclusion, future-close exclusion, open-candle exclusion, duplicate candle rejection, out-of-order normalization/rejection policy, and wrong-symbol rejection.
- [ ] **Step 2: Run** `node --test tests/js/setup-input.test.mjs`; expected FAIL.
- [ ] **Step 3: Implement strict normalization** so invalid/stale identity evidence is represented to callers without inventing structure and no candle closing after `observedUtc` can enter decision evidence.
- [ ] **Step 4: Run** the Task 2 test; expected PASS.
- [ ] **Step 5: Commit** `feat: validate setup intraday evidence`.

### Task 3: Deterministic range construction

**Files:**
- Create: `macro/setups/range.mjs`
- Test: `tests/js/setup-range.test.mjs`

**Interfaces:**
- Consumes: normalized eligible candles and setup anchor metadata.
- Produces: `buildSetupRange({ candles, anchorTimeMyt, observedUtc, ruleVersion }) -> { status, range_high, range_low, evidence_candle_ids, reason_codes }`.

- [ ] **Step 1: Write failing tests** for deterministic high/low, empty/insufficient input => `UNKNOWN`, malformed range => invalid/unknown, and stable evidence candle IDs.
- [ ] **Step 2: Run** `node --test tests/js/setup-range.test.mjs`; expected FAIL.
- [ ] **Step 3: Implement range construction** using only eligible closed candles and returning immutable evidence.
- [ ] **Step 4: Run** Task 3 test; expected PASS.
- [ ] **Step 5: Commit** `feat: build deterministic setup ranges`.

### Task 4: Breakout and false-break primitives

**Files:**
- Create: `macro/setups/breakout.mjs`
- Test: `tests/js/setup-breakout.test.mjs`

**Interfaces:**
- Consumes: range evidence plus post-range eligible closed candles.
- Produces: `classifySetupBreak({ range, candles }) -> { break_direction, break_level, state, evidence_candle_ids, reason_codes }`.

- [ ] **Step 1: Write failing tests** for closed candle above range => `UP`, below => `DOWN`, wick-only above/below => non-directional, return-inside failed attempt => `FALSE_BREAK`, no valid break => `RANGE`, and insufficient evidence => `UNKNOWN|UNRESOLVED` according to presence/validity.
- [ ] **Step 2: Run** `node --test tests/js/setup-breakout.test.mjs`; expected FAIL.
- [ ] **Step 3: Implement closed-candle break classification** with no BBMA/news inputs.
- [ ] **Step 4: Run** Task 4 test; expected PASS.
- [ ] **Step 5: Commit** `feat: classify setup breaks and false breaks`.

### Task 5: Retest and lifecycle state machine

**Files:**
- Create: `macro/setups/retest.mjs`
- Create: `macro/setups/lifecycle.mjs`
- Test: `tests/js/setup-retest.test.mjs`
- Test: `tests/js/setup-lifecycle.test.mjs`

**Interfaces:**
- Produces: `classifyRetest({ breakEvidence, candles }) -> { retest_state, direction, evidence_candle_ids, reason_codes }` and `deriveSetupState({ rangeEvidence, breakEvidence, retestEvidence, dataHealth }) -> { state, direction, retest_state, reason_codes }`.

- [ ] **Step 1: Write failing retest tests** for `NONE`, `TOUCH`, `HOLD`, `FAIL`, and `UNKNOWN`, preserving preceding break direction.
- [ ] **Step 2: Write failing lifecycle tests** for `UP`, `DOWN`, `RANGE`, `RETEST`, `FALSE_BREAK`, `UNRESOLVED`, `UNKNOWN`, and stale/invalid health blocking a new directional conclusion.
- [ ] **Step 3: Run** both Task 5 test files; expected FAIL.
- [ ] **Step 4: Implement retest and lifecycle modules** as pure deterministic functions.
- [ ] **Step 5: Run** both Task 5 test files; expected PASS.
- [ ] **Step 6: Commit** `feat: add setup retest lifecycle`.

### Task 6: Morning and Night detector orchestration

**Files:**
- Create: `macro/setups/morning.mjs`
- Create: `macro/setups/night.mjs`
- Test: `tests/js/setup-morning.test.mjs`
- Test: `tests/js/setup-night.test.mjs`

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: `detectMorningSetup({ candles, observedUtc, dataHealth, ruleVersion })` and `detectNightSetup({ candles, observedUtc, dataHealth, ruleVersion })`, each returning the full setup observation contract from the spec.

- [ ] **Step 1: Write failing Morning fixtures** for UP, DOWN, RANGE, RETEST, FALSE_BREAK, UNRESOLVED and UNKNOWN using the 08:00 MYT anchor.
- [ ] **Step 2: Write failing Night fixtures** for the same states using the 20:00 MYT anchor.
- [ ] **Step 3: Add tests proving news, BBMA and HTF are not accepted as detector-direction inputs.**
- [ ] **Step 4: Run** both detector test files; expected FAIL.
- [ ] **Step 5: Implement both thin orchestrators** over shared primitives; do not duplicate range/break/retest algorithms.
- [ ] **Step 6: Run** both detector test files; expected PASS.
- [ ] **Step 7: Commit** `feat: add morning and night setup detectors`.

### Task 7: Independent BBMA/HTF relationship classifier

**Files:**
- Create: `macro/confluence/setup-bbma.mjs`
- Test: `tests/js/setup-confluence.test.mjs`

**Interfaces:**
- Consumes: setup observation plus existing normalized BBMA/HTF evidence from `macro/bbma/mtf-evidence.mjs` / `macro/bbma/confluence.mjs`.
- Produces: `classifySetupBbmaRelationship({ setupEvidence, bbmaEvidence, htfEvidence }) -> { state, reason_codes, supporting_timeframes, conflict_timeframes }`.

- [ ] **Step 1: Write failing tests** proving setup UP + BBMA DOWN remains setup UP with `OPPOSITE_CONFLICT`; setup DOWN + BBMA DOWN => `ALIGNED`; supported retest against prevailing HTF => `PULLBACK_RETEST`; possible transition => `REVERSAL_CANDIDATE`; setup RANGE/FALSE_BREAK propagate corresponding relationship; incomplete evidence => `UNRESOLVED`; missing BBMA/HTF => `UNKNOWN`.
- [ ] **Step 2: Add immutability tests** proving neither setup nor BBMA input is mutated and no `combinedDirection` property is emitted.
- [ ] **Step 3: Run** `node --test tests/js/setup-confluence.test.mjs`; expected FAIL.
- [ ] **Step 4: Implement the relationship classifier** as a pure join/classification function.
- [ ] **Step 5: Run** Task 7 test; expected PASS.
- [ ] **Step 6: Commit** `feat: classify setup bbma relationships`.

### Task 8: Context and auditable snapshot

**Files:**
- Create: `macro/evidence/setup-context.mjs`
- Create: `macro/evidence/setup-snapshot.mjs`
- Test: `tests/js/setup-context.test.mjs`
- Test: `tests/js/setup-snapshot.test.mjs`

**Interfaces:**
- Consumes: setup evidence, relationship, existing normalized event risk, session metadata, spread/ATR observations, data-health result.
- Produces: `composeSetupContext({...})` and `composeSetupSnapshot({...})`.

- [ ] **Step 1: Write failing context tests**: missing news => news `UNKNOWN`; missing spread => spread `UNKNOWN`; absent volatility => volatility `UNKNOWN`; stale/invalid data health is retained; nearby event changes context only; session does not create direction.
- [ ] **Step 2: Write failing snapshot tests** proving `setup_evidence`, `bbma_evidence`, `relationship`, session/news/spread/volatility/data-health and version/evidence references remain independently inspectable and immutable.
- [ ] **Step 3: Add checkpoint/no-look-ahead fixture** proving a close exactly at T is visible and T+epsilon is absent from the snapshot.
- [ ] **Step 4: Run** both Task 8 tests; expected FAIL.
- [ ] **Step 5: Implement context/snapshot composition** without recomputing setup or BBMA direction.
- [ ] **Step 6: Run** both Task 8 tests; expected PASS.
- [ ] **Step 7: Commit** `feat: compose setup evidence snapshots`.

### Task 9: Meaningful-change policy and safe public rendering

**Files:**
- Create: `macro/alerts/setup-alert-policy.mjs`
- Modify: `macro/alerts/public-setup-labels.mjs`
- Test: `tests/js/setup-alert-policy.test.mjs`

**Interfaces:**
- Produces: `evaluateSetupAlertChange({ current, previous }) -> { action, reason, fingerprint }` and `renderSetupAlert(snapshot) -> { title, body }`.

- [ ] **Step 1: Write failing tests** for first meaningful state, state transition, retest transition, false break, relationship change, material event/spread/volatility/data-health change, and unchanged evidence => `SUPPRESS`.
- [ ] **Step 2: Add public-copy tests** requiring setup label, observed state, BBMA/HTF relationship and evidence-backed context while recursively rejecting both internal setup identifiers from title/body/reasons/context.
- [ ] **Step 3: Add tests** proving rendered output contains no broker execution, lot sizing, SL/TP or live-order instruction.
- [ ] **Step 4: Run** Task 9 test; expected FAIL.
- [ ] **Step 5: Implement meaningful-change fingerprinting and rendering**; keep delivery shadow-only.
- [ ] **Step 6: Run** Task 9 test; expected PASS.
- [ ] **Step 7: Commit** `feat: add setup evidence alert policy`.

### Task 10: Chronological replay integration

**Files:**
- Modify: `macro/replay/replay-record.mjs`
- Modify: `macro/replay/shadow-replay.mjs`
- Test: `tests/js/setup-replay.test.mjs`

**Interfaces:**
- Consumes: optional normalized setup replay payload and Tasks 6-9.
- Produces: setup snapshot attached to replay output while preserving the existing BBMA/news observation unchanged.

- [ ] **Step 1: Write failing replay tests** for chronological sorting, future candle exclusion, exact checkpoint inclusion, future retest/failure not altering an earlier snapshot, and equivalent live/shadow state for equivalent evidence.
- [ ] **Step 2: Add regression assertion** that existing BBMA/news observation fields remain byte/deep-equal when no setup payload is supplied.
- [ ] **Step 3: Run** `node --test tests/js/setup-replay.test.mjs`; expected FAIL.
- [ ] **Step 4: Extend replay records with an optional setup payload** while retaining recursive future/outcome-field rejection.
- [ ] **Step 5: Extend shadow replay** to evaluate setup evidence beside, not inside, `runBbmaNewsShadow`.
- [ ] **Step 6: Run** Task 10 and existing replay tests; expected PASS.
- [ ] **Step 7: Commit** `feat: replay setup evidence chronologically`.

### Task 11: CI and repository safety gates

**Files:**
- Modify: `.github/workflows/macro-desk-ci.yml`

**Interfaces:**
- Consumes: all new modules/tests.
- Produces: CI syntax/regression/leakage gates for the subsystem.

- [ ] **Step 1: Add `node --check` entries** for every new `.mjs` module.
- [ ] **Step 2: Add a source/presentation safety command** that fails if public alert/rendering modules contain prohibited internal setup identifiers or execution copy.
- [ ] **Step 3: Run locally/equivalent commands:** `node --test tests/js/*.test.mjs`, `node --test tests/*.test.mjs`, and `node tools/verify-migration.mjs`; expected PASS.
- [ ] **Step 4: Verify existing BBMA tests remain unchanged and green**, including MTF, confluence, lifecycle, news-shadow and Phase-5 replay/evidence suites.
- [ ] **Step 5: Commit** `ci: gate setup evidence subsystem`.

### Task 12: Shadow evidence review and merge readiness

**Files:**
- No production-delivery changes.
- Update design/plan status only if verification passes.

**Interfaces:**
- Produces: review evidence for PR/merge; no live notification cutover.

- [ ] **Step 1: Run complete HELIX VEYRA CI on the feature branch** and record exact commit SHA/run.
- [ ] **Step 2: Review fixtures/evidence for all setup and relationship states** and confirm no setup direction was sourced from news/session/spread/volatility.
- [ ] **Step 3: Verify public rendered fixtures contain only `Morning Setup` / `Night Setup` labels and no internal identifiers.**
- [ ] **Step 4: Verify no new broker execution, lot, SL/TP or live-order path exists.**
- [ ] **Step 5: Open/review PR against `main`; merge only after green CI and explicit review.**

---

## Self-Review Result

- Spec coverage: all design sections are mapped to Tasks 1-12.
- Type/interface consistency: setup observation is produced only by Task 6; Task 7 joins without mutation; Tasks 8-10 consume the same immutable objects.
- Existing BBMA authority is preserved; `macro/bbma` detectors are not modified by this plan.
- Existing Phase-5 replay is extended only through optional setup payloads and parallel output.
- Current daily-only XAU snapshot remains insufficient for live setup classification; implementation can be fully fixture/replay tested while live setup state remains `UNKNOWN` until validated intraday data is available.
- No placeholders or automatic reversal-confirmed state are introduced.
