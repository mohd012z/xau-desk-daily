import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMyt } from '../../macro/core/time-myt.mjs';

test('formatMyt pins UTC to MYT boundary behavior', () => {
  const cases = [
    ['2026-09-24T12:30:00.000Z', '24 Sep 2026 20:30:00 MYT'],
    ['2026-09-24T23:30:00.000Z', '25 Sep 2026 07:30:00 MYT'],
  ];

  for (const [utc, expected] of cases) {
    assert.equal(formatMyt(utc), expected);
  }
});

test('formatMyt rejects missing or malformed timestamps', () => {
  assert.throws(() => formatMyt(undefined), TypeError);
  assert.throws(() => formatMyt('not-a-date'), TypeError);
});
