import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBbmaTimeframe } from '../../macro/bbma/timeframe-evidence.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:100,high:104,low:96,close:101,bb_upper:105,bb_mid:100,bb_lower:95,ma5_high:102,ma5_low:98,ma10_high:101,ma10_low:99,ema50:100,...o});
const quiet=(t)=>c(t,{open:100,high:101,low:99,close:100});
const t1='2026-09-24T06:15:00.000Z', t2='2026-09-24T06:30:00.000Z';

test('retains five primitive detector observations in deterministic order',()=>{
  const r=evaluateBbmaTimeframe({series:[quiet(t1),quiet(t2)],timeframe:'M15'});
  assert.deepEqual(r.observations.map(x=>x.detector),['EXTREME','MHV','CSA','REENTRY','MOMENTUM']);
  assert.equal(Object.isFrozen(r),true); assert.equal(Object.isFrozen(r.observations),true);
});

test('summarizes BUY-only and SELL-only detected evidence',()=>{
  const buy=evaluateBbmaTimeframe({series:[c(t1,{close:101}),c(t2,{high:108,close:106})],timeframe:'M15'});
  const sell=evaluateBbmaTimeframe({series:[c(t1,{close:99,ema50:110}),c(t2,{low:92,close:94,ema50:110})],timeframe:'H1'});
  assert.equal(buy.direction,'BUY'); assert.equal(sell.direction,'SELL');
});

test('opposing primitive detections remain visible as CONFLICT',()=>{
  const r=evaluateBbmaTimeframe({series:[
    c(t1,{close:102,ema50:97}),
    c(t2,{high:106,low:98,close:102,ema50:97,bb_upper:105,ma5_high:106,ma5_low:98})
  ],timeframe:'M15'});
  assert.equal(r.direction,'CONFLICT');
  assert.ok(r.buy_detectors.includes('REENTRY')); assert.ok(r.sell_detectors.includes('EXTREME'));
});

test('no detections are NEUTRAL',()=>{
  const r=evaluateBbmaTimeframe({series:[quiet(t1),quiet(t2)],timeframe:'M30'});
  assert.equal(r.direction,'NEUTRAL'); assert.equal(r.status,'OK');
});

test('insufficient two-candle history remains explicit',()=>{
  const r=evaluateBbmaTimeframe({series:[quiet(t2)],timeframe:'M5'});
  assert.equal(r.status,'INSUFFICIENT_DATA');
});
