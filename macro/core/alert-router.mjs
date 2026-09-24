import { makeAlertId } from './identity.mjs';

function assertCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('candidate must be an object');
  }
  for (const key of ['signal_id', 'state', 'engine_version', 'rule_version']) {
    if (typeof candidate[key] !== 'string' || candidate[key].trim() === '') {
      throw new TypeError(`candidate.${key} is required`);
    }
  }
  if (!candidate.data_health || typeof candidate.data_health !== 'object') {
    throw new TypeError('candidate.data_health is required');
  }
}

function previousValue(previous, key) {
  if (!previous) return undefined;
  if (previous[key] !== undefined) return previous[key];
  if (previous.candidate && previous.candidate[key] !== undefined) return previous.candidate[key];
  return undefined;
}

export function routeAlert({ candidate, previous = null, policy = {} } = {}) {
  assertCandidate(candidate);
  const version = `${candidate.engine_version}:${candidate.rule_version}`;
  const alert_id = makeAlertId({ signalId: candidate.signal_id, state: candidate.state, version });
  const delivery_enabled = policy.shadow_mode !== true;

  let action = 'SUPPRESS';
  let reason = 'STATE_NOT_DELIVERABLE';

  if (candidate.state === 'CONFIRMED' && candidate.data_health.technical_confirmation_allowed !== true) {
    reason = 'DATA_HEALTH_BLOCK';
  } else if (previous) {
    const sameSignal = previousValue(previous, 'signal_id') === candidate.signal_id;
    const sameState = previousValue(previous, 'state') === candidate.state;
    const sameEngine = previousValue(previous, 'engine_version') === candidate.engine_version;
    const sameRule = previousValue(previous, 'rule_version') === candidate.rule_version;

    if (sameSignal && sameState && sameEngine && sameRule) {
      reason = 'UNCHANGED_DUPLICATE';
    } else if (sameSignal && !sameState) {
      action = 'UPDATE';
      reason = 'LIFECYCLE_UPDATE';
    } else if (candidate.state === 'CONFIRMED') {
      action = 'DELIVER';
      reason = 'FIRST_DELIVERY';
    }
  } else if (candidate.state === 'CONFIRMED') {
    action = 'DELIVER';
    reason = 'FIRST_DELIVERY';
  }

  return Object.freeze({ action, reason, alert_id, delivery_enabled });
}
