import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMacroEvent, normalizeAlertCandidate } from '../../macro/core/contracts.mjs';
import { evaluateDataHealth } from '../../macro/core/data-health.mjs';
import { makeSignalId } from '../../macro/core/identity.mjs';
import { routeAlert } from '../../macro/core/alert-router.mjs';

test('Phase 1 normalizes evidence, gates health, creates stable identity and routes in shadow mode', () => {
  const event = normalizeMacroEvent({
    event_id: 'USD-CPI-20260924-2030',
    timestamp_utc: '2026-09-24T12:30:00.000Z',
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

  const health = evaluateDataHealth({
    nowUtc: '2026-09-24T12:31:00.000Z',
    price: { status: 'FRESH', timestamp_utc: '2026-09-24T12:30:30.000Z' },
    news: { status: 'FRESH', timestamp_utc: event.timestamp_utc },
    timeframes: { D1: true, H4: true, H1: true, M30: true, M15: true, M5: true },
  });

  const signalId = makeSignalId({
    symbol: 'XAUUSD', type: 'BBMA_REENTRY', timeframe: 'M15',
    anchorUtc: '2026-09-24T12:30:00.000Z', direction: 'BUY',
  });

  const candidate = normalizeAlertCandidate({
    signal_id: signalId,
    symbol: 'XAUUSD',
    type: 'BBMA_REENTRY',
    direction: 'BUY',
    timeframe: 'M15',
    state: 'CONFIRMED',
    priority: 'P2',
    generated_utc: '2026-09-24T12:31:00.000Z',
    technical: { score: 91, timeframes: ['M15', 'M30', 'H1'] },
    bbma: { setup: 'REENTRY', evidence: ['M15_REENTRY'] },
    macro: { state: 'NORMAL', event_id: event.event_id },
    data_health: health,
    engine_version: 'phase1',
    rule_version: 'v1',
  });

  const first = routeAlert({ candidate, previous: null, policy: { shadow_mode: true } });
  assert.equal(first.action, 'DELIVER');
  assert.equal(first.delivery_enabled, false);

  const duplicate = routeAlert({ candidate, previous: JSON.parse(JSON.stringify(candidate)), policy: { shadow_mode: true } });
  assert.equal(duplicate.action, 'SUPPRESS');
  assert.equal(duplicate.reason, 'UNCHANGED_DUPLICATE');
  assert.equal(duplicate.delivery_enabled, false);
});
