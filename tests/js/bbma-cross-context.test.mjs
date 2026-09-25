import test from 'node:test';
import assert from 'node:assert/strict';
import { composeBbmaCrossContext } from '../../macro/temporal/bbma-cross-context.mjs';

const temporal = (state='UP') => ({ id:'2026-09-26:M08', setupId:'M08', state, observedUtc:'2026-09-26T03:30:00.000Z' });
const bbma = (direction='BUY', readiness='CONFIRMABLE') => ({ direction, readiness, effectiveUtc:'2026-09-26T03:00:00.000Z', reasons:['H4_H1_ALIGNED'] });

test('aligned temporal and BBMA evidence is descriptive only',()=>{
 const out=composeBbmaCrossContext(temporal('UP'),bbma('BUY'));
 assert.equal(out.relation,'ALIGNED');
 assert.equal(out.bbma.readiness,'CONFIRMABLE');
 assert.ok(Object.isFrozen(out));
});

test('opposite evidence is COUNTER_STRUCTURE, not automatic reversal',()=>{
 const out=composeBbmaCrossContext(temporal('DOWN'),bbma('BUY'));
 assert.equal(out.relation,'COUNTER_STRUCTURE');
 assert.notEqual(out.relation,'REVERSAL');
});

test('BLOCKED BBMA cannot be upgraded by temporal agreement',()=>{
 const out=composeBbmaCrossContext(temporal('UP'),bbma('BUY','BLOCKED'));
 assert.equal(out.relation,'BLOCKED');
 assert.equal(out.bbma.readiness,'BLOCKED');
});

test('mixed and unknown technical evidence remain explicit',()=>{
 assert.equal(composeBbmaCrossContext(temporal('UP'),bbma('MIXED','WATCHABLE')).relation,'MIXED');
 assert.equal(composeBbmaCrossContext(temporal('UP'),null).relation,'UNKNOWN');
});

test('future HTF/BBMA evidence is rejected to prevent look-ahead',()=>{
 assert.throws(()=>composeBbmaCrossContext(temporal('UP'),{...bbma(),effectiveUtc:'2026-09-26T04:00:00.000Z'}),/future/i);
});

test('does not mutate the supplied BBMA snapshot',()=>{
 const source=bbma('BUY'); const before=structuredClone(source);
 composeBbmaCrossContext(temporal('UP'),source);
 assert.deepEqual(source,before);
});
