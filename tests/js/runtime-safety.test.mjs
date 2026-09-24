import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../macro/ui/runtime-safety.js', import.meta.url), 'utf8');
const pagesWorkflow = fs.readFileSync(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8');

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

test('verified daily snapshot is preserved but normalized to explicit daily-close semantics', () => {
  const external = {
    meta: { verified: true, cadence: 'daily' },
    price: {
      spot: 4400,
      ath: 4500.5,
      note: 'Latest provider daily bar: 2026-09-23; rolling history used: 370 bars'
    }
  };
  const embedded = { price: { spot: 4310.27 } };
  const out = run({ XAUUSD_DATA: external, XAUUSD_EMBEDDED: embedded });
  assert.equal(out.XAUUSD_DATA, external);
  assert.equal(out.XAUUSD_EMBEDDED, embedded);
  assert.equal(external.price.latestDailyClose, 4400);
  assert.equal(external.price.priceType, 'DAILY_CLOSE');
  assert.equal(external.price.rollingHigh, 4500.5);
  assert.equal(external.price.rollingWindowBars, 370);
  assert.equal(external.price.ath, null);
});

test('Pages deployment ships and validates runtime safety with the VEYRA production runtime', () => {
  assert.match(pagesWorkflow, /Deploy VEYRA to GitHub Pages/);
  assert.match(pagesWorkflow, /test -f _site\/macro\/ui\/runtime-safety\.js/);
  assert.match(pagesWorkflow, /grep -q 'VEYRA' _site\/index\.html/);
  assert.doesNotMatch(pagesWorkflow, /Legacy renderer marker not found/);
  assert.doesNotMatch(pagesWorkflow, /var D = window\.XAUUSD_DATA \|\| window\.XAUUSD_EMBEDDED/);
});
