import { resolveMytAnchorUtc } from './m08-n20-policy.mjs';

const freeze=(v)=>Object.freeze(v);
const ms=(v)=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:null};

export function buildM08Checkpoint({checkpoint,m08,candles,policy}){
 if(!m08?.mytDate||!m08?.reference) throw new TypeError('M08 evidence is required');
 if(!policy?.checkpoints?.includes(checkpoint)) throw new TypeError('checkpoint is not allowed by policy');
 const checkpointUtc=resolveMytAnchorUtc(m08.mytDate,checkpoint);
 const cutoff=ms(checkpointUtc);
 const finalized=(candles??[]).filter(c=>ms(c.closeUtc)!==null&&ms(c.closeUtc)<=cutoff);
 if(!finalized.length)return freeze({checkpoint,checkpointUtc,state:'UNRESOLVED',reason:'NO_FINALIZED_CANDLES',candlesUsed:0,m08Id:m08.id});

 const tol=policy.retestTolerance?.mode==='percent'
  ? Math.abs(m08.state==='UP'?m08.reference.high:m08.reference.low)*(policy.retestTolerance.value??0)/100
  : (policy.retestTolerance?.value??0);
 const level=m08.state==='UP'?m08.reference.high:m08.reference.low;
 const lower=level-tol,upper=level+tol;
 let retest=false,fail=false,extension=false;
 for(const c of finalized){
  if(!['open','high','low','close'].every(k=>Number.isFinite(c[k])))continue;
  if(c.low<=upper&&c.high>=lower)retest=true;
  if(m08.state==='UP'){
   if(c.close<lower)fail=true;
   if(c.close>m08.reference.high&&!retest)extension=true;
  }else if(m08.state==='DOWN'){
   if(c.close>upper)fail=true;
   if(c.close<m08.reference.low&&!retest)extension=true;
  }
 }
 let state='UNRESOLVED';
 if(fail)state='REVERSING';
 else if(retest)state='RETESTING_M08';
 else if(extension)state='TREND_CONTINUING';
 else if(['UP','DOWN'].includes(m08.state))state='PULLBACK';
 return freeze({checkpoint,checkpointUtc,state,reason:'POINT_IN_TIME_SNAPSHOT',candlesUsed:finalized.length,m08Id:m08.id});
}
