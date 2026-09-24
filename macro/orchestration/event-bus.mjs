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

function cloneSerializable(value, name='value') {
  try {
    return structuredClone(value);
  } catch {
    throw new TypeError(`${name} must be cloneable`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function normalizeEvent(input) {
  requireObject(input, 'event');
  const cloned = cloneSerializable(input, 'event');
  cloned.event_id = requiredText(cloned.event_id, 'event.event_id');
  cloned.type = requiredText(cloned.type, 'event.type').toUpperCase();
  if (cloned.payload === undefined) cloned.payload = {};
  if (!cloned.payload || typeof cloned.payload !== 'object' || Array.isArray(cloned.payload)) {
    throw new TypeError('event.payload must be an object');
  }
  return deepFreeze(cloned);
}

export function createEventBus(seed = {}) {
  requireObject(seed, 'seed');
  const pendingSeed = seed.pending ?? [];
  const seenSeed = seed.seen_event_ids ?? [];
  if (!Array.isArray(pendingSeed)) throw new TypeError('seed.pending must be an array');
  if (!Array.isArray(seenSeed)) throw new TypeError('seed.seen_event_ids must be an array');

  const queue = [];
  const seenEventIds = new Set();

  for (const rawId of seenSeed) {
    seenEventIds.add(requiredText(rawId, 'seed.seen_event_ids item'));
  }
  for (const rawEvent of pendingSeed) {
    const normalized = normalizeEvent(rawEvent);
    queue.push(normalized);
    seenEventIds.add(normalized.event_id);
  }

  function publish(rawEvent) {
    const event = normalizeEvent(rawEvent);
    if (seenEventIds.has(event.event_id)) return false;
    seenEventIds.add(event.event_id);
    queue.push(event);
    return true;
  }

  function next() {
    return queue.length ? queue.shift() : null;
  }

  function hasPending() {
    return queue.length > 0;
  }

  function snapshot() {
    const result = {
      pending: queue.map((event) => cloneSerializable(event)),
      seen_event_ids: [...seenEventIds],
    };
    return deepFreeze(result);
  }

  return Object.freeze({ publish, next, hasPending, snapshot });
}
