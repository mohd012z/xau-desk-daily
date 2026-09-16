function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function summarizeDistribution(samples) {
  const xs = (samples || []).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if (!xs.length) return null;
  return { n: xs.length, median: quantile(xs,.5), p10: quantile(xs,.1), p25: quantile(xs,.25), p75: quantile(xs,.75), p90: quantile(xs,.9) };
}

const clean = n => Number(Number(n).toPrecision(15));
export function fxBandFromPips(prePrice, pipSize, d) {
  if (!d) return null;
  const at = p => clean(Number(prePrice) + p * Number(pipSize));
  return { center: at(d.median), band50:[at(d.p25),at(d.p75)], band80:[at(d.p10),at(d.p90)] };
}

export function percentBandFromReturns(prePrice, d) {
  if (!d) return null;
  const at = p => clean(Number(prePrice) * (1 + p/100));
  return { center: at(d.median), band50:[at(d.p25),at(d.p75)], band80:[at(d.p10),at(d.p90)] };
}