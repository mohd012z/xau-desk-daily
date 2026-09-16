function esc(value) {
  return String(value ?? '—').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function num(value, digits = 1) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
}
function pct(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '—';
}

export function renderAdvanceModelMarkup(model = {}) {
  const state = String(model.state ?? 'INSUFFICIENT_DATA').toUpperCase();
  if (!['READY','LOW_SAMPLE'].includes(state)) {
    const label = state === 'LEAKAGE_BLOCKED' ? 'LEAKAGE BLOCKED' : 'INSUFFICIENT DATA';
    return `<div class="advance-empty empty-state"><strong>${label}</strong><span>${esc(model.reason ?? 'NO_EVENT_ALIGNED_HISTORY')}</span></div>`;
  }

  const d = model.distribution ?? {};
  const p = model.priceBand ?? {};
  const c = model.confidence ?? {label:'VERY LOW',score:0,reasons:[]};
  const scenarios = Array.isArray(model.scenarios) ? model.scenarios : [];
  const scenarioRows = scenarios.length ? scenarios.map(row => `<div class="advance-scenario-row"><span>${esc(row.label)}</span><strong>${num(row.p50,1)}</strong><span>${num(row.priceCenter,5)}</span></div>`).join('') : '<div class="empty-state">Surprise sensitivity is not supported by the current verified sample.</div>';
  return `<div class="advance-model" data-model-state="${esc(state)}"><div class="advance-summary"><span>${esc(model.modelMode ?? 'ADVANCE')}</span><strong>${esc(model.symbol ?? '—')}</strong><span>Comparable ${esc(model.comparableCount ?? 0)} • effective n ${num(model.effectiveN,1)}</span></div><div class="advance-distribution"><div><span>P10</span><strong>${num(d.p10,1)}</strong><small>${num(p.p10,5)}</small></div><div><span>P25</span><strong>${num(d.p25,1)}</strong><small>${num(p.p25,5)}</small></div><div><span>P50</span><strong>${num(d.p50,1)}</strong><small>${num(p.p50,5)}</small></div><div><span>P75</span><strong>${num(d.p75,1)}</strong><small>${num(p.p75,5)}</small></div><div><span>P90</span><strong>${num(d.p90,1)}</strong><small>${num(p.p90,5)}</small></div></div><div class="advance-direction"><span>Positive ${pct(d.positiveFrequency)}</span><span>Negative ${pct(d.negativeFrequency)}</span><span>Mean absolute ${num(d.meanAbsoluteMove,1)}</span></div><div class="advance-confidence"><strong>${esc(c.label)} • ${esc(c.score ?? 0)}/100</strong><span>${(c.reasons ?? []).map(esc).join(' • ') || 'No confidence reasons supplied'}</span></div><div class="advance-scenarios"><div class="advance-scenario-head"><span>Surprise</span><span>Median move</span><span>Price center</span></div>${scenarioRows}</div></div>`;
}
