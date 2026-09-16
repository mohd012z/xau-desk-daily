import { getInstrument } from '../core/instruments.mjs';
import { calcFxReaction, calcMetalReaction, calcDigitalReaction } from '../core/reaction.mjs';

export function buildReactionSample(sample={}) {
  const meta=getInstrument(sample.symbol);
  if (!meta) throw new Error(`Unknown instrument ${sample.symbol}`);
  let reaction;
  if(meta.assetClass==='fx') reaction=calcFxReaction(sample.symbol,sample.before,sample.after,sample.high,sample.low);
  else if(meta.assetClass==='metal') reaction=calcMetalReaction(sample.before,sample.after,meta.tickSize ?? null);
  else reaction=calcDigitalReaction(sample.before,sample.after);
  const signedMove=meta.assetClass==='fx'?reaction.pips:(reaction.returnPct ?? reaction.dollarMove);
  return {...sample,reaction,signedMove,absoluteMove:Math.abs(signedMove),direction:signedMove>0?'POSITIVE':signedMove<0?'NEGATIVE':'FLAT'};
}
