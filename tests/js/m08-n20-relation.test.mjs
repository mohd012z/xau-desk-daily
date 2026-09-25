import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyM08N20Relation } from '../../macro/temporal/m08-n20-relation.mjs';

const e = (id, state) => ({ id, state, observedUtc: '2026-09-26T12:30:00Z' });

test('same direction is descriptive alignment', () => {
  assert.equal(classifyM08N20Relation(e('m','UP'), e('n','UP')).relation, 'SAME_DIRECTION');
  assert.equal(classifyM08N20Relation(e('m','DOWN'), e('n','DOWN')).relation, 'SAME_DIRECTION');
});

test('opposite N20 is not automatically reversal', () => {
  const out = classifyM08N20Relation(e('m','UP'), e('n','DOWN'));
  assert.equal(out.relation, 'OPPOSITE_DIRECTION');
  assert.notEqual(out.relation, 'REVERSAL');
});

test('range and unresolved evidence stay explicit', () => {
  assert.equal(classifyM08N20Relation(e('m','UP'), e('n','WAIT')).relation, 'N20_RANGE');
  assert.equal(classifyM08N20Relation(e('m','UNRESOLVED'), e('n','UP')).relation, 'M08_UNRESOLVED');
  assert.equal(classifyM08N20Relation(e('m','UP'), null).relation, 'N20_UNRESOLVED');
});
