import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMacroEvent, normalizeAlertCandidate } from '../../macro/core/contracts.mjs';
import { evaluateDataHealth } from '../../macro/core/data-health.mjs';
import { makeSignalId } from '../../macro/core/identity.mjs';
import { routeAlert } from '../../macro/core/alert-router.mjs';

test('normalized macro + healthy XAU candidate routes only in shadow',()=>{
  const event=normalizeMacroEvent({event_id:'USD-CPI-20260924-2030',timestamp_utc:'2026-09-24T12:30:00.000Z',currency:'USD',title:'CPI',impact:'HIGH',status:'UPCOMING',actual:null,forecast:null,previous:null,evidence_class:'OFFICIAL_RELEASE',source_timestamp:'2026-09-24T12:00:00.000Z',verified:true,freshness:'FRESH'});
  const health=evaluateDataHealth({nowUtc:'2026-09-24T12:31:00.000Z',price:{status:'FRESH',timestamp_utc:'2026-09-24T12:30:30.000Z'},news:{status:'FRESH',timestamp_utc:event.source_timestamp},timeframes:{D1:true,H4:true,H1:true,M30:true,M15:true,M5:true}});
  const signalId=makeSignalId({symbol:'XAUUSD',type:'BBMA_REENTRY',timeframe:'M15',anchorUtc:'2026-09-24T12:31:00.000Z',direction:'BUY'});
  const candidate=normalizeAlertCandidate({signal_id:signalId,symbol:'XAUUSD',type:'BBMA_REENTRY',direction:'BUY',timeframe:'M15',state:'CONFIRMED',priority:'P2',generated_utc:'2026-09-24T12:31:00.000Z',technical:{H4:'BUY',H1:'BUY',M15:'REENTRY'},bbma:{reentry:true},macro:{event_id:event.event_id,risk:'EVENT_APPROACHING'},data_health:health,engine_version:'2.0.0-shadow',rule_version:'phase1'});
  const first=routeAlert({candidate,previous:null,policy:{shadow_mode:true}});
  assert.equal(first.action,'DELIVER'); assert.equal(first.delivery_enabled,false);
  const duplicate=routeAlert({candidate,previous:candidate,policy:{shadow_mode:true}});
  assert.equal(duplicate.action,'SUPPRESS'); assert.equal(duplicate.reason,'UNCHANGED_DUPLICATE');
});
