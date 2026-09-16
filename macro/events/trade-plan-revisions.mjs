import { formatMyt } from '../core/time-myt.mjs';

export function appendPlanRevision(existing = [], revision = {}) {
  const copy = existing.map(r => ({...r}));
  if (!revision.createdAtUtc) throw new TypeError('createdAtUtc is required');
  const createdAtUtc = revision.createdAtUtc;
  const createdMs = new Date(createdAtUtc).getTime();
  const createdAtMyt = formatMyt(createdAtUtc);
  const last = copy.at(-1)?.createdAtUtc;
  const lastMs = last ? new Date(last).getTime() : null;
  if (last && !Number.isFinite(lastMs)) throw new TypeError('Invalid existing revision timestamp');
  if (Number.isFinite(lastMs) && createdMs < lastMs) throw new RangeError('Trade plan revisions must be chronological');
  copy.push({...revision, createdAtUtc, createdAtMyt});
  return copy;
}

function clonePivotContext(value) {
  if (!value) return null;
  return {
    timeframe: value.timeframe ?? null,
    source: value.source ?? null,
    levels: value.levels ? {...value.levels} : null
  };
}

function snapshotOf(plan = {}, sourceRevisionNumber = 0, reason = 'UPDATE') {
  const snapshot = {
    eventId: plan.eventId ?? null,
    eventName: plan.eventName ?? null,
    eventTimeUtc: plan.eventTimeUtc ?? null,
    eventTimeMyt: plan.eventTimeMyt ?? null,
    timeSource: plan.timeSource ?? 'UNKNOWN',
    timeConfidence: plan.timeConfidence ?? 'LOW',
    affectedAssets: [...(plan.affectedAssets ?? [])],
    sourceRevisionNumber: Number.isFinite(Number(sourceRevisionNumber)) ? Number(sourceRevisionNumber) : 0,
    reason,
    modelState: plan.modelState ?? 'ADVANCE',
    pressure: plan.pressure ?? 'MIXED',
    observed: plan.observed ?? 'NOT_YET_MEASURED',
    confirmation: plan.confirmation ?? 'PENDING',
    quality: plan.quality ? { label:plan.quality.label ?? 'LOW', reasons:[...(plan.quality.reasons ?? [])] } : null,
    historical: plan.historical ? {...plan.historical} : null,
    prices: plan.prices ? {...plan.prices} : null,
    priceBand: Array.isArray(plan.priceBand) ? [...plan.priceBand] : null,
    atrContext: plan.atrContext ? {...plan.atrContext} : null,
    pivotContext: clonePivotContext(plan.pivotContext),
    pivotConfluence: plan.pivotConfluence ? {
      status: plan.pivotConfluence.status ?? 'INSUFFICIENT_DATA',
      level: plan.pivotConfluence.level ?? null,
      price: plan.pivotConfluence.price ?? null
    } : null
  };
  snapshot.signature = JSON.stringify([
    snapshot.eventId, snapshot.eventTimeUtc, snapshot.timeSource, snapshot.timeConfidence,
    snapshot.affectedAssets, snapshot.sourceRevisionNumber, snapshot.modelState,
    snapshot.pressure, snapshot.observed, snapshot.confirmation,
    snapshot.quality?.label, snapshot.quality?.reasons,
    snapshot.historical, snapshot.prices, snapshot.priceBand, snapshot.atrContext,
    snapshot.pivotContext, snapshot.pivotConfluence
  ]);
  return snapshot;
}

export function appendPlanSnapshot(existing = [], { createdAtUtc, reason = 'UPDATE', sourceRevisionNumber = 0, plan = {} } = {}) {
  // Validate timestamp even when the state would deduplicate.
  formatMyt(createdAtUtc);
  const snapshot = snapshotOf(plan, sourceRevisionNumber, reason);
  const last = existing.at(-1);
  if (last?.signature === snapshot.signature) return existing.map(r => ({...r}));
  return appendPlanRevision(existing, {...snapshot, createdAtUtc});
}