import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBbmaSeries } from '../../macro/bbma/input.mjs';

const candle=(t,overrides={})=>({timestamp_utc:t,open:3740,high:3745,low:3735,close:3742,bb_upper:3750,bb_mid:3740,bb_lower:3730,ma5_high:3743,ma5_low:3737,ma10_high:3742,ma10_low:3738,ema50:3728,...overrides});

test('accepts ascending valid candles without mutating input',()=>{
  const input=[candle('2026-09-24T06:15:00.000Z'),candle('2026-09-24T06:30:00.000Z')];
  const before=JSON.stringify(input); const out=validateBbmaSeries(input,{minimum:2});
  assert.equal(out.length,2); assert.equal(JSON.stringify(input),before); assert.notEqual(out,input);
});

test('rejects insufficient history',()=>assert.throws(()=>validateBbmaSeries([],{minimum:1}),/Insufficient/));
test('rejects NaN Infinity and invalid ranges',()=>{
  assert.throws(()=>validateBbmaSeries([candle('2026-09-24T06:15:00.000Z',{close:NaN})]),TypeError);
  assert.throws(()=>validateBbmaSeries([candle('2026-09-24T06:15:00.000Z',{high:Infinity})]),TypeError);
  assert.throws(()=>validateBbmaSeries([candle('2026-09-24T06:15:00.000Z',{high:3730,low:3740})]),TypeError);
});
test('rejects duplicate and out of order timestamps',()=>{
  const a=candle('2026-09-24T06:15:00.000Z'), b=candle('2026-09-24T06:30:00.000Z');
  assert.throws(()=>validateBbmaSeries([a,a]),TypeError);
  assert.throws(()=>validateBbmaSeries([b,a]),TypeError);
});
