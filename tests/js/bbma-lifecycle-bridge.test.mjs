import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceBbmaShadowSignal } from '../../macro/bbma/lifecycle-bridge.mjs';
const signal=(state)=>({signal_id:'xau-1',state,history:[]});
const c=(readiness,direction='BUY')=>({readiness,direction,reason_codes:[]});
const g=(state='ALLOW')=>({state,reason_codes:[]});
const t='2026-09-24T14:00:00.000Z';

test('progresses one legal lifecycle state at a time',()=>{
 assert.equal(advanceBbmaShadowSignal({signal:signal('DETECTED'),confluence:c('WATCHABLE'),gate:g(),atUtc:t}).signal.state,'WATCH');
 assert.equal(advanceBbmaShadowSignal({signal:signal('WATCH'),confluence:c('SETUP_READY'),gate:g(),atUtc:t}).signal.state,'SETUP');
 assert.equal(advanceBbmaShadowSignal({signal:signal('SETUP'),confluence:c('CONFIRMABLE'),gate:g(),atUtc:t}).signal.state,'CONFIRMED');
});
test('WATCH_ONLY cannot confirm and BLOCK cannot advance setup',()=>{
 assert.equal(advanceBbmaShadowSignal({signal:signal('SETUP'),confluence:c('CONFIRMABLE'),gate:g('WATCH_ONLY'),atUtc:t}).action,'HOLD');
 assert.equal(advanceBbmaShadowSignal({signal:signal('WATCH'),confluence:c('SETUP_READY'),gate:g('BLOCK'),atUtc:t}).action,'HOLD');
});
test('blocked contradiction recommends invalidation without silently changing direction',()=>{
 const out=advanceBbmaShadowSignal({signal:{...signal('ACTIVE'),direction:'BUY'},confluence:c('BLOCKED',null),gate:g(),atUtc:t});
 assert.equal(out.action,'RECOMMEND_INVALIDATION'); assert.equal(out.signal.state,'ACTIVE');
});
test('explicit direction reversal recommends invalidation for a live directional signal',()=>{
 const out=advanceBbmaShadowSignal({signal:{...signal('ACTIVE'),direction:'BUY'},confluence:c('CONFIRMABLE','SELL'),gate:g(),atUtc:t});
 assert.equal(out.action,'RECOMMEND_INVALIDATION');
 assert.equal(out.reason,'DIRECTION_REVERSAL');
 assert.equal(out.signal.state,'ACTIVE');
 assert.equal(out.signal.direction,'BUY');
});
test('direction reversal does not advance a pre-active signal under the old direction',()=>{
 const out=advanceBbmaShadowSignal({signal:{...signal('SETUP'),direction:'BUY'},confluence:c('CONFIRMABLE','SELL'),gate:g(),atUtc:t});
 assert.equal(out.action,'HOLD');
 assert.equal(out.reason,'DIRECTION_REVERSAL');
 assert.equal(out.signal.state,'SETUP');
});
test('expiry is explicit and uses existing lifecycle',()=>{
 const out=advanceBbmaShadowSignal({signal:signal('ACTIVE'),confluence:c('OBSERVED'),gate:g(),atUtc:t,expire:true});
 assert.equal(out.signal.state,'EXPIRED');
});
