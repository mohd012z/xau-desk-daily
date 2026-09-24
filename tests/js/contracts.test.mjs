import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMacroEvent, normalizeAlertCandidate } from '../../macro/core/contracts.mjs';

const macroInput = () => ({
  event_id: 'USD-CPI-20260924-2030',
  timestamp_utc: '2026-09-24T12:30:00.000Z',
  timestamp_myt: 'WRONG',
  currency: 'USD',
  title: 'CPI',
  impact: 'HIGH',
  status: 'UPCOMING',
  actual: null,
  forecast: '2.8%',
  previous: '2.7%',
  evidence_class: 'OFFICIAL_RELEASE',
  source_timestamp: '2026-09-24T12:00:00.000Z',
  verified: true,
  freshness: 'FRESH',
});

const candidateInput = () => ({
  signal_id: 'XAUUSD-M15-BBMA_REENTRY-BUY-20260924T123000Z-abc12345',
  symbol: 'XAUUSD',
  type: 'BBMA_REENTRY',
  direction: 'BUY',
  timeframe: 'M15',
  state: 'CONFIRMED',
  priority: 'P2',
  generated_utc: '2026-09-24T12:31:00.000Z',
  generated_myt: 'WRONG',
  technical: { score: 91, timeframes: ['M15', 'M30', 'H1'] },
  bbma: { setup: 'REENTRY', evidence: ['M15_REENTRY'] },
  macro: { state: 'NORMAL' },
  data_health: { technical_confirmation_allowed: true, macro_state: 'AVAILABLE' },
  engine_version: 'phase1',
  rule_version: 'bbma-contract-v1',
});

test('normalizeMacroEvent derives MYT centrally and returns the documented contract only', () => {
  const normalized = normalizeMacroEvent({ ...macroInput(), ignored: 'drop-me' });
  assert.deepEqual(Object.keys(normalized), [
    'event_id', 'timestamp_utc', 'timestamp_myt', 'currency', 'title',
    'impact', 'status', 'actual', 'forecast', 'previous',
    'evidence_class', 'source_timestamp', 'verified', 'freshness',
  ]);
  assert.equal(normalized.timestamp_myt, '24 Sep 2026 20:30:00 MYT');
  assert.equal('ignored' in normalized, false);
  assert.equal(Object.isFrozen(normalized), true);
});

test('normalizeAlertCandidate validates direction, derives MYT and isolates nested input', () => {
  const source = candidateInput();
  const normalized = normalizeAlertCandidate(source);
  assert.equal(normalized.generated_myt, '24 Sep 2026 20:31:00 MYT');
  assert.equal(normalized.direction, 'BUY');
  assert.equal(Object.isFrozen(normalized), true);
  source.technical.score = 1;
  assert.equal(normalized.technical.score, 91);

  assert.doesNotThrow(() => normalizeAlertCandidate({ ...candidateInput(), direction: null }));
  assert.throws(() => normalizeAlertCandidate({ ...candidateInput(), direction: 'HOLD' }), TypeError);
});

test('contracts reject malformed timestamps and credential-like keys at any nesting level', () => {
  assert.throws(() => normalizeMacroEvent({ ...macroInput(), timestamp_utc: 'not-a-date' }), TypeError);
  assert.throws(() => normalizeMacroEvent({ ...macroInput(), nested: { github_token: 'x' } }), TypeError);
  assert.throws(() => normalizeAlertCandidate({ ...candidateInput(), technical: { nested: { API_KEY: 'x' } } }), TypeError);
  assert.throws(() => normalizeAlertCandidate({ ...candidateInput(), secret: 'x' }), TypeError);
});
