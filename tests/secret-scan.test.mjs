import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanSecrets } from '../tools/security/secret-scan.mjs';

test('detects synthetic secret and redacts output', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'veyra-secret-'));
  try {
    await writeFile(path.join(root,'config.txt'),'SERVICE_ROLE_KEY=synthetic_secret_value_123456\n');
    const findings=await scanSecrets(root,{includeTests:true});
    assert.equal(findings.length,1);
    assert.equal(findings[0].rule,'service_role');
    assert.equal(findings[0].preview,'[redacted]');
    assert.doesNotMatch(JSON.stringify(findings),/synthetic_secret_value/);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('allows placeholder values in env example', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'veyra-env-'));
  try {
    await writeFile(path.join(root,'.env.example'),'SERVICE_ROLE_KEY=your_placeholder_value\n');
    assert.deepEqual(await scanSecrets(root,{includeTests:true}),[]);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('flags committed .env file', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'veyra-env-real-'));
  try {
    await writeFile(path.join(root,'.env'),'SAFE_SETTING=true\n');
    const findings=await scanSecrets(root,{includeTests:true});
    assert.ok(findings.some(f=>f.rule==='committed_env'));
  } finally { await rm(root,{recursive:true,force:true}); }
});
