import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASE2_SHADOW_JOBS, buildOrchestrationHealth } from '../../macro/orchestration/phase2-profile.mjs';

const expectedIds = [
  'price-health',
  'timeframe-health',
  'news-health',
  'analysis-shadow',
  'alert-router-shadow',
  'audit-snapshot',
];

test('default Phase 2 profile contains conservative unique logical schedules only', () => {
  assert.deepEqual(PHASE2_SHADOW_JOBS.map(x => x.id), expectedIds);
  assert.equal(new Set(PHASE2_SHADOW_JOBS.map(x => x.id)).size, expectedIds.length);
  assert.ok(PHASE2_SHADOW_JOBS.every(x => x.enabled === true));
  assert.ok(PHASE2_SHADOW_JOBS.every(x => Number.isInteger(x.every_seconds) && x.every_seconds >= 60));
  assert.ok(Object.isFrozen(PHASE2_SHADOW_JOBS));
  assert.ok(PHASE2_SHADOW_JOBS.every(Object.isFrozen));
});

test('default profile embeds no credentials, endpoints, live delivery clients or GitHub cron syntax', () => {
  const text = JSON.stringify(PHASE2_SHADOW_JOBS).toLowerCase();
  for (const forbidden of ['api_key','apikey','token','secret','password','http://','https://','telegram','broker','trade','cron:']) {
    assert.equal(text.includes(forbidden), false, `profile must not contain ${forbidden}`);
  }
});

test('health facade exposes every configured job with never-run state before first tick', () => {
  const health = buildOrchestrationHealth({
    stateSnapshot:{ version:1, last_slot_by_job:{}, job_runs:[], bot_runs:[], delivery_intents:[] },
    nowUtc:'2026-09-24T08:00:00.000Z',
  });
  assert.equal(health.mode, 'SHADOW');
  assert.equal(health.timestamp_utc, '2026-09-24T08:00:00.000Z');
  assert.deepEqual(health.jobs.map(x => x.job_id), expectedIds);
  assert.ok(health.jobs.every(x => x.status === 'NEVER_RUN' && x.last_run_utc === null));
  assert.ok(Object.isFrozen(health));
  assert.ok(Object.isFrozen(health.jobs));
});

test('health facade reports the latest recorded status and time per job', () => {
  const health = buildOrchestrationHealth({
    stateSnapshot:{
      version:1,
      last_slot_by_job:{ 'price-health':'2026-09-24T08:01:00.000Z' },
      job_runs:[
        { job_id:'price-health', status:'COMPLETED', timestamp_utc:'2026-09-24T08:00:02.000Z', scheduled_for_utc:'2026-09-24T08:00:00.000Z' },
        { job_id:'price-health', status:'FAILED', timestamp_utc:'2026-09-24T08:01:03.000Z', scheduled_for_utc:'2026-09-24T08:01:00.000Z' },
        { job_id:'news-health', status:'COMPLETED', timestamp_utc:'2026-09-24T08:00:04.000Z', scheduled_for_utc:'2026-09-24T08:00:00.000Z' },
      ],
      bot_runs:[], delivery_intents:[],
    },
    nowUtc:'2026-09-24T08:02:00.000Z',
  });
  const price = health.jobs.find(x => x.job_id === 'price-health');
  const news = health.jobs.find(x => x.job_id === 'news-health');
  assert.equal(price.status, 'FAILED');
  assert.equal(price.last_run_utc, '2026-09-24T08:01:03.000Z');
  assert.equal(price.last_slot_utc, '2026-09-24T08:01:00.000Z');
  assert.equal(news.status, 'COMPLETED');
  assert.equal(news.last_run_utc, '2026-09-24T08:00:04.000Z');
});

test('health facade rejects malformed clock or state snapshot', () => {
  assert.throws(() => buildOrchestrationHealth({ stateSnapshot:{}, nowUtc:'bad' }), /nowUtc|timestamp/);
  assert.throws(() => buildOrchestrationHealth({ stateSnapshot:null, nowUtc:'2026-09-24T08:00:00.000Z' }), /stateSnapshot/);
});
