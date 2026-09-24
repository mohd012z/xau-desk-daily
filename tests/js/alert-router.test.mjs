import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAlert } from '../../macro/core/alert-router.mjs';

const candidate = (overrides = {}) => ({
  signal_id: 'XAUUSD-M15-BBMA_REENTRY-BUY-20260924T123000Z-abc12345',
  symbol: 'XAUUSD',
  type: 'BBMA_REENTRY',
  direction: 'BUY',
  timeframe: 'M15',
  state: 'CONFIRMED',
  priority: 'P2',
  generated_utc: '2026-09-24T12:31:00.000Z',
  generated_myt: '24 Sep 2026 20:31:00 MYT',
  technical: { score: 91 },
  bbma: { setup: 'REENTRY' },
  macro: { state: 'NORMAL' },
  data_health: { technical_confirmation_allowed: true, macro_state: 'AVAILABLE' },
  engine_version: 'phase1',
  rule_version: 'v1',
  ...overrides,
});

test('first fresh confirmed P2 candidate is logically deliverable', () => {
  const result = routeAlert({ candidate: candidate(), previous: null, policy: {} });
  assert.equal(result.action, 'DELIVER');
  assert.equal(result.reason, 'FIRST_DELIVERY');
  assert.equal(result.delivery_enabled, true);
  assert.match(result.alert_id, /^ALERT-/);
});

test('unchanged candidate is suppressed across reconstructed previous state', () => {
  const current = candidate();
  const previous = JSON.parse(JSON.stringify(current));
  const result = routeAlert({ candidate: current, previous, policy: {} });
  assert.equal(result.action, 'SUPPRESS');
  assert.equal(result.reason, 'UNCHANGED_DUPLICATE');
});

test('same signal lifecycle change from SETUP to CONFIRMED is an update', () => {
  const previous = candidate({ state: 'SETUP' });
  const result = routeAlert({ candidate: candidate(), previous, policy: {} });
  assert.equal(result.action, 'UPDATE');
  assert.equal(result.reason, 'LIFECYCLE_UPDATE');
});

test('blocked data health suppresses a new confirmed technical signal', () => {
  const current = candidate({ data_health: { technical_confirmation_allowed: false, macro_state: 'AVAILABLE' } });
  const result = routeAlert({ candidate: current, previous: null, policy: {} });
  assert.equal(result.action, 'SUPPRESS');
  assert.equal(result.reason, 'DATA_HEALTH_BLOCK');
});

test('shadow mode computes logical action but disables external delivery', () => {
  const result = routeAlert({ candidate: candidate(), previous: null, policy: { shadow_mode: true } });
  assert.equal(result.action, 'DELIVER');
  assert.equal(result.delivery_enabled, false);
});
