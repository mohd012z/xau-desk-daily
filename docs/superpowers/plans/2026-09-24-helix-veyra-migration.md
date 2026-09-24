# HELIX / VEYRA Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely migrate the current XAU-DESK codebase toward the internal HELIX platform and public VEYRA application identity while preserving the working market/news pipeline and preparing the codebase for the later Intelligence/APK integration.

**Architecture:** Preserve existing macro/news/data modules first. Introduce rename-safety tests and centralized product metadata before changing user-facing branding. Repository rename occurs only after all code/workflows are independent of `xau-desk-daily`. BBMA/Intelligence runtime/router work is a later gate because those source files are not present in this repository branch.

**Tech Stack:** JavaScript/ES modules, Node.js test runner, HTML/CSS, GitHub Actions, GitHub Pages; Android/Capacitor integration only when the Android source becomes present.

**Spec:** `docs/superpowers/specs/2026-09-24-helix-migration-design.md`

## Global Constraints
- Public product identity is `VEYRA`.
- Internal project family is `HELIX`.
- Intended repository rename is `xau-desk-daily` -> `helix`, but only after rename-safety checks pass.
- `news_ifxhelper` -> `helix-pulse` is a separate repository migration and must not be performed from this repository.
- Preserve existing Android application ID/package/signing identity during the first migration.
- Existing market/news collection and validation behavior must remain functional.
- No privileged API/service/payment credentials may be committed or bundled in public clients.
- Do not treat neutral filenames, minification, or branding separation as a security boundary.

## Review Focus
1. A workflow or HTML file contains the literal `xau-desk-daily` and would break after repository rename: rename-safety test must fail with the exact file path.
2. A runtime URL embeds the GitHub repository name: endpoint audit must identify it rather than silently allowing repository coupling.
3. Product metadata is missing or malformed: identity loader must fail closed to defaults rather than crash the page.
4. Existing macro/news tests change behavior during branding work: full Node test suite must remain green after each task.
5. A generated/deployed artifact still exposes an obsolete product label after source migration: identity smoke test must inspect rendered/source HTML for legacy labels.

---

## Repository map relevant to this plan

Existing paths confirmed on the HELIX migration branch include:
- `.github/workflows/macro-desk-ci.yml`
- `.github/workflows/macro-phase3-ci.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/xauusd-daily.yml`
- `README.md`
- `index.html`
- `macro-preview.html`
- `macro/adapters/*`
- `macro/core/*`
- `docs/superpowers/specs/2026-09-24-helix-migration-design.md`

The previously discussed `bbma-runtime.js`, `bbma-dashboard-ui.js`, `bbma-router-fix.js`, `bbma-link.js`, `tools/prepare-web.js`, Capacitor project, and Android Gradle project are **not** part of this repository tree. Do not invent replacements in this phase.

---

### Task 1: Add rename-safety scanner

**Files:**
- Create: `tools/rename-audit.mjs`
- Create: `tests/rename-audit.test.mjs`
- Modify: `package.json` only if a package script is needed and the file already exists.

**Interfaces:**
- Produces: `scanPaths(root, patterns, options) -> Array<{file, pattern, line}>`
- CLI exits `0` when no forbidden repository-identity references are found and `1` when blocking references exist.

- [ ] **Step 1: Write failing scanner tests**

Create tests using a temporary directory. One fixture contains `https://raw.githubusercontent.com/mohd012z/xau-desk-daily/main/data.json`; another contains neutral content. Assert the first returns a finding containing its path/line and the second returns no findings. Add an ignore fixture under `docs/superpowers/` and verify historical/spec documentation can be excluded from blocking results.

- [ ] **Step 2: Run the test and verify failure**

Run:
```bash
node --test tests/rename-audit.test.mjs
```
Expected: FAIL because `tools/rename-audit.mjs` does not exist.

- [ ] **Step 3: Implement the scanner**

Implement recursive UTF-8 scanning for these blocking patterns:
```js
const DEFAULT_PATTERNS = [
  'xau-desk-daily',
  'mohd012z/xau-desk-daily',
  'raw.githubusercontent.com/mohd012z/xau-desk-daily'
];
```
Skip `.git`, `node_modules`, binary files, generated artifacts, and explicitly configured historical documentation. Print findings as `file:line pattern`.

- [ ] **Step 4: Run scanner tests**

```bash
node --test tests/rename-audit.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Run the scanner against the repository and save the result in the commit message/review notes**

```bash
node tools/rename-audit.mjs
```
Expected before remediation: either PASS or a finite list of exact coupling locations; never a crash.

- [ ] **Step 6: Commit**

```bash
git add tools/rename-audit.mjs tests/rename-audit.test.mjs package.json
git commit -m "test: add repository rename safety audit"
```

---

### Task 2: Introduce centralized HELIX/VEYRA identity metadata

**Files:**
- Create: `config/product-identity.mjs`
- Create: `tests/product-identity.test.mjs`

**Interfaces:**
- Produces immutable `PRODUCT_IDENTITY` with:
```js
{
  productName: 'VEYRA',
  platformName: 'HELIX',
  pulseName: 'HELIX Pulse',
  deepLinkScheme: 'veyra',
  repositoryTargetName: 'helix'
}
```
- Produces: `getProductIdentity(overrides = {})` returning a validated copy.

- [ ] **Step 1: Write failing identity tests**

Assert default values exactly match the interface above. Assert empty-string overrides are rejected and unknown override keys do not mutate the canonical object.

- [ ] **Step 2: Run tests**

```bash
node --test tests/product-identity.test.mjs
```
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement identity metadata**

Use `Object.freeze` for canonical metadata. `getProductIdentity()` accepts only known keys and falls back to canonical values for invalid/empty values.

- [ ] **Step 4: Run tests**

```bash
node --test tests/product-identity.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add config/product-identity.mjs tests/product-identity.test.mjs
git commit -m "feat: centralize HELIX VEYRA identity"
```

---

### Task 3: Audit and decouple GitHub Actions from repository identity

**Files:**
- Modify as required by findings:
  - `.github/workflows/macro-desk-ci.yml`
  - `.github/workflows/macro-phase3-ci.yml`
  - `.github/workflows/pages.yml`
  - `.github/workflows/xauusd-daily.yml`
- Test: `tests/rename-audit.test.mjs`

**Interfaces:**
- Consumes: `tools/rename-audit.mjs`.
- Produces workflows with no runtime dependency on literal `xau-desk-daily` where GitHub-provided context or relative paths can be used.

- [ ] **Step 1: Run rename audit specifically against `.github/workflows`**

```bash
node tools/rename-audit.mjs .github/workflows
```
Record exact findings.

- [ ] **Step 2: Add regression fixtures/tests for every workflow coupling form found**

For each actual form found, add a fixture to `tests/rename-audit.test.mjs` proving it is detected.

- [ ] **Step 3: Replace repository-specific references**

Use repository-relative paths, `${{ github.repository }}`, `${{ github.repository_owner }}`, `${{ github.ref_name }}`, or existing workflow outputs as appropriate. Do not replace stable external data identifiers such as the `XAUUSD` symbol merely because they contain XAU.

- [ ] **Step 4: Verify workflow YAML remains parseable and audit clean**

Run existing workflow/static tests plus:
```bash
node tools/rename-audit.mjs .github/workflows
```
Expected: no blocking findings.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows tests/rename-audit.test.mjs
git commit -m "ci: decouple workflows from repository name"
```

---

### Task 4: Apply VEYRA user-facing branding without changing market semantics

**Files:**
- Modify: `index.html`
- Modify: `macro-preview.html`
- Modify: `README.md`
- Create: `tests/branding.test.mjs`

**Interfaces:**
- Consumes canonical values from `config/product-identity.mjs` for tests/documentation expectations.
- Produces user-visible `VEYRA` branding while leaving symbol identifiers such as `XAUUSD`, currency names, event data, and market logic unchanged.

- [ ] **Step 1: Write branding smoke tests**

Read `index.html` and `macro-preview.html`; assert each contains `VEYRA` in its application title/header context and does not contain obsolete user-facing `XAU-DESK` labels. Assert the files may still contain `XAUUSD` because it is a legitimate market symbol.

- [ ] **Step 2: Run tests and verify they fail before branding changes**

```bash
node --test tests/branding.test.mjs
```
Expected: FAIL on legacy branding.

- [ ] **Step 3: Update user-facing branding**

Change product titles, application headings, about/copy text, and README product identity to VEYRA. Where the project/platform name is relevant to developers, document HELIX separately. Do not rename market data fields, event schemas, symbols, or calculation identifiers.

- [ ] **Step 4: Run branding and existing tests**

```bash
node --test tests/branding.test.mjs
node --test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html macro-preview.html README.md tests/branding.test.mjs
git commit -m "feat: brand public application as VEYRA"
```

---

### Task 5: Centralize and audit runtime endpoints

**Files:**
- Create: `config/endpoints.mjs`
- Create: `tools/endpoint-audit.mjs`
- Create: `tests/endpoints.test.mjs`
- Modify only actual consumers discovered by repository search.

**Interfaces:**
- Produces `ENDPOINTS` grouped by responsibility (`pulse`, `history`, `live`, `config`) without embedding privileged credentials.
- Produces `auditEndpoint(url) -> {ok, reasons[]}`.

- [ ] **Step 1: Search the repository for HTTP(S), raw GitHub, and API endpoint literals**

Use repository search and record consumers. Do not change documentation examples unless they are executed/runtime configuration.

- [ ] **Step 2: Write failing endpoint tests**

Test that `auditEndpoint()` rejects URLs containing credentials, rejects non-HTTPS remote endpoints except explicitly allowed localhost test endpoints, and flags direct `raw.githubusercontent.com/.../xau-desk-daily/...` coupling. Test neutral HTTPS endpoints as valid.

- [ ] **Step 3: Implement endpoint registry/audit**

Keep public endpoint configuration centralized. Never add service-role keys, passwords, payment secrets, or Telegram bot tokens to this module.

- [ ] **Step 4: Migrate actual runtime consumers found in Step 1**

Replace duplicated endpoint literals with imports/configuration only where compatible with the current runtime. If `index.html` is intentionally standalone and cannot import the ES module without restructuring, expose a generated/static config object through the smallest compatible mechanism and cover it with tests.

- [ ] **Step 5: Run endpoint and full tests**

```bash
node --test tests/endpoints.test.mjs
node --test
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add config/endpoints.mjs tools/endpoint-audit.mjs tests/endpoints.test.mjs index.html macro-preview.html macro
git commit -m "refactor: centralize public runtime endpoints"
```

---

### Task 6: Add defensive secret/configuration audit

**Files:**
- Create: `tools/security/secret-scan.mjs`
- Create: `tests/secret-scan.test.mjs`
- Modify: `.gitignore` if required.

**Interfaces:**
- Produces `scanSecrets(root) -> findings[]` with redacted output.
- Scanner checks likely private-key blocks, common secret assignment patterns, service-role style credentials, bot-token-like assignments, and committed `.env` files while allowing `.env.example` placeholders.

- [ ] **Step 1: Write failing secret-scan tests using synthetic fake secrets only**

Fixtures must contain fake values such as `SERVICE_ROLE_KEY=fake_test_secret_12345`; never use real credentials. Verify findings redact values.

- [ ] **Step 2: Implement scanner**

Skip `.git`, dependencies, binary/generated files, and test fixtures when running repository mode. Treat `.env.example` as allowed only when values are clearly placeholders.

- [ ] **Step 3: Run tests**

```bash
node --test tests/secret-scan.test.mjs
```
Expected: PASS.

- [ ] **Step 4: Run against repository**

```bash
node tools/security/secret-scan.mjs
```
Expected: no confirmed committed secrets. If findings exist, stop migration and rotate/remove the affected credential before continuing.

- [ ] **Step 5: Commit**

```bash
git add tools/security/secret-scan.mjs tests/secret-scan.test.mjs .gitignore
git commit -m "security: add repository secret audit"
```

---

### Task 7: Add migration verification command/workflow gate

**Files:**
- Create: `tools/verify-migration.mjs`
- Create: `tests/verify-migration.test.mjs`
- Modify: `.github/workflows/macro-desk-ci.yml` or the most appropriate existing CI workflow after inspection.

**Interfaces:**
- `verify-migration.mjs` runs rename audit, branding checks, endpoint audit, and secret scan and exits non-zero if a blocking check fails.

- [ ] **Step 1: Write orchestration tests**

Inject/mock command runners so one failing child check makes the verifier return failure and all-green checks return success.

- [ ] **Step 2: Implement verifier**

Print one compact section per check and a final `HELIX/VEYRA MIGRATION: PASS|FAIL` summary.

- [ ] **Step 3: Add verifier to CI**

Run it before deployment/build steps so repository-name regressions cannot be deployed.

- [ ] **Step 4: Run locally**

```bash
node tools/verify-migration.mjs
node --test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/verify-migration.mjs tests/verify-migration.test.mjs .github/workflows
git commit -m "ci: gate HELIX VEYRA migration safety"
```

---

### Task 8: Repository rename readiness checkpoint

**Files:**
- Modify: `README.md` only if readiness documentation is missing.
- No repository rename is performed by this task unless the connected GitHub tool has explicit repository-administration support and the user separately confirms the final rename action.

**Interfaces:**
- Consumes all migration checks.
- Produces a clear GO/NO-GO report for `xau-desk-daily` -> `helix`.

- [ ] **Step 1: Run complete verification**

```bash
node --test
node tools/verify-migration.mjs
```
Expected: PASS.

- [ ] **Step 2: Search remaining old-name references**

Search `xau-desk-daily`, `XAU-DESK`, and old deep-link naming. Classify every remaining occurrence as historical documentation, legitimate market symbol/context, or blocker.

- [ ] **Step 3: Verify GitHub Pages/workflow assumptions**

Review `.github/workflows/pages.yml` and any README/deployment instructions. Confirm no hard-coded repository path is required after rename.

- [ ] **Step 4: Produce readiness result**

GO only if all blockers are removed. Otherwise list exact file/path and remediation.

- [ ] **Step 5: Commit documentation if changed**

```bash
git add README.md
git commit -m "docs: record HELIX rename readiness"
```

---

## Deferred gate: Intelligence / BBMA APK integration

Do not implement this from the current repository because the required source is absent. When the repository/branch containing the APK code is connected, create a separate implementation plan covering:

1. generated `www/index.html` bundle-contract testing;
2. `bbma-runtime.js` -> neutral strategy-runtime module migration;
3. centralized News/Pulse/Charts/Live/Intelligence router;
4. historical OHLC bootstrap and live continuation;
5. BOOTING / LOADING_HISTORY / HISTORY_READY / CONNECTING_LIVE / LIVE and degraded states;
6. MYT display normalization from canonical UTC timestamps;
7. VEYRA Android label/icon/splash/deep links while preserving application ID/signing identity;
8. APK asset inspection after Gradle build;
9. Android/Telegram alerts only after the runtime is green.

## Deferred gate: `news_ifxhelper` -> `helix-pulse`

This is a separate repository migration. Audit its workflows, runtime URLs, consumers, and external callers before renaming. Preserve its event/news contracts so VEYRA can consume Pulse without coupling to the repository name.

## Self-review result

- Spec coverage: this plan covers rename safety, HELIX/VEYRA identity, workflow decoupling, public branding, endpoint centralization, secret scanning, CI gating, and rename readiness. APK/router/runtime work is explicitly deferred because its source is absent.
- Placeholder scan: no implementation placeholder is intended as executable instruction; deferred work is separated into future gates rather than pretending missing source exists.
- Type consistency: `PRODUCT_IDENTITY`, `ENDPOINTS`, rename scanner, endpoint audit, secret scanner, and verifier have stable interfaces defined before use.
- Review focus: all five high-risk conditions map to tests/tasks above.
