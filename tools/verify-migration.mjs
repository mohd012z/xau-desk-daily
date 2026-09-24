#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CHECKS = Object.freeze([
  ['rename','tools/rename-audit.mjs'],
  ['endpoint','tools/endpoint-audit.mjs'],
  ['secrets','tools/security/secret-scan.mjs']
]);

export function runCommand(command,args,spawnImpl=spawn){
  return new Promise(resolve=>{
    const child=spawnImpl(command,args,{stdio:'inherit'});
    child.on('error',()=>resolve(1));
    child.on('close',code=>resolve(code??1));
  });
}

export async function verifyMigration(run=runCommand){
  const results=[];
  for(const [name,script] of CHECKS){
    const code=await run(process.execPath,[script]);
    results.push({name,code});
  }
  const ok=results.every(r=>r.code===0);
  return {ok,results};
}

async function main(){
  const result=await verifyMigration();
  for(const r of result.results) console.log(`${r.name.toUpperCase()}: ${r.code===0?'PASS':'FAIL'}`);
  console.log(`HELIX/VEYRA MIGRATION: ${result.ok?'PASS':'FAIL'}`);
  if(!result.ok) process.exitCode=1;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
