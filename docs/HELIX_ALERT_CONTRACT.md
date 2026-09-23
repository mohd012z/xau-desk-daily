# VEYRA Alert Contract

Alerts are a later gate after runtime freshness and historical bootstrap are reliable.

Normalized alert fields:
- symbol
- timeframe
- condition
- direction/state
- price/reference
- timestamp UTC
- display timestamp MYT
- news/event context
- freshness

Delivery targets may include VEYRA in-app display, Android notifications, and Telegram. Alert generation must not label stale or insufficient data as live intelligence.
