import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAlert } from '../../macro/core/alert-router.mjs';

const candidate={signal_id:'S1',state:'CONFIRMED',priority:'P2',engine_version:'2.0',rule_version:'r1',data_health:{technical_confirmation_allowed:true}};

test('first confirmed candidate is logically deliverable',()=>{
  const r=routeAlert({candidate,previous:null,policy:{shadow_mode:false}});
  assert.equal(r.action,'DELIVER'); assert.equal(r.delivery_enabled,true);
});

test('unchanged duplicate is suppressed',()=>{
  const r=routeAlert({candidate,previous:{signal_id:'S1',state:'CONFIRMED',engine_version:'2.0',rule_version:'r1'},policy:{}});
  assert.equal(r.action,'SUPPRESS'); assert.equal(r.reason,'UNCHANGED_DUPLICATE');
});

test('state change is an update',()=>{
  const r=routeAlert({candidate,previous:{signal_id:'S1',state:'SETUP',engine_version:'2.0',rule_version:'r1'},policy:{}});
  assert.equal(r.action,'UPDATE');
});

test('stale technical health blocks confirmed delivery',()=>{
  const r=routeAlert({candidate:{...candidate,data_health:{technical_confirmation_allowed:false}},previous:null,policy:{}});
  assert.equal(r.action,'SUPPRESS'); assert.equal(r.reason,'DATA_HEALTH_BLOCK');
});

test('shadow mode computes action but disables external delivery',()=>{
  const r=routeAlert({candidate,previous:null,policy:{shadow_mode:true}});
  assert.equal(r.action,'DELIVER'); assert.equal(r.delivery_enabled,false);
});
