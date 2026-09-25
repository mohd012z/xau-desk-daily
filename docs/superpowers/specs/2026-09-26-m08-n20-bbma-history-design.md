# M08 / N20 × BBMA Historical Evidence Design

**Date:** 2026-09-26  
**Status:** Design specification — implementation requires separate approved plan  
**Branch:** `feature/bbma-news-shadow-phase6`

## 1. Purpose

Add an independent historical observation layer for two MYT-anchored XAU structures, `M08` and `N20`, then cross-stratify them with existing BBMA/MTF, macro/news, spread, volatility and Phase-5 replay/outcome evidence.

The purpose is empirical validation. The subsystem must measure whether the user's M08/N20 hypotheses survive historical replay without allowing M08/N20, news, or later outcomes to rewrite BBMA technical direction or create broker execution.

## 2. Non-negotiable boundaries

- Canonical observation time is UTC; `Asia/Kuala_Lumpur` is used to derive the MYT anchors.
- M08 and N20 are independent temporal/range observations, not BBMA rules.
- M08/N20 do not automatically generate executable BUY/SELL instructions.
- BBMA remains the technical-direction authority inside the existing BBMA subsystem.
- News/macro contextualizes and gates; it does not create technical direction.
- Outcome data is attached only after the observation and must never leak into original classification.
- HTF snapshots must contain only information available at the historical observation timestamp.
- No broker execution, live cutover, lot sizing, SL/TP generation, or automatic BBMA-rule mutation.
- Missing information is `UNKNOWN`; it must never be silently converted to normal/safe/aligned.

## 3. M08 reference lifecycle

M08 uses the candle associated with the 08:00 MYT anchor as its reference candle.

Stored reference fields:

- `setup_id = M08`
- `trading_date_myt`
- `reference_open_utc`
- `reference_close_utc`
- `reference_open`
- `reference_high`
- `reference_low`
- `reference_close`
- `source_timeframe`
- source/provenance identifiers

After the reference candle is finalized, subsequent closed candles are evaluated against its high and low.

States:

- `WAIT` — no close-confirmed range break.
- `UP` — a subsequent candle closes above the M08 reference high.
- `DOWN` — a subsequent candle closes below the M08 reference low.
- `FALSE_BREAK_UP` — excursion above the high but required close confirmation is absent/rejected.
- `FALSE_BREAK_DOWN` — excursion below the low but required close confirmation is absent/rejected.
- `UNRESOLVED` — evidence cannot support a deterministic state.

A wick alone is not a close-confirmed UP/DOWN state.

## 4. M08 checkpoints

### 11:30 MYT checkpoint

Capture the state known at 11:30 MYT without using later candles. Record:

- confirmed direction or unresolved state;
- first qualifying close timestamp;
- candles elapsed from reference;
- maximum favorable/adverse excursion known by the checkpoint;
- BBMA/MTF snapshot available at that timestamp;
- spread/volatility/data-health context.

### 18:00 MYT checkpoint

Capture a descriptive state, not a forced trading decision:

- `TREND_CONTINUING`
- `PULLBACK`
- `RETESTING_M08`
- `RANGE`
- `REVERSING`
- `UNRESOLVED`

These labels require explicit, versioned definitions before implementation. The design does not assume that trends normally stop at 18:00; replay must measure that hypothesis.

## 5. N20 reference lifecycle

N20 uses the candle associated with the 20:00 MYT anchor and creates a new independent reference range. It must not inherit M08 high/low as its own range.

It stores the same reference/provenance fields and uses the same close-confirmation states:

- `WAIT`
- `UP`
- `DOWN`
- `FALSE_BREAK_UP`
- `FALSE_BREAK_DOWN`
- `UNRESOLVED`

N20 is then related back to M08 as a separate cross-function dimension.

## 6. M08 ↔ N20 relationship

Relationship states are descriptive:

- `SAME_DIRECTION`
- `OPPOSITE_DIRECTION`
- `N20_RANGE`
- `M08_UNRESOLVED`
- `N20_UNRESOLVED`
- `UNKNOWN`

An opposite N20 must never automatically mean reversal.

Example interpretation framework:

- M08 UP + N20 DOWN + bullish HTF/BBMA intact → pullback/M08-retest candidate.
- M08 DOWN + N20 UP + bearish HTF/BBMA intact → pullback/M08-retest candidate.
- Opposite N20 + opposite HTF transition + independently valid opposite BBMA structure → reversal candidate.
- Opposite N20 + mixed BBMA/HTF → unresolved conflict.

These are classifications to test, not guaranteed market behavior.

## 7. M08 retest model

A retest must not be counted merely because price later touches a historical level. Separate states:

- `M08_RETEST_TOUCH` — later price revisits the versioned M08 retest zone.
- `M08_RETEST_HOLD` — retest occurs and later closed-candle evidence satisfies the versioned hold rule.
- `M08_RETEST_FAIL` — retest occurs and closed-candle evidence satisfies the versioned failure rule.
- `M08_REVERSAL_TRANSITION` — failed structure plus independently observed opposite BBMA/HTF transition.

The exact zone tolerance and hold/failure rules must be explicit policy inputs and versioned; no hidden pip/point tolerance.

## 8. BBMA cross-function snapshot

M08/N20 must consume BBMA as immutable evidence. At each relevant historical timestamp capture only information then available:

- D1/H4/H1/M30/M15/M5 directional evidence where available;
- confluence readiness/status;
- direction conflict and HTF conflict flags;
- Reentry state;
- CSA state;
- MHV state;
- Extreme state;
- Momentum state;
- reason codes and provenance exposed by the existing BBMA engine.

M08/N20 agreement must never upgrade a BBMA `BLOCKED` or mixed state to `CONFIRMABLE`.

Cross-relation values:

- `ALIGNED`
- `COUNTER_STRUCTURE`
- `MIXED`
- `BLOCKED`
- `UNKNOWN`

## 9. HTF and look-ahead protection

Historical reconstruction must be point-in-time safe.

For an observation timestamp T:

- no candle whose close timestamp is after T may be used as a closed-candle input;
- no later M08/N20 outcome may be used to classify BBMA at T;
- no future news result/market reaction may be used to alter the event context at T;
- source timestamps and replay IDs must remain traceable.

Tests must explicitly prove that future H1/H4 closes and later outcomes cannot change an earlier classification.

## 10. News/macro context

N20 evidence should be stratified by event context because the 20:00+ MYT period may overlap important U.S. macro events depending on date and DST.

Store, where available:

- event class (inflation, employment, central-bank/rates, growth, etc.);
- impact classification from the normalized event source;
- event timestamp UTC;
- proximity bucket (`PRE_EVENT`, `EVENT_WINDOW`, `POST_EVENT`, `OUTSIDE`, `UNKNOWN`);
- gate state and gate reason;
- data health/freshness.

Do not encode CPI/FOMC/etc. as automatic reversal or continuation causes. Replay measures the conditional outcomes.

## 11. Historical replay unit

Primary replay unit: one MYT trading date.

A complete daily evidence record can contain:

1. M08 reference.
2. M08 first close-confirmed break or unresolved state.
3. 11:30 checkpoint.
4. 18:00 checkpoint.
5. N20 reference.
6. N20 first close-confirmed break or unresolved state.
7. M08↔N20 relationship.
8. Point-in-time BBMA/MTF snapshots.
9. Macro/news context.
10. Spread/volatility/data-health regimes.
11. Later outcomes attached by explicit horizons.

Partial days remain valid evidence with missing fields explicitly marked; they must not be silently dropped.

## 12. Outcome taxonomy

Outcome labels are descriptive and horizon-bound:

- `CONTINUE`
- `RANGE`
- `RETEST_TOUCH`
- `RETEST_HOLD`
- `RETEST_FAIL`
- `FALSE_BREAK`
- `REVERSAL`
- `UNRESOLVED`
- `UNKNOWN`

Each outcome must specify the evaluation horizon and policy version. The same observation may have different outcomes at different horizons.

## 13. Evidence matrix

Phase 6 should be able to stratify by:

`setup × setup_direction × M08_N20_relation × BBMA_setup × BBMA_direction × MTF_readiness × cross_relation × HTF_state × event_class × event_proximity × spread_regime × volatility_regime × data_health × outcome_horizon`

Every populated stratum must retain:

- observation count;
- valid outcome count;
- missing outcome count;
- distinct MYT trading dates;
- oldest/latest observation UTC;
- replay IDs;
- source references;
- outcome distribution;
- UNKNOWN/sparse flags.

No synthetic filling or interpolation of sparse cells.

## 14. Validation questions

The subsystem must support evidence-based answers to questions such as:

- How often does an M08 close-confirmed direction remain established by 11:30?
- What is the observed 18:00 state distribution after M08 UP vs DOWN?
- When N20 opposes M08, how often is the subsequent state retest-hold, retest-fail, range, continuation or reversal?
- Does the distribution differ when H4/H1 BBMA remains aligned with M08?
- Does an opposite independently valid BBMA/HTF transition distinguish reversal candidates from ordinary pullbacks?
- How do high-impact macro-event windows differ from OUTSIDE-event observations?
- Are apparent effects supported across enough distinct dates and regimes, or driven by a small/sparse sample?

The system reports counts/distributions and sufficiency under declared policy; it does not claim causality.

## 15. Proposed module boundaries

- `macro/temporal/m08-n20-policy.mjs` — explicit MYT anchor/reference/checkpoint/retest policy.
- `macro/temporal/m08-n20-detector.mjs` — pure reference and close-break detection.
- `macro/temporal/m08-n20-checkpoints.mjs` — deterministic 11:30/18:00 snapshots.
- `macro/temporal/m08-n20-relation.mjs` — M08↔N20 relationship classification.
- `macro/temporal/m08-retest.mjs` — touch/hold/fail/reversal-transition evidence.
- `macro/temporal/bbma-cross-context.mjs` — immutable relation between temporal structure and existing BBMA/MTF evidence.
- `macro/replay/m08-n20-daily-replay.mjs` — point-in-time daily replay composition.
- Phase-6 maturity modules consume these outputs as additional dimensions rather than embedding temporal logic in the maturity classifier.

## 16. Failure handling

Reject or explicitly mark invalid/unknown for:

- invalid timestamps/timezones;
- duplicate/inconsistent reference candles;
- non-monotonic candle series;
- incomplete OHLC;
- missing source timeframe;
- policy-version mismatch;
- future-candle leakage;
- duplicate replay IDs with conflicting content.

Never silently repair evidence in a way that changes historical classification.

## 17. Testing strategy

TDD implementation must cover:

- exact 08:00 and 20:00 MYT anchor selection after UTC conversion;
- candle-close confirmation vs wick-only excursions;
- several-candle delayed breakout;
- no-break/range days;
- 11:30 and 18:00 point-in-time boundaries;
- independent N20 reference range;
- same/opposite/unresolved M08↔N20 relations;
- M08 retest touch/hold/fail separation;
- BBMA aligned/counter/mixed/blocked relations;
- future HTF candle exclusion;
- future outcome leakage exclusion;
- event proximity with explicit UTC timestamps;
- incomplete/UNKNOWN preservation;
- deterministic replay of identical inputs;
- deep immutability where Phase-6 evidence contracts require it.

## 18. Acceptance criteria

The feature is acceptable only when:

1. historical M08/N20 observations are deterministic and reproducible;
2. MYT anchors are derived from explicit timezone handling;
3. wick-only and close-confirmed events are distinct;
4. M08 and N20 maintain independent reference ranges;
5. opposite N20 is not automatically labelled reversal;
6. BBMA/HTF validity is preserved and never upgraded by temporal agreement;
7. future candles/outcomes cannot affect earlier classifications;
8. missing data remains visible;
9. every evidence result is replay/source traceable;
10. full repository tests and CI remain green before integration;
11. no live trading/execution behavior is introduced.

## 19. Out of scope

- broker order placement;
- automatic live BUY/SELL creation from M08/N20;
- SL/TP or lot sizing;
- automatic parameter optimization against historical outcomes;
- rewriting BBMA rules based on M08/N20 results;
- claiming historical association proves future profitability or causality.
