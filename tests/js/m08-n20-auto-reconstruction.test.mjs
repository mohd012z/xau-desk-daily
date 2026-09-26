import test from 'node:test';
import assert from 'node:assert/strict';
import { reconstructTemporalDay } from '../../macro/replay/m08-n20-auto-reconstruction.mjs';

const c=(openUtc,open,high,low,close,closeUtc)=>({openUtc,open,high,low,close,closeUtc});
const policy={version:'temporal-v1',timezone:'Asia/Kuala_Lumpur',sourceTimeframeMinutes:30,anchors:{M08:'08:00',N20:'20:00'},checkpoints:['11:30','18:00'],retestTolerance:{mode:'absolute',value:1},outcomeHorizonsMinutes:[30,60,120,240]};
const rows=[
 c('2026-09-26T00:00:00Z',100,105,95,103,'2026-09-26T00:30:00Z'),
 c('2026-09-26T00:30:00Z',103,108,102,107,'2026-09-26T01:00:00Z'),
 c('2026-09-26T03:00:00Z',107,110,106,109,'2026-09-26T03:30:00Z'),
 c('2026-09-26T09:30:00Z',109,111,108,110,'2026-09-26T10:00:00Z'),
 c('2026-09-26T12:00:00Z',110,113,108,109,'2026-09-26T12:30:00Z'),
 c('2026-09-26T12:30:00Z',109,110,104,104,'2026-09-26T13:00:00Z')
];

test('reconstructs Morning Setup and checkpoints from raw finalized candles',()=>{
 const out=reconstructTemporalDay({mytDate:'2026-09-26',candles:rows,policy});
 assert.equal(out.m08.state,'UP');
 assert.equal(out.checkpoints.at1130.checkpoint,'11:30');
 assert.equal(out.checkpoints.at1800.checkpoint,'18:00');
});

test('reconstructs Night Setup independently using the 20:00 MYT reference candle',()=>{
 const out=reconstructTemporalDay({mytDate:'2026-09-26',candles:rows,policy});
 assert.equal(out.n20.reference.openUtc,'2026-09-26T12:00:00.000Z');
 assert.equal(out.n20.state,'DOWN');
});

test('relation is derived only after both setup states are reconstructed',()=>{
 const out=reconstructTemporalDay({mytDate:'2026-09-26',candles:rows,policy});
 assert.equal(out.relation.relation,'OPPOSITE_DIRECTION');
});

test('missing Night reference remains unresolved instead of borrowing another candle',()=>{
 const out=reconstructTemporalDay({mytDate:'2026-09-26',candles:rows.filter(x=>x.openUtc!=='2026-09-26T12:00:00Z'),policy});
 assert.equal(out.n20.state,'UNRESOLVED');
 assert.equal(out.n20.reason,'REFERENCE_MISSING');
});

test('does not mutate source candles',()=>{
 const before=structuredClone(rows); reconstructTemporalDay({mytDate:'2026-09-26',candles:rows,policy}); assert.deepEqual(rows,before);
});
