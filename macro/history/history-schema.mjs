import { getInstrument } from '../core/instruments.mjs';

const finite = v => Number.isFinite(Number(v));
const iso = v => { if (!v) return null; const ms=Date.parse(v); return Number.isFinite(ms)?new Date(ms).toISOString():null; };

export function normalizeHistorySample(input={}) {
  const instrument=getInstrument(input.symbol);
  const sample={
    eventId:String(input.eventId ?? '').trim(),
    eventType:String(input.eventType ?? '').trim().toUpperCase(),
    eventTimeUtc:iso(input.eventTimeUtc),
    symbol:String(input.symbol ?? '').trim(),
    assetClass:input.assetClass ?? instrument?.assetClass ?? null,
    window:String(input.window ?? '').trim(),
    before:finite(input.before)?Number(input.before):null,
    after:finite(input.after)?Number(input.after):null,
    high:finite(input.high)?Number(input.high):null,
    low:finite(input.low)?Number(input.low):null,
    surpriseZ:finite(input.surpriseZ)?Number(input.surpriseZ):null,
    centralBank:input.centralBank ?? null,
    speakerRole:input.speakerRole ?? null,
    session:input.session ?? null,
    volatilityRegime:input.volatilityRegime ?? null,
    trendRegime:input.trendRegime ?? null,
    speechStance:input.speechStance ?? null,
    sourceQuality:input.sourceQuality ?? 'UNKNOWN',
    features:Array.isArray(input.features)?input.features.map(f=>({name:String(f.name??''),value:f.value,observedAt:iso(f.observedAt)})):[]
  };
  return sample;
}

export function validateHistorySample(sample={}) {
  const errors=[];
  if (!sample.eventId) errors.push('eventId');
  if (!sample.eventType) errors.push('eventType');
  if (!sample.eventTimeUtc) errors.push('eventTimeUtc');
  if (!getInstrument(sample.symbol)) errors.push('symbol');
  if (!['fx','metal','digital'].includes(sample.assetClass)) errors.push('assetClass');
  if (!sample.window) errors.push('window');
  if (!finite(sample.before) || Number(sample.before)<=0) errors.push('before');
  if (!finite(sample.after) || Number(sample.after)<=0) errors.push('after');
  if (sample.high!=null && !finite(sample.high)) errors.push('high');
  if (sample.low!=null && !finite(sample.low)) errors.push('low');
  return {valid:errors.length===0,errors};
}
