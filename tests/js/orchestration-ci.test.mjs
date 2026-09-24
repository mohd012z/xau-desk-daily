import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/macro-desk-ci.yml', 'utf8');

test('macro CI syntax-checks every orchestration module', () => {
  assert.match(workflow, /for f in macro\/orchestration\/\*\.mjs; do/);
  assert.match(workflow, /node --check "\$f"/);
});

test('orchestration remains covered by push and pull-request path filters', () => {
  const macroPathOccurrences = workflow.match(/- 'macro\/\*\*'/g) ?? [];
  assert.ok(macroPathOccurrences.length >= 2);
});
