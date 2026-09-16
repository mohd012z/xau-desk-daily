import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTradePlanMarkup } from '../../macro/ui/trade-plan-view.mjs';

test('trade plan markup is MYT-first and analysis-only',()=>{
 const html=renderTradePlanMarkup({eventName:'US CPI',eventTimeMyt:'17 Sep 2026 02:00:00 MYT',countdown:{text:'T-00:05:00'},modelState:'ADVANCE',timeSource:'OFFICIAL',timeConfidence:'HIGH',affectedAssets:['XAU/USD','EUR/USD'],pressure:'DOWN_PRESSURE',observed:'NOT_YET_MEASURED',confirmation:'PENDING',historical:{n:60,median:-8,p25:-18,p75:5,p10:-30,p90:20},prices:{from:1.18},quality:{label:'HIGH',reasons:[]}});
 assert.match(html,/MYT/); assert.match(html,/Asia\/Kuala_Lumpur/); assert.match(html,/DOWN_PRESSURE/); assert.match(html,/NOT_YET_MEASURED/); assert.match(html,/PENDING/);
 for(const forbidden of ['BUY setup','SELL setup','Stop loss','Take profit']) assert.doesNotMatch(html,new RegExp(forbidden,'i'));
});

test('quality reasons are visible',()=>{
 const html=renderTradePlanMarkup({eventName:'Speech',eventTimeMyt:'17 Sep 2026 02:00:00 MYT',countdown:{text:'T+00:01:00'},modelState:'LIVE REACTION',affectedAssets:[],pressure:'MIXED',observed:'MIXED',confirmation:'PARTIAL',quality:{label:'LOW',reasons:['LOW_SAMPLE_SIZE']}});
 assert.match(html,/LOW_SAMPLE_SIZE/);
});