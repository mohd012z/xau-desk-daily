# BBMA Multi-Timeframe Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auditable BBMA Momentum detection and deterministic D1/H4/H1/M30/M15/M5 evidence aggregation without changing live alert behavior.

**Architecture:** Primitive detectors stay pure and independent. A new timeframe evaluator runs Extreme, MHV, CSA, Re-entry and Momentum per series, then a separate multi-timeframe aggregator preserves directional support, conflicts and incomplete-data states for downstream confluence/lifecycle policy.

**Tech Stack:** Node.js ESM, `node:test`, existing BBMA canonical validator/rules, GitHub Actions HELIX VEYRA CI.

**Spec:** `docs/superpowers/specs/2026-09-24-bbma-mtf-phase2-design.md`

## Global Constraints

- Supported analytical timeframes are exactly D1/H4/H1/M30/M15/M5.
- Remain shadow-only; no direct Telegram/APK BUY/SELL delivery.
- UTC is canonical; no ad-hoc `+8` conversion.
- Preserve all opposing evidence and explicit insufficient-data states.
- Reuse `bbma-shadow-v1` and the shared canonical candle validator.
- Do not introduce numeric confidence scoring in this phase.

## Review Focus

- Wick crossing a Bollinger Band without a qualifying close must not become Momentum.
- Equality at a Bollinger Band must remain non-Momentum under `bbma-shadow-v1`.
- Missing/insufficient timeframe input must not be silently counted as neutral agreement.
- Opposing detector/timeframe evidence must remain visible as conflict/MIXED.
- Identical input must produce stable ordering and deterministic output.

---

### Task 1: Momentum detector

**Files:**
- Create: `macro/bbma/momentum.mjs`
- Create: `tests/js/bbma-momentum.test.mjs`

**Interfaces:**
- Consumes: `validateBbmaSeries(series, { minimum })`, `getBbmaRules(ruleVersion).momentum`
- Produces: `detectMomentum({ series, timeframe, ruleVersion = 'bbma-shadow-v1' })`

- [ ] Write failing tests for BUY close above upper BB, SELL close below lower BB, wick-only rejection, equality rejection and insufficient data.
- [ ] Run `node --test tests/js/bbma-momentum.test.mjs`; expect RED because module/implementation is absent.
- [ ] Implement minimal pure Momentum detector using canonical validation and strict band-close rules.
- [ ] Run the focused test; expect GREEN.
- [ ] Run `node --test tests/js/*.test.mjs`; expect existing suite GREEN.
- [ ] Commit detector and tests.

### Task 2: Per-timeframe BBMA evaluator

**Files:**
- Create: `macro/bbma/timeframe-evidence.mjs`
- Create: `tests/js/bbma-timeframe-evidence.test.mjs`

**Interfaces:**
- Consumes: `detectExtreme`, `detectMhv`, `detectCsa`, `detectReentry`, `detectMomentum`
- Produces: `evaluateBbmaTimeframe({ series, timeframe, ruleVersion })`

- [ ] Write failing tests proving all five detector observations are retained in deterministic order.
- [ ] Add tests for BUY-only summary, SELL-only summary, same-timeframe opposing evidence => CONFLICT, no detections => NEUTRAL, and insufficient input => INSUFFICIENT_DATA.
- [ ] Run focused test and confirm RED.
- [ ] Implement evaluator without suppressing primitive evidence.
- [ ] Freeze/normalize public output and keep anchor/rule-version evidence intact.
- [ ] Run focused and full JS suites; expect GREEN.
- [ ] Commit evaluator and tests.

### Task 3: Six-timeframe evidence aggregator

**Files:**
- Create: `macro/bbma/mtf-evidence.mjs`
- Create: `tests/js/bbma-mtf-evidence.test.mjs`

**Interfaces:**
- Consumes: `evaluateBbmaTimeframe({ series, timeframe, ruleVersion })`
- Produces: `aggregateBbmaEvidence({ seriesByTimeframe, ruleVersion })`

- [ ] Write failing tests requiring slots in D1,H4,H1,M30,M15,M5 order.
- [ ] Test aligned BUY => ALIGNED_BUY and aligned SELL => ALIGNED_SELL without inventing a recommendation.
- [ ] Test opposing valid timeframes => MIXED and preservation of BUY/SELL support lists.
- [ ] Test missing or insufficient required timeframe => INCOMPLETE while preserving evaluable evidence.
- [ ] Test deterministic repeated output and immutable public collections.
- [ ] Run focused test and confirm RED.
- [ ] Implement minimal aggregator and descriptive overall state.
- [ ] Run focused and full JS suites; expect GREEN.
- [ ] Commit aggregator and tests.

### Task 4: Integration contract and regression gate

**Files:**
- Create: `tests/js/bbma-phase2-contract.test.mjs`
- Modify only if required by existing integration contract; do not wire live delivery in this task.

**Interfaces:**
- Consumes: `aggregateBbmaEvidence`
- Produces: stable shadow evidence object suitable for downstream confluence/lifecycle code.

- [ ] Write contract tests proving output contains rule version, six timeframe states, conflicts/data status, and no delivery side effects.
- [ ] Verify existing alert-router behavior is untouched by the Phase 2 module.
- [ ] Run `node --test tests/js/*.test.mjs`.
- [ ] Run the repository's HELIX VEYRA CI/migration/safety checks through GitHub Actions.
- [ ] Review failures at root cause; do not weaken tests merely to obtain green.
- [ ] Commit any contract-only additions.

### Task 5: Pull-request verification

**Files:**
- No product-code changes unless a verified regression requires a fix.

**Interfaces:**
- Produces: reviewable Phase 2 PR against `main`.

- [ ] Confirm branch is synchronized with current `main` before PR integration.
- [ ] Open PR summarizing Momentum, timeframe evidence and MTF aggregation boundaries.
- [ ] Require fresh PR-level HELIX VEYRA GREEN on the exact head SHA.
- [ ] Review changed files for accidental delivery/news/lifecycle modifications.
- [ ] Merge only after combined regression is GREEN, then verify `main` once more.
