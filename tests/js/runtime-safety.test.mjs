import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../macro/ui/runtime-safety.js', import.meta.url), 'utf8');

function run(windowState = {}) {
  const sandbox = { window: windowState };
  vm.runInNewContext(source, sandbox, { filename: 'runtime-safety.js' });
  return sandbox.window;
}

test('missing verified snapshot neutralizes stale embedded market content', () => {
  const out = run({
    XAUUSD_EMBEDDED: {
      updated: '2026-09-16',
      price: { spot: 4310.27 },
      news: [{ title: 'stale headline' }]
    }
  });
  assert.equal(out.XAUUSD_EMBEDDED.meta.verified, false);
  assert.equal(out.XAUUSD_EMBEDDED.price.spot, null);
  assert.equal(out.XAUUSD_EMBEDDED.price.priceType, 'UNAVAILABLE');
  assert.deepEqual(Array.from(out.XAUUSD_EMBEDDED.news), []);
  assert.equal(out.XAUUSD_EMBEDDED.session, 'DATA UNAVAILABLE — verified snapshot did not load');
});

test('verified external snapshot is never replaced', () => {
  const external = { meta: { verified: true }, price: { latestDailyClose: 4400 } };
  const embedded = { price: { spot: 4310.27 } };
  const out = run({ XAUUSD_DATA: external, XAUUSD_EMBEDDED: embedded });
  assert.equal(out.XAUUSD_DATA, external);
  assert.equal(out.XAUUSD_EMBEDDED, embedded);
});
