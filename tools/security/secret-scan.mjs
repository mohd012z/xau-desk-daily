#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP = new Set(['.git','node_modules','dist','build','coverage']);
const RULES = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['service_role', /\b(?:SUPABASE_)?SERVICE_ROLE(?:_KEY)?\s*[:=]\s*["']?([^\s"']{12,})/i],
  ['telegram_token', /\b(?:TELEGRAM_)?BOT_TOKEN\s*[:=]\s*["']?([^\s"']{12,})/i],
  ['generic_secret', /\b(?:API_SECRET|CLIENT_SECRET|PAYMENT_SECRET|WEBHOOK_SECRET)\s*[:=]\s*["']?([^\s"']{12,})/i]
];

function placeholder(line){return /(?:example|placeholder|your[_-]|changeme|fake[_-]?test|dummy|xxxx)/i.test(line);}
export async function scanSecrets(root='.', {includeTests=false}={}) {
  const base=path.resolve(root), findings=[];
  async function walk(current){
    const entries=await fs.readdir(current,{withFileTypes:true});
    for(const entry of entries){
      if(SKIP.has(entry.name)) continue;
      const full=path.join(current,entry.name); const rel=path.relative(base,full).split(path.sep).join('/');
      if(!includeTests && (rel.startsWith('tests/')||rel.startsWith('docs/superpowers/'))) continue;
      if(entry.isDirectory()){await walk(full);continue;}
      if(!entry.isFile()) continue;
      if(entry.name==='.env') findings.push({file:rel,line:1,rule:'committed_env',preview:'[redacted]'});
      let text; try{text=await fs.readFile(full,'utf8');}catch{continue;}
      text.split(/\r?\n/).forEach((lineText,index)=>{
        if(entry.name==='.env.example' && placeholder(lineText)) return;
        for(const [rule,re] of RULES){ if(re.test(lineText) && !placeholder(lineText)) findings.push({file:rel,line:index+1,rule,preview:'[redacted]'}); }
      });
    }
  }
  await walk(base); return findings;
}
async function main(){const f=await scanSecrets(process.argv[2]||'.');if(!f.length){console.log('SECRET SCAN: PASS');return;}console.error('SECRET SCAN: FAIL');for(const x of f)console.error(`${x.file}:${x.line} ${x.rule} [redacted]`);process.exitCode=1;}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
