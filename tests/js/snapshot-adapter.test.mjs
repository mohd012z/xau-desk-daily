import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptSnapshot } from '../../macro/adapters/snapshot-adapter.mjs';

test('daily XAU snapshot normalizes as metal and never claims streaming', () => {
  const snapshot = {
    meta: {
      generatedAt: '2026-09-16T12:01:54+08:00',
      cadence: 'daily',
      verified: true,
      sourceStatus: { xau: { ok: true, label: 'XAU provider' } }
    },
    updated: '2026-09-16 12:01 MYT',
    price: { spot: 4327.23, change: 33.44, changePct: 0.78, dayRange: '4275.88 - 4339.71' },
    calendar: [],
    sources: ['XAU provider']
  };

  const out = adaptSnapshot(snapshot);
  assert.equal(out.status, 'SNAPSHOT');
  assert.equal(out.updatedAt, '2026-09-16T12:01:54+08:00');
  assert.equal(out.instruments['XAU/USD'].assetClass, 'metal');
  assert.equal(out.instruments['XAU/USD'].price, 4327.23);
  assert.deepEqual(out.events, []);
  assert.deepEqual(out.sources, ['XAU provider']);
});

test('unknown fields remain null instead of fabricated', () => {
  const out = adaptSnapshot({ meta: {}, price: {}, sources: [] });
  assert.equal(out.instruments['XAU/USD'].price, null);
  assert.equal(out.instruments['EUR/USD'].price, null);
  assert.equal(out.instruments['BTC/USD'].price, null);
});
