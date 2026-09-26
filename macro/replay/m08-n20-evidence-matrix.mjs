function deepFreeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))deepFreeze(x);return Object.freeze(v)}
const val=(v)=>v??'UNKNOWN';
function signature(r){return {temporal:{morning:val(r.temporal?.m08?.state),night:val(r.temporal?.n20?.state),relation:val(r.temporal?.relation?.relation),retest:val(r.temporal?.retest?.state),at1130:val(r.temporal?.checkpoints?.at1130?.state),at1800:val(r.temporal?.checkpoints?.at1800?.state)},bbma:{relation:val(r.context?.bbma?.relation),direction:val(r.context?.bbma?.bbma?.direction),readiness:val(r.context?.bbma?.bbma?.readiness)},regime:{session:val(r.context?.regime?.session),eventClass:val(r.context?.regime?.event_class),eventProximity:val(r.context?.regime?.event_proximity),spread:val(r.context?.regime?.spread_regime),volatility:val(r.context?.regime?.volatility_regime),dataHealth:val(r.context?.regime?.data_health_regime),policyVersion:val(r.context?.regime?.policy_version)}}}
const key=(s)=>JSON.stringify(s);

export function buildM08N20EvidenceMatrix(records,{includePartial=false}={}){
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const groups=new Map();let complete=0,partial=0;
 for(const r of records){
  if(r?.completeness==='COMPLETE')complete++;else partial++;
  if(!includePartial&&r?.completeness!=='COMPLETE')continue;
  const sig=signature(r??{}),k=key(sig);
  if(!groups.has(k))groups.set(k,{signature:sig,sampleSize:0,replayIds:[],outcomes:{}});
  const g=groups.get(k);g.sampleSize++;g.replayIds.push(val(r?.replayId));
  for(const o of r?.outcomes??[]){const h=String(val(o?.horizonMinutes)),label=val(o?.label);g.outcomes[h]??={};g.outcomes[h][label]=(g.outcomes[h][label]??0)+1}
 }
 const ordered=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,g])=>{g.replayIds.sort();for(const h of Object.keys(g.outcomes)){g.outcomes[h]=Object.fromEntries(Object.entries(g.outcomes[h]).sort(([a],[b])=>a.localeCompare(b)))}return g});
 return deepFreeze({schemaVersion:'m08-n20-evidence-matrix-v1',totalRecords:records.length,completeRecords:complete,partialRecords:partial,groups:ordered});
}
