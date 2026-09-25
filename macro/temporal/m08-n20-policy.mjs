const MYT = 'Asia/Kuala_Lumpur';
const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function invariant(ok, message) {
  if (!ok) throw new TypeError(message);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validDateOnly(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function validateM08N20Policy(input) {
  invariant(input && typeof input === 'object', 'policy is required');
  invariant(typeof input.version === 'string' && input.version.trim(), 'policy version is required');
  invariant(input.timezone === MYT, `timezone must be ${MYT}`);
  invariant(Number.isInteger(input.sourceTimeframeMinutes) && input.sourceTimeframeMinutes > 0, 'sourceTimeframeMinutes must be a positive integer');
  invariant(input.anchors && HHMM.test(input.anchors.M08 ?? ''), 'M08 anchor must be HH:MM');
  invariant(input.anchors && HHMM.test(input.anchors.N20 ?? ''), 'N20 anchor must be HH:MM');
  invariant(Array.isArray(input.checkpoints) && input.checkpoints.length > 0 && input.checkpoints.every((v) => HHMM.test(v)), 'checkpoints must contain HH:MM values');
  invariant(input.retestTolerance && typeof input.retestTolerance === 'object', 'retestTolerance is required');
  invariant(['absolute', 'percent'].includes(input.retestTolerance.mode), 'retestTolerance mode must be absolute or percent');
  invariant(Number.isFinite(input.retestTolerance.value) && input.retestTolerance.value >= 0, 'retestTolerance value must be non-negative');
  invariant(Array.isArray(input.outcomeHorizonsMinutes) && input.outcomeHorizonsMinutes.length > 0 && input.outcomeHorizonsMinutes.every((v) => Number.isInteger(v) && v > 0), 'outcomeHorizonsMinutes must contain positive integers');

  return deepFreeze(structuredClone(input));
}

export function toMytParts(timestampUtc) {
  const date = new Date(timestampUtc);
  invariant(Number.isFinite(date.getTime()), 'timestamp must be valid ISO/Date input');
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const iso = shifted.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

export function resolveMytAnchorUtc(mytDate, hhmm) {
  invariant(validDateOnly(mytDate), 'MYT date must be a real YYYY-MM-DD date');
  invariant(HHMM.test(hhmm ?? ''), 'anchor time must be HH:MM');
  const [year, month, day] = mytDate.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0)).toISOString();
}

export const M08_N20_TIMEZONE = MYT;
