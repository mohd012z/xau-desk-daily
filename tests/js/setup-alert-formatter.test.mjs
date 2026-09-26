import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSetupAlert } from '../../macro/temporal/setup-alert-formatter.mjs';

test('M08 is exposed only as Morning Setup',()=>{
 const text=formatSetupAlert({setupId:'M08',state:'UP',relation:'ALIGNED',checkpointState:'TREND_CONTINUING',bbma:{direction:'BUY',readiness:'CONFIRMABLE'},reason:'CLOSE_CONFIRMED'});
 assert.match(text,/Morning Setup/);
 assert.doesNotMatch(text,/M08/);
 assert.match(text,/UP/);
 assert.match(text,/ALIGNED/);
});

test('N20 is exposed only as Night Setup',()=>{
 const text=formatSetupAlert({setupId:'N20',state:'DOWN',relation:'COUNTER_STRUCTURE',bbma:{direction:'BUY',readiness:'WATCHABLE'},reason:'CLOSE_CONFIRMED'});
 assert.match(text,/Night Setup/);
 assert.doesNotMatch(text,/N20/);
 assert.match(text,/COUNTER_STRUCTURE/);
});

test('unknown evidence stays explicit and is never promoted to directional confidence',()=>{
 const text=formatSetupAlert({setupId:'N20',state:'UNRESOLVED',relation:'UNKNOWN',bbma:null,reason:'REFERENCE_MISSING'});
 assert.match(text,/UNRESOLVED/);
 assert.match(text,/UNKNOWN/);
 assert.doesNotMatch(text,/confirmed buy|confirmed sell|\d+%/i);
});

test('opposite/counter structure is not described as automatic reversal',()=>{
 const text=formatSetupAlert({setupId:'N20',state:'DOWN',relation:'COUNTER_STRUCTURE',bbma:{direction:'BUY',readiness:'CONFIRMABLE'},reason:'CLOSE_CONFIRMED'});
 assert.doesNotMatch(text,/confirmed reversal|reversal confirmed/i);
 assert.match(text,/counter/i);
});
