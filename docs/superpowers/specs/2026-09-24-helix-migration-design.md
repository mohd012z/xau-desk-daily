# HELIX Migration Design

## Goal
Migrate the current XAU-DESK identity and architecture toward HELIX without breaking the existing trusted market/news pipeline, CI, web deployment, or Android compatibility.

## Product identity
- Product display name: HELIX
- Intended repository name: helix (rename occurs only after rename-safety verification)
- Public-facing strategy area: Intelligence
- Internal technical strategy terminology may remain descriptive where useful for maintainability.
- Existing Android application/package ID is preserved during the first migration unless a later explicit migration changes it.

## Principles
1. Preserve working XAU market/news collection and validation infrastructure.
2. Make repository paths and workflows independent of the old repository name before the GitHub rename.
3. Use one application router for News, Pairs, Analysis, Charts, Live, and Intelligence.
4. Test generated web output rather than implementation-source string literals.
5. Keep secrets and privileged credentials out of web/APK clients and Git.
6. Treat minification/neutral filenames as organization/casual-obscurity only, not as a security boundary.
7. Keep development/free infrastructure first; paid services are not required to finish the initial project.

## Naming map
| Current/legacy concept | HELIX target |
| --- | --- |
| XAU-DESK | HELIX |
| xau-desk-daily | helix (after audit) |
| BBMA Dashboard (public UI) | Intelligence |
| BBMA Runtime (public module label) | Strategy Engine |
| bbma-runtime.js | strategy-runtime.js (when source branch is available) |
| bbma-dashboard-ui.js | intelligence-ui.js |
| bbma-link.js | module-link.js |
| bbma-router-fix.js | navigation-bridge.js (temporary; remove after central router owns the route) |
| xau-desk://bbma | helix://intelligence |

## Target architecture
HELIX contains application sections for News, Pairs, Analysis, Charts, Live, and Intelligence. Market/news providers feed a normalized data layer. Strategy calculations consume normalized data rather than directly coupling to individual providers. The application router owns the single active section. Build tooling generates www/ and validates the final generated index and copied assets before Android/Gradle packaging.

## Build contract
The build gate must run the web preparation step and validate the generated www/index.html. It must confirm required runtime/UI/navigation/deep-link assets are present, ordered correctly, copied into www/, and not duplicated. Tests must not require literal script tags to appear in the prepare-web.js source implementation.

## Runtime states
The strategy runtime exposes explicit readiness states: BOOTING, LOADING_HISTORY, HISTORY_READY, CONNECTING_LIVE, and LIVE. Degraded/error states include INSUFFICIENT_DATA, STALE_DATA, FEED_DISCONNECTED, and HISTORY_FAILED. The UI renders these states rather than appearing frozen.

## Tools layout
Planned tool groups: tools/build, tools/router, tools/data, tools/bbma (internal technical validation where appropriate), tools/cloud, tools/web, tools/android, tools/test, tools/security, and tools/diagnostics. Security tools are defensive: dependency audit, secret scan, endpoint/config audit, WebView checks, HTTPS/CSP/CORS review, and entitlement tests.

## Cloud/auth later gates
Cloud/auth remains after build/router/runtime stability. A future free-first backend can provide authentication, per-user data isolation, cloud settings, and entitlement records. Privileged service keys never ship in browser/APK code. Pro/payment functionality, if later enabled, is server-authoritative and verified through backend payment events rather than browser redirects or localStorage flags.

## Migration sequence
1. Audit the current repository for hard-coded old names, deployment assumptions, URLs, badges, workflows, and app identity.
2. Add rename-safety tests and make CI/deployment repository-name independent.
3. Introduce HELIX user-facing identity without changing Android package identity.
4. Add/repair generated-bundle verification.
5. Centralize navigation when the BBMA/Intelligence source branch is available.
6. Add runtime readiness/freshness states.
7. Verify web and Android builds.
8. Rename the GitHub repository only after all rename-safety checks are green.
9. Add cloud/auth, then optional Pro/alerts/multi-symbol capabilities in later independently testable gates.

## Success criteria
- Existing trusted data/news tests remain green.
- No required build/deployment behavior depends on the literal old repository name.
- HELIX is the user-facing identity.
- Exactly one application section is active/visible at a time after router migration.
- Generated web bundle validation catches missing, duplicate, or incorrectly ordered required assets.
- Runtime displays explicit data readiness/freshness states.
- Existing Android installations are not broken by an unnecessary package-ID change.
- No secrets or privileged cloud/payment credentials are committed or bundled into public clients.
