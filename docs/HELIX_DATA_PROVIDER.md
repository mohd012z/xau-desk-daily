# HELIX Data Provider Contract

Future market/news providers should implement a replaceable contract instead of being called directly throughout VEYRA.

Conceptual interface:

```js
{
  getHistory(symbol, timeframe),
  subscribeTicks(symbol, onTick),
  getNews(symbol),
  health(),
  normalize(raw)
}
```

Provider health should track availability, latency, freshness, malformed responses, rate-limit state, last success, and failure count. Failover should prefer another configured provider and then an explicitly stale-marked local cache rather than silently presenting old data as live.

Raw OHLC/event data remains separate from derived Intelligence calculations so strategy logic can be recalculated after engine updates.
