import test from 'node:test';
import assert from 'node:assert/strict';
import { attachHistoricalOutcomes } from '../../macro/replay/m08-n20-outcome-attachment.mjs';

const replay={replayId:'r1',mytDate:'2026-09-26',observation:{asOfUtc:'2026-09-26T13:00:00.000Z',outcomeDerived:false},temporal:{n20:{state:'UP'}}};
const c=(openUtc,open,high,low,close,closeUtc)=>({openUtc,open,high,low,close,closeUtc});
const rows=[
 c('2026-09-26T13:00:00Z',100,103,99,102,'2026-09-26T13:30:00Z'),
 c('2026-09-26T13:30:00Z',102,106,101,105,'2026-09-26T14:00:00Z'),
 c('2026-09-26T14:00:00Z',105,108,103,104,'2026-09-26T14:30:00Z'),
 c('2026-09-26T14:30:00Z',104,109,98,108,'2026-09-26T15:00:00Z')
];

test('attaches 30 60 120 minute forward outcomes from finalized candles only',()=>{
 const out=attachHistoricalOutcomes(replay,rows,{horizonsMinutes:[30,60,120]});
 assert.deepEqual(out.outcomes.map(x=>x.horizonMinutes),[30,60,120]);
 assert.equal(out.outcomes[0].forwardMove,2);
 assert.equal(out.outcomes[1].forwardMove,5);
 assert.equal(out.outcomes[2].forwardMove,8);
});

test('computes MFE and MAE relative to observation reference price',()=>{
 const out=attachHistoricalOutcomes(replay,rows,{horizonsMinutes:[120]});
 assert.equal(out.outcomes[0].mfe,9);
 assert.equal(out.outcomes[0].mae,-2);
});

test('missing horizon remains unavailable rather than extrapolated',()=>{
 const out=attachHistoricalOutcomes(replay,rows.slice(0,1),{horizonsMinutes:[30,120]});
 assert.equal(out.outcomes[1].status,'UNAVAILABLE');
 assert.equal(out.outcomes[1].forwardMove,null);
});

test('candle closing after a horizon cannot leak into that horizon',()=>{
 const out=attachHistoricalOutcomes(replay,rows,{horizonsMinutes:[60]});
 assert.equal(out.outcomes[0].mfe,6);
 assert.equal(out.outcomes[0].mae,-1);
});

test('does not mutate original replay or candles',()=>{
 const r=structuredClone(replay), cs=structuredClone(rows);
 attachHistoricalOutcomes(replay,rows,{horizonsMinutes:[30]});
 assert.deepEqual(replay,r); assert.deepEqual(rows,cs);
});

test('rejects non-positive or unordered horizons',()=>{
 assert.throws(()=>attachHistoricalOutcomes(replay,rows,{horizonsMinutes:[60,30]}),/horizon/i);
 assert.throws(()=>attachHistoricalOutcomes(replay,rows,{horizonsMinutes:[0]}),/horizon/i);
});
