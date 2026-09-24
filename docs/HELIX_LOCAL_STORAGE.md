# HELIX Local Storage Plan

Target local persistence:
- Web: IndexedDB.
- Android: SQLite when the native project is connected.

Appropriate cached state includes historical OHLC, Pulse/news cache, user settings, watchlist, alert preferences, runtime state, and last successful synchronization metadata.

Raw market/event records should remain distinct from derived Intelligence output so calculations can be regenerated after strategy changes. Cached stale data must be labeled stale rather than presented as live.
