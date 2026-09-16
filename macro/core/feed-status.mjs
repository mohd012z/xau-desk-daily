export function classifyFeedStatus({ providerTimestamp, now = Date.now(), hasSnapshot = false, networkFailed = false }) {
  if (providerTimestamp) {
    const ageSec = (now - Date.parse(providerTimestamp)) / 1000;
    if (ageSec <= 10) return 'STREAMING';
    if (ageSec <= 30) return 'DELAYED';
    return 'STALE';
  }
  if (hasSnapshot) return 'SNAPSHOT';
  return networkFailed ? 'OFFLINE' : 'OFFLINE';
}
