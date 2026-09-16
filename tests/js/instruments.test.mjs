import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND, getPipSize, getInstrument } from '../../macro/core/instruments.mjs';

test('brand and pip metadata are canonical', () => {
  assert.equal(BRAND.name, 'MACRO//DESK');
  assert.equal(getPipSize('EUR/USD'), 0.0001);
  assert.equal(getPipSize('USD/JPY'), 0.01);
  assert.equal(getInstrument('XAU/USD').assetClass, 'metal');
  assert.equal(getInstrument('BTC/USD').assetClass, 'digital');
});
