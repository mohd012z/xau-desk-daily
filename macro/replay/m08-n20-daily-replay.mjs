function deepFreeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))deepFreeze(x);return Object.freeze(v)}
const clone=(v)=>v==null?v:structuredClone(v);
const time=(v)=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:null};

export function composeM08N20DailyReplay(input){
 if(!input?.replayId)throw new TypeError('replayId is required');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.mytDate??''))throw new TypeError('mytDate is required');
 if(!input.m08)throw new TypeError('Morning Setup evidence is required');
 const observationUtc=input.n20?.observedUtc??input.checkpoints?.at1800?.checkpointUtc??input.m08.observedUtc;
 const cutoff=time(observationUtc);
 if(input.crossContext?.bbma?.effectiveUtc&&time(input.crossContext.bbma.effectiveUtc)>cutoff)throw new TypeError('future BBMA/HTF context is not allowed');
 if(input.regime?.observed_utc&&time(input.regime.observed_utc)>cutoff)throw new TypeError('future regime context is not allowed');

 const complete=Boolean(input.m08&&input.n20&&input.checkpoints?.at1130&&input.checkpoints?.at1800&&input.relation);
 const record={
  schemaVersion:'m08-n20-daily-replay-v1',
  replayId:input.replayId,
  mytDate:input.mytDate,
  completeness:complete?'COMPLETE':'PARTIAL',
  observation:{asOfUtc:observationUtc,outcomeDerived:false},
  temporal:{
   m08:clone(input.m08),
   checkpoints:clone(input.checkpoints??{}),
   n20:clone(input.n20??null),
   relation:clone(input.relation??{relation:'UNKNOWN'}),
   retest:clone(input.retest??null),
  },
  context:{bbma:clone(input.crossContext??null),regime:clone(input.regime??null)},
  outcomes:clone(input.outcomes??[]),
  sourceRefs:clone(input.sourceRefs??[]),
 };
 return deepFreeze(record);
}
