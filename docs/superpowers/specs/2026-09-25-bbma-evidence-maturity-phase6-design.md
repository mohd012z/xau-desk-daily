# BBMA + News Evidence Maturity Phase 6 — Design

Date: 2026-09-25
Status: Proposed for review
Parent: Phase 5 replay/evidence layer merged to main at `b0e1c4b15f76e85218882d3c839b950b70705092`

## Purpose

Phase 6 determines whether accumulated BBMA + News shadow evidence is sufficiently broad, fresh, and representative to support later policy decisions. It does not authorize live alerts or broker execution. The goal is evidence maturity, not an opaque trading score.

## Direction authority

BBMA remains the only technical direction authority. News/macro, volatility, spread, session and data-health regimes may segment, contextualize or gate evidence; they must never manufacture or reverse BUY/SELL direction.

## Architecture

`Phase-5 evidence report + replay observations + outcomes -> regime classifier -> maturity matrix -> coverage/gap analysis -> promotion-readiness evidence report`

The Phase-6 layer consumes existing immutable evidence. It must not mutate Phase-4 decisions, replay outcomes, or lifecycle history.

## Regime dimensions

Evidence should be segmented across dimensions that materially affect XAU behavior when the required source data exists:

- BBMA direction: BUY / SELL / neutral or non-directional evidence.
- BBMA readiness/lifecycle state.
- MTF confluence pattern and conflict state.
- Macro gate: ALLOW / WATCH_ONLY / BLOCK.
- Event class: central-bank/rate, inflation, employment, growth/activity, geopolitical/other when explicitly classified.
- Event proximity: pre-window, event-window, post-window, outside.
- Session: Asia, London, New York, overlap; derived deterministically from explicit UTC timestamps.
- Spread regime: normal / elevated / extreme using explicit policy thresholds and available spread observations.
- Volatility regime: low / normal / high using an explicit versioned input/policy; no hidden adaptive threshold.
- Data-health regime: healthy / stale / incomplete / mixed / unsafe.

Unknown or unavailable regime inputs remain UNKNOWN and are counted. They are never silently dropped.

## Maturity matrix

For every supported stratum, report:

- eligible observation count;
- observations with valid outcomes by horizon;
- missing outcome count;
- BUY/SELL representation;
- time-span coverage and most recent evidence timestamp;
- event/session/regime representation;
- lifecycle/gate representation;
- invalidation/reversal counts;
- reason-code distribution.

Sparse cells remain visible. Phase 6 must not fill missing cells through interpolation or synthetic observations.

## Sample sufficiency

Phase 6 may evaluate explicit, versioned minimum-evidence policies, but must expose the policy and underlying counts. A stratum can be labelled `INSUFFICIENT`, `PARTIAL`, or `SUFFICIENT` only relative to that declared policy.

No universal win-rate threshold, confidence score, or automatic live-trading recommendation is permitted. A later production policy must be separately reviewed.

Minimum-evidence policy can include:

- minimum observations per stratum;
- minimum valid outcomes per evaluation horizon;
- minimum BUY and SELL representation where both are applicable;
- minimum number of distinct trading dates;
- maximum evidence age;
- required event/session coverage.

## Freshness and drift

Evidence maturity must distinguish quantity from freshness. Large historical samples cannot hide stale evidence. Reports include oldest/latest observation, distinct-date coverage, evidence age relative to an explicit `asOfUtc`, and optional recent-vs-prior distribution comparisons.

Any drift indicator is descriptive. It does not automatically change BBMA rules or thresholds.

## Promotion-readiness evidence

The report may state whether each declared evidence requirement is met. It must provide unmet requirements and exact supporting counts. This is evidence readiness only; it is not permission to enable live alert routing, Telegram/APK cutover, or broker execution.

## Determinism and auditability

- `asOfUtc` is explicit; no wall-clock reads.
- Regime thresholds/policies are explicit and versioned.
- Identical Phase-5 inputs + identical policy produce deep-equal Phase-6 output.
- Every aggregate can be traced to replay IDs and source references.
- Unknown/missing data is represented explicitly.

## Safety boundaries

NO broker execution.
NO order placement.
NO lot sizing.
NO SL/TP generation.
NO automatic BUY/SELL generation from news/macro.
NO live Telegram/APK/alert-router cutover.
NO outcome leakage into original decisions.
NO automatic BBMA rule mutation based on replay results.

## Verification

Tests must cover deterministic session classification, unknown regimes, explicit spread/volatility thresholds, sparse strata, BUY/SELL representation, per-horizon outcome coverage, stale evidence, distinct-date requirements, event-class coverage, policy-version traceability, replay-ID drill-down, and deep-equal deterministic reports.
