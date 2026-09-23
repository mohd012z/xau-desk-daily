# HELIX Intelligence Runtime States

When the Intelligence/APK source is connected, the runtime must expose explicit readiness rather than presenting a frozen screen.

Normal progression:
`BOOTING -> LOADING_HISTORY -> HISTORY_READY -> CONNECTING_LIVE -> LIVE`

Degraded states:
- `INSUFFICIENT_DATA`
- `STALE_DATA`
- `FEED_DISCONNECTED`
- `HISTORY_FAILED`
- `RATE_LIMITED`
- `OFFLINE`

The UI should expose last successful update, data freshness, bar/history readiness, and feed state. Historical OHLC bootstrap must precede live continuation for indicators that require a meaningful lookback.
