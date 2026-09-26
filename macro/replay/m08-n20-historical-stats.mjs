const deepFreeze=v=>{if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))deepFreeze(x);return Object.freeze(v)};
const quantile=(xs,q)=>{const a=[...xs].sort((x,y)=>x-y);if(!a.length)return null;const p=(a.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(p-lo)};
const distribution=xs=>({count:xs.length,min:Math.min(...xs),q25:quantile(xs,.25),median:quantile(xs,.5),q75:quantile(xs,.75),max:Math.max(...xs)});

export function summarizeHistoricalEvidence(matrix,{minimumSample=10}={}){
 if(!Number.isInteger(minimumSample)||minimumSample<1)throw new TypeError('minimumSample must be a positive integer');
 const groups=(matrix?.groups??[]).map(g=>{
  const eligible=(g.sampleSize??0)>=minimumSample;
  const horizons={};
  for(const [h,counts] of Object.entries(g.outcomes??{})){
   const total=Object.values(counts).reduce((a,b)=>a+b,0);const proportions={};
   for(const [label,count] of Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)))proportions[label]=total?count/total:0;
   horizons[h]={total,counts:{...counts},proportions};
  }
  const obs=(g.observations??[]).filter(o=>o&&typeof o==='object');
  const mfe=obs.map(o=>o.mfe).filter(Number.isFinite),mae=obs.map(o=>o.mae).filter(Number.isFinite),forward=obs.map(o=>o.forwardMove).filter(Number.isFinite);
  const movement=mfe.length||mae.length||forward.length?{status:'AVAILABLE',mfe:mfe.length?distribution(mfe):null,mae:mae.length?distribution(mae):null,forwardMove:forward.length?distribution(forward):null}:{status:'UNAVAILABLE',mfe:null,mae:null,forwardMove:null};
  return {signature:structuredClone(g.signature??{}),sampleSize:g.sampleSize??0,evidenceStatus:eligible?'DESCRIPTIVE':'INSUFFICIENT_SAMPLE',eligibleForComparison:eligible,horizons,movement};
 });
 return deepFreeze({schemaVersion:'m08-n20-historical-stats-v1',minimumSample,groups});
}
