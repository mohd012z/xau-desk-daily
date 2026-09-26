import { detectExtreme } from './extreme.mjs';
import { detectMhv } from './mhv.mjs';
import { detectCsa } from './csa.mjs';
import { detectReentry } from './reentry.mjs';
import { detectMomentum } from './momentum.mjs';
import { getBbmaRules } from './rules.mjs';

const TIMEFRAMES = Object.freeze(['D1', 'H4', 'H1', 'M30', 'M15', 'M5']);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function normalizeObservation(name, raw, timeframe, ruleVersion) {
  return deepFreeze({
    detector: name,
    detected: raw?.detected === true,
    direction: raw?.direction === 'BUY' || raw?.direction === 'SELL' ? raw.direction : null,
    timeframe,
    anchor_utc: raw?.anchor_utc ?? null,
    rule_version: raw?.rule_version ?? ruleVersion,
    evidence: Array.isArray(raw?.evidence) ? [...raw.evidence] : [],
    status: raw?.status ?? 'OK'
  });
}

export function aggregateBbma({ timeframe, series, ruleVersion = 'bbma-shadow-v1' } = {}) {
  if (typeof timeframe !== 'string' || !timeframe.trim()) throw new TypeError('BBMA timeframe is required');
  getBbmaRules(ruleVersion);

  const observations = {
    EXTREME: normalizeObservation('EXTREME', detectExtreme({ series, timeframe, ruleVersion }), timeframe, ruleVersion),
    MHV: normalizeObservation('MHV', detectMhv({ series, timeframe, ruleVersion }), timeframe, ruleVersion),
    CSA: normalizeObservation('CSA', detectCsa({ series, timeframe, ruleVersion }), timeframe, ruleVersion),
    REENTRY: normalizeObservation('REENTRY', detectReentry({ series, timeframe, ruleVersion }), timeframe, ruleVersion),
    MOMENTUM: normalizeObservation('MOMENTUM', detectMomentum({ series, timeframe, ruleVersion }), timeframe, ruleVersion)
  };

  const detectedDirections = new Set(
    Object.values(observations)
      .filter(item => item.detected && item.direction)
      .map(item => item.direction)
  );
  const conflicts = [];
  if (detectedDirections.has('BUY') && detectedDirections.has('SELL')) conflicts.push('MIXED_DIRECTION_EVIDENCE');
  for (const [name, item] of Object.entries(observations)) {
    if (item.status === 'AMBIGUOUS') conflicts.push(`${name}_AMBIGUOUS`);
    for (const evidence of item.evidence) {
      if (typeof evidence === 'string' && evidence.startsWith('CONFLICT_')) conflicts.push(`${name}:${evidence}`);
    }
  }

  return deepFreeze({
    timeframe,
    rule_version: ruleVersion,
    status: 'OK',
    observations,
    conflicts: [...new Set(conflicts)]
  });
}

export function buildBbmaTimeframeMap(seriesByTimeframe = {}, ruleVersion = 'bbma-shadow-v1') {
  getBbmaRules(ruleVersion);
  if (!seriesByTimeframe || typeof seriesByTimeframe !== 'object' || Array.isArray(seriesByTimeframe)) {
    throw new TypeError('Timeframe series map is required');
  }

  const timeframes = {};
  const buyTimeframes = [];
  const sellTimeframes = [];
  const unavailableTimeframes = [];
  const conflictTimeframes = [];

  for (const timeframe of TIMEFRAMES) {
    const series = seriesByTimeframe[timeframe];
    if (!Array.isArray(series) || series.length === 0) {
      timeframes[timeframe] = deepFreeze({ timeframe, rule_version: ruleVersion, status: 'UNAVAILABLE', observations: {}, conflicts: [] });
      unavailableTimeframes.push(timeframe);
      continue;
    }

    const aggregate = aggregateBbma({ timeframe, series, ruleVersion });
    timeframes[timeframe] = aggregate;
    const directions = new Set(
      Object.values(aggregate.observations)
        .filter(item => item.detected && item.direction)
        .map(item => item.direction)
    );
    if (directions.has('BUY')) buyTimeframes.push(timeframe);
    if (directions.has('SELL')) sellTimeframes.push(timeframe);
    if (aggregate.conflicts.length > 0 || (directions.has('BUY') && directions.has('SELL'))) conflictTimeframes.push(timeframe);
  }

  return deepFreeze({
    rule_version: ruleVersion,
    timeframes,
    alignment: {
      buy_timeframes: buyTimeframes,
      sell_timeframes: sellTimeframes,
      unavailable_timeframes: unavailableTimeframes,
      conflict_timeframes: conflictTimeframes
    }
  });
}
