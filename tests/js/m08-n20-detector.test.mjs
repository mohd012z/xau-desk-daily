import test from 'node:test';
import assert from 'node:assert/strict';
import { detectM08N20 } from '../../macro/temporal/m08-n20-detector.mjs';

const policy={version:'v1',timezone:'Asia/Kuala_Lumpur',sourceTimeframeMinutes:30,anchors:{M08:'08:00',N20:'20:00'},checkpoints:['11:30','18:00'],retestTolerance:{mode:'absolute',value:1},outcomeHorizonsMinutes:[30,60]};
const c=(openUtc,open,high,low,close)=>({openUtc,open,high,low,close});

test('M08 waits for a close-confirmed break and ignores wick-only excursion',()=>{
 const rows=[c('2026-09-26T00:00:00Z',100,105,95,101),c('2026-09-26T00:30:00Z',101,106,99,104),c('2026-09-26T01:00:00Z',104,107,103,106)];
 const out=detectM08N20({setupId:'M08',mytDate:'2026-09-26',candles:rows,policy});
 assert.equal(out.state,'UP'); assert.equal(out.reason,'CLOSE_CONFIRMED'); assert.equal(out.reference.high,105);
});

test('wick only is false break rather than UP',()=>{
 const rows=[c('2026-09-26T00:00:00Z',100,105,95,101),c('2026-09-26T00:30:00Z',101,106,99,104)];
 assert.equal(detectM08N20({setupId:'M08',mytDate:'2026-09-26',candles:rows,policy}).state,'FALSE_BREAK_UP');
});

test('N20 has an independent 20:00 MYT reference',()=>{
 const rows=[c('2026-09-26T00:00:00Z',100,105,95,101),c('2026-09-26T12:00:00Z',110,112,108,111),c('2026-09-26T12:30:00Z',111,111.5,106,107)];
 const out=detectM08N20({setupId:'N20',mytDate:'2026-09-26',candles:rows,policy});
 assert.equal(out.anchorUtc,'2026-09-26T12:00:00.000Z'); assert.equal(out.reference.low,108); assert.equal(out.state,'DOWN');
});

test('missing reference remains unresolved; nearest candle is not substituted',()=>{
 const rows=[c('2026-09-26T00:30:00Z',100,105,95,101)];
 const out=detectM08N20({setupId:'M08',mytDate:'2026-09-26',candles:rows,policy});
 assert.equal(out.state,'UNRESOLVED'); assert.equal(out.reason,'REFERENCE_MISSING');
});

test('rejects non-monotonic and conflicting duplicate evidence',()=>{
 const a=c('2026-09-26T00:30:00Z',100,105,95,101), b=c('2026-09-26T00:00:00Z',100,105,95,101);
 assert.throws(()=>detectM08N20({setupId:'M08',mytDate:'2026-09-26',candles:[a,b],policy}),/monotonic/);
 const x=c('2026-09-26T00:00:00Z',100,105,95,101), y=c('2026-09-26T00:00:00Z',100,106,95,101);
 assert.throws(()=>detectM08N20({setupId:'M08',mytDate:'2026-09-26',candles:[x,y],policy}),/conflicting duplicate/);
});
