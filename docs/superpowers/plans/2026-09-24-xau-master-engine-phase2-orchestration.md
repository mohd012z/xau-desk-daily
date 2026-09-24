# XAU Master Engine Phase 2 Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, auditable multi-cron + multi-bot orchestration foundation that runs only in shadow mode and can later host market, BBMA, macro, confluence, and delivery bots without coupling them directly together.

**Architecture:** Add a new `macro/orchestration/` boundary. A pure scheduler turns configured intervals into stable scheduled events, an in-memory FIFO event bus deduplicates events, a bot registry dispatches events to subscribed bots in deterministic priority order, and a serializable shadow state records job/bot runs and delivery intents. `master-runner.mjs` composes these pieces without network I/O or live Telegram/APK delivery. Dependencies are injected so later phases can plug in collectors and domain bots without changing orchestration semantics.

**Tech Stack:** Node.js 22 ESM, Node built-in `node:test`, existing `macro/core` utilities, no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-24-xau-bbma-news-master-engine-design.md`

## Global Constraints

- UTC remains canonical for scheduling and interchange; MYT formatting continues through the existing central time utility.
- Phase 2 is shadow-only: no Telegram, APK, trading action, order placement, or external notification side effect.
- No AI/LLM call is part of the scheduler or bot runtime.
- Bots never call one another directly; cross-bot work travels through events.
- Repeated execution of the same schedule slot must be idempotent.
- A failing bot must not stop unrelated subscribed bots from running.
- Orchestration payloads must not contain provider, Telegram, GitHub, Android-signing, or other credentials.
- No new third-party runtime dependency is introduced.
- Existing production alert behavior remains unchanged.

## Review Focus

1. Repeating the same scheduler tick in one interval slot must not produce a second logical event.
2. Rehydrating state after a restart must not replay already-completed schedule slots.
3. One bot throwing an exception must be recorded as failed while later bots still execute.
4. A bot attempting to express a delivery action in shadow mode must produce an audit-only delivery intent, never an external side effect.
5. Clock rollback/future timestamps must fail closed rather than silently corrupt scheduler state.

---

### Task 1: Deterministic multi-cron scheduler

**Files:**
- Create: `macro/orchestration/scheduler.mjs`
- Test: `tests/js/orchestration-scheduler.test.mjs`

**Interfaces:**
- Produces: `normalizeJobs(jobs) -> FrozenArray<Job>`
- Produces: `dueScheduleEvents({ jobs, nowUtc, lastSlotByJob }) -> FrozenArray<ScheduleEvent>`
- `Job`: `{ id, every_seconds, event_type, enabled=true, priority=100 }`
- `ScheduleEvent`: `{ event_id, type, job_id, scheduled_for_utc, priority, payload }`

- [ ] **Step 1: Write failing scheduler tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { dueScheduleEvents } from '../../macro/orchestration/scheduler.mjs';

test('same cron slot produces one stable event identity', () => {
  const jobs = [{ id:'market-health', every_seconds:60, event_type:'HEALTH_CHECK' }];
  const a = dueScheduleEvents({ jobs, nowUtc:'2026-09-24T08:00:12.000Z', lastSlotByJob:{} });
  const b = dueScheduleEvents({ jobs, nowUtc:'2026-09-24T08:00:58.000Z', lastSlotByJob:{} });
  assert.equal(a[0].event_id, b[0].event_id);
  assert.equal(a[0].scheduled_for_utc, '2026-09-24T08:00:00.000Z');
});

test('completed slot is not scheduled twice', () => {
  const jobs = [{ id:'news-health', every_seconds:300, event_type:'NEWS_CHECK' }];
  const events = dueScheduleEvents({
    jobs,
    nowUtc:'2026-09-24T08:04:00.000Z',
    lastSlotByJob:{ 'news-health':'2026-09-24T08:00:00.000Z' }
  });
  assert.deepEqual(events, []);
});
```

Also pin invalid intervals, duplicate job IDs, invalid timestamps, and clock rollback/future last-slot state.

- [ ] **Step 2: Run the scheduler test and verify RED**

Run: `node --test tests/js/orchestration-scheduler.test.mjs`

Expected: FAIL because `macro/orchestration/scheduler.mjs` does not exist.

- [ ] **Step 3: Implement the minimal deterministic scheduler**

Use interval-flooring, not `setInterval`, so event identity is reproducible:

```js
function slotUtc(nowMs, intervalMs) {
  return new Date(Math.floor(nowMs / intervalMs) * intervalMs).toISOString();
}

function stableEventId(job, scheduledForUtc) {
  return `cron:${job.id}:${scheduledForUtc}`;
}
```

Validate all job definitions before returning frozen copies. Reject a `lastSlotByJob[job.id]` that is later than the current calculated slot.

- [ ] **Step 4: Run the scheduler test and verify GREEN**

Run: `node --test tests/js/orchestration-scheduler.test.mjs`

Expected: all scheduler tests PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/orchestration/scheduler.mjs tests/js/orchestration-scheduler.test.mjs
git commit -m "feat: add deterministic multi-cron scheduler"
```

---

### Task 2: FIFO event bus and deterministic bot registry

**Files:**
- Create: `macro/orchestration/event-bus.mjs`
- Create: `macro/orchestration/bot-registry.mjs`
- Test: `tests/js/orchestration-event-bus.test.mjs`
- Test: `tests/js/orchestration-bot-registry.test.mjs`

**Interfaces:**
- Produces: `createEventBus(seed?) -> { publish, next, hasPending, snapshot }`
- Produces: `createBotRegistry(bots) -> { matching(event), botIds() }`
- Bot contract: `{ id, priority=100, subscriptions: string[], run: async ({ event, context }) => BotResult }`
- `BotResult`: `{ emitted_events?: Event[], delivery_intents?: object[], metadata?: object }`

- [ ] **Step 1: Write failing queue and registry tests**

Pin FIFO ordering, duplicate `event_id` suppression, immutable snapshots, duplicate bot ID rejection, subscription filtering, and deterministic ordering by `priority` then bot ID.

```js
test('registry orders matching bots by priority then id', () => {
  const registry = createBotRegistry([
    { id:'z', priority:20, subscriptions:['TICK'], run:async()=>({}) },
    { id:'a', priority:10, subscriptions:['TICK'], run:async()=>({}) },
    { id:'b', priority:10, subscriptions:['TICK'], run:async()=>({}) },
  ]);
  assert.deepEqual(registry.matching({ type:'TICK' }).map(x => x.id), ['a','b','z']);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/js/orchestration-event-bus.test.mjs tests/js/orchestration-bot-registry.test.mjs`

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement minimal bus + registry**

The bus keeps `seenEventIds` separate from pending queue so dequeued events are still idempotent during the process lifetime. The registry clones/freezes bot metadata but preserves the executable `run` function.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/js/orchestration-event-bus.test.mjs tests/js/orchestration-bot-registry.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/orchestration/event-bus.mjs macro/orchestration/bot-registry.mjs tests/js/orchestration-event-bus.test.mjs tests/js/orchestration-bot-registry.test.mjs
git commit -m "feat: add event bus and bot registry"
```

---

### Task 3: Serializable shadow audit/restart state

**Files:**
- Create: `macro/orchestration/shadow-state.mjs`
- Test: `tests/js/orchestration-shadow-state.test.mjs`

**Interfaces:**
- Produces: `createShadowState(seed?)`
- Methods: `lastSlotByJob()`, `recordJobSlot(...)`, `recordBotRun(...)`, `recordDeliveryIntent(...)`, `snapshot()`
- Snapshot schema: `{ version:1, last_slot_by_job, job_runs, bot_runs, delivery_intents }`

- [ ] **Step 1: Write failing state tests**

Tests must prove snapshot rehydration keeps prior completed slots, nested input mutation cannot alter stored audit rows, invalid/future slot timestamps are rejected by the scheduler when state is reused, and delivery intents are audit records only.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/js/orchestration-shadow-state.test.mjs`

Expected: FAIL because the state module does not exist.

- [ ] **Step 3: Implement serializable state with deep-copy boundaries**

Use JSON-safe clone semantics for audit payloads and frozen snapshots. Do not store functions, Error objects, tokens, or provider client objects. Failed bot runs store `{ bot_id, event_id, status:'FAILED', error_name, error_message, timestamp_utc }` only.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `node --test tests/js/orchestration-shadow-state.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/orchestration/shadow-state.mjs tests/js/orchestration-shadow-state.test.mjs
git commit -m "feat: add shadow orchestration state"
```

---

### Task 4: Multi-bot shadow master runner with failure isolation

**Files:**
- Create: `macro/orchestration/master-runner.mjs`
- Test: `tests/js/orchestration-master-runner.test.mjs`

**Interfaces:**
- Consumes: scheduler, event bus, bot registry, shadow state.
- Produces: `runShadowTick({ jobs, bots, state, nowUtc, context={} }) -> Promise<FrozenResult>`
- Result: `{ scheduled, processed_events, bot_runs, delivery_intents, state_snapshot }`

- [ ] **Step 1: Write failing end-to-end orchestration tests**

Exercise at least three schedules with different intervals and multiple bots. Pin these behaviors:

```js
test('one bot failure does not stop later bots', async () => {
  const bots = [
    { id:'bad', priority:10, subscriptions:['HEALTH_CHECK'], run:async()=>{ throw new Error('boom'); } },
    { id:'good', priority:20, subscriptions:['HEALTH_CHECK'], run:async()=>({ metadata:{ ok:true } }) },
  ];
  const result = await runShadowTick({ jobs, bots, state:createShadowState(), nowUtc:'2026-09-24T08:00:00.000Z' });
  assert.equal(result.bot_runs.find(x => x.bot_id === 'bad').status, 'FAILED');
  assert.equal(result.bot_runs.find(x => x.bot_id === 'good').status, 'SUCCESS');
});
```

Also test emitted child events, same-slot deduplication, state rehydration/restart, and deterministic dispatch order.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/js/orchestration-master-runner.test.mjs`

Expected: FAIL because the runner does not exist.

- [ ] **Step 3: Implement the runner**

Algorithm:

```text
validate shadow context
-> calculate due schedule events
-> publish them to FIFO bus
-> for each event: resolve matching bots
-> execute bots sequentially in deterministic order
-> record SUCCESS/FAILED independently
-> publish emitted events through the same bus
-> record delivery_intents only
-> mark schedule slot complete
-> return frozen serializable result
```

The runner must reject `context.shadow_mode === false`. It must not accept a live delivery client/service in Phase 2; keys such as `telegram`, `apk`, `delivery`, `broker`, or `trade` in `context.services` are rejected.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `node --test tests/js/orchestration-master-runner.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/orchestration/master-runner.mjs tests/js/orchestration-master-runner.test.mjs
git commit -m "feat: add shadow multi-bot master runner"
```

---

### Task 5: Default Phase 2 schedule profile and operational health facade

**Files:**
- Create: `macro/orchestration/phase2-profile.mjs`
- Test: `tests/js/orchestration-phase2-profile.test.mjs`

**Interfaces:**
- Produces: `PHASE2_SHADOW_JOBS`
- Produces: `buildOrchestrationHealth({ stateSnapshot, nowUtc })`

- [ ] **Step 1: Write failing profile tests**

The profile contains logical schedules only; it does not create GitHub Actions cron workflows:

```js
const expectedIds = [
  'price-health',
  'timeframe-health',
  'news-health',
  'analysis-shadow',
  'alert-router-shadow',
  'audit-snapshot'
];
```

Pin unique job IDs, all jobs enabled, positive intervals, no interval faster than 60 seconds in the default profile, and operational health fields for last run/status of each job.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/js/orchestration-phase2-profile.test.mjs`

Expected: FAIL because the profile does not exist.

- [ ] **Step 3: Implement conservative default schedule**

Use defaults that are safe for shadow orchestration and can be overridden later by deployment config. The profile must not contain API credentials or invoke network collectors itself.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `node --test tests/js/orchestration-phase2-profile.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add macro/orchestration/phase2-profile.mjs tests/js/orchestration-phase2-profile.test.mjs
git commit -m "feat: add phase2 shadow schedule profile"
```

---

### Task 6: CI gate for orchestration and full regression verification

**Files:**
- Modify: `.github/workflows/macro-desk-ci.yml`
- Test: all `tests/js/*.test.mjs`, `tests/*.test.mjs`, Python collector tests, migration/safety gates.

**Interfaces:**
- CI must syntax-check all `macro/orchestration/*.mjs` files and continue running the existing complete suites.

- [ ] **Step 1: Add orchestration syntax gate**

Add a shell loop rather than enumerating every future orchestration file:

```bash
for f in macro/orchestration/*.mjs; do
  node --check "$f"
done
```

- [ ] **Step 2: Run all JS tests**

Run: `node --test tests/js/*.test.mjs`

Expected: PASS with zero failures.

- [ ] **Step 3: Run migration tests and safety gate**

Run:

```bash
node --test tests/*.test.mjs
node tools/verify-migration.mjs
```

Expected: PASS.

- [ ] **Step 4: Run Python tests**

Run:

```bash
python -m py_compile scripts/*.py
python -m unittest discover -s tests/python -p 'test_*.py'
```

Expected: PASS.

- [ ] **Step 5: Push branch and verify GitHub Actions**

Confirm both the existing HELIX VEYRA CI and any applicable phase workflow finish green for the branch head SHA. Do not merge on a pending or red run.

- [ ] **Step 6: Commit CI change**

```bash
git add .github/workflows/macro-desk-ci.yml
git commit -m "ci: verify phase2 orchestration modules"
```

---

## Self-review result

- Spec coverage: Phase 2 plan covers orchestration, scheduling, idempotency, failure isolation, auditability, restart-safe state, shadow mode, and operational health. It intentionally does not implement BBMA detector rules, live collectors, Telegram/APK delivery, or AI analysis; those remain later domain/integration phases.
- Placeholder scan: no implementation placeholders are required by this plan.
- Type consistency: scheduler events, bot contract, state snapshot, and runner result use one consistent event/bot interface across tasks.
- Review Focus coverage: same-slot replay is Task 1/4; restart replay is Task 3/4; bot failure isolation is Task 4; shadow delivery intent is Task 3/4; clock rollback is Task 1/3.
