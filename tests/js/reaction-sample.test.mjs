import test from 'node:test';import assert from 'node:assert/strict';import {buildReactionSample} from '../../macro/history/reaction-sample.mjs';
test('builds signed EURUSD pips',()=>{const r=buildReactionSample({symbol:'EUR/USD',before:1.1000,after:1.0985,high:1.1005,low:1.0980});assert.equal(r.signedMove,-15);assert.equal(r.reaction.rangePips,25)});
test('uses JPY pip metadata',()=>{const r=buildReactionSample({symbol:'USD/JPY',before:150.00,after:150.25});assert.equal(r.signedMove,25)});
test('uses percent movement for XAU and digital history model',()=>{const x=buildReactionSample({symbol:'XAU/USD',before:2000,after:1980});const b=buildReactionSample({symbol:'BTC/USD',before:100000,after:99000});assert.equal(x.signedMove,-1);assert.equal(b.signedMove,-1)});
