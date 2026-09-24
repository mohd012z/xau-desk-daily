import { formatMyt } from './time-myt.mjs';

const SENSITIVE_EXACT_KEYS = new Set([
  'telegrambottoken',
  'githubtoken',
  'apikey',
  'androidsigningpassword',
  'secret',
  'token',
  'password',
]);

const SIGNAL_STATES = new Set(['DETECTED', 'WATCH', 'SETUP', 'CONFIRMED', 'ACTIVE', 'INVALIDATED', 'EXPIRED']);
const ALERT_PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3', 'P4']);

const MACRO_KEYS = [
  'event_id', 'timestamp_utc', 'timestamp_myt', 'currency', 'title',
  'impact', 'status', 'actual', 'forecast', 'previous',
  'evidence_class', 'source_timestamp', 'verified', 'freshness',
];

const ALERT_KEYS = [
  'signal_id', 'symbol', 'type', 'direction', 'timeframe', 'state',
  'priority', 'generated_utc', 'generated_myt', 'technical', 'bbma',
  'macro', 'data_health', 'engine_version', 'rule_version',
];

function assertPlainObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function canonicalKey(key) {
  return String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSensitiveKey(key) {
  const normalized = canonicalKey(key);
  if (SENSITIVE_EXACT_KEYS.has(normalized)) return true;
  return normalized.endsWith('apikey') || normalized.endsWith('token') || normalized.endsWith('password') || normalized.endsWith('secret');
}

function scanForCredentials(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) scanForCredentials(item);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (isSensitiveKey(key)) throw new TypeError(`Prohibited credential field: ${key}`);
    scanForCredentials(nested);
  }
}

function assertString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function assertUtcTimestamp(value, name) {
  const normalized = assertString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(normalized)) {
    throw new TypeError(`${name} must be an ISO UTC timestamp`);
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${name} must be a valid timestamp`);
  return normalized;
}

function assertEnum(value, name, allowed) {
  const normalized = assertString(value, name).toUpperCase();
  if (!allowed.has(normalized)) throw new TypeError(`${name} has an unsupported value`);
  return normalized;
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function requireKeys(input, keys, derivedKeys = []) {
  for (const key of keys) {
    if (derivedKeys.includes(key)) continue;
    if (!(key in input)) throw new TypeError(`Missing required field: ${key}`);
  }
}

export function normalizeMacroEvent(input) {
  assertPlainObject(input, 'MacroEvent');
  scanForCredentials(input);
  requireKeys(input, MACRO_KEYS, ['timestamp_myt']);
  const eventId = assertString(input.event_id, 'event_id');
  const timestampUtc = assertUtcTimestamp(input.timestamp_utc, 'timestamp_utc');
  const currency = assertString(input.currency, 'currency').toUpperCase();
  const title = assertString(input.title, 'title');
  const impact = assertString(input.impact, 'impact').toUpperCase();
  const status = assertString(input.status, 'status').toUpperCase();
  const evidenceClass = assertString(input.evidence_class, 'evidence_class').toUpperCase();
  const sourceTimestamp = assertUtcTimestamp(input.source_timestamp, 'source_timestamp');
  if (typeof input.verified !== 'boolean') throw new TypeError('verified must be boolean');
  const freshness = assertString(input.freshness, 'freshness').toUpperCase();

  const normalized = {
    event_id: eventId,
    timestamp_utc: timestampUtc,
    timestamp_myt: formatMyt(timestampUtc),
    currency,
    title,
    impact,
    status,
    actual: clone(input.actual),
    forecast: clone(input.forecast),
    previous: clone(input.previous),
    evidence_class: evidenceClass,
    source_timestamp: sourceTimestamp,
    verified: input.verified,
    freshness,
  };
  return deepFreeze(normalized);
}

export function normalizeAlertCandidate(input) {
  assertPlainObject(input, 'AlertCandidate');
  scanForCredentials(input);
  requireKeys(input, ALERT_KEYS, ['generated_myt']);
  const signalId = assertString(input.signal_id, 'signal_id');
  const symbol = assertString(input.symbol, 'symbol').toUpperCase();
  const type = assertString(input.type, 'type').toUpperCase();
  let direction = input.direction;
  if (direction !== null) {
    direction = assertString(direction, 'direction').toUpperCase();
    if (direction !== 'BUY' && direction !== 'SELL') throw new TypeError('direction must be BUY, SELL, or null');
  }
  const timeframe = assertString(input.timeframe, 'timeframe').toUpperCase();
  const state = assertEnum(input.state, 'state', SIGNAL_STATES);
  const priority = assertEnum(input.priority, 'priority', ALERT_PRIORITIES);
  const generatedUtc = assertUtcTimestamp(input.generated_utc, 'generated_utc');
  assertPlainObject(input.technical, 'technical');
  assertPlainObject(input.bbma, 'bbma');
  assertPlainObject(input.macro, 'macro');
  assertPlainObject(input.data_health, 'data_health');
  const engineVersion = assertString(input.engine_version, 'engine_version');
  const ruleVersion = assertString(input.rule_version, 'rule_version');

  const normalized = {
    signal_id: signalId,
    symbol,
    type,
    direction,
    timeframe,
    state,
    priority,
    generated_utc: generatedUtc,
    generated_myt: formatMyt(generatedUtc),
    technical: clone(input.technical),
    bbma: clone(input.bbma),
    macro: clone(input.macro),
    data_health: clone(input.data_health),
    engine_version: engineVersion,
    rule_version: ruleVersion,
  };
  return deepFreeze(normalized);
}
