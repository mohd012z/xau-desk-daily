# VEYRA Code360 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing VEYRA web/runtime foundation fully green and release-auditable before adding BBMA Intelligence, Android/APK, protected services, repository privatization, cloud, login, or Pro functionality.

**Architecture:** Preserve the verified market/macro/event/history runtime and add security/build contracts around it. Introduce generated-artifact inspection, endpoint allowlisting, runtime contracts, and truthful health-state schemas without a big-bang rewrite. Every stage must end green before the next capability gate begins.

**Tech Stack:** JavaScript ES modules, Node.js test runner, Python collectors, GitHub Actions, GitHub Pages. Android/Capacitor is deferred until this foundation gate is green.

**Spec:** `docs/superpowers/specs/2026-09-24-veyra-code360-protection-design.md`

## Global Constraints
- Public product identity is `VEYRA`; internal engineering identity is `HELIX`.
- Preserve all currently verified market/macro/event/history behavior.
- Canonical runtime timestamps remain UTC; Malaysia time is a presentation/notification concern.
- No privileged credential may be committed, generated into public web artifacts, or later bundled into an APK.
- Production runtime must become independent of GitHub repository identity before repository privatization/rename.
- Tests inspect generated artifacts, not implementation-string accidents inside builders.
- No big-bang rewrite of the existing `macro/` modules.
- Do not begin Android/APK implementation until this plan's final gate is green.

## Review Focus
1. Existing analytical behavior changes while security tooling is added.
2. Generated output leaks a GitHub owner/repository, raw GitHub runtime URL, secret-like value, source map, debug flag, or development endpoint.
3. Endpoint auditing blocks legitimate third-party metadata or misses production runtime coupling.
4. Runtime contracts disagree across web, future APK, and tests.
5. A security check is made green by weakening detection rather than classifying scope/allowlists correctly.

## File Map

Create:
- `config/runtime-contracts.mjs` — canonical candle, health, event-context, Intelligence-state, and alert contract definitions/validators.
- `config/endpoint-policy.mjs` — production endpoint allowlist/policy independent of credentials.
- `tools/artifacts/web-artifact-audit.mjs` — inspect generated web output for prohibited leakage.
- `tools/security/dependency-audit.mjs` — defensive dependency/config baseline with deterministic output.
- `tools/security/source-map-audit.mjs` — detect unintended public source-map/debug exposure.
- `tools/verify-code360-foundation.mjs` — orchestration gate.
- `tests/runtime-contracts.test.mjs`
- `tests/endpoint-policy.test.mjs`
- `tests/web-artifact-audit.test.mjs`
- `tests/dependency-audit.test.mjs`
- `tests/source-map-audit.test.mjs`
- `tests/code360-foundation.test.mjs`

Modify only as findings require:
- `config/endpoints.mjs`
- `tools/endpoint-audit.mjs`
- `tools/security/secret-scan.mjs`
- `.github/workflows/macro-phase3-ci.yml` and/or the verified primary CI workflow
- `.github/workflows/pages.yml`
- `.gitignore`
- `README.md`

## Task 1 — Baseline and freeze the currently green contract

- [ ] Record current main SHA and current successful workflow/check runs.
- [ ] Run/verify the complete existing JS, Python, migration, endpoint, rename, secret, syntax, and event-history checks.
- [ ] Create a short machine-readable baseline summary consumed by later verification only if the repository already has a suitable generated-report pattern; otherwise keep baseline evidence in CI logs and plan review notes.
- [ ] Do not modify runtime behavior in this task.
- [ ] Commit only documentation/config needed to preserve the baseline.

**Gate:** Existing suite remains green with zero functional changes.

## Task 2 — Canonical HELIX runtime contracts

- [ ] Write failing tests for `Candle`, `RuntimeHealth`, `EventContext`, `IntelligenceState`, and `Alert` validation.
- [ ] Candle requires symbol, timeframe, UTC open/close timestamps, OHLC numeric values, source, freshness, and completion state.
- [ ] RuntimeHealth accepts only: `BOOTING`, `LOADING_HISTORY`, `HISTORY_READY`, `CONNECTING_LIVE`, `LIVE`, `INSUFFICIENT_DATA`, `STALE_DATA`, `FEED_DISCONNECTED`, `HISTORY_FAILED`, `RATE_LIMITED`, `OFFLINE`.
- [ ] Alert contract requires symbol, timeframe, condition, timestamp UTC, freshness, and optional event/news context; it must not require Telegram credentials or delivery secrets.
- [ ] Implement immutable contract definitions and validators in `config/runtime-contracts.mjs`.
- [ ] Run focused tests, then full existing tests.
- [ ] Commit.

**Gate:** Contracts green; existing runtime unchanged.

## Task 3 — Production endpoint policy

- [ ] Write failing tests covering HTTPS-only remote production endpoints, explicit localhost development exceptions, credential-bearing URL rejection, owner/repository-specific raw GitHub runtime rejection, and allowlisted neutral endpoints.
- [ ] Implement `config/endpoint-policy.mjs` with path/context-aware classification.
- [ ] Integrate policy into existing `tools/endpoint-audit.mjs` without weakening existing checks.
- [ ] Audit actual runtime consumers and classify each endpoint as production, development, documentation, test fixture, or third-party metadata.
- [ ] Centralize duplicated production endpoint literals where compatible with the current standalone runtime.
- [ ] Run focused + full tests.
- [ ] Commit.

**Gate:** No unapproved production runtime coupling to repository identity.

## Task 4 — Generated web artifact leak scanner

- [ ] Write failing tests using synthetic artifact directories containing fake GitHub owner/repo URLs, raw GitHub runtime URLs, fake service-role secrets, fake Telegram-token assignments, `.map` references, debug flags, and development hosts.
- [ ] Include positive fixtures for legitimate third-party dependency metadata and explicit allowlist behavior.
- [ ] Implement `tools/artifacts/web-artifact-audit.mjs` with redacted findings and path/line/context reporting.
- [ ] Scanner must inspect generated HTML, JS, CSS, JSON, XML, manifests, and text/config assets while skipping binary data.
- [ ] Scanner must never print full detected secret values.
- [ ] Run tests.
- [ ] Commit.

**Gate:** Synthetic leaks are caught; legitimate allowlisted metadata is not falsely blocked.

## Task 5 — Source-map and debug-release audit

- [ ] Write failing tests for public `.map` files, `sourceMappingURL` references, production debug flags, and known development-only configuration markers.
- [ ] Implement `tools/security/source-map-audit.mjs`.
- [ ] Audit current Pages output contract and update build/deploy configuration only if actual exposure is found.
- [ ] Run focused + full tests.
- [ ] Commit.

**Gate:** Production candidate has no unintended source maps/debug configuration.

## Task 6 — Dependency/config security baseline

- [ ] Inventory package manifests/lockfiles and executable build dependencies actually present in the repository.
- [ ] Write deterministic tests for dependency/config audit behavior using synthetic manifests rather than depending on live registry availability.
- [ ] Implement `tools/security/dependency-audit.mjs` to flag unsupported local conditions, unsafe dependency source forms, and missing lock discipline where applicable.
- [ ] If a package manager native audit is available in CI, run it as an additional informational/blocking step according to severity policy; do not make the deterministic test suite depend on external registry availability.
- [ ] Run full tests.
- [ ] Commit.

**Gate:** Dependency/config baseline is reproducible offline; optional registry audit is separately reported.

## Task 7 — Build candidate and audit the actual generated web artifact

- [ ] Identify the exact Pages preparation output used by `.github/workflows/pages.yml`.
- [ ] Add a CI step that prepares the same artifact locally in the workflow before upload.
- [ ] Run `web-artifact-audit.mjs` and `source-map-audit.mjs` against that exact generated directory.
- [ ] Verify VEYRA identity and required runtime files still exist.
- [ ] Ensure artifact audit failure blocks upload/deploy.
- [ ] Run CI on a feature branch and inspect logs.
- [ ] Commit.

**Gate:** The deployable artifact, not merely source, passes security inspection.

## Task 8 — Unified Code360 foundation verifier

- [ ] Write orchestration tests where each child audit can fail independently and must fail the parent gate.
- [ ] Implement `tools/verify-code360-foundation.mjs` to run runtime-contract tests, endpoint policy/audit, secret scan, rename audit, dependency/config audit, source-map audit, generated-web artifact audit, and existing migration verifier as appropriate.
- [ ] Print concise PASS/FAIL sections and never leak detected secret values.
- [ ] Add to primary CI before Pages/deployment candidate promotion.
- [ ] Run complete suite locally/CI.
- [ ] Commit.

**Gate:** One command/CI stage represents Code360 foundation readiness.

## Task 9 — Repository-identity decoupling readiness

- [ ] Search deployable/runtime sources and generated artifact for current GitHub owner, `xau-desk-daily`, intended internal repo names, raw GitHub runtime URLs, Actions URLs, branch names, and commit-ID assumptions.
- [ ] Classify documentation/history/test fixtures separately from production blockers.
- [ ] Remove/replace production blockers through endpoint abstraction or neutral deployment configuration.
- [ ] Rebuild and re-run artifact audit.
- [ ] Document remaining intentional occurrences.
- [ ] Commit.

**Gate:** VEYRA runtime can operate without knowing the source repository identity.

## Task 10 — Final foundation verification and merge readiness

- [ ] Run all JavaScript tests.
- [ ] Run all Python tests/compilation currently used by CI.
- [ ] Run migration verifier.
- [ ] Run Code360 verifier.
- [ ] Build exact Pages artifact and audit it.
- [ ] Verify Pages workflow syntax/contract.
- [ ] Verify no existing market/event/history behavior regressed.
- [ ] Review diff for accidental credentials, generated junk, or broad unrelated refactors.
- [ ] Produce GO/NO-GO result.
- [ ] Merge only on GO.

**Gate:** COMPLETE GREEN FOUNDATION.

# Follow-on plans — execute only after Task 10 GREEN

## Plan B — Historical OHLC + runtime readiness
Build provider-neutral historical OHLC bootstrap, canonical candle store, live continuation, freshness calculation, and RuntimeHealth transitions. No BBMA signal is emitted until minimum data requirements are satisfied.

## Plan C — BBMA Intelligence
Implement tested Bollinger/EMA, Momentum, Extreme, MHV, CSA, CSAK, Re-entry, MTF state, and explainable signal composition as focused ES modules consuming canonical candles.

## Plan D — Pulse × Intelligence
Combine HELIX Pulse event/news context and historical reaction data with BBMA state without allowing news failures to corrupt market-state calculation.

## Plan E — VEYRA UI 360
Add Intelligence dashboard to the existing central router, MTF matrix, freshness/health display, timeframe controls, explainable condition details, and responsive mobile/desktop layouts.

## Plan F — Alert engine
Add deterministic rule evaluation, priority, cooldown/deduplication, local presentation, and delivery abstraction. Telegram remains server-side and is not embedded in clients.

## Plan G — Android/APK foundation
Create Capacitor/Android shell only after web/runtime gates are green. Share the same HELIX runtime; do not rewrite BBMA in Kotlin. Add network policy, deep-link allowlist, restricted WebView/native bridge, notification permission, lifecycle/connectivity bridge, and local persistence.

## Plan H — APK protection/build
Add release/debug separation, R8/shrinking, release signing outside repository, generated APK inspection, forbidden-string/secret/source-map/debug scans, and CI artifact production. Build output identity is VEYRA while application ID remains stable once chosen.

## Plan I — Protected HELIX services
Move privileged provider access, Telegram delivery, future proprietary/private calculations, auth/entitlement, and service credentials behind neutral authenticated HTTPS services.

## Plan J — Repository privacy transition
Only after web/APK runtime is GitHub-independent: rename internal repositories, change visibility to private through authorized administration, verify CI/deployment access, and confirm authorized development/AI connectors still work. Never embed a universal repository credential in VEYRA.

## Plan K — Cloud/login/Pro
Last stage: cloud sync, user accounts, multi-symbol user state, server-authoritative entitlement, and optional payments. Do not start until runtime, web, APK, and protected-service boundaries are stable.

## Completion rule
Do not skip ahead because a later feature is attractive. Each plan is a hard gate: tests + generated artifact + runtime contract must be green before proceeding to the next plan. On failure, diagnose root cause, add/repair the contract test, fix minimally, rerun the complete affected gate, and only then continue.
