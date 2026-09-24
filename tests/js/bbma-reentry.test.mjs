import test from 'node:test';
import assert from 'node:assert/strict';
import { detectReentry } from '../../macro/bbma/reentry.mjs';

const candle = (timestamp_utc, overrides = {}) => ({
  timestamp_utc, open: 100, high: 103, low: 99, close: 102,
  bb_upper: 105, bb_mid: 100, bb_lower: 95,
  ma5_high: 102, ma5_low: 98, ma10_high: 101, ma10_low: 99, ema50: 97,
  ...overrides
});

test('BUY re-entry requires bullish context and inclusive pullback to MA5 low zone', () => {
  const series = [
    candle('2026-09-24T06:00:00.000Z', { close: 103, ema50: 97 }),
    candle('2026-09-24T06:15:00.000Z', { low: 98, close: 102, ma5_low: 98, ema50: 97 })
  ];
  const out = detectReentry({ series, timeframe: 'M15' });
  assert.equal(out.detected, true);
  assert.equal(out.direction, 'BUY');
  assert.equal(out.detector, 'REENTRY');
  assert.equal(out.anchor_utc, '2026-09-24T06:15:00.000Z');
  assert.deepEqual(out.evidence, ['BULLISH_CONTEXT', 'PULLBACK_MA5_LOW']);
});

test('SELL re-entry requires bearish context and inclusive pullback to MA5 high zone', () => {
  const series = [
    candle('2026-09-24T06:00:00.000Z', { open: 100, high: 103, low: 95, close: 96, ema50: 101 }),
    candle('2026-09-24T06:15:00.000Z', { open: 100, high: 102, low: 97, close: 98, ma5_high: 102, ema50: 101 })
  ];
  const out = detectReentry({ series, timeframe: 'M15' });
  assert.equal(out.detected, true);
  assert.equal(out.direction, 'SELL');
  assert.deepEqual(out.evidence, ['BEARISH_CONTEXT', 'PULLBACK_MA5_HIGH']);
});

test('zone touch against context stays visible as conflict evidence, not signal', () => {
  const series = [
    candle('2026-09-24T06:00:00.000Z', { open: 100, high: 103, low: 95, close: 96, ema50: 101 }),
    candle('2026-09-24T06:15:00.000Z', {
      open: 100, high: 103, low: 98, close: 99,
      ma5_low: 98,
      ma5_high: 104,
      ema50: 101
    })
  ];
  const out = detectReentry({ series, timeframe: 'M15' });
  assert.equal(out.detected, false);
  assert.equal(out.direction, null);
  assert.ok(out.evidence.includes('CONFLICT_BULLISH_ZONE_BEARISH_CONTEXT'));
});

test('insufficient history is explicit', () => {
  const out = detectReentry({ series: [candle('2026-09-24T06:00:00.000Z')], timeframe: 'M15' });
  assert.equal(out.status, 'INSUFFICIENT_DATA');
  assert.equal(out.detected, false);
});
