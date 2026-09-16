import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('macro-preview.html', 'utf8');

test('preview exposes the new product identity and navigation', () => {
  assert.match(html, /MACRO\/\/DESK/);
  assert.match(html, /METALS/);
  assert.match(html, /FX/);
  assert.match(html, /DIGITAL ASSETS/);
  assert.match(html, /EVENTS/);
  assert.match(html, /BRIEF/);
});
