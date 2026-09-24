import test from 'node:test';
import assert from 'node:assert/strict';
import { createShadowState } from '../../macro/orchestration/shadow-state.mjs';
import { dueScheduleEvents } from '../../macro/orchestration/scheduler.mjs';

test('snapshot rehydration preserves completed schedule slots and audit rows', () => {
  const state = createShadowState();
  state.recordJobSlot({
    job_id:'price-health',
    scheduled_for_utc:'2026-09-24T08:00:00.000Z',
    status:'SUCCESS',
    timestamp_utc:'2026-09-24T08:00:02.000Z',
  });
  state.recordBotRun({
    bot_id:'health-bot', event_id:'e1', status:'SUCCESS', timestamp_utc:'2026-09-24T08:00:03.000Z', metadata:{ source:'shadow' },
  });
  state.recordDeliveryIntent({
    intent_id:'i1', channel:'TELEGRAM', event_id:'e1', timestamp_utc:'2026-09-24T08:00:04.000Z', payload:{ text:'shadow only' },
  });

  const snapshot = state.snapshot();
  const restored = createShadowState(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(restored.lastSlotByJob(), { 'price-health':'2026-09-24T08:00:00.000Z' });
  assert.deepEqual(restored.snapshot(), snapshot);
});

test('nested input mutation cannot alter stored audit records and snapshots are deeply frozen', () => {
  const metadata = { nested:{ value:1 } };
  const state = createShadowState();
  state.recordBotRun({ bot_id:'bot', event_id:'e1', status:'SUCCESS', timestamp_utc:'2026-09-24T08:00:00.000Z', metadata });
  metadata.nested.value = 99;

  const snapshot = state.snapshot();
  assert.equal(snapshot.bot_runs[0].metadata.nested.value, 1);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.bot_runs));
  assert.ok(Object.isFrozen(snapshot.bot_runs[0]));
  assert.ok(Object.isFrozen(snapshot.bot_runs[0].metadata));
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test('future completed slot is rejected by scheduler when restored state is reused', () => {
  const state = createShadowState();
  state.recordJobSlot({
    job_id:'health', scheduled_for_utc:'2026-09-24T08:05:00.000Z', status:'SUCCESS', timestamp_utc:'2026-09-24T08:05:01.000Z',
  });
  assert.throws(() => dueScheduleEvents({
    jobs:[{ id:'health', every_seconds:60, event_type:'HEALTH_CHECK' }],
    nowUtc:'2026-09-24T08:00:00.000Z',
    lastSlotByJob:state.lastSlotByJob(),
  }), /future|rollback/i);
});

test('failed bot runs are reduced to safe serializable error fields', () => {
  const state = createShadowState();
  state.recordBotRun({
    bot_id:'bad', event_id:'e1', status:'FAILED', timestamp_utc:'2026-09-24T08:00:00.000Z',
    error:new Error('boom'), error_name:'Error', error_message:'boom', metadata:{ should_not_survive:true },
  });
  assert.deepEqual(state.snapshot().bot_runs[0], {
    bot_id:'bad', event_id:'e1', status:'FAILED', error_name:'Error', error_message:'boom', timestamp_utc:'2026-09-24T08:00:00.000Z',
  });
});

test('delivery intents remain audit data only and sensitive/non-serializable payloads are rejected', () => {
  const state = createShadowState();
  const returned = state.recordDeliveryIntent({
    intent_id:'i1', channel:'APK', event_id:'e1', timestamp_utc:'2026-09-24T08:00:00.000Z', payload:{ title:'shadow' },
  });
  assert.equal(returned.channel, 'APK');
  assert.equal(typeof state.deliver, 'undefined');
  assert.throws(() => state.recordDeliveryIntent({
    intent_id:'i2', channel:'TELEGRAM', event_id:'e2', timestamp_utc:'2026-09-24T08:00:01.000Z', payload:{ telegram_token:'secret' },
  }), /sensitive|credential/i);
  assert.throws(() => state.recordBotRun({
    bot_id:'x', event_id:'e2', status:'SUCCESS', timestamp_utc:'2026-09-24T08:00:01.000Z', metadata:{ fn:()=>{} },
  }), /serializable/i);
});
