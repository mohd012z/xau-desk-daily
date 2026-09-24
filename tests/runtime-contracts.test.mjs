import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUNTIME_HEALTH,
  validateCandle,
  validateCacheEnvelope,
  isCacheUsable,
  boundedAppend
} from '../config/runtime-contracts.mjs';

test('runtime health contract exposes truthful fast-path states', () => {
  assert.deepEqual(RUNTIME_HEALTH, Object.freeze([
    'BOOTING','LOADING_HISTORY','HISTORY_READY','CONNECTING_LIVE','LIVE',
    'INSUFFICIENT_DATA','STALE_DATA','FEED_DISCONNECTED','HISTORY_FAILED','RATE_LIMITED','OFFLINE'
  ]));
});

test('canonical candle accepts proven UTC OHLC data', () => {
  const candle = {
    symbol: 'XAUUSD', timeframe: 'M5',
    openTimeUTC: '2026-09-24T00:00:00Z', closeTimeUTC: '2026-09-24T00:05:00Z',
    open: 4400, high: 4402, low: 4398, close: 4401,
    source: 'verified-provider', freshnessMs: 5000, complete: true
  };
  assert.equal(validateCandle(candle).ok, true);
});

test('candle rejects impossible OHLC and non-UTC timestamps', () => {
  const bad = {
    symbol: 'XAUUSD', timeframe: 'M5', openTimeUTC: '2026-09-24 00:00', closeTimeUTC: '2026-09-24T00:05:00Z',
    open: 4400, high: 4390, low: 4398, close: 4401, source: 'x', freshnessMs: 1, complete: true
  };
  assert.equal(validateCandle(bad).ok, false);
});

test('cache envelope is versioned, source-attributed and expiry-aware', () => {
  const now = Date.parse('2026-09-24T01:00:00Z');
  const envelope = {
    version: 1, key: 'ohlc:XAUUSD:M5', source: 'verified-provider',
    capturedAtUTC: '2026-09-24T00:59:30Z', expiresAtUTC: '2026-09-24T01:01:30Z',
    payload: [{ close: 4401 }]
  };
  assert.equal(validateCacheEnvelope(envelope).ok, true);
  assert.equal(isCacheUsable(envelope, now), true);
  assert.equal(isCacheUsable(envelope, Date.parse('2026-09-24T01:02:00Z')), false);
});

test('bounded append limits memory and keeps newest observations', () => {
  let values = [];
  for (let i = 0; i < 1000; i += 1) values = boundedAppend(values, i, 128);
  assert.equal(values.length, 128);
  assert.equal(values[0], 872);
  assert.equal(values.at(-1), 999);
});
