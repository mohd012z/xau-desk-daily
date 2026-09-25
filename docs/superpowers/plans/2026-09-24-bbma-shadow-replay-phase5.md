# BBMA + News Shadow Replay & Evidence Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic replay/evaluation layer around the validated Phase-4 BBMA+News shadow engine so decision behavior can be measured without look-ahead leakage or live alert/execution cutover.

**Architecture:** Replay explicit chronological fixtures through the existing Phase-4 pipeline, store immutable/deduplicated observations in an append-oriented ledger, attach future outcomes only after decisions exist, then compute stratified descriptive evidence metrics and an auditable report. Phase-5 evaluation never reimplements BBMA, macro/news, data-health, gate or lifecycle logic.

**Tech Stack:** Node.js ESM, `node:test`, existing Phase-4 `macro/bbma/news-shadow-pipeline.mjs`, GitHub Actions HELIX VEYRA CI.

**Spec:** `docs/superpowers/specs/2026-09-24-bbma-shadow-replay-phase5-design.md`

## Global Constraints

- No future/outcome field may be passed into Phase-4 decision generation.
- No hidden wall-clock reads; all UTC times are explicit inputs.
- Replay identical explicit inputs deterministically.
- Exact duplicate identity is stable and explicit; same timestamp/direction with different evidence remains distinct.
- Missing outcomes remain missing and never count as wins/losses.
- Preserve MIXED, INCOMPLETE, stale, WATCH_ONLY and BLOCK observations in evaluation populations.
- No single opaque confidence/win-rate production score or automatic live threshold.
- No Telegram/APK live delivery, alert-router cutover, broker execution, position sizing, SL/TP generation or autonomous trade action.

## Review Focus

- Future-price leakage into decision generation.
- Duplicate identity accidentally collapsing distinct evidence/gate/lifecycle states.
- Missing outcomes silently changing denominators.
- Aggregate statistics hiding BUY/SELL, gate or macro-regime differences.
- Replay ordering depending on object insertion order or wall clock.

---

### Task 1: Deterministic replay identity and fixture validation

**Files:**
- Create: `macro/replay/replay-record.mjs`
- Create: `tests/js/replay-record.test.mjs`

- [ ] Write failing tests for required stable `record_id`, valid explicit UTC, symbol, Phase-4 decision inputs, and source references.
- [ ] Prove outcome/future-price fields are rejected from decision-input payload.
- [ ] Prove identical normalized inputs yield identical replay identity/content.
- [ ] Prove same timestamp with different evidence remains distinguishable through explicit record ids.
- [ ] Run focused test and confirm RED because implementation is absent.
- [ ] Implement minimal immutable validation/normalization.
- [ ] Run focused and full JS tests; expect GREEN.
- [ ] Commit.

### Task 2: Chronological Phase-4 replay runner

**Files:**
- Create: `macro/replay/shadow-replay.mjs`
- Create: `tests/js/shadow-replay.test.mjs`
- Reuse unchanged: `macro/bbma/news-shadow-pipeline.mjs`

- [ ] Write failing tests that unordered fixtures execute by `observedUtc`, then stable `record_id` tie-break.
- [ ] Verify the runner invokes Phase-4 using decision inputs only.
- [ ] Verify BUY/SELL, WATCH_ONLY/BLOCK and direction-reversal observations are retained rather than filtered.
- [ ] Verify replayed outputs include deterministic replay id/source refs.
- [ ] Implement minimal runner with no network or wall-clock calls.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 3: Append-oriented observation ledger and exact dedupe

**Files:**
- Create: `macro/replay/observation-ledger.mjs`
- Create: `tests/js/observation-ledger.test.mjs`

- [ ] Write failing tests for append, exact duplicate rejection/counting, stable chronological readout and immutable snapshots.
- [ ] Prove same UTC/direction with changed evidence, gate, lifecycle action or reason codes is preserved as a distinct record.
- [ ] Prove direction reversal records remain distinct.
- [ ] Implement explicit identity-based dedupe only; do not use current time or JSON property order as identity.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 4: Outcome attachment with no-look-ahead boundary

**Files:**
- Create: `macro/replay/outcome-ledger.mjs`
- Create: `tests/js/outcome-ledger.test.mjs`

- [ ] Write failing tests attaching caller-supplied forward price/outcome data only to an existing replay observation id.
- [ ] Support explicit evaluation horizons and optional MFE/MAE fields when supplied.
- [ ] Reject outcome timestamps at/before the original observation time for forward horizons.
- [ ] Verify outcomes never mutate the original shadow observation.
- [ ] Verify missing outcomes are represented as missing coverage.
- [ ] Implement immutable outcome attachment/storage.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 5: Stratified descriptive evidence metrics

**Files:**
- Create: `macro/replay/evidence-metrics.mjs`
- Create: `tests/js/evidence-metrics.test.mjs`

- [ ] Write failing tests for total observations, exact duplicate count, lifecycle state/action distribution, gate distribution and BBMA direction/readiness distribution.
- [ ] Add macro reason/event, direction-reversal/invalidation, stale/unsafe/incomplete/mixed counts.
- [ ] Add outcome coverage by horizon and directional follow-through only where valid outcomes exist.
- [ ] Prove missing outcomes do not enter success/failure denominators.
- [ ] Prove BUY and SELL remain separately reportable; include gate/macro/readiness strata where sample exists.
- [ ] Do not emit a single opaque confidence/live-readiness score.
- [ ] Implement deterministic immutable metrics.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 6: Auditable Phase-5 evidence report

**Files:**
- Create: `macro/replay/evidence-report.mjs`
- Create: `tests/js/evidence-report.test.mjs`

- [ ] Write failing tests for report metadata, replay range, sample size, coverage, strata, reason distributions and source references.
- [ ] Include explicit warnings when sample/outcome coverage is incomplete rather than fabricating conclusions.
- [ ] Preserve replay/observation ids needed to drill from aggregate metrics back to raw evidence.
- [ ] Verify report is immutable and deterministic for identical ledger/outcome inputs.
- [ ] Implement minimal report composer.
- [ ] Run focused/full JS suites; expect GREEN.
- [ ] Commit.

### Task 7: End-to-end Phase-5 contract and leakage tests

**Files:**
- Create: `tests/js/bbma-news-shadow-phase5-contract.test.mjs`

- [ ] Build replay fixtures covering BUY/SELL ALLOW, WATCH_ONLY, BLOCK, stale data, MIXED/INCOMPLETE and direction reversal.
- [ ] Replay them through the real Phase-4 pipeline and ledger.
- [ ] Attach only post-decision outcomes to a subset of records.
- [ ] Assert missing outcome coverage remains explicit.
- [ ] Assert no future/outcome fields are visible to Phase-4 decision generation.
- [ ] Assert no Telegram/APK/broker/live alert-router side effects/imports are introduced.
- [ ] Assert identical fixture set replays to deep-equal evidence report.
- [ ] Run `node --test tests/js/*.test.mjs`; expect GREEN.
- [ ] Commit.

### Task 8: Repository regression and safety gate

**Files:**
- Modify product files only for verified root-cause defects.

- [ ] Run complete JS test suite.
- [ ] Push exact head and require HELIX VEYRA/migration/safety checks.
- [ ] Compare branch against validated `main`; verify changes remain replay/evaluation-only plus tests/docs.
- [ ] Review for hidden wall-clock, network fetch, delivery or execution imports.
- [ ] Diagnose RED at root cause; never weaken leakage/dedupe/coverage assertions merely to obtain green.
- [ ] Commit verified fixes only.

### Task 9: Pull-request integration

- [ ] Synchronize with latest validated `main` before final PR gate.
- [ ] Open PR documenting no-look-ahead and shadow-only boundaries.
- [ ] Require fresh PR-level HELIX VEYRA + migration/safety GREEN on exact combined head SHA.
- [ ] Deep-review changed files for leakage, denominator errors, identity collapse and side effects.
- [ ] Merge only after exact-head GREEN.
- [ ] Verify post-merge `main` CI GREEN before defining any production alert threshold or live-shadow scheduling policy.
