# BBMA + News Cross-Function Shadow Phase 4 — Design

Date: 2026-09-24
Status: Approved

## Purpose

Connect existing macro/news event records to the validated BBMA Phase-3 confluence/lifecycle pipeline through an auditable, deterministic shadow observation layer. News/macro is a progression/risk gate, not a BUY/SELL signal generator. No live Telegram/APK/broker execution is introduced.

## Existing contracts reused

Reuse `macro/events/*` for event records/detection/storage, `macro/core/data-health.mjs` for health policy, `macro/core/confirmation-gate.mjs` for normalized `ALLOW | WATCH_ONLY | BLOCK`, Phase-3 BBMA confluence/lifecycle modules, and existing immutable signal-state history. Do not duplicate those responsibilities.

## Architecture

`event records -> XAU relevance/impact normalization -> macro observation -> data-health -> confirmation gate -> BBMA Phase-3 confluence -> lifecycle bridge -> immutable shadow observation`

BBMA remains the sole technical-direction source. Macro/news must never manufacture, flip, or infer BUY/SELL direction.

## XAU event normalization

A pure normalizer consumes explicit event records and explicit observation time. It produces immutable normalized evidence containing event identity/reference, UTC event time, currencies/assets, impact, XAU relevance, phase (`UPCOMING`, `WINDOW`, `POST`, `OUTSIDE`), and reason codes. Unknown/malformed high-impact information fails closed for progression rather than being interpreted as safe.

Phase 4 does not scrape/fetch external news itself. Collection remains an upstream responsibility.

## Macro observation policy

The macro observer aggregates relevant normalized events into a deterministic state:
- `ALLOW`: no relevant event/risk condition currently restricts technical confirmation.
- `WATCH_ONLY`: relevant elevated uncertainty means BBMA evidence may be observed but cannot confirm/activate.
- `BLOCK`: high-impact window, unsafe/missing required data, or explicit blocking condition prevents confirmation/activation.

Policy windows are explicit inputs/configuration and evaluated in UTC. No hidden wall-clock dependency is allowed.

## Data health

Macro/news health and BBMA technical health remain distinct evidence dimensions. Missing/stale/invalid required input must be represented explicitly. The final confirmation gate fails closed when technical confirmation is unsafe or required macro/news state cannot be trusted.

## Shadow observation contract

Each observation preserves:
- symbol and explicit generated UTC;
- BBMA direction/readiness and supporting/conflicting timeframes;
- current lifecycle state/action/reason;
- normalized macro state and event references;
- data-health state/reasons;
- confirmation gate state/reasons;
- Phase-3 candidate/evidence reference or immutable snapshot;
- combined deterministic reason codes.

Example explanatory shape: `BBMA BUY / CONFIRMABLE`, `H4+H1+M15+M5 aligned`, `USD high-impact event`, `macro=WATCH_ONLY`, `lifecycle=SETUP/HOLD`.

## Direction and lifecycle safety

News cannot reverse direction. Existing Phase-3 direction-reversal protection remains authoritative. `MIXED`, `INCOMPLETE`, stale/missing required data, and blocking macro state cannot become confirmed. Lifecycle transitions remain one legal state at a time through the existing signal-state module.

## Side-effect boundary

Phase 4 writes/returns shadow observation data only through explicit caller-owned storage integration. It must not invoke Telegram, APK notification delivery, alert-router live distribution, broker APIs, order placement, position sizing, SL/TP generation, or autonomous trade action.

## Determinism and auditability

Identical explicit inputs and timestamps must produce identical observation content. Every restriction/progression decision must carry machine-readable reason codes and event/evidence references sufficient for replay.

## Verification

Test-first coverage must include: relevant vs irrelevant events, high/medium/unknown impact, pre/window/post timing boundaries, malformed/missing timestamps, stale macro feed, healthy/unhealthy BBMA confirmation data, ALLOW/WATCH_ONLY/BLOCK mapping, BUY/SELL BBMA candidates, MIXED/INCOMPLETE evidence, direction reversal, lifecycle no-skip behavior, deterministic replay, immutability, and absence of live delivery/execution side effects. Repository-wide HELIX VEYRA, migration and safety checks must remain green before merge.
