import { dueScheduleEvents } from './scheduler.mjs';
import { createEventBus } from './event-bus.mjs';
import { createBotRegistry } from './bot-registry.mjs';

const FORBIDDEN_LIVE_SERVICES = new Set(['telegram', 'apk', 'delivery', 'broker', 'trade']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function validateShadowContext(context) {
  requireObject(context, 'context');
  if (context.shadow_mode === false) throw new TypeError('Phase 2 runner is shadow-only');
  if (context.services !== undefined) {
    requireObject(context.services, 'context.services');
    for (const key of Object.keys(context.services)) {
      if (FORBIDDEN_LIVE_SERVICES.has(key.trim().toLowerCase())) {
        throw new TypeError(`live service '${key}' is not allowed in shadow mode`);
      }
    }
  }
}

function validateState(state) {
  requireObject(state, 'state');
  for (const method of ['lastSlotByJob', 'recordJobSlot', 'recordBotRun', 'recordDeliveryIntent', 'snapshot']) {
    if (typeof state[method] !== 'function') throw new TypeError(`state.${method} must be a function`);
  }
}

function normalizeBotResult(value) {
  if (value === undefined || value === null) return { emitted_events:[], delivery_intents:[], metadata:{} };
  requireObject(value, 'bot result');
  const emittedEvents = value.emitted_events ?? [];
  const deliveryIntents = value.delivery_intents ?? [];
  const metadata = value.metadata ?? {};
  if (!Array.isArray(emittedEvents)) throw new TypeError('bot result.emitted_events must be an array');
  if (!Array.isArray(deliveryIntents)) throw new TypeError('bot result.delivery_intents must be an array');
  requireObject(metadata, 'bot result.metadata');
  return { emitted_events:emittedEvents, delivery_intents:deliveryIntents, metadata };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

export async function runShadowTick({ jobs, bots, state, nowUtc, context = {} } = {}) {
  validateShadowContext(context);
  validateState(state);

  const scheduled = dueScheduleEvents({ jobs, nowUtc, lastSlotByJob:state.lastSlotByJob() });
  const scheduledIds = new Set(scheduled.map((event) => event.event_id));
  const bus = createEventBus();
  const registry = createBotRegistry(bots);
  const processedEvents = [];
  const botRuns = [];
  const deliveryIntents = [];

  for (const event of scheduled) bus.publish(event);

  while (bus.hasPending()) {
    const event = bus.next();
    processedEvents.push(event);

    for (const bot of registry.matching(event)) {
      try {
        const rawResult = await bot.run({ event, context });
        const result = normalizeBotResult(rawResult);

        for (const emittedEvent of result.emitted_events) bus.publish(emittedEvent);

        for (const rawIntent of result.delivery_intents) {
          requireObject(rawIntent, 'delivery intent');
          const recorded = state.recordDeliveryIntent({
            ...rawIntent,
            event_id: rawIntent.event_id ?? event.event_id,
            timestamp_utc: rawIntent.timestamp_utc ?? nowUtc,
          });
          deliveryIntents.push(recorded);
        }

        const run = state.recordBotRun({
          bot_id: bot.id,
          event_id: event.event_id,
          status: 'SUCCESS',
          timestamp_utc: nowUtc,
          metadata: result.metadata,
        });
        botRuns.push(run);
      } catch (error) {
        const run = state.recordBotRun({
          bot_id: bot.id,
          event_id: event.event_id,
          status: 'FAILED',
          error_name: error instanceof Error ? error.name : 'Error',
          error_message: error instanceof Error ? error.message : String(error),
          timestamp_utc: nowUtc,
        });
        botRuns.push(run);
      }
    }

    if (scheduledIds.has(event.event_id)) {
      state.recordJobSlot({
        job_id: event.job_id,
        scheduled_for_utc: event.scheduled_for_utc,
        status: 'COMPLETED',
        timestamp_utc: nowUtc,
      });
    }
  }

  return deepFreeze({
    scheduled: Object.freeze([...scheduled]),
    processed_events: Object.freeze([...processedEvents]),
    bot_runs: Object.freeze([...botRuns]),
    delivery_intents: Object.freeze([...deliveryIntents]),
    state_snapshot: state.snapshot(),
  });
}
