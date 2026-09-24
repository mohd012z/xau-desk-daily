import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollectionCoordinator } from '../macro/core/collection-coordinator.mjs';

test('concurrent identical requests share one fetch', async () => {
  let calls = 0;
  const coordinator = createCollectionCoordinator();
  const fetcher = async () => { calls += 1; await new Promise(r => setTimeout(r, 5)); return { timestampUTC:'2026-09-24T01:00:00Z', value:1 }; };
  const [a,b] = await Promise.all([
    coordinator.collect('XAUUSD:M5', fetcher),
    coordinator.collect('XAUUSD:M5', fetcher)
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
});

test('fresh cache bypasses network usage', async () => {
  let calls = 0;
  const coordinator = createCollectionCoordinator({ ttlMs:10000, now:() => 1000 });
  coordinator.seed('XAUUSD:M5', { timestampUTC:'2026-09-24T01:00:00Z', value:7 }, 500);
  const value = await coordinator.collect('XAUUSD:M5', async () => { calls += 1; return { value:8 }; });
  assert.equal(calls, 0);
  assert.equal(value.value, 7);
});

test('late older response cannot replace newer state', async () => {
  const coordinator = createCollectionCoordinator({ ttlMs:0 });
  coordinator.seed('XAUUSD:M5', { timestampUTC:'2026-09-24T01:00:05Z', value:5 }, 0);
  await coordinator.collect('XAUUSD:M5', async () => ({ timestampUTC:'2026-09-24T01:00:04Z', value:4 }), { force:true });
  assert.equal(coordinator.peek('XAUUSD:M5').value, 5);
});

test('payload guard rejects oversized collection results', async () => {
  const coordinator = createCollectionCoordinator({ maxPayloadBytes:64, ttlMs:0 });
  await assert.rejects(
    coordinator.collect('huge', async () => ({ timestampUTC:'2026-09-24T01:00:06Z', text:'x'.repeat(200) }), { force:true }),
    /payload too large/
  );
});
