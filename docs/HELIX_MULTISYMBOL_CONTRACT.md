# HELIX Multi-Symbol Contract

Multi-symbol support is deferred until the single-symbol Intelligence runtime is stable.

Each symbol must own isolated state for:
- OHLC/history
- timeframe aggregation
- indicator/strategy state
- freshness/feed health
- Pulse/news context
- alerts

Shared mutable strategy state between symbols is prohibited. Provider adapters may share network infrastructure, but normalized market state remains symbol-scoped.
