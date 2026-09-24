import { formatMyt } from './time-myt.mjs';

const PROHIBITED_KEYS = new Set([
  'telegram_bot_token',
  'github_token',
  'api_key',
  'android_signing_password',
  'secret',
]);

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

function scanForCredentials(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) scanForCredentials(item);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (PROHIBITED_KEYS.has(key.toLowerCase())) {
      throw new TypeError(`Prohibited credential field: ${key}`);
    }
    scanForCredentials(nested);
  }
}

function assertString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function assertUtcTimestamp(value, name) {
  assertString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new TypeError(`${name} must be an ISO UTC timestamp`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${name} must be a valid timestamp`);
  return value;
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
  assertString(input.event_id, 'event_id');
  assertUtcTimestamp(input.timestamp_utc, 'timestamp_utc');
  assertString(input.currency, 'currency');
  assertString(input.title, 'title');
  assertString(input.impact, 'impact');
  assertString(input.status, 'status');
  assertString(input.evidence_class, 'evidence_class');
  assertUtcTimestamp(input.source_timestamp, 'source_timestamp');
  if (typeof input.verified !== 'boolean') throw new TypeError('verified must be boolean');
  assertString(input.freshness, 'freshness');

  const normalized = {
    event_id: input.event_id,
    timestamp_utc: input.timestamp_utc,
    timestamp_myt: formatMyt(input.timestamp_utc),
    currency: input.currency,
    title: input.title,
    impact: input.impact,
    status: input.status,
    actual: clone(input.actual),
    forecast: clone(input.forecast),
    previous: clone(input.previous),
    evidence_class: input.evidence_class,
    source_timestamp: input.source_timestamp,
    verified: input.verified,
    freshness: input.freshness,
  };
  return deepFreeze(normalized);
}

export function normalizeAlertCandidate(input) {
  assertPlainObject(input, 'AlertCandidate');
  scanForCredentials(input);
  requireKeys(input, ALERT_KEYS, ['generated_myt']);
  assertString(input.signal_id, 'signal_id');
  assertString(input.symbol, 'symbol');
  assertString(input.type, 'type');
  if (input.direction !== null && input.direction !== 'BUY' && input.direction !== 'SELL') {
    throw new TypeError('direction must be BUY, SELL, or null');
  }
  assertString(input.timeframe, 'timeframe');
  assertString(input.state, 'state');
  assertString(input.priority, 'priority');
  assertUtcTimestamp(input.generated_utc, 'generated_utc');
  assertPlainObject(input.technical, 'technical');
  assertPlainObject(input.bbma, 'bbma');
  assertPlainObject(input.macro, 'macro');
  assertPlainObject(input.data_health, 'data_health');
  assertString(input.engine_version, 'engine_version');
  assertString(input.rule_version, 'rule_version');

  const normalized = {
    signal_id: input.signal_id,
    symbol: input.symbol,
    type: input.type,
    direction: input.direction,
    timeframe: input.timeframe,
    state: input.state,
    priority: input.priority,
    generated_utc: input.generated_utc,
    generated_myt: formatMyt(input.generated_utc),
    technical: clone(input.technical),
    bbma: clone(input.bbma),
    macro: clone(input.macro),
    data_health: clone(input.data_health),
    engine_version: input.engine_version,
    rule_version: input.rule_version,
  };
  return deepFreeze(normalized);
}
