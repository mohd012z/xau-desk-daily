import test from 'node:test';
import assert from 'node:assert/strict';
import { detectExtreme } from '../../macro/bbma/extreme.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:3740,high:3745,low:3735,close:3740,bb_upper:3750,bb_mid:3740,bb_lower:3730,ma5_high:3743,ma5_low:3737,ma10_high:3742,ma10_low:3738,ema50:3728,...o});
const t='2026-09-24T06:30:00.000Z';

test('detects Extreme BUY when lower BB is touched and MA5 low is outside lower BB',()=>{
  const r=detectExtreme({series:[c(t,{low:3730,bb_lower:3730,ma5_low:3729})],timeframe:'M15',ruleVersion:'bbma-shadow-v1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'BUY'); assert.equal(r.anchor_utc,t); assert.equal(r.rule_version,'bbma-shadow-v1');
  assert.ok(r.evidence.includes('LOW_TOUCH_LOWER_BB')); assert.ok(r.evidence.includes('MA5_LOW_OUTSIDE_LOWER_BB'));
});

test('detects Extreme SELL when upper BB is touched and MA5 high is outside upper BB',()=>{
  const r=detectExtreme({series:[c(t,{high:3750,bb_upper:3750,ma5_high:3751})],timeframe:'H1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'SELL');
  assert.ok(r.evidence.includes('HIGH_TOUCH_UPPER_BB')); assert.ok(r.evidence.includes('MA5_HIGH_OUTSIDE_UPPER_BB'));
});

test('does not detect when BB is touched but MA5 remains inside BB',()=>{
  const r=detectExtreme({series:[c(t,{low:3730,bb_lower:3730,ma5_low:3732})],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'OK');
});

test('BB equality counts as touch but MA5 equality is not outside',()=>{
  const touch=detectExtreme({series:[c(t,{low:3730,bb_lower:3730,ma5_low:3729})],timeframe:'M15'});
  const maEqual=detectExtreme({series:[c(t,{low:3730,bb_lower:3730,ma5_low:3730})],timeframe:'M15'});
  assert.equal(touch.detected,true); assert.equal(maEqual.detected,false);
});

test('returns explicit insufficient-data state instead of fabricating signal',()=>{
  const r=detectExtreme({series:[],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'INSUFFICIENT_DATA');
});
