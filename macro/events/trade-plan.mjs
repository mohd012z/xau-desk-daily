import { formatMyt, countdownTo } from '../core/time-myt.mjs';
import { assessPlanQuality } from '../core/plan-quality.mjs';

const PRESSURE=new Set(['UP_PRESSURE','DOWN_PRESSURE','MIXED']);
const OBSERVED=new Set(['UP','DOWN','MIXED','NOT_YET_MEASURED']);

function confirmation(pressure, observed) {
  if (observed === 'NOT_YET_MEASURED') return 'PENDING';
  if (pressure === 'MIXED' || observed === 'MIXED') return 'PARTIAL';
  if (pressure === 'UP_PRESSURE') return observed === 'UP' ? 'CONFIRMED' : 'DIVERGENCE';
  if (pressure === 'DOWN_PRESSURE') return observed === 'DOWN' ? 'CONFIRMED' : 'DIVERGENCE';
  return 'PENDING';
}

export function buildTradePlan(input={}) {
  const pressure=PRESSURE.has(input.pressure) ? input.pressure : 'MIXED';
  const observed=OBSERVED.has(input.observed) ? input.observed : 'NOT_YET_MEASURED';
  return {
    eventId:input.eventId ?? null,
    eventName:input.eventName ?? 'Event',
    eventTimeUtc:input.eventTimeUtc,
    eventTimeMyt:formatMyt(input.eventTimeUtc),
    countdown:countdownTo(input.eventTimeUtc,input.nowUtc),
    modelState:input.modelState ?? 'ADVANCE',
    timeSource:input.timeSource ?? 'UNKNOWN',
    timeConfidence:input.timeConfidence ?? 'LOW',
    affectedAssets:[...(input.affectedAssets || [])],
    pressure,
    observed,
    confirmation:confirmation(pressure,observed),
    historical:input.historical ? {...input.historical} : null,
    prices:input.prices ? {...input.prices} : null,
    quality:assessPlanQuality(input),
    revisions:(input.revisions || []).map(r=>({...r}))
  };
}