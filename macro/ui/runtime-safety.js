(function (global) {
  'use strict';

  function unavailableSnapshot() {
    return {
      meta: {
        verified: false,
        cadence: 'daily',
        generatedAt: null,
        staleAfterHours: 0,
        sourceStatus: {},
        warnings: ['Verified snapshot did not load.']
      },
      updated: 'Unavailable',
      session: 'DATA UNAVAILABLE — verified snapshot did not load',
      price: {
        spot: null,
        latestDailyClose: null,
        priceType: 'UNAVAILABLE',
        change: null,
        changePct: null,
        dayRange: null,
        monthPct: null,
        yearPct: null,
        ath: null,
        rollingHigh: null,
        rollingWindowBars: null,
        note: 'No verified market snapshot is loaded.'
      },
      macro: [
        { label: 'DXY', value: '—', delta: 'unavailable', tone: '', note: 'No verified snapshot' },
        { label: 'US 10Y', value: '—', delta: 'unavailable', tone: '', note: 'No verified snapshot' },
        { label: 'Brent', value: '—', delta: 'unavailable', tone: '', note: 'No verified snapshot' }
      ],
      sentiment: {
        bias: 'UNAVAILABLE',
        goldTone: 'UNAVAILABLE',
        score: 0,
        confidence: 0,
        summary: 'No verified snapshot loaded.',
        netSpeechSignal: 'NEUTRAL',
        netSpeechPct: null,
        netNote: ''
      },
      model: {
        base: 0,
        formula: 'Unavailable',
        note: 'No verified snapshot loaded.',
        weights: [],
        strength: [],
        surprise: []
      },
      news: [],
      speakers: [],
      levels: { resistance: [], support: [], note: 'Unavailable' },
      calendar: [],
      pressure: [],
      priceSeries: { label: 'Unavailable', unit: 'USD / troy oz', yMin: 0, yMax: 1, points: [] },
      macroSeries: { label: 'Unavailable', unit: 'index', yMin: 0, yMax: 1, points: [] },
      oddsSeries: { label: 'Unavailable', unit: 'index', yMin: 0, yMax: 1, points: [] },
      sources: []
    };
  }

  function normalizeExternalSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return snapshot;
    var meta = snapshot.meta || (snapshot.meta = {});
    var price = snapshot.price || (snapshot.price = {});
    if (String(meta.cadence || '').toLowerCase() === 'daily') {
      if (price.latestDailyClose == null && price.spot != null) price.latestDailyClose = price.spot;
      if (!price.priceType) price.priceType = 'DAILY_CLOSE';
      if (price.rollingHigh == null && price.ath != null) {
        price.rollingHigh = price.ath;
        price.ath = null;
      }
      if (price.rollingWindowBars == null && typeof price.note === 'string') {
        var match = price.note.match(/rolling history used:\s*(\d+)\s*bars/i);
        if (match) price.rollingWindowBars = Number(match[1]);
      }
    }
    return snapshot;
  }

  function relabelDailyPriceCards(doc, snapshot) {
    if (!doc || !snapshot || snapshot.price?.priceType !== 'DAILY_CLOSE') return;
    var nodes = doc.querySelectorAll ? doc.querySelectorAll('.hero .card .k') : [];
    Array.prototype.forEach.call(nodes, function (node) {
      var label = String(node.textContent || '').trim();
      if (label === 'XAU/USD Spot') node.textContent = 'XAU/USD Daily Close';
      if (label === 'Brent Spot') node.textContent = 'Brent Daily Close';
    });
  }

  if (global.XAUUSD_DATA) {
    normalizeExternalSnapshot(global.XAUUSD_DATA);
  } else {
    global.XAUUSD_EMBEDDED = unavailableSnapshot();
  }

  if (typeof document !== 'undefined') {
    relabelDailyPriceCards(document, global.XAUUSD_DATA || global.XAUUSD_EMBEDDED);
  }

  global.XAUDeskRuntimeSafety = {
    unavailableSnapshot: unavailableSnapshot,
    normalizeExternalSnapshot: normalizeExternalSnapshot,
    relabelDailyPriceCards: relabelDailyPriceCards
  };
})(typeof window !== 'undefined' ? window : globalThis);
