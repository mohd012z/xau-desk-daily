import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMomentum } from '../../macro/bbma/momentum.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:100,high:104,low:96,close:101,bb_upper:105,bb_mid:100,bb_lower:95,ma5_high:102,ma5_low:98,ma10_high:101,ma10_low:99,ema50:100,...o});
const t='2026-09-24T06:30:00.000Z';

test('detects Momentum BUY only on strict close above upper BB',()=>{
  const r=detectMomentum({series:[c(t,{high:108,close:106})],timeframe:'M15'});
  assert.equal(r.detected,true); assert.equal(r.direction,'BUY'); assert.equal(r.detector,'MOMENTUM'); assert.equal(r.anchor_utc,t);
  assert.deepEqual(r.evidence,['CLOSE_ABOVE_UPPER_BB']);
});

test('detects Momentum SELL only on strict close below lower BB',()=>{
  const r=detectMomentum({series:[c(t,{low:92,close:94})],timeframe:'H1'});
  assert.equal(r.detected,true); assert.equal(r.direction,'SELL');
  assert.deepEqual(r.evidence,['CLOSE_BELOW_LOWER_BB']);
});

test('wick-only excursion outside BB is not Momentum',()=>{
  const buy=detectMomentum({series:[c(t,{high:108,close:104})],timeframe:'M15'});
  const sell=detectMomentum({series:[c(t,{low:92,close:96})],timeframe:'M15'});
  assert.equal(buy.detected,false); assert.equal(sell.detected,false);
});

test('close equality at BB boundary is not Momentum in shadow v1',()=>{
  assert.equal(detectMomentum({series:[c(t,{high:106,close:105})],timeframe:'M15'}).detected,false);
  assert.equal(detectMomentum({series:[c(t,{low:94,close:95})],timeframe:'M15'}).detected,false);
});

test('insufficient history is explicit',()=>{
  const r=detectMomentum({series:[],timeframe:'M15'});
  assert.equal(r.detected,false); assert.equal(r.direction,null); assert.equal(r.status,'INSUFFICIENT_DATA');
});
