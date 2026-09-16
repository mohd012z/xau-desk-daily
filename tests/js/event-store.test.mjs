import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventStore } from '../../macro/events/event-store.mjs';
import { ingestSnapshotEvents, ingestGatewayPayload, startGatewayPolling } from '../../macro/adapters/event-feed-adapter.mjs';

test('snapshot ingestion rejects irrelevant news and keeps material macro events', () => {
  const snapshot = { meta: { generatedAt: '2026-09-16T12:00:00+08:00' }, news: [
    { time:'2026-09-16 03:00 UTC', title:'HP desktop PC gadget review for office users', summary:'hardware', source:'Tech' },
    { time:'2026-09-16 04:00 UTC', title:'US CPI inflation surprises above forecast', summary:'Federal Reserve outlook in focus', source:'Wire' }
  ]};
  const store = createEventStore();
  store.ingestMany(ingestSnapshotEvents(snapshot));
  assert.equal(store.list().length, 1);
  assert.match(store.list()[0].title, /CPI/);
});

test('repeated speech segments revise one event and preserve reversal history', () => {
  const store = createEventStore();
  const base = { title:'Fed Chair policy remarks', source:'Federal Reserve', providerEventAt:'2026-09-16T12:30:00Z', sourceType:'official', isSpeech:true };
  store.ingest({ ...base, text:'Inflation is easing and rate cuts may be appropriate.', speechMode:'prepared_remarks' });
  store.ingest({ ...base, text:'Inflation remains too high and rates may need to rise.', speechMode:'qa' });
  const events = store.list();
  assert.equal(events.length, 1);
  assert.equal(events[0].revisions.length, 2);
  assert.equal(events[0].revisions[0].speech.stance, 'DOVISH');
  assert.equal(events[0].revisions[1].speech.stance, 'HAWKISH');
});

test('gateway adapter preserves received timestamp and event payload', () => {
  const [candidate] = ingestGatewayPayload({ receivedAt:'2026-09-16T12:31:00Z', events:[{title:'ECB rate decision', eventTimeUtc:'2026-09-16T12:30:00Z', source:'wire'}] });
  assert.equal(candidate.providerEventAt, '2026-09-16T12:30:00.000Z');
  assert.equal(candidate.receivedAt, '2026-09-16T12:31:00.000Z');
});

test('no gateway url does not call fetch', async () => {
  let calls = 0;
  const p = startGatewayPolling({ fetchImpl: async () => { calls++; } });
  await p.poll();
  assert.equal(p.active, false);
  assert.equal(calls, 0);
});
