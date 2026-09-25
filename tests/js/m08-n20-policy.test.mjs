import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateM08N20Policy,
  toMytParts,
  resolveMytAnchorUtc,
} from '../../macro/temporal/m08-n20-policy.mjs';

const policy = {
  version: 'm08-n20-v1',
  timezone: 'Asia/Kuala_Lumpur',
  sourceTimeframeMinutes: 30,
  anchors: { M08: '08:00', N20: '20:00' },
  checkpoints: ['11:30', '18:00'],
  retestTolerance: { mode: 'absolute', value: 1.0 },
  outcomeHorizonsMinutes: [30, 60, 120],
};

test('validates explicit M08/N20 policy', () => {
  const out = validateM08N20Policy(policy);
  assert.equal(out.timezone, 'Asia/Kuala_Lumpur');
  assert.equal(out.anchors.M08, '08:00');
  assert.equal(out.anchors.N20, '20:00');
  assert.ok(Object.isFrozen(out));
});

test('converts UTC to MYT and handles trading-date rollover', () => {
  assert.deepEqual(toMytParts('2026-09-25T15:59:59Z'), {
    date: '2026-09-25', time: '23:59:59', hour: 23, minute: 59, second: 59,
  });
  assert.deepEqual(toMytParts('2026-09-25T16:00:00Z'), {
    date: '2026-09-26', time: '00:00:00', hour: 0, minute: 0, second: 0,
  });
});

test('resolves MYT anchors to canonical UTC', () => {
  assert.equal(resolveMytAnchorUtc('2026-09-26', '08:00'), '2026-09-26T00:00:00.000Z');
  assert.equal(resolveMytAnchorUtc('2026-09-26', '20:00'), '2026-09-26T12:00:00.000Z');
});

test('rejects incomplete or unsupported policy instead of defaulting', () => {
  assert.throws(() => validateM08N20Policy({ ...policy, timezone: 'UTC' }), /Asia\/Kuala_Lumpur/);
  assert.throws(() => validateM08N20Policy({ ...policy, sourceTimeframeMinutes: 0 }), /sourceTimeframeMinutes/);
  assert.throws(() => validateM08N20Policy({ ...policy, anchors: { M08: '08:00' } }), /N20/);
  assert.throws(() => validateM08N20Policy({ ...policy, retestTolerance: undefined }), /retestTolerance/);
});

test('rejects invalid timestamps and invalid MYT dates', () => {
  assert.throws(() => toMytParts('not-a-date'), /timestamp/);
  assert.throws(() => resolveMytAnchorUtc('2026-02-30', '08:00'), /date/);
});
