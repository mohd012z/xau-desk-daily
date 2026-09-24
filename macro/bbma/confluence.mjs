const ORDER = Object.freeze(['D1','H4','H1','M30','M15','M5']);
const VALID = new Set(['ALIGNED_BUY','ALIGNED_SELL','MIXED','NEUTRAL','INCOMPLETE']);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) freeze(nested);
  return Object.freeze(value);
}

export function evaluateBbmaConfluence({ evidence }) {
  if (!evidence || typeof evidence !== 'object' || !VALID.has(evidence.overall_state) || !Array.isArray(evidence.timeframes)) {
    throw new TypeError('valid BBMA MTF evidence is required');
  }
  const byTf = new Map(evidence.timeframes.map(item => [item.timeframe, item]));
  const dir = evidence.overall_state === 'ALIGNED_BUY' ? 'BUY' : evidence.overall_state === 'ALIGNED_SELL' ? 'SELL' : null;
  const support = dir ? ORDER.filter(k => byTf.get(k)?.direction === dir) : [];
  const opposing = dir ? (dir === 'BUY' ? 'SELL' : 'BUY') : null;
  const conflicts = ORDER.filter(k => {
    const d = byTf.get(k)?.direction;
    return d === 'CONFLICT' || (opposing && d === opposing);
  });
  if (!dir && evidence.overall_state === 'MIXED') {
    const buys = ORDER.filter(k => byTf.get(k)?.direction === 'BUY');
    const sells = ORDER.filter(k => byTf.get(k)?.direction === 'SELL');
    conflicts.push(...ORDER.filter(k => buys.includes(k) || sells.includes(k)));
  }

  const reasons = [];
  let readiness = 'OBSERVED';
  if (evidence.overall_state === 'INCOMPLETE' || evidence.status === 'INCOMPLETE') {
    readiness = 'BLOCKED'; reasons.push('INCOMPLETE_DATA');
  } else if (evidence.overall_state === 'MIXED') {
    readiness = 'BLOCKED'; reasons.push('DIRECTION_CONFLICT');
  } else if (dir) {
    const same = k => byTf.get(k)?.direction === dir;
    if (same('H4') && same('H1') && same('M15') && same('M5') && (!byTf.get('D1') || ['NEUTRAL',dir].includes(byTf.get('D1').direction))) readiness = 'CONFIRMABLE';
    else if (same('H4') && same('H1') && same('M15')) readiness = 'SETUP_READY';
    else if (same('H4') && ORDER.slice(2).some(same)) readiness = 'WATCHABLE';
    reasons.push(`DIRECTION_${dir}`);
  } else reasons.push('NO_DIRECTIONAL_CONFLUENCE');

  const d1 = byTf.get('D1')?.direction;
  const lowerBuy = ORDER.slice(1).filter(k => byTf.get(k)?.direction === 'BUY').length;
  const lowerSell = ORDER.slice(1).filter(k => byTf.get(k)?.direction === 'SELL').length;
  if ((d1 === 'SELL' && lowerBuy > 0) || (d1 === 'BUY' && lowerSell > 0)) {
    readiness = 'BLOCKED';
    if (!conflicts.includes('D1')) conflicts.unshift('D1');
    reasons.push('HIGHER_TIMEFRAME_CONFLICT');
  }
  return freeze({ direction: dir, readiness, supporting_timeframes: support, conflict_timeframes: [...new Set(conflicts)], reason_codes: [...new Set(reasons)], data_status: evidence.status ?? 'OK', rule_version: evidence.rule_version });
}
