export function classifyFeedStatus({ providerTimestamp, now = Date.now(), hasSnapshot = false, networkFailed = false }) {
  if (providerTimestamp) {
    const parsed = Date.parse(providerTimestamp);
    if (!Number.isFinite(parsed)) return 'INVALID_TIMESTAMP';
    const ageSec = (now - parsed) / 1000;
    if (ageSec <= 10) return 'STREAMING';
    if (ageSec <= 30) return 'DELAYED';
    return 'STALE';
  }
  if (hasSnapshot) return 'SNAPSHOT';
  return 'OFFLINE';
}
