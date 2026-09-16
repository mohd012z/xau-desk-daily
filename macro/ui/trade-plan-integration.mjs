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