import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMomentum } from '../../macro/bbma/momentum.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:3740,high:3745,low:3735,close:3740,bb_upper:3750,bb_mid:3740,bb_lower:3730,ma5_high:3743,ma5_low:3737,ma10_high:3742,ma10_low:3738,ema50:3728,...o});
const t='2026-09-24T06:30:00.000Z';

test('detects Momentum BUY only when bullish body closes above upper BB',()=>{
  const r=detectMomentum({series:[c(t,{open:3748,low:3747,high:3754,close:3752,bb_upper:3750})],timeframe:'M15',ruleVersion:'bbma-shadow-v1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'BUY'); assert.equal(r.anchor_utc,t); assert.equal(r.rule_version,'bbma-shadow-v1');
  assert.ok(r.evidence.includes('BULLISH_BODY')); assert.ok(r.evidence.includes('CLOSE_ABOVE_UPPER_BB'));
});

test('detects Momentum SELL only when bearish body closes below lower BB',()=>{
  const r=detectMomentum({series:[c(t,{open:3732,high:3733,low:3726,close:3728,bb_lower:3730})],timeframe:'H1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'SELL');
  assert.ok(r.evidence.includes('BEARISH_BODY')); assert.ok(r.evidence.includes('CLOSE_BELOW_LOWER_BB'));
});

test('wick outside BB without close outside is not Momentum',()=>{
  const r=detectMomentum({series:[c(t,{open:3746,high:3753,close:3749,bb_upper:3750})],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'OK');
});

test('doji/tiny zero body does not become Momentum merely from boundary position',()=>{
  const r=detectMomentum({series:[c(t,{open:3751,close:3751,high:3753,low:3749,bb_upper:3750})],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null);
});

test('BB equality is not outside under bbma-shadow-v1',()=>{
  const buy=detectMomentum({series:[c(t,{open:3748,close:3750,high:3752,bb_upper:3750})],timeframe:'M15'});
  const sell=detectMomentum({series:[c(t,{open:3732,close:3730,low:3728,bb_lower:3730})],timeframe:'M15'});
  assert.equal(buy.detected,false); assert.equal(sell.detected,false);
});

test('returns explicit insufficient-data state',()=>{
  const r=detectMomentum({series:[],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'INSUFFICIENT_DATA');
});
