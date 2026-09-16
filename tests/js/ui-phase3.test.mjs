import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('macro-preview.html','utf8');
const app = fs.readFileSync('macro/ui/app.mjs','utf8');

test('Phase 3 preview exposes MYT Trade Plan surface and stylesheet',()=>{
  assert.match(html,/href="\.\/macro\/ui\/phase3\.css"/);
  assert.match(html,/id="trade-plan-section"/);
  assert.match(html,/id="trade-plan-host"/);
  assert.match(html,/MYT EVENT TRADE PLAN/);
  assert.match(html,/PHASE 3/);
  assert.match(html,/Phase 3 preview/);
});

test('desktop navigation includes PLAN and mobile order is PLAN EVENTS FX METALS MORE',()=>{
  assert.match(html,/class="nav-item" data-view="PLAN">PLAN<\/button>/);
  const nav = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] ?? '';
  const views = [...nav.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(views,['PLAN','EVENTS','FX','METALS','MORE']);
});

test('historical model has a real runtime host instead of a static placeholder',()=>{
  assert.match(html,/id="history-model-host"/);
  assert.match(html,/id="history-data-status"/);
  assert.match(html,/Comparable event distribution/);
  assert.match(html,/Advance scenarios/);
});

test('runtime loads history once and connects it to the advance model and Trade Plan',()=>{
  assert.match(app,/loadHistory/);
  assert.match(app,/buildAdvanceModel/);
  assert.match(app,/renderAdvanceModelMarkup/);
  assert.match(app,/mergeAdvanceModelOverrides/);
  assert.match(app,/macrodesk:event-update/);
});

test('Phase 3 preview still declares production index unchanged',()=>{
  assert.match(html,/production index unchanged/);
});
