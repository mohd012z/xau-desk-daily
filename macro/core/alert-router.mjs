import { makeAlertId } from './identity.mjs';

function assertCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('candidate must be an object');
  }
  for (const key of ['signal_id', 'state', 'priority', 'generated_utc', 'engine_version', 'rule_version']) {
    if (typeof candidate[key] !== 'string' || candidate[key].trim() === '') {
      throw new TypeError(`candidate.${key} is required`);
    }
  }
  if (!candidate.data_health || typeof candidate.data_health !== 'object') {
    throw new TypeError('candidate.data_health is required');
  }
  if (!Number.isFinite(Date.parse(candidate.generated_utc))) {
    throw new TypeError('candidate.generated_utc must be a valid timestamp');
  }
}

function previousValue(previous, key) {
  if (!previous) return undefined;
  if (previous[key] !== undefined) return previous[key];
  if (previous.candidate && previous.candidate[key] !== undefined) return previous.candidate[key];
  return undefined;
}

function cooldownSeconds(policy) {
  const value = policy.cooldown_seconds ?? 0;
  if (!Number.isFinite(value) || value < 0) throw new TypeError('policy.cooldown_seconds must be a non-negative finite number');
  return value;
}

function previousDeliveryTime(previous) {
  return previousValue(previous, 'delivered_at_utc') ?? previousValue(previous, 'delivery_timestamp_utc');
}

function isCooldownActive(candidate, previous, policy) {
  const seconds = cooldownSeconds(policy);
  if (seconds === 0 || !previous) return false;
  const deliveredAt = previousDeliveryTime(previous);
  if (typeof deliveredAt !== 'string') return false;
  const deliveredMs = Date.parse(deliveredAt);
  const candidateMs = Date.parse(candidate.generated_utc);
  if (!Number.isFinite(deliveredMs) || !Number.isFinite(candidateMs)) return false;
  const elapsedMs = candidateMs - deliveredMs;
  return elapsedMs >= 0 && elapsedMs < seconds * 1000;
}

function macroSuppressed(candidate, policy) {
  const list = policy.suppress_macro_states ?? [];
  if (!Array.isArray(list)) throw new TypeError('policy.suppress_macro_states must be an array');
  const state = candidate.macro && typeof candidate.macro === 'object' ? candidate.macro.state : undefined;
  return typeof state === 'string' && list.map((item) => String(item).toUpperCase()).includes(state.toUpperCase());
}

export function routeAlert({ candidate, previous = null, policy = {} } = {}) {
  assertCandidate(candidate);
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new TypeError('policy must be an object');

  const version = `${candidate.engine_version}:${candidate.rule_version}`;
  const alert_id = makeAlertId({ signalId: candidate.signal_id, state: candidate.state, version });

  let action = 'SUPPRESS';
  let reason = 'STATE_NOT_DELIVERABLE';

  if (candidate.state === 'CONFIRMED' && candidate.data_health.technical_confirmation_allowed !== true) {
    reason = 'DATA_HEALTH_BLOCK';
  } else if (previous) {
    const sameSignal = previousValue(previous, 'signal_id') === candidate.signal_id;
    const sameState = previousValue(previous, 'state') === candidate.state;
    const sameEngine = previousValue(previous, 'engine_version') === candidate.engine_version;
    const sameRule = previousValue(previous, 'rule_version') === candidate.rule_version;
    const samePriority = previousValue(previous, 'priority') === candidate.priority;

    if (sameSignal && !samePriority) {
      action = 'UPDATE';
      reason = 'PRIORITY_CHANGE';
    } else if (sameSignal && sameState && sameEngine && sameRule) {
      reason = 'UNCHANGED_DUPLICATE';
    } else if (sameSignal && sameState && (!sameEngine || !sameRule)) {
      if (isCooldownActive(candidate, previous, policy)) reason = 'COOLDOWN_ACTIVE';
      else if (policy.realert_on_version_change === true) {
        action = 'UPDATE';
        reason = 'VERSION_CHANGE';
      } else {
        reason = 'VERSION_ONLY_CHANGE';
      }
    } else if (sameSignal && !sameState) {
      action = 'UPDATE';
      reason = 'LIFECYCLE_UPDATE';
    } else if (candidate.state === 'CONFIRMED') {
      if (isCooldownActive(candidate, previous, policy)) reason = 'COOLDOWN_ACTIVE';
      else {
        action = 'DELIVER';
        reason = 'FIRST_DELIVERY';
      }
    }
  } else if (candidate.state === 'CONFIRMED') {
    action = 'DELIVER';
    reason = 'FIRST_DELIVERY';
  }

  if (candidate.state === 'CONFIRMED' && action !== 'SUPPRESS' && macroSuppressed(candidate, policy)) {
    action = 'SUPPRESS';
    reason = 'EVENT_RISK_SUPPRESS';
  }

  const delivery_enabled = action !== 'SUPPRESS' && policy.shadow_mode !== true;
  return Object.freeze({ action, reason, alert_id, delivery_enabled });
}
