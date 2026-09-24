import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersistentCache, cacheKey } from '../macro/core/persistent-cache.mjs';

function memoryStorage() {
  const map = new Map();
  return { getItem:k => map.get(k) ?? null, setItem:(k,v) => map.set(k,v), removeItem:k => map.delete(k), keys:() => [...map.keys()] };
}

test('cache keys isolate symbol timeframe and feed', () => {
  assert.equal(cacheKey({ feed:'ohlc', symbol:'XAUUSD', timeframe:'M5' }), 'helix:v1:ohlc:XAUUSD:M5');
  assert.notEqual(cacheKey({ feed:'ohlc', symbol:'XAUUSD', timeframe:'M5' }), cacheKey({ feed:'ohlc', symbol:'EURUSD', timeframe:'M5' }));
});

test('fresh persistent cache returns without refresh', async () => {
  const storage = memoryStorage();
  let calls = 0;
  const cache = createPersistentCache({ storage, now:() => 10_000 });
  cache.write('k', { value:7 }, { storedAt:9_000, ttlMs:5_000, source:'verified' });
  const out = await cache.getOrRefresh('k', async () => { calls++; return { value:8 }; });
  assert.equal(out.value.value, 7);
  assert.equal(out.status, 'fresh');
  assert.equal(calls, 0);
});

test('stale cache is returned immediately and refresh runs once in background', async () => {
  const storage = memoryStorage();
  let calls = 0;
  const cache = createPersistentCache({ storage, now:() => 20_000 });
  cache.write('k', { timestampUTC:'2026-09-24T01:00:00Z', value:7 }, { storedAt:1_000, ttlMs:5_000, source:'verified' });
  const first = await cache.getOrRefresh('k', async () => { calls++; return { timestampUTC:'2026-09-24T01:00:01Z', value:8 }; });
  const second = await cache.getOrRefresh('k', async () => { calls++; return { timestampUTC:'2026-09-24T01:00:02Z', value:9 }; });
  assert.equal(first.status, 'stale-refreshing');
  assert.equal(second.status, 'stale-refreshing');
  assert.equal(first.value.value, 7);
  await cache.whenIdle('k');
  assert.equal(calls, 1);
  assert.equal(cache.read('k').value.value, 8);
});

test('corrupt or expired-beyond-grace cache is discarded', () => {
  const storage = memoryStorage();
  const cache = createPersistentCache({ storage, now:() => 100_000, staleGraceMs:10_000 });
  storage.setItem('bad', '{nope');
  assert.equal(cache.read('bad'), null);
  cache.write('old', { value:1 }, { storedAt:1_000, ttlMs:1_000, source:'verified' });
  assert.equal(cache.read('old'), null);
});
