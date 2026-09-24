const REQUIRED_TF = ['D1','H4','H1','M30','M15','M5'];

function validUtc(value, name) {
  if (typeof value !== 'string' || !value.endsWith('Z') || Number.isNaN(Date.parse(value))) throw new TypeError(`Invalid ${name}`);
}

export function evaluateDataHealth({ nowUtc, price = {}, news = {}, timeframes = {} } = {}) {
  validUtc(nowUtc,'nowUtc');
  const reasons=[];
  const priceState=String(price.status||'UNKNOWN').toUpperCase();
  const newsRaw=String(news.status||'UNKNOWN').toUpperCase();
  const newsState=newsRaw==='FRESH' ? 'FRESH' : 'UNKNOWN';

  if (priceState !== 'FRESH') reasons.push(priceState==='STALE'?'PRICE_STALE':'PRICE_UNAVAILABLE');
  for (const tf of REQUIRED_TF) if (timeframes[tf] !== true) reasons.push(`TIMEFRAME_${tf}_UNAVAILABLE`);
  if (newsState === 'UNKNOWN') reasons.push('NEWS_UNKNOWN');

  const requiredTimeframesAvailable=REQUIRED_TF.every(tf=>timeframes[tf]===true);
  return Object.freeze({
    price: priceState,
    news: newsState,
    timeframes: Object.freeze({...timeframes}),
    technical_confirmation_allowed: priceState==='FRESH' && requiredTimeframesAvailable,
    macro_state: newsState==='FRESH' ? 'AVAILABLE' : 'UNKNOWN',
    reasons: Object.freeze(reasons)
  });
}
