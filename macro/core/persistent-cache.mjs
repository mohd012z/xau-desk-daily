const PREFIX = 'helix:v1';

export function cacheKey({ feed, symbol = '_', timeframe = '_' }) {
  return [PREFIX, feed, symbol, timeframe].map(v => String(v).trim()).join(':');
}

export function createPersistentCache({ storage, now = () => Date.now(), staleGraceMs = 300000 } = {}) {
  if (!storage?.getItem || !storage?.setItem || !storage?.removeItem) throw new TypeError('storage adapter required');
  const inFlight = new Map();

  function write(key, value, { storedAt = now(), ttlMs = 5000, source = 'unknown' } = {}) {
    const envelope = { version:1, storedAt, ttlMs, source, value };
    storage.setItem(key, JSON.stringify(envelope));
    return envelope;
  }

  function parse(key) {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
      const env = JSON.parse(raw);
      if (!env || env.version !== 1 || !Number.isFinite(env.storedAt) || !Number.isFinite(env.ttlMs) || env.ttlMs < 0 || !('value' in env)) throw new Error('invalid');
      return env;
    } catch {
      storage.removeItem(key);
      return null;
    }
  }

  function read(key) {
    const env = parse(key);
    if (!env) return null;
    const age = Math.max(0, now() - env.storedAt);
    if (age > env.ttlMs + staleGraceMs) {
      storage.removeItem(key);
      return null;
    }
    return { ...env, ageMs:age, fresh:age <= env.ttlMs };
  }

  function refresh(key, fetcher, options = {}) {
    if (inFlight.has(key)) return inFlight.get(key);
    const task = Promise.resolve().then(fetcher).then(value => {
      write(key, value, { storedAt:now(), ttlMs:options.ttlMs ?? 5000, source:options.source ?? 'verified' });
      return value;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, task);
    return task;
  }

  async function getOrRefresh(key, fetcher, options = {}) {
    const cached = read(key);
    if (cached?.fresh) return { status:'fresh', value:cached.value, ageMs:cached.ageMs };
    if (cached) {
      refresh(key, fetcher, options).catch(() => {});
      return { status:'stale-refreshing', value:cached.value, ageMs:cached.ageMs };
    }
    const value = await refresh(key, fetcher, options);
    return { status:'refreshed', value, ageMs:0 };
  }

  function whenIdle(key) {
    return inFlight.get(key) ?? Promise.resolve();
  }

  return { write, read, getOrRefresh, whenIdle };
}
