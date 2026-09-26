import { runHistoricalReplayBatch } from './m08-n20-batch-replay.mjs';
import { reconstructTemporalDay } from './m08-n20-auto-reconstruction.mjs';
import { composeM08N20DailyReplay } from './m08-n20-daily-replay.mjs';
import { attachHistoricalOutcomes } from './m08-n20-outcome-attachment.mjs';
import { buildM08N20EvidenceMatrix } from './m08-n20-evidence-matrix.mjs';
import { summarizeHistoricalEvidence } from './m08-n20-historical-stats.mjs';
import { auditM08N20EvidenceChain } from './m08-n20-chain-audit.mjs';

const freeze=v=>{if(!v||typeof v!=='object'||Object.isFrozen(v))return v;for(const x of Object.values(v))freeze(x);return Object.freeze(v)};

export function runM08N20EvidencePipeline({days,policy,contexts={},minimumSample=10}){
 const batch=runHistoricalReplayBatch(days,{sourceTimeframeMinutes:policy.sourceTimeframeMinutes});
 const results=[],replays=[];
 for(const d of batch.days){
  const temporal=reconstructTemporalDay({mytDate:d.mytDate,candles:d.candles,policy});
  const context=contexts[d.mytDate]??{};
  const base=composeM08N20DailyReplay({replayId:`${d.mytDate}:historical`,mytDate:d.mytDate,m08:temporal.m08,n20:temporal.n20,checkpoints:temporal.checkpoints,relation:temporal.relation,retest:null,crossContext:context.bbma??null,regime:context.regime??null,sourceRefs:[`candles:${d.mytDate}`]});
  const replay=attachHistoricalOutcomes(base,d.candles,{horizonsMinutes:policy.outcomeHorizonsMinutes});
  const audit=auditM08N20EvidenceChain({m08:temporal.m08,checkpoint1130:temporal.checkpoints.at1130,checkpoint1800:temporal.checkpoints.at1800,n20:temporal.n20,bbma:context.bbma??null,regime:context.regime??null,replay});
  results.push({mytDate:d.mytDate,temporal,replay,audit,gaps:d.gaps}); replays.push(replay);
 }
 const matrix=buildM08N20EvidenceMatrix(replays);
 const statistics=summarizeHistoricalEvidence(matrix,{minimumSample});
 return freeze({schemaVersion:'m08-n20-evidence-pipeline-v1',batch:{totalDays:batch.totalDays,sourceTimeframeMinutes:batch.sourceTimeframeMinutes},days:results,matrix,statistics,executionEnabled:false});
}
