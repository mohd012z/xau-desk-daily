import test from 'node:test';
import assert from 'node:assert/strict';
import { runShadowTick } from '../../macro/orchestration/master-runner.mjs';
import { createShadowState } from '../../macro/orchestration/shadow-state.mjs';

const healthJob = { id:'health', every_seconds:60, event_type:'HEALTH_CHECK', priority:10 };

test('one bot failure does not stop later bots', async () => {
  const bots = [
    { id:'bad', priority:10, subscriptions:['HEALTH_CHECK'], run:async()=>{ throw new Error('boom'); } },
    { id:'good', priority:20, subscriptions:['HEALTH_CHECK'], run:async()=>({ metadata:{ ok:true } }) },
  ];
  const result = await runShadowTick({ jobs:[healthJob], bots, state:createShadowState(), nowUtc:'2026-09-24T08:00:00.000Z' });
  assert.equal(result.bot_runs.find(x => x.bot_id === 'bad').status, 'FAILED');
  assert.equal(result.bot_runs.find(x => x.bot_id === 'bad').error_message, 'boom');
  assert.equal(result.bot_runs.find(x => x.bot_id === 'good').status, 'SUCCESS');
  assert.deepEqual(result.bot_runs.map(x => x.bot_id), ['bad','good']);
});

test('multiple logical cron schedules dispatch deterministically by event then bot priority', async () => {
  const jobs = [
    { id:'slow', every_seconds:900, event_type:'AUDIT', priority:30 },
    { id:'fast', every_seconds:60, event_type:'HEALTH_CHECK', priority:10 },
    { id:'medium', every_seconds:300, event_type:'ANALYSIS', priority:20 },
  ];
  const bots = [
    { id:'health-z', priority:20, subscriptions:['HEALTH_CHECK'], run:async()=>({}) },
    { id:'health-a', priority:10, subscriptions:['HEALTH_CHECK'], run:async()=>({}) },
    { id:'analysis', priority:10, subscriptions:['ANALYSIS'], run:async()=>({}) },
    { id:'audit', priority:10, subscriptions:['AUDIT'], run:async()=>({}) },
  ];
  const result = await runShadowTick({ jobs, bots, state:createShadowState(), nowUtc:'2026-09-24T08:15:00.000Z' });
  assert.deepEqual(result.scheduled.map(x => x.job_id), ['fast','medium','slow']);
  assert.deepEqual(result.bot_runs.map(x => x.bot_id), ['health-a','health-z','analysis','audit']);
  assert.deepEqual(result.processed_events.map(x => x.type), ['HEALTH_CHECK','ANALYSIS','AUDIT']);
});

test('emitted child events use the same FIFO bus and duplicate child ids are suppressed', async () => {
  const bots = [
    { id:'producer-a', priority:10, subscriptions:['HEALTH_CHECK'], run:async()=>({ emitted_events:[{ event_id:'child-1', type:'CHILD', payload:{ source:'a' } }] }) },
    { id:'producer-b', priority:20, subscriptions:['HEALTH_CHECK'], run:async()=>({ emitted_events:[{ event_id:'child-1', type:'CHILD', payload:{ source:'b' } }] }) },
    { id:'consumer', priority:10, subscriptions:['CHILD'], run:async({event})=>({ metadata:{ source:event.payload.source } }) },
  ];
  const result = await runShadowTick({ jobs:[healthJob], bots, state:createShadowState(), nowUtc:'2026-09-24T08:00:00.000Z' });
  assert.deepEqual(result.processed_events.map(x => x.event_id), ['cron:health:2026-09-24T08:00:00.000Z','child-1']);
  assert.equal(result.bot_runs.filter(x => x.bot_id === 'consumer').length, 1);
  assert.equal(result.bot_runs.find(x => x.bot_id === 'consumer').metadata.source, 'a');
});

test('same schedule slot is idempotent both in-process and after state rehydration', async () => {
  let calls = 0;
  const bots = [{ id:'counter', priority:10, subscriptions:['HEALTH_CHECK'], run:async()=>{ calls += 1; return {}; } }];
  const state = createShadowState();
  const first = await runShadowTick({ jobs:[healthJob], bots, state, nowUtc:'2026-09-24T08:00:10.000Z' });
  const second = await runShadowTick({ jobs:[healthJob], bots, state, nowUtc:'2026-09-24T08:00:50.000Z' });
  const restored = createShadowState(JSON.parse(JSON.stringify(first.state_snapshot)));
  const afterRestart = await runShadowTick({ jobs:[healthJob], bots, state:restored, nowUtc:'2026-09-24T08:00:55.000Z' });

  assert.equal(first.scheduled.length, 1);
  assert.equal(second.scheduled.length, 0);
  assert.equal(afterRestart.scheduled.length, 0);
  assert.equal(calls, 1);
});

test('delivery intents are recorded only as shadow audit records', async () => {
  const bots = [{
    id:'intent-bot', priority:10, subscriptions:['HEALTH_CHECK'],
    run:async()=>({ delivery_intents:[{ intent_id:'intent-1', channel:'TELEGRAM', payload:{ text:'shadow' } }] }),
  }];
  const result = await runShadowTick({ jobs:[healthJob], bots, state:createShadowState(), nowUtc:'2026-09-24T08:00:00.000Z' });
  assert.equal(result.delivery_intents.length, 1);
  assert.equal(result.delivery_intents[0].channel, 'TELEGRAM');
  assert.equal(result.delivery_intents[0].event_id, 'cron:health:2026-09-24T08:00:00.000Z');
  assert.equal(result.state_snapshot.delivery_intents.length, 1);
});

test('runner is shadow-only and rejects live delivery or execution services', async () => {
  await assert.rejects(() => runShadowTick({
    jobs:[healthJob], bots:[], state:createShadowState(), nowUtc:'2026-09-24T08:00:00.000Z', context:{ shadow_mode:false },
  }), /shadow/i);

  for (const key of ['telegram','apk','delivery','broker','trade']) {
    await assert.rejects(() => runShadowTick({
      jobs:[healthJob], bots:[], state:createShadowState(), nowUtc:'2026-09-24T08:00:00.000Z', context:{ services:{ [key]:{} } },
    }), /service|shadow|live/i);
  }
});

test('runner returns a deeply frozen serializable result', async () => {
  const result = await runShadowTick({ jobs:[healthJob], bots:[], state:createShadowState(), nowUtc:'2026-09-24T08:00:00.000Z' });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.scheduled));
  assert.ok(Object.isFrozen(result.processed_events));
  assert.ok(Object.isFrozen(result.state_snapshot));
  assert.doesNotThrow(() => JSON.stringify(result));
});
