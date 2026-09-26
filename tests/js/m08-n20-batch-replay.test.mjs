import test from 'node:test';
import assert from 'node:assert/strict';
import { runHistoricalReplayBatch } from '../../macro/replay/m08-n20-batch-replay.mjs';

const day=(date,rows)=>({mytDate:date,candles:rows});
const c=(openUtc,open,high,low,close,closeUtc)=>({openUtc,open,high,low,close,closeUtc});
const rows=[
 c('2026-09-26T00:00:00Z',100,105,95,103,'2026-09-26T00:30:00Z'),
 c('2026-09-26T03:00:00Z',103,108,102,107,'2026-09-26T03:30:00Z'),
 c('2026-09-26T09:30:00Z',107,109,105,108,'2026-09-26T10:00:00Z'),
 c('2026-09-26T12:00:00Z',108,112,106,110,'2026-09-26T12:30:00Z'),
 c('2026-09-26T13:00:00Z',110,113,109,112,'2026-09-26T13:30:00Z')
];

test('processes multiple MYT days deterministically',()=>{
 const input=[day('2026-09-27',rows),day('2026-09-26',rows)];
 const out=runHistoricalReplayBatch(input,{sourceTimeframeMinutes:30});
 assert.deepEqual(out.days.map(x=>x.mytDate),['2026-09-26','2026-09-27']);
 assert.equal(out.totalDays,2);
});

test('deduplicates identical candles by openUtc and rejects conflicting duplicates',()=>{
 const duplicate=[...rows,{...rows[0]}];
 assert.equal(runHistoricalReplayBatch([day('2026-09-26',duplicate)],{sourceTimeframeMinutes:30}).days[0].inputCandles,5);
 const conflict=[...rows,{...rows[0],close:999}];
 assert.throws(()=>runHistoricalReplayBatch([day('2026-09-26',conflict)],{sourceTimeframeMinutes:30}),/conflicting duplicate/i);
});

test('rejects malformed OHLC and non-finalized candles',()=>{
 assert.throws(()=>runHistoricalReplayBatch([day('2026-09-26',[{...rows[0],high:90}])],{sourceTimeframeMinutes:30}),/OHLC/i);
 assert.throws(()=>runHistoricalReplayBatch([day('2026-09-26',[{...rows[0],closeUtc:null}])],{sourceTimeframeMinutes:30}),/finalized/i);
});

test('reports gaps rather than silently fabricating missing candles',()=>{
 const out=runHistoricalReplayBatch([day('2026-09-26',rows)],{sourceTimeframeMinutes:30});
 assert.ok(out.days[0].gaps.length>0);
 assert.equal(out.days[0].fabricatedCandles,0);
});
