import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCsa } from '../../macro/bbma/csa.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:3740,high:3745,low:3735,close:3740,bb_upper:3750,bb_mid:3740,bb_lower:3730,ma5_high:3743,ma5_low:3737,ma10_high:3742,ma10_low:3738,ema50:3740,...o});
const t1='2026-09-24T06:15:00.000Z';
const t2='2026-09-24T06:30:00.000Z';

test('detects CSA BUY only when close crosses from at/below EMA50 to strictly above',()=>{
  const r=detectCsa({series:[c(t1,{close:3739,ema50:3740}),c(t2,{close:3742,ema50:3740})],timeframe:'M15'});
  assert.equal(r.detected,true); assert.equal(r.direction,'BUY'); assert.equal(r.anchor_utc,t2);
  assert.ok(r.evidence.includes('PREVIOUS_CLOSE_AT_OR_BELOW_EMA50')); assert.ok(r.evidence.includes('CURRENT_CLOSE_ABOVE_EMA50'));
});

test('detects CSA SELL only when close crosses from at/above EMA50 to strictly below',()=>{
  const r=detectCsa({series:[c(t1,{close:3741,ema50:3740}),c(t2,{close:3738,ema50:3740})],timeframe:'H1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'SELL');
  assert.ok(r.evidence.includes('PREVIOUS_CLOSE_AT_OR_ABOVE_EMA50')); assert.ok(r.evidence.includes('CURRENT_CLOSE_BELOW_EMA50'));
});

test('wick-only crossing does not become CSA',()=>{
  const r=detectCsa({series:[c(t1,{close:3739,ema50:3740}),c(t2,{high:3745,close:3739,ema50:3740})],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null);
});

test('current close equality to EMA50 is not a confirmed cross',()=>{
  const r=detectCsa({series:[c(t1,{close:3739,ema50:3740}),c(t2,{close:3740,ema50:3740})],timeframe:'M15'});
  assert.equal(r.detected,false);
});

test('returns explicit insufficient-data state with fewer than two candles',()=>{
  const r=detectCsa({series:[c(t2)],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'INSUFFICIENT_DATA');
});
