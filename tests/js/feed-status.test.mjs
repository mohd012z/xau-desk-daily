import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFeedStatus } from '../../macro/core/feed-status.mjs';

const now = Date.parse('2026-09-16T06:00:30Z');

test('fresh provider tick is streaming', () => {
  assert.equal(classifyFeedStatus({ providerTimestamp: '2026-09-16T06:00:25Z', now }), 'STREAMING');
});

test('old cached object cannot be called streaming', () => {
  assert.equal(classifyFeedStatus({ providerTimestamp: '2026-09-16T05:58:00Z', now, hasSnapshot: true }), 'STALE');
});

test('snapshot is explicit when live path is unavailable', () => {
  assert.equal(classifyFeedStatus({ providerTimestamp: null, now, hasSnapshot: true, networkFailed: true }), 'SNAPSHOT');
});
