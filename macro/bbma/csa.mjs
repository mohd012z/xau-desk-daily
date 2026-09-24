import { validateBbmaSeries } from './input.mjs';
import { getBbmaRules } from './rules.mjs';

function observation({ detected=false, direction=null, timeframe, anchor=null, ruleVersion, evidence=[], status='OK' }) {
  return Object.freeze({
    detector: 'CSA',
    detected,
    direction,
    timeframe,
    anchor_utc: anchor,
    rule_version: ruleVersion,
    evidence: Object.freeze([...evidence]),
    status
  });
}

export function detectCsa({ series=[], timeframe, ruleVersion='bbma-shadow-v1' }={}) {
  const rules=getBbmaRules(ruleVersion).csa;
  if (!Array.isArray(series) || series.length < 2) {
    return observation({ timeframe, ruleVersion, status:'INSUFFICIENT_DATA' });
  }

  const candles=validateBbmaSeries(series,{minimum:2});
  const previous=candles[candles.length-2];
  const current=candles[candles.length-1];

  // Shadow v1 deliberately confirms CSA from candle CLOSE, never from a wick.
  // With close_cross_inclusive=false, equality at the current EMA50 is not a cross.
  const buyFrom = previous.close <= previous.ema50;
  const buyTo = rules.close_cross_inclusive ? current.close >= current.ema50 : current.close > current.ema50;
  const sellFrom = previous.close >= previous.ema50;
  const sellTo = rules.close_cross_inclusive ? current.close <= current.ema50 : current.close < current.ema50;

  const buy=buyFrom && buyTo;
  const sell=sellFrom && sellTo;

  if (buy && !sell) {
    return observation({
      detected:true,
      direction:'BUY',
      timeframe,
      anchor:current.timestamp_utc,
      ruleVersion,
      evidence:['PREVIOUS_CLOSE_AT_OR_BELOW_EMA50','CURRENT_CLOSE_ABOVE_EMA50']
    });
  }
  if (sell && !buy) {
    return observation({
      detected:true,
      direction:'SELL',
      timeframe,
      anchor:current.timestamp_utc,
      ruleVersion,
      evidence:['PREVIOUS_CLOSE_AT_OR_ABOVE_EMA50','CURRENT_CLOSE_BELOW_EMA50']
    });
  }

  return observation({ timeframe, anchor:current.timestamp_utc, ruleVersion });
}
