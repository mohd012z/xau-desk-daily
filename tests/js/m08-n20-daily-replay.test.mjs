import test from 'node:test';
import assert from 'node:assert/strict';
import { composeM08N20DailyReplay } from '../../macro/replay/m08-n20-daily-replay.mjs';

const m08={id:'2026-09-26:M08',setupId:'M08',mytDate:'2026-09-26',state:'UP',observedUtc:'2026-09-26T01:00:00.000Z',reference:{high:105,low:95}};
const n20={id:'2026-09-26:N20',setupId:'N20',mytDate:'2026-09-26',state:'DOWN',observedUtc:'2026-09-26T13:00:00.000Z',reference:{high:112,low:108}};
const cp1130={checkpoint:'11:30',checkpointUtc:'2026-09-26T03:30:00.000Z',state:'TREND_CONTINUING'};
const cp1800={checkpoint:'18:00',checkpointUtc:'2026-09-26T10:00:00.000Z',state:'PULLBACK'};
const relation={relation:'OPPOSITE_DIRECTION',m08Id:m08.id,n20Id:n20.id};
const retest={state:'M08_RETEST_HOLD',touched:true,level:105,tolerance:1};
const cross={relation:'ALIGNED',bbma:{direction:'BUY',readiness:'CONFIRMABLE',effectiveUtc:'2026-09-26T12:30:00.000Z'}};
const regime={observed_utc:'2026-09-26T13:00:00.000Z',session:'NEW_YORK',event_class:'INFLATION',event_proximity:'PRE_EVENT',spread_regime:'NORMAL',volatility_regime:'HIGH',data_health_regime:'HEALTHY',policy_version:'regime-v1'};

test('composes one immutable traceable MYT daily evidence record',()=>{
 const out=composeM08N20DailyReplay({replayId:'r1',mytDate:'2026-09-26',m08,n20,checkpoints:{at1130:cp1130,at1800:cp1800},relation,retest,crossContext:cross,regime,sourceRefs:['xau-30m-20260926']});
 assert.equal(out.mytDate,'2026-09-26');
 assert.equal(out.temporal.m08.state,'UP');
 assert.equal(out.temporal.n20.state,'DOWN');
 assert.equal(out.temporal.relation.relation,'OPPOSITE_DIRECTION');
 assert.equal(out.context.bbma.relation,'ALIGNED');
 assert.equal(out.context.regime.event_class,'INFLATION');
 assert.deepEqual(out.sourceRefs,['xau-30m-20260926']);
 assert.ok(Object.isFrozen(out));
});

test('partial day retains Morning Setup when Night Setup is unavailable',()=>{
 const out=composeM08N20DailyReplay({replayId:'r2',mytDate:'2026-09-26',m08,n20:null,checkpoints:{at1130:cp1130,at1800:cp1800},relation:{relation:'N20_UNRESOLVED'},retest:null,crossContext:null,regime:null,sourceRefs:['partial']});
 assert.equal(out.temporal.m08.state,'UP');
 assert.equal(out.temporal.n20,null);
 assert.equal(out.completeness,'PARTIAL');
});

test('later outcomes remain separate from original observation evidence',()=>{
 const outcome={horizonMinutes:120,label:'RETEST_HOLD',attachedUtc:'2026-09-26T15:00:00.000Z'};
 const out=composeM08N20DailyReplay({replayId:'r3',mytDate:'2026-09-26',m08,n20,checkpoints:{at1130:cp1130,at1800:cp1800},relation,retest,crossContext:cross,regime,outcomes:[outcome],sourceRefs:['x']});
 assert.equal(out.outcomes[0].label,'RETEST_HOLD');
 assert.equal(out.temporal.m08.state,'UP');
 assert.equal(out.observation.outcomeDerived,false);
});

test('identical inputs replay deterministically',()=>{
 const input={replayId:'r4',mytDate:'2026-09-26',m08,n20,checkpoints:{at1130:cp1130,at1800:cp1800},relation,retest,crossContext:cross,regime,sourceRefs:['x']};
 assert.deepEqual(composeM08N20DailyReplay(input),composeM08N20DailyReplay(input));
});

test('rejects future context relative to Night Setup observation',()=>{
 const future={...cross,bbma:{...cross.bbma,effectiveUtc:'2026-09-26T14:00:00.000Z'}};
 assert.throws(()=>composeM08N20DailyReplay({replayId:'r5',mytDate:'2026-09-26',m08,n20,checkpoints:{at1130:cp1130,at1800:cp1800},relation,retest,crossContext:future,regime,sourceRefs:['x']}),/future/i);
});
