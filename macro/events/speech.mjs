const RULES = {
  policyPath: [
    { re: /further (tightening|rate hikes?)|additional (tightening|rate hikes?)|rates? may need to rise|higher for longer|not ready to cut|more restrictive/, score: 0.8, label: 'tighter policy path' },
    { re: /rate cuts? may be appropriate|begin easing|reduce restriction|less restrictive|room to cut|lower rates?/, score: -0.8, label: 'easier policy path' }
  ],
  inflation: [
    { re: /inflation (remains|is) (too )?high|persistent inflation|upside inflation risks?|inflation progress has slowed|price pressures remain/, score: 0.65, label: 'inflation concern' },
    { re: /inflation (is )?(easing|cooling)|disinflation (continues|is progressing)|price pressures (are )?moderating|closer to target/, score: -0.6, label: 'disinflation progress' }
  ],
  labour: [
    { re: /labor market (remains )?(tight|strong)|labour market (remains )?(tight|strong)|wage pressures remain/, score: 0.35, label: 'strong labour conditions' },
    { re: /labor market (is )?(weakening|cooling)|labour market (is )?(weakening|cooling)|employment downside risks?|job growth has slowed/, score: -0.45, label: 'labour downside risk' }
  ],
  growth: [
    { re: /growth remains (solid|strong)|economy remains (resilient|strong)|demand remains robust/, score: 0.25, label: 'resilient growth' },
    { re: /growth (is )?(slowing|weak)|recession risk|activity has weakened|demand is softening/, score: -0.35, label: 'weaker growth' }
  ],
  financialConditions: [
    { re: /financial conditions (are )?(too loose|have eased materially)|conditions remain accommodative/, score: 0.35, label: 'loose financial conditions' },
    { re: /financial conditions (are )?(tight|restrictive)|credit conditions have tightened/, score: -0.25, label: 'restrictive financial conditions' }
  ],
  balanceSheet: [
    { re: /accelerate (qt|runoff)|faster balance sheet runoff|reduce the balance sheet more quickly/, score: 0.4, label: 'faster balance-sheet tightening' },
    { re: /slow (qt|runoff)|end (qt|runoff)|pause balance sheet runoff|slower balance sheet runoff/, score: -0.4, label: 'slower balance-sheet tightening' }
  ]
};

const WEIGHTS = { policyPath: 0.34, inflation: 0.24, labour: 0.14, growth: 0.10, financialConditions: 0.10, balanceSheet: 0.08 };

function clamp(v) { return Math.max(-1, Math.min(1, v)); }
function negated(text, index) {
  const prefix = text.slice(Math.max(0, index - 24), index);
  return /\b(not|no|never|unlikely to|do not|does not|isn.t|is not)\b[^.]{0,18}$/i.test(prefix);
}

function classifyDimension(text, rules) {
  let total = 0;
  const evidence = [];
  for (const rule of rules) {
    const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`);
    for (const match of text.matchAll(re)) {
      const effective = negated(text, match.index ?? 0) ? -rule.score * 0.7 : rule.score;
      total += effective;
      evidence.push({ phrase: match[0], label: rule.label, score: Number(effective.toFixed(3)) });
    }
  }
  return { score: Number(clamp(total).toFixed(3)), evidence };
}

function stance(score) {
  if (score >= 0.25) return 'HAWKISH';
  if (score <= -0.25) return 'DOVISH';
  if (Math.abs(score) < 0.08) return 'NEUTRAL';
  return 'MIXED';
}

export function classifySpeechSegment(text = '', context = {}) {
  const normalized = String(text).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const dimensions = {};
  const evidence = [];
  for (const [name, rules] of Object.entries(RULES)) {
    dimensions[name] = classifyDimension(normalized.toLowerCase(), rules);
    evidence.push(...dimensions[name].evidence.map(e => ({ ...e, dimension: name })));
  }
  const composite = Number(Object.entries(WEIGHTS).reduce((sum, [name, weight]) => sum + dimensions[name].score * weight, 0).toFixed(3));
  return {
    mode: context.mode ?? 'unscheduled_comments',
    composite,
    stance: stance(composite),
    confidence: Math.min(1, Number((0.2 + evidence.length * 0.12).toFixed(2))),
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([k,v]) => [k, v.score])),
    evidence
  };
}

export function mergeSpeechRevision(previous, segmentResult, meta = {}) {
  const revisionNumber = (previous?.revisionNumber ?? 0) + 1;
  const previousComposite = previous?.composite ?? 0;
  const composite = Number(segmentResult.composite.toFixed(3));
  return {
    revisionNumber,
    at: meta.at ?? null,
    mode: segmentResult.mode,
    composite,
    previousComposite,
    shift: Number((composite - previousComposite).toFixed(3)),
    stance: segmentResult.stance,
    confidence: segmentResult.confidence,
    dimensions: segmentResult.dimensions,
    evidence: segmentResult.evidence
  };
}

export function speechPressureForCurrency(currency, score) {
  if (!currency || !Number.isFinite(Number(score))) return 'NEUTRAL';
  const n = Number(score);
  if (n >= 0.25) return 'UP_PRESSURE';
  if (n <= -0.25) return 'DOWN_PRESSURE';
  return Math.abs(n) < 0.08 ? 'NEUTRAL' : 'MIXED';
}
