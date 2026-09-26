const esc=s=>String(s??'—').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

export function renderTelegramCallbackView(result){
  if(!result?.ok) return {text:`⚠️ ${esc(result?.reason??'UNAVAILABLE')}`,parse_mode:'HTML'};
  const p=result.payload??{};
  if(result.action==='mtf'){
    const rows=['MN','W1','D1','H4','H1','M30','M15','M5'].map(tf=>{
      const x=p[tf]??{}; const state=(x.active_detectors??[]).join(', ')||x.direction||'—';
      return `${tf.padEnd(3)} ${esc(state)}`;
    }).join('\n');
    return {text:`📊 <b>BBMA MTF DETAIL</b>\n<pre>${rows}</pre>\nSnapshot: HISTORICAL`,parse_mode:'HTML'};
  }
  if(result.action==='news') return {text:`📰 <b>NEWS CONTEXT</b>\nEvent: ${esc(p.event)}\nImpact: ${esc(p.impact)}\nGate: ${esc(p.gate??p.state)}\nNews contextualizes/gates only.`,parse_mode:'HTML'};
  if(result.action==='evidence') return {text:`🔬 <b>EVIDENCE</b>\nObservation: ${esc(result.alert_id)}\nCoverage: ${esc(p.coverage??p.coverage_state)}\nReasons: ${esc((p.reason_codes??[]).join(', ')||'—')}\nSnapshot: HISTORICAL`,parse_mode:'HTML'};
  if(result.action==='status') return {text:`🔄 <b>CURRENT STATUS</b>\nDirection: ${esc(p.direction)}\nReadiness: ${esc(p.readiness)}\nMode: CURRENT\n\nNo broker execution.`,parse_mode:'HTML'};
  return {text:'⚠️ Unsupported callback',parse_mode:'HTML'};
}
