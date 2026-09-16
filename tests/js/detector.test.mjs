import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHeadline, isNearDuplicate, scoreMateriality, detectEvent } from '../../macro/events/detector.mjs';

test('headline normalization removes punctuation and case noise', () => {
  assert.equal(normalizeHeadline('  FED: Rates -- Higher!  '), 'fed rates higher');
});

test('near duplicate policy headlines are suppressed', () => {
  const a = { title: 'Fed says rates may stay higher for longer', eventTimeUtc: '2026-09-16T12:30:00Z' };
  const b = { title: 'Fed says rates may stay higher for longer.', eventTimeUtc: '2026-09-16T12:32:00Z' };
  assert.equal(isNearDuplicate(a,b), true);
});

test('macro policy outranks irrelevant technology headline', () => {
  assert.ok(scoreMateriality({ title: 'Fed signals rate path shift as inflation remains high' }) >= 3);
  assert.equal(scoreMateriality({ title: 'HP desktop PC gadget review for office users' }), 0);
});

test('detector accepts material event and rejects entertainment', () => {
  const accepted = detectEvent({ title: 'US CPI inflation surprises above forecast', source: 'wire', articlePublishedAt: '2026-09-16T12:30:00Z' }, []);
  assert.equal(accepted.accepted, true);
  assert.ok(accepted.event.affectedAssets.primary.includes('EUR/USD'));
  const rejected = detectEvent({ title: 'Emmy awards celebrity fashion roundup', source: 'wire', articlePublishedAt: '2026-09-16T12:31:00Z' }, []);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason, 'LOW_MATERIALITY');
});
