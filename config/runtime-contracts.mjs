export const RUNTIME_HEALTH = Object.freeze([
  'BOOTING','LOADING_HISTORY','HISTORY_READY','CONNECTING_LIVE','LIVE',
  'INSUFFICIENT_DATA','STALE_DATA','FEED_DISCONNECTED','HISTORY_FAILED','RATE_LIMITED','OFFLINE'
]);

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const text = value => typeof value === 'string' && value.trim().length > 0;

export function validateCandle(candle) {
  const errors = [];
  if (!candle || typeof candle !== 'object') return { ok: false, errors: ['candle must be an object'] };
  for (const key of ['symbol','timeframe','source']) if (!text(candle[key])) errors.push(`${key} required`);
  for (const key of ['openTimeUTC','closeTimeUTC']) if (!UTC_ISO.test(candle[key] || '')) errors.push(`${key} must be UTC ISO`);
  for (const key of ['open','high','low','close','freshnessMs']) if (!finite(candle[key])) errors.push(`${key} must be finite`);
  if (finite(candle.freshnessMs) && candle.freshnessMs < 0) errors.push('freshnessMs must be >= 0');
  if (typeof candle.complete !== 'boolean') errors.push('complete must be boolean');
  if (['open','high','low','close'].every(key => finite(candle[key]))) {
    if (candle.high < Math.max(candle.open, candle.close, candle.low)) errors.push('high violates OHLC bounds');
    if (candle.low > Math.min(candle.open, candle.close, candle.high)) errors.push('low violates OHLC bounds');
  }
  if (UTC_ISO.test(candle.openTimeUTC || '') && UTC_ISO.test(candle.closeTimeUTC || '') && Date.parse(candle.closeTimeUTC) <= Date.parse(candle.openTimeUTC)) errors.push('closeTimeUTC must be after openTimeUTC');
  return { ok: errors.length === 0, errors };
}

export function validateCacheEnvelope(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return { ok: false, errors: ['cache envelope must be an object'] };
  if (!Number.isInteger(value.version) || value.version < 1) errors.push('version required');
  for (const key of ['key','source']) if (!text(value[key])) errors.push(`${key} required`);
  for (const key of ['capturedAtUTC','expiresAtUTC']) if (!UTC_ISO.test(value[key] || '')) errors.push(`${key} must be UTC ISO`);
  if (!Object.prototype.hasOwnProperty.call(value, 'payload')) errors.push('payload required');
  if (UTC_ISO.test(value.capturedAtUTC || '') && UTC_ISO.test(value.expiresAtUTC || '') && Date.parse(value.expiresAtUTC) <= Date.parse(value.capturedAtUTC)) errors.push('expiry must follow capture');
  return { ok: errors.length === 0, errors };
}

export function isCacheUsable(envelope, nowMs = Date.now()) {
  return validateCacheEnvelope(envelope).ok && nowMs >= Date.parse(envelope.capturedAtUTC) && nowMs < Date.parse(envelope.expiresAtUTC);
}

export function boundedAppend(values, nextValue, limit = 512) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const source = Array.isArray(values) ? values : [];
  if (source.length < limit) return [...source, nextValue];
  return [...source.slice(source.length - limit + 1), nextValue];
}
