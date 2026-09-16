import test from 'node:test';
import assert from 'node:assert/strict';
import { floorEventMinute, selectCompletedMinuteBaseline, transitionEvent } from '../../macro/core/events.mjs';

test('event at 18:30:35 uses completed 18:29 bar', () => {
  const bars = [
    { time: '2026-09-16T18:29:00Z', close: 4281.25 },
    { time: '2026-09-16T18:30:00Z', close: 4275.10 }
  ];
  assert.equal(floorEventMinute('2026-09-16T18:30:35Z'), '2026-09-16T18:30:00.000Z');
  assert.deepEqual(selectCompletedMinuteBaseline(bars, '2026-09-16T18:30:35Z'), bars[0]);
});

test('unplanned event follows detected to triggered to live', () => {
  assert.equal(transitionEvent('DETECTED', 'trigger'), 'TRIGGERED');
  assert.equal(transitionEvent('TRIGGERED', 'market_tick'), 'LIVE');
});
