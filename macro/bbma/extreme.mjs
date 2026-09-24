const DEFAULT_RULE_VERSION = 'bbma-shadow-v1';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function result({ detected = false, direction = null, candle = null, timeframe = null, ruleVersion, evidence = [], status = 'OK' }) {
  return {
    detected,
    direction,
    timeframe: timeframe ?? null,
    anchor_utc: candle?.timestamp_utc ?? null,
    rule_version: ruleVersion || DEFAULT_RULE_VERSION,
    evidence,
    status,
  };
}

/**
 * Detect the BBMA Extreme condition on the latest completed candle supplied.
 *
 * BUY  : candle low touches/breaches lower BB AND MA5 Low is strictly outside it.
 * SELL : candle high touches/breaches upper BB AND MA5 High is strictly outside it.
 *
 * Equality counts as a Bollinger-band touch. Equality of MA5 to the band is
 * deliberately not "outside". No values are inferred when required market
 * data is absent.
 */
export function detectExtreme({ series = [], timeframe = null, ruleVersion = DEFAULT_RULE_VERSION } = {}) {
  if (!Array.isArray(series) || series.length === 0) {
    return result({ timeframe, ruleVersion, status: 'INSUFFICIENT_DATA' });
  }

  const candle = series.at(-1);
  if (!candle || !finite(candle.low) || !finite(candle.high) ||
      !finite(candle.bb_lower) || !finite(candle.bb_upper) ||
      !finite(candle.ma5_low) || !finite(candle.ma5_high) ||
      !candle.timestamp_utc) {
    return result({ candle, timeframe, ruleVersion, status: 'INSUFFICIENT_DATA' });
  }

  const buyTouch = candle.low <= candle.bb_lower;
  const buyMaOutside = candle.ma5_low < candle.bb_lower;
  const sellTouch = candle.high >= candle.bb_upper;
  const sellMaOutside = candle.ma5_high > candle.bb_upper;

  const buy = buyTouch && buyMaOutside;
  const sell = sellTouch && sellMaOutside;

  // A malformed/wide candle can satisfy both sides. Do not fabricate a
  // directional signal when the evidence is ambiguous.
  if (buy && sell) {
    return result({
      candle,
      timeframe,
      ruleVersion,
      evidence: [
        'LOW_TOUCH_LOWER_BB',
        'MA5_LOW_OUTSIDE_LOWER_BB',
        'HIGH_TOUCH_UPPER_BB',
        'MA5_HIGH_OUTSIDE_UPPER_BB',
      ],
      status: 'AMBIGUOUS',
    });
  }

  if (buy) {
    return result({
      detected: true,
      direction: 'BUY',
      candle,
      timeframe,
      ruleVersion,
      evidence: ['LOW_TOUCH_LOWER_BB', 'MA5_LOW_OUTSIDE_LOWER_BB'],
    });
  }

  if (sell) {
    return result({
      detected: true,
      direction: 'SELL',
      candle,
      timeframe,
      ruleVersion,
      evidence: ['HIGH_TOUCH_UPPER_BB', 'MA5_HIGH_OUTSIDE_UPPER_BB'],
    });
  }

  return result({ candle, timeframe, ruleVersion });
}
