import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDataHealth } from '../../macro/core/data-health.mjs';

const TF = { D1:true, H4:true, H1:true, M30:true, M15:true, M5:true };

test('fresh feeds and all timeframes allow technical confirmation', () => {
  const result = evaluateDataHealth({
    nowUtc:'2026-09-24T12:31:00.000Z',
    price:{status:'FRESH',timestamp_utc:'2026-09-24T12:30:30.000Z'},
    news:{status:'FRESH',timestamp_utc:'2026-09-24T12:30:00.000Z'},
    timeframes:TF
  });
  assert.equal(result.technical_confirmation_allowed,true);
  assert.equal(result.macro_state,'AVAILABLE');
});

test('stale price blocks confirmation and missing M5 is explicit', () => {
  const result = evaluateDataHealth({
    nowUtc:'2026-09-24T12:31:00.000Z',
    price:{status:'STALE',timestamp_utc:'2026-09-24T12:20:00.000Z'},
    news:{status:'FRESH',timestamp_utc:'2026-09-24T12:30:00.000Z'},
    timeframes:{...TF,M5:false}
  });
  assert.equal(result.technical_confirmation_allowed,false);
  assert.ok(result.reasons.includes('PRICE_STALE'));
  assert.ok(result.reasons.includes('TIMEFRAME_M5_UNAVAILABLE'));
});

test('news failure becomes UNKNOWN without pretending there is no news', () => {
  const result = evaluateDataHealth({
    nowUtc:'2026-09-24T12:31:00.000Z',
    price:{status:'FRESH',timestamp_utc:'2026-09-24T12:30:30.000Z'},
    news:{status:'DOWN',timestamp_utc:'2026-09-24T12:30:00.000Z'},
    timeframes:TF
  });
  assert.equal(result.news,'UNKNOWN');
  assert.equal(result.macro_state,'UNKNOWN');
  assert.equal(result.technical_confirmation_allowed,true);
});

test('explicit valid clock is mandatory', () => {
  assert.throws(() => evaluateDataHealth({price:{status:'FRESH'},news:{status:'FRESH'},timeframes:TF}),TypeError);
  assert.throws(() => evaluateDataHealth({nowUtc:'bad',price:{status:'FRESH'},news:{status:'FRESH'},timeframes:TF}),TypeError);
});
