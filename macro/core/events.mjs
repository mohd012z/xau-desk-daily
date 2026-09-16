export const EVENT_STATES = ['UPCOMING', 'DETECTED', 'TRIGGERED', 'LIVE', 'SETTLING', 'CLOSED'];

export function floorEventMinute(iso) {
  const d = new Date(iso);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

export function selectCompletedMinuteBaseline(bars, eventIso) {
  const floorMs = Date.parse(floorEventMinute(eventIso));
  return bars
    .filter(b => Date.parse(b.time) < floorMs)
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))[0] ?? null;
}

export function transitionEvent(state, signal) {
  const key = `${state}:${signal}`;
  return ({
    'UPCOMING:trigger': 'TRIGGERED',
    'DETECTED:trigger': 'TRIGGERED',
    'TRIGGERED:market_tick': 'LIVE',
    'LIVE:settle': 'SETTLING',
    'SETTLING:close': 'CLOSED'
  })[key] ?? state;
}
