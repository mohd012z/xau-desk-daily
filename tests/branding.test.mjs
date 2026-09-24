import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const file of ['index.html', 'macro-preview.html']) {
  test(`${file} presents VEYRA without obsolete desk branding`, async () => {
    const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(html, /VEYRA/);
    assert.doesNotMatch(html, /XAU\/\/DESK|XAU-DESK|MACRO\/\/DESK|MACRO DESK/);
  });
}

test('legitimate market symbols remain allowed after branding migration', async () => {
  const html = await readFile(new URL('../macro-preview.html', import.meta.url), 'utf8');
  assert.match(html, /XAU\/USD/);
});
