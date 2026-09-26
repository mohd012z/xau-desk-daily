import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBbma, buildBbmaTimeframeMap } from '../../macro/bbma/aggregate.mjs';

const c=(t,o={})=>({timestamp_utc:t,open:3740,high:3745,low:3735,close:3740,bb_upper:3750,bb_mid:3740,bb_lower:3730,ma5_high:3743,ma5_low:3737,ma10_high:3742,ma10_low:3738,ema50:3728,...o});
const t1='2026-09-24T06:15:00.000Z', t2='2026-09-24T06:30:00.000Z';
const neutral=[c(t1),c(t2)];

test('aggregate retains all five detector observations for audit',()=>{
  const r=aggregateBbma({timeframe:'M15',series:neutral,ruleVersion:'bbma-shadow-v1'});
  assert.equal(r.timeframe,'M15');
  assert.equal(r.rule_version,'bbma-shadow-v1');
  assert.deepEqual(Object.keys(r.observations).sort(),['CSA','EXTREME','MHV','MOMENTUM','REENTRY']);
  assert.equal(Object.isFrozen(r),true);
});

test('six timeframe map preserves unavailable entries and descriptive alignment only',()=>{
  const map=buildBbmaTimeframeMap({D1:neutral,H4:neutral,H1:neutral,M30:neutral,M15:neutral,M5:null},'bbma-shadow-v1');
  assert.deepEqual(Object.keys(map.timeframes),['D1','H4','H1','M30','M15','M5']);
  assert.equal(map.timeframes.M5.status,'UNAVAILABLE');
  assert.ok(map.alignment.unavailable_timeframes.includes('M5'));
  assert.equal('direction' in map.alignment,false);
  assert.equal('verdict' in map,false);
});

test('identical input produces deterministic aggregation',()=>{
  const a=buildBbmaTimeframeMap({D1:neutral,H4:neutral,H1:neutral,M30:neutral,M15:neutral,M5:neutral});
  const b=buildBbmaTimeframeMap({D1:neutral,H4:neutral,H1:neutral,M30:neutral,M15:neutral,M5:neutral});
  assert.deepEqual(a,b);
});
