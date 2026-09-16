import { formatMyt } from '../core/time-myt.mjs';
export function appendPlanRevision(existing=[],revision={}){
 const copy=existing.map(r=>({...r})); const createdAtUtc=revision.createdAtUtc||new Date().toISOString();
 copy.push({...revision,createdAtUtc,createdAtMyt:formatMyt(createdAtUtc)}); return copy;
}