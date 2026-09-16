export const BRAND = {
  name: 'MACRO//DESK',
  subtitle: 'FX • Metals • Digital Assets Event Intelligence'
};

export const NAV_ITEMS = ['BRIEF', 'EVENTS', 'METALS', 'FX', 'DIGITAL ASSETS'];

export const INSTRUMENTS = {
  'XAU/USD': { symbol: 'XAU/USD', assetClass: 'metal', tickSize: 0.01 },
  'EUR/USD': { symbol: 'EUR/USD', assetClass: 'fx', pipSize: 0.0001 },
  'GBP/USD': { symbol: 'GBP/USD', assetClass: 'fx', pipSize: 0.0001 },
  'USD/JPY': { symbol: 'USD/JPY', assetClass: 'fx', pipSize: 0.01 },
  'USD/CHF': { symbol: 'USD/CHF', assetClass: 'fx', pipSize: 0.0001 },
  'AUD/USD': { symbol: 'AUD/USD', assetClass: 'fx', pipSize: 0.0001 },
  'NZD/USD': { symbol: 'NZD/USD', assetClass: 'fx', pipSize: 0.0001 },
  'USD/CAD': { symbol: 'USD/CAD', assetClass: 'fx', pipSize: 0.0001 },
  'BTC/USD': { symbol: 'BTC/USD', assetClass: 'digital' },
  'ETH/USD': { symbol: 'ETH/USD', assetClass: 'digital' }
};

export function getInstrument(symbol) {
  return INSTRUMENTS[symbol] || null;
}

export function getPipSize(symbol) {
  return getInstrument(symbol)?.pipSize ?? null;
}
