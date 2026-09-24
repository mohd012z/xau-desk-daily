# BBMA Multi-Timeframe Phase 2 — Design

Date: 2026-09-24
Status: Approved
Parent architecture: `docs/superpowers/specs/2026-09-24-xau-bbma-news-master-engine-design.md`

## Purpose

Complete the BBMA evidence layer by adding Momentum and a deterministic multi-timeframe aggregator for D1/H4/H1/M30/M15/M5. The phase remains shadow-only: it exposes auditable technical evidence and conflicts but does not independently send Telegram/APK BUY/SELL alerts or bypass the existing macro/news and alert-router gates.

## Detector contract

All primitive detectors remain pure, deterministic functions over canonical BBMA candles. Existing Extreme, MHV, CSA and Re-entry behavior is preserved. Momentum follows `bbma-shadow-v1`: BUY requires a candle body close strictly above the upper Bollinger Band; SELL requires a candle body close strictly below the lower Bollinger Band. Wick-only excursions and equality at a band are not Momentum confirmations. Invalid canonical candle data is rejected by the shared validator and insufficient history is explicit.

Detector output retains detector name, detected boolean, direction, timeframe, anchor UTC, rule version, evidence array and status. Evidence is never converted directly into a delivery message.

## Timeframe evidence map

The aggregator accepts series keyed by exactly the supported analytical timeframes: D1, H4, H1, M30, M15 and M5. Each available timeframe is evaluated independently through Extreme, MHV, CSA, Re-entry and Momentum. Missing/insufficient timeframe data remains visible as status rather than being silently treated as neutral evidence.

Each timeframe result contains the primitive detector observations and a compact directional summary derived only from detected observations. BUY-only evidence is BUY, SELL-only evidence is SELL, simultaneous opposing evidence is CONFLICT, and no detected directional evidence is NEUTRAL. No primitive evidence is discarded to manufacture agreement.

## Multi-timeframe summary

The aggregate result exposes all six timeframe slots, directional support lists, explicit conflicts, data-status information and an overall evidence state. It does not claim a trade recommendation. The overall state is descriptive: ALIGNED_BUY, ALIGNED_SELL, MIXED, NEUTRAL or INCOMPLETE. INCOMPLETE takes precedence when required timeframe evidence cannot be evaluated safely; MIXED is used when valid evaluated timeframes contain opposing BUY/SELL evidence.

No numeric confidence score is introduced in this phase. This avoids hiding disagreements behind an arbitrary weighted number before outcome evidence exists.

## Timeframe roles

D1 is major context; H4 primary BBMA structural direction; H1 confirmation/setup development; M30 refinement; M15 primary setup/alert evidence; M5 early confirmation/reaction monitoring. These roles are metadata for downstream confluence/lifecycle policy; Phase 2 does not let a single timeframe independently emit a final notification.

## Boundaries

UTC remains canonical. The phase does not implement ad-hoc MYT conversion, news collection, Telegram delivery, APK delivery, lifecycle transitions or alert cooldown/deduplication. Those remain owned by the existing architecture.

The aggregator must be immutable at its public boundary where practical, deterministic for identical inputs, and preserve rule-version references for auditability.

## Verification

Development is test-first. Momentum tests cover BUY, SELL, wick-only rejection, band equality and insufficient data. Aggregator tests cover all six timeframe slots, aligned BUY/SELL evidence, opposing evidence, primitive same-timeframe conflict, missing/insufficient data, deterministic ordering and immutability. Existing repository regression and HELIX VEYRA safety gates must remain green before integration into `main`.
