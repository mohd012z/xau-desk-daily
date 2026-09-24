import { validateBbmaSeries } from './input.mjs';
import { getBbmaRules } from './rules.mjs';

function observation({ detected=false, direction=null, timeframe=null, anchor=null, ruleVersion='bbma-shadow-v1', evidence=[], status='OK' }={}) {
  return Object.freeze({ detector:'MOMENTUM', detected, direction, timeframe, anchor_utc:anchor, rule_version:ruleVersion, evidence:Object.freeze([...evidence]), status });
}

export function detectMomentum({ series=[], timeframe=null, ruleVersion='bbma-shadow-v1' }={}) {
  const rules=getBbmaRules(ruleVersion).momentum;
  if (!Array.isArray(series) || series.length < 1) return observation({timeframe,ruleVersion,status:'INSUFFICIENT_DATA'});
  const candles=validateBbmaSeries(series,{minimum:1});
  const current=candles.at(-1);
  const buy=rules.bb_close_inclusive ? current.close >= current.bb_upper : current.close > current.bb_upper;
  const sell=rules.bb_close_inclusive ? current.close <= current.bb_lower : current.close < current.bb_lower;
  if (buy && sell) return observation({timeframe,anchor:current.timestamp_utc,ruleVersion,evidence:['CLOSE_ABOVE_UPPER_BB','CLOSE_BELOW_LOWER_BB'],status:'AMBIGUOUS'});
  if (buy) return observation({detected:true,direction:'BUY',timeframe,anchor:current.timestamp_utc,ruleVersion,evidence:['CLOSE_ABOVE_UPPER_BB']});
  if (sell) return observation({detected:true,direction:'SELL',timeframe,anchor:current.timestamp_utc,ruleVersion,evidence:['CLOSE_BELOW_LOWER_BB']});
  return observation({timeframe,anchor:current.timestamp_utc,ruleVersion});
}
