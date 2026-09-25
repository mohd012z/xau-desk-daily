# BBMA + News Evidence Maturity Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic evidence-maturity layer over Phase-5 replay/evidence outputs that exposes regime coverage, freshness, sample sufficiency, and unmet evidence requirements without enabling live trading or alert cutover.

**Architecture:** Phase 6 consumes immutable Phase-5 observations/outcomes and classifies explicit evidence regimes (session, event class/proximity, spread, volatility, data health and BBMA strata). It then builds an auditable maturity matrix and evaluates a versioned sufficiency policy, preserving UNKNOWN/sparse cells and replay-id drill-down. No Phase-4/5 decision or outcome record is mutated.

**Tech Stack:** Node.js ESM, `node:test`, existing `macro/replay/*`, existing BBMA/News shadow evidence contracts, GitHub Actions HELIX VEYRA CI.

**Spec:** `docs/superpowers/specs/2026-09-25-bbma-evidence-maturity-phase6-design.md`

## Global Constraints

- BBMA remains the only technical BUY/SELL direction authority.
- News/macro/session/spread/volatility may contextualize, segment, or gate evidence only.
- No hidden wall clock: `asOfUtc` and all timestamps are explicit.
- All thresholds/policies are explicit and versioned.
- UNKNOWN/missing regime inputs remain counted; never silently discard them.
- Sparse strata remain visible; no interpolation or synthetic evidence.
- No opaque universal confidence/win-rate score.
- `SUFFICIENT` means sufficient only under the declared evidence policy, not permission to trade.
- No Telegram/APK/live alert-router cutover, broker execution, lot sizing, SL/TP generation, or automatic BBMA rule mutation.

## File Structure

- `macro/maturity/regime-classifier.mjs` — deterministic classification of session, event, spread, volatility, health and BBMA evidence dimensions.
- `macro/maturity/maturity-matrix.mjs` — builds traceable per-stratum counts, dates, recency, outcomes and replay-id membership.
- `macro/maturity/sufficiency-policy.mjs` — validates and evaluates explicit versioned minimum-evidence policy.
- `macro/maturity/drift-summary.mjs` — descriptive recent-vs-prior distribution comparison only.
- `macro/maturity/maturity-report.mjs` — immutable Phase-6 report composer with gaps and traceability.
- Matching `tests/js/*` files for every module plus one end-to-end Phase-6 contract test.

---

### Task 1: Deterministic regime classifier

**Files:**
- Create: `macro/maturity/regime-classifier.mjs`
- Create: `tests/js/regime-classifier.test.mjs`

- [ ] Write failing tests for UTC-derived Asia/London/New York/overlap session classification with exact boundary timestamps.
- [ ] Write failing tests for explicit event class/proximity values and UNKNOWN preservation.
- [ ] Write failing tests for spread normal/elevated/extreme using versioned explicit thresholds.
- [ ] Write failing tests for volatility low/normal/high using explicit policy thresholds; absent inputs return UNKNOWN.
- [ ] Write failing tests for healthy/stale/incomplete/mixed/unsafe data-health classification.
- [ ] Run focused tests and confirm RED.
- [ ] Implement minimal pure classifier with no `Date.now()` or external fetch.
- [ ] Freeze output and include policy version/reason codes.
- [ ] Run focused/full JS tests; expect GREEN.
- [ ] Commit.

### Task 2: Traceable maturity matrix

**Files:**
- Create: `macro/maturity/maturity-matrix.mjs`
- Create: `tests/js/maturity-matrix.test.mjs`

- [ ] Write failing tests that combine direction, readiness, gate, session, event, spread, volatility and health into stable stratum identities.
- [ ] Verify BUY and SELL remain separate and UNKNOWN dimensions remain explicit.
- [ ] Verify each stratum reports eligible observations, replay IDs, source refs, oldest/latest UTC and distinct trading dates.
- [ ] Add per-horizon valid-outcome/missing counts using Phase-5 outcomes only.
- [ ] Verify reversal/invalidation and reason-code distributions remain traceable.
- [ ] Prove sparse strata are retained and never filled synthetically.
- [ ] Implement deterministic matrix builder.
- [ ] Run focused/full JS tests; expect GREEN.
- [ ] Commit.

### Task 3: Versioned evidence-sufficiency policy

**Files:**
- Create: `macro/maturity/sufficiency-policy.mjs`
- Create: `tests/js/sufficiency-policy.test.mjs`

- [ ] Write failing validation tests requiring policy version and explicit numeric/date/coverage requirements.
- [ ] Cover minimum observations, minimum outcomes per horizon, distinct-date minimum, maximum evidence age, BUY/SELL representation and required session/event classes.
- [ ] Verify policy result is `INSUFFICIENT`, `PARTIAL`, or `SUFFICIENT` only relative to the declared policy.
- [ ] Verify every unmet requirement exposes actual vs required values and reason code.
- [ ] Verify empty/UNKNOWN data cannot default to SUFFICIENT.
- [ ] Implement pure policy evaluator using explicit `asOfUtc`.
- [ ] Run focused/full JS tests; expect GREEN.
- [ ] Commit.

### Task 4: Freshness and descriptive drift summary

**Files:**
- Create: `macro/maturity/drift-summary.mjs`
- Create: `tests/js/drift-summary.test.mjs`

- [ ] Write failing tests for explicit recent/prior windows relative to `asOfUtc`.
- [ ] Compare direction, gate, session, event class and health distributions without generating a trading recommendation.
- [ ] Report insufficient window samples explicitly.
- [ ] Ensure drift output cannot mutate BBMA rules, thresholds or maturity policy.
- [ ] Implement deterministic descriptive deltas/counts only.
- [ ] Run focused/full JS tests; expect GREEN.
- [ ] Commit.

### Task 5: Immutable maturity report

**Files:**
- Create: `macro/maturity/maturity-report.mjs`
- Create: `tests/js/maturity-report.test.mjs`

- [ ] Write failing tests for report kind/version, `asOfUtc`, policy version, matrix summary, sufficiency result, gaps, freshness and optional drift summary.
- [ ] Require replay-id/source-reference drill-down for every populated stratum.
- [ ] Add warnings for UNKNOWN-heavy, stale, sparse, missing-horizon and unrepresented required regimes.
- [ ] Verify identical explicit inputs produce deep-equal reports.
- [ ] Verify report and nested structures are deeply immutable.
- [ ] Implement minimal composer.
- [ ] Run focused/full JS tests; expect GREEN.
- [ ] Commit.

### Task 6: End-to-end Phase-6 evidence-maturity contract

**Files:**
- Create: `tests/js/bbma-news-evidence-maturity-phase6-contract.test.mjs`

- [ ] Build Phase-5-style fixtures spanning BUY/SELL, ALLOW/WATCH_ONLY/BLOCK, sessions, event classes, spread/volatility regimes, stale/healthy data and missing outcomes.
- [ ] Classify each observation through the real regime classifier.
- [ ] Build the real maturity matrix and evaluate a declared test policy.
- [ ] Assert sparse/UNKNOWN strata remain visible.
- [ ] Assert per-horizon missing outcomes remain missing.
- [ ] Assert stale evidence cannot satisfy freshness requirements merely through large historical count.
- [ ] Assert report contains exact policy version and replay-id traceability.
- [ ] Assert no live-delivery/execution imports or fields are introduced.
- [ ] Replay identical fixture set twice and require deep equality.
- [ ] Run `node --test tests/js/*.test.mjs`; expect GREEN.
- [ ] Commit.

### Task 7: Cross-function and leakage review

- [ ] Compare Phase-6 branch against validated `main`.
- [ ] Confirm Phase-4 direction/gate/lifecycle modules and Phase-5 outcome records remain unchanged unless a separately proven defect requires correction.
- [ ] Search Phase-6 production code for `Date.now`, network fetch, Telegram/APK delivery, broker/order, lot, SL/TP and rule-mutation paths.
- [ ] Verify outcome information is used only for evidence maturity, never original signal generation.
- [ ] Verify no maturity label is interpreted as automatic trade/live-alert permission.
- [ ] Add regression tests for every defect discovered.
- [ ] Commit verified fixes only.

### Task 8: Repository regression and CI safety gate

- [ ] Run full JavaScript test suite.
- [ ] Push exact branch head and require HELIX VEYRA/migration/safety checks.
- [ ] Diagnose any RED at root cause; do not weaken sparse/UNKNOWN/freshness assertions merely to obtain GREEN.
- [ ] Verify changed-file boundary remains Phase-6 maturity code/tests/docs only.
- [ ] Record exact validated head SHA.

### Task 9: Pull-request integration

- [ ] Synchronize with latest validated `main`.
- [ ] Open PR documenting evidence-only semantics and explicit non-live boundary.
- [ ] Require fresh PR-level HELIX VEYRA + migration/safety GREEN on exact combined head.
- [ ] Deep-review changed files for denominator errors, hidden time dependence, unknown-data loss, evidence leakage and execution side effects.
- [ ] Merge only after exact-head GREEN.
- [ ] Verify post-merge `main` CI GREEN before defining any production alert-promotion policy.
