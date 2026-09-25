import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEvidenceMetrics } from '../../macro/replay/evidence-metrics.mjs';

const row=(id,direction,gate,readiness,extra={})=>({replay_id:id,observation:{direction,readiness,gate:{state:gate},state:'SETUP',lifecycle_action:'HOLD',reason_codes:[],...extra}});

test('reports cross-strata instead of only independent marginals',()=>{
 const ledger={records:[row('a','BUY','ALLOW','CONFIRMABLE'),row('b','BUY','BLOCK','CONFIRMABLE'),row('c','SELL','ALLOW','WATCHABLE')],exact_duplicate_count:0};
 const m=computeEvidenceMetrics({ledger,outcomes:[]});
 assert.equal(m.strata['BUY|ALLOW|CONFIRMABLE'],1);
 assert.equal(m.strata['BUY|BLOCK|CONFIRMABLE'],1);
 assert.equal(m.strata['SELL|ALLOW|WATCHABLE'],1);
});

test('coverage reports eligible covered and missing per configured horizon',()=>{
 const ledger={records:[row('a','BUY','ALLOW','CONFIRMABLE'),row('b','SELL','ALLOW','CONFIRMABLE')],exact_duplicate_count:0};
 const outcomes=[{replay_id:'a',horizon:'15m',entry_price:2600,forward_price:2602}];
 const m=computeEvidenceMetrics({ledger,outcomes,horizons:['15m','1h']});
 assert.deepEqual(m.outcome_coverage['15m'],{eligible:2,covered:1,missing:1});
 assert.deepEqual(m.outcome_coverage['1h'],{eligible:2,covered:0,missing:2});
 assert.equal(m.directional_follow_through.BUY.valid,1);
 assert.equal(m.directional_follow_through.SELL.valid,0);
});

test('outcome for unknown replay id does not contaminate denominator or follow-through',()=>{
 const ledger={records:[row('a','BUY','ALLOW','CONFIRMABLE')],exact_duplicate_count:0};
 const m=computeEvidenceMetrics({ledger,outcomes:[{replay_id:'ghost',horizon:'15m',entry_price:1,forward_price:2}],horizons:['15m']});
 assert.deepEqual(m.outcome_coverage['15m'],{eligible:1,covered:0,missing:1});
 assert.equal(m.directional_follow_through.BUY.valid,0);
});
