# XAU Master Engine Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the tested contracts, time normalization, data-health gate, stable identities, and shadow-safe alert-candidate foundation for the Option A XAU master engine without changing production alert behavior.

**Architecture:** Extend the existing `macro/core` ESM modules with small focused modules and Node built-in tests. Phase 1 does not implement BBMA trading rules or send new notifications; it creates the deterministic interfaces those later phases consume. Existing `time-myt.mjs`, `feed-status.mjs`, event, reaction, pivot/target and plan-quality modules remain intact unless a compatibility test proves a minimal extension is required.

**Tech Stack:** JavaScript ES modules (`.mjs`), Node built-in `node:test` + `assert/strict`, existing GitHub Actions, JSON fixtures/contracts.

**Spec:** `docs/superpowers/specs/2026-09-24-xau-bbma-news-master-engine-design.md`

## Global Constraints

- `xau-desk-daily` is the technical/confluence authority.
- `News_ifxhelper` remains the verified macro/news and notification-delivery authority.
- UTC is canonical storage/interchange time; MYT is user-facing presentation time.
- No ad-hoc `+8 hours` conversion.
- A stale price feed blocks new technical confirmations.
- A stale/down news feed produces macro state `UNKNOWN`; it never means `NO_NEWS`.
- Detection, signal lifecycle, alert routing and delivery remain separate layers.
- Phase 1 must not change current production notification behavior.
- Secrets never enter integration payloads.
- Every new module is deterministic and side-effect free unless explicitly named as persistence I/O.

## Review Focus

1. UTC timestamps around midnight must render the correct next-day MYT date; Task 1 pins this with boundary tests.
2. Missing/invalid timestamps must fail validation rather than silently use the current clock; Task 1 and Task 3 pin this.
3. News-feed failure must become `UNKNOWN`, not an empty/no-news state; Task 3 pins this.
4. Re-evaluating an unchanged setup after process restart must preserve stable identity and remain deduplicatable; Task 4 pins deterministic IDs and Task 6 pins router behavior.
5. Integration objects containing credential-like fields must be rejected; Task 2 pins the security boundary.

---

## File Structure

Create:
- `macro/core/contracts.mjs` — validates/normalizes MacroEvent and AlertCandidate objects.
- `macro/core/data-health.mjs` — converts feed observations into explicit health/gating state.
- `macro/core/identity.mjs` — deterministic IDs for snapshots, analyses, signals and alerts.
- `macro/core/signal-state.mjs` — validates lifecycle states/transitions without BBMA rule logic.
- `macro/core/alert-router.mjs` — pure decision function for deliver/suppress/update.
- `tests/js/time-myt-boundary.test.mjs` — MYT boundary/regression tests.
- `tests/js/contracts.test.mjs` — contract and secret-boundary tests.
- `tests/js/data-health.test.mjs` — stale/missing feed behavior.
- `tests/js/identity.test.mjs` — deterministic identity tests.
- `tests/js/signal-state.test.mjs` — lifecycle transition tests.
- `tests/js/alert-router.test.mjs` — dedup/state-change routing tests.
- `data/contracts/macro-event.example.json` — non-secret example normalized news payload.
- `data/contracts/alert-candidate.example.json` — non-secret example master-engine output.

Existing files read/covered but not redesigned in this phase:
- `macro/core/time-myt.mjs`
- `macro/core/feed-status.mjs`
- `macro/core/events.mjs`
- `macro/core/reaction.mjs`
- `macro/core/pivot-target.mjs`
- `macro/core/plan-quality.mjs`

## Task 1: Pin canonical UTC -> MYT behavior

**Files:**
- Modify only if required by failing tests: `macro/core/time-myt.mjs`
- Create: `tests/js/time-myt-boundary.test.mjs`

**Interfaces:**
- Consumes: current exports from `macro/core/time-myt.mjs`.
- Produces: a tested conversion path that accepts an explicit UTC timestamp and returns deterministic MYT presentation; invalid/missing input does not silently become `now`.

- [ ] **Step 1: Inspect the current exports and write boundary tests against the existing public API**

The test cases must include these exact instants:

```js
const cases = [
  ['2026-09-24T12:30:00.000Z', '20:30'],
  ['2026-09-24T23:30:00.000Z', '07:30'],
];
```

The second case must assert the MYT calendar date is `2026-09-25`.

- [ ] **Step 2: Add invalid-input tests**

```js
assert.throws(() => convert(undefined));
assert.throws(() => convert('not-a-date'));
```

Adapt `convert` to the actual exported function name after inspection; do not create a second competing time utility.

- [ ] **Step 3: Run the focused test and verify any failure is real**

Run:

```bash
node --test tests/js/time-myt-boundary.test.mjs
```

Expected before implementation: PASS if the existing module already meets the contract; otherwise FAIL only on the uncovered boundary/validation behavior.

- [ ] **Step 4: Make the smallest compatible change to `time-myt.mjs` if required**

Do not change existing output formatting unnecessarily. Add strict input validation only where the tests demonstrate the gap.

- [ ] **Step 5: Run the focused test and existing JS tests**

```bash
node --test tests/js/time-myt-boundary.test.mjs
node --test tests/js/*.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add macro/core/time-myt.mjs tests/js/time-myt-boundary.test.mjs
git commit -m "test: pin MYT time boundaries"
```

## Task 2: Define normalized integration contracts

**Files:**
- Create: `macro/core/contracts.mjs`
- Create: `tests/js/contracts.test.mjs`
- Create: `data/contracts/macro-event.example.json`
- Create: `data/contracts/alert-candidate.example.json`

**Interfaces:**
- Produces: `normalizeMacroEvent(input) -> MacroEvent`; `normalizeAlertCandidate(input) -> AlertCandidate`.
- Throws `TypeError` for malformed required fields or prohibited credential-like fields.

- [ ] **Step 1: Write failing MacroEvent tests**

Required normalized keys:

```js
[
  'event_id', 'timestamp_utc', 'timestamp_myt', 'currency', 'title',
  'impact', 'status', 'actual', 'forecast', 'previous',
  'evidence_class', 'source_timestamp', 'verified', 'freshness'
]
```

Test an event such as:

```js
{
  event_id: 'USD-CPI-20260924-2030',
  timestamp_utc: '2026-09-24T12:30:00.000Z',
  currency: 'USD',
  title: 'CPI',
  impact: 'HIGH',
  status: 'UPCOMING',
  actual: null,
  forecast: '2.8%',
  previous: '2.7%',
  evidence_class: 'OFFICIAL_RELEASE',
  source_timestamp: '2026-09-24T12:00:00.000Z',
  verified: true,
  freshness: 'FRESH'
}
```

Expected: `timestamp_myt` is derived centrally from `timestamp_utc`, not trusted from conflicting caller input.

- [ ] **Step 2: Write failing AlertCandidate tests**

Required keys:

```js
[
  'signal_id', 'symbol', 'type', 'direction', 'timeframe', 'state',
  'priority', 'generated_utc', 'generated_myt', 'technical', 'bbma',
  'macro', 'data_health', 'engine_version', 'rule_version'
]
```

The contract accepts `direction: null` for non-directional system/event candidates but validates `BUY`/`SELL` when direction exists.

- [ ] **Step 3: Write the credential-boundary test**

These keys, case-insensitive, must cause rejection anywhere in an integration object:

```js
['telegram_bot_token', 'github_token', 'api_key', 'android_signing_password', 'secret']
```

Use a recursive key scan so nesting does not bypass the rule.

- [ ] **Step 4: Run tests to verify failure**

```bash
node --test tests/js/contracts.test.mjs
```

Expected: FAIL because `contracts.mjs` does not yet exist.

- [ ] **Step 5: Implement the minimal pure validators/normalizers**

`contracts.mjs` must:
- validate ISO UTC timestamps;
- derive MYT through the existing time utility;
- copy only documented contract fields;
- reject prohibited credential-like keys recursively;
- freeze or return fresh normalized objects so caller mutation cannot change source input by reference.

- [ ] **Step 6: Add the two example JSON payloads using dummy/public-safe values only**

No tokens, URLs with credentials, account IDs or signing material.

- [ ] **Step 7: Run tests**

```bash
node --test tests/js/contracts.test.mjs
node --test tests/js/*.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add macro/core/contracts.mjs tests/js/contracts.test.mjs data/contracts
git commit -m "feat: add master engine integration contracts"
```

## Task 3: Add explicit data-health gating

**Files:**
- Create: `macro/core/data-health.mjs`
- Create: `tests/js/data-health.test.mjs`

**Interfaces:**
- Produces: `evaluateDataHealth({ price, news, timeframes, nowUtc }) -> DataHealth`.
- `DataHealth` includes `price`, `news`, `timeframes`, `technical_confirmation_allowed`, `macro_state`, and `reasons`.

- [ ] **Step 1: Write failing fresh-data test**

```js
const result = evaluateDataHealth({
  nowUtc: '2026-09-24T12:31:00.000Z',
  price: { status: 'FRESH', timestamp_utc: '2026-09-24T12:30:30.000Z' },
  news: { status: 'FRESH', timestamp_utc: '2026-09-24T12:30:00.000Z' },
  timeframes: { D1: true, H4: true, H1: true, M30: true, M15: true, M5: true }
});
assert.equal(result.technical_confirmation_allowed, true);
assert.equal(result.macro_state, 'AVAILABLE');
```

- [ ] **Step 2: Write stale-price and missing-M5 tests**

Stale price must set `technical_confirmation_allowed=false`. Missing M5 must be represented explicitly and must not be silently converted to `false signal`; the reason must contain `TIMEFRAME_M5_UNAVAILABLE`.

- [ ] **Step 3: Write news-down test**

```js
assert.equal(result.news, 'UNKNOWN');
assert.equal(result.macro_state, 'UNKNOWN');
```

Technical availability may remain true if price/timeframe requirements are otherwise valid.

- [ ] **Step 4: Write invalid-clock test**

Missing/invalid `nowUtc` must throw instead of evaluating against the machine clock.

- [ ] **Step 5: Run test and verify failure**

```bash
node --test tests/js/data-health.test.mjs
```

- [ ] **Step 6: Implement `evaluateDataHealth` as a pure function**

Do not fetch network data. Do not send alerts. Keep thresholds/configuration passed in or expressed as named constants local to the module; later phases may externalize them.

- [ ] **Step 7: Run focused and full JS tests**

```bash
node --test tests/js/data-health.test.mjs
node --test tests/js/*.test.mjs
```

- [ ] **Step 8: Commit**

```bash
git add macro/core/data-health.mjs tests/js/data-health.test.mjs
git commit -m "feat: add master engine data health gate"
```

## Task 4: Add deterministic identities

**Files:**
- Create: `macro/core/identity.mjs`
- Create: `tests/js/identity.test.mjs`

**Interfaces:**
- Produces: `makeSignalId({ symbol, type, timeframe, anchorUtc, direction })` and `makeAlertId({ signalId, state, version })`.

- [ ] **Step 1: Write deterministic-ID tests**

The same semantic input with object keys in different order must produce the same ID. Direction/type/timeframe/time anchor changes must produce a different signal ID.

Expected human-readable prefix:

```text
XAUUSD-M15-BBMA_REENTRY-BUY-
```

The suffix may be a normalized compact UTC anchor plus a short deterministic hash.

- [ ] **Step 2: Write restart/dedup fixture test**

Construct the input twice as fresh objects and assert strict equality of the generated IDs. Do not use random UUIDs or process-local counters.

- [ ] **Step 3: Run test and verify failure**

```bash
node --test tests/js/identity.test.mjs
```

- [ ] **Step 4: Implement with Node built-in `crypto` only**

Canonicalize the fields in a fixed order before hashing. Do not hash secrets or full raw news payloads.

- [ ] **Step 5: Run tests**

```bash
node --test tests/js/identity.test.mjs
node --test tests/js/*.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add macro/core/identity.mjs tests/js/identity.test.mjs
git commit -m "feat: add deterministic signal identities"
```

## Task 5: Encode signal lifecycle independently of BBMA rules

**Files:**
- Create: `macro/core/signal-state.mjs`
- Create: `tests/js/signal-state.test.mjs`

**Interfaces:**
- Produces: `canTransition(from, to) -> boolean`; `transitionSignal(signal, to, atUtc, reason) -> Signal`.

- [ ] **Step 1: Write allowed-transition tests**

Pin this path:

```text
DETECTED -> WATCH -> SETUP -> CONFIRMED -> ACTIVE -> INVALIDATED
```

and this terminal alternative:

```text
ACTIVE -> EXPIRED
```

- [ ] **Step 2: Write forbidden-transition tests**

At minimum reject:

```text
DETECTED -> ACTIVE
INVALIDATED -> CONFIRMED
EXPIRED -> ACTIVE
```

- [ ] **Step 3: Require explicit transition time and reason**

Invalid/missing `atUtc` or blank reason throws. No implicit current time.

- [ ] **Step 4: Run test and verify failure**

```bash
node --test tests/js/signal-state.test.mjs
```

- [ ] **Step 5: Implement the finite-state transition table**

Keep BBMA rule evaluation out of this module. It only validates state mechanics and appends immutable transition history.

- [ ] **Step 6: Run tests and commit**

```bash
node --test tests/js/signal-state.test.mjs
node --test tests/js/*.test.mjs
git add macro/core/signal-state.mjs tests/js/signal-state.test.mjs
git commit -m "feat: add signal lifecycle state machine"
```

## Task 6: Add pure shadow-safe alert routing

**Files:**
- Create: `macro/core/alert-router.mjs`
- Create: `tests/js/alert-router.test.mjs`

**Interfaces:**
- Consumes: normalized AlertCandidate, prior delivered state, routing policy.
- Produces: `routeAlert({ candidate, previous, policy }) -> { action, reason, alert_id }` where `action` is `DELIVER`, `UPDATE`, or `SUPPRESS`.

- [ ] **Step 1: Write first-delivery test**

A valid `CONFIRMED` P2 candidate with fresh required data and no previous record returns `DELIVER`.

- [ ] **Step 2: Write unchanged-duplicate test**

The same signal ID/state/version presented again returns:

```js
{ action: 'SUPPRESS', reason: 'UNCHANGED_DUPLICATE', ... }
```

- [ ] **Step 3: Write lifecycle-update test**

Same `signal_id`, prior `SETUP`, candidate `CONFIRMED` returns `UPDATE`.

- [ ] **Step 4: Write stale-price test**

A candidate whose `data_health.technical_confirmation_allowed` is false cannot deliver a new confirmed technical signal; expected reason `DATA_HEALTH_BLOCK`.

- [ ] **Step 5: Write shadow-mode test**

With `policy.shadow_mode=true`, routing still computes the logical action but returns `delivery_enabled=false`. This is the Phase 1 guarantee that production channels are untouched.

- [ ] **Step 6: Run test and verify failure**

```bash
node --test tests/js/alert-router.test.mjs
```

- [ ] **Step 7: Implement the pure router**

Do not import Telegram, Android, HTTP, filesystem or GitHub APIs. Router output is data only.

- [ ] **Step 8: Run full JS regression suite**

```bash
node --test tests/js/*.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add macro/core/alert-router.mjs tests/js/alert-router.test.mjs
git commit -m "feat: add shadow safe alert router"
```

## Task 7: Add a Phase 1 contract smoke test

**Files:**
- Create: `tests/js/master-engine-phase1.test.mjs`

**Interfaces:**
- Consumes all Phase 1 modules.
- Produces an end-to-end in-memory proof that normalized news + healthy feeds + a synthetic confirmed candidate can be routed in shadow mode without external side effects.

- [ ] **Step 1: Write the smoke test**

The test must:
1. normalize one USD high-impact event;
2. evaluate healthy XAU/news/timeframe data;
3. create a deterministic signal ID;
4. construct and normalize a `CONFIRMED` BBMA Re-entry candidate;
5. route it with `shadow_mode=true`;
6. assert logical action `DELIVER` and `delivery_enabled=false`;
7. rerun the same candidate and assert deduplication when supplied as previous state.

- [ ] **Step 2: Run it**

```bash
node --test tests/js/master-engine-phase1.test.mjs
```

Expected: PASS once Tasks 1-6 are complete.

- [ ] **Step 3: Run the full existing JS test suite**

```bash
node --test tests/js/*.test.mjs
```

Expected: PASS with no production delivery calls.

- [ ] **Step 4: Commit**

```bash
git add tests/js/master-engine-phase1.test.mjs
git commit -m "test: verify master engine phase 1 contracts"
```

## Task 8: CI verification without production cutover

**Files:**
- Inspect: `.github/workflows/*`
- Modify the existing test workflow only if `tests/js/*.test.mjs` is not already executed.

**Interfaces:**
- Produces: CI proof that Phase 1 tests run on repository changes while production notification workflows remain unchanged.

- [ ] **Step 1: Inspect existing workflows**

Identify the workflow that currently runs JS tests. Do not create a duplicate workflow if an existing one can run `node --test tests/js/*.test.mjs`.

- [ ] **Step 2: Add the Phase 1 suite only if it is currently omitted**

The CI command must be:

```bash
node --test tests/js/*.test.mjs
```

Do not add Telegram/API secrets to the test job.

- [ ] **Step 3: Verify production delivery workflow files are unchanged**

Use `git diff -- .github/workflows` and confirm only test coverage changed, if any.

- [ ] **Step 4: Run local-equivalent tests before commit**

```bash
node --test tests/js/*.test.mjs
```

- [ ] **Step 5: Commit if CI required a change**

```bash
git add .github/workflows
git commit -m "ci: run master engine contract tests"
```

If no workflow change is required, record that result in the implementation review rather than creating a no-op commit.

## Phase 1 Exit Criteria

Phase 1 is complete only when:
- all existing JS tests pass;
- all new Phase 1 tests pass;
- UTC/MYT boundary behavior is deterministic;
- MacroEvent and AlertCandidate schemas reject malformed/credential-bearing input;
- stale price blocks confirmation;
- unavailable news becomes `UNKNOWN`;
- deterministic IDs survive reconstructed objects/restarts;
- signal lifecycle rejects illegal jumps;
- duplicate candidates are suppressible;
- shadow mode proves no external delivery occurs;
- production notification workflows/behavior have not been cut over.

## Deferred to Separate Plans

Not part of this Phase 1 implementation:
- exact BBMA Extreme/MHV/CSA/Re-entry/Momentum mathematical rules and fixtures;
- D1/H4/H1/M30/M15/M5 confluence policy;
- News_ifxhelper publisher implementation;
- Telegram/APK production cutover;
- `xaudesk-capacitor` packaging changes;
- historical replay/outcome statistics beyond existing reaction functionality.

Those receive separate plans after this foundation is green.
