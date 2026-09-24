const REQUIRED_TIMEFRAMES = Object.freeze(['D1', 'H4', 'H1', 'M30', 'M15', 'M5']);
const DEFAULT_THRESHOLDS = Object.freeze({
  priceMaxAgeMs: 30_000,
  newsMaxAgeMs: 15 * 60_000,
});

function parseUtc(value, name) {
  if (typeof value !== 'string' || value.trim() === '' || !value.endsWith('Z')) {
    throw new TypeError(`${name} must be a valid UTC timestamp`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${name} must be a valid UTC timestamp`);
  return parsed;
}

function positiveFinite(value, fallback, name) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a non-negative finite number`);
  return value;
}

function normalizeRequiredTimeframes(value) {
  const list = value === undefined ? REQUIRED_TIMEFRAMES : value;
  if (!Array.isArray(list)) throw new TypeError('requiredTimeframes must be an array');
  const normalized = [...new Set(list.map((tf) => String(tf).trim().toUpperCase()))];
  for (const tf of normalized) {
    if (!REQUIRED_TIMEFRAMES.includes(tf)) throw new TypeError(`Unknown required timeframe: ${tf}`);
  }
  return normalized;
}

function observeFeed(feed, nowMs, maxAgeMs) {
  if (!feed || typeof feed !== 'object' || Array.isArray(feed)) {
    return { state: 'UNKNOWN', ageMs: null, rawStatus: 'MISSING' };
  }

  const rawStatus = String(feed.status ?? '').trim().toUpperCase() || 'UNKNOWN';
  let timestampMs = null;
  if (typeof feed.timestamp_utc === 'string' && feed.timestamp_utc.endsWith('Z')) {
    const parsed = Date.parse(feed.timestamp_utc);
    if (Number.isFinite(parsed)) timestampMs = parsed;
  }

  if (timestampMs === null) return { state: 'UNKNOWN', ageMs: null, rawStatus };

  const ageMs = Math.max(0, nowMs - timestampMs);
  if (rawStatus === 'STALE' || ((rawStatus === 'FRESH' || rawStatus === 'STREAMING') && ageMs > maxAgeMs)) {
    return { state: 'STALE', ageMs, rawStatus };
  }
  if ((rawStatus === 'FRESH' || rawStatus === 'STREAMING') && ageMs <= maxAgeMs) {
    return { state: 'FRESH', ageMs, rawStatus };
  }
  if (rawStatus === 'DELAYED' || rawStatus === 'SNAPSHOT') {
    return { state: 'DEGRADED', ageMs, rawStatus };
  }
  return { state: 'UNKNOWN', ageMs, rawStatus };
}

export function evaluateDataHealth({
  price,
  news,
  timeframes,
  nowUtc,
  requiredTimeframes,
  thresholds = {},
} = {}) {
  const nowMs = parseUtc(nowUtc, 'nowUtc');
  if (!timeframes || typeof timeframes !== 'object' || Array.isArray(timeframes)) {
    throw new TypeError('timeframes must be an object');
  }
  if (!thresholds || typeof thresholds !== 'object' || Array.isArray(thresholds)) {
    throw new TypeError('thresholds must be an object');
  }

  const priceMaxAgeMs = positiveFinite(thresholds.priceMaxAgeMs, DEFAULT_THRESHOLDS.priceMaxAgeMs, 'thresholds.priceMaxAgeMs');
  const newsMaxAgeMs = positiveFinite(thresholds.newsMaxAgeMs, DEFAULT_THRESHOLDS.newsMaxAgeMs, 'thresholds.newsMaxAgeMs');
  const required = normalizeRequiredTimeframes(requiredTimeframes);
  const priceObservation = observeFeed(price, nowMs, priceMaxAgeMs);
  const newsObservation = observeFeed(news, nowMs, newsMaxAgeMs);

  const normalizedTimeframes = Object.fromEntries(
    REQUIRED_TIMEFRAMES.map((tf) => [tf, timeframes[tf] === true]),
  );
  const reasons = [];

  if (priceObservation.state === 'STALE') reasons.push('PRICE_STALE');
  else if (priceObservation.state !== 'FRESH') reasons.push('PRICE_UNAVAILABLE');

  for (const tf of REQUIRED_TIMEFRAMES) {
    if (!normalizedTimeframes[tf]) reasons.push(`TIMEFRAME_${tf}_UNAVAILABLE`);
  }

  const newsFresh = newsObservation.state === 'FRESH';
  if (!newsFresh) reasons.push('NEWS_UNKNOWN');

  const requiredTimeframesAvailable = required.every((tf) => normalizedTimeframes[tf]);
  return Object.freeze({
    price: priceObservation.state === 'DEGRADED' ? 'UNKNOWN' : priceObservation.state,
    news: newsFresh ? 'FRESH' : 'UNKNOWN',
    timeframes: Object.freeze(normalizedTimeframes),
    required_timeframes: Object.freeze([...required]),
    technical_confirmation_allowed: priceObservation.state === 'FRESH' && requiredTimeframesAvailable,
    macro_state: newsFresh ? 'AVAILABLE' : 'UNKNOWN',
    reasons: Object.freeze(reasons),
    evaluated_at_utc: nowUtc,
    price_age_ms: priceObservation.ageMs,
    news_age_ms: newsObservation.ageMs,
  });
}

export { REQUIRED_TIMEFRAMES, DEFAULT_THRESHOLDS };
