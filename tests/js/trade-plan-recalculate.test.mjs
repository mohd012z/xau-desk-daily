import test from'node:test';
import assert from'node:assert/strict';
import{appendPlanRevision,appendPlanSnapshot}from'../../macro/events/trade-plan-revisions.mjs';

test('trade plan revisions are append-only and MYT stamped',()=>{const old=[{id:'r1',createdAtUtc:'2026-09-16T18:00:00Z',pressure:'MIXED'}];const next=appendPlanRevision(old,{id:'r2',createdAtUtc:'2026-09-16T18:08:00Z',pressure:'UP_PRESSURE',reason:'Q&A policy shift'});assert.equal(old.length,1);assert.equal(next.length,2);assert.equal(next[1].createdAtMyt,'17 Sep 2026 02:08:00 MYT');assert.equal(next[1].reason,'Q&A policy shift');});
test('invalid revision timestamp is rejected instead of silently using another time',()=>{assert.throws(()=>appendPlanRevision([],{createdAtUtc:'bad-time',reason:'bad'}),/Invalid UTC timestamp/);});
test('revision order cannot move backwards in time',()=>{const old=[{id:'r1',createdAtUtc:'2026-09-16T18:08:00Z'}];assert.throws(()=>appendPlanRevision(old,{id:'r2',createdAtUtc:'2026-09-16T18:07:59Z'}),/chronological/);});
test('revision history rejects an invalid existing tail timestamp',()=>{assert.throws(()=>appendPlanRevision([{id:'bad',createdAtUtc:'bad'}],{id:'r2',createdAtUtc:'2026-09-16T18:08:00Z'}),/existing revision timestamp/);});

test('plan snapshot records full analytical inputs without order geometry',()=>{
  const plan={
    eventId:'e1',eventName:'Fed speech',eventTimeUtc:'2026-09-16T18:00:00Z',eventTimeMyt:'17 Sep 2026 02:00:00 MYT',timeSource:'OFFICIAL',timeConfidence:'HIGH',affectedAssets:['USD','EUR/USD','XAU/USD'],
    modelState:'LIVE REACTION',pressure:'DOWN_PRESSURE',observed:'DOWN',confirmation:'CONFIRMED',quality:{label:'HIGH',reasons:[]},
    historical:{n:50,median:-12,p10:-25,p25:-18,p75:1,p90:8},prices:{from:1.184},priceBand:[1.181,1.182],atrContext:{atr:.008,eventMultiplier:1.4},
    pivotContext:{timeframe:'D1',source:'PREVIOUS_COMPLETED_PERIOD',levels:{pivot:1.1846,s1:1.1819,s2:1.1797}},pivotConfluence:{status:'CONFLUENCE',level:'S1',price:1.1819},
    entry:1.184,stopLoss:1.19,takeProfit:1.1819
  };
  const history=appendPlanSnapshot([],{createdAtUtc:'2026-09-16T18:08:00Z',reason:'SPEECH_REVISION',sourceRevisionNumber:2,plan});
  assert.equal(history.length,1);
  const snapshot=history[0];
  assert.equal(snapshot.createdAtMyt,'17 Sep 2026 02:08:00 MYT');
  assert.equal(snapshot.eventName,'Fed speech');
  assert.equal(snapshot.timeSource,'OFFICIAL');
  assert.deepEqual(snapshot.affectedAssets,['USD','EUR/USD','XAU/USD']);
  assert.deepEqual(snapshot.priceBand,[1.181,1.182]);
  assert.equal(snapshot.atrContext.atr,.008);
  assert.equal(snapshot.pivotContext.source,'PREVIOUS_COMPLETED_PERIOD');
  assert.equal(snapshot.pivotContext.levels.s1,1.1819);
  assert.equal(snapshot.pressure,'DOWN_PRESSURE');
  assert.equal(snapshot.pivotConfluence.level,'S1');
  const json=JSON.stringify(snapshot);
  assert.doesNotMatch(json,/entry|stopLoss|takeProfit/);
});

test('identical source revision and state snapshot is deduplicated',()=>{
  const plan={eventId:'e1',modelState:'ADVANCE',pressure:'MIXED',observed:'NOT_YET_MEASURED',confirmation:'PENDING',quality:{label:'LOW',reasons:['LOW_SAMPLE_SIZE']},pivotConfluence:{status:'INSUFFICIENT_DATA',level:null,price:null}};
  const one=appendPlanSnapshot([],{createdAtUtc:'2026-09-16T18:00:00Z',reason:'SYNC',sourceRevisionNumber:1,plan});
  const two=appendPlanSnapshot(one,{createdAtUtc:'2026-09-16T18:01:00Z',reason:'SYNC',sourceRevisionNumber:1,plan});
  assert.equal(two.length,1);
});