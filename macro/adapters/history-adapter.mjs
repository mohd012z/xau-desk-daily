import { normalizeHistorySample, validateHistorySample } from '../history/history-schema.mjs';

export function normalizeHistoryPayload(payload = {}) {
  const rows = Array.isArray(payload.samples) ? payload.samples : [];
  const samples = [];
  let rejectedCount = 0;
  for (const row of rows) {
    const sample = normalizeHistorySample(row);
    if (validateHistorySample(sample).valid) samples.push(sample);
    else rejectedCount += 1;
  }
  return {
    schemaVersion: String(payload.schemaVersion ?? '1.0'),
    generatedAt: payload.generatedAt ?? null,
    samples,
    rejectedCount,
    status: samples.length ? 'READY' : 'EMPTY'
  };
}

export async function loadHistory({ url = './data/event-history.json', fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    return { schemaVersion:'1.0', generatedAt:null, samples:[], rejectedCount:0, status:'UNAVAILABLE', httpStatus:null };
  }
  try {
    const response = await fetchImpl(url, { cache:'no-store' });
    if (!response?.ok) {
      return { schemaVersion:'1.0', generatedAt:null, samples:[], rejectedCount:0, status:'UNAVAILABLE', httpStatus:response?.status ?? null };
    }
    const normalized = normalizeHistoryPayload(await response.json());
    return { ...normalized, httpStatus:response.status ?? 200 };
  } catch (error) {
    return { schemaVersion:'1.0', generatedAt:null, samples:[], rejectedCount:0, status:'UNAVAILABLE', httpStatus:null, error:String(error?.message ?? error) };
  }
}
