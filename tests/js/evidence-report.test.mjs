import test from 'node:test';
import assert from 'node:assert/strict';
import { composeEvidenceReport } from '../../macro/replay/evidence-report.mjs';

test('report exposes per-horizon incomplete coverage warning and replay traceability',()=>{
 const ledger={records:[{replay_id:'a',observed_utc:'2026-09-24T10:00:00.000Z',source_ref:'s1'},{replay_id:'b',observed_utc:'2026-09-24T11:00:00.000Z',source_ref:'s2'}]};
 const metrics={outcome_coverage:{'15m':{eligible:2,covered:1,missing:1},'1h':{eligible:2,covered:0,missing:2}}};
 const report=composeEvidenceReport({ledger,metrics,outcomes:[{replay_id:'a',horizon:'15m'}]});
 assert.ok(report.warnings.includes('INCOMPLETE_OUTCOME_COVERAGE'));
 assert.deepEqual(report.coverage_by_horizon,metrics.outcome_coverage);
 assert.deepEqual(report.replay_ids,['a','b']);
 assert.equal(Object.isFrozen(report),true);
});
