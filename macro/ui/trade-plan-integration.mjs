const ALLOWED_FEEDS = new Set(['STREAMING','DELAYED','STALE','SNAPSHOT','OFFLINE','MARKET CLOSED']);

export function normalizeMarketFeedState(value) {
  const text = String(value ?? '').toUpperCase().trim();
  if (text.includes('SNAPSHOT')) return 'SNAPSHOT';
  if (ALLOWED_FEEDS.has(text)) return text;
  return 'UNKNOWN';
}

function uniqueAffected(affected = {}) {
  return [...new Set([
    ...(affected.currencies ?? []),
    ...(affected.primary ?? []),
    ...(affected.secondary ?? []),
    ...(affected.context ?? [])
  ].filter(Boolean))];
}

function modelStateFor(event, override) {
  if (override) return override;
  const state = String(event?.state ?? '').toUpperCase();
  if (['TRIGGERED','LIVE','SETTLING'].includes(state)) return 'LIVE REACTION';
  if (state === 'CLOSED') return 'CLOSED';
  return 'ADVANCE';
}

function safeOverrides(value = {}) {
  const copy = {...value};
  for (const key of ['entry','stopLoss','takeProfit','buy','sell']) delete copy[key];
  return copy;
}

function pressureFromMedian(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'MIXED';
  return n > 0 ? 'UP_PRESSURE' : 'DOWN_PRESSURE';
}

export function mergeAdvanceModelOverrides(model = {}, existing = {}) {
  const safe = safeOverrides(existing);
  if (!['READY','LOW_SAMPLE'].includes(String(model.state ?? '').toUpperCase())) {
    return {
      ...safe,
      pressure: safe.pressure ?? 'MIXED',
      historical: null,
      effectiveSampleSize: 0
    };
  }
  const d = model.distribution ?? {};
  const pb = model.priceBand ?? {};
  const band = Number.isFinite(Number(pb.p25)) && Number.isFinite(Number(pb.p75)) ? [Number(pb.p25), Number(pb.p75)] : null;
  return {
    ...safe,
    pressure: safe.pressure ?? pressureFromMedian(model.signedMedian ?? d.p50),
    historical: {
      n: Number(model.comparableCount ?? 0),
      median: Number.isFinite(Number(d.p50)) ? Number(d.p50) : null,
      p10: Number.isFinite(Number(d.p10)) ? Number(d.p10) : null,
      p25: Number.isFinite(Number(d.p25)) ? Number(d.p25) : null,
      p75: Number.isFinite(Number(d.p75)) ? Number(d.p75) : null,
      p90: Number.isFinite(Number(d.p90)) ? Number(d.p90) : null
    },
    effectiveSampleSize: Number.isFinite(Number(model.effectiveN)) ? Number(model.effectiveN) : 0,
    priceBand: band ?? safe.priceBand ?? null
  };
}

export function buildTradePlanInput({
  event,
  marketFeedState = 'UNKNOWN',
  overrides = {},
  nowUtc = new Date().toISOString()
} = {}) {
  if (!event?.eventTimeUtc) return null;

  return {
    eventId: event.id ?? null,
    eventName: event.title ?? 'Event',
    eventTimeUtc: event.eventTimeUtc,
    nowUtc,
    modelState: modelStateFor(event, overrides.modelState),
    timeSource: event.timeSource ?? 'UNKNOWN',
    timeConfidence: event.timeConfidence ?? 'LOW',
    affectedAssets: uniqueAffected(event.affectedAssets),
    pressure: overrides.pressure ?? 'MIXED',
    observed: overrides.observed ?? 'NOT_YET_MEASURED',
    historical: overrides.historical ?? null,
    effectiveSampleSize: overrides.effectiveSampleSize ?? 0,
    feedState: normalizeMarketFeedState(marketFeedState),
    modelAgreement: overrides.modelAgreement ?? 'UNKNOWN',
    prices: overrides.prices ?? null,
    priceBand: overrides.priceBand ?? null,
    atrContext: overrides.atrContext ?? null,
    pivotContext: overrides.pivotContext ?? null,
    revisions: event.revisions ?? []
  };
}
