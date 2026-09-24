# BBMA + News Shadow Replay & Evidence Phase 5 — Design

Date: 2026-09-24
Status: Proposed for review
Parent: Phase 4 BBMA + News cross-function shadow pipeline

## Purpose

Validate the behavior of the Phase-4 shadow engine against replayable historical/shadow observations before any production alert-policy cutover. Phase 5 measures decision quality and engine behavior; it does not create a trading-performance claim and does not execute trades.

## Architecture

`replay fixtures -> Phase-4 shadow pipeline -> observation ledger -> outcome attachment -> evidence metrics -> audit report`

The replay layer must call the existing Phase-4 pipeline rather than reimplement BBMA, macro/news, data-health, confirmation-gate, or lifecycle policy.

## Replay record

Every replay input contains an explicit UTC observation timestamp, symbol, Phase-2/3 BBMA evidence input, event records, event policy, health input and current lifecycle signal. Inputs are immutable and ordered by UTC plus a stable record id. No wall-clock reads are allowed.

The replay output retains the complete Phase-4 shadow observation plus a deterministic replay id and source/reference metadata. Replaying identical inputs must produce deep-equal decision content.

## Observation ledger

The ledger is append-oriented and deduplicates only exact replay identities. It must not merge observations merely because they have the same direction or timestamp. Direction reversals, gate changes, lifecycle transitions and reason-code changes remain distinct auditable records.

Duplicate detection uses stable explicit identity fields rather than object serialization order or current time.

## Outcome attachment

Outcomes are attached after an observation and remain separate from the decision itself to prevent look-ahead leakage. Phase 5 supports explicit caller-supplied forward observations such as price at configured horizons and maximum favorable/adverse excursion values when available.

The engine never reads future prices while producing the original shadow decision. Outcome data may only be consumed by the evaluation layer after the observation exists.

## Evidence metrics

Metrics are descriptive and stratified. At minimum report:
- observation count and exact duplicate count;
- lifecycle action/state distribution;
- gate distribution (`ALLOW`, `WATCH_ONLY`, `BLOCK`);
- BBMA direction/readiness distribution;
- macro reason/event distribution;
- direction-reversal and invalidation-recommendation counts;
- stale/unsafe/incomplete/mixed-data counts;
- outcome coverage by evaluation horizon;
- directional follow-through statistics only for observations with valid attached outcomes.

Metrics must separate BUY and SELL, readiness/state, gate state, and relevant macro regime where sample size permits. Missing outcomes are reported as missing, never treated as wins/losses.

## No arbitrary production score

Phase 5 does not create a single opaque confidence/win-rate score or automatic threshold for live alerts. Sample size, coverage and regime stratification must remain visible. Any later production threshold requires a separately reviewed policy based on accumulated evidence.

## Safety / leakage controls

- No future/outcome fields are passed into Phase-4 decision generation.
- No Telegram/APK/broker/live alert-router cutover.
- No autonomous position sizing, SL/TP, or order execution.
- `MIXED`, `INCOMPLETE`, stale and blocked decisions remain represented rather than filtered from the denominator.
- Exact reason codes and source references remain available for replay/audit.

## Verification

Test-first coverage includes deterministic replay, chronological ordering, exact duplicate handling, same-time-different-evidence preservation, outcome separation/no-look-ahead, missing outcomes, BUY/SELL stratification, gate/lifecycle distributions, reversal/invalidation counts, stale/incomplete/mixed classifications, and immutable reports. Repository HELIX VEYRA, migration and safety checks must remain green before merge.
