import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../../macro/orchestration/event-bus.mjs';

function event(id, type='TICK', payload={}) {
  return { event_id:id, type, payload };
}

test('event bus preserves FIFO ordering and suppresses duplicate event ids forever in the instance', () => {
  const bus = createEventBus();
  assert.equal(bus.publish(event('e1')), true);
  assert.equal(bus.publish(event('e2')), true);
  assert.equal(bus.publish(event('e1')), false);
  assert.equal(bus.next().event_id, 'e1');
  assert.equal(bus.publish(event('e1')), false);
  assert.equal(bus.next().event_id, 'e2');
  assert.equal(bus.next(), null);
  assert.equal(bus.hasPending(), false);
});

test('bus isolates published input and returns immutable snapshots', () => {
  const payload = { nested:{ value:1 } };
  const bus = createEventBus();
  bus.publish(event('e1', 'tick', payload));
  payload.nested.value = 99;

  const snapshot = bus.snapshot();
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.pending));
  assert.ok(Object.isFrozen(snapshot.pending[0]));
  assert.ok(Object.isFrozen(snapshot.pending[0].payload));
  assert.equal(snapshot.pending[0].payload.nested.value, 1);
  assert.deepEqual(snapshot.seen_event_ids, ['e1']);
});

test('seed rehydrates seen ids and pending events without replaying duplicates', () => {
  const bus = createEventBus({
    pending:[event('queued')],
    seen_event_ids:['done','queued'],
  });
  assert.equal(bus.publish(event('done')), false);
  assert.equal(bus.next().event_id, 'queued');
});

test('event bus rejects malformed events', () => {
  const bus = createEventBus();
  assert.throws(() => bus.publish({ type:'TICK' }), /event_id/);
  assert.throws(() => bus.publish({ event_id:'x', type:'' }), /type/);
});
