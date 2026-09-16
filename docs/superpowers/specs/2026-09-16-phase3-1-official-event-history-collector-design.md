# Phase 3.1 Official Event History Collector — Design

Date: 2026-09-16
Status: Design approved in chat; written spec pending user review
Branch: `feature/phase3.1-official-history-collector`

## 1. Purpose

Phase 3.1 adds an official-first, fail-closed historical event collection pipeline to MACRO//DESK. Its purpose is to replace the current intentionally empty `data/event-history.json` with verified, auditable event-reaction samples collected over time from official release sources and aligned market data.

The collector must preserve the analytical-only product model already used in Phase 3. It may expose historical distributions, observed reaction, volatility, confidence, Pivot references, and confluence/hold states. It must not create automatic order-placement fields or convert analytical references into execution instructions.

## 2. Goals

1. Discover and normalize official U.S. macro events from government and Federal Reserve sources.
2. Preserve authoritative event timestamps in UTC while displaying Malaysia time using `Asia/Kuala_Lumpur`.
3. Capture deterministic pre-event and post-event M1 market windows for supported instruments.
4. Append only verified reaction samples to `data/event-history.json`.
5. Quarantine incomplete, conflicting, or unverifiable samples rather than inventing or interpolating data.
6. Reuse the existing Phase 3 historical model, anti-leakage controls, similarity/recency weighting, weighted distributions, confidence engine, and Classic Pivot confluence logic.
7. Keep provenance and collection health visible in the UI.
8. Preserve crash recovery, duplicate prevention, and auditability across scheduled GitHub Actions runs.

## 3. Non-goals

Phase 3.1 will not:

- add a third-party economic-calendar provider;
- fabricate market-consensus values;
- infer a consensus value from unofficial commentary;
- require a continuously running server;
- use sub-minute +10s/+30s observations as a baseline requirement;
- silently combine unrelated event categories to increase sample count;
- interpolate missing market bars;
- change a market-data provider's daily candle boundary to MYT;
- remove or weaken existing Phase 3 quality, anti-leakage, or hold controls.

## 4. High-level architecture

```text
BLS / DOL / Federal Reserve / BEA-ready adapter boundary
        ↓
Official-source adapters
        ↓
Event normalizer
        ↓
Verified event catalog
        ↓
Release verification
        ↓
Market-window collector
        ↓
PRE / +1m / +5m / +15m
        ↓
Validation + anti-leakage
        ↓
Eligible / Quarantined
        ↓
Event history
        ↓
Similarity + recency weighting
        ↓
Weighted reaction distributions
        ↓
ADVANCE / NOWCAST
        ↓
Classic Pivot confluence / hold state
        ↓
MYT Trade Plan + append-only revision ledger
```

The architecture deliberately separates event facts from reaction samples. Official event metadata is stored once in an event catalog. Per-symbol/per-window reactions are stored in event history and linked by stable `eventId`.

## 5. Official source scope

The first implementation covers:

| Event family | Primary official source | Initial fields |
| --- | --- | --- |
| CPI | BLS | release identity, reference period, official timestamp, headline/core values where reliably available |
| PPI | BLS | release identity, reference period, official timestamp, official release values where reliably available |
| Employment Situation / NFP | BLS | payroll change, unemployment rate, average hourly earnings where reliably available |
| Initial Jobless Claims | U.S. DOL / ETA | initial claims, revised prior, four-week average where reliably available |
| FOMC decisions/statements | Federal Reserve | scheduled/released time, statement URL, meeting identity, statement/SEP/press-conference flags |
| Federal Reserve speeches | Federal Reserve | speaker, role, title, scheduled/released time where supplied, official URL |

BEA is included only as an adapter boundary so GDP/PCE and similar official releases can be added later without restructuring the pipeline. Phase 3.1 does not require BEA event families for its first production release.

## 6. Time handling

Official U.S. release schedules are normalized through `America/New_York`, not through a hard-coded UTC offset. This protects the pipeline across EST/EDT transitions.

Canonical path:

```text
official local timestamp
        ↓
America/New_York
        ↓
UTC canonical timestamp
        ↓
Asia/Kuala_Lumpur display
```

UTC remains the storage and comparison basis. MYT is presentation only.

For market data, the provider's own candle boundary must be preserved and recorded. A D1 Pivot source is therefore represented as the provider's previous completed D1 candle, with its provider, timeframe, candle-open UTC, candle-close UTC, and boundary metadata retained.

## 7. Canonical event catalog

Add:

`data/event-catalog.json`

Top-level shape:

```json
{
  "schemaVersion": "1.0",
  "generatedAt": null,
  "events": []
}
```

Illustrative canonical event object:

```json
{
  "eventId": "BLS-CPI-2026-08",
  "eventType": "CPI",
  "agency": "BLS",
  "referencePeriod": "2026-08",
  "scheduledAtUtc": "2026-09-15T12:30:00Z",
  "releasedAtUtc": null,
  "timeSource": "OFFICIAL_RELEASE_CALENDAR",
  "timeConfidence": "HIGH",
  "actual": {},
  "previous": {},
  "consensus": null,
  "sourceUrl": null,
  "sourceQuality": "OFFICIAL",
  "status": "SCHEDULED",
  "scheduleRevisions": []
}
```

The date is illustrative rather than a claim about a specific CPI release. `sourceUrl` may be null while an event is only scheduled, but it must be populated with an official URL before the event can reach `EVENT_VERIFIED` and become eligible to create history samples.

### Consensus handling

Official-only Phase 3.1 does not claim a private-market consensus when the official agency does not publish one. Therefore:

- `consensus` remains `null` unless an explicitly verified source is added later;
- `surpriseZ` remains `null` when no verified consensus distribution exists;
- the model may still learn historical direction, range, volatility, reversal, continuation, and cross-asset behavior from verified events.

## 8. Event lifecycle

Each canonical event progresses through explicit states:

```text
SCHEDULED
  ↓
OFFICIAL_RELEASE_SEEN
  ↓
EVENT_VERIFIED
  ↓
WAITING_FOR_MARKET_WINDOWS
  ↓
MARKET_DATA_COMPLETE
  ↓
PUBLISHED
```

Any unresolved problem moves the record to `QUARANTINED` with a machine-readable reason.

Required quarantine reasons include:

- `TIME_MISMATCH`
- `OFFICIAL_PAGE_UNAVAILABLE`
- `MISSING_PRE_EVENT_BAR`
- `MISSING_MARKET_WINDOW`
- `DUPLICATE_EVENT`
- `PRICE_GAP`
- `SOURCE_CHANGED`
- `CONFLICTING_MARKET_DATA`
- `INVALID_EVENT_TIME`
- `INVALID_MARKET_TIMESTAMP`

Quarantined records remain auditable but are excluded from model eligibility.

## 9. Scheduled workflows

Phase 3.1 uses two new GitHub Actions workflows.

### 9.1 Event catalog workflow

Path:

`.github/workflows/event-catalog.yml`

Schedule:

- every six hours;
- `workflow_dispatch` for manual recovery/testing.

Responsibilities:

1. fetch official release schedules and release pages;
2. normalize source-specific records;
3. create stable event IDs;
4. detect new, changed, or unchanged schedule entries;
5. preserve schedule revisions;
6. validate the candidate catalog;
7. write `data/event-catalog.json` only when content changes.

### 9.2 Event window collector workflow

Path:

`.github/workflows/event-window-collector.yml`

Schedule:

- every five minutes;
- `workflow_dispatch` for manual recovery/testing.

Responsibilities:

1. load the verified event catalog;
2. select events at or after release time and within the recovery horizon;
3. collect required market bars;
4. validate PRE/+1m/+5m/+15m observations;
5. update operational state;
6. append/update verified history samples;
7. quarantine invalid or unrecoverable samples;
8. validate generated JSON before commit.

GitHub Actions execution may be delayed relative to its nominal schedule. Correctness therefore depends on event timestamps and historical M1 bars, not on the workflow starting at the exact release minute.

### 9.3 Recovery horizon

The collector uses a 48-hour recovery horizon. Events are retried during that window if market bars or source pages are temporarily unavailable. After the recovery horizon, unresolved observations are quarantined rather than fabricated.

## 10. Deterministic market-window semantics

For an event at canonical time `T`:

### PRE

`PRE` is the last fully completed M1 candle ending at or before `T`.

For an event at exactly `12:30:00Z`, the `12:29:00–12:29:59` candle is the PRE candle. The 12:30 M1 candle must never be used as a pre-event reference because it contains post-release information.

### Reaction windows

Primary windows:

- `+1m`
- `+5m`
- `+15m`

Every window uses the same PRE reference. This preserves initial spike, continuation, and reversal information.

Each sample records:

- PRE price;
- target-window after price;
- maximum high between event time and target window;
- minimum low between event time and target window;
- actual price timestamp;
- window start/end UTC timestamps;
- provider provenance.

Phase 3.1 does not require +10s/+30s observations. Those may be added later as an optional streaming/tick extension.

## 11. Supported instruments

Initial collector universe:

- `XAU/USD`
- `EUR/USD`
- `GBP/USD`
- `USD/JPY`
- `BTC/USD`
- `ETH/USD`

The event exists once in the catalog. Reaction samples are generated independently for supported instruments where valid market data exists.

## 12. Reaction units

The collector reuses Phase 3 instrument metadata.

### FX

```text
reactionPips = (after - PRE) / pipSize
```

JPY pairs use their canonical JPY pip size.

### XAU

```text
reactionUsd = after - PRE
reactionPct = ((after / PRE) - 1) × 100
```

### Digital assets

```text
reactionUsd = after - PRE
reactionPct = ((after / PRE) - 1) × 100
```

High/low excursion is retained separately so a small final close cannot hide a large event-driven intrawindow move.

## 13. Event-history sample identity

`data/event-history.json` remains the public reaction dataset.

Each reaction sample receives deterministic identity:

```text
sampleId = eventId + "|" + symbol + "|" + window
```

Example:

`BLS-CPI-2026-08|XAU/USD|+5m`

Duplicate policy:

- same `sampleId`, identical content → ignore;
- same `sampleId`, same event and demonstrably improved verified data → revise with audit metadata;
- same `sampleId`, conflicting verified market values → quarantine conflict;
- never append duplicate copies of the same sample.

## 14. Operational collector state

Add:

`data/event-history-state.json`

This is operational state, not model training data. It is stored in the repository for recovery/audit purposes but is not required to be copied into the public GitHub Pages artifact.

It tracks:

- event last-checked timestamp;
- per-symbol window completion;
- retry counters;
- quarantine state;
- last successful market-data retrieval;
- last committed dataset generation timestamp.

The model must not consume this file as historical evidence.

## 15. Retry policy

Missing data is never interpolated, copied, or guessed.

Retry progression:

1. next normal five-minute collector run;
2. +5 minutes;
3. +15 minutes;
4. +1 hour;
5. subsequent scheduled retries within the 48-hour recovery horizon.

At recovery-horizon expiry, unresolved windows become `QUARANTINED / MISSING_MARKET_WINDOW`.

## 16. Crash-safe write path

Generated data writes follow this order:

```text
read existing JSON
  ↓
validate existing JSON
  ↓
build candidate in memory
  ↓
validate candidate
  ↓
write temporary file
  ↓
re-read and validate temporary JSON
  ↓
replace target file
  ↓
git diff
  ↓
commit only if changed
```

No workflow may leave a partially written public dataset.

## 17. Concurrent writer protection

The existing XAU daily updater and the new collector both write generated files to `main`.

All generated-data writer workflows must use the shared concurrency group:

`macro-data-writers`

The existing XAU daily workflow must be migrated from its separate writer group to this shared group as part of Phase 3.1.

Every write workflow must synchronize against latest `origin/main` before push:

```text
git fetch origin main
git rebase origin/main
re-run generated-data validation
git push origin main
```

If rebase or validation fails, the workflow stops without force-pushing.

## 18. Eligibility gates

A reaction sample becomes model eligible only if all of the following are true:

- stable event ID is verified;
- official event timestamp is verified;
- official source URL is present;
- instrument is recognized;
- PRE M1 bar exists and is completed before event release;
- target market window exists;
- price timestamps are ordered correctly;
- price values are finite and positive;
- event/source provenance exists;
- market/provider provenance exists;
- anti-leakage checks pass;
- duplicate/conflict checks pass;
- sample is not quarantined.

Ineligible samples receive zero model weight.

## 19. Model-support bands

Model-support labels are descriptive data sufficiency states, not probabilities of future outcomes.

| Effective eligible sample | Support state | Allowed analytical output |
| ---: | --- | --- |
| 0–4 | `INSUFFICIENT_DATA` | official event facts and Pivot context only |
| 5–9 | `EARLY_HISTORY` | descriptive historical examples; Pivot confluence remains held |
| 10–19 | `LIMITED` | median and broad reaction range with strong limitation label |
| 20–39 | `DEVELOPING` | weighted percentile bands, directional frequency, Pivot overlap |
| 40–59 | `ESTABLISHED` | similarity/recency-weighted distribution and regime context |
| 60+ | `MATURE_HISTORY` | full historical model, still subject to quality and regime gates |

Raw historical count and effective sample size must both remain visible. Effective sample size is the primary support measure after similarity/recency weighting.

A large low-quality pool may still be downgraded by timestamp quality, feed quality, disagreement, or other existing Phase 3 quality controls.

## 20. Event hierarchy and similarity

Historical matching order:

```text
exact event type
  ↓
exact asset
  ↓
same reaction window
  ↓
comparable regime/context
  ↓
recency weighting
```

Unrelated event types are not silently pooled to increase sample size. If CPI history is insufficient, the UI says `INSUFFICIENT CPI HISTORY`; it does not silently substitute NFP or another event family.

## 21. Reaction-window models stay separate

`+1m`, `+5m`, and `+15m` remain distinct historical models.

The UI may show side-by-side descriptive statistics for each window:

- median;
- 50% band;
- 80% band;
- direction frequency;
- effective sample size.

This preserves patterns such as initial spike, continuation, and reversal.

## 22. Classic Pivot provenance and reference rules

Classic Pivot uses H/L/C from the previous completed provider period:

```text
P  = (H + L + C) / 3
R1 = 2P - L
S1 = 2P - H
R2 = P + (H - L)
S2 = P - (H - L)
R3 = H + 2(P - L)
S3 = L - 2(H - P)
```

Required provenance for a usable directional Pivot reference:

- method = `CLASSIC`;
- timeframe;
- source = `PREVIOUS_COMPLETED_PERIOD`;
- provider;
- provider boundary;
- candle open UTC;
- candle close UTC;
- complete Pivot levels.

MYT display conversion must not alter the provider candle boundary.

Directional rules:

- `UP_PRESSURE`: consider R1/R2/R3 above reference price;
- `DOWN_PRESSURE`: consider S1/S2/S3 below reference price;
- `MIXED`: display both sides as context but do not promote a directional confluence.

`CONFLUENCE` means the qualifying directional Pivot level lies inside the historical conditional price band. No hidden tolerance is applied.

If future work introduces near-confluence, it must be a distinct explicit state such as `NEAR_PIVOT` with a visible numeric gap.

## 23. Pivot hold states

Phase 3.1 keeps and extends fail-closed Pivot states:

- `CONFLUENCE`
- `NO_PIVOT_CONFLUENCE`
- `INSUFFICIENT_DATA`
- `EARLY_HISTORY_HOLD`
- `LOW_QUALITY_HOLD`
- `DIVERGENCE_HOLD`
- `MIXED_HOLD`
- `DELAYED_FEED_HOLD`
- `MARKET_CLOSED_HOLD`
- `PIVOT_SOURCE_HOLD`
- `INSUFFICIENT_REFERENCE_PRICE`

The UI must distinguish a displayed Pivot level from an active confluence state.

## 24. ADVANCE versus NOWCAST

Before a scheduled event:

```text
historical model
  + current pre-event context
  → expected model pressure
  → descriptive Pivot reference
```

After event release:

```text
expected model pressure
  + observed market reaction
  → CONFIRMED / PARTIAL / DIVERGENCE
```

If measured reaction contradicts the pre-event model, the relevant Pivot reference becomes `DIVERGENCE_HOLD` rather than remaining promoted.

The append-only Trade Plan revision ledger must preserve the original ADVANCE state and each meaningful NOWCAST revision instead of rewriting earlier analytical state.

## 25. History Health UI

Add a visible History Health summary with at least:

- verified events;
- eligible samples;
- quarantined samples;
- latest verified event;
- oldest eligible event;
- event-type coverage;
- current market-feed state;
- timestamp-quality summary;
- raw historical count;
- effective sample size;
- model-support state.

A provenance strip should make major data origins clear:

```text
EVENT   BLS / DOL / FED • OFFICIAL • HIGH
MARKET  provider • verified M1 windows
HISTORY eligible count • effective sample size
PIVOT   previous completed period • provider boundary
```

## 26. Behavior as the dataset grows

The UI matures gradually:

```text
0–4    → waiting for verified history
5–9    → early descriptive examples
10–19  → limited median/range output
20–39  → weighted percentile distribution + Pivot overlap
40–59  → similarity/recency model + regime context
60+    → mature historical support, still quality-gated
```

The collector running successfully does not itself increase analytical confidence. Only verified eligible data changes support state.

## 27. Failure behavior

Phase 3.1 always prefers an incomplete result over false precision.

Examples:

- official event verified, market history missing → event remains valid, history not updated;
- market bars exist, official timing unverified → sample quarantined;
- official release later revises a statistic → original market reaction remains anchored to the original release timestamp; revision metadata is stored separately;
- provider response conflicts with an existing verified sample → conflict is quarantined and requires later reconciliation;
- collector cannot confirm source provenance → record is ineligible.

## 28. Security and public-data constraints

API keys remain in GitHub Actions secrets and are never written to HTML, JavaScript, JSON, logs, or Pages artifacts.

Generated public Pages files may contain:

- official source URLs;
- release metadata;
- market-data provider names;
- normalized timestamps;
- verified market observations;
- derived analytical statistics.

They must not contain API keys, Authorization headers, secret query parameters, private tokens, or provider credentials.

Existing public-source safety scans must be expanded to include the new scripts, workflows, catalog, state, and history output.

## 29. Expected implementation components

Likely components include:

### Python collection layer

- `scripts/event_history/official_base.py`
- `scripts/event_history/bls_adapter.py`
- `scripts/event_history/dol_adapter.py`
- `scripts/event_history/fed_adapter.py`
- `scripts/event_history/catalog.py`
- `scripts/event_history/market_windows.py`
- `scripts/event_history/history_writer.py`
- `scripts/event_history/state.py`
- `scripts/update_event_catalog.py`
- `scripts/update_event_history.py`

The exact file split may be adjusted during implementation if repository conventions indicate a clearer boundary, but source adapters, normalization, market-window collection, validation, and persistence must remain independently testable units.

### Generated repository data

- `data/event-catalog.json` — published to Pages;
- `data/event-history.json` — published to Pages;
- `data/event-history-state.json` — repository operational state, not required in Pages.

### Workflows

- `.github/workflows/event-catalog.yml`
- `.github/workflows/event-window-collector.yml`

### Existing Phase 3 consumers

- history adapter;
- advance model;
- confidence model;
- Trade Plan integration;
- History Health UI;
- Pages publication workflow;
- CI and public-source safety workflow.

## 30. Test strategy

Implementation follows test-driven development.

Required test groups:

1. official-source normalization;
2. timezone conversion across EST/EDT boundaries;
3. stable event ID generation;
4. schedule revision preservation;
5. deterministic PRE-bar selection;
6. +1m/+5m/+15m window selection;
7. common PRE reference across all windows;
8. high/low excursion calculations;
9. missing-bar fail-closed behavior;
10. duplicate and conflict handling;
11. retry and recovery-horizon state transitions;
12. quarantine reasons;
13. catalog JSON validation;
14. history JSON validation;
15. operational state validation;
16. API-key/public-source safety scans;
17. exact-event-type model eligibility;
18. effective-sample support-state boundaries;
19. Pivot provenance/hold behavior;
20. ADVANCE/NOWCAST revision preservation;
21. Pages artifact includes catalog and history outputs but does not require operational state;
22. production `index.html` regression protection unless a later separately approved change explicitly modifies it.

External-source tests should use fixtures/mocks for deterministic CI. Live-source smoke checks, if added, must be separate from deterministic unit/acceptance tests and must fail safely when a provider is unavailable.

## 31. Rollout sequence

Implementation should be staged:

1. schemas and fixtures;
2. official-source adapters;
3. canonical catalog writer;
4. deterministic market-window selector;
5. history/state writer with deduplication and quarantine;
6. scheduled workflows and concurrency protection;
7. History Health UI and provenance display;
8. CI/security/Pages integration;
9. manual dry run against recent official events without publishing fabricated historical samples;
10. production enablement after deterministic tests and workflow verification pass.

The first production dataset may remain sparse. Sparse verified history is acceptable; synthetic backfill is not.

## 32. Acceptance criteria

Phase 3.1 is ready to merge only when all of the following are demonstrated:

- official-source adapters produce normalized deterministic events from fixtures;
- EST/EDT time conversion is correct and UTC remains canonical;
- event catalog writes are deterministic and revision-aware;
- market windows use a completed PRE M1 candle and common PRE reference;
- missing or conflicting observations fail closed;
- no synthetic consensus or surprise values are introduced;
- duplicate samples are not appended;
- quarantine is auditable;
- collector state survives interrupted runs;
- all generated-data writer workflows use the `macro-data-writers` concurrency group;
- workflows synchronize generated-data writes safely;
- event-history eligibility and support-state thresholds are enforced;
- Pivot provenance and hold controls remain intact;
- ADVANCE and NOWCAST remain separate analytical states;
- public files contain no secrets;
- all automated tests and syntax checks pass;
- Pages includes the intended public catalog/history files and does not need the operational state file;
- production `index.html` remains unchanged unless separately approved.

## 33. Design decision summary

Phase 3.1 uses an official-first architecture with government/Federal Reserve event sources, Twelve Data or the configured market-data provider for aligned M1 observations, a six-hour catalog discovery schedule, a five-minute market-window collector, a 48-hour recovery horizon, deterministic PRE/+1m/+5m/+15m semantics, explicit quarantine, deterministic sample IDs, crash-safe writes, a shared `macro-data-writers` concurrency group, effective-sample support thresholds, previous-completed-period Classic Pivot provenance, and an auditable MYT-first UI.

The governing principle is: **verified sparse data is preferable to fabricated complete data**.
