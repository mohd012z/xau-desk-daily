import { BRAND, getInstrument } from '../core/instruments.mjs';
import { adaptSnapshot } from '../adapters/snapshot-adapter.mjs';
import { calcFxReaction, calcMetalReaction, calcDigitalReaction } from '../core/reaction.mjs';

const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

function fixed(value, digits) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

function signed(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
}

export function formatReactionCard({ symbol, assetClass, reaction, expectedPressure = '—', observedReaction = '—' }) {
  const priceDigits = assetClass === 'fx' ? (symbol.endsWith('/JPY') ? 3 : 5) : 2;
  let movement = '—';
  let detail = '—';

  if (assetClass === 'fx') {
    movement = `${signed(reaction.pips, 1)} pips`;
    detail = `max up ${signed(reaction.maxUpPips, 1)} • max down ${signed(reaction.maxDownPips, 1)} • range ${fixed(reaction.rangePips, 1)} pips`;
  } else if (assetClass === 'metal') {
    const points = reaction.providerPoints == null ? '—' : signed(reaction.providerPoints, 1);
    movement = `$${signed(reaction.dollarMove, 2)} • ${signed(reaction.returnPct, 2)}% • ${points} provider pts`;
    detail = 'Gold movement uses provider point metadata, not a universal pip definition.';
  } else if (assetClass === 'digital') {
    movement = `$${signed(reaction.dollarMove, 2)} • ${signed(reaction.returnPct, 2)}%`;
    detail = 'Digital assets use dollar and percentage movement.';
  }

  return {
    symbol,
    assetClass,
    from: fixed(reaction.fromPrice, priceDigits),
    to: fixed(reaction.toPrice, priceDigits),
    movement,
    detail,
    expectedPressure,
    observedReaction
  };
}

function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatMyt(iso) {
  if (!iso) return 'Updated —';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `Updated ${iso}`;
  return `Updated ${new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(d)} MYT`;
}

function reactionFromInput(item) {
  const meta = getInstrument(item.symbol);
  if (!meta || item.before == null || item.after == null) return null;
  if (meta.assetClass === 'fx') return calcFxReaction(item.symbol, item.before, item.after, item.high, item.low);
  if (meta.assetClass === 'metal') return calcMetalReaction(item.before, item.after, meta.tickSize ?? null);
  if (meta.assetClass === 'digital') return calcDigitalReaction(item.before, item.after);
  return null;
}

function cardElement(card) {
  const el = document.createElement('article');
  el.className = 'reaction-card';
  const title = document.createElement('div');
  title.className = 'reaction-title';
  title.textContent = card.symbol;
  const prices = document.createElement('div');
  prices.className = 'reaction-prices';
  prices.textContent = `${card.from} → ${card.to}`;
  const move = document.createElement('div');
  move.className = 'reaction-move';
  move.textContent = card.movement;
  const states = document.createElement('div');
  states.className = 'reaction-states';
  states.innerHTML = '<span>Expected</span><strong></strong><span>Observed</span><strong></strong>';
  states.querySelectorAll('strong')[0].textContent = card.expectedPressure;
  states.querySelectorAll('strong')[1].textContent = card.observedReaction;
  const detail = document.createElement('div');
  detail.className = 'reaction-detail';
  detail.textContent = card.detail;
  el.append(title, prices, move, states, detail);
  return el;
}

function renderReactionCards() {
  const inputs = Array.isArray(window.MACRO_EVENT_REACTIONS) ? window.MACRO_EVENT_REACTIONS : [];
  if (!inputs.length) return;
  const fxHost = $('#fx-reactions');
  const metalHost = $('#metal-reaction');
  const digitalHost = $('#digital-reactions');
  fxHost.innerHTML = '';
  metalHost.innerHTML = '';
  digitalHost.innerHTML = '';
  let fxCount = 0, metalCount = 0, digitalCount = 0;

  inputs.forEach((item) => {
    const meta = getInstrument(item.symbol);
    const reaction = reactionFromInput(item);
    if (!meta || !reaction) return;
    const card = formatReactionCard({
      symbol: item.symbol,
      assetClass: meta.assetClass,
      reaction,
      expectedPressure: item.expectedPressure ?? '—',
      observedReaction: item.observedReaction ?? '—'
    });
    const el = cardElement(card);
    if (meta.assetClass === 'fx') { fxHost.appendChild(el); fxCount++; }
    if (meta.assetClass === 'metal') { metalHost.appendChild(el); metalCount++; }
    if (meta.assetClass === 'digital') { digitalHost.appendChild(el); digitalCount++; }
  });

  if (!fxCount) fxHost.innerHTML = '<div class="empty-state">No measured FX event reaction yet.</div>';
  if (!metalCount) metalHost.innerHTML = '<div class="empty-state">No measured metal event reaction yet.</div>';
  if (!digitalCount) digitalHost.innerHTML = '<div class="empty-state">No measured digital-asset event reaction yet.</div>';
}

function renderSnapshot(data) {
  document.title = `${BRAND.name} — ${BRAND.subtitle}`;
  $('#feed-status').textContent = data.status;
  $('#updated-at').textContent = formatMyt(data.updatedAt);
  const xau = data.instruments['XAU/USD'];
  $('#xau-price').textContent = xau.price == null ? '—' : `$${fmt(xau.price)}`;
  if (xau.change == null || xau.changePct == null) {
    $('#xau-change').textContent = 'Daily verified snapshot';
  } else {
    const sign = xau.change >= 0 ? '+' : '';
    $('#xau-change').textContent = `${sign}${fmt(xau.change)} • ${sign}${fmt(xau.changePct)}% • ${xau.dayRange ?? '—'}`;
  }
  $('#verified-badge').textContent = data.verified ? 'VERIFIED SNAPSHOT' : 'SNAPSHOT';
  const list = $('#source-list');
  list.innerHTML = '';
  const entries = Object.values(data.sourceStatus ?? {});
  if (entries.length) {
    entries.forEach((src) => {
      const item = document.createElement('div');
      item.className = 'source-item';
      const name = document.createElement('strong');
      name.textContent = src.label ?? 'Source';
      const state = document.createElement('span');
      state.textContent = src.ok ? 'OK' : 'UNAVAILABLE';
      item.append(name, state);
      list.appendChild(item);
    });
  } else if (data.sources.length) {
    data.sources.forEach((source) => {
      const item = document.createElement('div');
      item.className = 'source-item';
      item.textContent = source;
      list.appendChild(item);
    });
  } else {
    list.innerHTML = '<div class="empty-state">No source metadata in this snapshot.</div>';
  }
}

function showView(view) {
  const normalized = view === 'DIGITAL' ? 'DIGITAL ASSETS' : view;
  $$('.nav-item, .bottom-nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === normalized);
  });
  $$('[data-view-section]').forEach((section) => {
    const tags = section.dataset.viewSection.split(/\s+/);
    section.classList.toggle('hidden', normalized !== 'BRIEF' && !tags.includes(normalized));
  });
}

function bindNavigation() {
  $$('.nav-item, .bottom-nav button').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
}

function bindTheme() {
  const key = 'macro-desk-theme';
  let saved = null;
  try { saved = localStorage.getItem(key); } catch {}
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(key, next); } catch {}
  });
}

function boot() {
  const raw = window.XAUUSD_DATA ?? {};
  const data = adaptSnapshot(raw);
  renderSnapshot(data);
  renderReactionCards();
  bindNavigation();
  bindTheme();
  showView('BRIEF');
}

if (browser) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
