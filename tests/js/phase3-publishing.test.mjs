import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('public event history dataset exists and starts empty rather than synthetic',()=>{
  assert.equal(fs.existsSync('data/event-history.json'),true);
  const payload=JSON.parse(fs.readFileSync('data/event-history.json','utf8'));
  assert.equal(payload.schemaVersion,'1.0');
  assert.equal(payload.generatedAt,null);
  assert.deepEqual(payload.samples,[]);
});

test('Phase 3 CI checks recovered history modules, adapter, UI and dataset JSON',()=>{
  const yml=fs.readFileSync('.github/workflows/macro-phase3-ci.yml','utf8');
  for(const path of [
    'macro/adapters/history-adapter.mjs','macro/history/advance-model.mjs','macro/history/similarity.mjs',
    'macro/history/distribution.mjs','macro/history/scenarios.mjs','macro/ui/advance-model-view.mjs'
  ]) assert.match(yml,new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(yml,/data\/event-history\.json/);
});

test('Pages workflow publishes the event-history dataset',()=>{
  const yml=fs.readFileSync('.github/workflows/pages.yml','utf8');
  assert.match(yml,/'data\/\*\*'/);
  assert.match(yml,/cp -R data _site\/data/);
});
