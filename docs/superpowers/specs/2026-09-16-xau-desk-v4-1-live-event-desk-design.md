# XAU//DESK v4.1 — Live Event Desk Design

Date: 2026-09-16
Repository: `mohd012z/xau-desk-daily`
Status: Design approved in chat; pending written-spec review before implementation.

## Goal

Upgrade the current XAU//DESK live-hybrid dashboard into a production-oriented event desk that combines true XAU/USD streaming, Malaysia-time event handling, continuously refreshed news, event-centered reaction analysis, and the strongest UI ideas from the uploaded `index.html`, `app.js`, `live.js`, and `xauusd-data.js` files.

The dashboard is an analysis tool. Text/news classifications must not be presented as automatic order instructions. Market reaction and model context remain separate.

## Architecture

### 1. Market data path

Primary path:

`Twelve Data XAU/USD WebSocket -> secure Cloudflare Worker gateway -> GitHub Pages browser`

Fallback path:

`WebSocket unavailable -> secure REST quote endpoint -> last verified GitHub snapshot`

The UI must display truthful connection states:

- `STREAMING` — recent provider-origin tick is arriving.
- `DELAYED` — last provider tick is older than the streaming threshold but still recent.
- `STALE` — provider tick exceeds the stale threshold.
- `SNAPSHOT` — no live path; verified static snapshot is being displayed.
- `OFFLINE` — live and fallback network paths failed.
- `MARKET CLOSED` — only when the feed/session logic can support this conclusion.

The browser must not infer LIVE merely because a request completed recently. Provider/event timestamp is authoritative when available.

### 2. News and event path

`News / official event data -> secure Worker -> normalized UTC -> browser display in Asia/Kuala_Lumpur`

Every event item carries:

- `eventTimeUtc`
- `eventTimeMyt`
- `timeSource` (`official`, `provider`, `publisher`, or `received`)
- `importance`
- `category`
- `focusTimeframe`
- `ageMinutes` or countdown to event

MYT is the primary display timezone. UTC remains the canonical storage/computation timezone. London and New York clocks/sessions use IANA time zones so daylight-saving transitions are handled automatically.

### 3. Event-reaction engine

The engine aligns XAU/USD 1-minute data around a news/event timestamp.

For an event occurring inside a minute, the baseline is the last fully completed minute before the event minute. Example: an event at `18:30:35Z` uses the completed `18:29` bar as its pre-event baseline; the `18:30` candle is not allowed to contaminate the baseline.

Reaction windows:

- +1m
- +5m
- +15m
- +60m

Dynamic chart focus:

- 0–1m: M1
- 1–5m: M1–M5
- 5–15m: M5–M15
- 15–60m: M15–H1
- 1–4h: H1–H4
- >4h: H4–D1 context

The UI separately shows:

- text/news context (`UP_PRESSURE`, `DOWN_PRESSURE`, `MIXED`)
- observed XAU reaction
- divergence when text context and observed price reaction disagree

## User interface

### Desktop

Keep the left navigation rail, but reorganize around:

- Overview
- Live XAU
- News Incoming
- News Feed
- Event Reaction
- Speaker Watch
- Cross-Asset
- Range / Volatility
- Sources / Health

### Android / narrow screens

Use a bottom navigation bar rather than a narrow text sidebar:

`LIVE | NEWS | EVENT | MACRO | MORE`

Add a horizontal timeframe strip:

`M1 | M5 | M15 | H1 | H4 | D1`

### Command palette

Merge the uploaded `/` command palette idea. Desktop shortcut `/`; Android also gets a visible command/search button.

Initial commands:

- `/live`
- `/news`
- `/event`
- `/m1`, `/m5`, `/m15`, `/h1`, `/h4`, `/d1`
- `/macro`
- `/sources`
- `/range`
- `/theme dark`
- `/theme light`
- `/focus xau`

### Persistence

Use `localStorage` only for non-secret UI preferences:

- theme
- last selected panel
- timeframe
- collapsed/expanded panels
- news filter
- chart preference

Never store API keys or secrets in browser storage.

## Chart improvements

Retain click/tap-to-focus and crosshair behavior, but replace screen-percentage labels with real market values:

- MYT timestamp
- XAU/USD price
- delta from event baseline
- percent reaction from event baseline

Use pointer events so mouse, pen, and Android touch work consistently.

The live chart must distinguish real streamed points from static historical anchors.

## News Incoming panel

Retain the uploaded dedicated incoming-event concept, but calculate time dynamically rather than hard-code SGT/GMT strings.

Example presentation:

- Event name
- `17 Sep 2026 02:00 MYT`
- countdown (`00:14:37`)
- importance
- pre-event focus timeframe
- current post-event focus timeframe
- time-source badge
- source link

## Range and volatility panel

Retain and extend the uploaded calculator.

Auto-fill from verified data when available:

- open
- high
- low
- previous close
- ATR(14)
- current live price

Calculated context:

- realized range %
- true range
- TR / ATR
- ATR event-range reference
- ATR utilization %
- approximate ATR remaining
- distance to session high/low
- options-implied move only when valid IV/DTE inputs are available
- event-study observed reaction using the event engine

Manual inputs remain editable.

## Speaker and news analysis

Retain the transparent factor-model idea only as labeled model context. Remove automatic BUY/SELL presentation from the core XAU view.

Fix speaker ordering so zero-valued sort ranks (such as `hawkish: 0`) are not accidentally treated as missing.

Every externally sourced URL is validated to allowed HTTP(S) protocols before rendering.

## Cross-asset panel

Retain explanatory relationships but pair them with measured rolling context when data exists:

- Synthetic USDX
- Broad USD index
- nominal US 10Y
- real US 10Y
- 10Y breakeven inflation
- Brent
- optional BTC/Gold ratio
- 20D rolling correlations versus XAU where enough observations exist

Rules/relationships are labeled as context; rolling correlation is displayed separately as measurement.

## Source and health panel

For each source show:

- source name
- last observation time/date
- age
- status (`FRESH`, `AGING`, `STALE`, `UNAVAILABLE`)
- whether the value is live stream, intraday REST, or daily macro data

Pipeline generation time must never be shown as if it were market-quote age.

## Security

- API keys stay in GitHub Actions secrets and/or Cloudflare Worker secrets.
- Public HTML/JS contains no secret values.
- Worker CORS is restricted to the GitHub Pages origin (plus explicit development origins when required).
- External URLs are sanitized.
- Public snapshot redaction/validation remains mandatory.

## Reliability

WebSocket requirements:

- reconnect with capped exponential backoff
- heartbeat/watchdog
- provider timestamp validation
- duplicate/out-of-order tick handling
- clean unsubscribe/close behavior
- fallback to REST/snapshot without falsely reporting LIVE

A future shared Durable Object can fan one upstream WebSocket to many dashboard clients if connection-count pressure requires it. The first v4.1 implementation may keep the existing secure gateway interface as long as it preserves truthful status and documented connection limits.

## Explicit exclusions

- Prediction-market / gambling material is not part of v4.1.
- No automatic order placement.
- No API secrets in GitHub Pages.
- No simulated data may be labeled LIVE.
- No hard-coded SGT label; Malaysia display is MYT.

## Files expected to change

Likely implementation files:

- `index.html`
- browser JS split or existing app module(s)
- `worker/src/index.js`
- `worker/test/*`
- `scripts/update_xauusd.py`
- `scripts/market_math.py` only where new measured context is needed
- `tests/*`
- `.github/workflows/*` where validation/deployment needs extension
- `README.md` / `LIVE_SETUP.md`

The implementation should preserve the current daily verified snapshot pipeline and use it as the fallback layer rather than replacing it.

## Acceptance criteria

1. Opening GitHub Pages shows `STREAMING` only after a recent provider-origin XAU tick arrives.
2. If the live stream fails, the desk visibly moves through fallback states rather than keeping a false LIVE badge.
3. All event display is MYT, with UTC canonical timestamps retained internally.
4. Upcoming events have live countdowns and dynamic timeframe focus.
5. Event reaction uses a completed pre-event minute and exposes +1m/+5m/+15m/+60m measurements.
6. Text/news context and observed reaction are displayed separately.
7. Command palette and theme persistence work on desktop; Android has an accessible visible command control.
8. Chart focus/crosshair works with pointer/touch and reports real timestamp/price values.
9. Range panel auto-fills verified values when available and remains manually editable.
10. No prediction-market content is present.
11. No API secret appears in public files or generated snapshots.
12. Python tests, Worker tests, browser-JS syntax checks, snapshot validation, and workflow/YAML validation all pass before deployment is reported complete.
