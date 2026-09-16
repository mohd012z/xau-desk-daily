import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTradePlanInput, normalizeMarketFeedState } from '../../macro/ui/trade-plan-integration.mjs';

test('no active timed event produces no trade plan input',()=>{
  assert.equal(buildTradePlanInput({event:null}),null);
  assert.equal(buildTradePlanInput({event:{title:'Untimed'}}),null);
});

test('event metadata maps to an analysis-only low-confidence plan input by default',()=>{
  const input=buildTradePlanInput({
    event:{id:'e1',title:'US CPI',eventTimeUtc:'2026-09-16T18:30:00Z',timeSource:'OFFICIAL',timeConfidence:'HIGH',state:'UPCOMING',affectedAssets:{currencies:['USD'],primary:['EUR/USD','XAU/USD'],secondary:['BTC/USD'],context:['DXY']},revisions:[{revisionNumber:1}]},
    marketFeedState:'SNAPSHOT',nowUtc:'2026-09-16T18:20:00Z'
  });
  assert.equal(input.eventName,'US CPI');
  assert.equal(input.feedState,'SNAPSHOT');
  assert.equal(input.pressure,'MIXED');
  assert.equal(input.observed,'NOT_YET_MEASURED');
  assert.equal(input.effectiveSampleSize,0);
  assert.deepEqual(input.affectedAssets,['USD','EUR/USD','XAU/USD','BTC/USD','DXY']);
  for(const key of ['entry','stopLoss','takeProfit','buy','sell']) assert.equal(Object.hasOwn(input,key),false);
});

test('verified model overrides may add history, pivot and reference price without legacy order fields',()=>{
  const input=buildTradePlanInput({event:{id:'e2',title:'CPI',eventTimeUtc:'2026-09-16T18:30:00Z',affectedAssets:{}},marketFeedState:'STREAMING',overrides:{pressure:'DOWN_PRESSURE',historical:{n:50,median:-10,p10:-25,p25:-15,p75:2,p90:10},effectiveSampleSize:40,modelAgreement:'AGREE',prices:{from:1.184},priceBand:[1.179,1.181],pivotContext:{timeframe:'D1',source:'PREVIOUS_COMPLETED_PERIOD',levels:{pivot:1.1846,s1:1.18}},entry:1.184,stopLoss:1.19,takeProfit:1.18}});
  assert.equal(input.pressure,'DOWN_PRESSURE');
  assert.equal(input.historical.n,50);
  assert.equal(input.pivotContext.source,'PREVIOUS_COMPLETED_PERIOD');
  for(const key of ['entry','stopLoss','takeProfit']) assert.equal(Object.hasOwn(input,key),false);
});

test('market feed state normalization fails closed',()=>{
  assert.equal(normalizeMarketFeedState('streaming'),'STREAMING');
  assert.equal(normalizeMarketFeedState('SNAPSHOT • GATEWAY ERROR'),'SNAPSHOT');
  assert.equal(normalizeMarketFeedState('GATEWAY'),'UNKNOWN');
});