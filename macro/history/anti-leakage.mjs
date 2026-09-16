function ms(v){const n=Date.parse(v);return Number.isFinite(n)?n:null;}
export function validateAdvanceFeatures({eventTimeUtc,features=[]}={}){
  const eventMs=ms(eventTimeUtc); if(eventMs==null)return{valid:false,accepted:[],rejected:features.map(f=>({...f,reason:'INVALID_EVENT_TIME'}))};
  const accepted=[],rejected=[];
  for(const f of features){const at=ms(f.observedAt);if(at==null)rejected.push({...f,reason:'MISSING_FEATURE_TIME'});else if(at>=eventMs)rejected.push({...f,reason:'NOT_PRE_EVENT'});else accepted.push(f);}
  return{valid:rejected.length===0,accepted,rejected};
}
export function filterPreEventFeatures(args={}){return validateAdvanceFeatures(args).accepted;}
