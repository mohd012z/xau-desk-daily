import { createHash } from 'node:crypto';

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} is required`);
  return value;
}

function utc(value, name) {
  required(value, name);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || !String(value).endsWith('Z')) throw new TypeError(`${name} must be UTC`);
  return date.toISOString();
}

function shortHash(parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 8);
}

function compactUtc(iso) {
  return iso.replace(/[-:]/g, '').replace('.000', '');
}

export function makeSignalId({ symbol, type, timeframe, anchorUtc, direction } = {}) {
  symbol = required(symbol, 'symbol').toUpperCase();
  type = required(type, 'type').toUpperCase();
  timeframe = required(timeframe, 'timeframe').toUpperCase();
  direction = required(direction, 'direction').toUpperCase();
  const anchor = utc(anchorUtc, 'anchorUtc');
  const parts = [symbol, type, timeframe, anchor, direction];
  return `${symbol}-${timeframe}-${type}-${direction}-${compactUtc(anchor)}-${shortHash(parts)}`;
}

export function makeAlertId({ signalId, state, version } = {}) {
  signalId = required(signalId, 'signalId');
  state = required(state, 'state').toUpperCase();
  version = required(version, 'version');
  const digest = shortHash([signalId, state, version]);
  return `ALERT-${signalId}-${state}-${version}-${digest}`;
}
