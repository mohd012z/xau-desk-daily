import test from 'node:test';
import assert from 'node:assert/strict';
import { buildM08N20EvidenceMatrix } from '../../macro/replay/m08-n20-evidence-matrix.mjs';

const row=(id,overrides={})=>({schemaVersion:'m08-n20-daily-replay-v1',replayId:id,mytDate:`2026-09-${id.padStart(2,'0')}`,completeness:'COMPLETE',temporal:{m08:{state:'UP'},n20:{state:'UP'},relation:{relation:'SAME_DIRECTION'},retest:{state:'M08_RETEST_HOLD'},checkpoints:{at1130:{state:'TREND_CONTINUING'},at1800:{state:'PULLBACK'}}},context:{bbma:{relation:'ALIGNED',bbma:{direction:'BUY',readiness:'CONFIRMABLE'}},regime:{session:'NEW_YORK',event_class:'NONE',event_proximity:'OUTSIDE',spread_regime:'NORMAL',volatility_regime:'NORMAL',data_health_regime:'HEALTHY',policy_version:'v1'}},outcomes:[{horizonMinutes:120,label:'CONTINUATION'}],...overrides});

test('groups identical evidence signatures without inventing a trading score',()=>{
 const out=buildM08N20EvidenceMatrix([row('1'),row('2')]);
 assert.equal(out.totalRecords,2); assert.equal(out.groups.length,1); assert.equal(out.groups[0].sampleSize,2);
 assert.equal('score' in out.groups[0],false); assert.equal('winRate' in out.groups[0],false);
});

test('keeps opposite Night Setup separate from aligned setup',()=>{
 const opposite=row('3',{temporal:{...row('3').temporal,n20:{state:'DOWN'},relation:{relation:'OPPOSITE_DIRECTION'}}});
 const out=buildM08N20EvidenceMatrix([row('1'),opposite]);
 assert.equal(out.groups.length,2);
});

test('preserves UNKNOWN regime dimensions as their own evidence bucket',()=>{
 const unknown=row('4',{context:{...row('4').context,regime:{...row('4').context.regime,event_class:'UNKNOWN',data_health_regime:'UNKNOWN'}}});
 const out=buildM08N20EvidenceMatrix([unknown]);
 assert.equal(out.groups[0].signature.regime.eventClass,'UNKNOWN');
 assert.equal(out.groups[0].signature.regime.dataHealth,'UNKNOWN');
});

test('outcomes are descriptive counts by horizon and label',()=>{
 const out=buildM08N20EvidenceMatrix([row('1'),row('2',{outcomes:[{horizonMinutes:120,label:'REVERSAL'}]})]);
 assert.deepEqual(out.groups[0].outcomes['120'],{CONTINUATION:1,REVERSAL:1});
});

test('captures available MFE MAE and forward movement observations for statistics',()=>{
 const measured=row('8',{outcomes:[{horizonMinutes:120,status:'AVAILABLE',forwardMove:8,mfe:9,mae:-2}]});
 const missing=row('9',{outcomes:[{horizonMinutes:120,status:'UNAVAILABLE',forwardMove:null,mfe:null,mae:null}]});
 const out=buildM08N20EvidenceMatrix([measured,missing]);
 assert.deepEqual(out.groups[0].observations,[{horizonMinutes:120,forwardMove:8,mfe:9,mae:-2,replayId:'8'}]);
});

test('partial records are counted but excluded from complete-only groups by default',()=>{
 const partial=row('5',{completeness:'PARTIAL'});
 const out=buildM08N20EvidenceMatrix([row('1'),partial]);
 assert.equal(out.totalRecords,2); assert.equal(out.completeRecords,1); assert.equal(out.partialRecords,1); assert.equal(out.groups[0].sampleSize,1);
});

test('result ordering is deterministic',()=>{
 const a=row('6'); const b=row('7',{temporal:{...row('7').temporal,m08:{state:'DOWN'},n20:{state:'DOWN'}}});
 assert.deepEqual(buildM08N20EvidenceMatrix([a,b]),buildM08N20EvidenceMatrix([b,a]));
});
