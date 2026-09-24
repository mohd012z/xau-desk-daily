import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMacroEvent, normalizeAlertCandidate } from '../../macro/core/contracts.mjs';

test('normalizes macro event and derives MYT from canonical UTC', () => {
  const event = normalizeMacroEvent({
    event_id: 'USD-CPI-20260924-2030', timestamp_utc: '2026-09-24T12:30:00.000Z',
    timestamp_myt: 'WRONG', currency: 'USD', title: 'CPI', impact: 'HIGH', status: 'UPCOMING',
    actual: null, forecast: '2.8%', previous: '2.7%', evidence_class: 'OFFICIAL_RELEASE',
    source_timestamp: '2026-09-24T12:00:00.000Z', verified: true, freshness: 'FRESH'
  });
  assert.equal(event.timestamp_myt, '24 Sep 2026 20:30:00 MYT');
  assert.equal(event.currency, 'USD');
});

test('normalizes alert candidate and validates direction', () => {
  const candidate = normalizeAlertCandidate({
    signal_id: 'XAUUSD-M15-BBMA_REENTRY-BUY-20260924T143500Z', symbol: 'XAUUSD',
    type: 'BBMA_REENTRY', direction: 'BUY', timeframe: 'M15', state: 'CONFIRMED', priority: 'P2',
    generated_utc: '2026-09-24T06:35:00.000Z', technical: {}, bbma: {}, macro: {}, data_health: {},
    engine_version: '2.0.0-shadow', rule_version: 'phase1'
  });
  assert.equal(candidate.generated_myt, '24 Sep 2026 14:35:00 MYT');
  assert.equal(candidate.direction, 'BUY');
  assert.throws(() => normalizeAlertCandidate({ ...candidate, direction: 'UP' }), TypeError);
});

test('rejects credential-like keys recursively', () => {
  const base = {
    event_id: 'E1', timestamp_utc: '2026-09-24T12:30:00.000Z', currency: 'USD', title: 'Event',
    impact: 'HIGH', status: 'UPCOMING', actual: null, forecast: null, previous: null,
    evidence_class: 'OFFICIAL_RELEASE', source_timestamp: '2026-09-24T12:00:00.000Z', verified: true, freshness: 'FRESH'
  };
  for (const key of ['telegram_bot_token', 'github_token', 'api_key', 'android_signing_password', 'secret']) {
    assert.throws(() => normalizeMacroEvent({ ...base, nested: { [key]: 'do-not-accept' } }), TypeError);
  }
});
