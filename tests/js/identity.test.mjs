import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSignalId, makeAlertId } from '../../macro/core/identity.mjs';

const base={symbol:'XAUUSD',type:'BBMA_REENTRY',timeframe:'M15',anchorUtc:'2026-09-24T06:35:00.000Z',direction:'BUY'};

test('signal IDs are deterministic across reconstructed objects',()=>{
  const a=makeSignalId(base);
  const b=makeSignalId({direction:'BUY',anchorUtc:base.anchorUtc,timeframe:'M15',type:'BBMA_REENTRY',symbol:'XAUUSD'});
  assert.equal(a,b);
  assert.match(a,/^XAUUSD-M15-BBMA_REENTRY-BUY-/);
});

test('semantic changes produce different IDs',()=>{
  assert.notEqual(makeSignalId(base),makeSignalId({...base,direction:'SELL'}));
  assert.notEqual(makeSignalId(base),makeSignalId({...base,timeframe:'M30'}));
});

test('alert ID is deterministic for signal state and version',()=>{
  const signalId=makeSignalId(base);
  assert.equal(makeAlertId({signalId,state:'CONFIRMED',version:'2'}),makeAlertId({version:'2',state:'CONFIRMED',signalId}));
});
