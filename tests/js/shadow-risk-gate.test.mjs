import test from'node:test';import assert from'node:assert/strict';import{evaluateShadowRiskGate}from'../../macro/core/shadow-risk-gate.mjs';
const health=(ok=true,macro='AVAILABLE')=>({technical_confirmation_allowed:ok,macro_state:macro,reasons:ok?[]:['PRICE_STALE']});
test('healthy macro allow passes',()=>assert.equal(evaluateShadowRiskGate({macroObservation:{state:'ALLOW',reason_codes:[]},dataHealth:health()}).state,'ALLOW'));
test('watch and block preserve restriction',()=>{assert.equal(evaluateShadowRiskGate({macroObservation:{state:'WATCH_ONLY',reason_codes:[]},dataHealth:health()}).state,'WATCH_ONLY');assert.equal(evaluateShadowRiskGate({macroObservation:{state:'BLOCK',reason_codes:[]},dataHealth:health()}).state,'BLOCK');});
test('stale macro health fails closed',()=>assert.equal(evaluateShadowRiskGate({macroObservation:{state:'ALLOW',reason_codes:[]},dataHealth:health(true,'UNKNOWN')}).state,'BLOCK'));
test('unsafe technical health fails closed',()=>assert.equal(evaluateShadowRiskGate({macroObservation:{state:'ALLOW',reason_codes:[]},dataHealth:health(false)}).state,'BLOCK'));
