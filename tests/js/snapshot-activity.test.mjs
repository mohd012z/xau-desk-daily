import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestSnapshotEvents } from '../../macro/adapters/event-feed-adapter.mjs';
import { createEventStore } from '../../macro/events/event-store.mjs';

test('old snapshot headline is stored closed and does not appear in active list', () => {
  const snapshot = {
    meta: { generatedAt: '2026-09-16T12:00:00+08:00' },
    news: [{ time: '2026-09-15 04:00 UTC', title: 'Fed rate decision analysis', summary: 'Federal Reserve policy outlook', source: 'Wire' }]
  };
  const store = createEventStore();
  store.ingestMany(ingestSnapshotEvents(snapshot));
  assert.equal(store.list().length, 0);
  assert.equal(store.listAll().length, 1);
  assert.equal(store.listAll()[0].state, 'CLOSED');
});

test('official speech listing without exact live timestamp is reference/closed', () => {
  const snapshot = {
    meta: { generatedAt: '2026-09-16T12:00:00+08:00' },
    speakers: [{ name: 'Economic Outlook', quote: 'Federal Reserve speaker remarks', role: 'Federal Reserve speaker', source: 'Federal Reserve' }]
  };
  const store = createEventStore();
  store.ingestMany(ingestSnapshotEvents(snapshot));
  assert.equal(store.list().length, 0);
  assert.equal(store.listAll()[0].kind, 'reference');
  assert.equal(store.listAll()[0].state, 'CLOSED');
});
