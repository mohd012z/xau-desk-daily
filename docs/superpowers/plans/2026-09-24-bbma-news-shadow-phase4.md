# BBMA + News Cross-Function Shadow Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect existing macro/news evidence to Phase-3 BBMA confluence/lifecycle through a deterministic, fail-closed, auditable shadow observation pipeline without live delivery or execution.

**Architecture:** Add pure adapters/observers around existing event, data-health, confirmation-gate and BBMA lifecycle contracts. News controls progression risk only; BBMA remains the technical direction source. Compose the outputs into immutable replayable shadow observations.

**Tech Stack:** Node.js ESM, `node:test`, existing `macro/events`, `macro/core`, and `macro/bbma` modules, GitHub Actions HELIX VEYRA CI.

**Spec:** `docs/superpowers/specs/2026-09-24-bbma-news-shadow-phase4-design.md`

## Global Constraints

- News/macro must never manufacture or reverse BUY/SELL direction.
- Reuse existing event, data-health, confirmation-gate, signal-state and Phase-3 BBMA contracts.
- All time decisions use explicit UTC inputs; no `Date.now()` or hidden wall clock.
- Missing/stale/unknown required safety input fails closed for confirmation.
- `MIXED` and `INCOMPLETE` BBMA evidence cannot confirm.
- Remain shadow-only: no Telegram/APK live delivery, alert-router cutover, broker execution, position sizing or SL/TP generation.
- Outputs and reason-code collections are immutable and deterministic for identical explicit inputs.

## Review Focus

- Event timestamps exactly on pre/window/post boundaries must map deterministically.
- Irrelevant events must not block XAU merely because impact is high.
- Unknown/malformed relevant high-impact evidence must fail closed, never default ALLOW.
- Stale macro feed and healthy technical feed must still block confirmation when macro state is required.
- Opposite BBMA direction must use Phase-3 reversal protection; macro/news must not change signal direction.

---

### Task 1: XAU event-risk normalizer

**Files:**
- Create: `macro/adapters/xau-event-risk.mjs`
- Create: `tests/js/xau-event-risk.test.mjs`

- [ ] Write failing tests for XAU/USD-relevant and irrelevant events, LOW/MEDIUM/HIGH/unknown impact, explicit UTC pre/window/post/outside phases, exact boundaries, and malformed timestamp.
- [ ] Run focused test and confirm RED because implementation is absent.
- [ ] Implement pure `normalizeXauEventRisk({ event, observedUtc, policy })` using explicit policy windows.
- [ ] Preserve event identity/reference and reason codes; freeze public output.
- [ ] Run focused and full JS tests; expect GREEN.
- [ ] Commit.

### Task 2: Macro observation aggregator

**Files:**
- Create: `macro/core/macro-observation.mjs`
- Create: `tests/js/macro-observation.test.mjs`

- [ ] Write failing tests mapping relevant normalized events to `ALLOW`, `WATCH_ONLY`, `BLOCK`.
- [ ] Prove irrelevant high-impact events do not block XAU.
- [ ] Prove unknown/malformed required relevant evidence fails closed.
- [ ] Prove output includes contributing event refs and deterministic reason codes.
- [ ] Implement minimal immutable aggregator.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 3: Cross-function health/gate adapter

**Files:**
- Create: `macro/core/shadow-risk-gate.mjs`
- Create: `tests/js/shadow-risk-gate.test.mjs`
- Reuse: `macro/core/data-health.mjs`, `macro/core/confirmation-gate.mjs`

- [ ] Write failing tests for healthy ALLOW, macro WATCH_ONLY, macro BLOCK, stale macro input, and unsafe BBMA technical confirmation data.
- [ ] Verify missing required health state rejects/fails closed rather than defaults open.
- [ ] Implement adapter that normalizes existing health results into `evaluateConfirmationGate()` inputs without duplicating health policy.
- [ ] Freeze output and preserve source reason codes.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 4: Immutable cross-function shadow observation

**Files:**
- Create: `macro/bbma/news-shadow-observation.mjs`
- Create: `tests/js/bbma-news-shadow-observation.test.mjs`

- [ ] Write failing BUY/SELL observation tests preserving BBMA direction/readiness/timeframes, macro state/events, health, gate, lifecycle action/reason and UTC.
- [ ] Verify news never changes candidate direction.
- [ ] Verify MIXED/INCOMPLETE/blocked inputs cannot present confirmed progression.
- [ ] Verify identical explicit inputs replay to deep-equal output.
- [ ] Verify deep immutability.
- [ ] Implement minimal composer.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 5: Phase-4 orchestration contract

**Files:**
- Create: `macro/bbma/news-shadow-pipeline.mjs`
- Create: `tests/js/bbma-news-shadow-phase4-contract.test.mjs`

- [ ] Write end-to-end shadow fixtures for BUY+ALLOW, SELL+ALLOW, high-impact BLOCK, WATCH_ONLY, stale macro, technical unsafe, MIXED/INCOMPLETE and direction reversal.
- [ ] Verify lifecycle advances only one legal state per invocation.
- [ ] Verify no import/call to Telegram, APK delivery, broker execution or live alert distribution.
- [ ] Verify event/evidence/reason references are retained for audit replay.
- [ ] Implement orchestration only from existing/pure Phase-4 components; no network fetches.
- [ ] Run `node --test tests/js/*.test.mjs`; expect GREEN.
- [ ] Commit.

### Task 6: Regression and repository safety gate

**Files:**
- Modify product files only for verified root-cause defects.

- [ ] Run complete JavaScript test suite.
- [ ] Run repository-prescribed Python/collector/event-history/safety checks through CI.
- [ ] Compare branch to `main` and verify no alert-router/live distribution, Telegram/APK or broker-execution files changed unintentionally.
- [ ] Push exact head and require fresh HELIX VEYRA + migration/safety GREEN.
- [ ] Diagnose RED at root cause; never weaken fail-closed assertions to obtain green.
- [ ] Commit any verified fixes.

### Task 7: Pull-request integration

- [ ] Synchronize branch with latest validated `main`.
- [ ] Open PR documenting shadow-only boundary and exact head SHA.
- [ ] Require fresh PR-level HELIX VEYRA and migration/safety GREEN on combined head.
- [ ] Deep-review changed files for direction leakage, hidden clock use, fail-open defaults and side effects.
- [ ] Merge only after exact-head GREEN.
- [ ] Verify post-merge `main` CI GREEN before any live-shadow scheduling or alert-policy work.
