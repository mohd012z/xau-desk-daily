import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDataHealth } from '../../macro/core/data-health.mjs';

const allTimeframes = { D1: true, H4: true, H1: true, M30: true, M15: true, M5: true };
const base = () => ({
  nowUtc: '2026-09-24T12:31:00.000Z',
  price: { status: 'FRESH', timestamp_utc: '2026-09-24T12:30:30.000Z' },
  news: { status: 'FRESH', timestamp_utc: '2026-09-24T12:30:00.000Z' },
  timeframes: { ...allTimeframes },
});

test('healthy price, news and timeframes allow technical confirmation', () => {
  const result = evaluateDataHealth(base());
  assert.equal(result.price, 'FRESH');
  assert.equal(result.news, 'FRESH');
  assert.equal(result.technical_confirmation_allowed, true);
  assert.equal(result.macro_state, 'AVAILABLE');
  assert.deepEqual(result.reasons, []);
});

test('stale price blocks confirmation and missing timeframe is explicit', () => {
  const stale = evaluateDataHealth({ ...base(), price: { status: 'STALE', timestamp_utc: '2026-09-24T12:00:00.000Z' } });
  assert.equal(stale.technical_confirmation_allowed, false);
  assert.ok(stale.reasons.includes('PRICE_STALE'));

  const missing = evaluateDataHealth({ ...base(), timeframes: { ...allTimeframes, M5: false } });
  assert.equal(missing.technical_confirmation_allowed, false);
  assert.ok(missing.reasons.includes('TIMEFRAME_M5_UNAVAILABLE'));
  assert.equal(missing.timeframes.M5, false);
});

test('unavailable news becomes UNKNOWN without pretending there is no news', () => {
  const result = evaluateDataHealth({ ...base(), news: { status: 'DOWN', timestamp_utc: '2026-09-24T12:30:00.000Z' } });
  assert.equal(result.news, 'UNKNOWN');
  assert.equal(result.macro_state, 'UNKNOWN');
  assert.equal(result.technical_confirmation_allowed, true);
  assert.ok(result.reasons.includes('NEWS_UNKNOWN'));
});

test('explicit valid nowUtc is required', () => {
  assert.throws(() => evaluateDataHealth({ ...base(), nowUtc: undefined }), TypeError);
  assert.throws(() => evaluateDataHealth({ ...base(), nowUtc: 'bad-clock' }), TypeError);
});
