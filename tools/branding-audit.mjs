#!/usr/bin/env node
import fs from 'node:fs';

export function auditBranding(files = ['index.html', 'macro-preview.html']) {
  const findings = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      findings.push({ file, reason: 'missing' });
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    if (!/VEYRA/.test(text)) findings.push({ file, reason: 'missing VEYRA identity' });
    if (/XAU\/\/DESK|XAU-DESK|MACRO\/\/DESK|MACRO DESK/.test(text)) findings.push({ file, reason: 'legacy product identity remains' });
  }
  return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = auditBranding();
  if (findings.length) {
    console.error('BRANDING AUDIT: FAIL');
    for (const finding of findings) console.error(`${finding.file}: ${finding.reason}`);
    process.exitCode = 1;
  } else {
    console.log('BRANDING AUDIT: PASS');
  }
}
