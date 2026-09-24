const NEXT={
  DETECTED:new Set(['WATCH']), WATCH:new Set(['SETUP','EXPIRED']), SETUP:new Set(['CONFIRMED','EXPIRED','INVALIDATED']),
  CONFIRMED:new Set(['ACTIVE','INVALIDATED','EXPIRED']), ACTIVE:new Set(['INVALIDATED','EXPIRED']), INVALIDATED:new Set(), EXPIRED:new Set()
};

export function canTransition(from,to){ return Boolean(NEXT[from]?.has(to)); }

export function transitionSignal(signal,to,atUtc,reason){
  if(!signal||typeof signal!=='object') throw new TypeError('Invalid signal');
  if(typeof atUtc!=='string'||!atUtc.endsWith('Z')||Number.isNaN(Date.parse(atUtc))) throw new TypeError('Invalid transition time');
  if(typeof reason!=='string'||!reason.trim()) throw new TypeError('Transition reason required');
  if(!canTransition(signal.state,to)) throw new TypeError(`Illegal transition ${signal.state} -> ${to}`);
  const history=Array.isArray(signal.history)?signal.history:[];
  const entry=Object.freeze({from:signal.state,to,at_utc:new Date(atUtc).toISOString(),reason:reason.trim()});
  return Object.freeze({...signal,state:to,history:Object.freeze([...history,entry])});
}
