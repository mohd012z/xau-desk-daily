import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBbmaConfluence } from '../../macro/bbma/confluence.mjs';

const ORDER = ['D1','H4','H1','M30','M15','M5'];
const tf = (timeframe, direction='NEUTRAL', status='OK') => ({ timeframe, direction, status, observations: [] });
const evidence = (overall_state, dirs={}, status='OK') => ({
  engine:'BBMA_MTF', rule_version:'bbma-shadow-v1', overall_state, status,
  timeframes: ORDER.map(k => tf(k, dirs[k] ?? 'NEUTRAL', dirs[k] === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'OK')),
  buy_support: ORDER.filter(k => dirs[k] === 'BUY'), sell_support: ORDER.filter(k => dirs[k] === 'SELL'), conflicts: []
});

test('aligned BUY matures through explicit readiness requirements', () => {
  assert.equal(evaluateBbmaConfluence({ evidence: evidence('ALIGNED_BUY',{H4:'BUY'}) }).readiness, 'OBSERVED');
  assert.equal(evaluateBbmaConfluence({ evidence: evidence('ALIGNED_BUY',{H4:'BUY',M30:'BUY'}) }).readiness, 'WATCHABLE');
  assert.equal(evaluateBbmaConfluence({ evidence: evidence('ALIGNED_BUY',{H4:'BUY',H1:'BUY',M15:'BUY'}) }).readiness, 'SETUP_READY');
  const out = evaluateBbmaConfluence({ evidence: evidence('ALIGNED_BUY',{D1:'BUY',H4:'BUY',H1:'BUY',M15:'BUY',M5:'BUY'}) });
  assert.equal(out.direction,'BUY'); assert.equal(out.readiness,'CONFIRMABLE');
  assert.deepEqual(out.supporting_timeframes,['D1','H4','H1','M15','M5']);
  assert.equal(Object.isFrozen(out),true); assert.equal(Object.isFrozen(out.reason_codes),true);
});

test('SELL follows the same deterministic contract', () => {
  const out = evaluateBbmaConfluence({ evidence: evidence('ALIGNED_SELL',{D1:'SELL',H4:'SELL',H1:'SELL',M15:'SELL',M5:'SELL'}) });
  assert.equal(out.direction,'SELL'); assert.equal(out.readiness,'CONFIRMABLE');
});

test('mixed, incomplete and neutral evidence cannot confirm', () => {
  assert.equal(evaluateBbmaConfluence({ evidence: evidence('MIXED',{H4:'BUY',H1:'SELL'}) }).readiness,'BLOCKED');
  assert.equal(evaluateBbmaConfluence({ evidence: evidence('INCOMPLETE',{H4:'BUY',M15:'BUY'},'INCOMPLETE') }).readiness,'BLOCKED');
  assert.equal(evaluateBbmaConfluence({ evidence: evidence('NEUTRAL',{}) }).readiness,'OBSERVED');
});

test('D1 disagreement remains explicit and blocks confirmation', () => {
  const out = evaluateBbmaConfluence({ evidence: evidence('MIXED',{D1:'SELL',H4:'BUY',H1:'BUY',M15:'BUY',M5:'BUY'}) });
  assert.equal(out.readiness,'BLOCKED');
  assert.ok(out.conflict_timeframes.includes('D1'));
  assert.ok(out.reason_codes.includes('HIGHER_TIMEFRAME_CONFLICT'));
});
