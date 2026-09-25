const clone=v=>Array.isArray(v)?v.map(clone):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)])):v;
const freeze=v=>{if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freeze(x);return Object.freeze(v);};
const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
export function createObservationLedger(){
 const records=[],byId=new Map();let duplicates=0;
 return Object.freeze({
  append(record){
   if(!record||typeof record.replay_id!=='string'||!record.replay_id)throw new TypeError('replay_id required');
   const fingerprint=canonical(record),prior=byId.get(record.replay_id);
   if(prior!==undefined){if(prior===fingerprint){duplicates++;return false;}throw new TypeError(`replay identity conflict: ${record.replay_id}`);}
   byId.set(record.replay_id,fingerprint);records.push(clone(record));return true;
  },
  snapshot(){return freeze({records:records.slice().sort((a,b)=>String(a.observed_utc).localeCompare(String(b.observed_utc))||a.replay_id.localeCompare(b.replay_id)).map(clone),exact_duplicate_count:duplicates});}
 });
}
