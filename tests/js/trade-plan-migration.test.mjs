import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTradePlan } from '../../macro/events/trade-plan.mjs';

test('plan retains ATR range context and pivot references without order geometry',()=>{
 const p=buildTradePlan({eventId:'e',eventName:'CPI',eventTimeUtc:'2026-09-16T18:00:00Z',nowUtc:'2026-09-16T17:00:00Z',pressure:'DOWN_PRESSURE',atrContext:{atr:0.008,eventMultiplier:1.4},pivotContext:{timeframe:'D1',source:'PREVIOUS_COMPLETED_PERIOD',levels:{pivot:1.1846,s1:1.1819}},effectiveSampleSize:50,timeConfidence:'HIGH',feedState:'STREAMING',modelAgreement:'AGREE'});
 assert.equal(p.atrContext.atr,0.008); assert.equal(p.pivotContext.timeframe,'D1');
 for(const key of ['entry','stopLoss','takeProfit','buy','sell']) assert.equal(Object.hasOwn(p,key),false);
 assert.doesNotMatch(JSON.stringify(p),/SGT/);
});