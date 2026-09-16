import test from'node:test';
import assert from'node:assert/strict';
import{renderTradePlanInto,renderAndRecordTradePlan,installPlanNavigation}from'../../macro/ui/trade-plan-controller.mjs';

test('controller renders composed MYT plan into host',()=>{const host={innerHTML:''};const p=renderTradePlanInto(host,{eventName:'Fed speech',eventTimeUtc:'2026-09-16T18:00:00Z',nowUtc:'2026-09-16T17:59:00Z',pressure:'MIXED',effectiveSampleSize:0,timeConfidence:'LOW',feedState:'SNAPSHOT'});assert.match(host.innerHTML,/MYT EVENT TRADE PLAN/);assert.equal(p.confirmation,'PENDING');assert.match(host.innerHTML,/LOW_SAMPLE_SIZE/);assert.match(host.innerHTML,/SNAPSHOT_FEED/);});

test('runtime render records sanitized plan history and includes it in rendered plan',()=>{
  const host={innerHTML:''};
  const input={eventId:'e1',eventName:'Fed speech',eventTimeUtc:'2026-09-16T18:00:00Z',nowUtc:'2026-09-16T18:08:00Z',modelState:'LIVE REACTION',pressure:'DOWN_PRESSURE',observed:'DOWN',effectiveSampleSize:50,timeConfidence:'HIGH',feedState:'STREAMING',modelAgreement:'AGREE',historical:{n:50,median:-12,p10:-25,p25:-18,p75:1,p90:8},prices:{from:1.184},priceBand:[1.181,1.182],pivotContext:{timeframe:'D1',source:'PREVIOUS_COMPLETED_PERIOD',levels:{pivot:1.1846,r1:1.187,r2:1.19,r3:1.193,s1:1.1819,s2:1.179,s3:1.176}}};
  const result=renderAndRecordTradePlan(host,input,{history:[],createdAtUtc:'2026-09-16T18:08:00Z',reason:'REVISED',sourceRevisionNumber:2});
  assert.equal(result.history.length,1);
  assert.equal(result.plan.revisions.length,1);
  assert.equal(result.plan.revisions[0].sourceRevisionNumber,2);
  assert.match(host.innerHTML,/PLAN REVISION HISTORY/);
  assert.match(host.innerHTML,/R2/);
});

test('runtime render deduplicates unchanged plan snapshot',()=>{
  const host={innerHTML:''};
  const input={eventId:'e1',eventName:'CPI',eventTimeUtc:'2026-09-16T18:00:00Z',nowUtc:'2026-09-16T17:59:00Z',pressure:'MIXED',effectiveSampleSize:0,timeConfidence:'LOW',feedState:'SNAPSHOT',modelAgreement:'UNKNOWN'};
  const one=renderAndRecordTradePlan(host,input,{history:[],createdAtUtc:'2026-09-16T17:59:00Z',reason:'CREATED',sourceRevisionNumber:1});
  const two=renderAndRecordTradePlan(host,input,{history:one.history,createdAtUtc:'2026-09-16T17:59:30Z',reason:'SYNC',sourceRevisionNumber:1});
  assert.equal(two.history.length,1);
});

test('PLAN navigation installs and cleans up one click handler',()=>{let handler=null,scrolled=0;const button={addEventListener:(type,fn)=>{assert.equal(type,'click');handler=fn;},removeEventListener:(type,fn)=>{assert.equal(fn,handler);handler=null;}},host={scrollIntoView:()=>{scrolled++;}};const cleanup=installPlanNavigation({button,host});handler();assert.equal(scrolled,1);cleanup();assert.equal(handler,null);});