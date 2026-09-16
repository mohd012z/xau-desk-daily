import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecalculationRequest } from '../../macro/events/recalculate.mjs';

test('recalculation contract contains event revision and affected assets without a forecast', () => {
  const req = buildRecalculationRequest({ id:'evt_1', state:'LIVE', kind:'unplanned', eventTimeUtc:'2026-09-16T12:30:00Z', affectedAssets:{primary:['EUR/USD'],secondary:['XAU/USD'],context:['DXY']}, revisions:[{revisionNumber:2}], speech:null }, { feedStatus:'SNAPSHOT' });
  assert.equal(req.eventId, 'evt_1');
  assert.equal(req.revisionNumber, 2);
  assert.deepEqual(req.affectedAssets.primary, ['EUR/USD']);
  assert.equal('predictedPips' in req, false);
});
