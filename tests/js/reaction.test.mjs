import test from 'node:test';
import assert from 'node:assert/strict';
import { calcFxReaction, calcMetalReaction, calcDigitalReaction } from '../../macro/core/reaction.mjs';

test('EURUSD signed pip movement and event range', () => {
  const r = calcFxReaction('EUR/USD', 1.08520, 1.08410, 1.08570, 1.08290);
  assert.equal(r.pips, -11);
  assert.equal(r.maxUpPips, 5);
  assert.equal(r.maxDownPips, -23);
  assert.equal(r.rangePips, 28);
});

test('USDJPY uses 0.01 pip size', () => {
  const r = calcFxReaction('USD/JPY', 154.44, 154.76, 154.80, 154.40);
  assert.equal(r.pips, 32);
});

test('XAU and BTC use dollar/percent movement', () => {
  assert.equal(calcMetalReaction(4280, 4268.02, 0.01).dollarMove, -11.98);
  assert.equal(calcDigitalReaction(78000, 77649).dollarMove, -351);
});
