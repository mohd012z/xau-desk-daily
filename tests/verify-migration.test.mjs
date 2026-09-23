import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyMigration, CHECKS } from '../tools/verify-migration.mjs';

test('migration verifier passes only when every check passes', async()=>{
  const result=await verifyMigration(async()=>0);
  assert.equal(result.ok,true);
  assert.equal(result.results.length,CHECKS.length);
});

test('one failing child check fails migration', async()=>{
  let count=0;
  const result=await verifyMigration(async()=> (++count===2 ? 1 : 0));
  assert.equal(result.ok,false);
  assert.equal(result.results.filter(r=>r.code!==0).length,1);
});
