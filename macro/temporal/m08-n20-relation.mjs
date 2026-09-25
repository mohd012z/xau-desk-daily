function freeze(value) { return Object.freeze(value); }

export function classifyM08N20Relation(m08, n20) {
  if (!m08) return freeze({ relation: 'M08_UNRESOLVED', m08Id: null, n20Id: n20?.id ?? null });
  if (!n20) return freeze({ relation: 'N20_UNRESOLVED', m08Id: m08.id ?? null, n20Id: null });

  const a = m08.state;
  const b = n20.state;
  let relation = 'UNKNOWN';

  if (['UNRESOLVED', 'WAIT'].includes(a)) relation = 'M08_UNRESOLVED';
  else if (['UNRESOLVED'].includes(b)) relation = 'N20_UNRESOLVED';
  else if (['WAIT', 'FALSE_BREAK_UP', 'FALSE_BREAK_DOWN'].includes(b)) relation = 'N20_RANGE';
  else if ((a === 'UP' && b === 'UP') || (a === 'DOWN' && b === 'DOWN')) relation = 'SAME_DIRECTION';
  else if ((a === 'UP' && b === 'DOWN') || (a === 'DOWN' && b === 'UP')) relation = 'OPPOSITE_DIRECTION';

  return freeze({
    relation,
    m08Id: m08.id ?? null,
    n20Id: n20.id ?? null,
    m08ObservedUtc: m08.observedUtc ?? null,
    n20ObservedUtc: n20.observedUtc ?? null,
  });
}
