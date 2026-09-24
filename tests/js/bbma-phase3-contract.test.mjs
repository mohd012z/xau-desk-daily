import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBbmaConfluence } from '../../macro/bbma/confluence.mjs';
import { evaluateConfirmationGate } from '../../macro/core/confirmation-gate.mjs';
import { composeBbmaShadowCandidate } from '../../macro/bbma/shadow-candidate.mjs';
import { advanceBbmaShadowSignal } from '../../macro/bbma/lifecycle-bridge.mjs';
const order=['D1','H4','H1','M30','M15','M5'];
const aligned=(dir)=>({engine:'BBMA_MTF',rule_version:'bbma-shadow-v1',overall_state:`ALIGNED_${dir}`,status:'OK',timeframes:order.map(k=>({timeframe:k,direction:['D1','H4','H1','M15','M5'].includes(k)?dir:'NEUTRAL',status:'OK',observations:[]})),buy_support:dir==='BUY'?order:[],sell_support:dir==='SELL'?order:[],conflicts:[]});
const at='2026-09-24T15:00:00.000Z';
for(const dir of ['BUY','SELL']) test(`phase3 ${dir} flow stays shadow-only and auditable`,()=>{
 const evidence=aligned(dir); const confluence=evaluateBbmaConfluence({evidence});
 const gate=evaluateConfirmationGate({macroState:'ALLOW',technicalConfirmationAllowed:true});
 const candidate=composeBbmaShadowCandidate({symbol:'XAUUSD',evidence,confluence,gate,generatedUtc:at});
 assert.equal(candidate.kind,'BBMA_SHADOW_CANDIDATE'); assert.equal(candidate.direction,dir); assert.equal(candidate.readiness,'CONFIRMABLE');
 assert.equal('telegram' in candidate,false); assert.equal('execute' in candidate,false);
 let signal={signal_id:'contract',state:'DETECTED',history:[],direction:dir};
 signal=advanceBbmaShadowSignal({signal,confluence,gate,atUtc:at}).signal; assert.equal(signal.state,'WATCH');
 signal=advanceBbmaShadowSignal({signal,confluence,gate,atUtc:at}).signal; assert.equal(signal.state,'SETUP');
 signal=advanceBbmaShadowSignal({signal,confluence,gate,atUtc:at}).signal; assert.equal(signal.state,'CONFIRMED');
});
test('macro block prevents confirmation progression',()=>{
 const confluence=evaluateBbmaConfluence({evidence:aligned('BUY')});
 const gate=evaluateConfirmationGate({macroState:'BLOCK',technicalConfirmationAllowed:true,reasons:['HIGH_IMPACT_WINDOW']});
 const out=advanceBbmaShadowSignal({signal:{signal_id:'x',state:'SETUP',history:[]},confluence,gate,atUtc:at});
 assert.equal(out.action,'HOLD'); assert.equal(out.signal.state,'SETUP');
});
