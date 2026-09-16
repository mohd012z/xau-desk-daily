import { createEventRecord } from './event-record.mjs';
import { inferAffectedAssets } from './affected-assets.mjs';

export function normalizeHeadline(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(text) {
  return new Set(normalizeHeadline(text).split(' ').filter(t => t.length > 2));
}

export function fingerprintCandidate(candidate = {}) {
  return `${normalizeHeadline(candidate.source)}|${normalizeHeadline(candidate.title)}`;
}

export function isNearDuplicate(a = {}, b = {}, { threshold = 0.72, windowMs = 20 * 60 * 1000 } = {}) {
  const ta = tokens(a.title);
  const tb = tokens(b.title);
  if (!ta.size || !tb.size) return false;
  const intersection = [...ta].filter(x => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  const similarity = intersection / union;
  const at = Date.parse(a.eventTimeUtc ?? a.receivedAt ?? a.articlePublishedAt ?? 0);
  const bt = Date.parse(b.eventTimeUtc ?? b.receivedAt ?? b.articlePublishedAt ?? 0);
  const closeInTime = Number.isFinite(at) && Number.isFinite(bt) ? Math.abs(at - bt) <= windowMs : true;
  return similarity >= threshold && closeInTime;
}

const HIGH = [
  /fomc|federal reserve|\bfed\b|ecb|bank of england|\bboe\b|bank of japan|\bboj\b|snb|bank of canada|\bboc\b|rba|rbnz/,
  /rate (decision|hike|cut)|interest rate|policy rate|yield curve control|currency intervention/,
  /\bcpi\b|inflation|\bpce\b|nonfarm|\bnfp\b|payroll|unemployment|jobs report|gdp|retail sales|pmi/,
  /military strike|airstrike|invasion|sanction|oil supply disruption|strait of hormuz/
];
const MEDIUM = [/treasury yield|real yield|dollar index|\bdxy\b|oil price|brent|central bank|policy outlook|rate path/];
const IRRELEVANT = [/emmy|movie|celebrity|gadget|desktop pc|smartphone|sports|recipe|fashion|gaming review/];

export function scoreMateriality(candidate = {}) {
  const text = normalizeHeadline(`${candidate.title ?? ''} ${candidate.text ?? ''} ${(candidate.entities ?? []).join(' ')}`);
  let score = 0;
  for (const rule of HIGH) if (rule.test(text)) score += 3;
  for (const rule of MEDIUM) if (rule.test(text)) score += 1;
  for (const rule of IRRELEVANT) if (rule.test(text)) score -= 5;
  if (candidate.sourceType === 'official') score += 2;
  return Math.max(0, Math.min(10, score));
}

export function detectEvent(candidate = {}, existing = [], options = {}) {
  const materiality = scoreMateriality(candidate);
  const minMateriality = options.minMateriality ?? 3;
  if (materiality < minMateriality) return { accepted: false, reason: 'LOW_MATERIALITY', materiality, event: null };
  const provisional = createEventRecord(candidate);
  const duplicate = existing.find(e => e.id === provisional.id || isNearDuplicate(provisional, e, options));
  if (duplicate) return { accepted: false, reason: 'DUPLICATE', materiality, event: duplicate };
  provisional.affectedAssets = inferAffectedAssets(candidate);
  return { accepted: true, reason: 'ACCEPTED', materiality, event: provisional };
}
