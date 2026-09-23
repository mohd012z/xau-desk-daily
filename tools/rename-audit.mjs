import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_PATTERNS = Object.freeze([
  'raw.githubusercontent.com/mohd012z/xau-desk-daily',
  'mohd012z/xau-desk-daily',
  'xau-desk-daily'
]);

const DEFAULT_IGNORES = ['.git/', 'node_modules/', '.superpowers/'];

function normalized(path) {
  return path.split(sep).join('/');
}

function ignored(rel, prefixes) {
  return prefixes.some((prefix) => rel === prefix.replace(/\/$/, '') || rel.startsWith(prefix));
}

async function walk(root, current, prefixes, out) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(current, entry.name);
    const rel = normalized(relative(root, full));
    if (ignored(rel, prefixes)) continue;
    if (entry.isDirectory()) await walk(root, full, prefixes, out);
    else if (entry.isFile()) out.push({ full, rel });
  }
}

function looksBinary(buffer) {
  const limit = Math.min(buffer.length, 4096);
  for (let i = 0; i < limit; i += 1) if (buffer[i] === 0) return true;
  return false;
}

export async function scanPaths(root = '.', patterns = DEFAULT_PATTERNS, options = {}) {
  const absoluteRoot = resolve(root);
  const info = await stat(absoluteRoot);
  const prefixes = [...DEFAULT_IGNORES, ...(options.ignorePrefixes ?? [])];
  const files = [];
  if (info.isDirectory()) await walk(absoluteRoot, absoluteRoot, prefixes, files);
  else files.push({ full: absoluteRoot, rel: normalized(relative(process.cwd(), absoluteRoot)) });

  const findings = [];
  for (const { full, rel } of files) {
    const buffer = await readFile(full);
    if (looksBinary(buffer)) continue;
    const lines = buffer.toString('utf8').split(/\r?\n/);
    lines.forEach((lineText, index) => {
      for (const pattern of patterns) {
        if (lineText.includes(pattern)) findings.push({ file: rel, pattern, line: index + 1 });
      }
    });
  }
  return findings;
}

async function main() {
  const target = process.argv[2] ?? '.';
  const findings = await scanPaths(target, DEFAULT_PATTERNS, {
    ignorePrefixes: ['docs/superpowers/']
  });
  if (!findings.length) {
    console.log('HELIX rename audit: PASS');
    return;
  }
  console.error('HELIX rename audit: FAIL');
  for (const finding of findings) console.error(`${finding.file}:${finding.line} ${finding.pattern}`);
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`HELIX rename audit error: ${error.message}`);
    process.exitCode = 1;
  });
}
