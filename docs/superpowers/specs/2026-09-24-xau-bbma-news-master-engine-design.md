# XAU / BBMA / News Master Engine — Architecture Design

Date: 2026-09-24
Status: Design approved; implementation not yet authorized
Architecture: Option A

## 1. Purpose

Create one auditable XAUUSD analysis and alert architecture in which `xau-desk-daily` is the master technical-analysis and confluence engine, while `News_ifxhelper` remains the verified news/macro and notification-delivery service.

The design must prevent duplicated or contradictory alerts, preserve the distinction between technical evidence and macro/event context, normalize all user-facing time to Malaysia Time (MYT), fail safely when feeds are stale, and retain enough evidence to reconstruct why each signal and notification was produced.

## 2. System ownership

### xau-desk-daily — master analysis authority

Owns:
- XAUUSD market snapshots and candle state
- data-health gating for technical analysis
- D1/H4/H1/M30/M15/M5 structure
- BBMA detectors
- multi-timeframe analysis
- ATR, levels, pivots and targets
- technical/macro confluence and conflict state
- signal lifecycle
- evidence references and reaction/outcome tracking
- generation of normalized alert candidates

### News_ifxhelper — macro/evidence and delivery authority

Owns:
- economic-calendar collection
- news collection
- source/evidence verification
- normalization of macro events
- event lifecycle and reminders
- macro-context publication
- Telegram delivery
- Android/APK notification delivery
- daily/periodic digests

News_ifxhelper does not decide the XAU technical state. xau-desk-daily does not duplicate the raw-news collection pipeline.

## 3. Priority architecture

Processing priority is:

1. P0 Data integrity
2. P1 Market structure
3. P2 BBMA detection
4. P3 Macro/event context
5. P4 Confluence and conflict resolution
6. P5 Signal lifecycle
7. P6 Alert routing
8. P7 Evidence and outcome tracking
9. P8 Presentation

Alert urgency is a separate concept:

- P0 SYSTEM/DATA — stale or invalid data affecting analysis
- P1 CRITICAL EVENT — major event live or another market-risk condition requiring immediate awareness
- P2 CONFIRMED BBMA — confirmed technical setup eligible for notification
- P3 DEVELOPING BBMA — watch/setup state
- P4 INFORMATION/DIGEST — informational context and scheduled summaries

## 4. Data integrity gate

Before a new technical confirmation can be issued, the engine validates:
- price freshness
- candle completeness
- timeframe synchronization
- duplicate/out-of-order observations
- timestamp validity
- instrument identity

UTC is canonical for storage and interchange. User-facing timestamps are rendered in `Asia/Kuala_Lumpur` / MYT. Records that cross system boundaries retain both `timestamp_utc` and `timestamp_myt` where practical.

No component should implement ad-hoc `+8 hours` time conversion.

If the price feed is stale, new BBMA confirmations are suspended. If the news feed is stale or unavailable, technical analysis may continue but macro state becomes `UNKNOWN`; the system must never infer that a failed news feed means there is no news.

## 5. Timeframe responsibilities

- D1: major market context
- H4: primary BBMA directional/structural context
- H1: confirmation and major setup development
- M30: setup refinement
- M15: primary setup/alert timeframe
- M5: early confirmation and reaction monitoring

Each timeframe produces observations. An individual timeframe does not independently create the final trade-state notification. The confluence engine evaluates the combined evidence.

## 6. BBMA detector layer

The detector layer represents at minimum:
- Extreme BUY/SELL
- MHV BUY/SELL
- CSA BUY/SELL
- Re-entry BUY/SELL
- Momentum BUY/SELL
- MA/BB structural state

Detector output is structured evidence, not a Telegram/APK message and not automatically a final BUY/SELL conclusion.

Each detection records sufficient context to reproduce the decision, including timeframe, candle time, relevant price values and rule version.

## 7. Signal lifecycle

Signals use the lifecycle:

`DETECTED -> WATCH -> SETUP -> CONFIRMED -> ACTIVE -> INVALIDATED | EXPIRED`

Definitions:
- DETECTED: a relevant primitive BBMA condition exists.
- WATCH: potentially useful structure exists but required setup conditions are incomplete.
- SETUP: the configured combination of structural conditions exists but final confirmation is incomplete.
- CONFIRMED: all mandatory technical/data/conflict gates for the configured rule are satisfied.
- ACTIVE: a confirmed setup remains valid.
- INVALIDATED: a defined invalidation condition occurs.
- EXPIRED: the setup exceeds its configured useful lifetime without a technical invalidation.

State transitions, not repeated candle evaluation, drive user notifications.

## 8. Macro/event behavior

News does not silently reverse or rewrite BBMA technical state.

The macro layer may mark a technically valid setup with risk/context such as:
- NORMAL
- EVENT_APPROACHING
- PRE_EVENT_LOCK
- EVENT_LIVE
- POST_EVENT_VOLATILITY
- NORMALIZED
- UNKNOWN

Exact event windows are configuration, not hard-coded architecture constants.

During an event-risk state, the technical setup remains inspectable. Policy may suppress or downgrade new notifications, but it does not falsify the underlying technical evidence. After the event, the engine re-evaluates fresh market data rather than blindly restoring a pre-event alert.

## 9. News -> XAU integration contract

News_ifxhelper publishes normalized macro events. A normalized event includes at minimum:
- `event_id`
- `timestamp_utc`
- `timestamp_myt`
- `currency`
- `title`
- `impact`
- `status`
- actual/forecast/previous values when available
- `evidence_class`
- source timestamp
- verification state
- freshness state

xau-desk-daily consumes this normalized representation and does not need to know the collector-specific source format.

## 10. XAU -> delivery integration contract

xau-desk-daily produces a normalized Alert Candidate containing at minimum:
- `signal_id`
- symbol
- setup type
- direction when applicable
- primary timeframe
- lifecycle state
- alert priority
- generated UTC/MYT time
- multi-timeframe technical summary
- BBMA detector evidence
- macro/event risk state
- data-health state
- analysis/rule version references

Delivery components transform the same accepted candidate into APK, Telegram and dashboard presentation. Presentation channels must not independently recompute the technical conclusion.

## 11. Alert router

Before delivery, the router checks:
- schema validity
- required data freshness
- lifecycle state change
- duplicate identity
- cooldown policy
- priority change
- suppression/event-risk policy
- previous delivery state

Repeated evaluation of the same unchanged setup must not produce repeated notifications.

A stable signal identity ties updates together. Example conceptual sequence:

`DETECTED -> SETUP -> CONFIRMED -> ACTIVE -> INVALIDATED`

These are updates to one signal, not five unrelated signals.

## 12. Evidence and auditability

Important objects have traceable identifiers:
- `event_id`
- `snapshot_id`
- `analysis_id`
- `signal_id`
- `alert_id`
- `delivery_id`

A delivered notification must be traceable back to the signal, analysis, price/candle snapshot, BBMA evidence and relevant macro event(s).

Each confirmed setup records engine/rule version and later market observations. Outcome analysis may include:
- +5m/+15m/+30m/+1h/+4h observations
- maximum favorable excursion
- maximum adverse excursion
- target touch
- invalidation touch
- time to target/invalidation

Historical results are evidence, not a guarantee of future performance. The product must not represent historical validation as guaranteed accuracy.

## 13. Failure behavior

- Price stale: suspend new technical confirmations; expose degraded health.
- News stale/down: technical engine may continue; macro state is UNKNOWN; never assume no news.
- Malformed macro payload: reject/quarantine it and retain the last valid state according to freshness policy.
- Missing lower timeframe: higher-timeframe analysis may remain available; unavailable confirmation is explicitly represented.
- Telegram failure: preserve analysis/signal and mark delivery failure; other channels continue.
- APK offline: analysis and signal history continue independently.
- Duplicate/out-of-order market observations: reject or quarantine according to data-integrity policy.

## 14. Security boundary

Integration payloads never contain Telegram bot tokens, GitHub tokens, Android signing secrets or provider credentials. Secrets remain in their platform-specific secret stores. Only normalized market, news, analysis and delivery metadata cross the integration boundary.

## 15. Validation strategy

### Shadow mode

The new engine initially runs beside the current system. It records candidate alerts and evidence without replacing the established production delivery path.

### Validation gates

Gate 1 — Data correctness:
- XAU price/OHLC
- all required timeframes
- timestamp and MYT conversion
- news-event time
- deduplication
- stale-feed detection

Gate 2 — BBMA detector correctness:
- deterministic fixtures for BUY/SELL Extreme, MHV, CSA, Re-entry and Momentum
- explicit no-signal cases

Gate 3 — Multi-timeframe/confluence correctness:
- aligned cases
- conflicting cases
- missing-timeframe cases

Gate 4 — Macro/event behavior:
- synthetic clock tests around event lifecycle states
- technical state preserved while event-risk state changes

Gate 5 — Alert routing:
- deduplication
- restart persistence
- cooldown
- lifecycle update behavior
- delivery failure isolation

## 16. Historical replay

Historical replay processes observations chronologically and exposes the engine only to information that was available at each historical timestamp. This prevents look-ahead bias.

Replay reconstructs lifecycle transitions and outcome observations so rule behavior can be compared across engine/rule versions.

## 17. Migration and rollback

Migration phases:

0. Freeze/document current baseline
1. Shared schemas/contracts
2. Data validation and time normalization
3. BBMA detector tests/implementation
4. Multi-timeframe engine
5. News_ifxhelper normalized macro integration
6. Confluence and lifecycle engine
7. Evidence/outcome engine
8. Alert router
9. Shadow mode
10. Historical replay and regression validation
11. Controlled APK/Telegram rollout
12. Production cutover

Production rollout retains a feature switch so the new master engine can be disabled without deleting code or evidence. Existing production behavior remains the rollback path until the new system passes the agreed validation gates.

## 18. Engine health presentation

Operational health should expose independently:
- XAU price/feed freshness
- timeframe availability
- BBMA engine
- news/macro feed
- MYT/time normalization
- Telegram delivery
- APK delivery
- last analysis time
- last verified news/event update

A green CI workflow is not treated as proof that live market data or market interpretation is correct.

## 19. End-to-end architecture

`News sources -> News_ifxhelper verification/normalization -> normalized macro feed -> xau-desk-daily data/market/BBMA engine -> confluence -> signal lifecycle -> alert router -> evidence record -> APK / Telegram / dashboard`

The central rules are:
1. xau-desk-daily is the technical/confluence authority.
2. News_ifxhelper is the verified macro/news and notification-delivery authority.
3. BBMA detection is separate from signal state and alert delivery.
4. Macro context modifies risk/context; it does not silently falsify technical state.
5. State changes drive alerts; repeated unchanged evaluations do not.
6. Every important alert is auditable back to evidence.
7. Data health can block or degrade conclusions.
8. Rollout is evidence-driven, shadowed and reversible.
