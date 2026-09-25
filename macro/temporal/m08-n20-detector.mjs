import { resolveMytAnchorUtc, validateM08N20Policy } from './m08-n20-policy.mjs';

function freeze(v) { return Object.freeze(v); }
function fail(message) { throw new TypeError(message); }

function normalize(candles) {
  if (!Array.isArray(candles)) fail('candles must be an array');
  let last = -Infinity;
  const seen = new Map();
  return candles.map((c) => {
    const t = new Date(c.openUtc).getTime();
    if (!Number.isFinite(t)) fail('candle openUtc is invalid');
    for (const k of ['open','high','low','close']) if (!Number.isFinite(c[k])) fail(`candle ${k} is invalid`);
    if (c.high < Math.max(c.open, c.close, c.low) || c.low > Math.min(c.open, c.close, c.high)) fail('candle OHLC is inconsistent');
    const key = new Date(t).toISOString();
    const fingerprint = `${c.open}|${c.high}|${c.low}|${c.close}`;
    if (seen.has(key) && seen.get(key) !== fingerprint) fail('conflicting duplicate candle timestamp');
    if (t < last) fail('candles must be monotonic');
    seen.set(key, fingerprint); last = t;
    return { ...c, openUtc: key, _t: t };
  });
}

export function detectM08N20({ setupId, mytDate, candles, policy }) {
  if (!['M08','N20'].includes(setupId)) fail('setupId must be M08 or N20');
  const p = validateM08N20Policy(policy);
  const rows = normalize(candles);
  const anchorUtc = resolveMytAnchorUtc(mytDate, p.anchors[setupId]);
  const anchorMs = new Date(anchorUtc).getTime();
  const ref = rows.find((c) => c._t === anchorMs);
  if (!ref) return freeze({ id: `${mytDate}:${setupId}`, setupId, mytDate, anchorUtc, state: 'UNRESOLVED', reason: 'REFERENCE_MISSING' });

  const duration = p.sourceTimeframeMinutes * 60_000;
  let wickUp = false, wickDown = false;
  let confirmed = null;
  for (const c of rows) {
    if (c._t <= ref._t) continue;
    if (c._t < ref._t + duration) continue;
    wickUp ||= c.high > ref.high;
    wickDown ||= c.low < ref.low;
    if (c.close > ref.high) { confirmed = { state: 'UP', c }; break; }
    if (c.close < ref.low) { confirmed = { state: 'DOWN', c }; break; }
  }

  let state = 'WAIT', reason = 'INSIDE_REFERENCE_RANGE', observedUtc = null;
  if (confirmed) { state = confirmed.state; reason = 'CLOSE_CONFIRMED'; observedUtc = confirmed.c.openUtc; }
  else if (wickUp && !wickDown) { state = 'FALSE_BREAK_UP'; reason = 'WICK_ONLY'; }
  else if (wickDown && !wickUp) { state = 'FALSE_BREAK_DOWN'; reason = 'WICK_ONLY'; }
  else if (wickUp || wickDown) { state = 'UNRESOLVED'; reason = 'TWO_SIDED_EXCURSION'; }

  return freeze({
    id: `${mytDate}:${setupId}`,
    setupId, mytDate, anchorUtc, state, reason, observedUtc,
    reference: freeze({ openUtc: ref.openUtc, open: ref.open, high: ref.high, low: ref.low, close: ref.close }),
  });
}
