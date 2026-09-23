#!/usr/bin/env python3

from pathlib import Path
import json
import os
import re
import sys

from news_relevance import filter_snapshot_news

path = Path("xauusd-data.js")
ASSIGNMENT = "window.XAUUSD_DATA = "

if not path.exists():
    print("ERROR: xauusd-data.js was not generated")
    sys.exit(1)

text = path.read_text(encoding="utf-8")

secret_names = [
    "TWELVE_DATA_API_KEY",
    "FRED_API_KEY",
    "NEWS_API_KEY",
]

secrets = []

for name in secret_names:
    value = os.getenv(name, "").strip()

    if value:
        secrets.append(value)
        text = text.replace(value, "[REDACTED]")

# Remove API keys that appear inside URLs or error messages.
text = re.sub(
    r"(?i)(apikey|api_key|api-key|token|access_token)=([^&\"'\s]+)",
    r"\1=[REDACTED]",
    text,
)

# Parse the generated payload and apply deterministic public-feed sanitation.
# Provider search is intentionally treated as discovery only: an article is
# published only when its own title/summary contains both a gold/XAU concept
# and a material macro driver.
try:
    marker_pos = text.find(ASSIGNMENT)
    if marker_pos < 0:
        raise ValueError("window.XAUUSD_DATA assignment not found")
    json_start = marker_pos + len(ASSIGNMENT)
    json_end = text.rfind(";")
    if json_end <= json_start:
        raise ValueError("snapshot assignment is incomplete")
    snapshot = json.loads(text[json_start:json_end].strip())
    if not isinstance(snapshot, dict):
        raise ValueError("snapshot payload is not an object")
    before_news = len(snapshot.get("news") or []) if isinstance(snapshot.get("news"), list) else 0
    snapshot = filter_snapshot_news(snapshot)
    after_news = len(snapshot.get("news") or []) if isinstance(snapshot.get("news"), list) else 0
    text = text[:json_start] + json.dumps(snapshot, ensure_ascii=False, indent=2) + text[json_end:]
except (ValueError, json.JSONDecodeError) as exc:
    print(f"ERROR: Public snapshot sanitation failed: {exc}")
    sys.exit(1)

path.write_text(text, encoding="utf-8")

cleaned = path.read_text(encoding="utf-8")

# Final security check.
for value in secrets:
    if value and value in cleaned:
        print("ERROR: Secret value still detected in public file")
        sys.exit(1)

# Verify that the generated snapshot still looks valid.
required = [
    "window.XAUUSD_DATA",
    '"generatedAt"',
    '"verified"',
    '"sourceStatus"',
]

missing = [item for item in required if item not in cleaned]

if missing:
    print("ERROR: Generated snapshot missing:", missing)
    sys.exit(1)

print("Security check passed.")
print(f"News relevance filter: {before_news} fetched -> {after_news} published.")
print("Snapshot verification passed.")
