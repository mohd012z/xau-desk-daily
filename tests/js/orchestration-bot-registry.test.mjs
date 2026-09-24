import test from 'node:test';
import assert from 'node:assert/strict';
import { createBotRegistry } from '../../macro/orchestration/bot-registry.mjs';

function bot(id, priority, subscriptions) {
  return { id, priority, subscriptions, run:async()=>({}) };
}

test('registry orders matching bots by priority then id', () => {
  const registry = createBotRegistry([
    bot('z',20,['TICK']),
    bot('a',10,['TICK']),
    bot('b',10,['TICK']),
    bot('other',1,['NEWS']),
  ]);
  assert.deepEqual(registry.matching({ type:'TICK' }).map(x => x.id), ['a','b','z']);
});

test('registry canonicalizes subscriptions and rejects duplicate bot ids', () => {
  const registry = createBotRegistry([
    bot(' alpha ',5,['tick',' NEWS ']),
  ]);
  assert.deepEqual(registry.botIds(), ['alpha']);
  assert.deepEqual(registry.matching({ type:'news' }).map(x => x.id), ['alpha']);

  assert.throws(() => createBotRegistry([
    bot('x',1,['TICK']),
    bot('x',2,['TICK']),
  ]), /duplicate/i);
});

test('registry validates bot contract and protects metadata from mutation', () => {
  assert.throws(() => createBotRegistry([{ id:'x', subscriptions:['TICK'] }]), /run/);
  assert.throws(() => createBotRegistry([{ id:'x', subscriptions:[], run:async()=>({}) }]), /subscriptions/);

  const source = bot('safe',7,['tick']);
  const registry = createBotRegistry([source]);
  source.subscriptions[0] = 'MUTATED';
  const matched = registry.matching({ type:'TICK' });
  assert.equal(matched[0].id, 'safe');
  assert.ok(Object.isFrozen(matched[0]));
  assert.ok(Object.isFrozen(matched[0].subscriptions));
});

test('matching returns an immutable result array and rejects malformed event type', () => {
  const registry = createBotRegistry([bot('a',10,['TICK'])]);
  const result = registry.matching({ type:'TICK' });
  assert.ok(Object.isFrozen(result));
  assert.throws(() => registry.matching({ type:'' }), /type/);
});
