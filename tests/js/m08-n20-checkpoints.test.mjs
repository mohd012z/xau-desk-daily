import test from 'node:test';
import assert from 'node:assert/strict';
import { buildM08Checkpoint } from '../../macro/temporal/m08-n20-checkpoints.mjs';

const m08={id:'2026-09-26:M08',setupId:'M08',mytDate:'2026-09-26',state:'UP',observedUtc:'2026-09-26T01:00:00.000Z',reference:{openUtc:'2026-09-26T00:00:00.000Z',high:105,low:95}};
const c=(openUtc,open,high,low,close,closeUtc)=>({openUtc,open,high,low,close,closeUtc});
const policy={timezone:'Asia/Kuala_Lumpur',sourceTimeframeMinutes:30,checkpoints:['11:30','18:00'],retestTolerance:{mode:'absolute',value:1}};

test('11:30 checkpoint uses only candles closed by the checkpoint',()=>{
 const rows=[
  c('2026-09-26T03:00:00Z',108,110,107,109,'2026-09-26T03:30:00Z'),
  c('2026-09-26T03:30:00Z',109,111,108,110,'2026-09-26T04:00:00Z')
 ];
 const out=buildM08Checkpoint({checkpoint:'11:30',m08,candles:rows,policy});
 assert.equal(out.checkpointUtc,'2026-09-26T03:30:00.000Z');
 assert.equal(out.candlesUsed,1);
});

test('18:00 classifies continuation when UP structure extends without retesting the reference zone',()=>{
 const rows=[c('2026-09-26T09:00:00Z',110,113,109,112,'2026-09-26T09:30:00Z')];
 assert.equal(buildM08Checkpoint({checkpoint:'18:00',m08,candles:rows,policy}).state,'TREND_CONTINUING');
});

test('18:00 exposes RETESTING_M08 when price revisits M08 zone and holds',()=>{
 const rows=[c('2026-09-26T09:00:00Z',108,109,104.5,106,'2026-09-26T09:30:00Z')];
 assert.equal(buildM08Checkpoint({checkpoint:'18:00',m08,candles:rows,policy}).state,'RETESTING_M08');
});

test('future candle cannot leak into checkpoint',()=>{
 const rows=[c('2026-09-26T09:30:00Z',106,107,90,91,'2026-09-26T10:00:00Z')];
 const out=buildM08Checkpoint({checkpoint:'18:00',m08,candles:rows,policy});
 assert.equal(out.candlesUsed,0);
 assert.equal(out.state,'UNRESOLVED');
});

test('missing closeUtc remains explicit instead of assuming candle finality',()=>{
 const rows=[c('2026-09-26T09:00:00Z',110,113,109,112,undefined)];
 const out=buildM08Checkpoint({checkpoint:'18:00',m08,candles:rows,policy});
 assert.equal(out.state,'UNRESOLVED');
 assert.equal(out.reason,'NO_FINALIZED_CANDLES');
});
