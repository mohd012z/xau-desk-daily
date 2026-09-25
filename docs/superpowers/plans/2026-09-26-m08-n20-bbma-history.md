# M08 / N20 × BBMA Historical Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic, point-in-time-safe M08/N20 historical observations for XAU and cross-stratify them with immutable BBMA/MTF, news/macro and Phase-6 evidence without introducing live execution.

**Architecture:** M08/N20 live in a new `macro/temporal` subsystem. It derives MYT anchors from explicit UTC timestamps, detects close-confirmed reference-range events, snapshots 11:30/18:00 state, relates N20 back to M08, and composes one daily replay record. Existing BBMA remains an independent technical authority; Phase-6 maturity consumes temporal outputs as dimensions rather than embedding temporal rules in the classifier.

**Tech Stack:** Node.js ESM, `node:test`, built-in `Intl.DateTimeFormat`/explicit UTC timestamps, existing `macro/bbma/*`, `macro/replay/*`, Phase-5 outcome contracts and Phase-6 maturity contracts.

**Spec:** `docs/superpowers/specs/2026-09-26-m08-n20-bbma-history-design.md`

## Global Constraints

- Canonical observation time is UTC; `Asia/Kuala_Lumpur` derives MYT anchors.
- M08 and N20 are independent temporal/range observations, not BBMA rules.
- Reference breakout requires closed-candle confirmation; wick-only excursions remain distinct.
- M08 and N20 maintain independent reference ranges.
- Opposite N20 never automatically means reversal.
- BBMA remains the technical-direction authority and cannot be upgraded by temporal agreement.
- HTF snapshots may use only information available at the historical observation timestamp.
- News/macro contextualizes/gates; it does not create technical direction.
- Missing evidence remains `UNKNOWN`/explicitly missing.
- No broker execution, live alert cutover, lot sizing, SL/TP generation, automatic parameter optimization, or BBMA-rule mutation.

## Review Focus

- MYT trading-date rollover: a UTC timestamp near 16:00 UTC changes the MYT date; anchors must bind to the correct MYT day.
- Timeframe ambiguity: an 08:00/20:00 anchor must identify exactly which candle open represents the reference for the declared source timeframe.
- Gaps/holidays: missing reference or checkpoint candles must yield explicit partial/UNKNOWN evidence, not nearest-candle substitution.
- Duplicate/conflicting candles: identical timestamps with different OHLC must be rejected rather than arbitrarily selected.
- Intrabar leakage: only finalized candle closes may create UP/DOWN or checkpoint evidence.

---

## File Structure

- `macro/temporal/m08-n20-policy.mjs` — validates/version-controls timezone, anchor, checkpoint, tolerance and horizon policy.
- `macro/temporal/m08-n20-detector.mjs` — selects M08/N20 references and detects close-confirmed UP/DOWN/false-break/wait states.
- `macro/temporal/m08-n20-checkpoints.mjs` — builds point-in-time 11:30 and 18:00 snapshots.
- `macro/temporal/m08-n20-relation.mjs` — same/opposite/range/unresolved relationship.
- `macro/temporal/m08-retest.mjs` — touch/hold/fail/reversal-transition evidence under explicit tolerance policy.
- `macro/temporal/bbma-cross-context.mjs` — relates temporal state to immutable BBMA/MTF evidence.
- `macro/replay/m08-n20-daily-replay.mjs` — composes one traceable MYT trading-date record.
- `tests/js/*` — focused TDD contracts plus an end-to-end historical replay contract.

### Task 1: Versioned temporal policy and MYT anchor resolution

**Files:**
- Create: `macro/temporal/m08-n20-policy.mjs`
- Create: `tests/js/m08-n20-policy.test.mjs`

**Interfaces:**
- Consumes: plain policy object and UTC timestamps.
- Produces: `validateM08N20Policy(policy)` and deterministic helpers for MYT trading-date/anchor resolution.

- [ ] Write failing tests requiring `version`, `timezone='Asia/Kuala_Lumpur'`, M08 `08:00`, N20 `20:00`, checkpoints `11:30`/`18:00`, source timeframe and explicit retest tolerance/horizons.
- [ ] Add tests for MYT date rollover around 16:00 UTC and invalid timestamps.
- [ ] Add tests proving missing policy fields/unsupported timezone/timeframe fail explicitly.
- [ ] Run focused test and confirm RED.
- [ ] Implement minimal pure validation and timezone conversion with no `Date.now()`.
- [ ] Run focused test and require GREEN.
- [ ] Run existing JS suite for regression.
- [ ] Commit.

### Task 2: M08/N20 reference and close-break detector

**Files:**
- Create: `macro/temporal/m08-n20-detector.mjs`
- Create: `tests/js/m08-n20-detector.test.mjs`

**Interfaces:**
- Consumes: sorted finalized OHLC candles plus validated temporal policy and setup ID `M08|N20`.
- Produces: immutable reference record plus `WAIT|UP|DOWN|FALSE_BREAK_UP|FALSE_BREAK_DOWN|UNRESOLVED` evidence.

- [ ] Write failing test selecting exact M08 reference from UTC data corresponding to 08:00 MYT.
- [ ] Write failing test selecting exact independent N20 reference corresponding to 20:00 MYT.
- [ ] Prove wick above/below reference does not create UP/DOWN without close confirmation.
- [ ] Prove a breakout may be confirmed several candles after the reference.
- [ ] Cover no-break/range day and incomplete-day behavior.
- [ ] Reject non-monotonic input, incomplete OHLC and conflicting duplicate timestamps.
- [ ] Prove missing reference candle is explicit UNKNOWN/partial and never nearest-candle substituted.
- [ ] Implement minimal detector.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 3: 11:30 and 18:00 point-in-time checkpoints

**Files:**
- Create: `macro/temporal/m08-n20-checkpoints.mjs`
- Create: `tests/js/m08-n20-checkpoints.test.mjs`

**Interfaces:**
- Consumes: M08 reference/detection, candles available at checkpoint, optional immutable BBMA/context snapshot.
- Produces: checkpoint records with known-at-time state and provenance.

- [ ] Write failing 11:30 tests for confirmed direction, unresolved state, first qualifying close and candles elapsed.
- [ ] Write failing 18:00 tests for versioned `TREND_CONTINUING|PULLBACK|RETESTING_M08|RANGE|REVERSING|UNRESOLVED` classification.
- [ ] Add boundary test proving a candle closing after checkpoint cannot influence that checkpoint.
- [ ] Add missing/gap test that produces explicit partial/UNKNOWN evidence.
- [ ] Add immutability/provenance tests.
- [ ] Implement minimal checkpoint logic using explicit policy definitions.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 4: M08 ↔ N20 relationship classifier

**Files:**
- Create: `macro/temporal/m08-n20-relation.mjs`
- Create: `tests/js/m08-n20-relation.test.mjs`

**Interfaces:**
- Consumes: finalized M08 and N20 detection records.
- Produces: `SAME_DIRECTION|OPPOSITE_DIRECTION|N20_RANGE|M08_UNRESOLVED|N20_UNRESOLVED|UNKNOWN`.

- [ ] Write failing same-direction UP/UP and DOWN/DOWN tests.
- [ ] Write failing opposite-direction tests.
- [ ] Prove opposite direction does not emit `REVERSAL`.
- [ ] Cover range/wait, unresolved and missing inputs.
- [ ] Preserve both source record IDs and timestamps.
- [ ] Implement pure relation classifier.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 5: M08 retest evidence

**Files:**
- Create: `macro/temporal/m08-retest.mjs`
- Create: `tests/js/m08-retest.test.mjs`

**Interfaces:**
- Consumes: M08 reference, subsequent finalized candles, explicit retest tolerance/hold/failure policy and optional independent BBMA/HTF transition evidence.
- Produces: `M08_RETEST_TOUCH|M08_RETEST_HOLD|M08_RETEST_FAIL|M08_REVERSAL_TRANSITION|NONE|UNKNOWN`.

- [ ] Write failing tests for upper-zone retest after M08.UP and lower-zone retest after M08.DOWN.
- [ ] Separate touch from hold and fail using closed-candle evidence.
- [ ] Prove tolerance comes only from policy; no hidden point/pip constants.
- [ ] Prove `M08_REVERSAL_TRANSITION` requires both failed temporal structure and independently supplied opposite BBMA/HTF transition evidence.
- [ ] Cover missing/gapped candles as UNKNOWN rather than inferred hold/fail.
- [ ] Implement minimal retest evaluator.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 6: BBMA/HTF cross-context without authority leakage

**Files:**
- Create: `macro/temporal/bbma-cross-context.mjs`
- Create: `tests/js/bbma-cross-context.test.mjs`

**Interfaces:**
- Consumes: M08/N20 state and existing immutable BBMA/MTF evidence snapshot at the same historical timestamp.
- Produces: `ALIGNED|COUNTER_STRUCTURE|MIXED|BLOCKED|UNKNOWN` plus original BBMA readiness/direction/reason codes unchanged.

- [ ] Write failing aligned UP+BUY and DOWN+SELL tests.
- [ ] Write failing counter-structure tests.
- [ ] Prove BBMA `BLOCKED` remains BLOCKED despite M08/N20 agreement.
- [ ] Prove mixed/unknown BBMA cannot be upgraded to aligned-confirmable technical evidence.
- [ ] Prove input BBMA object is not mutated.
- [ ] Add future-HTF fixture and reject snapshot components whose effective/close timestamp exceeds observation time.
- [ ] Implement minimal cross-context composer.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 7: Daily point-in-time replay composer

**Files:**
- Create: `macro/replay/m08-n20-daily-replay.mjs`
- Create: `tests/js/m08-n20-daily-replay.test.mjs`

**Interfaces:**
- Consumes: one MYT trading date's finalized candles, validated policy, point-in-time BBMA snapshots, normalized macro/news context, spread/volatility/data-health inputs and later outcome inputs.
- Produces: immutable, traceable daily evidence record.

- [ ] Write failing full-day fixture containing M08 → 11:30 → 18:00 → N20 → relation → retest/outcome.
- [ ] Write failing partial-day fixture proving missing N20 remains explicit and M08 evidence is retained.
- [ ] Attach event class/proximity/gate without changing temporal or BBMA direction.
- [ ] Attach spread/volatility/data-health regimes without converting UNKNOWN to NORMAL.
- [ ] Prove later outcomes are stored separately from original observations.
- [ ] Replay identical inputs twice and require deep equality.
- [ ] Preserve replay IDs/source refs through every component.
- [ ] Implement minimal composer.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 8: Phase-6 maturity integration

**Files:**
- Modify/Create as Phase-6 maturity implementation lands: `macro/maturity/maturity-matrix.mjs`
- Test: `tests/js/m08-n20-maturity-integration.test.mjs`

**Interfaces:**
- Consumes: daily M08/N20 replay records plus existing Phase-6 regime/evidence dimensions.
- Produces: additional matrix dimensions only; no trading action.

- [ ] Write failing test stratifying by setup, direction, M08↔N20 relation, BBMA setup/direction, MTF readiness, cross-relation, HTF state, event context, spread, volatility, health and outcome horizon.
- [ ] Verify sparse and UNKNOWN cells remain visible.
- [ ] Verify replay IDs and distinct MYT trading dates survive aggregation.
- [ ] Verify missing outcomes remain missing per horizon.
- [ ] Implement minimal matrix extension only after base Phase-6 maturity module exists and is GREEN.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 9: Historical hypothesis report

**Files:**
- Create: `macro/temporal/m08-n20-history-report.mjs`
- Create: `tests/js/m08-n20-history-report.test.mjs`

**Interfaces:**
- Consumes: maturity matrix/daily replay records and explicit `asOfUtc`.
- Produces: descriptive counts/distributions/sufficiency flags; no causal or profitability claim.

- [ ] Write failing tests for M08 UP/DOWN/no-break counts and 11:30 confirmation coverage.
- [ ] Report 18:00 state distribution separately for M08.UP and M08.DOWN.
- [ ] Report N20 same/opposite/range distribution.
- [ ] For opposite N20, report retest touch/hold/fail/reversal separately.
- [ ] Cross-tab results by BBMA/HTF alignment and event regime.
- [ ] Include distinct-date coverage, freshness, missing outcomes and sparse warnings.
- [ ] Never output `proven`, `guaranteed`, automatic trade permission or causal attribution from association alone.
- [ ] Implement deterministic report.
- [ ] Run focused/full tests; require GREEN.
- [ ] Commit.

### Task 10: Leakage, boundary and regression audit

- [ ] Search production additions for `Date.now`, hidden local/server timezone dependence and network fetches.
- [ ] Verify all MYT handling is derived explicitly from UTC + `Asia/Kuala_Lumpur` policy.
- [ ] Verify no future candle, later outcome or future event result can influence an earlier M08/N20/BBMA state.
- [ ] Verify no M08/N20 module imports broker/order/lot/SL/TP/live-delivery code.
- [ ] Verify BBMA modules remain unchanged unless a separately demonstrated defect requires correction.
- [ ] Verify temporal agreement cannot promote BBMA readiness.
- [ ] Add regression tests for every defect found.
- [ ] Run `node --test tests/js/*.test.mjs`; require GREEN.
- [ ] Commit verified fixes only.

### Task 11: CI and integration gate

- [ ] Push exact branch head and require HELIX VEYRA/migration/safety checks on that SHA.
- [ ] Diagnose any RED at root cause; do not weaken UNKNOWN, leakage, close-confirmation or BBMA-authority assertions merely to get GREEN.
- [ ] Compare changed files against validated base and confirm scope is temporal/replay/maturity/tests/docs only.
- [ ] Record exact validated SHA and test totals.
- [ ] Synchronize with latest validated `main`.
- [ ] Open PR documenting historical-evidence-only semantics and non-live boundary.
- [ ] Require fresh PR-level GREEN on exact combined head.
- [ ] Merge only after exact-head GREEN and post-merge `main` verification.
