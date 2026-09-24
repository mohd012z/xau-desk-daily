import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConfirmationGate } from '../../macro/core/confirmation-gate.mjs';

test('normal macro state and healthy technical data allow confirmation',()=>{
 const out=evaluateConfirmationGate({macroState:'ALLOW',technicalConfirmationAllowed:true,reasons:[]});
 assert.equal(out.state,'ALLOW'); assert.equal(Object.isFrozen(out),true);
});
test('watch-only macro state remains watch only',()=>assert.equal(evaluateConfirmationGate({macroState:'WATCH_ONLY',technicalConfirmationAllowed:true}).state,'WATCH_ONLY'));
test('macro block dominates technical strength',()=>assert.equal(evaluateConfirmationGate({macroState:'BLOCK',technicalConfirmationAllowed:true}).state,'BLOCK'));
test('technical health fails closed',()=>{
 const out=evaluateConfirmationGate({macroState:'ALLOW',technicalConfirmationAllowed:false,reasons:['STALE_MARKET_DATA']});
 assert.equal(out.state,'BLOCK'); assert.ok(out.reason_codes.includes('TECHNICAL_CONFIRMATION_UNSAFE'));
});
test('unknown macro state rejects rather than defaulting open',()=>assert.throws(()=>evaluateConfirmationGate({macroState:'UNKNOWN',technicalConfirmationAllowed:true}),TypeError));
