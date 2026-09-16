# MACRO//DESK Phase 1 Core Event Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe preview of the rebranded MACRO//DESK with multi-asset navigation and a tested event-reaction core for FX pips, XAU movement, digital-asset returns, event baselines, and truthful data states.

**Architecture:** Keep the existing production `index.html` unchanged during Phase 1. Add a modular preview page and pure JavaScript calculation modules that can be tested with Node without a build step. Adapt the current `xauusd-data.js` snapshot into the preview until live providers are connected in later phases.

**Tech Stack:** Static HTML/CSS/ES modules, Node built-in test runner, GitHub Pages, existing Python snapshot pipeline.

**Spec:** `docs/superpowers/specs/2026-09-16-xau-desk-v4-2-multi-asset-event-intelligence-design.md` plus `docs/superpowers/specs/2026-09-16-macro-desk-branding-addendum.md`

## Global Constraints

- Public display name: `MACRO//DESK`.
- Subtitle: `FX • Metals • Digital Assets Event Intelligence`.
- Main navigation: `METALS`, `FX`, `DIGITAL ASSETS`, `EVENTS`, `BRIEF`.
- User-facing time zone: `Asia/Kuala_Lumpur`; UTC remains canonical internally.
- Expected pressure and observed market reaction must remain separate.
- Do not expose API secrets in public files or logs.
- Do not label stale/snapshot data as streaming/live.
- FX pip size comes from instrument metadata; typical fallback is `0.0001`, JPY quote pairs `0.01`.
- XAU/USD reports dollar/percent/provider-point movement, not a hard-coded universal gold pip.
- Digital assets report price/percentage movement rather than FX pip terminology.
- Phase 1 must not replace the production `index.html`; use a preview page until all Phase 1 tests pass.

---

### Task 1: Instrument Metadata and Branding Constants

**Files:**
- Create: `macro/core/instruments.mjs`
- Test: `tests/js/instruments.test.mjs`

**Interfaces:**
- Produces: `BRAND`, `NAV_ITEMS`, `INSTRUMENTS`, `getInstrument(symbol)`, `getPipSize(symbol)`.
- Consumed by: event math and preview UI.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND, getPipSize, getInstrument } from '../../macro/core/instruments.mjs';

test('brand and pip metadata are canonical', () => {
  assert.equal(BRAND.name, 'MACRO//DESK');
  assert.equal(getPipSize('EUR/USD'), 0.0001);
  assert.equal(getPipSize('USD/JPY'), 0.01);
  assert.equal(getInstrument('XAU/USD').assetClass, 'metal');
  assert.equal(getInstrument('BTC/USD').assetClass, 'digital');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/js/instruments.test.mjs`

Expected: FAIL because `macro/core/instruments.mjs` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const BRAND = {
  name: 'MACRO//DESK',
  subtitle: 'FX • Metals • Digital Assets Event Intelligence'
};

export const NAV_ITEMS = ['BRIEF', 'EVENTS', 'METALS', 'FX', 'DIGITAL ASSETS'];

export const INSTRUMENTS = {
  'XAU/USD': { symbol: 'XAU/USD', assetClass: 'metal', tickSize: 0.01 },
  'EUR/USD': { symbol: 'EUR/USD', assetClass: 'fx', pipSize: 0.0001 },
  'GBP/USD': { symbol: 'GBP/USD', assetClass: 'fx', pipSize: 0.0001 },
  'USD/JPY': { symbol: 'USD/JPY', assetClass: 'fx', pipSize: 0.01 },
  'USD/CHF': { symbol: 'USD/CHF', assetClass: 'fx', pipSize: 0.0001 },
  'AUD/USD': { symbol: 'AUD/USD', assetClass: 'fx', pipSize: 0.0001 },
  'NZD/USD': { symbol: 'NZD/USD', assetClass: 'fx', pipSize: 0.0001 },
  'USD/CAD': { symbol: 'USD/CAD', assetClass: 'fx', pipSize: 0.0001 },
  'BTC/USD': { symbol: 'BTC/USD', assetClass: 'digital' },
  'ETH/USD': { symbol: 'ETH/USD', assetClass: 'digital' }
};

export function getInstrument(symbol) {
  return INSTRUMENTS[symbol] || null;
}

export function getPipSize(symbol) {
  return getInstrument(symbol)?.pipSize ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/js/instruments.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/core/instruments.mjs tests/js/instruments.test.mjs
git commit -m "feat: add MACRO DESK instrument metadata"
```

---

### Task 2: Event Baseline and State Machine

**Files:**
- Create: `macro/core/events.mjs`
- Test: `tests/js/events.test.mjs`

**Interfaces:**
- Consumes: UTC ISO timestamps and minute-bar arrays.
- Produces: `EVENT_STATES`, `floorEventMinute()`, `selectCompletedMinuteBaseline()`, `transitionEvent()`.

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { floorEventMinute, selectCompletedMinuteBaseline, transitionEvent } from '../../macro/core/events.mjs';

test('event at 18:30:35 uses completed 18:29 bar', () => {
  const bars = [
    { time: '2026-09-16T18:29:00Z', close: 4281.25 },
    { time: '2026-09-16T18:30:00Z', close: 4275.10 }
  ];
  assert.equal(floorEventMinute('2026-09-16T18:30:35Z'), '2026-09-16T18:30:00.000Z');
  assert.deepEqual(selectCompletedMinuteBaseline(bars, '2026-09-16T18:30:35Z'), bars[0]);
});

test('unplanned event follows detected to triggered to live', () => {
  assert.equal(transitionEvent('DETECTED', 'trigger'), 'TRIGGERED');
  assert.equal(transitionEvent('TRIGGERED', 'market_tick'), 'LIVE');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/js/events.test.mjs`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the event helpers**

```js
export const EVENT_STATES = ['UPCOMING', 'DETECTED', 'TRIGGERED', 'LIVE', 'SETTLING', 'CLOSED'];

export function floorEventMinute(iso) {
  const d = new Date(iso);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

export function selectCompletedMinuteBaseline(bars, eventIso) {
  const floorMs = Date.parse(floorEventMinute(eventIso));
  return bars
    .filter(b => Date.parse(b.time) < floorMs)
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))[0] ?? null;
}

export function transitionEvent(state, signal) {
  const key = `${state}:${signal}`;
  return ({
    'UPCOMING:trigger': 'TRIGGERED',
    'DETECTED:trigger': 'TRIGGERED',
    'TRIGGERED:market_tick': 'LIVE',
    'LIVE:settle': 'SETTLING',
    'SETTLING:close': 'CLOSED'
  })[key] ?? state;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/js/events.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/core/events.mjs tests/js/events.test.mjs
git commit -m "feat: add event baseline and state machine"
```

---

### Task 3: Multi-Asset Reaction Mathematics

**Files:**
- Create: `macro/core/reaction.mjs`
- Test: `tests/js/reaction.test.mjs`

**Interfaces:**
- Consumes: instrument metadata plus `before`, `after`, optional `high`, `low` prices.
- Produces: `calcFxReaction()`, `calcMetalReaction()`, `calcDigitalReaction()`.

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcFxReaction, calcMetalReaction, calcDigitalReaction } from '../../macro/core/reaction.mjs';

test('EURUSD signed pip movement and event range', () => {
  const r = calcFxReaction('EUR/USD', 1.08520, 1.08410, 1.08570, 1.08290);
  assert.equal(r.pips, -11);
  assert.equal(r.maxUpPips, 5);
  assert.equal(r.maxDownPips, -23);
  assert.equal(r.rangePips, 28);
});

test('USDJPY uses 0.01 pip size', () => {
  const r = calcFxReaction('USD/JPY', 154.44, 154.76, 154.80, 154.40);
  assert.equal(r.pips, 32);
});

test('XAU and BTC use dollar/percent movement', () => {
  assert.equal(calcMetalReaction(4280, 4268.02, 0.01).dollarMove, -11.98);
  assert.equal(calcDigitalReaction(78000, 77649).dollarMove, -351);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/js/reaction.test.mjs`

Expected: FAIL because module is missing.

- [ ] **Step 3: Implement calculation functions**

```js
import { getPipSize } from './instruments.mjs';

const round = (v, dp = 4) => Number(v.toFixed(dp));

export function calcFxReaction(symbol, before, after, high = null, low = null) {
  const pip = getPipSize(symbol);
  if (!pip) throw new Error(`No FX pip metadata for ${symbol}`);
  return {
    fromPrice: before,
    toPrice: after,
    pips: round((after - before) / pip, 1),
    maxUpPips: high == null ? null : round((high - before) / pip, 1),
    maxDownPips: low == null ? null : round((low - before) / pip, 1),
    rangePips: high == null || low == null ? null : round((high - low) / pip, 1)
  };
}

export function calcMetalReaction(before, after, tickSize = null) {
  const dollarMove = round(after - before, 2);
  return {
    fromPrice: before,
    toPrice: after,
    dollarMove,
    returnPct: round((after / before - 1) * 100, 4),
    providerPoints: tickSize ? round(dollarMove / tickSize, 1) : null
  };
}

export function calcDigitalReaction(before, after) {
  return {
    fromPrice: before,
    toPrice: after,
    dollarMove: round(after - before, 2),
    returnPct: round((after / before - 1) * 100, 4)
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/js/reaction.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/core/reaction.mjs tests/js/reaction.test.mjs
git commit -m "feat: add multi-asset event reaction math"
```

---

### Task 4: Truthful Feed Status Model

**Files:**
- Create: `macro/core/feed-status.mjs`
- Test: `tests/js/feed-status.test.mjs`

**Interfaces:**
- Produces: `classifyFeedStatus({providerTimestamp, now, hasSnapshot, networkFailed})`.

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFeedStatus } from '../../macro/core/feed-status.mjs';

const now = Date.parse('2026-09-16T06:00:30Z');

test('fresh provider tick is streaming', () => {
  assert.equal(classifyFeedStatus({ providerTimestamp: '2026-09-16T06:00:25Z', now }), 'STREAMING');
});

test('old cached object cannot be called streaming', () => {
  assert.equal(classifyFeedStatus({ providerTimestamp: '2026-09-16T05:58:00Z', now, hasSnapshot: true }), 'STALE');
});

test('snapshot is explicit when live path is unavailable', () => {
  assert.equal(classifyFeedStatus({ providerTimestamp: null, now, hasSnapshot: true, networkFailed: true }), 'SNAPSHOT');
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/js/feed-status.test.mjs`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement**

```js
export function classifyFeedStatus({ providerTimestamp, now = Date.now(), hasSnapshot = false, networkFailed = false }) {
  if (providerTimestamp) {
    const ageSec = (now - Date.parse(providerTimestamp)) / 1000;
    if (ageSec <= 10) return 'STREAMING';
    if (ageSec <= 30) return 'DELAYED';
    return 'STALE';
  }
  if (hasSnapshot) return 'SNAPSHOT';
  return networkFailed ? 'OFFLINE' : 'OFFLINE';
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/js/feed-status.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/core/feed-status.mjs tests/js/feed-status.test.mjs
git commit -m "feat: add truthful market feed states"
```

---

### Task 5: Snapshot Adapter for Existing Data

**Files:**
- Create: `macro/adapters/snapshot-adapter.mjs`
- Test: `tests/js/snapshot-adapter.test.mjs`

**Interfaces:**
- Consumes: current `window.XAUUSD_DATA`/snapshot-compatible object.
- Produces: normalized `{ status, updatedAt, instruments, events, sources }` object for the preview UI.

- [ ] **Step 1: Write a failing adapter test** with a minimal fake current snapshot and assert that XAU/USD is normalized as a metal instrument and stale data remains `SNAPSHOT`, never `STREAMING`.

- [ ] **Step 2: Run** `node --test tests/js/snapshot-adapter.test.mjs` and verify FAIL.

- [ ] **Step 3: Implement** a pure adapter that reads only documented snapshot fields, preserves unknown values as `null`, and never invents live timestamps.

- [ ] **Step 4: Run** the adapter test and the full JS suite:

```bash
node --test tests/js/*.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/adapters/snapshot-adapter.mjs tests/js/snapshot-adapter.test.mjs
git commit -m "feat: normalize existing snapshot for MACRO DESK"
```

---

### Task 6: MACRO//DESK Preview Shell

**Files:**
- Create: `macro-preview.html`
- Create: `macro/ui/app.mjs`
- Create: `macro/ui/macro-desk.css`
- Test: `tests/js/ui-contract.test.mjs`

**Interfaces:**
- Consumes: BRAND/NAV_ITEMS and normalized snapshot adapter.
- Produces: preview UI at `/macro-preview.html` without changing production `/index.html`.

- [ ] **Step 1: Write a failing UI contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('macro-preview.html', 'utf8');

test('preview exposes the new product identity and navigation', () => {
  assert.match(html, /MACRO\/\/DESK/);
  assert.match(html, /METALS/);
  assert.match(html, /FX/);
  assert.match(html, /DIGITAL ASSETS/);
  assert.match(html, /EVENTS/);
  assert.match(html, /BRIEF/);
});
```

- [ ] **Step 2: Run** `node --test tests/js/ui-contract.test.mjs` and verify FAIL.

- [ ] **Step 3: Implement the preview shell** with:
  - desktop left rail order `BRIEF`, `EVENTS`, `METALS`, `FX`, `DIGITAL ASSETS`, `HISTORY`, `SOURCES / STATUS`;
  - Android bottom bar `METALS | FX | EVENTS | DIGITAL | BRIEF`;
  - top status strip that can display `STREAMING`, `DELAYED`, `STALE`, `SNAPSHOT`, or `OFFLINE`;
  - placeholder panels for event summary, affected currencies, FX pip reactions, XAU movement, digital-asset reaction, and data/source audit;
  - no BUY/SELL order wording.

- [ ] **Step 4: Load existing `xauusd-data.js` before `macro/ui/app.mjs`** and show snapshot data only where fields exist. Unknown values must display `—`.

- [ ] **Step 5: Run syntax and UI contract checks**

```bash
node --check macro/ui/app.mjs
node --test tests/js/*.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add macro-preview.html macro/ui/app.mjs macro/ui/macro-desk.css tests/js/ui-contract.test.mjs
git commit -m "feat: add MACRO DESK multi-asset preview shell"
```

---

### Task 7: Event Reaction Summary Cards

**Files:**
- Modify: `macro/ui/app.mjs`
- Modify: `macro/ui/macro-desk.css`
- Test: `tests/js/ui-event-summary.test.mjs`

**Interfaces:**
- Consumes: results from `calcFxReaction`, `calcMetalReaction`, `calcDigitalReaction`.
- Produces: human-readable from/to price cards with measured movement and separate expected-pressure field.

- [ ] **Step 1: Write a failing renderer test** using a pure exported `formatReactionCard()` helper and verify:
  - EUR/USD includes `from`, `to`, and signed pips;
  - XAU/USD includes dollar and percent movement;
  - BTC/USD includes dollar and percent movement;
  - `expectedPressure` and `observedReaction` are distinct fields.

- [ ] **Step 2: Run test and verify FAIL.**

- [ ] **Step 3: Implement the formatter** and wire the preview cards.

- [ ] **Step 4: Run full JS suite**

```bash
node --test tests/js/*.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/ui/app.mjs macro/ui/macro-desk.css tests/js/ui-event-summary.test.mjs
git commit -m "feat: render multi-asset event reaction cards"
```

---

### Task 8: GitHub Actions Verification for Phase 1

**Files:**
- Create: `.github/workflows/macro-desk-ci.yml`

**Interfaces:**
- Runs on pull requests and pushes touching `macro/**`, `macro-preview.html`, or `tests/js/**`.

- [ ] **Step 1: Add workflow** using `actions/checkout`, `actions/setup-node` with a current supported Node release, then run:

```bash
node --test tests/js/*.test.mjs
node --check macro/core/instruments.mjs
node --check macro/core/events.mjs
node --check macro/core/reaction.mjs
node --check macro/core/feed-status.mjs
node --check macro/adapters/snapshot-adapter.mjs
node --check macro/ui/app.mjs
```

- [ ] **Step 2: Keep existing daily data and Pages workflows untouched.**

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/macro-desk-ci.yml
git commit -m "ci: verify MACRO DESK core modules"
```

- [ ] **Step 4: Verify the GitHub Actions run succeeds** before moving to Phase 2.

---

## Phase 1 Acceptance Check

Phase 1 is complete only when:

1. `/index.html` production remains unchanged.
2. `/macro-preview.html` loads on GitHub Pages.
3. The page displays `MACRO//DESK` and the new navigation labels.
4. EUR/USD and USD/JPY pip math pass automated tests.
5. XAU/USD uses dollar/percent/provider-point calculations.
6. BTC/ETH use dollar/percent calculations.
7. The 18:30:35 event baseline regression uses 18:29 completed minute data.
8. Stale cached data cannot appear as `STREAMING`.
9. All JS tests and syntax checks pass.
10. No secret values are present in the new public files.

## Subsequent Independent Plans

After Phase 1 passes, create and execute separate plans for:

- **Phase 2 — Event Ingestion & Speech Engine:** scheduled events, breaking/unplanned-news detection, duplicate suppression, rolling speech/Q&A classification, affected-asset mapping, timestamp provenance.
- **Phase 3 — Historical Reaction & Advance Model:** event-history schema, comparable-event search, surprise normalization, pip distributions, quantile/regression ensemble, confidence and walk-forward validation.
- **Phase 4 — Live Gateway & Production Cutover:** XAU/FX/digital live feeds, secure Cloudflare Worker, reconnect/fallback logic, news refresh, event-window persistence, final `index.html` replacement and GitHub Pages verification.
