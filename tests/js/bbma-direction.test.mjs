import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveBbmaDirection } from '../../macro/bbma/direction.mjs';

const map = (buy=[], sell=[], unavailable=[], conflict=[]) => ({
  rule_version: 'bbma-shadow-v1',
  timeframes: {},
  alignment: {
    buy_timeframes: buy,
    sell_timeframes: sell,
    unavailable_timeframes: unavailable,
    conflict_timeframes: conflict,
  },
});

test('BBMA alone may resolve one-sided observed direction evidence', () => {
  const r = deriveBbmaDirection(map(['D1','H4','H1'], [], ['M5'], []));
  assert.equal(r.direction, 'BUY');
  assert.equal(r.status, 'RESOLVED');
  assert.equal(r.source, 'BBMA_ONLY');
  assert.deepEqual(r.supporting_timeframes, ['D1','H4','H1']);
  assert.equal(r.news_influence, 'NONE');
});

test('opposing BBMA timeframe evidence remains mixed rather than forced', () => {
  const r = deriveBbmaDirection(map(['H4','M15'], ['H1'], [], []));
  assert.equal(r.direction, null);
  assert.equal(r.status, 'MIXED');
  assert.deepEqual(r.buy_timeframes, ['H4','M15']);
  assert.deepEqual(r.sell_timeframes, ['H1']);
});

test('detector conflict blocks direction resolution', () => {
  const r = deriveBbmaDirection(map(['H4'], [], [], ['H4']));
  assert.equal(r.direction, null);
  assert.equal(r.status, 'CONFLICT');
  assert.deepEqual(r.conflict_timeframes, ['H4']);
});

test('absence of directional evidence is explicit and non-actionable', () => {
  const r = deriveBbmaDirection(map([], [], ['D1','H4','H1','M30','M15','M5'], []));
  assert.equal(r.direction, null);
  assert.equal(r.status, 'UNRESOLVED');
  assert.equal('entry' in r, false);
  assert.equal('stop_loss' in r, false);
  assert.equal('take_profit' in r, false);
  assert.equal('lot_size' in r, false);
});

test('news or macro input cannot be supplied to BBMA direction resolver', () => {
  assert.throws(
    () => deriveBbmaDirection(map(['H4'], [], [], []), { news: [{ impact:'HIGH' }] }),
    /BBMA direction accepts technical timeframe evidence only/
  );
});
