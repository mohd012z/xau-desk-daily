# HELIX Time Policy

Canonical storage/API timestamps use UTC. VEYRA converts timestamps at the display boundary.

Default user-facing trading/event timezone for the current project is `Asia/Kuala_Lumpur` (MYT, UTC+08:00).

This policy applies consistently to Pulse events, charts, Intelligence, alerts, Telegram messages, logs, history, and cloud snapshots. Modules must not independently add a fixed eight-hour offset to timestamps that have already been converted.
