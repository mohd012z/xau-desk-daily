import test from 'node:test';
import assert from 'node:assert/strict';
import { formatReactionCard } from '../../macro/ui/app.mjs';

test('reaction card keeps expected pressure separate from measured FX movement', () => {
  const card = formatReactionCard({
    symbol: 'EUR/USD',
    assetClass: 'fx',
    reaction: { fromPrice: 1.0852, toPrice: 1.0841, pips: -11, maxUpPips: 5, maxDownPips: -23, rangePips: 28 },
    expectedPressure: 'DOWN PRESSURE',
    observedReaction: 'DOWN'
  });
  assert.equal(card.from, '1.08520');
  assert.equal(card.to, '1.08410');
  assert.equal(card.movement, '-11.0 pips');
  assert.equal(card.expectedPressure, 'DOWN PRESSURE');
  assert.equal(card.observedReaction, 'DOWN');
});

test('metal and digital cards use dollar and percent movement', () => {
  const metal = formatReactionCard({
    symbol: 'XAU/USD', assetClass: 'metal',
    reaction: { fromPrice: 4280, toPrice: 4268.02, dollarMove: -11.98, returnPct: -0.2799, providerPoints: -1198 },
    expectedPressure: 'DOWN PRESSURE', observedReaction: 'DOWN'
  });
  const digital = formatReactionCard({
    symbol: 'BTC/USD', assetClass: 'digital',
    reaction: { fromPrice: 78000, toPrice: 77649, dollarMove: -351, returnPct: -0.45 },
    expectedPressure: 'MIXED', observedReaction: 'DOWN'
  });
  assert.match(metal.movement, /\$-11\.98/);
  assert.match(metal.movement, /-0\.28%/);
  assert.match(digital.movement, /\$-351\.00/);
  assert.match(digital.movement, /-0\.45%/);
});
