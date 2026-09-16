const eq=(a,b)=>a!=null&&b!=null&&String(a).toLowerCase()===String(b).toLowerCase();
export function scoreSimilarity(target={},sample={}){
  const fields=[['eventType',0.34],['centralBank',0.14],['speakerRole',0.08],['session',0.10],['volatilityRegime',0.12],['trendRegime',0.10],['speechStance',0.12]];
  let score=0,weight=0;
  for(const [k,w] of fields){if(target[k]!=null&&sample[k]!=null){weight+=w;if(eq(target[k],sample[k]))score+=w;}}
  if(weight===0)return 0;
  return Math.max(0,Math.min(1,score/weight));
}
export function recencyWeight(eventTimeUtc,asOfUtc,halfLifeDays=365){const a=Date.parse(asOfUtc),e=Date.parse(eventTimeUtc);if(!Number.isFinite(a)||!Number.isFinite(e)||e>a)return 0;const days=(a-e)/86400000;return Math.pow(0.5,days/halfLifeDays);}
export function rankComparableEvents(target={},samples=[],options={}){const asOfUtc=options.asOfUtc??target.asOfUtc??new Date().toISOString();const minSimilarity=options.minSimilarity??0.15;return samples.map(sample=>{const similarity=scoreSimilarity(target,sample);const recency=recencyWeight(sample.eventTimeUtc,asOfUtc,options.halfLifeDays??365);return{sample,similarity,recency,weight:similarity*recency};}).filter(x=>x.similarity>=minSimilarity&&x.weight>0).sort((a,b)=>b.weight-a.weight);}
