function freezeJob(job) {
  return Object.freeze({ ...job });
}

export const PHASE2_SHADOW_JOBS = Object.freeze([
  freezeJob({ id:'price-health', every_seconds:60, event_type:'PRICE_HEALTH_CHECK', enabled:true, priority:10 }),
  freezeJob({ id:'timeframe-health', every_seconds:60, event_type:'TIMEFRAME_HEALTH_CHECK', enabled:true, priority:20 }),
  freezeJob({ id:'news-health', every_seconds:300, event_type:'NEWS_HEALTH_CHECK', enabled:true, priority:30 }),
  freezeJob({ id:'analysis-shadow', every_seconds:300, event_type:'ANALYSIS_SHADOW', enabled:true, priority:40 }),
  freezeJob({ id:'alert-router-shadow', every_seconds:300, event_type:'ALERT_ROUTER_SHADOW', enabled:true, priority:50 }),
  freezeJob({ id:'audit-snapshot', every_seconds:900, event_type:'AUDIT_SNAPSHOT', enabled:true, priority:60 }),
]);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function validTimestamp(value, name) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be a valid timestamp`);
  }
  return value;
}

function latestRunForJob(jobRuns, jobId) {
  let latest = null;
  let latestMs = -Infinity;
  for (const row of jobRuns) {
    requireObject(row, 'job run');
    if (typeof row.job_id !== 'string' || row.job_id.trim() === '') {
      throw new TypeError('job run.job_id is required');
    }
    const timestamp = validTimestamp(row.timestamp_utc, 'job run.timestamp_utc');
    if (row.job_id !== jobId) continue;
    const timestampMs = Date.parse(timestamp);
    if (timestampMs > latestMs) {
      latest = row;
      latestMs = timestampMs;
    }
  }
  return latest;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

export function buildOrchestrationHealth({ stateSnapshot, nowUtc } = {}) {
  requireObject(stateSnapshot, 'stateSnapshot');
  validTimestamp(nowUtc, 'nowUtc');

  const jobRuns = stateSnapshot.job_runs ?? [];
  const lastSlotByJob = stateSnapshot.last_slot_by_job ?? {};
  if (!Array.isArray(jobRuns)) throw new TypeError('stateSnapshot.job_runs must be an array');
  requireObject(lastSlotByJob, 'stateSnapshot.last_slot_by_job');

  const jobs = PHASE2_SHADOW_JOBS.map((job) => {
    const latest = latestRunForJob(jobRuns, job.id);
    const lastSlot = lastSlotByJob[job.id] ?? null;
    if (lastSlot !== null) validTimestamp(lastSlot, `stateSnapshot.last_slot_by_job.${job.id}`);

    return Object.freeze({
      job_id: job.id,
      status: latest ? String(latest.status ?? 'UNKNOWN').toUpperCase() : 'NEVER_RUN',
      last_run_utc: latest ? latest.timestamp_utc : null,
      last_slot_utc: lastSlot,
    });
  });

  return deepFreeze({
    mode: 'SHADOW',
    timestamp_utc: nowUtc,
    jobs,
  });
}
