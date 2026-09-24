function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function requiredText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} is required`);
  }
  return value.trim();
}

function canonicalUpper(value, name) {
  return requiredText(value, name).toUpperCase();
}

function validTimestamp(value, name) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be a valid timestamp`);
  }
  return value;
}

function slotUtc(nowMs, intervalMs) {
  return new Date(Math.floor(nowMs / intervalMs) * intervalMs).toISOString();
}

function stableEventId(job, scheduledForUtc) {
  return `cron:${job.id}:${scheduledForUtc}`;
}

export function normalizeJobs(jobs) {
  if (!Array.isArray(jobs)) throw new TypeError('jobs must be an array');

  const seen = new Set();
  const normalized = jobs.map((raw, index) => {
    requireObject(raw, `jobs[${index}]`);
    const id = requiredText(raw.id, `jobs[${index}].id`);
    if (seen.has(id)) throw new TypeError(`duplicate job id: ${id}`);
    seen.add(id);

    if (!Number.isFinite(raw.every_seconds) || raw.every_seconds <= 0) {
      throw new TypeError(`jobs[${index}].every_seconds must be a positive finite number`);
    }
    if (!Number.isInteger(raw.every_seconds)) {
      throw new TypeError(`jobs[${index}].every_seconds must be an integer`);
    }

    const priority = raw.priority ?? 100;
    if (!Number.isFinite(priority)) {
      throw new TypeError(`jobs[${index}].priority must be finite`);
    }

    return Object.freeze({
      id,
      every_seconds: raw.every_seconds,
      event_type: canonicalUpper(raw.event_type, `jobs[${index}].event_type`),
      enabled: raw.enabled !== false,
      priority,
    });
  });

  return Object.freeze(normalized);
}

export function dueScheduleEvents({ jobs, nowUtc, lastSlotByJob = {} } = {}) {
  validTimestamp(nowUtc, 'nowUtc');
  requireObject(lastSlotByJob, 'lastSlotByJob');

  const normalizedJobs = normalizeJobs(jobs);
  const nowMs = Date.parse(nowUtc);
  const events = [];

  for (const job of normalizedJobs) {
    if (!job.enabled) continue;

    const intervalMs = job.every_seconds * 1000;
    const scheduledForUtc = slotUtc(nowMs, intervalMs);
    const lastSlot = lastSlotByJob[job.id];

    if (lastSlot !== undefined) {
      validTimestamp(lastSlot, `lastSlotByJob.${job.id}`);
      const lastMs = Date.parse(lastSlot);
      const scheduledMs = Date.parse(scheduledForUtc);
      if (lastMs > scheduledMs) {
        throw new RangeError(`last slot for ${job.id} is in the future; possible clock rollback`);
      }
      if (lastMs === scheduledMs) continue;
    }

    const payload = Object.freeze({});
    events.push(Object.freeze({
      event_id: stableEventId(job, scheduledForUtc),
      type: job.event_type,
      job_id: job.id,
      scheduled_for_utc: scheduledForUtc,
      priority: job.priority,
      payload,
    }));
  }

  events.sort((a, b) => a.priority - b.priority || a.job_id.localeCompare(b.job_id));
  return Object.freeze(events);
}
