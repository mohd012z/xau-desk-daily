# VEYRA / HELIX Code360 Protection Design

## Purpose
Protect the VEYRA product and HELIX engineering platform against accidental disclosure, casual repository discovery, credential theft, endpoint abuse, and easy cloning while preserving the currently verified analytical/runtime behavior.

This design does not claim that client-side JavaScript, browser assets, or APK code can be made impossible to inspect. Anything delivered to a user device is treated as inspectable. Confidential algorithms and privileged credentials must remain server-side.

## Identity model
- Public product: `VEYRA`
- Internal engineering family: `HELIX`
- News/event subsystem: `HELIX Pulse`
- Intended internal repository family: `helix`, `helix-pulse`, and later protected services.
- Repository names, GitHub usernames, commit IDs, branch names, Actions URLs, and raw GitHub URLs are not part of the VEYRA runtime contract.

## Current-state constraints
The current repository contains the VEYRA web application, modular macro/event/history/runtime code, Python data-generation scripts, tests, workflows, migration/security tools, and GitHub Pages deployment. It does not currently contain an Android Gradle/Capacitor project. Android/APK work therefore begins as a new platform layer around the verified shared runtime rather than by assuming an existing APK tree.

## Security assumptions
Treat these as untrusted/inspectable:
- Browser JavaScript and CSS.
- Generated `www/` assets.
- APK resources, assets, bytecode, and network behavior.
- User devices and local storage.
- Public network requests.

Never rely on file-name obscurity, minification, encryption with a client-embedded decryption key, or APK obfuscation as the primary security boundary.

## Target architecture

```text
                         VEYRA
                 Web + Android clients
                          |
                 Public client runtime
                          |
                    HTTPS contract
                          |
              +-----------+-----------+
              |                       |
        Authentication            Rate limits
              |                       |
              +-----------+-----------+
                          |
                   HELIX protected API
                          |
       +------------------+------------------+
       |                  |                  |
  provider access    protected logic    alert delivery
       |                  |                  |
       +------------------+------------------+
                          |
                     secret store
```

## Code classification

### Level 1 — Public/distributable
May ship in web/APK:
- UI and routing.
- Charts and presentation.
- MYT display formatting.
- Common mathematical indicators.
- Non-sensitive normalization and validation.
- Explicit runtime health rendering.

### Level 2 — Client minimized
May ship but should be bundled/minified and have no secrets:
- Client state management.
- BBMA/Intelligence presentation and common calculations.
- Alert presentation/deduplication that does not require privileged credentials.
- API clients with public endpoint identifiers only.

### Level 3 — Protected HELIX services
Must not ship when confidentiality or privilege matters:
- Private provider routing.
- Paid/private feed access.
- Telegram delivery credentials and privileged send operations.
- Account/subscription entitlement decisions.
- Selected proprietary decision logic explicitly designated private.

### Level 4 — Secret store only
Never committed or bundled:
- Provider API secrets.
- Telegram bot tokens.
- Database service-role credentials.
- Payment/webhook secrets.
- Android release-signing private material.
- Backend signing/encryption keys.

## GitHub privacy and runtime decoupling
The strongest repository privacy control is private repository visibility plus explicit authorized access. Obscure repository names are not a security control.

VEYRA production runtime must not depend on GitHub repositories. Target:

```text
VEYRA -> neutral HTTPS endpoint -> HELIX service -> providers/data
```

Avoid production runtime dependencies such as:
- `raw.githubusercontent.com/<owner>/<repo>/...`
- GitHub Pages paths that encode private repository identity after migration.
- GitHub API calls from VEYRA clients.

Authorized AI tools may access private repositories only through explicit user-authorized GitHub connections. No universal AI/repository master credential is embedded in VEYRA.

## Shared HELIX client architecture

```text
src/
  core/
    time/
    instruments/
    normalization/
    health/
    state/
  pulse/
    events/
    relevance/
    revisions/
    speech/
    impact/
  intelligence/
    candles/
    bollinger/
    ema/
    momentum/
    extreme/
    mhv/
    csa/
    csak/
    reentry/
    mtf/
    news-context/
  history/
    bootstrap/
    distributions/
    reactions/
    anti-leakage/
  alerts/
    rules/
    priority/
    dedupe/
    dispatcher/
  ui/
    router/
    home/
    pulse/
    charts/
    intelligence/
    settings/
  platform/
    web/
    android/
```

Existing tested `macro/` modules migrate incrementally. No big-bang rewrite is permitted. Existing market/event/history behavior stays covered by its current tests while boundaries are introduced.

## Runtime data flow

```text
Historical OHLC ---+
                   +--> normalize --> candle store --> Intelligence engine
Live ticks --------+                           |              |
                                               |              +--> MTF state
Events/Pulse ----------------------------------+              +--> alerts
                                                              +--> UI
```

Canonical timestamps are UTC. `Asia/Kuala_Lumpur` conversion occurs at presentation/notification boundaries.

## Runtime health contract
Clients must expose explicit states instead of appearing frozen:
- `BOOTING`
- `LOADING_HISTORY`
- `HISTORY_READY`
- `CONNECTING_LIVE`
- `LIVE`
- `INSUFFICIENT_DATA`
- `STALE_DATA`
- `FEED_DISCONNECTED`
- `HISTORY_FAILED`
- `RATE_LIMITED`
- `OFFLINE`

## Endpoint contract
All runtime endpoints are centralized behind a provider/endpoint registry. Production builds use an allowlist. Remote production endpoints require HTTPS except explicitly scoped localhost development fixtures.

The client endpoint registry contains no privileged credential. Sensitive provider credentials terminate at HELIX protected services.

## Web protection
Production web build must:
- Bundle/minify client code where practical.
- Omit unnecessary source maps from public deployment.
- Avoid repository-identifying runtime URLs.
- Use a restrictive Content Security Policy compatible with required features.
- Avoid inline executable code where practical during modular migration.
- Validate remote data before use.
- Avoid storing privileged credentials in LocalStorage, IndexedDB, cookies readable by JavaScript, or static config.

## Android/APK blueprint

```text
VEYRA Android
  MainActivity
  HELIX web/shared runtime
  Native bridge
    connectivity
    notifications
    lifecycle
    secure preferences
    deep links
  Local data
    cache
    settings
    alert state
  Background work
    refresh
    notification dispatch
  Android security
    HTTPS/network policy
    WebView restrictions
    deep-link allowlist
    Android Keystore for device-bound secrets/tokens
    release signing outside repository
    R8/shrinking/obfuscation
    artifact inspection
```

The Android `applicationId` is stable and independent from GitHub repository names. Public display name and APK output use VEYRA. Deep-link scheme is `veyra://` with allowlisted routes such as `pulse`, `charts`, `intelligence`, and `alerts`.

## Android WebView rules
- Disable unnecessary file/content access.
- Do not enable arbitrary universal file access.
- Permit only required navigation origins.
- Validate deep-link input.
- Expose the smallest possible native bridge surface.
- Never expose methods that return privileged secrets to JavaScript.
- Production debugging is disabled.

## Local protection
Use encryption for data/credentials where it has a real security boundary:
- TLS for transit.
- Android Keystore for device-bound key material/tokens.
- Encrypted sensitive local state where necessary.
- Server-side secret storage for privileged credentials.
- Encrypted backups where appropriate.

Do not ship encrypted proprietary code together with its decryption key in the same client artifact.

## Artifact security gates
Both web and APK outputs are inspected after generation.

### Web bundle gate
Fail production build on unexpected occurrences of:
- owner-specific GitHub repository URLs;
- `raw.githubusercontent.com` runtime dependencies;
- internal repository names where not explicitly allowlisted;
- private/development hostnames;
- secret-like assignments;
- service-role credentials;
- Telegram bot tokens;
- unintended source-map references;
- debug-only configuration.

Third-party dependency metadata may legitimately contain GitHub URLs, so scanning uses explicit allowlists and path/context classification rather than banning every `github.com` string.

### APK gate
After build, inspect/unpack the release candidate and apply equivalent checks across assets/resources/bytecode-readable strings. Also verify:
- debug mode disabled for release;
- expected VEYRA identity;
- expected application ID;
- network security configuration;
- no signing private material;
- no development endpoints;
- no privileged credentials;
- no unnecessary public source maps.

## CI pipeline

```text
source
  -> unit/integration tests
  -> secret scan
  -> endpoint audit
  -> dependency/security audit
  -> prepare web
  -> generated web artifact audit
  -> web deploy candidate

shared source
  -> prepare web
  -> Capacitor/Android sync
  -> Android validation
  -> Gradle release/debug build
  -> R8/shrinking for release
  -> APK artifact audit
  -> signed release candidate
```

Tests validate generated outputs, not literal implementation strings inside builder source files.

## Alerts and Telegram
Client alert engine may calculate/display local conditions. Telegram privileged sending is performed through a protected HELIX service. Bot tokens never ship to VEYRA. Server validates authorization, payload schema, rate limits, and deduplication before delivery.

## Cloud/auth future boundary
Cloud/auth remains a later gate after runtime and APK stability. Authentication and authorization are server-authoritative. User-specific settings may sync through authenticated APIs. Privileged service keys remain server-side.

## Payment/Pro future boundary
If subscriptions are added, entitlement is server-authoritative and updated from verified provider events/webhooks. Browser redirects, LocalStorage flags, or APK preferences never grant Pro entitlement by themselves.

## Defensive security tooling
Extend existing tooling with:
- dependency audit;
- generated-web artifact scanner;
- APK artifact scanner;
- CSP/config audit;
- Android WebView/config audit;
- endpoint allowlist audit;
- release-mode audit.

Security tooling is defensive and must not introduce hidden backdoors, credential bypasses, log deletion, access-control bypasses, or covert privileged modes.

## Repository visibility migration
Repository privatization/renaming is an administrative operation and is performed separately after runtime dependencies are decoupled. Before privatization/rename:
1. verify no public runtime requires GitHub raw/Pages repository identity;
2. verify CI/deployment permissions and destinations;
3. preserve rollback references;
4. verify connected authorized development tools retain intended access;
5. then change repository visibility/name through authorized GitHub administration.

## Error handling
- Provider failure produces explicit degraded health state and safe cached/unavailable behavior.
- Protected API authorization failure does not fall back to privileged client-side behavior.
- Artifact scan failure blocks release.
- Missing history produces `INSUFFICIENT_DATA`/`HISTORY_FAILED`, never fabricated candles.
- Missing secrets fail server startup/deployment; clients never substitute embedded fallback secrets.

## Testing strategy
Preserve current tests and add contract tests for each new boundary:
- endpoint registry and allowlist;
- generated web artifact leak scanning;
- runtime health transitions;
- BBMA historical bootstrap and live continuation;
- alert deduplication;
- Android deep-link validation;
- WebView restrictions;
- APK artifact leak scanning;
- release/debug configuration separation;
- server/client secret boundary.

## Implementation order
1. Inventory/code-map and dependency/security baseline.
2. Generated-web artifact scanner and endpoint allowlist.
3. Shared HELIX module-boundary contract without behavior rewrite.
4. Historical OHLC bootstrap/provider interface.
5. BBMA Intelligence modules with tests.
6. Intelligence UI through existing central router.
7. Runtime health/freshness state.
8. Alert engine.
9. Web bundle verification/minification policy.
10. Android/Capacitor shell.
11. Native notification/connectivity/deep-link bridge.
12. Android release security configuration.
13. APK artifact scanner and CI build.
14. HELIX Pulse protected integration where needed.
15. Remove remaining production GitHub runtime coupling.
16. Privatize/rename repositories when administratively ready.
17. Add cloud/auth and protected HELIX backend capabilities as separate later specs.

## Success criteria
- Existing verified market/macro/event/history behavior remains green.
- VEYRA web and APK use one shared analytical source of truth.
- Production clients contain no privileged credentials.
- Generated web/APK artifacts contain no unapproved repository-identifying runtime URLs or internal endpoints.
- Protected operations execute server-side.
- APK has explicit hardened release configuration and artifact inspection.
- Runtime displays truthful readiness/freshness states.
- Repository visibility/name can change without breaking VEYRA runtime.
- Authorized development tools can access private repositories only through explicit user-authorized connections.
