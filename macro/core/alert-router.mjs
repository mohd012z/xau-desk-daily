import { makeAlertId } from './identity.mjs';

export function routeAlert({candidate,previous=null,policy={}}={}){
  if(!candidate||typeof candidate!=='object') throw new TypeError('Invalid candidate');
  let action='DELIVER', reason='FIRST_DELIVERY';
  if(candidate.state==='CONFIRMED' && candidate.data_health?.technical_confirmation_allowed===false){ action='SUPPRESS'; reason='DATA_HEALTH_BLOCK'; }
  else if(previous && previous.signal_id===candidate.signal_id){
    const same=previous.state===candidate.state && previous.engine_version===candidate.engine_version && previous.rule_version===candidate.rule_version;
    if(same){ action='SUPPRESS'; reason='UNCHANGED_DUPLICATE'; }
    else { action='UPDATE'; reason='SIGNAL_CHANGED'; }
  }
  return Object.freeze({
    action, reason,
    alert_id:makeAlertId({signalId:candidate.signal_id,state:candidate.state,version:`${candidate.engine_version}:${candidate.rule_version}`}),
    delivery_enabled: action!=='SUPPRESS' && policy.shadow_mode!==true
  });
}
