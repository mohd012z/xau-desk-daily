const t=v=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:null};
export function auditM08N20EvidenceChain(x){
 const errors=[],warnings=[];
 const m=t(x?.m08?.observedUtc),a=t(x?.checkpoint1130?.checkpointUtc),b=t(x?.checkpoint1800?.checkpointUtc),n=t(x?.n20?.observedUtc),obs=t(x?.replay?.observation?.asOfUtc);
 if([m,a,b,n].every(Number.isFinite)&&!(m<=a&&a<=b&&b<=n))errors.push('CHECKPOINT_ORDER_INVALID');
 if(n!==null&&t(x?.bbma?.effectiveUtc)!==null&&t(x.bbma.effectiveUtc)>n)errors.push('BBMA_FUTURE_LEAKAGE');
 if(n!==null&&t(x?.regime?.observed_utc)!==null&&t(x.regime.observed_utc)>n)errors.push('REGIME_FUTURE_LEAKAGE');
 if(!x?.bbma)warnings.push('BBMA_CONTEXT_MISSING');
 if(!x?.regime)warnings.push('REGIME_CONTEXT_MISSING');
 if(obs===null)errors.push('OBSERVATION_TIME_INVALID');
 for(const o of x?.replay?.outcomes??[]){if(o?.status==='AVAILABLE'){const close=t(o.closeUtc);if(close===null||obs===null||close<=obs)errors.push('OUTCOME_TIME_INVALID');}}
 return Object.freeze({status:errors.length?'FAIL':warnings.length?'WARN':'PASS',errors:Object.freeze([...new Set(errors)]),warnings:Object.freeze([...new Set(warnings)])});
}
