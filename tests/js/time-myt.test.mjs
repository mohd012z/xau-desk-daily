import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMyt, countdownTo } from '../../macro/core/time-myt.mjs';

test('formatMyt converts UTC across Malaysia date rollover', () => {
  assert.equal(formatMyt('2026-09-16T18:00:00Z'), '17 Sep 2026 02:00:00 MYT');
});

test('countdownTo reports deterministic upcoming and elapsed states', () => {
  assert.deepEqual(
    countdownTo('2026-09-16T18:00:00Z', '2026-09-16T17:58:30Z'),
    { phase: 'UPCOMING', totalSeconds: 90, text: 'T-00:01:30' }
  );
  assert.deepEqual(
    countdownTo('2026-09-16T18:00:00Z', '2026-09-16T18:00:12Z'),
    { phase: 'ELAPSED', totalSeconds: 12, text: 'T+00:00:12' }
  );
});