import { formatMyt } from './time-myt.mjs';

const PROHIBITED = new Set(['telegram_bot_token','github_token','api_key','android_signing_password','secret']);
const MACRO_FIELDS = ['event_id','timestamp_utc','currency','title','impact','status','actual','forecast','previous','evidence_class','source_timestamp','verified','freshness'];
const ALERT_FIELDS = ['signal_id','symbol','type','direction','timeframe','state','priority','generated_utc','technical','bbma','macro','data_health','engine_version','rule_version'];

function rejectSecrets(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (PROHIBITED.has(key.toLowerCase())) throw new TypeError(`Prohibited integration field: ${key}`);
    rejectSecrets(child);
  }
}

function requireText(obj, key) {
  if (typeof obj[key] !== 'string' || !obj[key].trim()) throw new TypeError(`Missing or invalid ${key}`);
}

function requireIsoUtc(value, key) {
  if (typeof value !== 'string' || !value.endsWith('Z') || Number.isNaN(new Date(value).getTime())) throw new TypeError(`Invalid ${key}`);
}

function pick(input, fields) {
  return Object.fromEntries(fields.map(key => [key, input[key]]));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function normalizeMacroEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('MacroEvent must be an object');
  rejectSecrets(input);
  for (const key of ['event_id','currency','title','impact','status','evidence_class','freshness']) requireText(input, key);
  requireIsoUtc(input.timestamp_utc, 'timestamp_utc');
  requireIsoUtc(input.source_timestamp, 'source_timestamp');
  if (typeof input.verified !== 'boolean') throw new TypeError('Invalid verified');
  const out = pick(input, MACRO_FIELDS);
  out.timestamp_myt = formatMyt(input.timestamp_utc);
  return deepFreeze(out);
}

export function normalizeAlertCandidate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('AlertCandidate must be an object');
  rejectSecrets(input);
  for (const key of ['signal_id','symbol','type','timeframe','state','priority','engine_version','rule_version']) requireText(input, key);
  if (input.direction !== null && input.direction !== 'BUY' && input.direction !== 'SELL') throw new TypeError('Invalid direction');
  requireIsoUtc(input.generated_utc, 'generated_utc');
  for (const key of ['technical','bbma','macro','data_health']) {
    if (!input[key] || typeof input[key] !== 'object' || Array.isArray(input[key])) throw new TypeError(`Invalid ${key}`);
  }
  const out = pick(input, ALERT_FIELDS);
  for (const key of ['technical','bbma','macro','data_health']) out[key] = structuredClone(input[key]);
  out.generated_myt = formatMyt(input.generated_utc);
  return deepFreeze(out);
}
