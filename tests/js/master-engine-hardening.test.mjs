import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDataHealth } from '../../macro/core/data-health.mjs';
import { makeSignalId } from '../../macro/core/identity.mjs';
import { transitionSignal } from '../../macro/core/signal-state.mjs';
import { routeAlert } from '../../macro/core/alert-router.mjs';
import { normalizeAlertCandidate } from '../../macro/core/contracts.mjs';

const allTimeframes = { D1: true, H4: true, H1: true, M30: true, M15: true, M5: true };
const candidate = (overrides = {}) => ({
  signal_id: 'XAUUSD-M15-BBMA_REENTRY-BUY-20260924T123000Z-abc12345',
  symbol: 'XAUUSD', type: 'BBMA_REENTRY', direction: 'BUY', timeframe: 'M15',
  state: 'CONFIRMED', priority: 'P2', generated_utc: '2026-09-24T12:31:00.000Z',
  technical: { score: 91 }, bbma: { setup: 'REENTRY' }, macro: { state: 'NORMAL' },
  data_health: { technical_confirmation_allowed: true, macro_state: 'AVAILABLE' },
  engine_version: 'phase1', rule_version: 'v1', ...overrides,
});

test('data health accepts canonical live feed status and independently verifies age', () => {
  const live = evaluateDataHealth({
    nowUtc: '2026-09-24T12:31:00.000Z',
    price: { status: 'STREAMING', timestamp_utc: '2026-09-24T12:30:50.000Z' },
    news: { status: 'STREAMING', timestamp_utc: '2026-09-24T12:30:30.000Z' },
    timeframes: allTimeframes,
  });
  assert.equal(live.price, 'FRESH');
  assert.equal(live.news, 'FRESH');
  assert.equal(live.technical_confirmation_allowed, true);

  const staleByAge = evaluateDataHealth({
    nowUtc: '2026-09-24T12:31:00.000Z',
    price: { status: 'FRESH', timestamp_utc: '2026-09-24T12:29:00.000Z' },
    news: { status: 'FRESH', timestamp_utc: '2026-09-24T12:30:30.000Z' },
    timeframes: allTimeframes,
  });
  assert.equal(staleByAge.price, 'STALE');
  assert.equal(staleByAge.technical_confirmation_allowed, false);
  assert.ok(staleByAge.reasons.includes('PRICE_STALE'));
});

test('missing news fails open for technical analysis but macro state becomes UNKNOWN', () => {
  const result = evaluateDataHealth({
    nowUtc: '2026-09-24T12:31:00.000Z',
    price: { status: 'STREAMING', timestamp_utc: '2026-09-24T12:30:55.000Z' },
    news: null,
    timeframes: allTimeframes,
  });
  assert.equal(result.news, 'UNKNOWN');
  assert.equal(result.macro_state, 'UNKNOWN');
  assert.equal(result.technical_confirmation_allowed, true);
});

test('required timeframe policy is configurable while missing timeframes remain explicit', () => {
  const result = evaluateDataHealth({
    nowUtc: '2026-09-24T12:31:00.000Z',
    price: { status: 'STREAMING', timestamp_utc: '2026-09-24T12:30:55.000Z' },
    news: null,
    timeframes: { D1: true, H4: true, H1: true, M30: false, M15: false, M5: false },
    requiredTimeframes: ['D1', 'H4', 'H1'],
  });
  assert.equal(result.technical_confirmation_allowed, true);
  assert.ok(result.reasons.includes('TIMEFRAME_M5_UNAVAILABLE'));
});

test('signal identity canonicalizes surrounding whitespace', () => {
  const baseline = makeSignalId({ symbol: 'XAUUSD', type: 'BBMA_REENTRY', timeframe: 'M15', anchorUtc: '2026-09-24T12:30:00.000Z', direction: 'BUY' });
  const padded = makeSignalId({ symbol: ' xauusd ', type: ' bbma_reentry ', timeframe: ' m15 ', anchorUtc: '2026-09-24T12:30:00.000Z', direction: ' buy ' });
  assert.equal(padded, baseline);
});

test('signal transition history is deeply isolated and immutable', () => {
  const source = { signal_id: 'sig-1', state: 'DETECTED', history: [{ from: 'INIT', to: 'DETECTED', meta: { source: 'feed-a' } }] };
  const next = transitionSignal(source, 'WATCH', '2026-09-24T12:32:00.000Z', 'candidate observed');
  source.history[0].meta.source = 'mutated';
  assert.equal(next.history[0].meta.source, 'feed-a');
  assert.equal(Object.isFrozen(next.history[0]), true);
  assert.equal(Object.isFrozen(next.history[0].meta), true);
});

test('contracts reject invalid lifecycle/priority enums and broader credential aliases', () => {
  assert.throws(() => normalizeAlertCandidate(candidate({ state: 'CONFIRMD' })), TypeError);
  assert.throws(() => normalizeAlertCandidate(candidate({ priority: 'P22' })), TypeError);
  assert.throws(() => normalizeAlertCandidate(candidate({ technical: { APIKey: 'x' } })), TypeError);
  assert.throws(() => normalizeAlertCandidate(candidate({ technical: { token: 'x' } })), TypeError);
});

test('router emits priority updates and suppress actions can never enable delivery', () => {
  const priority = routeAlert({ candidate: candidate({ priority: 'P2' }), previous: candidate({ priority: 'P3' }), policy: {} });
  assert.equal(priority.action, 'UPDATE');
  assert.equal(priority.reason, 'PRIORITY_CHANGE');
  assert.equal(priority.delivery_enabled, true);

  const duplicate = routeAlert({ candidate: candidate(), previous: candidate(), policy: {} });
  assert.equal(duplicate.action, 'SUPPRESS');
  assert.equal(duplicate.delivery_enabled, false);
});

test('router supports event-risk suppression and cooldown without version-only re-alerts', () => {
  const eventRisk = routeAlert({
    candidate: candidate({ macro: { state: 'PRE_EVENT_LOCK' } }),
    previous: null,
    policy: { suppress_macro_states: ['PRE_EVENT_LOCK'] },
  });
  assert.equal(eventRisk.action, 'SUPPRESS');
  assert.equal(eventRisk.reason, 'EVENT_RISK_SUPPRESS');
  assert.equal(eventRisk.delivery_enabled, false);

  const cooldown = routeAlert({
    candidate: candidate({ engine_version: 'phase2' }),
    previous: { ...candidate({ engine_version: 'phase1' }), delivered_at_utc: '2026-09-24T12:30:30.000Z' },
    policy: { cooldown_seconds: 120 },
  });
  assert.equal(cooldown.action, 'SUPPRESS');
  assert.equal(cooldown.reason, 'COOLDOWN_ACTIVE');
  assert.equal(cooldown.delivery_enabled, false);
});
