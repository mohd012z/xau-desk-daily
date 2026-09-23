# HELIX Tools Map

Current migration tools:
- `tools/rename-audit.mjs`
- `tools/endpoint-audit.mjs`
- `tools/branding-audit.mjs`
- `tools/security/secret-scan.mjs`
- `tools/verify-migration.mjs`

Planned when relevant source exists:
- `tools/build/` generated-bundle verification
- `tools/router/` route/section invariants
- `tools/data/` history/freshness/OHLC validation
- `tools/cloud/` sync/integrity/restore
- `tools/android/` manifest/Capacitor/APK checks
- `tools/diagnostics/` provider/runtime health

Tooling should remain diagnostic, build-oriented, or defensive. Stealth, credential extraction, access-control bypass, or log-hiding capabilities are outside the HELIX tool design.
