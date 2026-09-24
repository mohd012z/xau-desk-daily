# XAU BBMA Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, test-first BBMA detector primitives and multi-timeframe evidence aggregation for XAUUSD while keeping all new results in shadow mode and making no production BUY/SELL cutover.

**Architecture:** Phase 2 builds on the green Phase 1 contracts, data-health gate, deterministic IDs, signal lifecycle and alert router. BBMA calculations are isolated from lifecycle and delivery: detectors return structured observations, a separate timeframe aggregator builds evidence, and later confluence policy decides state. No detector sends Telegram/APK alerts.

**Tech Stack:** JavaScript ES modules (`.mjs`), Node built-in `node:test` + `assert/strict`, deterministic JSON fixtures, existing GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-24-xau-bbma-news-master-engine-design.md`

## Global Constraints

- `xau-desk-daily` remains the technical/confluence authority.
- News_ifxhelper remains the verified macro/news and notification-delivery authority.
- UTC is canonical; MYT is presentation.
- Detector output is evidence, not an automatic trading instruction.
- D1/H4/H1/M30/M15/M5 observations remain independently inspectable.
- No look-ahead: a detector may only use the supplied closed/current candle sequence according to its explicit mode.
- No detector calls Telegram, Android, HTTP, filesystem, GitHub APIs or system clock.
- All thresholds are named configuration values and captured in `rule_version`.
- Phase 2 stays shadow-only; existing production alert behavior is unchanged.
- Historical validation is evidence, never a guarantee of future performance.

## Review Focus

1. Insufficient candle history must return an explicit `INSUFFICIENT_DATA`, never fabricate a signal.
2. NaN/Infinity/non-numeric OHLC/indicator input must be rejected.
3. Candle order must be explicit and validated; out-of-order/duplicate timestamps must fail.
4. Boundary equality at BB/MA thresholds must have deterministic inclusive/exclusive behavior pinned by tests.
5. A lower-timeframe signal against higher-timeframe context must remain visible as conflict evidence rather than being silently discarded.

---

## File Structure

Create:
- `macro/bbma/input.mjs` — canonical candle/indicator validation and ordering.
- `macro/bbma/extreme.mjs` — Extreme observation detector.
- `macro/bbma/mhv.mjs` — MHV observation detector.
- `macro/bbma/csa.mjs` — CSA observation detector.
- `macro/bbma/reentry.mjs` — Re-entry observation detector.
- `macro/bbma/momentum.mjs` — Momentum observation detector.
- `macro/bbma/aggregate.mjs` — per-timeframe observation aggregation only.
- `macro/bbma/rules.mjs` — versioned rule/threshold configuration.
- `tests/js/bbma-input.test.mjs`
- `tests/js/bbma-extreme.test.mjs`
- `tests/js/bbma-mhv.test.mjs`
- `tests/js/bbma-csa.test.mjs`
- `tests/js/bbma-reentry.test.mjs`
- `tests/js/bbma-momentum.test.mjs`
- `tests/js/bbma-aggregate.test.mjs`
- `tests/fixtures/bbma/*.json` — synthetic deterministic fixtures with expected observations.

Do not modify production delivery modules in this phase.

## Canonical Detector Input

Each detector consumes a validated sequence of candle records in ascending UTC order. A candle record is:

```js
{
  timestamp_utc: '2026-09-24T06:30:00.000Z',
  open: 3740.10,
  high: 3744.20,
  low: 3738.90,
  close: 3743.80,
  bb_upper: 3745.00,
  bb_mid: 3740.00,
  bb_lower: 3735.00,
  ma5_high: 3742.00,
  ma5_low: 3738.00,
  ma10_high: 3741.50,
  ma10_low: 3738.50,
  ema50: 3728.00
}
```

Indicators are supplied to detectors rather than recomputed in this phase. This isolates BBMA rule verification from indicator-library differences. Indicator calculation can be added as a separately tested component later if required.

Canonical observation output:

```js
{
  detector: 'REENTRY',
  detected: true,
  direction: 'BUY',
  timeframe: 'M15',
  anchor_utc: '2026-09-24T06:30:00.000Z',
  rule_version: 'bbma-shadow-v1',
  evidence: ['...'],
  status: 'OK'
}
```

No-signal output uses `detected:false`, `direction:null`. Insufficient history uses `status:'INSUFFICIENT_DATA'`.

## Task 1: Canonical BBMA input validation

**Files:** Create `macro/bbma/input.mjs`; test `tests/js/bbma-input.test.mjs`.

**Interfaces:** `validateBbmaSeries(series,{minimum=1}) -> frozen normalized series`.

- [ ] Write tests rejecting empty history when minimum is unmet, non-numeric/NaN/Infinity fields, `high < low`, duplicate timestamps and descending/out-of-order timestamps.
- [ ] Write a passing test for ascending valid candles and assert input objects are not mutated.
- [ ] Run `node --test tests/js/bbma-input.test.mjs` and confirm initial failure.
- [ ] Implement only validation/normalization; do not calculate indicators.
- [ ] Run focused test then `node --test tests/js/*.test.mjs`.
- [ ] Commit `feat: add canonical BBMA input validation`.

## Task 2: Versioned shadow rule configuration

**Files:** Create `macro/bbma/rules.mjs`; test within detector tests.

**Interfaces:** `getBbmaRules(version='bbma-shadow-v1') -> frozen rule object`.

- [ ] Define one explicit shadow rule version containing threshold/equality behavior used by all five detectors.
- [ ] Unknown versions throw `TypeError`; returned config is immutable.
- [ ] No magic threshold values may be duplicated inside detector modules.
- [ ] Run full JS suite and commit `feat: add versioned BBMA shadow rules`.

## Task 3: Extreme detector

**Files:** Create `macro/bbma/extreme.mjs`, `tests/js/bbma-extreme.test.mjs`, fixtures `extreme-buy.json`, `extreme-sell.json`, `extreme-none.json`.

**Interfaces:** `detectExtreme({series,timeframe,ruleVersion}) -> Observation`.

- [ ] Add BUY, SELL, none, equality-boundary and insufficient-history fixtures/tests.
- [ ] Tests must assert exact evidence keys used, anchor candle and rule version.
- [ ] Run focused test and confirm failure before implementation.
- [ ] Implement minimal pure detector using only named rule config.
- [ ] Run focused/full tests and commit `feat: add BBMA Extreme shadow detector`.

## Task 4: MHV detector

**Files:** Create `macro/bbma/mhv.mjs`, `tests/js/bbma-mhv.test.mjs`, BUY/SELL/none fixtures.

**Interfaces:** `detectMhv({series,timeframe,ruleVersion}) -> Observation`.

- [ ] Tests must prove MHV is not emitted from a single unrelated candle and must pin required prior Extreme/BB interaction evidence according to the configured shadow rule.
- [ ] Include insufficient-history and equality-boundary cases.
- [ ] Implement as a pure observation detector, not a signal state transition.
- [ ] Run focused/full tests and commit `feat: add BBMA MHV shadow detector`.

## Task 5: CSA detector

**Files:** Create `macro/bbma/csa.mjs`, `tests/js/bbma-csa.test.mjs`, BUY/SELL/none fixtures.

**Interfaces:** `detectCsa({series,timeframe,ruleVersion}) -> Observation`.

- [ ] Tests pin BUY/SELL structural crossing/close behavior using the configured MA/BB fields.
- [ ] Include a wick-only/no-close negative case so a touch cannot silently become CSA.
- [ ] Include insufficient history and boundary equality.
- [ ] Implement, run focused/full suite and commit `feat: add BBMA CSA shadow detector`.

## Task 6: Re-entry detector

**Files:** Create `macro/bbma/reentry.mjs`, `tests/js/bbma-reentry.test.mjs`, BUY/SELL/none fixtures.

**Interfaces:** `detectReentry({series,timeframe,ruleVersion}) -> Observation`.

- [ ] Tests pin the configured pullback-to-MA/BB zone plus directional context requirement.
- [ ] Include a case where price touches the zone but higher/local structure is opposite; expected `detected:false` with conflict evidence rather than a BUY/SELL observation.
- [ ] Include insufficient history and exact-boundary cases.
- [ ] Implement, run focused/full suite and commit `feat: add BBMA Re-entry shadow detector`.

## Task 7: Momentum detector

**Files:** Create `macro/bbma/momentum.mjs`, `tests/js/bbma-momentum.test.mjs`, BUY/SELL/none fixtures.

**Interfaces:** `detectMomentum({series,timeframe,ruleVersion}) -> Observation`.

- [ ] Tests pin candle-body/BB relationship required by the configured shadow rule.
- [ ] Include wick-only, tiny-body/no-momentum, BUY, SELL, equality-boundary and insufficient-data cases.
- [ ] Implement, run focused/full suite and commit `feat: add BBMA Momentum shadow detector`.

## Task 8: Per-timeframe aggregation without verdict

**Files:** Create `macro/bbma/aggregate.mjs`; test `tests/js/bbma-aggregate.test.mjs`.

**Interfaces:** `aggregateBbma({timeframe,series,ruleVersion}) -> {timeframe, rule_version, observations, conflicts}`.

- [ ] Test that all five detector outputs are retained, including `detected:false`/insufficient states needed for audit.
- [ ] Test contradictory BUY and SELL observations produce explicit `conflicts` and are not collapsed into a final direction.
- [ ] Test deterministic output for identical input.
- [ ] Implement by invoking detector modules only; no lifecycle or alert-router calls.
- [ ] Run focused/full tests and commit `feat: aggregate BBMA timeframe evidence`.

## Task 9: Multi-timeframe evidence map

**Files:** Extend `macro/bbma/aggregate.mjs`; extend `tests/js/bbma-aggregate.test.mjs`.

**Interfaces:** `buildBbmaTimeframeMap({D1,H4,H1,M30,M15,M5},ruleVersion) -> frozen map`.

- [ ] Require explicit keys D1/H4/H1/M30/M15/M5; missing series becomes an explicit unavailable entry, not fabricated neutral data.
- [ ] Verify higher-timeframe BUY evidence and lower-timeframe SELL evidence are both preserved.
- [ ] Add `alignment` metadata only as descriptive counts/sets (`buy_timeframes`, `sell_timeframes`, `unavailable_timeframes`); do not produce a trade verdict yet.
- [ ] Run full suite and commit `feat: add BBMA multi timeframe evidence map`.

## Task 10: Phase 2 shadow smoke test

**Files:** Create `tests/js/master-engine-phase2.test.mjs`.

**Interfaces:** Uses Phase 1 health/identity/router plus Phase 2 timeframe map.

- [ ] Build synthetic six-timeframe input from fixtures.
- [ ] Assert the timeframe map retains detector evidence and conflicts.
- [ ] Construct a synthetic candidate only in the test harness; route with `shadow_mode:true` and assert `delivery_enabled:false`.
- [ ] Assert no Phase 2 module imports delivery/network modules.
- [ ] Run `node --test tests/js/master-engine-phase2.test.mjs` then `node --test tests/js/*.test.mjs`.
- [ ] Commit `test: verify BBMA phase 2 shadow engine`.

## Task 11: CI and branch verification

**Files:** Inspect `.github/workflows/macro-desk-ci.yml`; modify only if current wildcard JS suite does not cover new tests.

- [ ] Confirm `node --test tests/js/*.test.mjs` includes Phase 2 tests.
- [ ] Do not create a duplicate workflow.
- [ ] Verify no production Telegram/APK workflow was modified.
- [ ] Check branch CI to completion and inspect the failing job log if red; do not guess at fixes.
- [ ] Phase 2 exit requires latest branch CI `success` and all JS tests green.

## Phase 2 Exit Criteria

- Five BBMA primitive detectors have deterministic BUY/SELL/none/insufficient/boundary tests.
- Invalid or out-of-order market input is rejected.
- Detector rules are versioned and immutable.
- Detector evidence is independent from signal lifecycle and delivery.
- D1/H4/H1/M30/M15/M5 evidence is preserved without forcing a verdict.
- Conflicts remain visible.
- Phase 1 tests remain green.
- Shadow mode remains enabled and production delivery is unchanged.
- Latest branch CI is green.

## Deferred to Phase 3

- Exact multi-timeframe confluence policy that advances WATCH/SETUP/CONFIRMED.
- Macro-event risk integration into confluence.
- Historical replay scoring and outcome statistics.
- Production Telegram/APK cutover.
