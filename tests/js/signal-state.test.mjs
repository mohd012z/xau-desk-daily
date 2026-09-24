import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, transitionSignal } from '../../macro/core/signal-state.mjs';

test('allows designed lifecycle',()=>{
  for(const [a,b] of [['DETECTED','WATCH'],['WATCH','SETUP'],['SETUP','CONFIRMED'],['CONFIRMED','ACTIVE'],['ACTIVE','INVALIDATED'],['ACTIVE','EXPIRED']]) assert.equal(canTransition(a,b),true);
});

test('rejects illegal jumps and terminal revival',()=>{
  for(const [a,b] of [['DETECTED','ACTIVE'],['INVALIDATED','CONFIRMED'],['EXPIRED','ACTIVE']]) assert.equal(canTransition(a,b),false);
});

test('transition requires explicit UTC time and reason and appends immutable history',()=>{
  const signal={signal_id:'S1',state:'DETECTED',history:[]};
  const next=transitionSignal(signal,'WATCH','2026-09-24T06:35:00.000Z','Extreme detected; monitoring confirmation');
  assert.equal(next.state,'WATCH');
  assert.equal(next.history.length,1);
  assert.equal(signal.history.length,0);
  assert.throws(()=>transitionSignal(signal,'WATCH',undefined,'reason'),TypeError);
  assert.throws(()=>transitionSignal(signal,'WATCH','2026-09-24T06:35:00.000Z',''),TypeError);
});
