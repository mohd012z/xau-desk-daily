import test from 'node:test';
import assert from 'node:assert/strict';
import { getBbmaRules } from '../../macro/bbma/rules.mjs';

test('returns immutable named BBMA shadow rule configuration',()=>{
  const rules=getBbmaRules('bbma-shadow-v1');
  assert.equal(rules.version,'bbma-shadow-v1');
  assert.equal(typeof rules.extreme,'object');
  assert.equal(typeof rules.mhv,'object');
  assert.equal(typeof rules.csa,'object');
  assert.equal(typeof rules.reentry,'object');
  assert.equal(typeof rules.momentum,'object');
  assert.equal(Object.isFrozen(rules),true);
  assert.equal(Object.isFrozen(rules.extreme),true);
});

test('pins equality behavior explicitly',()=>{
  const rules=getBbmaRules();
  assert.equal(rules.extreme.bb_touch_inclusive,true);
  assert.equal(rules.csa.close_cross_inclusive,false);
  assert.equal(rules.reentry.zone_touch_inclusive,true);
  assert.equal(rules.momentum.bb_close_inclusive,false);
});

test('rejects unknown rule versions',()=>{
  assert.throws(()=>getBbmaRules('unknown-rules'),TypeError);
});
