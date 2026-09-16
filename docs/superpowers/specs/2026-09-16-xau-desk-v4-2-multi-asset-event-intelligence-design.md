# XAU//DESK v4.2 — Multi-Asset Event Intelligence Design

Date: 2026-09-16
Repository: `mohd012z/xau-desk-daily`
Status: Approved design direction in chat; written-spec review required before implementation.

## 1. Goal

Upgrade XAU//DESK into a multi-asset event-analysis desk covering:

- XAU/USD as the primary instrument
- Major FX currencies: USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD
- Major FX pairs and selected crosses
- BTC/USD and ETH/USD, with room for additional provider-supported crypto
- Scheduled economic releases
- Central-bank decisions, statements, speeches, press conferences, interviews and Q&A
- Unplanned breaking news and unscheduled speech/comments

The system must estimate conditional price/pip ranges before planned events, detect and classify unplanned events, then continuously recalculate using actual news/speech content and observed market reaction.

The dashboard is an analysis tool. It must distinguish model context from measured price reaction and must not present automatic order instructions.

## 2. Reading order / dashboard hierarchy

The main dashboard must be reorganized in this order:

1. Market / data status
2. Next scheduled event OR active unplanned event
3. Event surprise / speech hint
4. Immediate observed reaction
5. Currency-strength dashboard
6. Forex pair matrix
7. XAU/USD event analysis
8. Crypto event analysis
9. Cross-asset confirmation / divergence
10. Historical comparable-event distribution
11. Range / pip / volatility calculations
12. Source and timestamp audit
13. Short event summary

On Android use a bottom navigation layout; on desktop use the left rail plus command palette.

## 3. Event state machine

### Planned events

`UPCOMING -> TRIGGERED -> LIVE -> SETTLING -> CLOSED`

### Unplanned events

An unplanned event has no `UPCOMING` state. It enters:

`DETECTED -> TRIGGERED -> LIVE -> SETTLING -> CLOSED`

The dashboard must show an `UNPLANNED` badge and a timestamp-quality indicator.

## 4. Unplanned-news auto-detection

The Worker/news layer continuously watches supported official/news sources. A new item becomes an event candidate when it is sufficiently relevant to monitored assets/entities and materially different from already-seen items.

### Detection inputs

- publication/provider timestamp
- official-source timestamp when available
- article/statement text
- named central bank / policymaker / government / geopolitical entity
- impacted currency or asset terms
- urgency / materiality terms
- duplicate / near-duplicate detection

### Event timestamp hierarchy

Use the best available timestamp in this order:

1. official scheduled/release timestamp
2. official transcript/statement timestamp
3. official provider/event timestamp
4. trusted news-provider event timestamp
5. article `publishedAt`
6. gateway `receivedAt`

Store and expose `timeSource` and `timeConfidence`.

For unplanned news with only a received/publication timestamp, do not pretend the exact market-information arrival time is known. Label the event-time confidence accordingly.

## 5. Automatic affected-asset map

When an event is detected, identify affected assets from entities/topic.

Examples:

- Federal Reserve / US inflation / US jobs -> USD pairs, XAU, BTC, ETH, DXY/yields
- ECB -> EUR pairs first; USD/XAU/crypto secondarily
- BoE -> GBP pairs
- BoJ -> JPY pairs and carry-sensitive assets
- SNB -> CHF pairs
- BoC -> CAD pairs, oil-sensitive FX
- RBA -> AUD pairs
- RBNZ -> NZD pairs
- major geopolitical shock -> XAU, oil, USD, JPY, CHF, crypto and risk-sensitive FX

This map determines which instruments receive immediate reaction tracking.

## 6. Planned-event Advance Mode

Before a scheduled release, do not guess one deterministic pip number. Produce a conditional distribution based only on information available before the event.

### Advance-mode inputs

- event type
- consensus forecast
- previous value
- historical forecast-error distribution
- pre-event spot price
- pre-event ATR / realized volatility
- pre-event spread/liquidity if available
- recent trend
- yield/rate differential
- DXY / real-yield context
- session
- comparable historical regimes
- carry/positioning proxy when available

No post-event values are allowed in Advance Mode.

### Surprise scenarios

For numeric data releases produce scenario rows such as:

- `-2 sigma`
- `-1 sigma`
- `near consensus`
- `+1 sigma`
- `+2 sigma`

For each scenario estimate:

- signed pip/price center
- 50% historical interval
- 80% historical interval
- estimated resulting price range
- model confidence

## 7. Numeric news-surprise calculation

For a release:

`rawSurprise = actual - forecast`

Standardize it:

`surpriseZ = (actual - forecast) / historicalStdForecastError`

Direction must be event-aware. For example, a positive unemployment surprise and a positive CPI surprise do not imply the same macro interpretation.

Historical distributions must therefore be stored per event series.

## 8. Speech / communication surprise engine

Speech is not treated as simply `hawkish = price down` or `dovish = price up`.

Score speech in separate dimensions:

- policy/rate path
- inflation
- labour/employment
- growth
- financial conditions
- balance-sheet/liquidity

Create:

`currentSpeechScore`

and compare with an expected/prior stance:

`speechSurprise = currentSpeechScore - expectedSpeechScore`

### Expected speech stance

May use only information available before the statement/speech:

- previous speech
- latest policy statement
- recent official remarks
- current policy path expectations

### Speech modes

Separate where possible:

- prepared remarks
- policy statement
- press conference
- Q&A
- interview / unscheduled comments

Do not merge them into one event if separate timestamps are available.

## 9. Live rolling speech mode

If a speech/press conference/transcript is updating live, the event remains active.

Each new meaningful text segment can update:

- topic score
- hawkish/dovish shift
- policy-path score
- affected assets
- historical comparable-event match
- conditional price/pip distribution

Use a short debounce so repeated text fragments do not create noisy recalculation loops.

If the latest remarks reverse earlier guidance, the dashboard must show the change, for example:

`Prepared remarks: mildly dovish`

`Q&A: strongly hawkish`

`Net communication shift: hawkish`

## 10. Unplanned-news recalculation behavior

When an unplanned event is detected:

1. Create an event record immediately.
2. Determine the best available event timestamp and `timeSource`.
3. Identify affected currencies/assets.
4. Freeze the pre-event baseline using the last fully completed period before the event timestamp when possible.
5. Load comparable historical events.
6. Produce an initial `NOWCAST` distribution.
7. Start +10s/+30s/+1m/+5m/+15m/+30m/+60m/+4h measurement windows where provider resolution allows.
8. Recalculate whenever materially new article/speech text arrives.
9. Recalculate when market evidence materially changes.
10. Preserve each model revision for audit; do not overwrite the history of what the model knew at each time.

For unplanned events there is no pre-event forecast using unknown content. The first model output is a `NOWCAST` after detection.

## 11. Event baseline rules

For minute data, an event at `18:30:35` must not use the `18:30` candle as the pre-event baseline because that bar may already contain the reaction.

Use the last fully completed minute before the event minute, e.g. `18:29`.

Where tick/second data exist, also record the last valid quote immediately before the detected event timestamp.

Store both when available:

- `preEventTick`
- `preEventCompletedMinuteClose`

## 12. FX pip calculations

Default pip size must come from instrument metadata/provider configuration.

Typical defaults:

- most FX pairs: `0.0001`
- conventional JPY pairs: `0.01`

Calculate:

`pipMove = (priceAfter - priceBefore) / pipSize`

For every event window save:

- start price
- end price
- signed pips
- maximum favourable/upward excursion
- maximum adverse/downward excursion
- high-low event range in pips
- time to first 5/10/20 pips where meaningful
- time to max up/down
- retracement after initial move

Do not use pip terminology for crypto. For XAU/USD use provider point/tick metadata plus dollar and percentage movement.

## 13. XAU/USD calculations

Primary reporting:

- from price
- to price
- dollar move
- percentage move
- provider points/ticks
- max up/down excursion
- event range
- ATR utilization
- abnormal return

Never hard-code one universal gold-pip definition. Read provider instrument metadata.

## 14. Crypto calculations

For BTC/ETH use:

`returnPct = (priceAfter / priceBefore - 1) * 100`

Also track where available:

- dollar move
- absolute return
- realized volatility change
- volume change
- spread/liquidity change
- max up/down excursion

## 15. Currency-strength event dashboard

Calculate relative currency strength from multiple pairs, after orienting every pair consistently to the currency being scored.

Normalize pair movement by recent volatility:

`normalizedMove = eventReturn / preEventVolatility`

Currency score:

`currencyStrength = weightedMean(orientedNormalizedPairMoves)`

Display USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD for +1m/+5m/+15m/+60m.

## 16. Historical comparable-event engine

Store historical event features and reactions.

Similarity should consider:

- event type
- central bank / speaker / speaker role
- speech topic
- hawkish/dovish shift magnitude
- inflation/rate regime
- pre-event volatility
- pre-event trend
- session
- rate differential
- DXY/yield context
- carry/positioning proxy if available
- recency

Weight comparable events by both similarity and recency.

Report:

- all-event median
- similar-regime median
- very-close-match median
- effective sample size
- 25/50/75 percentiles
- 10/90 percentiles

## 17. Advanced pip/price estimation

### Model A — Historical similarity

Weighted empirical distribution from comparable historical events.

### Model B — Regularized regression

Example form:

`pipMove = alpha + beta1*surprise + beta2*volatility + beta3*preTrend + beta4*spread + beta5*rateDifferential + beta6*session + beta7*policyPath + error`

### Model C — Quantile model

Estimate 10%, 25%, 50%, 75%, 90% conditional pip/price quantiles.

### Ensemble

Combine model outputs using weights derived from walk-forward historical accuracy.

If models disagree materially, reduce confidence and display `MODEL DISAGREEMENT`.

## 18. Direction and magnitude are separate

The model must separately estimate:

- probability/frequency of positive vs negative reaction
- expected absolute movement
- signed median reaction

Do not collapse all three into one misleading signal.

## 19. Price-range conversion

For FX:

`conditionalPrice = preEventPrice + predictedPips * pipSize`

Display both predicted pips and the implied price range.

For XAU/crypto, convert percentage/dollar distribution to price bands.

## 20. Abnormal event return

Estimate market-specific background return and calculate:

`abnormalReturn = actualReturn - expectedBackgroundReturn`

For FX this may also be represented in abnormal pips.

The first implementation may use a simpler background model; the interface must allow upgrading it without changing dashboard consumers.

## 21. Cross-asset confirmation / divergence

Compare event reaction across:

- DXY / USD strength
- Treasury nominal yields
- real yields when available
- XAU/USD
- major FX
- BTC/ETH
- oil when relevant

Display:

- `CONFIRMED`
- `PARTIAL`
- `DIVERGENCE`

as descriptive reaction states, not order instructions.

Expected communication pressure and observed reaction must be separate fields.

## 22. Truthful data states

Market feed status:

- `STREAMING`
- `DELAYED`
- `STALE`
- `SNAPSHOT`
- `OFFLINE`
- `MARKET CLOSED` only when supportable

News/event status:

- `OFFICIAL`
- `PROVIDER`
- `ARTICLE TIME`
- `RECEIVED TIME`

Model state:

- `ADVANCE`
- `NOWCAST`
- `LIVE REACTION`
- `SETTLING`
- `CLOSED`

## 23. Model confidence

Internal confidence should use:

- effective historical sample size
- regime similarity
- model agreement
- historical walk-forward error
- interval calibration
- data/timestamp quality

Display the reasons behind confidence rather than a naked score.

## 24. Walk-forward validation / anti-leakage

Advance-mode features must have timestamps strictly before the event.

Never use actual release values, speech text, post-event yields, DXY movement or first-minute price in a pre-event backtest feature set.

Use chronological walk-forward validation.

Evaluate:

- pip/price MAE
- RMSE
- sign accuracy as a descriptive model metric
- quantile pinball loss
- interval coverage
- calibration by event type
- error by regime

## 25. UI additions from uploaded dashboard

Merge useful features from the uploaded HTML/JS:

- `/` command palette
- persistent theme/settings
- chart focus/fullscreen interaction
- range calculator
- News Incoming panel
- Speaker Watch
- Cross-Asset panel
- source/audit display

Improve them with:

- Android bottom navigation
- touch/pointer chart interaction
- actual price/time crosshair instead of x/y percentages
- data-driven KPI cards
- truthful live state

Do not use the uploaded polling module as the primary XAU live feed.

## 26. Suggested main tabs

### GOLD

Primary XAU/USD desk with event reaction, DXY/yields/oil context and historical event distribution.

### FOREX

Currency dashboard plus major/cross pair matrix, affected-pair ranking and exact pip/from-to-price event reaction.

### CRYPTO

BTC/ETH price/percentage/volatility/volume event reaction.

### EVENTS

Scheduled and unplanned active events with countdown, timestamp quality, historical analogues and rolling event-state history.

### SUMMARY

Compact explanation of:

- what happened
- what was expected
- surprise / speech shift
- affected currencies/assets
- actual reaction
- strongest/weakest currencies
- XAU and crypto reaction
- cross-asset confirmation/divergence
- historical comparison
- data quality

## 27. Security

- API keys remain server-side/secret only.
- Public GitHub files must never contain provider secrets.
- External links are protocol-validated.
- Worker CORS restricted to approved site origins.
- Public event/news text is escaped/sanitized.
- Public logs must redact keys and sensitive query parameters.

## 28. Testing requirements

Add automated tests for at least:

- pip size and signed pip calculation
- JPY pip handling
- event baseline minute-floor rule
- unplanned-event timestamp fallback
- duplicate news suppression
- speech incremental recalculation
- prepared-speech vs Q&A separation
- scenario distribution conversion to price bands
- currency-strength pair orientation
- stale quote cannot report streaming/live
- fallback order WebSocket -> REST -> snapshot
- no secret leakage
- HTML/JS syntax
- mobile navigation state
- command palette

## 29. Acceptance criteria

v4.2 is acceptable when:

1. Gold, Forex and Crypto are accessible as working dashboard areas.
2. Planned events show Advance scenario distributions before the release.
3. Unplanned news automatically creates a live event and recalculates affected assets.
4. Live/rolling speeches update classification and model output as materially new remarks arrive.
5. FX displays exact pre/post prices, signed pips, max excursions and event ranges.
6. XAU displays exact prices, dollar/percent/provider-point movement.
7. BTC/ETH display exact price and percentage event reactions.
8. Expected pressure and observed movement are never conflated.
9. All user-facing timestamps display in `Asia/Kuala_Lumpur` while UTC remains canonical internally.
10. Every event exposes timestamp/source quality.
11. Pre-event models pass anti-leakage tests.
12. No API secret is exposed in GitHub Pages or public logs.

## 30. Implementation boundary

The first production implementation should prioritize a correct, auditable event engine and truthful data state over adding more instruments or decorative analytics. Historical-model sophistication may grow incrementally once reliable event-aligned data has accumulated.
