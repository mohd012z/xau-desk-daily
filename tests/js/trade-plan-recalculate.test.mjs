import test from'node:test';
import assert from'node:assert/strict';
import{appendPlanRevision,appendPlanSnapshot}from'../../macro/events/trade-plan-revisions.mjs';

test('trade plan revisions are append-only and MYT stamped',()=>{const old=[{id:'r1',createdAtUtc:'2026-09-16T18:00:00Z',pressure:'MIXED'}];const next=appendPlanRevision(old,{id:'r2',createdAtUtc:'2026-09-16T18:08:00Z',pressure:'UP_PRESSURE',reason:'Q&A policy shift'});assert.equal(old.length,1);assert.equal(next.length,2);assert.equal(next[1].createdAtMyt,'17 Sep 2026 02:08:00 MYT');assert.equal(next[1].reason,'Q&A policy shift');});
test('invalid revision timestamp is rejected instead of silently using another time',()=>{assert.throws(()=>appendPlanRevision([],{createdAtUtc:'bad-time',reason:'bad'}),/Invalid UTC timestamp/);});
test('revision order cannot move backwards in time',()=>{const old=[{id:'r1',createdAtUtc:'2026-09-16T18:08:00Z'}];assert.throws(()=>appendPlanRevision(old,{id:'r2',createdAtUtc:'2026-09-16T18:07:59Z'}),/chronological/);});
test('revision history rejects an invalid existing tail timestamp',()=>{assert.throws(()=>appendPlanRevision([{id:'bad',createdAtUtc:'bad'}],{id:'r2',createdAtUtc:'2026-09-16T18:08:00Z'}),/existing revision timestamp/);});

test('plan snapshot records descriptive model state without order geometry',()=>{
  const plan={eventId:'e1',modelState:'LIVE REACTION',pressure:'DOWN_PRESSURE',observed:'DOWN',confirmation:'CONFIRMED',quality:{label:'HIGH',reasons:[]},pivotConfluence:{status:'CONFLUENCE',level:'S1',price:1.1819},historical:{n:50,median:-12},prices:{from:1.184},entry:1.184,stopLoss:1.19,takeProfit:1.1819};
  const history=appendPlanSnapshot([],{createdAtUtc:'2026-09-16T18:08:00Z',reason:'SPEECH_REVISION',sourceRevisionNumber:2,plan});
  assert.equal(history.length,1);
  assert.equal(history[0].createdAtMyt,'17 Sep 2026 02:08:00 MYT');
  assert.equal(history[0].pressure,'DOWN_PRESSURE');
  assert.equal(history[0].pivotConfluence.level,'S1');
  const json=JSON.stringify(history[0]);
  assert.doesNotMatch(json,/entry|stopLoss|takeProfit/);
});

test('identical source revision and state snapshot is deduplicated',()=>{
  const plan={eventId:'e1',modelState:'ADVANCE',pressure:'MIXED',observed:'NOT_YET_MEASURED',confirmation:'PENDING',quality:{label:'LOW',reasons:['LOW_SAMPLE_SIZE']},pivotConfluence:{status:'INSUFFICIENT_DATA',level:null,price:null}};
  const one=appendPlanSnapshot([],{createdAtUtc:'2026-09-16T18:00:00Z',reason:'SYNC',sourceRevisionNumber:1,plan});
  const two=appendPlanSnapshot(one,{createdAtUtc:'2026-09-16T18:01:00Z',reason:'SYNC',sourceRevisionNumber:1,plan});
  assert.equal(two.length,1);
});