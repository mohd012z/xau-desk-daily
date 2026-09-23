# HELIX Pulse Integration Contract

Planned repository migration: `news_ifxhelper` -> `helix-pulse`.

VEYRA must consume Pulse through a data/provider contract rather than depending on the GitHub repository name.

Minimum normalized event fields:
- `id`
- `timestampUtc`
- `displayTimeZone` (normally `Asia/Kuala_Lumpur` for the VEYRA UI)
- `title`
- `impact`
- `affectedAssets`
- `source`
- `freshness`

The repository rename must preserve the external event contract. Direct raw-GitHub URLs should be centralized behind endpoint configuration during the free-development phase and may later move behind HELIX Relay without requiring changes throughout the VEYRA UI.
