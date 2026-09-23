#!/usr/bin/env python3
"""Pure relevance rules for the public XAU macro-news feed.

News providers can return broad matches even when a query requests gold plus a
macro driver.  Publication therefore uses a second, deterministic content gate:
articles must contain both a gold/XAU concept and a material macro driver.
"""
from __future__ import annotations

import re
from copy import deepcopy
from typing import Any


GOLD_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\bgold\b",
        r"\bxau(?:\s*/\s*usd|usd)?\b",
        r"\bbullion\b",
        r"\bprecious\s+metals?\b",
    )
)

MACRO_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\bfed(?:eral\s+reserve)?\b",
        r"\bfomc\b",
        r"\bcentral\s+bank(?:s)?\b",
        r"\bdollar\b",
        r"\bdxy\b",
        r"\busd\b",
        r"\btreasur(?:y|ies)\b",
        r"\byields?\b",
        r"\bbond\s+(?:market|yields?)\b",
        r"\binflation\b",
        r"\bcpi\b",
        r"\bpce\b",
        r"\binterest\s+rates?\b",
        r"\brate\s+(?:cut|cuts|hike|hikes|decision|decisions|pause|pauses)\b",
        r"\bmonetary\s+policy\b",
        r"\bnonfarm\s+payrolls?\b",
        r"\bpayrolls?\b",
        r"\bunemployment\b",
        r"\bjobs?\s+(?:data|report|growth|market)\b",
        r"\bgdp\b",
        r"\brecession\b",
        r"\bsafe[-\s]?haven\b",
        r"\bgeopolitical\b",
        r"\bwar\b",
        r"\bconflict\b",
        r"\bsanctions?\b",
        r"\btariffs?\b",
    )
)


def _matches_any(patterns: tuple[re.Pattern[str], ...], text: str) -> bool:
    return any(pattern.search(text) for pattern in patterns)


def is_gold_macro_relevant(text: str | None) -> bool:
    """Return True only when text contains both XAU/gold and a macro driver."""
    if not text:
        return False
    normalized = " ".join(str(text).split())
    if not normalized:
        return False
    return _matches_any(GOLD_PATTERNS, normalized) and _matches_any(MACRO_PATTERNS, normalized)


def filter_snapshot_news(snapshot: dict[str, Any], limit: int = 8) -> dict[str, Any]:
    """Return a copy with only XAU/macro-relevant news items."""
    out = deepcopy(snapshot)
    raw_news = out.get("news")
    if not isinstance(raw_news, list):
        return out

    kept: list[dict[str, Any]] = []
    for item in raw_news:
        if not isinstance(item, dict):
            continue
        text = f"{item.get('title') or ''} {item.get('summary') or ''}".strip()
        if is_gold_macro_relevant(text):
            kept.append(item)
        if len(kept) >= max(0, int(limit)):
            break

    out["news"] = kept
    source_status = (out.get("meta") or {}).get("sourceStatus")
    if isinstance(source_status, dict) and isinstance(source_status.get("news"), dict):
        source_status["news"]["detail"] = f"{len(kept)} relevant recent items"

    return out
