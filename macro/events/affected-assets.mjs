const GROUPS = {
  USD: ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','NZD/USD','USD/CAD'],
  EUR: ['EUR/USD','EUR/GBP','EUR/JPY','EUR/CHF','EUR/AUD'],
  GBP: ['GBP/USD','EUR/GBP','GBP/JPY','GBP/AUD'],
  JPY: ['USD/JPY','EUR/JPY','GBP/JPY','AUD/JPY','CAD/JPY'],
  CHF: ['USD/CHF','EUR/CHF','CHF/JPY'],
  CAD: ['USD/CAD','CAD/JPY','EUR/CAD'],
  AUD: ['AUD/USD','AUD/JPY','AUD/NZD','EUR/AUD'],
  NZD: ['NZD/USD','NZD/JPY','AUD/NZD']
};

const unique = (items) => [...new Set(items)];
const allText = (input) => `${input.title ?? ''} ${input.text ?? ''} ${(input.entities ?? []).join(' ')}`.toLowerCase();

export function inferAffectedAssets(input = {}) {
  const text = allText(input);
  let currencies = [];
  let context = [];
  let primary = [];
  let secondary = [];

  const addCurrency = (ccy, extraContext = []) => {
    currencies.push(ccy);
    primary.push(...GROUPS[ccy]);
    context.push(...extraContext);
  };

  if (/federal reserve|\bfed\b|fomc|us cpi|u\.s\. cpi|nonfarm|nfp|payroll|us jobs|u\.s\. jobs|pce inflation|us inflation/.test(text)) {
    addCurrency('USD', ['DXY','US10Y','REAL_YIELDS']);
    secondary.push('XAU/USD','BTC/USD','ETH/USD');
  }
  if (/european central bank|\becb\b|euro area|eurozone/.test(text)) addCurrency('EUR');
  if (/bank of england|\bboe\b|uk inflation|british inflation/.test(text)) addCurrency('GBP');
  if (/bank of japan|\bboj\b|japan intervention|yen intervention/.test(text)) addCurrency('JPY', ['CARRY']);
  if (/swiss national bank|\bsnb\b/.test(text)) addCurrency('CHF');
  if (/bank of canada|\bboc\b|canada jobs|canadian inflation/.test(text)) addCurrency('CAD', ['BRENT']);
  if (/reserve bank of australia|\brba\b|australia inflation/.test(text)) addCurrency('AUD');
  if (/reserve bank of new zealand|\brbnz\b|new zealand inflation/.test(text)) addCurrency('NZD');

  if (/geopolit|missile|war |military strike|airstrike|invasion|ceasefire collapse|oil supply disruption|strait of hormuz|sanction/.test(text)) {
    primary.push('XAU/USD');
    currencies.push('USD','JPY','CHF');
    secondary.push(...GROUPS.USD, ...GROUPS.JPY, ...GROUPS.CHF, 'BTC/USD','ETH/USD');
    context.push('BRENT','RISK_SENTIMENT');
  }

  return {
    currencies: unique(currencies),
    primary: unique(primary),
    secondary: unique(secondary.filter(x => !primary.includes(x))),
    context: unique(context)
  };
}
