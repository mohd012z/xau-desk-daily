import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirtyStateBus, topicKey } from '../macro/core/dirty-state-bus.mjs';

test('topic keys isolate feed symbol and timeframe', () => {
  assert.equal(topicKey({ feed:'ohlc', symbol:'XAUUSD', timeframe:'M5' }), 'ohlc:XAUUSD:M5');
  assert.notEqual(topicKey({ feed:'ohlc', symbol:'XAUUSD', timeframe:'M5' }), topicKey({ feed:'ohlc', symbol:'XAUUSD', timeframe:'H1' }));
});

test('only subscribers for changed topic are notified', async () => {
  const bus = createDirtyStateBus({ schedule:fn => fn() });
  const seen = [];
  bus.subscribe('ohlc:XAUUSD:M5', value => seen.push(['m5', value.close]));
  bus.subscribe('ohlc:XAUUSD:H1', value => seen.push(['h1', value.close]));
  bus.publish('ohlc:XAUUSD:M5', { close:4401 });
  assert.deepEqual(seen, [['m5', 4401]]);
});

test('multiple updates in same frame coalesce to latest value', () => {
  const queue = [];
  const bus = createDirtyStateBus({ schedule:fn => queue.push(fn) });
  const seen = [];
  bus.subscribe('ohlc:XAUUSD:M5', value => seen.push(value.close));
  bus.publish('ohlc:XAUUSD:M5', { close:4400 });
  bus.publish('ohlc:XAUUSD:M5', { close:4401 });
  bus.publish('ohlc:XAUUSD:M5', { close:4402 });
  assert.equal(queue.length, 1);
  queue.shift()();
  assert.deepEqual(seen, [4402]);
});

test('unchanged fingerprint is bypassed', () => {
  const bus = createDirtyStateBus({ schedule:fn => fn(), fingerprint:v => JSON.stringify(v) });
  let calls = 0;
  bus.subscribe('health', () => calls++);
  bus.publish('health', { state:'LIVE', age:2 });
  bus.publish('health', { state:'LIVE', age:2 });
  assert.equal(calls, 1);
});

test('unsubscribe prevents retained listeners and later work', () => {
  const bus = createDirtyStateBus({ schedule:fn => fn() });
  let calls = 0;
  const off = bus.subscribe('health', () => calls++);
  off();
  bus.publish('health', { state:'LIVE' });
  assert.equal(calls, 0);
  assert.equal(bus.listenerCount('health'), 0);
});
