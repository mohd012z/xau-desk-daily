import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMyt } from '../../macro/core/time-myt.mjs';

test('formats explicit UTC timestamps in MYT across midnight', () => {
  assert.equal(formatMyt('2026-09-24T12:30:00.000Z'), '24 Sep 2026 20:30:00 MYT');
  assert.equal(formatMyt('2026-09-24T23:30:00.000Z'), '25 Sep 2026 07:30:00 MYT');
});

test('rejects missing or invalid timestamps instead of using current time', () => {
  assert.throws(() => formatMyt(undefined), TypeError);
  assert.throws(() => formatMyt('not-a-date'), TypeError);
});
