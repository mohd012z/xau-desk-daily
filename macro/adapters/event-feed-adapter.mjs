function toIso(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+UTC$/i);
  if (m) return `${m[1]}T${m[2]}:00.000Z`;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function ingestSnapshotEvents(snapshot = {}) {
  const receivedAt = toIso(snapshot?.meta?.generatedAt) ?? null;
  const candidates = [];
  for (const item of snapshot.news ?? []) {
    candidates.push({ title: item.title ?? '', text: item.summary ?? '', source: item.source ?? 'News', url: item.url ?? null, articlePublishedAt: toIso(item.time), receivedAt, sourceType: 'provider', kind: 'unplanned', isSpeech: false });
  }
  for (const item of snapshot.speakers ?? []) {
    candidates.push({ title: item.name ?? item.title ?? 'Central-bank communication', text: item.quote ?? item.impact ?? '', source: item.source ?? 'Official', url: item.url ?? null, receivedAt, sourceType: 'official', kind: 'unplanned', isSpeech: true, speechMode: item.mode ?? 'prepared_remarks', entities: [item.role ?? ''] });
  }
  for (const item of snapshot.calendar ?? []) {
    const scheduled = toIso(item.eventTimeUtc ?? item.utc ?? item.time ?? item.dateTime);
    candidates.push({ title: item.title ?? item.name ?? item.event ?? 'Scheduled event', text: item.summary ?? item.note ?? '', source: item.source ?? 'Calendar', url: item.url ?? null, officialScheduledAt: scheduled, receivedAt, sourceType: item.official ? 'official' : 'provider', kind: 'scheduled', isSpeech: Boolean(item.isSpeech), speechMode: item.speechMode ?? null, entities: item.entities ?? [] });
  }
  return candidates;
}

export function ingestGatewayPayload(payload = {}) {
  const receivedAt = toIso(payload.receivedAt) ?? new Date().toISOString();
  return (payload.events ?? []).map(item => ({ ...item, providerEventAt: toIso(item.providerEventAt ?? item.eventTimeUtc), providerPublishedAt: toIso(item.providerPublishedAt ?? item.publishedAt), officialScheduledAt: toIso(item.officialScheduledAt), officialStatementAt: toIso(item.officialStatementAt), receivedAt: toIso(item.receivedAt) ?? receivedAt, sourceType: item.sourceType ?? 'provider' }));
}

export function startGatewayPolling({ url, intervalMs = 60000, onUpdate = () => {}, onError = () => {}, fetchImpl = globalThis.fetch } = {}) {
  if (!url || typeof fetchImpl !== 'function') return { active: false, poll: async () => null, stop() {} };
  let timer = null;
  let stopped = false;
  const poll = async () => {
    if (stopped) return null;
    try {
      const response = await fetchImpl(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`gateway ${response.status}`);
      const payload = await response.json();
      const candidates = ingestGatewayPayload(payload);
      onUpdate(candidates, payload);
      return candidates;
    } catch (error) {
      onError(error);
      return null;
    }
  };
  poll();
  timer = setInterval(poll, Math.max(5000, intervalMs));
  return { active: true, poll, stop() { stopped = true; if (timer) clearInterval(timer); } };
}
