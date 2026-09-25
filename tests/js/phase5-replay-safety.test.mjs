import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReplayRecord } from '../../macro/replay/replay-record.mjs';
import { createObservationLedger } from '../../macro/replay/observation-ledger.mjs';
import { createOutcomeLedger } from '../../macro/replay/outcome-ledger.mjs';

const base=()=>({record_id:'r1',symbol:'XAUUSD',observedUtc:'2026-09-24T14:00:00.000Z',evidence:{state:'OK'},events:[],eventPolicy:{},healthInput:{},signal:{state:'SETUP'}});

test('rejects nested future/outcome leakage anywhere in decision input',()=>{
 const x=base(); x.evidence={state:'OK',future_price:9999};
 assert.throws(()=>normalizeReplayRecord(x),/future\/outcome field forbidden/);
});

test('same replay id with different content is a conflict, not an exact duplicate',()=>{
 const ledger=createObservationLedger();
 assert.equal(ledger.append({replay_id:'r1',observed_utc:'2026-09-24T14:00:00.000Z',observation:{direction:'BUY'}}),true);
 assert.throws(()=>ledger.append({replay_id:'r1',observed_utc:'2026-09-24T14:00:00.000Z',observation:{direction:'SELL'}}),/identity conflict/);
 assert.equal(ledger.snapshot().exact_duplicate_count,0);
});

test('exact replay duplicate is counted and not appended twice',()=>{
 const ledger=createObservationLedger(); const row={replay_id:'r1',observed_utc:'2026-09-24T14:00:00.000Z',observation:{direction:'BUY'}};
 assert.equal(ledger.append(row),true); assert.equal(ledger.append(structuredClone(row)),false);
 assert.equal(ledger.snapshot().records.length,1); assert.equal(ledger.snapshot().exact_duplicate_count,1);
});

test('outcome identity cannot be silently overwritten',()=>{
 const outcomes=createOutcomeLedger([{replay_id:'r1',observed_utc:'2026-09-24T14:00:00.000Z'}]);
 const row={replay_id:'r1',horizon:'1H',outcome_utc:'2026-09-24T15:00:00.000Z',entry_price:2600,forward_price:2610};
 outcomes.attach(row);
 assert.throws(()=>outcomes.attach({...row,forward_price:2590}),/outcome identity conflict/);
});
