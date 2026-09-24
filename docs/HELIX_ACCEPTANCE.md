# Current Migration Acceptance Criteria

Before `xau-desk-daily` may be renamed to `helix`:

- Existing market/macro tests pass.
- HELIX/VEYRA migration tests pass.
- `node tools/verify-migration.mjs` passes.
- Production and preview user-facing identity is VEYRA/VEYRA Pulse as designed.
- Legitimate symbols such as XAUUSD remain intact.
- No blocking runtime/deployment references depend on `xau-desk-daily`.
- Endpoint audit passes.
- Secret scan reports no confirmed committed credentials.
- Pages/workflow assumptions are repository-name independent.
- Review evidence is green before rename/merge.
