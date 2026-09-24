# BBMA Confluence & Lifecycle Phase 3 — Design

Date: 2026-09-24
Status: Approved
Parent architecture: `docs/superpowers/specs/2026-09-24-xau-bbma-news-master-engine-design.md`

## Purpose

Convert the Phase-2 BBMA multi-timeframe evidence map into an auditable shadow candidate that can progress through the repository's existing signal lifecycle while remaining gated by macro/news and data-health policy. Phase 3 does not send Telegram/APK alerts and does not execute trades.

## Existing contracts reused

Phase 3 consumes `aggregateBbmaEvidence()` and reuses `macro/core/signal-state.mjs`. It must not introduce a second lifecycle implementation. Existing legal transitions remain `DETECTED -> WATCH -> SETUP -> CONFIRMED -> ACTIVE -> INVALIDATED | EXPIRED`.

The BBMA evidence states remain descriptive: `ALIGNED_BUY`, `ALIGNED_SELL`, `MIXED`, `NEUTRAL`, `INCOMPLETE`. Opposing and incomplete evidence must remain visible and cannot be converted into agreement by weighting or omission.

## Confluence model

The confluence evaluator is deterministic and rule-based rather than a free-form confidence score. It returns direction, readiness, reason codes, supporting timeframes, conflicts, and data status.

Timeframe roles are retained from Phase 2: D1 major context, H4 primary structure, H1 confirmation, M30 refinement, M15 primary setup, M5 early confirmation.

A candidate may be directional only when the evaluated evidence contains a single direction and required setup evidence is available. `MIXED`, `INCOMPLETE`, and `NEUTRAL` cannot become `CONFIRMED` or `ACTIVE`.

Phase 3 uses explicit readiness levels:
- `OBSERVED`: directional evidence exists but required structure/setup evidence is not complete.
- `WATCHABLE`: H4 structure agrees with at least one lower-timeframe directional observation.
- `SETUP_READY`: H4 and H1 agree and M15 provides same-direction setup evidence; no opposing timeframe conflict exists.
- `CONFIRMABLE`: `SETUP_READY` plus M5 same-direction confirmation; no conflict/incomplete state and downstream gates permit technical confirmation.
- `BLOCKED`: macro/news/data-health policy forbids progression even when technical evidence is otherwise sufficient.

D1 is context evidence and is always preserved. A D1 disagreement is an explicit higher-timeframe conflict and prevents `CONFIRMABLE`; it is never silently ignored.

## Lifecycle bridge

A separate bridge maps readiness to the existing lifecycle without skipping states. New candidates start at `DETECTED`. `WATCHABLE` permits `DETECTED -> WATCH`; `SETUP_READY` permits `WATCH -> SETUP`; `CONFIRMABLE` permits `SETUP -> CONFIRMED`. Activation remains a downstream policy decision and is not automatically performed merely because BBMA is confirmable.

If previously valid evidence becomes directionally contradictory, the bridge emits an invalidation recommendation/reason for downstream handling. Expiry requires an explicit UTC time/policy supplied by the caller; no hidden wall-clock dependency is introduced.

Every applied transition uses the existing immutable `transitionSignal()` history contract with explicit UTC timestamp and reason.

## Macro/news and data-health gate

The bridge accepts normalized downstream gate input rather than fetching news itself. Gate input must distinguish at minimum `ALLOW`, `WATCH_ONLY`, and `BLOCK`. `BLOCK` prevents confirmation/activation; `WATCH_ONLY` may retain/enter WATCH but cannot confirm; `ALLOW` permits technical lifecycle progression when confluence requirements are satisfied.

Unavailable or unsafe technical confirmation data must fail closed for confirmation. The original gate state and reason codes remain in the candidate for auditability.

## Candidate contract

The public shadow candidate includes symbol, direction, state, readiness, BBMA rule version, MTF evidence snapshot/reference, supporting/conflicting timeframes, gate state, reason codes, generated UTC and immutable lifecycle history. It must be deterministic for the same explicit inputs.

No direct network delivery, Telegram/APK invocation, broker execution, position sizing, SL/TP generation, or autonomous trade action is permitted in Phase 3.

## Verification

Development is test-first. Tests cover aligned BUY and SELL paths, H4/H1/M15/M5 requirements, D1 disagreement, same-timeframe conflict, cross-timeframe MIXED, missing/insufficient data, macro `WATCH_ONLY`/`BLOCK`, data-health fail-closed behavior, legal lifecycle progression without state skipping, invalidation recommendation, explicit expiry handling, deterministic replay, immutability and absence of delivery side effects.

Repository-wide HELIX VEYRA CI, migration safety, JavaScript/Python validation, event-history validation and safety checks must remain green before integration into `main`.
