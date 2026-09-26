const ms=v=>{if(typeof v!=='string'||!v.trim())return null;const n=Date.parse(v);return Number.isFinite(n)?n:null};
const same=(a,b)=>['openUtc','open','high','low','close','closeUtc'].every(k=>a[k]===b[k]);
function normalize(rows,tf){
 const map=new Map();
 for(const raw of rows??[]){
  const openMs=ms(raw?.openUtc),closeMs=ms(raw?.closeUtc);
  if(openMs===null||closeMs===null||closeMs<=openMs)throw new TypeError('finalized candle timestamps are required');
  const k=new Date(openMs).toISOString();
  if(map.has(k)){
   if(!same(map.get(k),raw))throw new TypeError('conflicting duplicate candle');
   continue;
  }
  if(!['open','high','low','close'].every(key=>Number.isFinite(raw[key])))throw new TypeError('valid OHLC values are required');
  if(raw.high<Math.max(raw.open,raw.close,raw.low)||raw.low>Math.min(raw.open,raw.close,raw.high))throw new TypeError('OHLC range is invalid');
  map.set(k,structuredClone(raw));
 }
 const candles=[...map.values()].sort((a,b)=>ms(a.openUtc)-ms(b.openUtc)),gaps=[];
 for(let i=1;i<candles.length;i++){const delta=(ms(candles[i].openUtc)-ms(candles[i-1].openUtc))/60000;if(delta>tf)gaps.push({afterOpenUtc:candles[i-1].openUtc,beforeOpenUtc:candles[i].openUtc,missingIntervals:Math.max(0,Math.round(delta/tf)-1)});}
 return {candles,gaps};
}
export function runHistoricalReplayBatch(days,{sourceTimeframeMinutes=30}={}){
 if(!Number.isFinite(sourceTimeframeMinutes)||sourceTimeframeMinutes<=0)throw new TypeError('sourceTimeframeMinutes must be positive');
 if(!Array.isArray(days))throw new TypeError('days must be an array');
 const seen=new Set(),out=[];
 for(const d of [...days].sort((a,b)=>String(a?.mytDate).localeCompare(String(b?.mytDate)))){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d?.mytDate??''))throw new TypeError('valid MYT date is required');
  if(seen.has(d.mytDate))throw new TypeError('duplicate MYT day');seen.add(d.mytDate);
  const n=normalize(d.candles,sourceTimeframeMinutes);
  out.push(Object.freeze({mytDate:d.mytDate,inputCandles:n.candles.length,gaps:Object.freeze(n.gaps),fabricatedCandles:0,candles:Object.freeze(n.candles)}));
 }
 return Object.freeze({schemaVersion:'m08-n20-batch-replay-v1',sourceTimeframeMinutes,totalDays:out.length,days:Object.freeze(out)});
}
