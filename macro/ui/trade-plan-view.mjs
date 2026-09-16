function esc(v){return String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function join(xs){return (xs?.length?xs:['—']).map(esc).join(' • ');}

export function renderTradePlanMarkup(p={}) {
 const h=p.historical||{}; const q=p.quality||{label:'LOW',reasons:['INSUFFICIENT_DATA']};
 const range50=h.p25==null?'—':`${esc(h.p25)} → ${esc(h.p75)}`;
 const range80=h.p10==null?'—':`${esc(h.p10)} → ${esc(h.p90)}`;
 const reasons=q.reasons?.length?q.reasons.map(esc).join(' • '):'No active quality warnings';
 return `<article class="trade-plan-card" data-model-state="${esc(p.modelState)}">
<header><div><span class="eyebrow">MYT EVENT TRADE PLAN</span><h2>${esc(p.eventName)}</h2></div><strong>${esc(p.countdown?.text)}</strong></header>
<div class="trade-plan-time">${esc(p.eventTimeMyt)} • Asia/Kuala_Lumpur • ${esc(p.timeSource)} • ${esc(p.timeConfidence)}</div>
<div class="trade-plan-grid"><section><span>State</span><strong>${esc(p.modelState)}</strong></section><section><span>Affected</span><strong>${join(p.affectedAssets)}</strong></section><section><span>Model pressure</span><strong>${esc(p.pressure)}</strong></section><section><span>Observed reaction</span><strong>${esc(p.observed)}</strong></section><section><span>Confirmation</span><strong>${esc(p.confirmation)}</strong></section><section><span>From price</span><strong>${esc(p.prices?.from)}</strong></section></div>
<div class="trade-plan-ranges"><span>Historical n ${esc(h.n??'—')}</span><span>Median ${esc(h.median??'—')}</span><span>50% ${range50}</span><span>80% ${range80}</span></div>
<footer><strong>Quality ${esc(q.label)}</strong><span>${reasons}</span></footer></article>`;
}