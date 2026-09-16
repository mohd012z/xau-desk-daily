import { getPipSize } from './instruments.mjs';

const round = (v, dp = 4) => Number(v.toFixed(dp));

export function calcFxReaction(symbol, before, after, high = null, low = null) {
  const pip = getPipSize(symbol);
  if (!pip) throw new Error(`No FX pip metadata for ${symbol}`);
  return {
    fromPrice: before,
    toPrice: after,
    pips: round((after - before) / pip, 1),
    maxUpPips: high == null ? null : round((high - before) / pip, 1),
    maxDownPips: low == null ? null : round((low - before) / pip, 1),
    rangePips: high == null || low == null ? null : round((high - low) / pip, 1)
  };
}

export function calcMetalReaction(before, after, tickSize = null) {
  const dollarMove = round(after - before, 2);
  return {
    fromPrice: before,
    toPrice: after,
    dollarMove,
    returnPct: round((after / before - 1) * 100, 4),
    providerPoints: tickSize ? round(dollarMove / tickSize, 1) : null
  };
}

export function calcDigitalReaction(before, after) {
  return {
    fromPrice: before,
    toPrice: after,
    dollarMove: round(after - before, 2),
    returnPct: round((after / before - 1) * 100, 4)
  };
}
