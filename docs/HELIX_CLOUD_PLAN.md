# HELIX Cloud / Mirror Plan

Cloud work follows build/router/runtime stability.

Target layers:
- Local resilient cache: IndexedDB for web and SQLite for Android when available.
- Optional free-tier cloud database/storage for settings, snapshots, and synchronization.
- Snapshot metadata: schema version, source, timestamp, record count, checksum, and freshness.
- Incremental synchronization and explicit stale/offline states.

Cloud providers remain adapters. VEYRA must not depend on a single provider to render cached/local functionality.

Authentication and future entitlements are server-authoritative. Client-side flags such as `localStorage.pro = true` are never treated as authorization.
