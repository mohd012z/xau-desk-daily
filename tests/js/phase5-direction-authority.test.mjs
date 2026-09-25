import test from 'node:test';
import assert from 'node:assert/strict';
import { composeNewsShadowObservation } from '../../macro/bbma/news-shadow-observation.mjs';

const at = '2026-09-25T14:00:00.000Z';
const health = Object.freeze({ reasons: [], technical_confirmation_allowed: true, macro_state: 'AVAILABLE' });
const lifecycle = Object.freeze({ action: 'HOLD', reason: 'NO_LEGAL_PROGRESS', signal: { state: 'SETUP' } });

function candidate(direction, readiness = 'CONFIRMABLE') {
  return Object.freeze({
    symbol: 'XAUUSD',
    direction,
    readiness,
    state: 'SETUP',
    supporting_timeframes: ['H4', 'H1', 'M15', 'M5'],
    conflict_timeframes: [],
    reason_codes: direction === 'BUY' || direction === 'SELL' ? [`DIRECTION_${direction}`] : ['NO_DIRECTION']
  });
}

function observation({ direction, gateState, macroState = 'WATCH_ONLY', macroReasons = [] }) {
  return composeNewsShadowObservation({
    candidate: candidate(direction),
    macroObservation: { state: macroState, event_refs: ['evt-1'], reason_codes: macroReasons },
    dataHealth: health,
    gate: { state: gateState, reason_codes: [`MACRO_${gateState}`] },
    lifecycle,
    generatedUtc: at
  });
}

test('BBMA BUY remains BUY when macro gate allows confirmation', () => {
  const o = observation({ direction: 'BUY', gateState: 'ALLOW', macroState: 'CLEAR' });
  assert.equal(o.direction, 'BUY');
  assert.equal(o.gate.state, 'ALLOW');
});

test('BBMA BUY remains BUY when macro blocks confirmation', () => {
  const o = observation({ direction: 'BUY', gateState: 'BLOCK', macroState: 'BLOCK', macroReasons: ['HIGH_IMPACT_ACTIVE'] });
  assert.equal(o.direction, 'BUY');
  assert.equal(o.gate.state, 'BLOCK');
  assert.notEqual(o.direction, 'SELL');
});

test('BBMA SELL remains SELL under conflicting bullish macro context', () => {
  const o = observation({ direction: 'SELL', gateState: 'WATCH_ONLY', macroState: 'WATCH_ONLY', macroReasons: ['BULLISH_MACRO_CONTEXT'] });
  assert.equal(o.direction, 'SELL');
  assert.equal(o.gate.state, 'WATCH_ONLY');
  assert.notEqual(o.direction, 'BUY');
});

test('non-directional BBMA evidence cannot be manufactured into BUY by bullish news/macro', () => {
  const o = observation({ direction: 'NONE', gateState: 'ALLOW', macroState: 'CLEAR', macroReasons: ['BULLISH_MACRO_CONTEXT'] });
  assert.equal(o.direction, 'NONE');
  assert.notEqual(o.direction, 'BUY');
  assert.notEqual(o.direction, 'SELL');
});

test('mixed BBMA evidence remains non-directional under permissive macro context', () => {
  const o = observation({ direction: 'MIXED', gateState: 'ALLOW', macroState: 'CLEAR', macroReasons: ['BULLISH_MACRO_CONTEXT'] });
  assert.equal(o.direction, 'MIXED');
  assert.notEqual(o.direction, 'BUY');
  assert.notEqual(o.direction, 'SELL');
});
