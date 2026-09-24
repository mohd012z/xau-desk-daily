const IMPACTS=new Set(['LOW','MEDIUM','HIGH','UNKNOWN']);
const iso=v=>typeof v==='string'&&v.endsWith('Z')&&!Number.isNaN(Date.parse(v));
const freeze=v=>{if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freeze(x);return Object.freeze(v);};
function relevant(event){const a=event?.affectedAssets??{};return (a.primary??[]).includes('XAU/USD')||(a.secondary??[]).includes('XAU/USD')||(a.currencies??[]).includes('USD');}
export function normalizeXauEventRisk({event,observedUtc,policy}){
 if(!event||!iso(observedUtc)||!policy)throw new TypeError('event, valid observedUtc and policy are required');
 for(const k of ['preWindowMinutes','blockWindowMinutes','postWindowMinutes'])if(!Number.isFinite(policy[k])||policy[k]<0)throw new TypeError(`invalid ${k}`);
 const xauRelevant=relevant(event); const impact=String(event.impact??'UNKNOWN').toUpperCase(); const reasons=[];
 if(!xauRelevant)return freeze({event_ref:event.id??null,event_time_utc:event.eventTimeUtc??null,xau_relevant:false,impact:IMPACTS.has(impact)?impact:'UNKNOWN',phase:'OUTSIDE',risk:'NONE',reason_codes:['NOT_XAU_RELEVANT']});
 if(!iso(event.eventTimeUtc))return freeze({event_ref:event.id??null,event_time_utc:null,xau_relevant:true,impact:IMPACTS.has(impact)?impact:'UNKNOWN',phase:'UNKNOWN',risk:'BLOCK',reason_codes:['INVALID_EVENT_TIME']});
 const eventMs=Date.parse(event.eventTimeUtc), now=Date.parse(observedUtc), delta=(now-eventMs)/60000;
 let phase='OUTSIDE';
 if(delta>=-policy.blockWindowMinutes&&delta<=policy.blockWindowMinutes)phase='WINDOW';
 else if(delta>=-policy.preWindowMinutes&&delta<-policy.blockWindowMinutes)phase='UPCOMING';
 else if(delta>policy.blockWindowMinutes&&delta<=policy.postWindowMinutes)phase='POST';
 const normalizedImpact=IMPACTS.has(impact)?impact:'UNKNOWN'; let risk='NONE';
 if(normalizedImpact==='UNKNOWN'){risk='BLOCK';reasons.push('UNKNOWN_RELEVANT_IMPACT');}
 else if(normalizedImpact==='HIGH'&&phase==='WINDOW'){risk='BLOCK';reasons.push('HIGH_IMPACT_WINDOW');}
 else if(normalizedImpact==='HIGH'&&['UPCOMING','POST'].includes(phase)){risk='WATCH_ONLY';reasons.push(`HIGH_IMPACT_${phase}`);}
 else if(normalizedImpact==='MEDIUM'&&phase!=='OUTSIDE'){risk='WATCH_ONLY';reasons.push(`MEDIUM_IMPACT_${phase}`);}
 else reasons.push('NO_ACTIVE_EVENT_RESTRICTION');
 return freeze({event_ref:event.id??null,event_time_utc:event.eventTimeUtc,xau_relevant:true,impact:normalizedImpact,phase,risk,reason_codes:reasons});
}
