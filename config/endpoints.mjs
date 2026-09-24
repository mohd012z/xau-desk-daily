export const ENDPOINTS = Object.freeze({
  pulse: null,
  history: null,
  live: null,
  config: null
});

export function auditEndpoint(value, { allowLocalhost = false } = {}) {
  const reasons = [];
  if (value == null || value === '') return { ok: true, reasons };
  let url;
  try { url = new URL(value); } catch { return { ok: false, reasons: ['invalid_url'] }; }
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.username || url.password) reasons.push('embedded_credentials');
  if (url.protocol !== 'https:' && !(allowLocalhost && local)) reasons.push('https_required');
  if (/raw\.githubusercontent\.com$/i.test(url.hostname) && /\/mohd012z\/xau-desk-daily\//i.test(url.pathname)) reasons.push('legacy_repository_coupling');
  return { ok: reasons.length === 0, reasons };
}
