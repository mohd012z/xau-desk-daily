const clone=v=>Array.isArray(v)?v.map(clone):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)])):v;
const freeze=v=>{if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freeze(x);return Object.freeze(v);};
const utc=v=>typeof v==='string'&&v.endsWith('Z')&&!Number.isNaN(Date.parse(v));
const forbidden=/^(outcome|future|forward|mfe|mae|future_price)/i;
function assertNoLookAhead(value,path='input'){
 if(!value||typeof value!=='object')return;
 for(const [key,nested] of Object.entries(value)){
  if(forbidden.test(key))throw new TypeError(`future/outcome field forbidden in replay decision input: ${path}.${key}`);
  assertNoLookAhead(nested,`${path}.${key}`);
 }
}
export function normalizeReplayRecord(input){
 if(!input||typeof input!=='object')throw new TypeError('replay record required');
 assertNoLookAhead(input);
 if(typeof input.record_id!=='string'||!input.record_id.trim())throw new TypeError('record_id required');
 if(!utc(input.observedUtc))throw new TypeError('valid observedUtc required');
 if(typeof input.symbol!=='string'||!input.symbol.trim())throw new TypeError('symbol required');
 const required=['evidence','events','eventPolicy','healthInput','signal'];for(const k of required)if(input[k]===undefined)throw new TypeError(`${k} required`);
 return freeze({record_id:input.record_id.trim(),source_ref:input.source_ref??null,symbol:input.symbol.trim().toUpperCase(),observedUtc:input.observedUtc,evidence:clone(input.evidence),events:clone(input.events),eventPolicy:clone(input.eventPolicy),healthInput:clone(input.healthInput),signal:clone(input.signal)});
}
