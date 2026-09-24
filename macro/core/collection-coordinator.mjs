import { shouldApplySample } from '../../config/data-collection-policy.mjs';

function byteSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function createCollectionCoordinator({ ttlMs = 5000, maxPayloadBytes = 512 * 1024, now = () => Date.now() } = {}) {
  const cache = new Map();
  const inFlight = new Map();

  function seed(key, value, storedAt = now()) {
    cache.set(key, { value, storedAt });
  }

  function peek(key) {
    return cache.get(key)?.value;
  }

  async function collect(key, fetcher, { force = false } = {}) {
    const cached = cache.get(key);
    if (!force && cached && now() - cached.storedAt < ttlMs) return cached.value;
    if (inFlight.has(key)) return inFlight.get(key);

    const task = Promise.resolve()
      .then(fetcher)
      .then(incoming => {
        if (byteSize(incoming) > maxPayloadBytes) throw new RangeError('payload too large');
        const current = cache.get(key)?.value;
        if (!current || shouldApplySample(current, incoming)) cache.set(key, { value: incoming, storedAt: now() });
        return cache.get(key)?.value ?? incoming;
      })
      .finally(() => inFlight.delete(key));

    inFlight.set(key, task);
    return task;
  }

  function invalidate(key) {
    cache.delete(key);
  }

  function clear() {
    cache.clear();
  }

  return { collect, seed, peek, invalidate, clear };
}
