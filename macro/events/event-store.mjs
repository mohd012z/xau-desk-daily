import { detectEvent } from './detector.mjs';
import { classifySpeechSegment, mergeSpeechRevision } from './speech.mjs';

function revisionText(revision) { return revision?.rawText ?? ''; }
function sortEvents(items) { return [...items].sort((a,b) => Date.parse(b.eventTimeUtc ?? 0) - Date.parse(a.eventTimeUtc ?? 0)); }

export function createEventStore({ detectorOptions = {}, onUpdate = () => {} } = {}) {
  const map = new Map();
  const listeners = new Set();
  const notify = (event, change) => {
    if (event?.state === 'CLOSED') return;
    onUpdate(event, change);
    for (const fn of listeners) fn(event, change);
  };

  function appendRevision(event, candidate) {
    const text = String(candidate.text ?? '').trim();
    if (!text || revisionText(event.revisions.at(-1)) === text) return { changed: false, event };
    if (candidate.isSpeech) {
      const result = classifySpeechSegment(text, { mode: candidate.speechMode ?? 'unscheduled_comments' });
      const previous = event.revisions.at(-1)?.speech ?? null;
      const speech = mergeSpeechRevision(previous, result, { at: candidate.providerEventAt ?? candidate.receivedAt ?? event.eventTimeUtc });
      event.revisions.push({ revisionNumber: event.revisions.length + 1, at: speech.at, type: 'speech', rawText: text, speech });
      event.speech = speech;
    } else {
      event.revisions.push({ revisionNumber: event.revisions.length + 1, at: candidate.providerEventAt ?? candidate.articlePublishedAt ?? candidate.receivedAt ?? null, type: 'news_update', rawText: text });
    }
    event.text = text;
    return { changed: true, event };
  }

  function ingest(candidate) {
    const existing = [...map.values()];
    const result = detectEvent(candidate, existing, detectorOptions);
    if (result.accepted) {
      const event = result.event;
      event.materiality = result.materiality;
      if (candidate.isSpeech) appendRevision(event, candidate);
      else if (candidate.text) event.revisions.push({ revisionNumber: 1, at: event.eventTimeUtc, type: 'news', rawText: candidate.text });
      map.set(event.id, event);
      notify(event, 'created');
      return { accepted: true, change: 'created', event };
    }
    if (result.reason === 'DUPLICATE' && result.event) {
      const updated = appendRevision(result.event, candidate);
      if (updated.changed) notify(updated.event, 'revised');
      return { accepted: false, change: updated.changed ? 'revised' : 'duplicate', event: updated.event };
    }
    return { accepted: false, change: 'rejected', event: null, reason: result.reason };
  }

  return {
    ingest,
    ingestMany(candidates = []) { return candidates.map(ingest); },
    list() { return sortEvents([...map.values()].filter(event => event.state !== 'CLOSED')); },
    listAll() { return sortEvents(map.values()); },
    get(id) { return map.get(id) ?? null; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    clear() { map.clear(); }
  };
}
