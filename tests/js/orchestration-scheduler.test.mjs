import test from 'node:test';
import assert from 'node:assert/strict';
import { dueScheduleEvents, normalizeJobs } from '../../macro/orchestration/scheduler.mjs';

test('same cron slot produces one stable event identity', () => {
  const jobs = [{ id:'market-health', every_seconds:60, event_type:'HEALTH_CHECK' }];
  const a = dueScheduleEvents({ jobs, nowUtc:'2026-09-24T08:00:12.000Z', lastSlotByJob:{} });
  const b = dueScheduleEvents({ jobs, nowUtc:'2026-09-24T08:00:58.000Z', lastSlotByJob:{} });
  assert.equal(a[0].event_id, b[0].event_id);
  assert.equal(a[0].scheduled_for_utc, '2026-09-24T08:00:00.000Z');
});

test('completed slot is not scheduled twice', () => {
  const jobs = [{ id:'news-health', every_seconds:300, event_type:'NEWS_CHECK' }];
  const events = dueScheduleEvents({
    jobs,
    nowUtc:'2026-09-24T08:04:00.000Z',
    lastSlotByJob:{ 'news-health':'2026-09-24T08:00:00.000Z' }
  });
  assert.deepEqual(events, []);
});

test('normalizeJobs rejects invalid intervals and duplicate ids', () => {
  assert.throws(() => normalizeJobs([{ id:'a', every_seconds:0, event_type:'TICK' }]), /every_seconds/);
  assert.throws(() => normalizeJobs([
    { id:'a', every_seconds:60, event_type:'TICK' },
    { id:'a', every_seconds:120, event_type:'TICK' },
  ]), /duplicate/i);
});

test('scheduler rejects invalid nowUtc and future last-slot state', () => {
  const jobs = [{ id:'a', every_seconds:60, event_type:'TICK' }];
  assert.throws(() => dueScheduleEvents({ jobs, nowUtc:'not-a-time', lastSlotByJob:{} }), /nowUtc/);
  assert.throws(() => dueScheduleEvents({
    jobs,
    nowUtc:'2026-09-24T08:00:12.000Z',
    lastSlotByJob:{ a:'2026-09-24T08:01:00.000Z' },
  }), /future|rollback/i);
});

test('normalized jobs and scheduled events are immutable frozen copies', () => {
  const source = [{ id:' A ', every_seconds:60, event_type:'tick', priority:5 }];
  const normalized = normalizeJobs(source);
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized[0]));
  assert.deepEqual(normalized[0], { id:'A', every_seconds:60, event_type:'TICK', enabled:true, priority:5 });
  source[0].id = 'MUTATED';
  assert.equal(normalized[0].id, 'A');

  const events = dueScheduleEvents({ jobs: normalized, nowUtc:'2026-09-24T08:00:12.000Z', lastSlotByJob:{} });
  assert.ok(Object.isFrozen(events));
  assert.ok(Object.isFrozen(events[0]));
  assert.ok(Object.isFrozen(events[0].payload));
});
