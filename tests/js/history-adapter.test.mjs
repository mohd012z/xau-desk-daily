import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHistoryPayload, loadHistory } from '../../macro/adapters/history-adapter.mjs';

const validSample = {
  eventId:'evt-cpi-1', eventType:'CPI', eventTimeUtc:'2026-08-12T12:30:00Z',
  symbol:'EUR/USD', window:'5m', before:1.1670, after:1.1690, sourceQuality:'HIGH'
};

test('history payload keeps valid rows and reports rejected rows', () => {
  const result = normalizeHistoryPayload({schemaVersion:'1.0', generatedAt:'2026-09-16T00:00:00Z', samples:[validSample,{eventId:'bad'}]});
  assert.equal(result.schemaVersion, '1.0');
  assert.equal(result.samples.length, 1);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.samples[0].assetClass, 'fx');
});

test('empty payload is auditable and never invents history', () => {
  const result = normalizeHistoryPayload({schemaVersion:'1.0', generatedAt:null, samples:[]});
  assert.deepEqual(result.samples, []);
  assert.equal(result.rejectedCount, 0);
  assert.equal(result.status, 'EMPTY');
});

test('loadHistory fails closed when the history file is unavailable', async () => {
  const result = await loadHistory({url:'./data/event-history.json', fetchImpl:async()=>({ok:false,status:404,json:async()=>({})})});
  assert.deepEqual(result.samples, []);
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.httpStatus, 404);
});
