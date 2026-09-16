import { BRAND } from '../core/instruments.mjs';
import { adaptSnapshot } from '../adapters/snapshot-adapter.mjs';

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
const raw = window.XAUUSD_DATA ?? {};
const data = adaptSnapshot(raw);

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

function renderSnapshot() {
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
    button.classList.toggle('active', button.dataset.view === normalized || (normalized === 'DIGITAL ASSETS' && button.dataset.view === 'DIGITAL ASSETS'));
  });
  $$('[data-view-section]').forEach((section) => {
    const tags = section.dataset.viewSection.split(/\s+/);
    section.classList.toggle('hidden', normalized !== 'BRIEF' && !tags.includes(normalized));
  });
}

function bindNavigation() {
  $$('.nav-item, .bottom-nav button').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.view));
  });
}

function bindTheme() {
  const key = 'macro-desk-theme';
  const saved = localStorage.getItem(key);
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(key, next);
  });
}

renderSnapshot();
bindNavigation();
bindTheme();
showView('BRIEF');
