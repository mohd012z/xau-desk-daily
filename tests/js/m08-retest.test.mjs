import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyM08Retest } from '../../macro/temporal/m08-retest.mjs';

const m08=(state='UP')=>({id:'d:M08',state,reference:{high:105,low:95},observedUtc:'2026-09-26T01:00:00Z'});
const c=(openUtc,open,high,low,close)=>({openUtc,open,high,low,close});
const policy={mode:'absolute',value:1,holdCloses:1};

test('separates retest touch from no retest',()=>{
 const out=classifyM08Retest(m08('UP'),[c('2026-09-26T02:00:00Z',108,109,104.5,106)],policy);
 assert.equal(out.touched,true);
});

test('UP retest holds when close remains above versioned zone',()=>{
 const out=classifyM08Retest(m08('UP'),[c('2026-09-26T02:00:00Z',108,109,104.5,106)],policy);
 assert.equal(out.state,'M08_RETEST_HOLD');
});

test('UP retest fails on close through lower tolerance boundary',()=>{
 const out=classifyM08Retest(m08('UP'),[c('2026-09-26T02:00:00Z',106,107,102,103)],policy);
 assert.equal(out.state,'M08_RETEST_FAIL');
});

test('failed retest becomes reversal transition only with independent opposite BBMA HTF transition',()=>{
 const out=classifyM08Retest(m08('UP'),[c('2026-09-26T02:00:00Z',106,107,102,103)],policy,{relation:'COUNTER_STRUCTURE',bbma:{direction:'SELL',readiness:'CONFIRMABLE'}});
 assert.equal(out.state,'M08_REVERSAL_TRANSITION');
});

test('no hidden tolerance: missing policy is rejected',()=>{
 assert.throws(()=>classifyM08Retest(m08(),[],null),/policy/);
});
