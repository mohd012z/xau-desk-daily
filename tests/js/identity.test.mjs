import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSignalId, makeAlertId } from '../../macro/core/identity.mjs';

const a = { symbol: 'XAUUSD', type: 'BBMA_REENTRY', timeframe: 'M15', anchorUtc: '2026-09-24T12:30:00.000Z', direction: 'BUY' };

test('signal IDs are deterministic and human readable', () => {
  const id1 = makeSignalId(a);
  const id2 = makeSignalId({ direction: 'BUY', anchorUtc: a.anchorUtc, timeframe: 'M15', type: 'BBMA_REENTRY', symbol: 'XAUUSD' });
  assert.equal(id1, id2);
  assert.match(id1, /^XAUUSD-M15-BBMA_REENTRY-BUY-20260924T123000Z-[a-f0-9]{8}$/);
});

test('semantic signal changes produce different IDs and reconstructed objects deduplicate', () => {
  const baseline = makeSignalId({ ...a });
  assert.notEqual(makeSignalId({ ...a, direction: 'SELL' }), baseline);
  assert.notEqual(makeSignalId({ ...a, timeframe: 'M30' }), baseline);
  assert.notEqual(makeSignalId({ ...a, anchorUtc: '2026-09-24T12:45:00.000Z' }), baseline);
  assert.equal(makeSignalId(JSON.parse(JSON.stringify(a))), baseline);
});

test('alert IDs are deterministic for signal state and version', () => {
  const signalId = makeSignalId(a);
  const first = makeAlertId({ signalId, state: 'CONFIRMED', version: 'v1' });
  assert.equal(makeAlertId({ version: 'v1', signalId, state: 'CONFIRMED' }), first);
  assert.notEqual(makeAlertId({ signalId, state: 'ACTIVE', version: 'v1' }), first);
  assert.throws(() => makeSignalId({ ...a, anchorUtc: 'bad' }), TypeError);
});
