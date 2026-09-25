function freezeDeep(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freezeDeep(x);return Object.freeze(v)}
const ms=(v)=>{const n=new Date(v).getTime();if(!Number.isFinite(n))throw new TypeError('invalid evidence timestamp');return n};

export function composeBbmaCrossContext(temporal,bbma){
 if(!temporal||!temporal.observedUtc) throw new TypeError('temporal observation is required');
 const observed=ms(temporal.observedUtc);
 if(!bbma) return freezeDeep({relation:'UNKNOWN',temporal:structuredClone(temporal),bbma:null});
 if(bbma.effectiveUtc&&ms(bbma.effectiveUtc)>observed) throw new TypeError('future BBMA/HTF evidence is not allowed');
 const direction=bbma.direction??'UNKNOWN';
 const readiness=bbma.readiness??'UNKNOWN';
 let relation='UNKNOWN';
 if(readiness==='BLOCKED') relation='BLOCKED';
 else if(['MIXED','CONFLICT'].includes(direction)) relation='MIXED';
 else if((temporal.state==='UP'&&direction==='BUY')||(temporal.state==='DOWN'&&direction==='SELL')) relation='ALIGNED';
 else if((temporal.state==='UP'&&direction==='SELL')||(temporal.state==='DOWN'&&direction==='BUY')) relation='COUNTER_STRUCTURE';
 return freezeDeep({relation,temporal:structuredClone(temporal),bbma:structuredClone(bbma)});
}
