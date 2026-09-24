function clone(v){if(Array.isArray(v))return v.map(clone);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));return v;}
function freeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freeze(x);return Object.freeze(v);}
function utc(v){return typeof v==='string'&&v.endsWith('Z')&&!Number.isNaN(new Date(v).getTime());}
export function composeBbmaShadowCandidate({symbol,evidence,confluence,gate,generatedUtc,existingSignal=null}){
 if(typeof symbol!=='string'||!symbol.trim())throw new TypeError('symbol is required');
 if(!evidence||!confluence||!gate||!utc(generatedUtc))throw new TypeError('valid evidence, confluence, gate and generatedUtc are required');
 const state=existingSignal?.state??'DETECTED';
 const history=clone(existingSignal?.history??[]);
 const candidate={
  kind:'BBMA_SHADOW_CANDIDATE',symbol:symbol.trim().toUpperCase(),direction:confluence.direction??null,state,
  readiness:confluence.readiness,rule_version:evidence.rule_version??confluence.rule_version,
  evidence:clone(evidence),supporting_timeframes:clone(confluence.supporting_timeframes??[]),conflict_timeframes:clone(confluence.conflict_timeframes??[]),
  gate:clone(gate),reason_codes:[...new Set([...(confluence.reason_codes??[]),...(gate.reason_codes??[])])],generated_utc:generatedUtc,history
 };
 return freeze(candidate);
}
