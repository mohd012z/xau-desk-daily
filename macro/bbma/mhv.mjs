import { detectExtreme } from './extreme.mjs';
import { getBbmaRules } from './rules.mjs';

const DEFAULT_RULE_VERSION = 'bbma-shadow-v1';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function result({ detected=false, direction=null, candle=null, timeframe=null, ruleVersion=DEFAULT_RULE_VERSION, evidence=[], status='OK' }={}) {
  return Object.freeze({
    detector:'MHV', detected, direction, timeframe:timeframe ?? null,
    anchor_utc:candle?.timestamp_utc ?? null, rule_version:ruleVersion,
    evidence:Object.freeze([...evidence]), status
  });
}

export function detectMhv({ series=[], timeframe=null, ruleVersion=DEFAULT_RULE_VERSION }={}) {
  const rules=getBbmaRules(ruleVersion).mhv;
  if (!Array.isArray(series) || series.length < 2) return result({timeframe,ruleVersion,status:'INSUFFICIENT_DATA'});

  const prior=series.at(-2), current=series.at(-1);
  if (!prior || !current || !prior.timestamp_utc || !current.timestamp_utc ||
      !finite(current.close) || !finite(current.bb_lower) || !finite(current.bb_upper)) {
    return result({candle:current,timeframe,ruleVersion,status:'INSUFFICIENT_DATA'});
  }

  const priorExtreme=detectExtreme({series:[prior],timeframe,ruleVersion});
  const priorBuy=priorExtreme.detected && priorExtreme.direction==='BUY';
  const priorSell=priorExtreme.detected && priorExtreme.direction==='SELL';
  const returnedAboveLower = rules.require_return_inside_bb ? current.close > current.bb_lower : current.close >= current.bb_lower;
  const returnedBelowUpper = rules.require_return_inside_bb ? current.close < current.bb_upper : current.close <= current.bb_upper;
  const buy=priorBuy && returnedAboveLower;
  const sell=priorSell && returnedBelowUpper;

  if (buy && sell) return result({candle:current,timeframe,ruleVersion,evidence:['PRIOR_EXTREME_BUY_CONTEXT','PRIOR_EXTREME_SELL_CONTEXT'],status:'AMBIGUOUS'});
  if (buy) return result({detected:true,direction:'BUY',candle:current,timeframe,ruleVersion,evidence:['PRIOR_EXTREME_BUY_CONTEXT','RETURN_INSIDE_LOWER_BB']});
  if (sell) return result({detected:true,direction:'SELL',candle:current,timeframe,ruleVersion,evidence:['PRIOR_EXTREME_SELL_CONTEXT','RETURN_INSIDE_UPPER_BB']});
  return result({candle:current,timeframe,ruleVersion});
}
