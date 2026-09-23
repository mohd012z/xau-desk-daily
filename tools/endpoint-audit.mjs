#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditEndpoint } from '../config/endpoints.mjs';

const URL_RE = /https?:\/\/[^\s"'<>`)]+/g;
const SKIP = new Set(['.git','node_modules','dist','build','coverage']);

export async function scanEndpointFiles(root='.') {
  const findings=[];
  async function walk(current) {
    const entries=await fs.readdir(current,{withFileTypes:true});
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const full=path.join(current,entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.isFile()) continue;
      let text; try { text=await fs.readFile(full,'utf8'); } catch { continue; }
      text.split(/\r?\n/).forEach((lineText,index)=>{
        for (const match of lineText.matchAll(URL_RE)) {
          const result=auditEndpoint(match[0]);
          if (!result.ok) findings.push({file:path.relative(root,full).split(path.sep).join('/'),line:index+1,url:match[0],reasons:result.reasons});
        }
      });
    }
  }
  await walk(path.resolve(root));
  return findings;
}

async function main(){
  const findings=await scanEndpointFiles(process.argv[2]||'.');
  if(!findings.length){console.log('ENDPOINT AUDIT: PASS');return;}
  console.error('ENDPOINT AUDIT: FAIL');
  for(const f of findings) console.error(`${f.file}:${f.line} ${f.reasons.join(',')} ${f.url}`);
  process.exitCode=1;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href) main().catch(e=>{console.error(e.message);process.exitCode=1;});
