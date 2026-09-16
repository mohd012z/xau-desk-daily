# MACRO//DESK Phase 3 Historical Event Reaction & Advance Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auditable historical event matching, exact event-window reaction samples, surprise scenarios, weighted percentile bands, implied price ranges, and model confidence to MACRO//DESK without fabricating history or using post-event information in Advance Mode.

**Architecture:** Add focused `macro/history/` modules that accept normalized Phase 2 events plus event-aligned market observations. The model remains dependency-free JavaScript: weighted empirical distributions and a transparent linear conditional adjustment are used first; the UI consumes one stable `buildAdvanceModel()` result. Missing or insufficient history returns `INSUFFICIENT_DATA`, never synthetic estimates.

**Tech Stack:** Browser ES modules, Node.js 22 tests, GitHub Pages, existing Phase 1/2 event and instrument modules.

**Spec:** `docs/superpowers/specs/2026-09-16-xau-desk-v4-2-multi-asset-event-intelligence-design.md`

## Global Constraints

- UTC is canonical internally; user-facing event times remain `Asia/Kuala_Lumpur`.
- Expected/model pressure and observed price reaction remain separate.
- Advance Mode may only use features timestamped strictly before `eventTimeUtc`.
- FX uses provider/instrument pip metadata; XAU uses dollar/percent/provider-point units; digital assets use dollar/percent units.
- No historical pip/price estimate may be displayed when trustworthy event-aligned samples are absent.
- No automatic order instructions or BUY/SELL recommendations.
- No API keys or provider secrets in public files.
- Existing production `index.html` remains unchanged in this phase.

---

### Task 1: Historical event schema and validator

**Files:**
- Create: `macro/history/history-schema.mjs`
- Create: `tests/js/history-schema.test.mjs`

**Interfaces:**
- Produces: `normalizeHistorySample(input)` and `validateHistorySample(sample)`.
- A normalized sample contains `eventId`, `eventType`, `eventTimeUtc`, `symbol`, `assetClass`, `window`, `before`, `after`, optional `high/low`, `surpriseZ`, pre-event feature timestamps, regime fields, and source quality.

- [ ] Write tests proving valid FX/XAU/digital samples normalize and malformed/missing event-aligned prices are rejected.
- [ ] Run `node --test tests/js/history-schema.test.mjs` and verify failure before implementation.
- [ ] Implement minimal normalization/validation with finite-number and ISO-time checks.
- [ ] Re-run the test and verify pass.
- [ ] Commit `feat: add historical event sample schema`.

### Task 2: Event-window reaction sample builder

**Files:**
- Create: `macro/history/reaction-sample.mjs`
- Create: `tests/js/reaction-sample.test.mjs`

**Interfaces:**
- Consumes: Phase 1 `calcFxReaction`, `calcMetalReaction`, `calcDigitalReaction`.
- Produces: `buildReactionSample(sample)` returning signed movement in asset-native units plus `absoluteMove`, `direction`, and optional max excursion/range.

- [ ] Test EUR/USD signed pips, USD/JPY pip handling, XAU dollar/percent/provider points, and BTC percentage movement.
- [ ] Verify tests fail before implementation.
- [ ] Implement using existing reaction helpers rather than duplicating pip rules.
- [ ] Re-run tests and verify pass.
- [ ] Commit `feat: build event reaction samples`.

### Task 3: Anti-leakage guard

**Files:**
- Create: `macro/history/anti-leakage.mjs`
- Create: `tests/js/anti-leakage.test.mjs`

**Interfaces:**
- Produces: `validateAdvanceFeatures({eventTimeUtc, features})` and `filterPreEventFeatures(...)`.
- Each feature is `{name, value, observedAt}` and is accepted only when `observedAt < eventTimeUtc`.

- [ ] Test that a feature at the exact event timestamp, post-event price, post-event DXY/yields, or actual release value is rejected.
- [ ] Test that earlier ATR/volatility/trend/consensus values are accepted.
- [ ] Implement strict timestamp comparison and rejected-feature reasons.
- [ ] Re-run tests and verify pass.
- [ ] Commit `feat: enforce advance-model anti-leakage`.

### Task 4: Historical similarity and recency weighting

**Files:**
- Create: `macro/history/similarity.mjs`
- Create: `tests/js/similarity.test.mjs`

**Interfaces:**
- Produces: `scoreSimilarity(target, sample)` in `[0,1]`, `recencyWeight(eventTimeUtc, asOfUtc, halfLifeDays=365)`, and `rankComparableEvents(target, samples, options)`.
- Matching fields: event type, central bank/speaker role where present, session, volatility regime, trend regime, surprise bucket/speech stance when known.

- [ ] Test exact event/regime matches outrank mismatches and recent otherwise-equal samples receive higher weight.
- [ ] Implement transparent weighted field scoring plus exponential recency decay.
- [ ] Re-run tests and verify pass.
- [ ] Commit `feat: rank comparable historical events`.

### Task 5: Weighted distribution and price-band conversion

**Files:**
- Create: `macro/history/distribution.mjs`
- Create: `tests/js/distribution.test.mjs`

**Interfaces:**
- Produces: `weightedQuantile(items, q)`, `summarizeDistribution(items)`, and `convertMovementBandToPrice({symbol, assetClass, preEventPrice, movement})`.
- Summary outputs weighted P10/P25/P50/P75/P90, weighted mean absolute move, positive/negative weighted frequency, and effective sample size.

- [ ] Test quantiles and effective sample size on deterministic weighted fixtures.
- [ ] Test FX pip-to-price conversion and XAU/digital percent-to-price conversion.
- [ ] Implement without external statistics libraries.
- [ ] Re-run tests and verify pass.
- [ ] Commit `feat: add weighted event distributions`.

### Task 6: Surprise scenario engine

**Files:**
- Create: `macro/history/scenarios.mjs`
- Create: `tests/js/scenarios.test.mjs`

**Interfaces:**
- Produces: `standardizeSurprise(actual, forecast, historicalStdError)` and `buildSurpriseScenarios({baseDistribution, sensitivity, preEventPrice, instrument})`.
- Scenarios: `-2σ`, `-1σ`, `near consensus`, `+1σ`, `+2σ`.
- `sensitivity` is estimated only from historical samples containing both `surpriseZ` and measured reaction.

- [ ] Test standardized surprise and five scenario rows.
- [ ] Test scenario price bands use instrument metadata and remain null when sensitivity/sample support is insufficient.
- [ ] Implement robust slope estimation from centered historical pairs with minimum sample threshold.
- [ ] Re-run tests and verify pass.
- [ ] Commit `feat: add conditional news surprise scenarios`.

### Task 7: Confidence and model assembly

**Files:**
- Create: `macro/history/confidence.mjs`
- Create: `macro/history/advance-model.mjs`
- Create: `tests/js/advance-model.test.mjs`

**Interfaces:**
- Produces: `buildConfidence({effectiveN, averageSimilarity, timestampConfidence, modelSpread, calibration})` and `buildAdvanceModel({event, symbol, preEventPrice, features, history, asOfUtc})`.
- Result states: `READY`, `LOW_SAMPLE`, `INSUFFICIENT_DATA`, `LEAKAGE_BLOCKED`.
- READY result contains comparable counts, distribution, five scenarios where supported, implied price bands, direction frequency, expected absolute movement, signed median, and confidence reasons.

- [ ] Test no-history returns `INSUFFICIENT_DATA` with no fake numbers.
- [ ] Test leaked features return `LEAKAGE_BLOCKED`.
- [ ] Test a deterministic fixture returns correct weighted median, band ordering, and confidence reasons.
- [ ] Implement model assembly from Tasks 3–6.
- [ ] Re-run tests and verify pass.
- [ ] Commit `feat: assemble auditable advance event model`.

### Task 8: History adapter and recalculation integration

**Files:**
- Create: `macro/adapters/history-adapter.mjs`
- Modify: `macro/events/recalculate.mjs`
- Create: `tests/js/history-adapter.test.mjs`

**Interfaces:**
- Produces: `loadHistory({url='./data/event-history.json', fetchImpl})`, `normalizeHistoryPayload(payload)`, and extends recalculation requests with `modelMode` (`ADVANCE` or `NOWCAST`) without changing existing fields.
- Empty/missing history resolves to an auditable empty result rather than fabricated samples.

- [ ] Test empty payload, invalid rows being excluded with counts, and valid rows normalized.
- [ ] Test scheduled upcoming event requests use `ADVANCE`; unplanned/live requests use `NOWCAST`.
- [ ] Implement adapter and backward-compatible recalculation extension.
- [ ] Re-run tests and verify pass.
- [ ] Commit `feat: connect event history to recalculation flow`.

### Task 9: Phase 3 dashboard UI

**Files:**
- Modify: `macro-preview.html`
- Modify: `macro/ui/app.mjs`
- Create: `macro/ui/phase3.css`
- Create: `tests/js/ui-phase3.test.mjs`

**Interfaces:**
- UI renders `Historical comparable-event distribution`, `Advance scenarios`, `Model confidence`, `Direction frequency`, and explicit `INSUFFICIENT DATA` states.
- It listens for `macrodesk:event-update`, loads history once, and recalculates only when a valid pre-event price/context is available.

- [ ] Add contract tests for Phase 3 container IDs and neutral labels.
- [ ] Add tests confirming no BUY/SELL/order text and no estimate is rendered from empty history.
- [ ] Implement responsive cards/tables for P10/P25/P50/P75/P90 and -2σ…+2σ scenarios.
- [ ] Keep expected pressure separate from observed reaction.
- [ ] Re-run all JS tests and syntax checks.
- [ ] Commit `feat: show historical event and advance model dashboard`.

### Task 10: CI, public empty dataset, and verification

**Files:**
- Create: `data/event-history.json`
- Modify: `.github/workflows/macro-desk-ci.yml`
- Modify: `.github/workflows/pages.yml` only if needed to publish `data/event-history.json`.

**Interfaces:**
- `data/event-history.json` starts as `{"schemaVersion":"1.0","generatedAt":null,"samples":[]}`; it is intentionally empty until trustworthy event-aligned history is collected/imported.

- [ ] Add the empty versioned dataset; do not seed illustrative market history.
- [ ] Update CI syntax checks for all Phase 3 modules and add a secret-pattern/public-data guard.
- [ ] Ensure Pages publishes the history JSON and `macro/` assets.
- [ ] Run `node --test tests/js/*.test.mjs` and all `node --check` commands.
- [ ] Compare branch against `main` and verify `index.html` is unchanged.
- [ ] Commit `ci: verify MACRO DESK phase 3 model`.

## Self-review

- Spec coverage: historical matching, surprise scenarios, price bands, direction/magnitude separation, confidence, anti-leakage, and truthful empty states are all assigned to tasks.
- Explicitly deferred: true regression/quantile-ML training and walk-forward calibration require a sufficiently large event-aligned history. The interfaces expose calibration/model-spread fields so those models can be added later without changing UI consumers.
- No placeholders or synthetic production history are used.
- Type names are consistent across tasks: `buildAdvanceModel`, `normalizeHistorySample`, `rankComparableEvents`, `summarizeDistribution`, and `buildSurpriseScenarios`.
