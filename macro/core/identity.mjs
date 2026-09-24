import { createHash } from 'node:crypto';

function text(v,name){ if(typeof v!=='string'||!v.trim()) throw new TypeError(`Invalid ${name}`); return v.trim().toUpperCase(); }
function utc(v){ if(typeof v!=='string'||!v.endsWith('Z')||Number.isNaN(Date.parse(v))) throw new TypeError('Invalid anchorUtc'); return new Date(v).toISOString(); }
function hash(parts){ return createHash('sha256').update(parts.join('|')).digest('hex').slice(0,10); }

export function makeSignalId({symbol,type,timeframe,anchorUtc,direction}={}){
  const parts=[text(symbol,'symbol'),text(type,'type'),text(timeframe,'timeframe'),utc(anchorUtc),text(direction,'direction')];
  const compact=parts[3].replace(/[-:.]/g,'').replace('.000','');
  return `${parts[0]}-${parts[2]}-${parts[1]}-${parts[4]}-${compact}-${hash(parts)}`;
}

export function makeAlertId({signalId,state,version}={}){
  const parts=[text(signalId,'signalId'),text(state,'state'),text(version,'version')];
  return `ALERT-${hash(parts)}`;
}
