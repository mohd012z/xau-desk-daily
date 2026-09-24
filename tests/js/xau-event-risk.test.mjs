import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeXauEventRisk } from '../../macro/adapters/xau-event-risk.mjs';

const policy={preWindowMinutes:30,blockWindowMinutes:15,postWindowMinutes:20};
const event=(overrides={})=>({id:'evt-fed',title:'Federal Reserve rate decision',eventTimeUtc:'2026-09-24T14:00:00.000Z',affectedAssets:{currencies:['USD'],primary:[],secondary:['XAU/USD'],context:['DXY']},impact:'HIGH',...overrides});

test('relevant high-impact event maps exact UTC phases deterministically',()=>{
 assert.equal(normalizeXauEventRisk({event:event(),observedUtc:'2026-09-24T13:30:00.000Z',policy}).phase,'UPCOMING');
 assert.equal(normalizeXauEventRisk({event:event(),observedUtc:'2026-09-24T13:45:00.000Z',policy}).phase,'WINDOW');
 assert.equal(normalizeXauEventRisk({event:event(),observedUtc:'2026-09-24T14:15:00.000Z',policy}).phase,'WINDOW');
 assert.equal(normalizeXauEventRisk({event:event(),observedUtc:'2026-09-24T14:20:00.000Z',policy}).phase,'POST');
});
test('irrelevant high impact event stays irrelevant to XAU',()=>{
 const out=normalizeXauEventRisk({event:event({title:'ECB event',affectedAssets:{currencies:['EUR'],primary:['EUR/GBP'],secondary:[],context:[]}}),observedUtc:'2026-09-24T14:00:00.000Z',policy});
 assert.equal(out.xau_relevant,false); assert.equal(out.risk,'NONE');
});
test('unknown relevant impact fails closed',()=>{
 const out=normalizeXauEventRisk({event:event({impact:'UNKNOWN'}),observedUtc:'2026-09-24T14:00:00.000Z',policy});
 assert.equal(out.risk,'BLOCK'); assert.ok(out.reason_codes.includes('UNKNOWN_RELEVANT_IMPACT'));
});
test('malformed relevant event time fails closed',()=>{
 const out=normalizeXauEventRisk({event:event({eventTimeUtc:null}),observedUtc:'2026-09-24T14:00:00.000Z',policy});
 assert.equal(out.risk,'BLOCK'); assert.ok(out.reason_codes.includes('INVALID_EVENT_TIME'));
});
