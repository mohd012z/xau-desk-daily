# BBMA Confluence & Lifecycle Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Phase-2 BBMA MTF evidence into an auditable shadow candidate that progresses through the existing lifecycle only when technical confluence and normalized macro/news/data-health gates permit it.

**Architecture:** Keep MTF evidence, confluence, lifecycle transition, and delivery concerns separate. A pure confluence evaluator derives readiness/reasons from the Phase-2 evidence map; a bridge reuses `macro/core/signal-state.mjs` and normalized gate input to propose/apply only legal shadow lifecycle transitions. No live delivery is added.

**Tech Stack:** Node.js ESM, `node:test`, existing BBMA MTF engine, existing immutable signal-state module, GitHub Actions HELIX VEYRA CI.

**Spec:** `docs/superpowers/specs/2026-09-24-bbma-confluence-lifecycle-phase3-design.md`

## Global Constraints

- Reuse the existing lifecycle; do not create a parallel state machine.
- Supported MTF evidence remains D1/H4/H1/M30/M15/M5.
- `MIXED`, `INCOMPLETE`, and `NEUTRAL` cannot become `CONFIRMED` or `ACTIVE`.
- D1 disagreement remains explicit and blocks `CONFIRMABLE`.
- Gate input is normalized as `ALLOW`, `WATCH_ONLY`, or `BLOCK`; no news fetching occurs here.
- UTC timestamps are explicit caller inputs; no hidden wall-clock dependency.
- Remain shadow-only: no Telegram/APK/broker execution, position sizing or SL/TP generation.
- No numeric confidence score in this phase.

## Review Focus

- Opposing evidence accidentally becoming confirmation through counting/weighting.
- Missing timeframe data being interpreted as neutral agreement.
- Lifecycle state skipping (for example DETECTED directly to CONFIRMED).
- Macro/data-health `BLOCK` being bypassed by strong technical evidence.
- Replaying identical explicit inputs producing different output/history.

---

### Task 1: Pure BBMA confluence evaluator

**Files:**
- Create: `macro/bbma/confluence.mjs`
- Create: `tests/js/bbma-confluence.test.mjs`

**Interfaces:**
- Consumes: Phase-2 `aggregateBbmaEvidence()` output.
- Produces: `evaluateBbmaConfluence({ evidence })` with `direction`, `readiness`, `supporting_timeframes`, `conflict_timeframes`, `reason_codes`, `data_status`.

- [ ] Write failing tests for ALIGNED BUY and SELL, OBSERVED, WATCHABLE, SETUP_READY and CONFIRMABLE.
- [ ] Add failure-path tests for MIXED, INCOMPLETE, NEUTRAL, D1 disagreement and explicit conflict timeframes.
- [ ] Run focused test and confirm RED because implementation is absent.
- [ ] Implement minimal deterministic evaluator; preserve Phase-2 timeframe order and evidence.
- [ ] Freeze public output collections.
- [ ] Run focused test; expect GREEN.
- [ ] Run `node --test tests/js/*.test.mjs`; expect existing suite GREEN.
- [ ] Commit evaluator and tests.

### Task 2: Normalized downstream gate

**Files:**
- Create: `macro/core/confirmation-gate.mjs`
- Create: `tests/js/confirmation-gate.test.mjs`

**Interfaces:**
- Produces: `evaluateConfirmationGate({ macroState, technicalConfirmationAllowed, reasons })` normalized to `ALLOW`, `WATCH_ONLY`, or `BLOCK` with reason codes.

- [ ] Write failing tests for normal ALLOW, elevated/watch-only macro state, explicit macro BLOCK, and technical-confirmation fail-closed.
- [ ] Test malformed/unknown gate state rejects rather than defaults open.
- [ ] Implement pure normalization with immutable output.
- [ ] Run focused and full JS suites; expect GREEN.
- [ ] Commit gate and tests.

### Task 3: Shadow lifecycle bridge

**Files:**
- Create: `macro/bbma/lifecycle-bridge.mjs`
- Create: `tests/js/bbma-lifecycle-bridge.test.mjs`
- Reuse unchanged unless a verified defect requires correction: `macro/core/signal-state.mjs`

**Interfaces:**
- Consumes: confluence result, normalized gate, current shadow signal, explicit `atUtc`.
- Produces: transition decision plus optional signal returned through existing `transitionSignal()`.

- [ ] Write failing tests proving DETECTED -> WATCH only under WATCHABLE-or-better readiness.
- [ ] Prove WATCH -> SETUP requires SETUP_READY-or-better and SETUP -> CONFIRMED requires CONFIRMABLE + `ALLOW`.
- [ ] Prove `WATCH_ONLY` cannot confirm and `BLOCK` cannot advance beyond safe observation/watch behavior.
- [ ] Prove no state skipping and immutable history through the existing signal-state contract.
- [ ] Add contradiction test returning explicit invalidation recommendation rather than silently changing direction.
- [ ] Add explicit expiry input test; no `Date.now()`/implicit clock use.
- [ ] Implement minimal bridge.
- [ ] Run focused and full JS suites; expect GREEN.
- [ ] Commit bridge and tests.

### Task 4: Shadow candidate composition contract

**Files:**
- Create: `macro/bbma/shadow-candidate.mjs`
- Create: `tests/js/bbma-shadow-candidate.test.mjs`

**Interfaces:**
- Consumes: symbol, MTF evidence, confluence, gate, explicit generated UTC, optional existing signal.
- Produces: immutable candidate with direction/state/readiness/rule-version/evidence/gate/reasons/history.

- [ ] Write failing tests for BUY and SELL candidate composition.
- [ ] Verify MIXED/INCOMPLETE candidates retain evidence but cannot present confirmed readiness.
- [ ] Verify deterministic replay for identical explicit inputs.
- [ ] Verify deep immutability of evidence/reasons/history at public boundary.
- [ ] Verify module has no delivery/network/broker side effects.
- [ ] Implement minimal composition.
- [ ] Run focused and full JS suites; expect GREEN.
- [ ] Commit candidate and tests.

### Task 5: Integration/regression gate

**Files:**
- Create: `tests/js/bbma-phase3-contract.test.mjs`
- Modify product files only if a verified regression requires a root-cause fix.

**Interfaces:**
- Validates complete shadow flow: MTF evidence -> confluence -> gate -> lifecycle/candidate.

- [ ] Add end-to-end shadow BUY and SELL contract fixtures without delivery.
- [ ] Add MIXED, INCOMPLETE, macro BLOCK, technical-health BLOCK and replay tests.
- [ ] Assert existing alert-router behavior remains untouched.
- [ ] Run `node --test tests/js/*.test.mjs`.
- [ ] Push branch and require fresh HELIX VEYRA CI/migration/safety checks on exact head SHA.
- [ ] Diagnose any RED at root cause; do not weaken safety/confluence assertions to obtain green.
- [ ] Commit contract tests/fixes.

### Task 6: Pull-request integration

**Files:**
- No product-code changes unless required by verified integration regression.

- [ ] Synchronize branch with current `main` before final PR gate.
- [ ] Open PR describing boundaries and confirming no live-delivery cutover.
- [ ] Require fresh PR-level HELIX VEYRA GREEN on exact combined head SHA.
- [ ] Review changed filenames for accidental news collector, Telegram/APK, broker or execution changes.
- [ ] Merge only after combined GREEN.
- [ ] Verify post-merge `main` CI is GREEN before starting live-shadow observation work.
