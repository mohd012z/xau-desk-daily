import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { scanPaths } from '../tools/rename-audit.mjs';

test('reports repository-coupled runtime URLs with line numbers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'helix-rename-'));
  await writeFile(join(root, 'app.js'), [
    "const ok = 'https://example.com/data.json';",
    "const coupled = 'https://raw.githubusercontent.com/mohd012z/xau-desk-daily/main/data.json';"
  ].join('\n'));

  const findings = await scanPaths(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, 'app.js');
  assert.equal(findings[0].line, 2);
  assert.match(findings[0].pattern, /xau-desk-daily/);
});

test('returns no findings for neutral content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'helix-rename-'));
  await writeFile(join(root, 'app.js'), "const endpoint = 'https://example.com/data.json';\n");
  assert.deepEqual(await scanPaths(root), []);
});

test('can exclude historical/spec documentation from blocking results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'helix-rename-'));
  await mkdir(join(root, 'docs', 'superpowers'), { recursive: true });
  await writeFile(join(root, 'docs', 'superpowers', 'history.md'), 'xau-desk-daily\n');

  const findings = await scanPaths(root, undefined, { ignorePrefixes: ['docs/superpowers/'] });
  assert.deepEqual(findings, []);
});
