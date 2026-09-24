const STATES = new Set(['ALLOW','WATCH_ONLY','BLOCK']);
export function evaluateConfirmationGate({ macroState, technicalConfirmationAllowed, reasons = [] }) {
  if (!STATES.has(macroState)) throw new TypeError('macroState must be ALLOW, WATCH_ONLY, or BLOCK');
  if (typeof technicalConfirmationAllowed !== 'boolean') throw new TypeError('technicalConfirmationAllowed must be boolean');
  if (!Array.isArray(reasons)) throw new TypeError('reasons must be an array');
  const codes = reasons.map(String);
  let state = macroState;
  if (!technicalConfirmationAllowed) {
    state = 'BLOCK';
    codes.push('TECHNICAL_CONFIRMATION_UNSAFE');
  }
  if (macroState === 'BLOCK') codes.push('MACRO_BLOCK');
  if (macroState === 'WATCH_ONLY') codes.push('MACRO_WATCH_ONLY');
  return Object.freeze({ state, reason_codes: Object.freeze([...new Set(codes)]) });
}
