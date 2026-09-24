const REQUIRED_TIMEFRAMES = ['D1', 'H4', 'H1', 'M30', 'M15', 'M5'];

function assertUtc(value, name) {
  if (typeof value !== 'string' || value.trim() === '' || Number.isNaN(new Date(value).getTime())) {
    throw new TypeError(`${name} must be a valid UTC timestamp`);
  }
}

function normalizeFeed(feed, name) {
  if (!feed || typeof feed !== 'object') throw new TypeError(`${name} feed is required`);
  assertUtc(feed.timestamp_utc, `${name}.timestamp_utc`);
  const status = String(feed.status ?? '').toUpperCase();
  if (!status) throw new TypeError(`${name}.status is required`);
  return status;
}

export function evaluateDataHealth({ price, news, timeframes, nowUtc } = {}) {
  assertUtc(nowUtc, 'nowUtc');
  const priceStatus = normalizeFeed(price, 'price');
  const newsStatus = normalizeFeed(news, 'news');
  if (!timeframes || typeof timeframes !== 'object' || Array.isArray(timeframes)) {
    throw new TypeError('timeframes must be an object');
  }

  const normalizedTimeframes = Object.fromEntries(
    REQUIRED_TIMEFRAMES.map((tf) => [tf, timeframes[tf] === true]),
  );
  const reasons = [];

  const priceFresh = priceStatus === 'FRESH';
  if (!priceFresh) reasons.push(`PRICE_${priceStatus === 'STALE' ? 'STALE' : 'UNAVAILABLE'}`);

  for (const tf of REQUIRED_TIMEFRAMES) {
    if (!normalizedTimeframes[tf]) reasons.push(`TIMEFRAME_${tf}_UNAVAILABLE`);
  }

  const newsFresh = newsStatus === 'FRESH';
  if (!newsFresh) reasons.push('NEWS_UNKNOWN');

  const allTimeframesAvailable = REQUIRED_TIMEFRAMES.every((tf) => normalizedTimeframes[tf]);
  return Object.freeze({
    price: priceFresh ? 'FRESH' : (priceStatus === 'STALE' ? 'STALE' : 'UNKNOWN'),
    news: newsFresh ? 'FRESH' : 'UNKNOWN',
    timeframes: Object.freeze(normalizedTimeframes),
    technical_confirmation_allowed: priceFresh && allTimeframesAvailable,
    macro_state: newsFresh ? 'AVAILABLE' : 'UNKNOWN',
    reasons: Object.freeze(reasons),
    evaluated_at_utc: nowUtc,
  });
}
