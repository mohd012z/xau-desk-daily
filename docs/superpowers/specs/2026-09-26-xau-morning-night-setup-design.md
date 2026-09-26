# XAU Morning / Night Setup Evidence — Architecture Design

Date: 2026-09-26
Status: Design approved; implementation pending plan/review
Target integration: `main` after review and CI
Scope: shadow/evidence only; no broker execution, lot sizing, SL/TP, or live orders

## 1. Purpose

Add two independent intraday XAUUSD structure detectors to `xau-desk-daily`: the internal M08 detector and internal N20 detector. They remain independent from BBMA/HTF evidence and are compared only by a downstream confluence classifier.

User-facing output MUST never expose the internal names `M08` or `N20`. Presentation maps them to `Morning Setup` and `Night Setup` respectively.

The system reports only meaningful new evidence or implementation/CI problems. Unchanged evidence produces no notification.

## 2. Non-negotiable boundaries

1. Setup structure and BBMA are separate evidence domains.
2. BBMA cannot rewrite a setup's observed direction/state.
3. A setup cannot rewrite BBMA/HTF state.
4. News/event context cannot create BUY/SELL direction and cannot reverse technical evidence.
5. Session, spread, volatility, and data health contextualize observations; they do not manufacture direction.
6. Missing evidence is represented explicitly as `UNKNOWN`; it is never inferred.
7. Incomplete evidence may be `UNRESOLVED`; `UNKNOWN` and `UNRESOLVED` are distinct.
8. No broker execution, order creation, position sizing, SL/TP generation, or live cutover is introduced.
9. Historical replay is chronological and must not expose future candles to earlier checkpoints.
10. Internal setup identifiers are permitted in storage/audit records but prohibited in user-facing alert text.

## 3. Time model

UTC is canonical for storage and interchange. Malaysia Time is rendered with the `Asia/Kuala_Lumpur` timezone. No ad-hoc `+8 hours` conversion is permitted.

The setup anchors are:
- Morning Setup: 08:00 MYT
- Night Setup: 20:00 MYT

A candle is eligible for an observation only after that candle is closed. A wick outside a range does not by itself establish a confirmed breakout.

Any existing checkpoint logic, including 11:30 MYT and 18:00 MYT observations where applicable, must use closed-candle boundaries. A candle whose close time is exactly the checkpoint is eligible; a later-closing candle is not.

## 4. Required market evidence

The detector consumes normalized XAUUSD intraday candles with at least:
- symbol/instrument identity
- timeframe
- candle open time UTC
- candle close time UTC
- open/high/low/close
- closed/final flag
- source identity
- ingestion timestamp

Context may additionally contain:
- bid/ask or verified spread
- ATR or normalized volatility evidence
- session classification
- normalized macro/news event proximity
- BBMA observations by timeframe
- HTF structural observations
- data-health metadata

If required intraday candles are absent, stale, duplicated ambiguously, out of order, incomplete, or from an unverified instrument identity, the detector must not invent a structure.

## 5. Setup observation contract

Each setup produces an independent observation with:

- `setup_id` — internal stable identity
- `setup_kind` — internal enum
- `public_label` — `Morning Setup` or `Night Setup`
- `rule_version`
- `anchor_time_myt`
- `observed_at_utc`
- `observed_at_myt`
- `state`
- `direction`
- `range_high`
- `range_low`
- `break_direction`
- `break_level`
- `retest_state`
- `evidence_candle_ids`
- `data_health`
- `reason_codes`

Allowed top-level observed states:

`UP | DOWN | RANGE | RETEST | FALSE_BREAK | UNRESOLVED | UNKNOWN`

Direction is separately represented as:

`UP | DOWN | NONE | UNKNOWN`

Retest state is separately represented as:

`NONE | TOUCH | HOLD | FAIL | UNKNOWN`

This prevents a `RETEST` state from discarding the direction of the preceding break.

## 6. Structure lifecycle

The detector is a deterministic state machine rather than a one-candle labeler.

Conceptual lifecycle:

`UNKNOWN -> OBSERVING -> RANGE -> BREAK -> RETEST -> HOLD | FAIL`

Permitted outcomes include:
- `UP`: valid upward structural break based on closed-candle evidence.
- `DOWN`: valid downward structural break based on closed-candle evidence.
- `RANGE`: established range without a valid closed-candle break.
- `RETEST`: price is testing a previously established break/range boundary; direction remains separately recorded.
- `FALSE_BREAK`: excursion/break attempt failed the configured confirmation or returned into the established range according to the versioned rule.
- `UNRESOLVED`: relevant structure exists but mandatory confirmation is incomplete or conflicting within the detector's own evidence.
- `UNKNOWN`: evidence is absent, invalid, stale beyond policy, or insufficient to classify.

A wick-only excursion cannot be upgraded to `UP` or `DOWN` merely because it crossed a boundary intrabar.

## 7. BBMA and HTF independence

The existing BBMA detector layer remains authoritative for BBMA evidence. The new setup detectors consume normalized BBMA/HTF observations only after their own setup observation is complete.

The joined record stores three independent objects:

- `setup_evidence`
- `bbma_evidence`
- `relationship`

It must not replace these with a synthetic `combinedDirection` field.

Example: Morning Setup `UP` plus H4 BBMA `DOWN` remains Morning Setup `UP`; the relationship becomes `OPPOSITE_CONFLICT`.

## 8. Relationship classifier

Allowed relationship classes:

- `ALIGNED`
- `OPPOSITE_CONFLICT`
- `PULLBACK_RETEST`
- `REVERSAL_CANDIDATE`
- `RANGE`
- `FALSE_BREAK`
- `UNRESOLVED`
- `UNKNOWN`

Rules:

### ALIGNED
Setup direction and the relevant BBMA/HTF evidence agree with sufficient valid evidence.

### OPPOSITE_CONFLICT
Setup direction and relevant BBMA/HTF direction disagree. Neither side is rewritten.

### PULLBACK_RETEST
Lower-timeframe/setup movement opposes the prevailing HTF context while evidence is consistent with a retest/pullback rather than a proven HTF reversal.

### REVERSAL_CANDIDATE
Independent evidence suggests a possible transition against the previous HTF structure, but the system does not promote this to a confirmed reversal. This phase intentionally defines no `REVERSAL_CONFIRMED` state.

### RANGE
The setup remains range-bound; BBMA/HTF context may still be recorded independently.

### FALSE_BREAK
The setup detector establishes a failed break. BBMA/HTF context remains attached but does not overwrite the state.

### UNRESOLVED
Evidence exists but mandatory relationship evidence is incomplete or internally conflicting.

### UNKNOWN
Required evidence for the relationship is absent or invalid. `UNKNOWN` is not equivalent to neutral, range, or no setup.

## 9. Context model

Each evidence snapshot may attach:

### Session
- normalized session name
- session phase if available
- source/timezone evidence

### News/event proximity
- nearest relevant event id
- event title/category
- impact when verified
- minutes before/after event
- event lifecycle/risk state
- verification/freshness state

News is contextual evidence only. It cannot create or reverse setup or BBMA direction.

### Spread
- observed spread
- source
- timestamp
- normalized spread state when thresholds are versioned and evidence-backed

If verified spread is unavailable, spread is `UNKNOWN`.

### Volatility
- observed volatility metric(s), such as ATR when available
- timeframe
- rule/version
- normalized volatility state

No volatility state is inferred from a daily snapshot when the setup requires intraday evidence.

### Data health
At minimum:

`GOOD | DEGRADED | STALE | INVALID | UNKNOWN`

`STALE` or `INVALID` can block a new setup conclusion. A failed news feed makes news context `UNKNOWN`; it does not imply no news.

## 10. Evidence snapshot

A joined setup snapshot contains:

- setup observation
- BBMA observations by relevant timeframe
- HTF structural context
- relationship classification
- session context
- news/event proximity
- spread context
- volatility context
- data-health context
- engine/rule versions
- evidence references

All source components retain their independent identities so replay can reconstruct the exact evidence available at the observation time.

## 11. Alert eligibility

Notifications are transition/evidence driven, not evaluation-frequency driven.

A user-facing notification is eligible only when there is a meaningful new condition such as:
- new setup state
- meaningful retest lifecycle transition
- false-break transition
- relationship change (for example ALIGNED -> OPPOSITE_CONFLICT)
- materially changed event-risk proximity
- materially changed spread/volatility/data-health state that affects evidence interpretation
- implementation or CI failure affecting this subsystem

Unchanged evidence is silent.

Deduplication uses stable setup identity, rule version, observation time/window, state, relationship, and material context changes.

## 12. Public alert rendering

The renderer enforces:
- internal M08 label -> `Morning Setup`
- internal N20 label -> `Night Setup`

Internal names must never appear in user-facing alert title, body, reason, Telegram/APK/dashboard copy, or digest text.

Meaningful alerts state:
1. public setup label
2. observed state (`UP`, `DOWN`, `RANGE`, `RETEST`, `FALSE BREAK`, or `UNRESOLVED` as applicable)
3. BBMA/HTF relationship
4. concise reason/context
5. relevant session/event/spread/volatility/data-health context only when evidence exists

Alerts never contain broker execution, lot sizing, SL/TP, or live-order instructions.

## 13. Proposed code boundaries

Create focused modules following the repository's `.mjs` style where compatible:

`macro/setups/`
- `constants.mjs` — internal enums and public labels
- `input.mjs` — setup input normalization/validation
- `range.mjs` — deterministic range construction
- `breakout.mjs` — closed-candle break classification
- `retest.mjs` — TOUCH/HOLD/FAIL lifecycle
- `lifecycle.mjs` — setup state transitions
- `morning.mjs` — Morning Setup orchestration
- `night.mjs` — Night Setup orchestration

`macro/confluence/`
- `setup-bbma.mjs` — relationship classification without rewriting either evidence source

`macro/evidence/`
- `setup-context.mjs` — session/news/spread/volatility/data-health attachment
- `setup-snapshot.mjs` — auditable joined snapshot

`macro/alerts/`
- `public-setup-labels.mjs` — presentation boundary
- `setup-alert-policy.mjs` — meaningful-change/dedup policy

Existing BBMA detector modules should not be refactored except where a narrow adapter is required to consume their normalized output.

## 14. Historical replay and no-look-ahead

Replay feeds candles chronologically. For an observation time `T`, only candles with eligible close times `<= T` are visible.

Tests must prove:
- a candle closing exactly at a checkpoint is eligible
- a candle closing after the checkpoint is excluded
- future retest/failure information cannot alter an earlier snapshot
- replay and live/shadow evaluation produce equivalent state for equivalent evidence

## 15. Validation strategy

### Detector fixtures
Cover both setup kinds for:
- UP break
- DOWN break
- RANGE
- wick-only excursion
- RETEST TOUCH
- RETEST HOLD
- RETEST FAIL
- FALSE_BREAK
- UNRESOLVED
- UNKNOWN

### Independence fixtures
Prove:
- setup UP + BBMA DOWN => setup remains UP, relationship OPPOSITE_CONFLICT
- setup DOWN + BBMA DOWN => ALIGNED
- setup retest against HTF trend => PULLBACK_RETEST when rule evidence supports it
- possible transition => REVERSAL_CANDIDATE only; never automatic reversal confirmation
- missing BBMA/HTF => relationship UNKNOWN without altering setup state

### Context fixtures
Prove:
- nearby news changes context only
- missing news feed => news UNKNOWN
- missing spread => spread UNKNOWN
- stale intraday price data blocks a new directional conclusion
- volatility context does not manufacture direction

### Presentation fixtures
Search rendered user-facing output and fail tests if either prohibited internal setup name appears.

### Regression
Run existing BBMA, Phase 5 replay/evidence, no-look-ahead, identity, alert/dedup, and CI tests unchanged.

## 16. Rollout

1. Add schemas/enums and fixtures.
2. Add setup input/data-health validation.
3. Add deterministic range/break/retest primitives.
4. Add Morning Setup detector.
5. Add Night Setup detector.
6. Add BBMA/HTF relationship classifier.
7. Add context snapshot.
8. Add public-label and alert-change policy.
9. Integrate into shadow/replay evidence only.
10. Run historical replay and regression tests.
11. Keep live delivery disabled until evidence quality is reviewed.
12. Merge to `main` only after CI is green and review confirms no regression to BBMA behavior.

## 17. Current evidence limitation

The existing automated repository refresh is a daily XAUUSD snapshot. Daily OHLC alone is insufficient to establish the intraday setup range, closed-candle break, retest, or false-break lifecycle required by this design. Until a validated intraday candle source is present, setup observations must remain `UNKNOWN` rather than inferred from daily or macro context.

## 18. Success criteria

The feature is complete when:
- both setup detectors operate deterministically from closed intraday candles
- setup and BBMA evidence remain independently inspectable
- all required relationship states are deterministic and tested
- retest and false-break lifecycle is replayable without look-ahead
- session/news/spread/volatility/data-health context is explicit and non-direction-generating
- missing evidence produces UNKNOWN rather than inference
- public output never exposes internal setup names
- unchanged evidence produces no notification
- existing BBMA/Phase 5 regression tests remain green
- no broker execution or live-order functionality is introduced
