export function topicKey({ feed, symbol = '_', timeframe = '_' }) {
  return [feed, symbol, timeframe].map(v => String(v).trim()).join(':');
}

export function createDirtyStateBus({
  schedule = fn => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : queueMicrotask(fn)),
  fingerprint = value => {
    if (value == null || typeof value !== 'object') return String(value);
    return JSON.stringify(value);
  }
} = {}) {
  const listeners = new Map();
  const pending = new Map();
  const lastFingerprints = new Map();
  let scheduled = false;

  function subscribe(topic, listener) {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function');
    if (!listeners.has(topic)) listeners.set(topic, new Set());
    listeners.get(topic).add(listener);
    return () => {
      const set = listeners.get(topic);
      if (!set) return;
      set.delete(listener);
      if (set.size === 0) listeners.delete(topic);
    };
  }

  function flush() {
    scheduled = false;
    const batch = [...pending.entries()];
    pending.clear();
    for (const [topic, value] of batch) {
      const fp = fingerprint(value);
      if (lastFingerprints.get(topic) === fp) continue;
      lastFingerprints.set(topic, fp);
      for (const listener of listeners.get(topic) ?? []) listener(value, topic);
    }
  }

  function publish(topic, value) {
    pending.set(topic, value);
    if (!scheduled) {
      scheduled = true;
      schedule(flush);
    }
  }

  function listenerCount(topic) {
    return listeners.get(topic)?.size ?? 0;
  }

  function clear(topic) {
    if (topic === undefined) {
      listeners.clear(); pending.clear(); lastFingerprints.clear();
      return;
    }
    listeners.delete(topic); pending.delete(topic); lastFingerprints.delete(topic);
  }

  return { subscribe, publish, listenerCount, clear, flush };
}
