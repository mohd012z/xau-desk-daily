import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('macro-preview.html', 'utf8');

test('preview exposes the VEYRA Pulse product identity and navigation', () => {
  assert.match(html, /VEYRA/);
  assert.match(html, /Pulse/);
  assert.doesNotMatch(html, /MACRO\/\/DESK/);
  assert.match(html, /METALS/);
  assert.match(html, /FX/);
  assert.match(html, /DIGITAL ASSETS/);
  assert.match(html, /EVENTS/);
  assert.match(html, /BRIEF/);
});
