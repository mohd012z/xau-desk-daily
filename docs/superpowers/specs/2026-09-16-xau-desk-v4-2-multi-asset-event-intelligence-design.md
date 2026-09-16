# XAU//DESK v4.2 — Multi-Asset Event Intelligence Design

Date: 2026-09-16
Repository: `mohd012z/xau-desk-daily`
Status: Approved design, including MYT event Trade Plan layer.

## Goal

Upgrade XAU//DESK into a multi-asset event-analysis desk covering XAU/USD, major FX currencies and pairs, BTC/USD and ETH/USD, scheduled economic releases, central-bank decisions/speeches, and unplanned breaking news. The system estimates conditional ranges before planned events and continuously recalculates from actual event information and measured market reaction.

The dashboard is an analysis tool. It must distinguish model context from measured reaction and must not present automatic order instructions.

## Dashboard hierarchy

1. Market/data status
2. Next scheduled event or active unplanned event
3. MYT Event Trade Plan
4. Event surprise / speech shift
5. Immediate observed reaction
6. Currency-strength dashboard
7. Forex pair matrix
8. XAU/USD event analysis
9. Crypto event analysis
10. Cross-asset confirmation/divergence
11. Historical comparable-event distribution
12. Range/pip/volatility calculations
13. Source/timestamp audit and short event summary

Android uses bottom navigation: `PLAN | EVENTS | FX | METALS | MORE`. Desktop keeps the left rail plus command palette.

## Event states

Planned: `UPCOMING -> TRIGGERED -> LIVE -> SETTLING -> CLOSED`.

Unplanned: `DETECTED -> TRIGGERED -> LIVE -> SETTLING -> CLOSED`.

Unplanned events expose an `UNPLANNED` badge and timestamp-quality indicator.

## Event timestamps and Malaysia time

UTC is canonical for storage and computation. Every user-facing event, signal revision and reaction timestamp is displayed in `Asia/Kuala_Lumpur` and labeled `MYT`.

Timestamp hierarchy:
1. official scheduled/release timestamp
2. official transcript/statement timestamp
3. official provider/event timestamp
4. trusted news-provider event timestamp
5. article `publishedAt`
6. gateway `receivedAt`

Store `eventTimeUtc`, derived `eventTimeMyt`, `timeSource`, and `timeConfidence`. Do not hard-code SGT/GMT display strings.

## Unplanned-news detection and affected assets

The news layer detects materially new items using publication/provider time, official time where available, text, entities, impacted assets, urgency/materiality and duplicate suppression. Federal Reserve/US inflation/jobs map primarily to USD pairs, XAU, BTC/ETH and USD/yield context; ECB to EUR; BoE to GBP; BoJ to JPY; SNB to CHF; BoC to CAD; RBA to AUD; RBNZ to NZD; geopolitical shocks map to relevant safe-haven/risk/oil assets.

## Planned-event Advance Mode

Before a scheduled release, produce conditional scenario distributions using only pre-event information: event type, consensus, previous value, historical forecast-error distribution, pre-event spot, ATR/realized volatility, liquidity when available, trend, yield/rate differential, USD/real-yield context, session and comparable historical regimes.

Numeric scenarios: `-2σ`, `-1σ`, `near consensus`, `+1σ`, `+2σ`. Each scenario exposes signed center, 50% interval, 80% interval, implied price band and confidence. No post-event values are allowed in Advance Mode.

For numeric releases: `rawSurprise = actual - forecast` and `surpriseZ = (actual - forecast) / historicalStdForecastError`. Interpretation is event-series aware.

## Speech engine

Score communication separately across policy/rate path, inflation, labour, growth, financial conditions and balance-sheet/liquidity. Compare `currentSpeechScore` with pre-event `expectedSpeechScore`; `speechSurprise = currentSpeechScore - expectedSpeechScore`.

Prepared remarks, policy statement, press conference, Q&A and interviews/unscheduled comments remain separate when timestamps permit. Live speeches update on materially new text with debounce and preserve revision history. A reversal in Q&A must be visible rather than overwriting the prepared-remarks state.

## Event baseline and measured reaction

For an event at `18:30:35Z`, the completed-minute baseline is the `18:29` close, never the partially contaminated `18:30` candle. When tick/second data exist, also save the last valid quote immediately before the event timestamp.

Track +10s/+30s where supported and +1m/+5m/+15m/+30m/+60m/+4h as data permits. Preserve each model revision and measured reaction for audit.

## FX, XAU and crypto measurements

FX pip size comes from instrument metadata/provider configuration; typical defaults are 0.0001 and 0.01 for conventional JPY pairs. `pipMove = (priceAfter - priceBefore) / pipSize`. Save start/end prices, signed pips, max up/down excursions, event range, retracement and timing-to-threshold where meaningful.

XAU reports from/to price, dollar move, percentage move, provider points/ticks, max excursions, event range, ATR utilization and abnormal return. Never hard-code one universal gold-pip definition.

BTC/ETH report from/to price, dollar move, percentage return, max excursions and, where available, realized-volatility, volume and liquidity changes.

## Historical comparable-event and model layer

Similarity considers event type, central bank/speaker/role, topic, communication shift, inflation/rate regime, pre-event volatility/trend, session, rate differential, USD/yield context, positioning proxy when available and recency. Report all-event, similar-regime and very-close-match medians, effective sample size and 10/25/50/75/90 percentiles.

Models may include weighted historical similarity, regularized regression and conditional quantile estimates. Ensemble weights come from walk-forward historical accuracy. Direction frequency, absolute magnitude and signed median remain separate. Material disagreement reduces confidence and displays `MODEL DISAGREEMENT`.

## MYT Event Trade Plan

The Trade Plan is an event-centered analytical summary, not an order ticket. It consumes event state, historical distributions, volatility, affected-asset mapping, communication context and observed reaction.

Each card shows:
- event name
- full MYT date/time and `Asia/Kuala_Lumpur`
- countdown or elapsed event time
- event/model state (`ADVANCE`, `NOWCAST`, `LIVE REACTION`, `SETTLING`, `CLOSED`)
- timestamp source/confidence
- affected instruments
- model pressure (`UP_PRESSURE`, `DOWN_PRESSURE`, `MIXED`)
- observed reaction (`UP`, `DOWN`, `MIXED`, `NOT YET MEASURED`)
- confirmation (`CONFIRMED`, `PARTIAL`, `DIVERGENCE`, `PENDING`)
- historical comparable count/effective sample size
- signed median and 50%/80% range in instrument-appropriate units
- from price and conditional/observed to-price band
- data/model quality reasons

### Pre-event

Show scenario distributions and the frozen pre-event reference without choosing a deterministic direction. A live MYT clock shows now, event time and countdown.

### Live event

As actual release values or meaningful speech segments arrive, recalculate the model and append a revision. Show actual reaction separately at each measurement window.

### Post-event

Compare observed reaction with historical center/bands and label whether reaction is within, stronger than, weaker than, or divergent from the historical distribution.

### Quality gate

Low sample size, poor timestamp confidence, stale quote, unavailable live source or model disagreement reduces plan confidence. The UI must expose the reason and may show `LOW CONFIDENCE / INSUFFICIENT DATA`; it must not fabricate a precise level.

## Signal architecture

Signal context has four auditable layers:
1. news/speech context
2. historical conditional distribution
3. cross-asset confirmation
4. observed price reaction

Expected communication pressure and observed market movement are always separate. Do not convert a hawkish/dovish label directly into BUY/SELL.

Cross-asset descriptive states: `CONFIRMED`, `PARTIAL`, `DIVERGENCE`.

## Currency-strength dashboard

Orient each FX pair consistently to the currency being scored, normalize event return by pre-event volatility, and calculate a weighted mean. Display USD, EUR, GBP, JPY, CHF, CAD, AUD and NZD for +1m/+5m/+15m/+60m.

## Truthful data and model states

Market feed: `STREAMING`, `DELAYED`, `STALE`, `SNAPSHOT`, `OFFLINE`, and `MARKET CLOSED` only when supportable.

News timestamp: `OFFICIAL`, `PROVIDER`, `ARTICLE TIME`, `RECEIVED TIME`.

Model: `ADVANCE`, `NOWCAST`, `LIVE REACTION`, `SETTLING`, `CLOSED`.

Confidence uses effective sample size, regime similarity, model agreement, walk-forward error, interval calibration and data/timestamp quality. Display reasons, not only a score.

## Anti-leakage and validation

Advance features must be timestamped strictly before the event. Never use actual release values, speech text, post-event yields/USD movement or first-minute price in pre-event backtests. Use chronological walk-forward validation and evaluate MAE, RMSE, sign accuracy as a descriptive model metric, quantile pinball loss, interval coverage/calibration and error by event/regime.

## UI and useful uploaded-file features

Retain useful ideas from the supplied dashboard: persistent theme/settings, chart focus, range calculator, News Incoming, Speaker Watch, Cross-Asset panel and source/audit display. Replace hard-coded SGT labels with derived MYT. Replace static BUY/SELL order-summary presentation with the event-centered analytical Trade Plan described above. The supplied Trade Plan file already separates ATR-derived geometry from fundamental context, but production v4.2 must not turn that geometry into automatic order instructions.

## Security

API keys remain server-side/secret only. Public GitHub files/logs must not contain provider secrets. Validate external URL protocols, restrict Worker CORS to approved origins, escape public text, and redact sensitive query parameters.

## Testing requirements

Automated tests must cover pip size/signed pips, JPY pip handling, completed-minute baseline, unplanned timestamp fallback, duplicate suppression, incremental speech recalculation, prepared remarks vs Q&A, scenario-to-price bands, currency-strength orientation, stale quote cannot report live, fallback order, MYT formatting/countdown, Trade Plan pressure-vs-observed separation, low-confidence quality gate, revision preservation, no secret leakage, browser syntax, mobile PLAN navigation and command palette.

## Acceptance criteria

1. Gold, Forex and Crypto are working dashboard areas.
2. Planned events show Advance distributions before release.
3. Unplanned news creates a live event and recalculates affected assets.
4. Live speeches update model output as materially new remarks arrive.
5. FX shows exact pre/post prices and signed pip reactions; XAU and crypto use appropriate units.
6. Every user-facing event and signal timestamp is MYT; UTC stays canonical internally.
7. The Trade Plan shows event countdown/state, conditional distribution, from/to price context, model pressure, observed reaction, confirmation/divergence and quality reasons.
8. Expected pressure and observed movement are never conflated.
9. Every event exposes timestamp/source quality.
10. Pre-event models pass anti-leakage tests.
11. No API secret is exposed in GitHub Pages or public logs.
12. No automatic order placement or deterministic BUY/SELL recommendation is produced by the event engine.

## Implementation boundary

Prioritize a correct, auditable event engine and truthful data state over decorative analytics or additional instruments. Historical-model sophistication grows incrementally once reliable event-aligned data accumulates.