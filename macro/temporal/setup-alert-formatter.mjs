const DISPLAY_NAME=Object.freeze({M08:'Morning Setup',N20:'Night Setup'});

export function formatSetupAlert(evidence){
 if(!evidence||!DISPLAY_NAME[evidence.setupId])throw new TypeError('setupId must identify a supported setup');
 const name=DISPLAY_NAME[evidence.setupId];
 const state=evidence.state??'UNRESOLVED';
 const relation=evidence.relation??'UNKNOWN';
 const technical=evidence.bbma?`${evidence.bbma.direction??'UNKNOWN'} / ${evidence.bbma.readiness??'UNKNOWN'}`:'UNKNOWN';
 const checkpoint=evidence.checkpointState??'N/A';
 const reason=evidence.reason??'UNKNOWN';
 const interpretation=relation==='COUNTER_STRUCTURE'
  ? 'Counter-structure evidence; pullback/retest/reversal remains unresolved until independent structure confirms.'
  : relation==='ALIGNED'
    ? 'Temporal and BBMA evidence are aligned; outcome remains evidence-only.'
    : 'Evidence remains descriptive; no directional promotion is applied.';
 return [
  `${name} — ${state}`,
  `Confluence: ${relation}`,
  `BBMA/HTF: ${technical}`,
  `Checkpoint: ${checkpoint}`,
  `Reason: ${reason}`,
  `Context: ${interpretation}`,
 ].join('\n');
}
