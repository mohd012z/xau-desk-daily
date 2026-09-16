import test from 'node:test';
import assert from 'node:assert/strict';
import { inferAffectedAssets } from '../../macro/events/affected-assets.mjs';

test('Fed inflation news maps USD pairs plus XAU and digital assets', () => {
  const r = inferAffectedAssets({ title: 'US CPI stronger than forecast; Federal Reserve outlook in focus' });
  assert.ok(r.currencies.includes('USD'));
  assert.ok(r.primary.includes('EUR/USD'));
  assert.ok(r.secondary.includes('XAU/USD'));
  assert.ok(r.secondary.includes('BTC/USD'));
  assert.ok(r.context.includes('DXY'));
});

test('ECB event prioritizes EUR pairs without implying direction', () => {
  const r = inferAffectedAssets({ title: 'ECB policy statement' });
  assert.deepEqual(r.currencies, ['EUR']);
  assert.ok(r.primary.includes('EUR/USD'));
  assert.equal('direction' in r, false);
});

test('geopolitical shock includes haven and oil context', () => {
  const r = inferAffectedAssets({ title: 'Major military strike raises oil supply disruption risk' });
  assert.ok(r.primary.includes('XAU/USD'));
  assert.ok(r.currencies.includes('JPY'));
  assert.ok(r.context.includes('BRENT'));
});
