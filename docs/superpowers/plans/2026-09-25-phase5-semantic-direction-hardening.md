# Phase 5 Semantic Direction Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Phase 5 so BBMA remains the sole BUY/SELL direction authority, News/Macro remains contextual/gating only, horizon outcomes are semantically valid, and evidence is auditable as FOLLOWED/FLAT/OPPOSED/MISSING without creating execution behavior.

**Architecture:** Preserve the existing Phase-4 decision pipeline unchanged. Phase 5 validates/replays Phase-4 observations, attaches strictly post-decision outcomes, computes descriptive stratified evidence, and emits immutable reports. Refactor minified Phase-5 code into named audit-friendly functions without changing Phase-4 direction semantics.

**Tech Stack:** Node.js ESM, node:test, existing Phase-4 `macro/bbma/news-shadow-pipeline.mjs`, GitHub Actions HELIX VEYRA CI.

**Spec:** `docs/superpowers/specs/2026-09-24-bbma-shadow-replay-phase5-design.md`

## Global Constraints

- BBMA is the only authority that may originate `BUY` or `SELL`.
- News/Macro may contextualize and gate but may not create, reverse, or replace BBMA direction.
- No future/outcome field may enter Phase-4 decision generation.
- Outcomes are attached only after an observation exists.
- Missing outcomes remain missing and never count as success/failure.
- Ghost replay ids never enter coverage or directional denominators.
- No broker execution, order placement, live trading cutover, lot sizing, SL/TP generation, or evidence-to-execution conversion.
- Preserve MIXED, INCOMPLETE, stale, WATCH_ONLY, and BLOCK observations.
- Exact-head HELIX VEYRA, migration, and safety checks must be GREEN before merge.

## Review Focus

- News/Macro bullish/bearish context accidentally manufacturing or reversing BUY/SELL.
- Horizon labels accepting timestamps inconsistent with their configured duration.
- Flat outcomes being silently counted as failure or follow-through.
- Duplicate/ghost outcomes corrupting coverage or directional denominators.
- Refactoring readable functions accidentally changing Phase-4 or existing Phase-5 behavior.

---

### Task 1: Pin direction-authority semantic contract

**Files:**
- Create: `tests/js/phase5-direction-authority.test.mjs`
- Reuse unchanged: `macro/bbma/news-shadow-pipeline.mjs`
- Reuse: `macro/replay/shadow-replay.mjs`

**Interfaces:**
- Consumes: `replayShadowRecords(records)` and existing Phase-4 observation fields.
- Produces: regression contract proving Phase 5 preserves Phase-4 direction and does not synthesize direction from macro/news.

- [ ] Add fixtures covering BBMA BUY + ALLOW, BUY + BLOCK, SELL + conflicting macro context, and non-directional/mixed BBMA evidence with bullish macro context.
- [ ] Assert replay direction deep-equals the direction returned by the existing Phase-4 pipeline for the same decision input.
- [ ] Assert restrictive macro context changes only fields Phase 4 already owns such as gate/readiness/reason codes; Phase 5 itself performs no direction mutation.
- [ ] Assert a non-directional Phase-4 result cannot become BUY/SELL inside replay/evidence code.
- [ ] Run `node --test tests/js/phase5-direction-authority.test.mjs`; expected GREEN against the existing reuse-only replay architecture. Any failure is a semantic regression to diagnose, not a reason to rewrite Phase 4.
- [ ] Commit `test: pin phase5 direction authority boundary`.

### Task 2: Introduce explicit horizon semantics

**Files:**
- Create: `macro/replay/horizon.mjs`
- Create: `tests/js/horizon.test.mjs`
- Modify: `macro/replay/outcome-ledger.mjs`
- Modify: `tests/js/phase5-replay-safety.test.mjs`

**Interfaces:**
- Produces: `parseHorizon(horizon)` -> frozen `{ label, duration_ms }` for supported forms `15m`, `30m`, `1h`, `4h`, `1d`.
- Produces: `assertOutcomeMatchesHorizon({ observed_utc, outcome_utc, horizon, tolerance_ms = 0 })` -> horizon metadata or throws.
- `createOutcomeLedger(observations, options?)` uses the validator before storing an outcome.

- [ ] Write tests proving supported horizon labels map deterministically to milliseconds and malformed/zero/negative/unknown labels are rejected.
- [ ] Write tests proving `15m` requires an outcome timestamp exactly 15 minutes after observation under the default zero-tolerance policy.
- [ ] Write tests proving an explicit non-negative `tolerance_ms` permits only timestamps within that tolerance and cannot be supplied through outcome data itself.
- [ ] Run focused tests and confirm RED because `horizon.mjs` is absent.
- [ ] Implement strict parsing and timestamp validation with no wall-clock reads.
- [ ] Integrate validation into `createOutcomeLedger`; retain existing unknown-id, finite-price, MFE/MAE, and identity-conflict checks.
- [ ] Run `node --test tests/js/horizon.test.mjs tests/js/phase5-replay-safety.test.mjs`; expected GREEN.
- [ ] Commit `feat: validate phase5 outcome horizons`.

### Task 3: Make directional outcome classification explicit

**Files:**
- Create: `macro/replay/directional-outcome.mjs`
- Create: `tests/js/directional-outcome.test.mjs`
- Modify: `macro/replay/evidence-metrics.mjs`
- Modify: `tests/js/evidence-metrics.test.mjs`

**Interfaces:**
- Produces: `classifyDirectionalOutcome({ direction, entry_price, forward_price })` -> `FOLLOWED`, `FLAT`, `OPPOSED`, or `null` for non-directional/invalid data.
- Evidence metrics expose `directional_outcome.BUY|SELL.{valid,FOLLOWED,FLAT,OPPOSED}` while retaining the existing compatibility `directional_follow_through` field until a later separately reviewed removal.

- [ ] Write tests for BUY higher/equal/lower and SELL lower/equal/higher.
- [ ] Assert NONE/MIXED/INCOMPLETE directions and non-finite prices return `null` and never enter BUY/SELL denominators.
- [ ] Run focused tests and confirm RED because classifier is absent.
- [ ] Implement the pure classifier with no macro/news inputs.
- [ ] Update evidence metrics to classify only outcomes whose replay id exists in the observation ledger.
- [ ] Preserve compatibility counts while adding explicit FOLLOWED/FLAT/OPPOSED buckets.
- [ ] Assert ghost ids, missing outcomes, and non-directional observations do not change directional valid counts.
- [ ] Run `node --test tests/js/directional-outcome.test.mjs tests/js/evidence-metrics.test.mjs`; expected GREEN.
- [ ] Commit `feat: classify phase5 directional outcomes`.

### Task 4: Restructure evidence metrics for codeview/auditability

**Files:**
- Modify: `macro/replay/evidence-metrics.mjs`
- Modify: `tests/js/evidence-metrics.test.mjs`

**Interfaces:**
- Internal named functions: `buildObservationIndex`, `collectObservationDistributions`, `collectConfiguredHorizons`, `filterKnownOutcomes`, `computeCoverageByHorizon`, `computeDirectionalOutcomes`.
- Public signature remains `computeEvidenceMetrics({ ledger, outcomes = [], horizons = [] })`.

- [ ] Add a deep-equality regression fixture capturing current direction/readiness/gate/strata/lifecycle/reason/coverage outputs plus the new directional outcome buckets.
- [ ] Reformat and split the one-line implementation into named single-responsibility helpers.
- [ ] Keep `direction × gate × readiness` keys stable.
- [ ] Ensure coverage uses unique known replay ids per horizon and remains `{eligible, covered, missing}`.
- [ ] Run `node --test tests/js/evidence-metrics.test.mjs`; expected GREEN with deep-equal semantic output.
- [ ] Commit `refactor: make phase5 evidence metrics auditable`.

### Task 5: Restructure evidence report and strengthen warnings

**Files:**
- Modify: `macro/replay/evidence-report.mjs`
- Modify: `tests/js/evidence-report.test.mjs`

**Interfaces:**
- Internal named functions: `collectReplayRange`, `collectKnownCoveredObservationIds`, `buildCoverageWarnings`, `collectTraceability`.
- Public signature remains `composeEvidenceReport({ ledger, metrics, outcomes = [] })`.

- [ ] Add tests for empty observations, complete multi-horizon coverage, incomplete one-horizon coverage, ghost outcomes, and multiple horizons for one replay id.
- [ ] Assert `outcome_covered_observations` counts unique known replay ids, not outcome rows.
- [ ] Assert `INCOMPLETE_OUTCOME_COVERAGE` remains present whenever any configured horizon has missing observations.
- [ ] Refactor the one-line report composer into named helpers without changing report kind, sample size, replay range, replay ids, source refs, metrics, or immutability.
- [ ] Run `node --test tests/js/evidence-report.test.mjs`; expected GREEN.
- [ ] Commit `refactor: make phase5 evidence report auditable`.

### Task 6: Add macro-context strata without granting macro direction authority

**Files:**
- Modify: `macro/replay/evidence-metrics.mjs`
- Modify: `tests/js/evidence-metrics.test.mjs`

**Interfaces:**
- Add descriptive `macro_reason_codes` and, only when an observation already exposes a stable macro regime field, `macro_regime` and `macro_strata`.
- `macro_strata` is descriptive only and cannot feed back into direction generation.

- [ ] Inspect actual Phase-4 observation schema and identify the stable existing macro regime/context field; do not invent a second macro classifier.
- [ ] Add tests from real observation-shaped fixtures for macro reason/event distribution.
- [ ] If a stable macro regime field exists, add `direction|gate|readiness|macro_regime` strata; if absent, record the ruling in the implementation ledger and limit this task to reason/event distributions.
- [ ] Assert macro fields are read-only inputs to metrics and no helper returns or mutates `direction`.
- [ ] Run focused evidence tests; expected GREEN.
- [ ] Commit `feat: expose descriptive phase5 macro strata`.

### Task 7: End-to-end semantic safety contract

**Files:**
- Modify: `tests/js/phase5-replay-safety.test.mjs`
- Create or modify: `tests/js/bbma-news-shadow-phase5-contract.test.mjs`

**Interfaces:**
- Exercises the real Phase-4 pipeline -> replay -> observation ledger -> outcome ledger -> metrics -> report chain.

- [ ] Build chronological fixtures for BUY/SELL, ALLOW/WATCH_ONLY/BLOCK, stale, MIXED/INCOMPLETE, reversal, and non-directional bullish-news context.
- [ ] Assert no future/outcome field reaches Phase 4.
- [ ] Assert News/Macro never manufactures BUY/SELL in Phase 5.
- [ ] Attach exact semantic horizons to a subset only; assert uncovered records remain missing.
- [ ] Assert FOLLOWED/FLAT/OPPOSED totals reconcile exactly with directional valid counts.
- [ ] Assert ghost ids do not affect coverage, directional outcomes, or covered-observation counts.
- [ ] Assert identical fixture sets produce deep-equal immutable reports.
- [ ] Scan Phase-5 imports/source for broker/order/position-sizing/SL/TP/live-router dependencies and fail the contract if introduced.
- [ ] Run `node --test tests/js/*.test.mjs`; expected all JS tests GREEN.
- [ ] Commit `test: harden phase5 semantic safety contract`.

### Task 8: Exact-head repository verification

**Files:**
- Product changes only for root-cause defects discovered by verification.

**Interfaces:**
- Consumes the completed Phase-5 branch head.
- Produces CI evidence for the exact SHA; no merge in this task.

- [ ] Compare `main...feature/bbma-news-shadow-phase5` and confirm changes remain replay/evidence/tests/docs only.
- [ ] Run/require full JS suite plus HELIX VEYRA, migration, and safety workflows on the exact branch head.
- [ ] Verify no broker execution, News-to-direction generation, live cutover, lot sizing, or SL/TP path exists in the Phase-5 diff.
- [ ] If RED, diagnose root cause and add a failing regression test before any production fix; never weaken semantic assertions to obtain GREEN.
- [ ] Record exact verified SHA and workflow results in PR #12.
- [ ] Do not merge until exact-head GREEN.
