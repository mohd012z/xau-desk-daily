# MACRO//DESK Phase 3 MYT Event Trade Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an event-centered Trade Plan that shows Malaysia-time event timing, historical conditional ranges, from/to price context, model pressure, observed reaction, confirmation/divergence and data-quality reasons without generating automatic order instructions.

**Architecture:** Extend the existing `macro/core` and `macro/events` modules with small pure modules for MYT time formatting, historical distributions and Trade Plan composition. The plan consumes existing event records, affected-asset mapping, speech revisions and reaction measurements, then exposes a stable view model to the macro UI. UTC remains canonical; MYT is derived only for display.

**Tech Stack:** Browser/Node ES modules (`.mjs`), Node built-in test runner, existing static GitHub Pages UI.

**Spec:** `docs/superpowers/specs/2026-09-16-xau-desk-v4-2-multi-asset-event-intelligence-design.md`

## Global Constraints

- User-facing event/signal timestamps use `Asia/Kuala_Lumpur` and label `MYT`; UTC remains canonical internally.
- Expected/model pressure and observed price reaction are separate fields.
- Allowed pressure values: `UP_PRESSURE`, `DOWN_PRESSURE`, `MIXED`.
- Trade Plan is analytical context, not an order ticket; no automatic order placement or deterministic BUY/SELL recommendation.
- Low sample/timestamp/feed/model quality must be visible rather than hidden behind a precise-looking output.
- Preserve existing Phase 1/2 event-record and speech-revision interfaces unless a tested additive field is required.

---

### Task 1: MYT event clock and countdown

**Files:**
- Create: `macro/core/time-myt.mjs`
- Create: `tests/js/time-myt.test.mjs`

**Interfaces:**
- Produces: `formatMyt(isoUtc): string`
- Produces: `countdownTo(eventTimeUtc, nowUtc): { phase: 'UPCOMING'|'ELAPSED', totalSeconds: number, text: string }`

- [ ] **Step 1: Write failing tests** for UTC→MYT date rollover and deterministic countdown using `2026-09-16T18:00:00Z -> 17 Sep 2026 02:00:00 MYT`.
- [ ] **Step 2: Run** `node --test tests/js/time-myt.test.mjs` and verify failure because the module does not exist.
- [ ] **Step 3: Implement** `formatMyt` with `Intl.DateTimeFormat(...,{timeZone:'Asia/Kuala_Lumpur'})`; implement signed countdown without using browser-local timezone.
- [ ] **Step 4: Run** `node --test tests/js/time-myt.test.mjs` and verify pass.
- [ ] **Step 5: Commit** `test/feat: add MYT event clock utilities`.

### Task 2: Historical conditional distribution and price-band conversion

**Files:**
- Create: `macro/core/distribution.mjs`
- Create: `tests/js/distribution.test.mjs`

**Interfaces:**
- Produces: `summarizeDistribution(samples): { n, median, p10, p25, p75, p90 }`
- Produces: `fxBandFromPips(prePrice, pipSize, distribution): object`
- Produces: `percentBandFromReturns(prePrice, distribution): object`

- [ ] **Step 1: Write failing tests** using fixed signed samples and assert median/50%/80% bands plus exact FX price conversion.
- [ ] **Step 2: Run** `node --test tests/js/distribution.test.mjs`; expect module-not-found failure.
- [ ] **Step 3: Implement** deterministic linear-interpolated quantiles and instrument-appropriate price conversion. Empty samples return `null` summary rather than fabricated values.
- [ ] **Step 4: Run** the distribution tests and verify pass.
- [ ] **Step 5: Commit** `feat: add event distribution and price-band math`.

### Task 3: Trade Plan quality gate

**Files:**
- Create: `macro/core/plan-quality.mjs`
- Create: `tests/js/plan-quality.test.mjs`

**Interfaces:**
- Produces: `assessPlanQuality({effectiveSampleSize,timeConfidence,feedState,modelAgreement}): {label,reasons}`

- [ ] **Step 1: Write failing tests** asserting low sample size, low timestamp confidence, stale/offline feed and model disagreement produce explicit reasons; strong inputs produce `MODERATE` or `HIGH` without reasons that are not present.
- [ ] **Step 2: Run** `node --test tests/js/plan-quality.test.mjs`; verify failure.
- [ ] **Step 3: Implement** transparent rule-based quality assessment. Never infer good quality from a recent pipeline generation timestamp.
- [ ] **Step 4: Run** tests and verify pass.
- [ ] **Step 5: Commit** `feat: add trade plan quality gate`.

### Task 4: Event Trade Plan composer

**Files:**
- Create: `macro/events/trade-plan.mjs`
- Create: `tests/js/trade-plan.test.mjs`

**Interfaces:**
- Consumes: `formatMyt`, `countdownTo`, distribution summaries, existing event record/reaction data.
- Produces: `buildTradePlan(input): TradePlanViewModel`
- `TradePlanViewModel` fields: `eventId,eventName,eventTimeUtc,eventTimeMyt,countdown,modelState,timeSource,timeConfidence,affectedAssets,pressure,observed,confirmation,historical,prices,quality,revisions`.

- [ ] **Step 1: Write failing tests** for an upcoming CPI event and a live speech event. Assert MYT date/time, pressure separated from observed reaction, `PENDING` before measurement, `DIVERGENCE` when pressure and observed direction oppose, and revision history remains intact.
- [ ] **Step 2: Run** `node --test tests/js/trade-plan.test.mjs`; verify failure.
- [ ] **Step 3: Implement** the pure composer. Map pressure/observed states only to descriptive confirmation; do not emit `BUY`, `SELL`, entry, stop-loss or take-profit fields.
- [ ] **Step 4: Run** tests and verify pass.
- [ ] **Step 5: Commit** `feat: compose MYT event trade plan`.

### Task 5: Integrate recalculation revisions

**Files:**
- Modify: `macro/events/recalculate.mjs`
- Modify: `macro/events/event-store.mjs` only if an additive persisted plan-revision field is required
- Create: `tests/js/trade-plan-recalculate.test.mjs`

**Interfaces:**
- Consumes: existing recalculation trigger/revision contract.
- Produces: append-only Trade Plan revision snapshots with `createdAtUtc`, derived MYT display time and reason.

- [ ] **Step 1: Write failing test** that creates an event, applies a material speech/news revision, recalculates, and verifies the prior plan revision still exists.
- [ ] **Step 2: Run** `node --test tests/js/trade-plan-recalculate.test.mjs`; verify failure.
- [ ] **Step 3: Implement** additive revision persistence without overwriting what the model knew previously.
- [ ] **Step 4: Run** recalculation plus existing `recalculate`, `event-store` and `speech` tests.
- [ ] **Step 5: Commit** `feat: preserve trade plan recalculation history`.

### Task 6: Render Trade Plan in macro UI

**Files:**
- Inspect/modify the existing files under `macro/ui/` that own dashboard composition; do not replace the root production `index.html` in this task.
- Create: `tests/js/trade-plan-ui.test.mjs`

**Interfaces:**
- Consumes: `TradePlanViewModel` from Task 4.
- Produces: semantic Trade Plan card with event clock, MYT timestamp, state, affected assets, pressure, observed reaction, confirmation, historical band, price context and quality reasons.

- [ ] **Step 1: Write failing DOM/string-render test** asserting `MYT`, `Asia/Kuala_Lumpur`, `UP_PRESSURE|DOWN_PRESSURE|MIXED`, observed state, confirmation state and quality reason are visible; assert no automatic `BUY setup`, `SELL setup`, `Stop loss` or `Take profit` labels are emitted by this card.
- [ ] **Step 2: Run** the UI test and verify failure.
- [ ] **Step 3: Implement** the card following existing macro UI patterns. Add Android `PLAN` navigation before `EVENTS` while preserving desktop navigation.
- [ ] **Step 4: Run** UI test and `node --check` on every modified browser JS file.
- [ ] **Step 5: Commit** `feat: add MYT Trade Plan dashboard card`.

### Task 7: Migrate useful supplied-file semantics without importing order instructions

**Files:**
- Modify: relevant `macro/ui/*` and/or snapshot adapter only where needed
- Create: `tests/js/trade-plan-migration.test.mjs`

**Interfaces:**
- Consumes: supplied-file concepts: instrument grouping, ATR/range context, next-event display, fundamental context.
- Produces: analysis-only fields in the new Trade Plan.

- [ ] **Step 1: Write failing test** that rejects hard-coded `SGT` labels and automatic ATR-derived entry/SL/TP output in the event Trade Plan while accepting ATR utilization/range context.
- [ ] **Step 2: Run** test and verify failure against any remaining migrated legacy wording.
- [ ] **Step 3: Implement** migration: convert event display to MYT, retain ATR as volatility/range reference, retain fundamental/source context, omit order geometry from the event card.
- [ ] **Step 4: Run** migration and UI tests.
- [ ] **Step 5: Commit** `refactor: migrate supplied trade-plan context to analysis view`.

### Task 8: Regression, security and acceptance verification

**Files:**
- Modify: `README.md` or macro documentation to describe MYT Trade Plan behavior
- Modify tests only for genuine regression coverage found during verification

**Interfaces:**
- Produces: verified Phase 3 implementation ready for later production-page integration.

- [ ] **Step 1: Run all JS tests:** `node --test tests/js/*.test.mjs`.
- [ ] **Step 2: Run syntax checks** for all modified `.mjs`/browser JS files with `node --check`.
- [ ] **Step 3: Search public source** for `TWELVE_DATA_API_KEY`, `NEWS_API_KEY`, `FRED_API_KEY`, raw `apikey=` values, hard-coded `SGT`, and automatic Trade Plan `BUY/SELL` order wording; fix any leakage/regression.
- [ ] **Step 4: Verify acceptance manually** with one upcoming event, one live/revised speech, one FX pair, XAU and BTC/ETH: all display MYT; pressure and observed reaction remain separate; low-quality inputs expose reasons.
- [ ] **Step 5: Update documentation** with the Trade Plan field definitions and state flow.
- [ ] **Step 6: Commit** `docs/test: verify Phase 3 MYT event trade plan`.

## Self-review

- Spec coverage: MYT timing, countdown, Advance/Live/Post event behavior, historical distributions, from/to price, pressure-vs-observed separation, confirmation/divergence, revision preservation and quality gates all have explicit tasks.
- No implementation task requires API secrets in the browser.
- The supplied `trade-plan.html`/`trade-plan.js` are treated as design input, not copied as a deterministic order generator.
- Phase 3 deliberately stops short of replacing the production root page; production integration remains a separately verified deployment step after this module passes regression tests.