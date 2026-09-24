import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, transitionSignal } from '../../macro/core/signal-state.mjs';

test('signal lifecycle allows the configured forward path and terminal expiry', () => {
  const allowed = [
    ['DETECTED', 'WATCH'],
    ['WATCH', 'SETUP'],
    ['SETUP', 'CONFIRMED'],
    ['CONFIRMED', 'ACTIVE'],
    ['ACTIVE', 'INVALIDATED'],
    ['ACTIVE', 'EXPIRED'],
  ];
  for (const [from, to] of allowed) assert.equal(canTransition(from, to), true, `${from} -> ${to}`);
});

test('signal lifecycle rejects illegal jumps and terminal reactivation', () => {
  assert.equal(canTransition('DETECTED', 'ACTIVE'), false);
  assert.equal(canTransition('INVALIDATED', 'CONFIRMED'), false);
  assert.equal(canTransition('EXPIRED', 'ACTIVE'), false);
});

test('transitionSignal requires explicit time and reason and appends immutable history', () => {
  const source = { signal_id: 'sig-1', state: 'DETECTED', history: [] };
  const next = transitionSignal(source, 'WATCH', '2026-09-24T12:32:00.000Z', 'candidate observed');
  assert.equal(next.state, 'WATCH');
  assert.deepEqual(next.history, [{ from: 'DETECTED', to: 'WATCH', at_utc: '2026-09-24T12:32:00.000Z', reason: 'candidate observed' }]);
  assert.equal(source.state, 'DETECTED');
  assert.deepEqual(source.history, []);
  assert.equal(Object.isFrozen(next), true);
  assert.throws(() => transitionSignal(source, 'WATCH', undefined, 'reason'), TypeError);
  assert.throws(() => transitionSignal(source, 'WATCH', 'bad', 'reason'), TypeError);
  assert.throws(() => transitionSignal(source, 'WATCH', '2026-09-24T12:32:00.000Z', '   '), TypeError);
  assert.throws(() => transitionSignal(source, 'ACTIVE', '2026-09-24T12:32:00.000Z', 'skip'), TypeError);
});
