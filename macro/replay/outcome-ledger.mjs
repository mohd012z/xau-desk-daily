const freeze=v=>{if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freeze(x);return Object.freeze(v);};
const utc=v=>typeof v==='string'&&v.endsWith('Z')&&!Number.isNaN(Date.parse(v));
const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
export function createOutcomeLedger(observations=[]){
 const index=new Map(observations.map(x=>[x.replay_id,x]));const outcomes=new Map();
 return Object.freeze({
  attach({replay_id,horizon,outcome_utc,entry_price,forward_price,mfe=null,mae=null}){
   const base=index.get(replay_id);if(!base)throw new TypeError('unknown replay_id');
   if(typeof horizon!=='string'||!horizon||!utc(outcome_utc)||Date.parse(outcome_utc)<=Date.parse(base.observed_utc))throw new TypeError('valid forward outcome required');
   if(!Number.isFinite(entry_price)||!Number.isFinite(forward_price))throw new TypeError('finite prices required');
   if(mfe!==null&&!Number.isFinite(mfe)||mae!==null&&!Number.isFinite(mae))throw new TypeError('mfe/mae must be finite when supplied');
   const key=`${replay_id}|${horizon}`;const row=freeze({replay_id,horizon,outcome_utc,entry_price,forward_price,mfe,mae});const prior=outcomes.get(key);
   if(prior){if(canonical(prior)===canonical(row))return prior;throw new TypeError(`outcome identity conflict: ${key}`);}
   outcomes.set(key,row);return row;
  },
  snapshot(){return freeze([...outcomes.values()].sort((a,b)=>a.replay_id.localeCompare(b.replay_id)||a.horizon.localeCompare(b.horizon)));}
 });
}
