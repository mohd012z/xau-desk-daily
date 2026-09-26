# VEYRA Professional Multi-Asset Live Chart — Design Specification

**Date:** 2026-09-26
**Status:** Design approved in conversation; implementation not started
**Scope:** HELIX market core, VEYRA web/APK chart, BBMA/MTF/news/alert synchronization

## 1. Objective

Upgrade VEYRA from a dashboard-style chart into a professional, realtime, mobile-first market chart with interaction and readability comparable to established trading terminals while retaining VEYRA's own visual identity. The same market truth must drive `index.html`, the VEYRA APK, BBMA calculations, MTF context, and alert presentation.

The first release is multi-asset rather than XAUUSD-only. It supports curated metals, Forex majors/crosses, and major crypto assets through an expandable symbol registry.

This system is analysis/observation infrastructure. It does not create broker orders, position sizes, SL/TP, or automatic BUY/SELL instructions from news.

## 2. Non-negotiable invariants

1. One canonical OHLC model feeds chart, indicators, BBMA, MTF, and alert state.
2. BBMA determines analytical direction; news/macro only contextualizes or gates that state.
3. A stale, missing, or invalid feed must never be presented as fresh/live.
4. Missing candles are backfilled from a valid source; synthetic flat candles are not fabricated merely to fill visual gaps.
5. Current/open candles are distinguishable from closed candles. Closed-candle confirmation rules cannot silently treat an open candle as closed.
6. Web and APK share the same chart/market engine contract.
7. Internal timestamps are UTC; user-facing trading/event times default to `Asia/Kuala_Lumpur` (MYT).
8. Provider-specific formats never leak into BBMA, chart, or alert consumers; adapters normalize them first.
9. Switching symbols/timeframes must not require a page reload.
10. News does not independently generate trade direction.

## 3. Initial symbol universe

### Metals
- XAUUSD
- XAGUSD

### Forex majors
- EURUSD
- GBPUSD
- USDJPY
- USDCHF
- USDCAD
- AUDUSD
- NZDUSD

### Forex crosses/minors
- EURGBP, EURJPY, GBPJPY
- AUDJPY, CADJPY, CHFJPY
- EURAUD, EURCAD, EURCHF, EURNZD
- GBPAUD, GBPCAD, GBPCHF, GBPNZD
- AUDCAD, AUDNZD, AUDCHF
- NZDCAD, NZDCHF, NZDJPY
- CADCHF

### Crypto initial set
- BTCUSD
- ETHUSD
- SOLUSD

The registry is expandable without modifying the renderer. Search, Favorites, Recent, and asset-class filtering keep the mobile symbol selector manageable.

## 4. Symbol registry

Each instrument declares at minimum:

- canonical symbol
- display name
- asset class
- base/quote asset or currency
- display precision/digits
- tick/price formatting metadata
- market/session policy
- supported timeframes
- provider symbol mappings
- relevant news currencies/assets

The chart never hard-codes XAUUSD-specific precision, sessions, or provider identifiers.

## 5. Provider architecture

Use a provider-agnostic router:

```text
Symbol Registry
      |
Provider Router
  |        |
Primary  Fallback
  \        /
   Feed Validator
        |
Canonical Market Store
```

Historical REST-style retrieval bootstraps the chart. A realtime stream or the best available incremental source updates the current candle. Provider failover is controlled rather than alternating providers tick-by-tick.

### Feed states

- CONNECTING
- LIVE
- STALE
- DELAYED
- OFFLINE
- MARKET_CLOSED

`MARKET_CLOSED` is not an error. Forex/metals are session-aware; crypto is treated as 24/7 where the selected provider supports it.

### Reconnection

Use bounded exponential backoff such as 1s, 2s, 5s, 10s, then 30s/periodic recovery. On recovery, request and reconcile the missing interval before declaring the feed LIVE.

## 6. Canonical market contracts

### Candle

```text
symbol
assetClass
timeframe
openTimeUTC
closeTimeUTC
open
high
low
close
volume
source
isClosed
freshness
```

Candle identity is `(symbol, timeframe, openTimeUTC)`.

Validation includes:

- `low <= open <= high`
- `low <= close <= high`
- timeframe-aligned timestamps
- duplicate rejection/reconciliation
- out-of-order update handling
- no accidental future candle
- explicit upstream correction path for already-closed candles

### Tick/current-price update

For a live candle:

- open = first valid price in the interval
- high = max(previous high, live price)
- low = min(previous low, live price)
- close = latest valid price

The UI must never manufacture prices while offline.

## 7. Timeframe aggregation

Canonical base data feeds incremental aggregation for:

- M1
- M5
- M15
- M30
- H1
- H4
- D1
- W1
- MN1

Do not download a fully independent dataset merely because the user presses another timeframe button when the canonical store can provide or aggregate it correctly. Provider historical data may be used for efficient bootstrap/backfill and must then be reconciled to the canonical model.

## 8. Cache and recovery

Use layered caching:

1. memory for active-session state;
2. persistent local storage for recent candles, symbol metadata, chart preferences, and drawings;
3. network for missing/new ranges.

On application start/resume:

```text
load cache -> render -> determine missing interval -> backfill -> reconcile -> connect live -> LIVE
```

When an APK resumes after backgrounding, it must not assume no candles were missed. Reconciliation occurs before fresh/live status is restored.

## 9. Shared processing pipeline

```text
Market Provider
      |
Canonical OHLC
  |      |       |
Chart  Indicators News/Event Mapping
         |
        BBMA
         |
        MTF
         |
 Shadow / Evidence
         |
  Alert Envelope
   |      |      |
 Web     APK   Telegram
```

The renderer is a consumer of market truth, not an independent market-data calculator.

## 10. Indicator and BBMA synchronization

The initial indicator layer supports:

- Bollinger Bands
- MA5 High/Low
- MA10 High/Low
- EMA50
- Volume where meaningful/available

BBMA overlays support the project's existing concepts including:

- Extreme
- MHV
- CSA
- CSAK
- Reentry

Every BBMA marker retains symbol, timeframe, candle identity, direction/state, detection timestamp, and evidence reference. A marker must be traceable to the candle data that produced it.

### Open versus closed candle

Open-candle setups may be labelled DEVELOPING/observation. Any rule that requires a candle close must only advance after `isClosed=true` and revalidation succeeds.

## 11. MTF context

The active chart timeframe is not the entire market context. The UI may summarize surrounding timeframes, for example:

```text
D1 up | H4 up | H1 up | M15 up | M5 neutral
```

MTF calculations use the same canonical store. Changing the visible timeframe does not erase higher/lower-timeframe context.

## 12. Symbol-aware news/event mapping

Events carry at minimum:

- affected currency/asset
- impact
- scheduled UTC time
- actual/forecast/previous when available
- source metadata
- affected canonical symbols

Examples: USD macro events map to relevant USD pairs and metals according to project policy; EUR events map to EUR pairs/crosses. Crypto-specific events only appear on relevant crypto instruments unless explicitly mapped more broadly.

News markers are an independent chart layer. They do not alter OHLC candles.

News/macro gate states are contextual, e.g. CLEAR, CAUTION, BLOCK. A BLOCK state must never be translated by a presentation layer into CONFIRMABLE.

## 13. Professional chart renderer

The renderer is mobile-first and suitable for both browser and Capacitor APK. Use a Canvas/WebGL-oriented rendering architecture for dense/high-frequency graphical layers; use DOM elements for menus, controls, labels, and accessibility where appropriate.

Logical layers:

1. grid/axes
2. candle layer
3. indicator layer
4. BBMA marker layer
5. news/event layer
6. drawing layer
7. interaction/crosshair layer

### Required visual behavior

- clear candle bodies and wicks at phone scale
- right-side price axis
- bottom time axis in MYT by default
- current-price marker
- OHLC strip
- candle countdown where meaningful
- responsive visible-candle density
- auto scale and manual vertical scale
- crisp high-DPI rendering
- portrait support
- near-fullscreen landscape mode

The visual identity is VEYRA's own; established platforms are interaction/readability references, not assets to copy.

## 14. Interaction model

### Mobile
- one-finger horizontal pan
- pinch zoom
- long-press crosshair
- drag price axis for vertical scale
- double-tap reset/auto-fit
- tap BBMA/news marker for details
- explicit `Go Live` control after browsing history

### Desktop/web
- mouse drag pan
- wheel zoom
- crosshair
- keyboard shortcuts may be added later

When a user pans into history, realtime updates continue internally but must not force the viewport back to the latest candle.

## 15. Chart modes

Three presentation modes:

- CLEAN — candle plus essential indicators
- BBMA — BB/MA/EMA plus compact BBMA markers
- ANALYSIS — BBMA, news, drawings, and expanded MTF/context layers

The mode changes presentation only; it does not change the underlying calculations.

## 16. Drawing tools

Initial drawing tools:

- crosshair
- horizontal line
- vertical line
- trendline
- rectangle
- Fibonacci retracement

Future BBMA-specific helpers may include Reentry/Extreme/BBMA zones.

Drawings are persisted against symbol + timeframe + drawing ID and must not affect BBMA calculations.

## 17. Alert contract and chart deep links

A unified alert envelope contains at minimum:

```text
id
symbol
assetClass
timeframe
candleId
createdAtUTC
bbma { direction, setup, state, evidence }
mtf
news
dataHealth
lifecycle
```

Telegram, APK notifications, and web/APK alert views render the same canonical alert state.

Alert dedupe identity should include symbol, timeframe, setup, direction, and candle identity. Repeated ticks inside one candle must not create repeated equivalent alerts.

VEYRA deep links should support opening the exact chart context, e.g. conceptually:

```text
veyra://charts?symbol=XAUUSD&tf=H1&alert=<id>&candle=<id>
```

Opening the link selects the symbol/timeframe, navigates to the relevant candle, and highlights the associated alert/BBMA/news context.

## 18. Performance model

Realtime ticks should update only affected state:

```text
tick -> current candle -> incremental indicators -> affected BBMA evaluation -> dirty render region
```

Avoid full-history download, full-indicator recomputation, full-DOM rebuild, or whole-application rerender on every tick.

Heavy aggregation/indicator/BBMA work should be isolated behind a worker-compatible interface so UI gestures remain responsive. Rendering may remain on the main thread where required by the chosen graphics implementation.

Pause or reduce expensive visual work while the app is backgrounded; reconcile on resume.

## 19. Data health diagnostics

Normal UI shows a concise state such as LIVE, DELAYED, OFFLINE, or MARKET CLOSED plus last-update time.

A diagnostics panel may expose:

- active provider
- latency/age
- last tick/update MYT
- fallback readiness
- unresolved gaps
- candle validity

BBMA/alert state receives data-health metadata. Incomplete/stale market data cannot silently appear as fresh confirmation.

## 20. Failure behavior

### Network/provider failure
Keep last valid chart visible, mark freshness accurately, reconnect/backfill, and never fabricate price movement.

### Gap detected
Request missing historical range, validate it, reconcile it, then recalculate only affected derived ranges.

### Provider disagreement
Prefer a healthy primary. Switch only after health validation; avoid tick-by-tick source oscillation. Record source transitions for diagnostics.

### Corrupt cache
Reject invalid entries, retain recoverable valid ranges, and rebuild missing state from network when possible.

## 21. Testing requirements

### Market/candle tests
- OHLC aggregation
- timeframe boundaries
- candle close/new candle transition
- duplicates
- out-of-order updates
- gaps/backfill
- provider failover/recovery
- upstream correction path

### Symbol tests
At minimum cover XAUUSD, EURUSD, USDJPY, a cross such as GBPJPY, BTCUSD, and ETHUSD to exercise differing precision/session behavior.

### UI/interaction tests
- portrait/landscape
- symbol switch
- timeframe switch
- pinch zoom/pan/crosshair
- auto/manual scaling
- Go Live behavior
- fullscreen
- marker selection

### Intelligence tests
- BBMA consumes canonical OHLC
- open versus closed candle semantics
- MTF alignment
- symbol-aware news mapping
- BLOCK cannot become CONFIRMABLE through presentation translation
- stale/incomplete data is propagated
- alert deduplication

### Recovery tests
- temporary internet loss
- provider loss
- application background/resume
- restart with cached candles
- stale/corrupt cache
- expected market close/reopen

## 22. Acceptance criteria

The design is implemented successfully when:

1. User can switch among supported metals, Forex pairs, and crypto without page reload.
2. Historical candles render quickly and the current candle updates from a valid live/incremental source.
3. M1 through MN1 switching works with correct boundaries.
4. Web and APK expose equivalent canonical OHLC/BBMA state.
5. Chart supports professional pan, zoom, crosshair, axes, price marker, fullscreen, and history browsing behavior.
6. BBMA/news overlays remain readable and independently toggleable.
7. Disconnect, stale, delayed, offline, and market-closed states are distinguishable.
8. Missing ranges are detected and backfilled without fabricated candles.
9. BBMA, MTF, chart, and alerts share the same market data contract.
10. Telegram/alert deep links can open the relevant symbol, timeframe, and alert candle in VEYRA.
11. Existing news/macro/Telegram capabilities are preserved while moving them onto the unified contract.
12. No broker execution, automatic order creation, SL/TP, or lot sizing is introduced by this chart project.

## 23. Delivery boundaries

### Included in this project
- symbol registry and provider mappings
- canonical market contracts/store
- historical + realtime/incremental feed routing
- fallback/health/reconciliation
- timeframe aggregation
- professional shared chart renderer
- indicator/BBMA/MTF synchronization
- symbol-aware news markers/gates
- alert envelope integration and chart deep-link handling
- cache/recovery
- automated tests for the above

### Deferred
- multi-chart grid workspace
- broker order entry/execution
- portfolio/account management
- advanced scripting language for custom indicators
- social/community features
- large unrestricted crypto universe in the first release

## 24. Implementation principle

Prefer focused modules with explicit contracts over expanding `index.html` or `app.js` into monolithic market engines. Existing UI entry points may remain, but market feed, normalization, aggregation, indicators, BBMA synchronization, chart state, and rendering should be independently testable units.
