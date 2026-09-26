import test from 'node:test';
import assert from 'node:assert/strict';
import { auditM08N20EvidenceChain } from '../../macro/replay/m08-n20-chain-audit.mjs';

const base={
 m08:{id:'d:M08',observedUtc:'2026-09-26T01:00:00Z'},
 checkpoint1130:{checkpointUtc:'2026-09-26T03:30:00Z'},
 checkpoint1800:{checkpointUtc:'2026-09-26T10:00:00Z'},
 n20:{id:'d:N20',observedUtc:'2026-09-26T13:00:00Z'},
 bbma:{effectiveUtc:'2026-09-26T12:30:00Z'},
 regime:{observed_utc:'2026-09-26T13:00:00Z'},
 replay:{observation:{asOfUtc:'2026-09-26T13:00:00Z'},outcomes:[{horizonMinutes:30,closeUtc:'2026-09-26T13:30:00Z',status:'AVAILABLE'}]}
};

test('valid chain passes all temporal and provenance gates',()=>{
 const out=auditM08N20EvidenceChain(base);
 assert.equal(out.status,'PASS'); assert.deepEqual(out.errors,[]);
});

test('detects checkpoint order leakage',()=>{
 const out=auditM08N20EvidenceChain({...base,checkpoint1130:{checkpointUtc:'2026-09-26T10:30:00Z'}});
 assert.equal(out.status,'FAIL'); assert.ok(out.errors.includes('CHECKPOINT_ORDER_INVALID'));
});

test('detects future BBMA context relative to Night Setup',()=>{
 const out=auditM08N20EvidenceChain({...base,bbma:{effectiveUtc:'2026-09-26T14:00:00Z'}});
 assert.ok(out.errors.includes('BBMA_FUTURE_LEAKAGE'));
});

test('detects outcome timestamp at or before observation',()=>{
 const bad={...base,replay:{...base.replay,outcomes:[{horizonMinutes:30,closeUtc:'2026-09-26T13:00:00Z',status:'AVAILABLE'}]}};
 assert.ok(auditM08N20EvidenceChain(bad).errors.includes('OUTCOME_TIME_INVALID'));
});

test('unknown or missing context is warned not silently normalized',()=>{
 const out=auditM08N20EvidenceChain({...base,regime:null});
 assert.equal(out.status,'WARN'); assert.ok(out.warnings.includes('REGIME_CONTEXT_MISSING'));
});
