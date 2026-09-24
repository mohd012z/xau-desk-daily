import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRefreshDelay, freshnessState, monotonicProgress, shouldApplySample } from '../config/data-collection-policy.mjs';

test('live refresh is fast when healthy but bounded to avoid request storms', () => {
  assert.equal(nextRefreshDelay({ mode:'live', visible:true, failures:0, rateLimited:false }), 5000);
  assert.equal(nextRefreshDelay({ mode:'live', visible:false, failures:0, rateLimited:false }), 15000);
});

test('refresh backs off progressively on failures and rate limits', () => {
  assert.equal(nextRefreshDelay({ mode:'live', visible:true, failures:1, rateLimited:false }), 10000);
  assert.equal(nextRefreshDelay({ mode:'live', visible:true, failures:3, rateLimited:false }), 40000);
  assert.equal(nextRefreshDelay({ mode:'live', visible:true, failures:0, rateLimited:true }), 60000);
});

test('freshness distinguishes live stale and unavailable data', () => {
  assert.equal(freshnessState({ ageMs: 4000, maxFreshMs: 10000 }), 'LIVE');
  assert.equal(freshnessState({ ageMs: 30000, maxFreshMs: 10000 }), 'STALE_DATA');
  assert.equal(freshnessState({ ageMs: Infinity, maxFreshMs: 10000 }), 'FEED_DISCONNECTED');
});

test('progress never moves backwards during a collection stage', () => {
  assert.equal(monotonicProgress(62, 48), 62);
  assert.equal(monotonicProgress(62, 90), 90);
});

test('older or duplicate samples do not overwrite newer proven data', () => {
  const current = { timestampUTC:'2026-09-24T01:00:05Z', source:'verified', sequence:12 };
  assert.equal(shouldApplySample(current, { timestampUTC:'2026-09-24T01:00:04Z', source:'verified', sequence:13 }), false);
  assert.equal(shouldApplySample(current, { timestampUTC:'2026-09-24T01:00:05Z', source:'verified', sequence:12 }), false);
  assert.equal(shouldApplySample(current, { timestampUTC:'2026-09-24T01:00:06Z', source:'verified', sequence:13 }), true);
});
