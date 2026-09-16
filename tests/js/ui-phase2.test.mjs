import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatEventView } from '../../macro/ui/app.mjs';

const html = fs.readFileSync('macro-preview.html','utf8');

test('phase 2 preview exposes event, affected asset, speech and revision surfaces',()=>{
  for (const id of ['event-list','affected-assets','speech-panel','revision-list','event-feed-state']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/PHASE 2/);
});

test('event view keeps provenance and speech stance visible',()=>{
  const v=formatEventView({kind:'unplanned',title:'Fed remarks',eventTimeUtc:'2026-09-16T12:30:00Z',timeSource:'RECEIVED',timeConfidence:'LOW',affectedAssets:{currencies:['USD'],primary:['EUR/USD'],secondary:['XAU/USD'],context:['DXY']},speech:{stance:'HAWKISH',confidence:.8,dimensions:{policyPath:.7}},revisions:[{revisionNumber:1}]});
  assert.equal(v.badge,'UNPLANNED');
  assert.match(v.provenance,/RECEIVED/);
  assert.equal(v.stance,'HAWKISH');
  assert.deepEqual(v.currencies,['USD']);
});
