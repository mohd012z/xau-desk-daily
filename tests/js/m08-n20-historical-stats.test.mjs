import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHistoricalEvidence } from '../../macro/replay/m08-n20-historical-stats.mjs';

const group=(n, outcomes={})=>({sampleSize:n,signature:{temporal:{morning:'UP',night:'UP',relation:'SAME_DIRECTION',retest:'M08_RETEST_HOLD'},bbma:{relation:'ALIGNED',direction:'BUY',readiness:'CONFIRMABLE'},regime:{session:'NEW_YORK',eventClass:'NONE',eventProximity:'OUTSIDE',spread:'NORMAL',volatility:'NORMAL',dataHealth:'HEALTHY',policyVersion:'v1'}},outcomes});

test('small samples are explicitly insufficient rather than ranked',()=>{
 const out=summarizeHistoricalEvidence({groups:[group(4,{'120':{CONTINUATION:3,REVERSAL:1}})]},{minimumSample:10});
 assert.equal(out.groups[0].evidenceStatus,'INSUFFICIENT_SAMPLE');
 assert.equal(out.groups[0].eligibleForComparison,false);
});

test('eligible groups expose descriptive proportions but no recommendation or score',()=>{
 const out=summarizeHistoricalEvidence({groups:[group(10,{'120':{CONTINUATION:7,REVERSAL:3}})]},{minimumSample:10});
 const g=out.groups[0];
 assert.equal(g.evidenceStatus,'DESCRIPTIVE'); assert.equal(g.eligibleForComparison,true);
 assert.equal(g.horizons['120'].proportions.CONTINUATION,0.7);
 assert.equal('score' in g,false); assert.equal('recommendation' in g,false); assert.equal('winner' in g,false);
});

test('MFE MAE and forward movement use median and quantiles when observations exist',()=>{
 const observations=Array.from({length:10},(_,i)=>({mfe:i+1,mae:-(i+1),forwardMove:(i+1)*2}));
 const g={...group(10),observations};
 const out=summarizeHistoricalEvidence({groups:[g]},{minimumSample:10});
 assert.equal(out.groups[0].movement.mfe.median,5.5);
 assert.equal(out.groups[0].movement.mae.median,-5.5);
 assert.equal(out.groups[0].movement.forwardMove.median,11);
});

test('missing movement observations stay unavailable',()=>{
 const out=summarizeHistoricalEvidence({groups:[group(12)]},{minimumSample:10});
 assert.equal(out.groups[0].movement.status,'UNAVAILABLE');
});

test('invalid minimum sample is rejected',()=>{
 assert.throws(()=>summarizeHistoricalEvidence({groups:[]},{minimumSample:0}),/minimumSample/);
});
