import test from 'node:test';
import assert from 'node:assert/strict';
import { auditEndpoint, ENDPOINTS } from '../config/endpoints.mjs';

test('endpoint groups are centralized', () => {
  assert.deepEqual(Object.keys(ENDPOINTS).sort(), ['config','history','live','pulse']);
});

test('neutral HTTPS endpoint is accepted', () => {
  assert.deepEqual(auditEndpoint('https://api.example.test/feed'), { ok: true, reasons: [] });
});

test('remote HTTP is rejected', () => {
  assert.equal(auditEndpoint('http://example.test/feed').ok, false);
  assert.ok(auditEndpoint('http://example.test/feed').reasons.includes('https_required'));
});

test('localhost HTTP is allowed only when explicitly requested', () => {
  assert.equal(auditEndpoint('http://localhost:8080/feed').ok, false);
  assert.equal(auditEndpoint('http://localhost:8080/feed', { allowLocalhost: true }).ok, true);
});

test('embedded credentials are rejected', () => {
  const result = auditEndpoint('https://user:pass@example.test/feed');
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('embedded_credentials'));
});

test('legacy raw GitHub runtime coupling is flagged', () => {
  const result = auditEndpoint('https://raw.githubusercontent.com/mohd012z/xau-desk-daily/main/data.json');
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('legacy_repository_coupling'));
});
