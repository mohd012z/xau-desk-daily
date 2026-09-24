const TRANSITIONS = Object.freeze({
  DETECTED: Object.freeze(['WATCH']),
  WATCH: Object.freeze(['SETUP']),
  SETUP: Object.freeze(['CONFIRMED']),
  CONFIRMED: Object.freeze(['ACTIVE']),
  ACTIVE: Object.freeze(['INVALIDATED', 'EXPIRED']),
  INVALIDATED: Object.freeze([]),
  EXPIRED: Object.freeze([]),
});

function validState(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TRANSITIONS, value);
}

function assertUtc(value) {
  if (typeof value !== 'string' || value.trim() === '' || !value.endsWith('Z') || Number.isNaN(new Date(value).getTime())) {
    throw new TypeError('atUtc must be a valid UTC timestamp');
  }
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, deepClone(nested)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export function canTransition(from, to) {
  if (!validState(from) || !validState(to)) return false;
  return TRANSITIONS[from].includes(to);
}

export function transitionSignal(signal, to, atUtc, reason) {
  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) throw new TypeError('signal must be an object');
  const from = signal.state;
  if (!validState(from) || !validState(to)) throw new TypeError('Unknown signal state');
  if (!canTransition(from, to)) throw new TypeError(`Illegal transition: ${from} -> ${to}`);
  assertUtc(atUtc);
  if (typeof reason !== 'string' || reason.trim() === '') throw new TypeError('reason is required');

  const history = Array.isArray(signal.history) ? deepClone(signal.history) : [];
  history.push({ from, to, at_utc: atUtc, reason: reason.trim() });
  deepFreeze(history);
  return Object.freeze({ ...signal, state: to, history });
}

export const SIGNAL_STATES = Object.freeze(Object.keys(TRANSITIONS));
