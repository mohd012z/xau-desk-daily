#!/usr/bin/env python3
"""Normalize generated XAU snapshot semantics before publishing.

The legacy updater historically stored the latest daily close under ``price.spot``
and the highest value in its rolling provider window under ``price.ath``.  This
post-processing step keeps the legacy ``spot`` alias for compatibility, while
adding explicit fields that describe what the data actually represents.
"""
from __future__ import annotations

import json
import re
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATH = ROOT / "xauusd-data.js"
ASSIGNMENT = "window.XAUUSD_DATA = "
ROLLING_BARS_RE = re.compile(r"rolling history used:\s*(\d+)\s*bars", re.IGNORECASE)
PROVIDER_BAR_RE = re.compile(r"Latest provider daily bar:\s*([^;]+)", re.IGNORECASE)


def normalize_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Return a normalized copy of a generated snapshot without mutating input."""
    out = deepcopy(snapshot)
    meta = out.setdefault("meta", {})
    price = out.setdefault("price", {})

    if str(meta.get("cadence") or "").strip().lower() != "daily":
        return out

    if price.get("latestDailyClose") is None and price.get("spot") is not None:
        price["latestDailyClose"] = price["spot"]
    price["priceType"] = "DAILY_CLOSE"

    if price.get("rollingHigh") is None and price.get("ath") is not None:
        price["rollingHigh"] = price["ath"]
    # The collector only requests a rolling history window, so this cannot be
    # truthfully labelled as an all-time high.
    if "ath" in price:
        price["ath"] = None

    note = str(price.get("note") or "")
    if price.get("rollingWindowBars") is None:
        match = ROLLING_BARS_RE.search(note)
        if match:
            price["rollingWindowBars"] = int(match.group(1))

    if price.get("providerBarTime") is None:
        match = PROVIDER_BAR_RE.search(note)
        if match:
            price["providerBarTime"] = match.group(1).strip()

    return out


def load_generated_snapshot(path: Path) -> tuple[str, dict[str, Any], str]:
    text = path.read_text(encoding="utf-8")
    marker_pos = text.find(ASSIGNMENT)
    if marker_pos < 0:
        raise ValueError(f"{path} does not contain {ASSIGNMENT!r}")

    json_start = marker_pos + len(ASSIGNMENT)
    json_end = text.rfind(";")
    if json_end <= json_start:
        raise ValueError(f"{path} does not contain a complete snapshot assignment")

    payload = json.loads(text[json_start:json_end].strip())
    if not isinstance(payload, dict):
        raise ValueError("snapshot payload must be a JSON object")
    return text[:json_start], payload, text[json_end:]


def normalize_file(path: Path = DEFAULT_PATH) -> bool:
    prefix, payload, suffix = load_generated_snapshot(path)
    normalized = normalize_snapshot(payload)
    if normalized == payload:
        return False

    path.write_text(
        prefix + json.dumps(normalized, ensure_ascii=False, indent=2) + suffix,
        encoding="utf-8",
    )
    return True


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    path = Path(args[0]).resolve() if args else DEFAULT_PATH
    try:
        changed = normalize_file(path)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: snapshot semantic normalization failed: {exc}", file=sys.stderr)
        return 2

    print(f"Snapshot semantics {'updated' if changed else 'already normalized'}: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
