import test from 'node:test';
import assert from 'node:assert/strict';
import { runM08N20EvidencePipeline } from '../../macro/replay/m08-n20-evidence-pipeline.mjs';

const c=(openUtc,open,high,low,close,closeUtc)=>({openUtc,open,high,low,close,closeUtc});
const policy={version:'temporal-v1',timezone:'Asia/Kuala_Lumpur',sourceTimeframeMinutes:30,anchors:{M08:'08:00',N20:'20:00'},checkpoints:['11:30','18:00'],retestTolerance:{mode:'absolute',value:1},outcomeHorizonsMinutes:[30,60,120]};
const candles=[
 c('2026-09-26T00:00:00Z',100,105,95,103,'2026-09-26T00:30:00Z'),
 c('2026-09-26T00:30:00Z',103,108,102,107,'2026-09-26T01:00:00Z'),
 c('2026-09-26T03:00:00Z',107,110,106,109,'2026-09-26T03:30:00Z'),
 c('2026-09-26T09:30:00Z',109,111,108,110,'2026-09-26T10:00:00Z'),
 c('2026-09-26T12:00:00Z',110,113,108,109,'2026-09-26T12:30:00Z'),
 c('2026-09-26T12:30:00Z',109,110,104,104,'2026-09-26T13:00:00Z'),
 c('2026-09-26T13:00:00Z',104,106,102,103,'2026-09-26T13:30:00Z'),
 c('2026-09-26T13:30:00Z',103,105,101,102,'2026-09-26T14:00:00Z')
];
const contexts={'2026-09-26':{bbma:{relation:'ALIGNED',bbma:{direction:'SELL',readiness:'CONFIRMABLE',effectiveUtc:'2026-09-26T12:30:00Z'}},regime:{observed_utc:'2026-09-26T13:00:00Z',session:'NEW_YORK',event_class:'NONE',event_proximity:'OUTSIDE',spread_regime:'NORMAL',volatility_regime:'NORMAL',data_health_regime:'HEALTHY',policy_version:'v1'}}};

test('runs ingestion reconstruction context replay outcomes matrix and statistics as one evidence chain',()=>{
 const out=runM08N20EvidencePipeline({days:[{mytDate:'2026-09-26',candles}],policy,contexts,minimumSample:1});
 assert.equal(out.days.length,1); assert.equal(out.days[0].temporal.m08.state,'UP'); assert.equal(out.days[0].temporal.n20.state,'DOWN');
 assert.equal(out.matrix.totalRecords,1); assert.equal(out.statistics.groups[0].eligibleForComparison,true);
});

test('missing external context remains explicit and audit warns',()=>{
 const out=runM08N20EvidencePipeline({days:[{mytDate:'2026-09-26',candles}],policy,contexts:{},minimumSample:1});
 assert.equal(out.days[0].audit.status,'WARN');
 assert.equal(out.days[0].replay.context.bbma,null); assert.equal(out.days[0].replay.context.regime,null);
});

test('pipeline never emits execution instructions',()=>{
 const out=runM08N20EvidencePipeline({days:[{mytDate:'2026-09-26',candles}],policy,contexts,minimumSample:1});
 const text=JSON.stringify(out); for(const forbidden of ['orderType','lotSize','stopLoss','takeProfit','brokerExecution'])assert.equal(text.includes(forbidden),false);
});
