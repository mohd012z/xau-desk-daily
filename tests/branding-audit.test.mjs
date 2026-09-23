import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditBranding } from '../tools/branding-audit.mjs';

test('branding audit accepts VEYRA and legitimate XAU market symbols', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veyra-brand-'));
  const file = path.join(dir, 'page.html');
  fs.writeFileSync(file, '<title>VEYRA</title><div>XAU/USD</div>');
  assert.deepEqual(auditBranding([file]), []);
});

test('branding audit rejects legacy product identity', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veyra-brand-'));
  const file = path.join(dir, 'page.html');
  fs.writeFileSync(file, '<title>XAU//DESK</title>');
  const findings = auditBranding([file]);
  assert.ok(findings.some(f => f.reason === 'missing VEYRA identity'));
  assert.ok(findings.some(f => f.reason === 'legacy product identity remains'));
});
