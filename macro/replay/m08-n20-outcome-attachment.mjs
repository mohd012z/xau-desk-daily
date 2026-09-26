const freeze=v=>{if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freeze(x);return Object.freeze(v)};
const ms=v=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:null};

export function attachHistoricalOutcomes(replay,candles,{horizonsMinutes=[30,60,120,240]}={}){
 if(!replay?.observation?.asOfUtc)throw new TypeError('replay observation asOfUtc is required');
 if(!Array.isArray(horizonsMinutes)||!horizonsMinutes.length||horizonsMinutes.some((h,i)=>!Number.isFinite(h)||h<=0||(i&&h<=horizonsMinutes[i-1])))throw new TypeError('horizons must be positive and strictly increasing');
 const start=ms(replay.observation.asOfUtc); if(start===null)throw new TypeError('invalid observation timestamp');
 const finalized=(candles??[]).filter(c=>ms(c.closeUtc)!==null&&ms(c.closeUtc)>start).sort((a,b)=>ms(a.closeUtc)-ms(b.closeUtc));
 const first=finalized[0]; const reference=first&&Number.isFinite(first.open)?first.open:null;
 const outcomes=horizonsMinutes.map(h=>{
  const cutoff=start+h*60000;
  const eligible=finalized.filter(c=>ms(c.closeUtc)<=cutoff&&['high','low','close'].every(k=>Number.isFinite(c[k])));
  const exact=eligible.length&&ms(eligible.at(-1).closeUtc)===cutoff;
  if(reference===null||!eligible.length||!exact)return {horizonMinutes:h,status:'UNAVAILABLE',forwardMove:null,mfe:null,mae:null,closeUtc:null};
  const last=eligible.at(-1),maxHigh=Math.max(...eligible.map(c=>c.high)),minLow=Math.min(...eligible.map(c=>c.low));
  return {horizonMinutes:h,status:'AVAILABLE',forwardMove:last.close-reference,mfe:maxHigh-reference,mae:minLow-reference,closeUtc:new Date(ms(last.closeUtc)).toISOString()};
 });
 return freeze({...structuredClone(replay),outcomes});
}
