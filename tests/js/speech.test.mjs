import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySpeechSegment, mergeSpeechRevision, speechPressureForCurrency } from '../../macro/events/speech.mjs';

test('hawkish rate path and inflation concern classify hawkish', () => {
  const r = classifySpeechSegment('Inflation remains too high and rates may need to rise. We are not ready to cut.', { mode: 'prepared_remarks' });
  assert.equal(r.stance, 'HAWKISH');
  assert.ok(r.dimensions.policyPath > 0);
  assert.ok(r.dimensions.inflation > 0);
  assert.ok(r.evidence.length >= 2);
});

test('dovish labour and easing language classify dovish', () => {
  const r = classifySpeechSegment('The labor market is weakening and rate cuts may be appropriate as inflation is easing.', { mode: 'qa' });
  assert.equal(r.stance, 'DOVISH');
  assert.ok(r.dimensions.labour < 0);
});

test('negation guard reverses a direct phrase rather than blindly hawkish', () => {
  const r = classifySpeechSegment('We do not think rates may need to rise from here.');
  assert.ok(r.dimensions.policyPath <= 0);
});

test('revision preserves earlier state and shows reversal shift', () => {
  const first = mergeSpeechRevision(null, classifySpeechSegment('Inflation is easing and rate cuts may be appropriate.', { mode: 'prepared_remarks' }), { at: '2026-09-16T12:00:00Z' });
  const second = mergeSpeechRevision(first, classifySpeechSegment('Rates may need to rise and inflation remains too high.', { mode: 'qa' }), { at: '2026-09-16T12:30:00Z' });
  assert.equal(first.revisionNumber, 1);
  assert.equal(second.revisionNumber, 2);
  assert.ok(second.shift > 0);
  assert.equal(second.mode, 'qa');
});

test('currency pressure uses descriptive labels only', () => {
  assert.equal(speechPressureForCurrency('USD', 0.6), 'UP_PRESSURE');
  assert.equal(speechPressureForCurrency('USD', -0.6), 'DOWN_PRESSURE');
});
