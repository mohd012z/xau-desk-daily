const NUMERIC_FIELDS = [
  'open','high','low','close','bb_upper','bb_mid','bb_lower',
  'ma5_high','ma5_low','ma10_high','ma10_low','ema50'
];

function validUtc(value) {
  return typeof value === 'string' && value.endsWith('Z') && !Number.isNaN(Date.parse(value));
}

export function validateBbmaSeries(series, { minimum = 1 } = {}) {
  if (!Array.isArray(series)) throw new TypeError('BBMA series must be an array');
  if (!Number.isInteger(minimum) || minimum < 0) throw new TypeError('Invalid minimum history');
  if (series.length < minimum) throw new RangeError(`Insufficient BBMA history: need ${minimum}, got ${series.length}`);

  let previousMs = -Infinity;
  const normalized = series.map((source, index) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new TypeError(`Invalid candle at index ${index}`);
    if (!validUtc(source.timestamp_utc)) throw new TypeError(`Invalid timestamp_utc at index ${index}`);
    const timestampMs = Date.parse(source.timestamp_utc);
    if (timestampMs <= previousMs) throw new TypeError(`BBMA timestamps must be unique and strictly ascending at index ${index}`);
    previousMs = timestampMs;

    for (const field of NUMERIC_FIELDS) {
      if (!Number.isFinite(source[field])) throw new TypeError(`Invalid ${field} at index ${index}`);
    }
    if (source.high < source.low) throw new TypeError(`Invalid high/low range at index ${index}`);
    if (source.open > source.high || source.open < source.low || source.close > source.high || source.close < source.low) {
      throw new TypeError(`OHLC outside candle range at index ${index}`);
    }

    return Object.freeze({
      timestamp_utc: new Date(timestampMs).toISOString(),
      ...Object.fromEntries(NUMERIC_FIELDS.map(field => [field, source[field]]))
    });
  });

  return Object.freeze(normalized);
}
