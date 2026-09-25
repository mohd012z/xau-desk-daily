function invariant(ok, message) {
  if (!ok) throw new TypeError(message);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function classifySession(hour, sessions) {
  const active = [];
  for (const [name, range] of Object.entries(sessions)) {
    invariant(Array.isArray(range) && range.length === 2, `invalid session ${name}`);
    const [start, end] = range;
    invariant(Number.isFinite(start) && Number.isFinite(end), `invalid session ${name}`);
    const inside = start <= end ? hour >= start && hour < end : hour >= start || hour < end;
    if (inside) active.push(name.toUpperCase());
  }
  if (!active.length) return 'OUTSIDE';
  if (active.length === 1) return active[0];
  return `${active[0]}_${active[1]}_OVERLAP`;
}

function spreadRegime(value, policy) {
  if (!Number.isFinite(value)) return 'UNKNOWN';
  if (value >= policy.extreme) return 'EXTREME';
  if (value >= policy.elevated) return 'ELEVATED';
  return 'NORMAL';
}

function volatilityRegime(value, policy) {
  if (!Number.isFinite(value)) return 'UNKNOWN';
  if (value < policy.lowBelow) return 'LOW';
  if (value >= policy.highAtOrAbove) return 'HIGH';
  return 'NORMAL';
}

export function classifyEvidenceRegime(input, policy) {
  invariant(input && typeof input === 'object', 'input is required');
  invariant(policy && typeof policy === 'object', 'policy is required');
  invariant(typeof policy.version === 'string' && policy.version, 'policy version is required');
  invariant(policy.sessions && typeof policy.sessions === 'object', 'sessions policy is required');
  invariant(policy.spread && Number.isFinite(policy.spread.elevated) && Number.isFinite(policy.spread.extreme), 'spread policy is required');
  invariant(policy.spread.extreme >= policy.spread.elevated, 'spread thresholds are invalid');
  invariant(policy.volatility && Number.isFinite(policy.volatility.lowBelow) && Number.isFinite(policy.volatility.highAtOrAbove), 'volatility policy is required');
  invariant(policy.volatility.highAtOrAbove >= policy.volatility.lowBelow, 'volatility thresholds are invalid');

  const observed = new Date(input.observedUtc);
  invariant(Number.isFinite(observed.getTime()), 'observedUtc must be valid');

  return deepFreeze({
    observed_utc: observed.toISOString(),
    direction: input.direction ?? 'UNKNOWN',
    readiness: input.readiness ?? 'UNKNOWN',
    gate: input.gate ?? 'UNKNOWN',
    session: classifySession(observed.getUTCHours() + observed.getUTCMinutes() / 60, policy.sessions),
    event_class: input.eventClass ?? 'UNKNOWN',
    event_proximity: input.eventProximity ?? 'UNKNOWN',
    spread_regime: spreadRegime(input.spread, policy.spread),
    volatility_regime: volatilityRegime(input.volatility, policy.volatility),
    data_health_regime: input.dataHealth ?? 'UNKNOWN',
    policy_version: policy.version,
  });
}
