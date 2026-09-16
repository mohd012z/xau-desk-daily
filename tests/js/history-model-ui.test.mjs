import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAdvanceModelMarkup } from '../../macro/ui/advance-model-view.mjs';

test('empty history renders an explicit insufficient-data state without invented estimates', () => {
  const html = renderAdvanceModelMarkup({state:'INSUFFICIENT_DATA',reason:'NO_EVENT_ALIGNED_HISTORY',sampleCount:0});
  assert.match(html,/INSUFFICIENT DATA/);
  assert.match(html,/NO_EVENT_ALIGNED_HISTORY/);
  assert.doesNotMatch(html,/P50\s+-?\d/);
});

test('ready model renders distribution, confidence, direction frequency and surprise scenarios', () => {
  const html = renderAdvanceModelMarkup({
    state:'READY', modelMode:'ADVANCE', symbol:'EUR/USD', comparableCount:8, effectiveN:6.4,
    distribution:{p10:-18,p25:-10,p50:4,p75:12,p90:22,meanAbsoluteMove:11,positiveFrequency:.625,negativeFrequency:.375},
    priceBand:{p10:1.1822,p25:1.183,p50:1.1844,p75:1.1852,p90:1.1862},
    confidence:{score:72,label:'MODERATE',reasons:['effective sample 6.4']},
    scenarios:[{label:'-1σ',p50:-8,priceCenter:1.1832},{label:'near consensus',p50:4,priceCenter:1.1844},{label:'+1σ',p50:16,priceCenter:1.1856}]
  });
  assert.match(html,/P10/); assert.match(html,/P50/); assert.match(html,/P90/);
  assert.match(html,/62.5%/); assert.match(html,/37.5%/);
  assert.match(html,/MODERATE/); assert.match(html,/near consensus/);
  assert.doesNotMatch(html,/BUY|SELL|stop loss|take profit/i);
});
