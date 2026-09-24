import { transitionSignal } from '../core/signal-state.mjs';
const RANK={OBSERVED:0,WATCHABLE:1,SETUP_READY:2,CONFIRMABLE:3,BLOCKED:-1};
function result(action,signal,reason){return Object.freeze({action,signal,reason});}
export function advanceBbmaShadowSignal({ signal, confluence, gate, atUtc, expire=false }) {
 if(!signal||!confluence||!gate) throw new TypeError('signal, confluence and gate are required');
 if(expire){ if(signal.state!=='ACTIVE') return result('HOLD',signal,'EXPIRY_NOT_APPLICABLE'); return result('TRANSITION',transitionSignal(signal,'EXPIRED',atUtc,'explicit expiry policy'),'EXPIRED'); }
 if(confluence.readiness==='BLOCKED'||confluence.direction==null){
   if(signal.state==='ACTIVE') return result('RECOMMEND_INVALIDATION',signal,'CONTRADICTORY_OR_BLOCKED_EVIDENCE');
   return result('HOLD',signal,'CONFLUENCE_BLOCKED');
 }
 if(gate.state==='BLOCK') return result('HOLD',signal,'CONFIRMATION_GATE_BLOCK');
 if(signal.state==='DETECTED'&&RANK[confluence.readiness]>=1) return result('TRANSITION',transitionSignal(signal,'WATCH',atUtc,'BBMA watchable confluence'),'WATCHABLE');
 if(signal.state==='WATCH'&&RANK[confluence.readiness]>=2&&gate.state==='ALLOW') return result('TRANSITION',transitionSignal(signal,'SETUP',atUtc,'BBMA setup-ready confluence'),'SETUP_READY');
 if(signal.state==='SETUP'&&confluence.readiness==='CONFIRMABLE'&&gate.state==='ALLOW') return result('TRANSITION',transitionSignal(signal,'CONFIRMED',atUtc,'BBMA confirmable confluence and gate allow'),'CONFIRMABLE');
 return result('HOLD',signal,'NO_LEGAL_PROGRESS');
}
