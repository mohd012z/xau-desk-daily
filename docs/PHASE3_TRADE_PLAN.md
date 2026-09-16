# Phase 3 MYT Event Trade Plan

The Phase 3 Trade Plan is an analytical event view. UTC is canonical internally; user-facing event and revision times use `Asia/Kuala_Lumpur` and the `MYT` label.

The plan keeps model pressure (`UP_PRESSURE`, `DOWN_PRESSURE`, `MIXED`) separate from observed reaction (`UP`, `DOWN`, `MIXED`, `NOT_YET_MEASURED`) and derives `CONFIRMED`, `PARTIAL`, `DIVERGENCE`, or `PENDING` only as a descriptive comparison.

Historical event samples provide median, 50% and 80% ranges. FX ranges can be converted with instrument pip size; XAU and digital assets use their own price/percentage units.

## Pivot reference

Pivot references use the previous completed period high, low and close. Classic levels are P, R1/R2/R3 and S1/S2/S3. A pivot level is marked `CONFLUENCE` only when it lies inside the historical conditional price band in the relevant pressure direction; otherwise the plan reports `NO_PIVOT_CONFLUENCE`. The pivot timeframe and source must be shown, for example `D1 • PREVIOUS_COMPLETED_PERIOD`.

ATR remains volatility/range context. It is not silently converted into an automatic order instruction. The event Trade Plan does not generate automatic entry, stop-loss, take-profit, BUY, or SELL fields.

## Quality

Low sample size, low timestamp confidence, stale/offline market data, or model disagreement are exposed as quality reasons. Missing trustworthy history returns an insufficient-data state rather than fabricated levels.

## Revision history

Material news/speech changes append a new plan revision with both UTC and derived MYT timestamps. Earlier revisions remain available so prepared remarks and later Q&A shifts can be audited.