const frozen=(v)=>Object.freeze(v);
function tolerance(level,p){if(!p||!['absolute','percent'].includes(p.mode)||!Number.isFinite(p.value)||p.value<0)throw new TypeError('explicit retest policy is required');return p.mode==='absolute'?p.value:Math.abs(level)*p.value/100}

export function classifyM08Retest(m08,candles,policy,crossContext=null){
 if(!m08?.reference||!['UP','DOWN'].includes(m08.state)) return frozen({state:'UNKNOWN',touched:false,reason:'M08_DIRECTION_UNRESOLVED'});
 const level=m08.state==='UP'?m08.reference.high:m08.reference.low;
 const tol=tolerance(level,policy);
 const lower=level-tol, upper=level+tol;
 let touched=false, failed=false, hold=false;
 for(const c of candles??[]){
  if(!['open','high','low','close'].every(k=>Number.isFinite(c[k]))) return frozen({state:'UNKNOWN',touched,reason:'INVALID_CANDLE'});
  const overlaps=c.low<=upper&&c.high>=lower;
  if(overlaps)touched=true;
  if(m08.state==='UP'){
   if(c.close<lower){failed=true;break}
   if(overlaps&&c.close>=lower)hold=true;
  }else{
   if(c.close>upper){failed=true;break}
   if(overlaps&&c.close<=upper)hold=true;
  }
 }
 if(failed){
  const opposite=(m08.state==='UP'&&crossContext?.bbma?.direction==='SELL')||(m08.state==='DOWN'&&crossContext?.bbma?.direction==='BUY');
  const independentlyReady=['CONFIRMABLE','SETUP_READY'].includes(crossContext?.bbma?.readiness);
  if(crossContext?.relation==='COUNTER_STRUCTURE'&&opposite&&independentlyReady)return frozen({state:'M08_REVERSAL_TRANSITION',touched:true,level,tolerance:tol});
  return frozen({state:'M08_RETEST_FAIL',touched:true,level,tolerance:tol});
 }
 if(hold)return frozen({state:'M08_RETEST_HOLD',touched:true,level,tolerance:tol});
 if(touched)return frozen({state:'M08_RETEST_TOUCH',touched:true,level,tolerance:tol});
 return frozen({state:'NONE',touched:false,level,tolerance:tol});
}
