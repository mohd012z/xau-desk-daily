import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBbmaEvidence, BBMA_TIMEFRAMES } from '../../macro/bbma/mtf-evidence.mjs';
import { routeAlert } from '../../macro/core/alert-router.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:100,high:104,low:96,close:101,bb_upper:105,bb_mid:100,bb_lower:95,ma5_high:102,ma5_low:98,ma10_high:101,ma10_low:99,ema50:100,...o});
const series=()=>[c('2026-09-24T06:15:00.000Z'),c('2026-09-24T06:30:00.000Z')];

test('phase 2 aggregate is a six-timeframe shadow evidence object, not a delivery object',()=>{
  const input=Object.fromEntries(BBMA_TIMEFRAMES.map(tf=>[tf,series()]));
  const r=aggregateBbmaEvidence({seriesByTimeframe:input});
  assert.equal(r.rule_version,'bbma-shadow-v1');
  assert.deepEqual(Object.keys(r.timeframes),BBMA_TIMEFRAMES);
  assert.ok(Array.isArray(r.conflict_timeframes));
  assert.equal('alert_id' in r,false); assert.equal('delivery_enabled' in r,false); assert.equal('signal_id' in r,false);
});

test('existing alert router still requires an explicit candidate and shadow policy disables delivery',()=>{
  const candidate={signal_id:'XAUUSD-M15-BBMA_REENTRY-BUY-20260924T123000Z-abc12345',state:'CONFIRMED',priority:'P2',generated_utc:'2026-09-24T12:31:00.000Z',engine_version:'phase1',rule_version:'v1',data_health:{technical_confirmation_allowed:true},macro:{state:'NORMAL'}};
  const routed=routeAlert({candidate,policy:{shadow_mode:true}});
  assert.equal(routed.action,'DELIVER'); assert.equal(routed.delivery_enabled,false);
});
