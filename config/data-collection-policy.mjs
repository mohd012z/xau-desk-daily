const LIVE_VISIBLE_MS = 5000;
const LIVE_BACKGROUND_MS = 15000;
const SNAPSHOT_MS = 60000;
const MAX_BACKOFF_MS = 120000;

export function nextRefreshDelay({ mode = 'snapshot', visible = true, failures = 0, rateLimited = false } = {}) {
  if (rateLimited) return 60000;
  const base = mode === 'live' ? (visible ? LIVE_VISIBLE_MS : LIVE_BACKGROUND_MS) : SNAPSHOT_MS;
  const multiplier = 2 ** Math.max(0, Math.min(Number(failures) || 0, 4));
  return Math.min(base * multiplier, MAX_BACKOFF_MS);
}

export function freshnessState({ ageMs, maxFreshMs }) {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'FEED_DISCONNECTED';
  if (!Number.isFinite(maxFreshMs) || maxFreshMs <= 0) return 'INSUFFICIENT_DATA';
  return ageMs <= maxFreshMs ? 'LIVE' : 'STALE_DATA';
}

export function monotonicProgress(previous = 0, candidate = 0) {
  const safePrevious = Math.max(0, Math.min(100, Number(previous) || 0));
  const safeCandidate = Math.max(0, Math.min(100, Number(candidate) || 0));
  return Math.max(safePrevious, safeCandidate);
}

export function shouldApplySample(current, incoming) {
  if (!incoming || !incoming.timestampUTC) return false;
  if (!current || !current.timestampUTC) return true;
  const incomingTime = Date.parse(incoming.timestampUTC);
  const currentTime = Date.parse(current.timestampUTC);
  if (!Number.isFinite(incomingTime)) return false;
  if (!Number.isFinite(currentTime)) return true;
  if (incomingTime > currentTime) return true;
  if (incomingTime < currentTime) return false;
  const incomingSequence = Number(incoming.sequence);
  const currentSequence = Number(current.sequence);
  if (Number.isFinite(incomingSequence) && Number.isFinite(currentSequence)) return incomingSequence > currentSequence;
  return false;
}

export function collectionTimeline({ historyReady = false, liveConnected = false, stale = false, offline = false } = {}) {
  if (offline) return { state:'OFFLINE', progress: historyReady ? 75 : 10 };
  if (!historyReady) return { state:'LOADING_HISTORY', progress:35 };
  if (!liveConnected) return { state:'CONNECTING_LIVE', progress:75 };
  if (stale) return { state:'STALE_DATA', progress:90 };
  return { state:'LIVE', progress:100 };
}
