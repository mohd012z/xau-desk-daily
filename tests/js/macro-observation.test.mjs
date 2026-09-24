import test from 'node:test';import assert from 'node:assert/strict';import{aggregateMacroObservation}from'../../macro/core/macro-observation.mjs';
const e=(risk,rel=true)=>({event_ref:`e-${risk}`,xau_relevant:rel,risk,reason_codes:[risk]});
test('strongest relevant restriction wins',()=>{assert.equal(aggregateMacroObservation({events:[e('NONE'),e('WATCH_ONLY')]}).state,'WATCH_ONLY');assert.equal(aggregateMacroObservation({events:[e('WATCH_ONLY'),e('BLOCK')]}).state,'BLOCK');});
test('irrelevant event cannot block XAU',()=>assert.equal(aggregateMacroObservation({events:[e('BLOCK',false)]}).state,'ALLOW'));
test('malformed relevant evidence fails closed',()=>assert.equal(aggregateMacroObservation({events:[{event_ref:'bad',xau_relevant:true,risk:'UNKNOWN',reason_codes:[]}]}).state,'BLOCK'));
