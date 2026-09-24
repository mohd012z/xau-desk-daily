import { validateBbmaSeries } from './input.mjs';
import { getBbmaRules } from './rules.mjs';

function observation({ detected = false, direction = null, timeframe, anchor = null, ruleVersion, evidence = [], status = 'OK' }) {
  return Object.freeze({ detector: 'REENTRY', detected, direction, timeframe, anchor_utc: anchor, rule_version: ruleVersion, evidence: Object.freeze(evidence), status });
}

export function detectReentry({ series, timeframe, ruleVersion = 'bbma-shadow-v1' }) {
  const rules = getBbmaRules(ruleVersion).reentry;
  if (!Array.isArray(series) || series.length < 2) {
    return observation({ timeframe, ruleVersion, status: 'INSUFFICIENT_DATA' });
  }
  const candles = validateBbmaSeries(series, { minimum: 2 });
  const previous = candles.at(-2);
  const current = candles.at(-1);
  const bullishContext = previous.close > previous.ema50 && current.close > current.ema50;
  const bearishContext = previous.close < previous.ema50 && current.close < current.ema50;
  const buyTouch = rules.zone_touch_inclusive ? current.low <= current.ma5_low : current.low < current.ma5_low;
  const sellTouch = rules.zone_touch_inclusive ? current.high >= current.ma5_high : current.high > current.ma5_high;

  if (buyTouch && bullishContext) return observation({ detected: true, direction: 'BUY', timeframe, anchor: current.timestamp_utc, ruleVersion, evidence: ['BULLISH_CONTEXT', 'PULLBACK_MA5_LOW'] });
  if (sellTouch && bearishContext) return observation({ detected: true, direction: 'SELL', timeframe, anchor: current.timestamp_utc, ruleVersion, evidence: ['BEARISH_CONTEXT', 'PULLBACK_MA5_HIGH'] });

  const evidence = [];
  if (buyTouch && bearishContext) evidence.push('CONFLICT_BULLISH_ZONE_BEARISH_CONTEXT');
  if (sellTouch && bullishContext) evidence.push('CONFLICT_BEARISH_ZONE_BULLISH_CONTEXT');
  return observation({ timeframe, anchor: current.timestamp_utc, ruleVersion, evidence });
}
