# HELIX Provider Health

Each live/history/news provider should expose health metadata including availability, latency, freshness, malformed-response count, rate-limit state, last successful response, and recent failure count.

Failover policy:
1. primary provider;
2. configured fallback provider(s);
3. local cached data explicitly marked stale/offline.

VEYRA should never silently label fallback cached data as live.
