const MYT_ZONE = 'Asia/Kuala_Lumpur';
const MONTH = { Jan:'Jan',Feb:'Feb',Mar:'Mar',Apr:'Apr',May:'May',Jun:'Jun',Jul:'Jul',Aug:'Aug',Sep:'Sep',Oct:'Oct',Nov:'Nov',Dec:'Dec' };

export function formatMyt(isoUtc) {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) throw new TypeError('Invalid UTC timestamp');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MYT_ZONE, day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
  }).formatToParts(date);
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.day} ${MONTH[p.month] || p.month} ${p.year} ${p.hour}:${p.minute}:${p.second} MYT`;
}

function clock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h,m,s].map(v => String(v).padStart(2,'0')).join(':');
}

export function countdownTo(eventTimeUtc, nowUtc = new Date().toISOString()) {
  const eventMs = new Date(eventTimeUtc).getTime();
  const nowMs = new Date(nowUtc).getTime();
  if (!Number.isFinite(eventMs) || !Number.isFinite(nowMs)) throw new TypeError('Invalid UTC timestamp');
  const delta = Math.round((eventMs - nowMs) / 1000);
  const upcoming = delta > 0;
  const totalSeconds = Math.abs(delta);
  return { phase: upcoming ? 'UPCOMING' : 'ELAPSED', totalSeconds, text: `${upcoming ? 'T-' : 'T+'}${clock(totalSeconds)}` };
}

export { MYT_ZONE };