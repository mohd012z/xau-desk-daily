#!/usr/bin/env python3

from pathlib import Path
import os
import re
import sys

path = Path("xauusd-data.js")

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
print("Snapshot verification passed.")
