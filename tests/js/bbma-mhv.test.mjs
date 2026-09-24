import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMhv } from '../../macro/bbma/mhv.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:3740,high:3745,low:3735,close:3740,bb_upper:3750,bb_mid:3740,bb_lower:3730,ma5_high:3743,ma5_low:3737,ma10_high:3742,ma10_low:3738,ema50:3728,...o});
const t1='2026-09-24T06:15:00.000Z';
const t2='2026-09-24T06:30:00.000Z';

test('detects MHV BUY after prior lower-side Extreme context and return inside lower BB',()=>{
  const r=detectMhv({series:[
    c(t1,{low:3729,close:3731,bb_lower:3730,ma5_low:3729}),
    c(t2,{low:3731,close:3734,bb_lower:3730,ma5_low:3732})
  ],timeframe:'M15',ruleVersion:'bbma-shadow-v1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'BUY'); assert.equal(r.anchor_utc,t2);
  assert.ok(r.evidence.includes('PRIOR_EXTREME_BUY_CONTEXT')); assert.ok(r.evidence.includes('RETURN_INSIDE_LOWER_BB'));
});

test('detects MHV SELL after prior upper-side Extreme context and return inside upper BB',()=>{
  const r=detectMhv({series:[
    c(t1,{high:3751,close:3749,bb_upper:3750,ma5_high:3751}),
    c(t2,{high:3749,close:3746,bb_upper:3750,ma5_high:3748})
  ],timeframe:'H1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'SELL');
  assert.ok(r.evidence.includes('PRIOR_EXTREME_SELL_CONTEXT')); assert.ok(r.evidence.includes('RETURN_INSIDE_UPPER_BB'));
});

test('does not emit MHV from a single unrelated candle',()=>{
  const r=detectMhv({series:[c(t2,{close:3734,bb_lower:3730})],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'INSUFFICIENT_DATA');
});

test('requires prior Extreme context',()=>{
  const r=detectMhv({series:[c(t1),c(t2,{close:3734,bb_lower:3730})],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'OK');
});

test('return equality on BB boundary is not yet inside',()=>{
  const r=detectMhv({series:[
    c(t1,{low:3729,bb_lower:3730,ma5_low:3729}),
    c(t2,{close:3730,bb_lower:3730})
  ],timeframe:'M15'});
  assert.equal(r.detected,false);
});
