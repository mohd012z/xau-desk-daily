# MACRO//DESK Phase 2 Event Ingestion & Speech Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested event-ingestion layer that detects scheduled and unplanned macro events from supported feeds, deduplicates them, maps affected assets, tracks timestamp provenance, classifies rolling central-bank communication, and updates the MACRO//DESK preview without changing the production homepage.

**Architecture:** Keep event detection, speech scoring, and source provenance as pure ES modules. Add a browser event-store that accepts the current `xauusd-data.js` snapshot immediately and also supports an optional secure gateway JSON endpoint later. UI consumers read normalized event records and model revisions; they do not know which provider supplied the event.

**Tech Stack:** Static HTML/CSS/ES modules, Node built-in test runner, existing GitHub Pages deployment, existing daily snapshot pipeline.

**Spec:** `docs/superpowers/specs/2026-09-16-xau-desk-v4-2-multi-asset-event-intelligence-design.md` plus `docs/superpowers/specs/2026-09-16-macro-desk-branding-addendum.md`

## Global Constraints

- Public display name remains `MACRO//DESK`.
- Production `/index.html` remains unchanged in Phase 2.
- All user-facing timestamps are displayed in `Asia/Kuala_Lumpur`; UTC is canonical internally.
- Unplanned events must expose `timeSource` and `timeConfidence`.
- Expected pressure and observed market reaction remain separate.
- Speech classification is contextual and descriptive; no automatic order instructions.
- Duplicate headlines/comments must not create duplicate active events.
- No API keys or provider secrets may be placed in browser code.
- Browser gateway support must be optional and fail safely back to the verified snapshot.
- Revisions must preserve what was known at each update rather than overwrite history.

---

### Task 1: Event Record and Timestamp Provenance

**Files:**
- Create: `macro/events/event-record.mjs`
- Test: `tests/js/event-record.test.mjs`

**Interfaces:**
- Produces: `TIME_SOURCES`, `resolveEventTime(input)`, `createEventRecord(input)`.
- Event records contain: `id`, `kind`, `state`, `title`, `eventTimeUtc`, `timeSource`, `timeConfidence`, `source`, `url`, `text`, `entities`, `affectedAssets`, `speech`, `revisions`.

**Required behavior:**
- Timestamp priority: official scheduled -> official transcript/statement -> provider event -> trusted provider published -> article published -> gateway received.
- Missing exact event time must be labeled, never invented.
- IDs are deterministic from source/title/time bucket so repeated ingestion can dedupe.

**Verification:** `node --test tests/js/event-record.test.mjs`.

---

### Task 2: Affected-Asset Mapping

**Files:**
- Create: `macro/events/affected-assets.mjs`
- Test: `tests/js/affected-assets.test.mjs`

**Interfaces:**
- Produces: `inferAffectedAssets({title,text,entities})`.

**Required behavior:**
- Fed/US CPI/jobs -> USD majors, XAU/USD, BTC/USD, ETH/USD, DXY/yields context.
- ECB -> EUR pairs first.
- BoE -> GBP pairs first.
- BoJ -> JPY pairs first.
- SNB/BoC/RBA/RBNZ similarly map to CHF/CAD/AUD/NZD.
- Material geopolitical shock -> XAU/USD, USD, JPY, CHF, oil context, BTC/ETH.
- Return primary and secondary asset arrays; never imply direction.

---

### Task 3: Duplicate Suppression and Materiality Detection

**Files:**
- Create: `macro/events/detector.mjs`
- Test: `tests/js/detector.test.mjs`

**Interfaces:**
- Produces: `normalizeHeadline()`, `fingerprintCandidate()`, `isNearDuplicate(a,b)`, `scoreMateriality(candidate)`, `detectEvent(candidate, existing)`.

**Required behavior:**
- Normalize case/punctuation/whitespace.
- Suppress exact and near-duplicate updates within a configurable time window.
- Central-bank policy, inflation, labor, rates, intervention, major geopolitical/energy disruption score above generic commentary.
- Irrelevant entertainment/technology headlines do not become active macro events merely because they appear in the snapshot.
- Detection result returns `{accepted, reason, materiality, event}`.

---

### Task 4: Speech / Communication Classifier

**Files:**
- Create: `macro/events/speech.mjs`
- Test: `tests/js/speech.test.mjs`

**Interfaces:**
- Produces: `classifySpeechSegment(text, context)`, `mergeSpeechRevision(previous, segmentResult)`, `speechPressureForCurrency(currency, score)`.

**Required behavior:**
- Separate dimensions: `policyPath`, `inflation`, `labour`, `growth`, `financialConditions`, `balanceSheet`.
- Score each dimension from -1 to +1 using transparent phrase rules and negation guards.
- Composite score is a weighted descriptive stance, not an order signal.
- Store confidence and matched evidence phrases.
- Prepared remarks, policy statement, press conference, Q&A, interview, and unscheduled comments remain distinguishable.
- New segments can reverse earlier stance and produce a new revision.

---

### Task 5: Event Store, Snapshot Ingestion, and Optional Gateway Polling

**Files:**
- Create: `macro/events/event-store.mjs`
- Create: `macro/adapters/event-feed-adapter.mjs`
- Test: `tests/js/event-store.test.mjs`

**Interfaces:**
- Produces: `createEventStore()`, `ingestSnapshotEvents(snapshot)`, `ingestGatewayPayload(payload)`, `startGatewayPolling({url,intervalMs,onUpdate,fetchImpl})`.

**Required behavior:**
- Convert current snapshot `news`, `speakers`, and `calendar` into normalized candidates.
- Only accepted material candidates become events.
- Re-ingestion updates an existing event/revision rather than duplicating it.
- Optional gateway polling defaults to 60 seconds when a URL is explicitly configured.
- No configured gateway -> no network error and snapshot mode continues.
- Gateway failure -> retain current snapshot/events and expose feed error state; never clear working data.
- Each materially new speech/comment recalculates speech classification and appends a revision.

---

### Task 6: Preview UI — Active Event, Affected Assets, Speech Timeline

**Files:**
- Modify: `macro/ui/app.mjs`
- Modify: `macro/ui/macro-desk.css`
- Modify: `macro-preview.html`
- Test: `tests/js/ui-phase2.test.mjs`

**Interfaces:**
- Consumes normalized event store.
- Produces active-event card, `UNPLANNED` badge, timestamp provenance, affected-asset groups, speech-dimension panel, and revision timeline.

**Required behavior:**
- `EVENTS` section lists active/unplanned/scheduled records.
- BRIEF top card prefers an active material event; otherwise shows next scheduled event or `No active material event`.
- Speech panel displays `HAWKISH`, `DOVISH`, `MIXED`, or `NEUTRAL` context with dimension scores and evidence.
- If a later segment reverses stance, timeline shows both revisions.
- UI shows snapshot/gateway source state and last update time.
- No BUY/SELL wording.

---

### Task 7: Recalculation Hook and Phase 2 CI

**Files:**
- Create: `macro/events/recalculate.mjs`
- Test: `tests/js/recalculate.test.mjs`
- Modify: `.github/workflows/macro-desk-ci.yml`

**Interfaces:**
- Produces: `buildRecalculationRequest(event, marketContext)` and browser event `macrodesk:event-update`.

**Required behavior:**
- On new material news/speech revision, emit affected assets, event timestamp, state, speech/news context, and revision number.
- Do not calculate Phase 3 pip forecasts yet; output a stable request contract for the historical/advance model.
- CI runs all JS tests and syntax checks for new Phase 2 modules.

---

## Phase 2 Acceptance Check

Phase 2 is complete only when:

1. Current snapshot news/speech data is ingested into normalized event records.
2. Irrelevant headlines are rejected by materiality detection.
3. Duplicate/near-duplicate headlines do not create duplicate events.
4. Unplanned accepted events show `UNPLANNED`, timestamp source, and confidence.
5. Central-bank communication is scored across six dimensions with evidence phrases.
6. Prepared remarks and Q&A can create separate or sequential revisions.
7. A stance reversal creates a new visible revision rather than rewriting history.
8. Affected currencies/assets are mapped automatically.
9. Optional gateway polling can accept later live payloads without exposing secrets.
10. Gateway failure safely retains the existing snapshot/event state.
11. Every material update emits a stable recalculation request for Phase 3.
12. All tests and syntax checks pass; production `index.html` remains unchanged.

## Boundary

Phase 2 creates event intelligence and automatic recalculation triggers. It does not yet claim real-time event delivery unless a secure gateway is configured, and it does not yet predict pip ranges. Those belong to Phase 3/4.