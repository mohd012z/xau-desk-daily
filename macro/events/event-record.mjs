const SOURCE_PRIORITY = [
  ['officialScheduledAt', 'OFFICIAL_SCHEDULED', 'HIGH'],
  ['officialStatementAt', 'OFFICIAL_STATEMENT', 'HIGH'],
  ['providerEventAt', 'PROVIDER_EVENT', 'MEDIUM'],
  ['providerPublishedAt', 'PROVIDER_PUBLISHED', 'MEDIUM'],
  ['articlePublishedAt', 'ARTICLE_PUBLISHED', 'LOW'],
  ['receivedAt', 'RECEIVED', 'LOW']
];

export const TIME_SOURCES = Object.freeze(SOURCE_PRIORITY.map(([, source]) => source));

function validIso(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function resolveEventTime(input = {}) {
  for (const [field, timeSource, timeConfidence] of SOURCE_PRIORITY) {
    const eventTimeUtc = validIso(input[field]);
    if (eventTimeUtc) return { eventTimeUtc, timeSource, timeConfidence, timeField: field };
  }
  return { eventTimeUtc: null, timeSource: 'UNKNOWN', timeConfidence: 'UNKNOWN', timeField: null };
}

function stableHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function bucketMinute(iso) {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

export function createEventRecord(input = {}) {
  const time = resolveEventTime(input);
  const scheduled = Boolean(input.officialScheduledAt);
  const kind = input.kind ?? (scheduled ? 'scheduled' : 'unplanned');
  const title = String(input.title ?? '').trim();
  const source = String(input.source ?? 'Unknown').trim() || 'Unknown';
  const idBasis = [source.toLowerCase(), title.toLowerCase(), bucketMinute(time.eventTimeUtc)].join('|');
  return {
    id: input.id ?? `evt_${stableHash(idBasis)}`,
    kind,
    state: input.state ?? (kind === 'scheduled' ? 'UPCOMING' : 'DETECTED'),
    title,
    eventTimeUtc: time.eventTimeUtc,
    timeSource: time.timeSource,
    timeConfidence: time.timeConfidence,
    source,
    url: input.url ?? null,
    text: input.text ?? '',
    entities: Array.isArray(input.entities) ? [...input.entities] : [],
    affectedAssets: input.affectedAssets ?? { primary: [], secondary: [], context: [] },
    speech: input.speech ?? null,
    revisions: Array.isArray(input.revisions) ? [...input.revisions] : []
  };
}
