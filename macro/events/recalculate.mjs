function modelModeFor(event = {}) {
  return event?.kind === 'scheduled' && event?.state === 'UPCOMING' ? 'ADVANCE' : 'NOWCAST';
}

export function buildRecalculationRequest(event, marketContext = {}) {
  const revision = event?.revisions?.at?.(-1) ?? null;
  return {
    schemaVersion: '1.0',
    eventId: event?.id ?? null,
    revisionNumber: revision?.revisionNumber ?? 0,
    eventTimeUtc: event?.eventTimeUtc ?? null,
    eventState: event?.state ?? null,
    eventKind: event?.kind ?? null,
    modelMode: modelModeFor(event),
    affectedAssets: event?.affectedAssets ?? { primary: [], secondary: [], context: [] },
    contextType: event?.speech ? 'speech' : 'news',
    speech: event?.speech ?? null,
    marketContext,
    requestedAt: marketContext.requestedAt ?? null
  };
}

export function dispatchRecalculation(event, marketContext = {}, target = globalThis) {
  const detail = buildRecalculationRequest(event, marketContext);
  if (target?.dispatchEvent && typeof CustomEvent !== 'undefined') target.dispatchEvent(new CustomEvent('macrodesk:event-update', { detail }));
  return detail;
}
