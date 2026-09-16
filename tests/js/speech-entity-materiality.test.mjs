import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreMateriality } from '../../macro/events/detector.mjs';

test('official Federal Reserve speaker entity is material even when title is generic', () => {
  const score = scoreMateriality({
    title: 'Economic Outlook',
    text: 'Remarks at an economic luncheon.',
    entities: ['Federal Reserve speaker'],
    sourceType: 'official'
  });
  assert.ok(score >= 3);
});
