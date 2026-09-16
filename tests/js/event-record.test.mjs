import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventTime, createEventRecord } from '../../macro/events/event-record.mjs';

test('timestamp hierarchy prefers official scheduled time', () => {
  const r = resolveEventTime({ officialScheduledAt: '2026-09-16T12:30:00Z', articlePublishedAt: '2026-09-16T12:31:00Z', receivedAt: '2026-09-16T12:31:05Z' });
  assert.equal(r.eventTimeUtc, '2026-09-16T12:30:00.000Z');
  assert.equal(r.timeSource, 'OFFICIAL_SCHEDULED');
  assert.equal(r.timeConfidence, 'HIGH');
});

test('received-only unplanned event is labeled low confidence', () => {
  const e = createEventRecord({ title: 'Unexpected policy remarks', source: 'wire', receivedAt: '2026-09-16T12:30:35Z' });
  assert.equal(e.kind, 'unplanned');
  assert.equal(e.state, 'DETECTED');
  assert.equal(e.timeSource, 'RECEIVED');
  assert.equal(e.timeConfidence, 'LOW');
  assert.match(e.id, /^evt_/);
});

test('same source title and minute produce deterministic id', () => {
  const a = createEventRecord({ title: 'Fed statement', source: 'Fed', providerEventAt: '2026-09-16T12:30:05Z' });
  const b = createEventRecord({ title: 'Fed statement', source: 'Fed', providerEventAt: '2026-09-16T12:30:55Z' });
  assert.equal(a.id, b.id);
});
