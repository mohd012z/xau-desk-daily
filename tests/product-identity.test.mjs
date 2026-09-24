import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_IDENTITY, getProductIdentity } from '../config/product-identity.mjs';

test('canonical identity separates public VEYRA from internal HELIX', () => {
  assert.deepEqual(PRODUCT_IDENTITY, {
    productName: 'VEYRA',
    platformName: 'HELIX',
    pulseName: 'HELIX Pulse',
    deepLinkScheme: 'veyra',
    repositoryTargetName: 'helix'
  });
  assert.equal(Object.isFrozen(PRODUCT_IDENTITY), true);
});

test('invalid and unknown overrides cannot corrupt canonical identity', () => {
  const identity = getProductIdentity({ productName: '', unknown: 'bad', pulseName: 'Pulse Preview' });
  assert.equal(identity.productName, 'VEYRA');
  assert.equal(identity.pulseName, 'Pulse Preview');
  assert.equal('unknown' in identity, false);
  assert.equal(PRODUCT_IDENTITY.pulseName, 'HELIX Pulse');
});
