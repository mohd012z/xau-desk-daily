const SENSITIVE_KEYS = new Set([
  'apikey', 'token', 'accesstoken', 'githubtoken', 'telegramtoken', 'bottoken',
  'secret', 'signingsecret', 'password', 'credential', 'credentials', 'privatekey',
]);

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function validateJsonSafe(value, path='value') {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must be JSON-serializable`);
    return;
  }
  if (type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint') {
    throw new TypeError(`${path} must be JSON-serializable`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonSafe(item, `${path}[${index}]`));
    return;
  }
  if (type === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError(`${path} must contain plain JSON-serializable objects`);
    }
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(normalizedKey(key))) {
        throw new TypeError(`${path}.${key} contains sensitive credential data`);
      }
      validateJsonSafe(item, `${path}.${key}`);
    }
    return;
  }
  throw new TypeError(`${path} must be JSON-serializable`);
}

function cloneJson(value, path='value') {
  validateJsonSafe(value, path);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function requiredText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} is required`);
  return value.trim();
}

function validTimestamp(value, name) {
  const text = requiredText(value, name);
  if (!Number.isFinite(Date.parse(text))) throw new TypeError(`${name} must be a valid timestamp`);
  return text;
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function normalizeSeed(seed) {
  requireObject(seed, 'seed');
  if (seed.version !== undefined && seed.version !== 1) throw new TypeError('seed.version must be 1');
  const normalized = {
    version: 1,
    last_slot_by_job: cloneJson(seed.last_slot_by_job ?? {}, 'seed.last_slot_by_job'),
    job_runs: cloneJson(seed.job_runs ?? [], 'seed.job_runs'),
    bot_runs: cloneJson(seed.bot_runs ?? [], 'seed.bot_runs'),
    delivery_intents: cloneJson(seed.delivery_intents ?? [], 'seed.delivery_intents'),
  };
  requireObject(normalized.last_slot_by_job, 'seed.last_slot_by_job');
  for (const key of ['job_runs', 'bot_runs', 'delivery_intents']) {
    if (!Array.isArray(normalized[key])) throw new TypeError(`seed.${key} must be an array`);
  }
  for (const [jobId, timestamp] of Object.entries(normalized.last_slot_by_job)) {
    requiredText(jobId, 'seed.last_slot_by_job key');
    validTimestamp(timestamp, `seed.last_slot_by_job.${jobId}`);
  }
  return normalized;
}

export function createShadowState(seed = {}) {
  const data = normalizeSeed(seed);

  function lastSlotByJob() {
    return deepFreeze(cloneJson(data.last_slot_by_job, 'last_slot_by_job'));
  }

  function recordJobSlot(input) {
    requireObject(input, 'job slot');
    const row = cloneJson(input, 'job slot');
    row.job_id = requiredText(row.job_id, 'job slot.job_id');
    row.scheduled_for_utc = validTimestamp(row.scheduled_for_utc, 'job slot.scheduled_for_utc');
    row.timestamp_utc = validTimestamp(row.timestamp_utc, 'job slot.timestamp_utc');
    row.status = requiredText(row.status, 'job slot.status').toUpperCase();
    data.last_slot_by_job[row.job_id] = row.scheduled_for_utc;
    data.job_runs.push(row);
    return deepFreeze(cloneJson(row, 'job slot'));
  }

  function recordBotRun(input) {
    requireObject(input, 'bot run');
    const botId = requiredText(input.bot_id, 'bot run.bot_id');
    const eventId = requiredText(input.event_id, 'bot run.event_id');
    const status = requiredText(input.status, 'bot run.status').toUpperCase();
    const timestampUtc = validTimestamp(input.timestamp_utc, 'bot run.timestamp_utc');

    let row;
    if (status === 'FAILED') {
      row = {
        bot_id: botId,
        event_id: eventId,
        status: 'FAILED',
        error_name: requiredText(input.error_name ?? 'Error', 'bot run.error_name'),
        error_message: requiredText(input.error_message ?? 'Unknown failure', 'bot run.error_message'),
        timestamp_utc: timestampUtc,
      };
    } else {
      row = cloneJson(input, 'bot run');
      delete row.error;
      row.bot_id = botId;
      row.event_id = eventId;
      row.status = status;
      row.timestamp_utc = timestampUtc;
    }

    const safeRow = cloneJson(row, 'bot run');
    data.bot_runs.push(safeRow);
    return deepFreeze(cloneJson(safeRow, 'bot run'));
  }

  function recordDeliveryIntent(input) {
    requireObject(input, 'delivery intent');
    const row = cloneJson(input, 'delivery intent');
    row.intent_id = requiredText(row.intent_id, 'delivery intent.intent_id');
    row.channel = requiredText(row.channel, 'delivery intent.channel').toUpperCase();
    row.event_id = requiredText(row.event_id, 'delivery intent.event_id');
    row.timestamp_utc = validTimestamp(row.timestamp_utc, 'delivery intent.timestamp_utc');
    data.delivery_intents.push(row);
    return deepFreeze(cloneJson(row, 'delivery intent'));
  }

  function snapshot() {
    return deepFreeze(cloneJson(data, 'state'));
  }

  return Object.freeze({ lastSlotByJob, recordJobSlot, recordBotRun, recordDeliveryIntent, snapshot });
}
