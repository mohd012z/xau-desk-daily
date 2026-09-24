import test from 'node:test';
import assert from 'node:assert/strict';
import { composeBbmaShadowCandidate } from '../../macro/bbma/shadow-candidate.mjs';
const evidence={engine:'BBMA_MTF',rule_version:'bbma-shadow-v1',overall_state:'ALIGNED_BUY',timeframes:[]};
const confluence={direction:'BUY',readiness:'CONFIRMABLE',supporting_timeframes:['D1','H4','H1','M15','M5'],conflict_timeframes:[],reason_codes:['DIRECTION_BUY'],data_status:'OK',rule_version:'bbma-shadow-v1'};
const gate={state:'ALLOW',reason_codes:[]};
const at='2026-09-24T14:10:00.000Z';
test('composes deterministic immutable BUY candidate',()=>{
 const a=composeBbmaShadowCandidate({symbol:'XAUUSD',evidence,confluence,gate,generatedUtc:at});
 const b=composeBbmaShadowCandidate({symbol:'XAUUSD',evidence,confluence,gate,generatedUtc:at});
 assert.deepEqual(a,b); assert.equal(a.direction,'BUY'); assert.equal(a.state,'DETECTED');
 assert.equal(Object.isFrozen(a),true); assert.equal(Object.isFrozen(a.evidence),true);
});
test('mixed/incomplete evidence cannot present confirmed readiness',()=>{
 const mixed={...evidence,overall_state:'MIXED'};
 const blocked={...confluence,direction:null,readiness:'BLOCKED',reason_codes:['DIRECTION_CONFLICT']};
 const out=composeBbmaShadowCandidate({symbol:'XAUUSD',evidence:mixed,confluence:blocked,gate,generatedUtc:at});
 assert.equal(out.readiness,'BLOCKED'); assert.equal(out.direction,null);
});
