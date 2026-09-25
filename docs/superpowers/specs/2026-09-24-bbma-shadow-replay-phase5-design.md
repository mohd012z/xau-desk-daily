# BBMA + News Shadow Replay & Evidence Phase 5 — Design

Date: 2026-09-25
Status: Approved architecture — hardening revision
Parent: Phase 4 BBMA + News cross-function shadow pipeline

## Purpose

Validate Phase-4 shadow decisions against replayable historical/shadow observations before any production alert-policy cutover. Phase 5 measures engine behavior and evidence quality only. It does not execute trades, create a trading-performance claim, or authorize a live cutover.

## Binding Direction Boundary

The authoritative flow is:

`BBMA determines direction -> News/Macro contextualizes + gates -> Shadow observation -> Replay -> Outcome attachment -> Evidence only`

This is a semantic boundary, not merely a diagram.

### BBMA owns direction

- `BUY` and `SELL` may originate only from the existing BBMA technical pipeline.
- Phase 5 must preserve the BBMA direction received from Phase 4; it must not infer, manufacture, reverse, upgrade, or replace direction.
- If BBMA direction is absent, mixed, incomplete, or otherwise non-directional, News/Macro cannot turn it into `BUY` or `SELL`.

### News/Macro owns context and gating

News/Macro may add event context, macro regime/reason codes, data-health implications, and gate state such as `ALLOW`, `WATCH_ONLY`, or `BLOCK`. News/Macro may suppress or constrain confirmation through the existing Phase-4 gate policy, but it may not create or reverse technical direction.

Examples:

- BBMA `BUY` + macro `ALLOW` -> direction remains `BUY`; evidence records the permissive context.
- BBMA `BUY` + macro `BLOCK` -> direction remains traceable as `BUY`, but the observation is blocked; it does not become `SELL`.
- BBMA `SELL` + conflicting macro context -> direction remains `SELL`; gate/readiness may become restrictive according to Phase 4.
- BBMA `NONE/MIXED/INCOMPLETE` + bullish news -> must not become `BUY`.

## Architecture

`replay fixtures -> Phase-4 shadow pipeline -> observation ledger -> outcome attachment -> evidence metrics -> audit report`

The replay layer calls the existing Phase-4 pipeline rather than reimplementing BBMA, macro/news, data-health, confirmation-gate, or lifecycle policy.

## Replay record

Every replay input contains an explicit UTC observation timestamp, symbol, Phase-2/3 BBMA evidence input, event records, event policy, health input, and current lifecycle signal. Inputs are immutable and ordered by UTC plus stable record id. No wall-clock reads are allowed.

Future/outcome fields are forbidden anywhere in decision input. The replay output retains the complete Phase-4 shadow observation plus deterministic replay id and source/reference metadata. Identical inputs must produce deep-equal decision content.

## Observation ledger

The ledger is append-oriented and deduplicates only exact replay identities. It must not merge observations merely because they share direction or timestamp. Direction reversals, gate changes, lifecycle transitions, readiness changes, and reason-code changes remain distinct auditable records.

A reused replay id with different content is an identity conflict, not a duplicate.

## Outcome attachment

Outcomes are attached only after an observation exists and remain separate from the decision to prevent look-ahead leakage.

Configured horizons must have explicit semantics. A horizon such as `15m` or `1h` is not an arbitrary label: outcome time must correspond to the configured duration from `observed_utc`, subject only to an explicitly documented tolerance policy if market-data timestamps require one.

Outcome identity is `replay_id + horizon`. An existing identity cannot be silently overwritten with different prices or timestamps.

## Directional outcome semantics

Directional follow-through is descriptive evidence, not a trading signal or profitability claim.

For a valid outcome:

- BBMA `BUY`: `forward_price > entry_price` -> `FOLLOWED`; equality -> `FLAT`; lower -> `OPPOSED`.
- BBMA `SELL`: `forward_price < entry_price` -> `FOLLOWED`; equality -> `FLAT`; higher -> `OPPOSED`.
- Non-directional observations do not enter BUY/SELL directional outcome denominators.
- Missing or invalid outcomes remain `MISSING` and never become `FOLLOWED`, `FLAT`, or `OPPOSED`.

## Evidence metrics

Metrics are descriptive and stratified. At minimum report:

- observation count and exact duplicate count;
- lifecycle action/state distribution;
- gate distribution (`ALLOW`, `WATCH_ONLY`, `BLOCK`);
- BBMA direction/readiness distribution;
- cross-strata `direction × gate × readiness`;
- macro reason/event distribution and, where available, macro-regime strata;
- direction-reversal and invalidation-recommendation counts;
- stale/unsafe/incomplete/mixed-data counts;
- outcome coverage per horizon as `eligible / covered / missing`;
- directional outcome counts as `FOLLOWED / FLAT / OPPOSED` only for valid attached outcomes.

Ghost/unknown replay ids must not enter coverage, directional denominators, or report-level covered-observation counts.

## Evidence report

The report exposes sample size, replay range, replay ids, source references, coverage by horizon, warnings, and descriptive metrics. If any configured horizon is incomplete, the report retains `INCOMPLETE_OUTCOME_COVERAGE`.

Aggregate evidence must remain traceable to raw replay observations. The report must not hide missing coverage behind a combined success percentage.

## No arbitrary production score

Phase 5 does not create an opaque confidence/win-rate score, automatic production threshold, or recommendation to execute a trade. Sample size, coverage, direction, gate, readiness, and relevant regime strata remain visible.

## Prohibited capabilities

The following are outside Phase 5 and must remain absent:

- broker execution or order placement;
- automatic BUY/SELL creation from News/Macro;
- live alert-router or production trading cutover;
- autonomous position sizing or lot sizing;
- SL/TP generation;
- code paths that convert evidence metrics into execution instructions.

## Verification

Test-first verification must cover deterministic replay, chronological ordering, exact duplicate handling, identity conflicts, same-time-different-evidence preservation, nested future-field rejection, outcome separation/no-look-ahead, strict horizon semantics, missing outcomes, ghost ids, BUY/SELL preservation, News/Macro non-direction authority, gate/lifecycle distributions, cross-strata, `FOLLOWED/FLAT/OPPOSED`, stale/incomplete/mixed classifications, immutable reports, and absence of delivery/execution side effects.

Repository HELIX VEYRA, migration, and safety checks must be green on the exact PR head before merge.