export function assessPlanQuality({ effectiveSampleSize=0, timeConfidence='LOW', feedState='OFFLINE', modelAgreement='UNKNOWN' }={}) {
  const reasons=[];
  if (effectiveSampleSize < 20) reasons.push('LOW_SAMPLE_SIZE');
  else if (effectiveSampleSize < 40) reasons.push('LIMITED_SAMPLE_SIZE');
  if (String(timeConfidence).toUpperCase() === 'LOW') reasons.push('LOW_TIMESTAMP_CONFIDENCE');
  const feed=String(feedState).toUpperCase();
  if (feed === 'STALE') reasons.push('STALE_FEED');
  if (feed === 'OFFLINE') reasons.push('OFFLINE_FEED');
  if (String(modelAgreement).toUpperCase() === 'DISAGREE') reasons.push('MODEL_DISAGREEMENT');
  const severe = reasons.some(r => ['LOW_SAMPLE_SIZE','LOW_TIMESTAMP_CONFIDENCE','STALE_FEED','OFFLINE_FEED','MODEL_DISAGREEMENT'].includes(r));
  return { label: severe ? 'LOW' : reasons.length ? 'MODERATE' : 'HIGH', reasons };
}