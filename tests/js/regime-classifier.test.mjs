import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEvidenceRegime } from '../../macro/maturity/regime-classifier.mjs';

const policy={version:'phase6-test-v1',sessions:{asia:[0,8],london:[7,16],new_york:[12,21]},spread:{elevated:0.30,extreme:0.60},volatility:{lowBelow:8,highAtOrAbove:20}};
const base={observedUtc:'2026-09-25T06:30:00.000Z',direction:'BUY',readiness:'CONFIRMABLE',gate:'ALLOW',eventClass:'INFLATION',eventProximity:'OUTSIDE',spread:0.20,volatility:12,dataHealth:'HEALTHY'};

test('classifies deterministic UTC sessions including overlap',()=>{
 assert.equal(classifyEvidenceRegime({...base,observedUtc:'2026-09-25T06:30:00.000Z'},policy).session,'ASIA');
 assert.equal(classifyEvidenceRegime({...base,observedUtc:'2026-09-25T07:30:00.000Z'},policy).session,'ASIA_LONDON_OVERLAP');
 assert.equal(classifyEvidenceRegime({...base,observedUtc:'2026-09-25T13:00:00.000Z'},policy).session,'LONDON_NEW_YORK_OVERLAP');
 assert.equal(classifyEvidenceRegime({...base,observedUtc:'2026-09-25T20:00:00.000Z'},policy).session,'NEW_YORK');
});

test('uses explicit spread and volatility thresholds',()=>{
 assert.equal(classifyEvidenceRegime({...base,spread:0.29,volatility:7.9},policy).spread_regime,'NORMAL');
 assert.equal(classifyEvidenceRegime({...base,spread:0.30,volatility:8},policy).spread_regime,'ELEVATED');
 assert.equal(classifyEvidenceRegime({...base,spread:0.60,volatility:20},policy).spread_regime,'EXTREME');
 assert.equal(classifyEvidenceRegime({...base,spread:0.60,volatility:20},policy).volatility_regime,'HIGH');
});

test('preserves unknown inputs instead of dropping evidence',()=>{
 const out=classifyEvidenceRegime({...base,eventClass:null,eventProximity:null,spread:null,volatility:null,dataHealth:null},policy);
 assert.equal(out.event_class,'UNKNOWN');
 assert.equal(out.event_proximity,'UNKNOWN');
 assert.equal(out.spread_regime,'UNKNOWN');
 assert.equal(out.volatility_regime,'UNKNOWN');
 assert.equal(out.data_health_regime,'UNKNOWN');
});

test('records versioned policy and remains deeply immutable',()=>{
 const out=classifyEvidenceRegime(base,policy);
 assert.equal(out.policy_version,'phase6-test-v1');
 assert.equal(Object.isFrozen(out),true);
 assert.equal(out.direction,'BUY');
});
