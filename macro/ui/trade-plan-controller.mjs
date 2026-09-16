import { buildTradePlan } from '../events/trade-plan.mjs';
import { appendPlanSnapshot } from '../events/trade-plan-revisions.mjs';
import { renderTradePlanMarkup } from './trade-plan-view.mjs';

export function renderTradePlanInto(host, input) {
  if (!host) return null;
  const plan = buildTradePlan(input);
  host.innerHTML = renderTradePlanMarkup(plan);
  return plan;
}

export function renderAndRecordTradePlan(host, input, {
  history = [],
  createdAtUtc,
  reason = 'SYNC',
  sourceRevisionNumber = 0
} = {}) {
  if (!host) return { plan:null, history:history.map(r => ({...r})) };
  const basePlan = buildTradePlan({...input, revisions:history});
  const nextHistory = appendPlanSnapshot(history, {
    createdAtUtc,
    reason,
    sourceRevisionNumber,
    plan:basePlan
  });
  const plan = {...basePlan, revisions:nextHistory};
  host.innerHTML = renderTradePlanMarkup(plan);
  return { plan, history:nextHistory };
}

export function installPlanNavigation({button,host}) {
  if (!button || !host) return () => {};
  const show = () => host.scrollIntoView({behavior:'smooth',block:'start'});
  button.addEventListener('click', show);
  return () => button.removeEventListener('click', show);
}