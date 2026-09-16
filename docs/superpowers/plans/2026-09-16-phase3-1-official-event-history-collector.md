# Phase 3.1 Official Event History Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an official-first, fail-closed collector that discovers verified U.S. macro events, captures deterministic PRE/+1m/+5m/+15m M1 market reactions, publishes only eligible samples to Phase 3 history, and exposes collection health/provenance in the MYT-first dashboard.

**Architecture:** Python source adapters normalize BLS, DOL, and Federal Reserve records into a canonical event catalog; a separate market-window collector retrieves provider M1 bars and writes verified reaction samples plus operational state. Existing JavaScript Phase 3 consumers remain analytical-only and consume the public catalog/history through explicit eligibility, support-state, anti-leakage, and Pivot provenance gates.

**Tech Stack:** Python 3.13 standard library + `requests>=2.32,<3` + `beautifulsoup4>=4.12,<5`; Node.js 22 ES modules and `node:test`; GitHub Actions; static JSON + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-16-phase3-1-official-event-history-collector-design.md`

## Global Constraints

- Official-first sources: BLS, U.S. DOL/ETA, and Federal Reserve for the first production release; BEA remains an adapter boundary only.
- Canonical storage/comparison timezone is UTC; U.S. official local times are interpreted with `America/New_York`; UI display uses `Asia/Kuala_Lumpur`.
- Primary reaction windows are `+1m`, `+5m`, and `+15m`, all sharing one completed pre-event M1 reference.
- No sub-minute +10s/+30s baseline requirement.
- Missing market bars are never interpolated, copied, or guessed.
- `consensus` and `surpriseZ` remain null unless a separately verified source is introduced.
- Public reaction sample identity is `eventId + "|" + symbol + "|" + window`.
- Initial instrument universe is `XAU/USD`, `EUR/USD`, `GBP/USD`, `USD/JPY`, `BTC/USD`, `ETH/USD`.
- Collector recovery horizon is 48 hours.
- Generated-data writers use shared concurrency group `macro-data-writers` and never force-push.
- Operational state is not model evidence and is not required in the GitHub Pages artifact.
- Classic Pivot provenance remains previous completed provider period with provider/timeframe/boundary/open/close UTC metadata.
- Production `index.html` must remain unchanged unless a later separately approved change explicitly modifies it.
- No automatic order-placement fields, `BUY setup`, `SELL setup`, `Stop loss`, or `Take profit` language in Phase 3.1 analytical surfaces.
- External-source deterministic tests use fixtures/mocks; live-source checks are separate and fail safely.

---

## File Structure Map

### Python collector package

- `scripts/event_history/__init__.py` — package marker and exported constants only.
- `scripts/event_history/models.py` — canonical event/sample/state normalization and validation helpers.
- `scripts/event_history/time_utils.py` — `America/New_York` → UTC conversion and deterministic UTC helpers.
- `scripts/event_history/official_base.py` — shared HTTP/text helpers and source-adapter protocol.
- `scripts/event_history/bls_adapter.py` — CPI/PPI/Employment Situation schedule/release normalization.
- `scripts/event_history/dol_adapter.py` — Initial Jobless Claims normalization.
- `scripts/event_history/fed_adapter.py` — FOMC and scheduled speech normalization.
- `scripts/event_history/catalog.py` — stable IDs, merge/revision preservation, catalog validation, atomic JSON writes.
- `scripts/event_history/market_windows.py` — Twelve Data M1 retrieval and deterministic PRE/+1m/+5m/+15m selection.
- `scripts/event_history/history_writer.py` — sample identity, eligibility, deduplication, conflict quarantine, history merge.
- `scripts/event_history/state.py` — retry counters, recovery horizon, window completion, quarantine operational state.
- `scripts/update_event_catalog.py` — CLI entry point for official event discovery.
- `scripts/update_event_history.py` — CLI entry point for post-release market collection.

### Deterministic Python tests/fixtures

- `tests/python/test_models.py`
- `tests/python/test_time_utils.py`
- `tests/python/test_bls_adapter.py`
- `tests/python/test_dol_adapter.py`
- `tests/python/test_fed_adapter.py`
- `tests/python/test_catalog.py`
- `tests/python/test_market_windows.py`
- `tests/python/test_history_writer.py`
- `tests/python/test_state.py`
- `tests/python/test_cli_dry_run.py`
- `tests/python/fixtures/bls_schedule.html`
- `tests/python/fixtures/bls_cpi_release.html`
- `tests/python/fixtures/dol_claims.html`
- `tests/python/fixtures/fed_fomc_calendar.html`
- `tests/python/fixtures/fed_speeches.html`
- `tests/python/fixtures/twelvedata_m1.json`

### Public/generated data

- `data/event-catalog.json` — official event facts only.
- `data/event-history.json` — eligible public market-reaction samples.
- `data/event-history-state.json` — operational recovery/audit state; not model evidence.

### Existing JavaScript/UI integration

- `macro/history/history-schema.mjs` — accept/protect new sample provenance fields without weakening existing validation.
- `macro/adapters/history-adapter.mjs` — retain rejection accounting and expose public dataset metadata.
- `macro/history/advance-model.mjs` — enforce exact event type/window and support-state gates.
- `macro/ui/history-health.mjs` — pure health-summary calculator/renderer.
- `macro/ui/app.mjs` — load catalog/history, render health, and stop using an unverified daily snapshot as event-aligned ADVANCE reference.
- `macro/ui/phase3.css` — compact History Health/provenance styling.
- `macro-preview.html` — add History Health host only; keep production `index.html` untouched.

### Workflows

- `.github/workflows/event-catalog.yml`
- `.github/workflows/event-window-collector.yml`
- `.github/workflows/xauusd-daily.yml` — migrate writer concurrency to `macro-data-writers` and synchronize before push.
- `.github/workflows/macro-phase3-ci.yml` — Python tests, JSON/schema validation, source safety, JS regression tests.
- `.github/workflows/macro-desk-ci.yml` — include Phase 3.1 Python/JSON checks on relevant paths.
- `.github/workflows/pages.yml` — publish `event-catalog.json` and `event-history.json`; explicitly exclude operational state from required public artifact behavior.

---

### Task 1: Canonical event/sample/state models and empty datasets

**Files:**
- Create: `scripts/event_history/__init__.py`
- Create: `scripts/event_history/models.py`
- Create: `data/event-catalog.json`
- Create: `data/event-history-state.json`
- Modify: `data/event-history.json`
- Test: `tests/python/test_models.py`

**Interfaces:**
- Produces: `normalize_event(raw: dict) -> dict`, `validate_event(event: dict) -> list[str]`, `normalize_sample(raw: dict) -> dict`, `validate_sample(sample: dict) -> list[str]`, `empty_catalog() -> dict`, `empty_history_state() -> dict`.
- Later tasks consume normalized event keys: `eventId`, `eventType`, `agency`, `referencePeriod`, `scheduledAtUtc`, `releasedAtUtc`, `timeSource`, `timeConfidence`, `actual`, `previous`, `consensus`, `sourceUrl`, `sourceQuality`, `status`, `scheduleRevisions`.
- Later tasks consume sample provenance keys: `sampleId`, `eventId`, `eventType`, `eventTimeUtc`, `symbol`, `assetClass`, `window`, `before`, `after`, `high`, `low`, `priceTimestampUtc`, `windowStartUtc`, `windowEndUtc`, `marketProvider`, `providerBoundary`, `sourceQuality`, `eligible`, `quarantineReason`, `surpriseZ`.

- [ ] **Step 1: Write failing model tests**

```python
# tests/python/test_models.py
import unittest
from scripts.event_history.models import (
    empty_catalog, empty_history_state, normalize_event,
    normalize_sample, validate_event, validate_sample,
)

class ModelsTest(unittest.TestCase):
    def test_empty_documents_are_versioned_and_non_synthetic(self):
        self.assertEqual(empty_catalog(), {"schemaVersion":"1.0", "generatedAt":None, "events":[]})
        state = empty_history_state()
        self.assertEqual(state["schemaVersion"], "1.0")
        self.assertEqual(state["events"], {})

    def test_verified_event_requires_official_source_url(self):
        event = normalize_event({
            "eventId":"BLS-CPI-2026-08", "eventType":"CPI", "agency":"BLS",
            "scheduledAtUtc":"2026-09-15T12:30:00Z", "timeSource":"OFFICIAL_RELEASE_CALENDAR",
            "timeConfidence":"HIGH", "sourceQuality":"OFFICIAL", "status":"EVENT_VERIFIED",
            "sourceUrl":None,
        })
        self.assertIn("sourceUrl", validate_event(event))

    def test_eligible_sample_requires_complete_provenance(self):
        sample = normalize_sample({
            "sampleId":"BLS-CPI-2026-08|XAU/USD|+5m", "eventId":"BLS-CPI-2026-08",
            "eventType":"CPI", "eventTimeUtc":"2026-09-15T12:30:00Z", "symbol":"XAU/USD",
            "assetClass":"metal", "window":"+5m", "before":2400, "after":2404,
            "high":2408, "low":2397, "eligible":True,
        })
        errors = validate_sample(sample)
        self.assertIn("priceTimestampUtc", errors)
        self.assertIn("marketProvider", errors)
        self.assertIn("sourceUrl", errors)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run model tests and verify RED**

Run: `python -m unittest tests.python.test_models -v`

Expected: import failure for `scripts.event_history.models`.

- [ ] **Step 3: Implement canonical normalizers/validators**

```python
# scripts/event_history/models.py
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any

SCHEMA_VERSION = "1.0"
VALID_EVENT_STATUS = {
    "SCHEDULED", "OFFICIAL_RELEASE_SEEN", "EVENT_VERIFIED",
    "WAITING_FOR_MARKET_WINDOWS", "MARKET_DATA_COMPLETE", "PUBLISHED", "QUARANTINED",
}
VALID_WINDOWS = {"+1m", "+5m", "+15m"}
VALID_ASSET_CLASSES = {"fx", "metal", "digital"}


def iso_utc(value: Any) -> str | None:
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return None
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def empty_catalog() -> dict:
    return {"schemaVersion": SCHEMA_VERSION, "generatedAt": None, "events": []}


def empty_history_state() -> dict:
    return {"schemaVersion": SCHEMA_VERSION, "generatedAt": None, "events": {}}


def normalize_event(raw: dict) -> dict:
    return {
        "eventId": str(raw.get("eventId") or "").strip(),
        "eventType": str(raw.get("eventType") or "").strip().upper(),
        "agency": str(raw.get("agency") or "").strip().upper(),
        "referencePeriod": raw.get("referencePeriod"),
        "scheduledAtUtc": iso_utc(raw.get("scheduledAtUtc")),
        "releasedAtUtc": iso_utc(raw.get("releasedAtUtc")),
        "timeSource": raw.get("timeSource") or "UNKNOWN",
        "timeConfidence": raw.get("timeConfidence") or "UNKNOWN",
        "actual": dict(raw.get("actual") or {}),
        "previous": dict(raw.get("previous") or {}),
        "consensus": raw.get("consensus"),
        "sourceUrl": raw.get("sourceUrl"),
        "sourceQuality": raw.get("sourceQuality") or "UNKNOWN",
        "status": raw.get("status") or "SCHEDULED",
        "scheduleRevisions": list(raw.get("scheduleRevisions") or []),
    }


def validate_event(event: dict) -> list[str]:
    errors = []
    for key in ("eventId", "eventType", "agency", "scheduledAtUtc"):
        if not event.get(key): errors.append(key)
    if event.get("status") not in VALID_EVENT_STATUS: errors.append("status")
    if event.get("status") in {"EVENT_VERIFIED", "WAITING_FOR_MARKET_WINDOWS", "MARKET_DATA_COMPLETE", "PUBLISHED"} and not event.get("sourceUrl"):
        errors.append("sourceUrl")
    if event.get("consensus") is not None: errors.append("consensus")
    return errors


def normalize_sample(raw: dict) -> dict:
    numeric = lambda key: float(raw[key]) if raw.get(key) is not None else None
    return {
        "sampleId": str(raw.get("sampleId") or "").strip(),
        "eventId": str(raw.get("eventId") or "").strip(),
        "eventType": str(raw.get("eventType") or "").strip().upper(),
        "eventTimeUtc": iso_utc(raw.get("eventTimeUtc")),
        "symbol": str(raw.get("symbol") or "").strip(),
        "assetClass": raw.get("assetClass"), "window": raw.get("window"),
        "before": numeric("before"), "after": numeric("after"),
        "high": numeric("high"), "low": numeric("low"),
        "priceTimestampUtc": iso_utc(raw.get("priceTimestampUtc")),
        "windowStartUtc": iso_utc(raw.get("windowStartUtc")),
        "windowEndUtc": iso_utc(raw.get("windowEndUtc")),
        "marketProvider": raw.get("marketProvider"), "providerBoundary": raw.get("providerBoundary"),
        "sourceUrl": raw.get("sourceUrl"), "sourceQuality": raw.get("sourceQuality") or "UNKNOWN",
        "eligible": bool(raw.get("eligible", False)), "quarantineReason": raw.get("quarantineReason"),
        "surpriseZ": None if raw.get("surpriseZ") is None else float(raw["surpriseZ"]),
    }


def validate_sample(sample: dict) -> list[str]:
    errors = []
    for key in ("sampleId","eventId","eventType","eventTimeUtc","symbol","assetClass","window","before","after"):
        if sample.get(key) in (None, ""): errors.append(key)
    if sample.get("assetClass") not in VALID_ASSET_CLASSES: errors.append("assetClass")
    if sample.get("window") not in VALID_WINDOWS: errors.append("window")
    for key in ("before","after","high","low"):
        value = sample.get(key)
        if value is not None and value <= 0: errors.append(key)
    if sample.get("eligible"):
        for key in ("priceTimestampUtc","windowStartUtc","windowEndUtc","marketProvider","providerBoundary","sourceUrl"):
            if not sample.get(key): errors.append(key)
        if sample.get("quarantineReason"): errors.append("quarantineReason")
    return sorted(set(errors))
```

Create the three empty JSON documents with exact shapes:

```json
{"schemaVersion":"1.0","generatedAt":null,"events":[]}
```

```json
{"schemaVersion":"1.0","generatedAt":null,"events":{}}
```

```json
{"schemaVersion":"1.0","generatedAt":null,"samples":[]}
```

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `python -m unittest tests.python.test_models -v`

Expected: all `ModelsTest` cases pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add scripts/event_history tests/python/test_models.py data/event-catalog.json data/event-history.json data/event-history-state.json
git commit -m "feat: add Phase 3.1 canonical data models"
```

---

### Task 2: Timezone conversion and stable event IDs

**Files:**
- Create: `scripts/event_history/time_utils.py`
- Create: `tests/python/test_time_utils.py`
- Modify: `scripts/event_history/models.py`

**Interfaces:**
- Produces: `eastern_to_utc(date_text: str, time_text: str) -> str`, `utc_now_iso() -> str`, `stable_event_id(agency: str, event_type: str, reference_period: str | None, scheduled_at_utc: str) -> str`.
- All official adapters consume these helpers; no adapter hard-codes UTC−4 or UTC−5.

- [ ] **Step 1: Write DST and ID tests**

```python
# tests/python/test_time_utils.py
import unittest
from scripts.event_history.time_utils import eastern_to_utc, stable_event_id

class TimeUtilsTest(unittest.TestCase):
    def test_est_and_edt_are_resolved_by_zoneinfo(self):
        self.assertEqual(eastern_to_utc("2026-01-15", "08:30"), "2026-01-15T13:30:00Z")
        self.assertEqual(eastern_to_utc("2026-07-15", "08:30"), "2026-07-15T12:30:00Z")

    def test_stable_id_uses_reference_period_when_available(self):
        self.assertEqual(
            stable_event_id("BLS", "CPI", "2026-08", "2026-09-15T12:30:00Z"),
            "BLS-CPI-2026-08",
        )

    def test_stable_id_falls_back_to_utc_minute_for_speeches(self):
        self.assertEqual(
            stable_event_id("FED", "SPEECH", None, "2026-09-16T14:05:00Z"),
            "FED-SPEECH-20260916T1405Z",
        )
```

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m unittest tests.python.test_time_utils -v`

Expected: import failure for `scripts.event_history.time_utils`.

- [ ] **Step 3: Implement timezone and stable-ID helpers**

```python
# scripts/event_history/time_utils.py
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")


def eastern_to_utc(date_text: str, time_text: str) -> str:
    local = datetime.strptime(f"{date_text} {time_text}", "%Y-%m-%d %H:%M").replace(tzinfo=NY)
    return local.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def stable_event_id(agency: str, event_type: str, reference_period: str | None, scheduled_at_utc: str) -> str:
    agency = agency.strip().upper()
    event_type = event_type.strip().upper().replace(" ", "_")
    if reference_period:
        return f"{agency}-{event_type}-{reference_period}"
    dt = datetime.fromisoformat(scheduled_at_utc.replace("Z", "+00:00")).astimezone(timezone.utc)
    return f"{agency}-{event_type}-{dt:%Y%m%dT%H%MZ}"
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `python -m unittest tests.python.test_time_utils -v`

Expected: 3 passing tests.

- [ ] **Step 5: Commit Task 2**

```bash
git add scripts/event_history/time_utils.py tests/python/test_time_utils.py scripts/event_history/models.py
git commit -m "feat: add official event time normalization"
```

---

### Task 3: Shared official-source HTTP boundary and BLS adapter

**Files:**
- Create: `scripts/event_history/official_base.py`
- Create: `scripts/event_history/bls_adapter.py`
- Create: `tests/python/test_bls_adapter.py`
- Create: `tests/python/fixtures/bls_schedule.html`
- Create: `tests/python/fixtures/bls_cpi_release.html`

**Interfaces:**
- `OfficialHttp.get_text(url: str) -> str` performs bounded HTTP requests with the existing project user-agent pattern.
- `parse_bls_schedule(html: str) -> list[dict]` returns canonical scheduled CPI/PPI/Employment events.
- `parse_bls_release(html: str, event: dict) -> dict` fills `actual`/`previous`, official `sourceUrl`, `releasedAtUtc` when reliably present; it never creates `consensus`.

- [ ] **Step 1: Add deterministic BLS fixtures and failing tests**

Fixture `bls_schedule.html` must contain one CPI row, one PPI row, and one Employment Situation row with explicit Eastern dates/times. Fixture `bls_cpi_release.html` must contain a headline CPI value and core CPI value plus an official release timestamp marker.

```python
# tests/python/test_bls_adapter.py
import pathlib, unittest
from scripts.event_history.bls_adapter import parse_bls_release, parse_bls_schedule

FIX = pathlib.Path(__file__).parent / "fixtures"

class BlsAdapterTest(unittest.TestCase):
    def test_schedule_normalizes_supported_events_and_dst(self):
        events = parse_bls_schedule((FIX / "bls_schedule.html").read_text())
        self.assertEqual([e["eventType"] for e in events], ["CPI", "PPI", "EMPLOYMENT"])
        self.assertTrue(all(e["agency"] == "BLS" for e in events))
        self.assertTrue(all(e["timeConfidence"] == "HIGH" for e in events))

    def test_release_keeps_consensus_null(self):
        scheduled = parse_bls_schedule((FIX / "bls_schedule.html").read_text())[0]
        verified = parse_bls_release((FIX / "bls_cpi_release.html").read_text(), scheduled)
        self.assertIsNone(verified["consensus"])
        self.assertEqual(verified["status"], "EVENT_VERIFIED")
        self.assertIn("headlineMom", verified["actual"])
```

- [ ] **Step 2: Run BLS tests and verify RED**

Run: `python -m unittest tests.python.test_bls_adapter -v`

Expected: import failure for BLS adapter.

- [ ] **Step 3: Implement shared HTTP helper and BLS parser**

Use BeautifulSoup selectors scoped to the fixture/official page structure and map only three event families:

```python
SUPPORTED_BLS = {
    "Consumer Price Index": "CPI",
    "Producer Price Index": "PPI",
    "Employment Situation": "EMPLOYMENT",
}
```

The parser must call `eastern_to_utc`, `stable_event_id`, and `normalize_event`. Release parsing sets `sourceQuality="OFFICIAL"` and `status="EVENT_VERIFIED"` only when an official URL and reliable release data are present; otherwise retain the prior lifecycle state.

- [ ] **Step 4: Run BLS tests and full Python discovery**

Run: `python -m unittest tests.python.test_bls_adapter -v`

Then: `python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all current Python tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/event_history/official_base.py scripts/event_history/bls_adapter.py tests/python/test_bls_adapter.py tests/python/fixtures/bls_schedule.html tests/python/fixtures/bls_cpi_release.html
git commit -m "feat: add official BLS event adapter"
```

---

### Task 4: DOL Initial Jobless Claims adapter

**Files:**
- Create: `scripts/event_history/dol_adapter.py`
- Create: `tests/python/test_dol_adapter.py`
- Create: `tests/python/fixtures/dol_claims.html`

**Interfaces:**
- Produces: `parse_dol_claims(html: str, source_url: str) -> dict`.
- Output `eventType="JOBLESS_CLAIMS"`, `agency="DOL"`, official UTC timestamp, `actual.initialClaims`, optional `previous.initialClaims`, optional `actual.fourWeekAverage`, and `consensus=None`.

- [ ] **Step 1: Write failing claims normalization test**

```python
class DolAdapterTest(unittest.TestCase):
    def test_claims_release_is_official_and_has_no_consensus(self):
        event = parse_dol_claims(FIX.read_text(), "https://oui.doleta.gov/unemploy/claims.asp")
        self.assertEqual(event["eventType"], "JOBLESS_CLAIMS")
        self.assertEqual(event["agency"], "DOL")
        self.assertEqual(event["sourceQuality"], "OFFICIAL")
        self.assertIsNone(event["consensus"])
        self.assertGreater(event["actual"]["initialClaims"], 0)
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_dol_adapter -v`

Expected: import failure for DOL adapter.

- [ ] **Step 3: Implement DOL parser using official release text only**

Normalize the reference week to `YYYY-MM-DD`, generate `DOL-JOBLESS_CLAIMS-<reference-date>`, and never infer a Thursday schedule when the source provides an explicit release date/time.

- [ ] **Step 4: Run DOL and complete Python tests**

Run: `python -m unittest tests.python.test_dol_adapter -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add scripts/event_history/dol_adapter.py tests/python/test_dol_adapter.py tests/python/fixtures/dol_claims.html
git commit -m "feat: add official jobless claims adapter"
```

---

### Task 5: Federal Reserve FOMC and speech adapters

**Files:**
- Create: `scripts/event_history/fed_adapter.py`
- Create: `tests/python/test_fed_adapter.py`
- Create: `tests/python/fixtures/fed_fomc_calendar.html`
- Create: `tests/python/fixtures/fed_speeches.html`

**Interfaces:**
- Produces: `parse_fomc_calendar(html: str) -> list[dict]`, `parse_fed_speeches(html: str) -> list[dict]`.
- FOMC events use `eventType="FOMC"`; speech events use `eventType="FED_SPEECH"` and carry `speaker`, `speakerRole`, `title`, and official URL in `actual` or explicit top-level metadata added by `models.py` if needed.

- [ ] **Step 1: Write failing Fed tests**

```python
class FedAdapterTest(unittest.TestCase):
    def test_fomc_event_has_exact_official_schedule_and_flags(self):
        event = parse_fomc_calendar((FIX / "fed_fomc_calendar.html").read_text())[0]
        self.assertEqual(event["eventType"], "FOMC")
        self.assertEqual(event["agency"], "FED")
        self.assertTrue(event["actual"]["statement"])
        self.assertIsNone(event["consensus"])

    def test_speech_without_exact_time_is_not_promoted_to_verified(self):
        events = parse_fed_speeches((FIX / "fed_speeches.html").read_text())
        uncertain = next(e for e in events if e["timeConfidence"] != "HIGH")
        self.assertNotEqual(uncertain["status"], "EVENT_VERIFIED")
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_fed_adapter -v`

Expected: import failure for Fed adapter.

- [ ] **Step 3: Implement FOMC and speech parsing**

Only exact official speech times become `HIGH`; date-only entries remain `LOW`/non-verified and therefore cannot create event-history samples. Preserve official URLs and statement/SEP/press-conference flags when the page explicitly provides them.

- [ ] **Step 4: Run Fed and all Python tests**

Run: `python -m unittest tests.python.test_fed_adapter -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit Task 5**

```bash
git add scripts/event_history/fed_adapter.py tests/python/test_fed_adapter.py tests/python/fixtures/fed_fomc_calendar.html tests/python/fixtures/fed_speeches.html
git commit -m "feat: add official Federal Reserve adapters"
```

---

### Task 6: Catalog merge, schedule revisions, atomic writer, and catalog CLI

**Files:**
- Create: `scripts/event_history/catalog.py`
- Create: `scripts/update_event_catalog.py`
- Create: `tests/python/test_catalog.py`
- Create: `tests/python/test_cli_dry_run.py`

**Interfaces:**
- Produces: `merge_catalog(existing: dict, discovered: list[dict], observed_at_utc: str) -> dict`, `atomic_write_json(path: Path, payload: dict) -> None`, `validate_catalog(payload: dict) -> list[str]`.
- CLI supports `--dry-run`, `--catalog`, and fixture injection via explicit adapter functions in tests; production calls BLS/DOL/Fed official URLs.

- [ ] **Step 1: Write revision and deterministic-write tests**

```python
class CatalogTest(unittest.TestCase):
    def test_schedule_change_preserves_revision(self):
        existing = {"schemaVersion":"1.0","generatedAt":None,"events":[BASE_EVENT]}
        moved = {**BASE_EVENT, "scheduledAtUtc":"2026-09-15T13:30:00Z"}
        merged = merge_catalog(existing, [moved], "2026-09-10T00:00:00Z")
        event = merged["events"][0]
        self.assertEqual(len(event["scheduleRevisions"]), 1)
        self.assertEqual(event["scheduleRevisions"][0]["previousScheduledAtUtc"], BASE_EVENT["scheduledAtUtc"])
        self.assertEqual(event["scheduleRevisions"][0]["newScheduledAtUtc"], moved["scheduledAtUtc"])
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_catalog tests.python.test_cli_dry_run -v`

Expected: catalog/CLI imports fail.

- [ ] **Step 3: Implement deterministic catalog merge and dry-run CLI**

Rules:
- deduplicate by `eventId`;
- preserve existing verified fields when discovery only refreshes schedule metadata;
- append schedule revision only when canonical scheduled UTC changes;
- sort events by `scheduledAtUtc`, then `eventId`;
- set `generatedAt` only on actual content change;
- atomic write via `tempfile.NamedTemporaryFile` + `json.load` verification + `Path.replace`;
- `--dry-run` prints counts and never writes files.

- [ ] **Step 4: Run catalog tests and entire Python suite**

Run: `python -m unittest tests.python.test_catalog tests.python.test_cli_dry_run -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit Task 6**

```bash
git add scripts/event_history/catalog.py scripts/update_event_catalog.py tests/python/test_catalog.py tests/python/test_cli_dry_run.py
git commit -m "feat: add revision-aware official event catalog"
```

---

### Task 7: Twelve Data M1 retrieval and deterministic reaction windows

**Files:**
- Create: `scripts/event_history/market_windows.py`
- Create: `tests/python/test_market_windows.py`
- Create: `tests/python/fixtures/twelvedata_m1.json`

**Interfaces:**
- Produces: `fetch_m1_bars(api_key: str, symbol: str, start_utc: str, end_utc: str, get_json=...) -> list[dict]`, `select_reaction_windows(event_time_utc: str, bars: list[dict]) -> dict[str, dict]`.
- `select_reaction_windows` returns exactly keys `+1m`, `+5m`, `+15m` when available, each with common `before`, target `after`, cumulative `high`/`low`, `priceTimestampUtc`, `windowStartUtc`, `windowEndUtc`.

- [ ] **Step 1: Write PRE/leakage/window tests**

```python
class MarketWindowsTest(unittest.TestCase):
    def test_exact_1230_release_uses_1229_as_pre(self):
        windows = select_reaction_windows("2026-09-15T12:30:00Z", FIXTURE_BARS)
        self.assertEqual(windows["+1m"]["beforeTimestampUtc"], "2026-09-15T12:29:00Z")
        self.assertEqual(windows["+5m"]["before"], windows["+1m"]["before"])
        self.assertEqual(windows["+15m"]["before"], windows["+1m"]["before"])

    def test_missing_plus_5_bar_is_not_interpolated(self):
        missing = [b for b in FIXTURE_BARS if b["datetime"] != "2026-09-15 12:35:00"]
        windows = select_reaction_windows("2026-09-15T12:30:00Z", missing)
        self.assertNotIn("+5m", windows)
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_market_windows -v`

Expected: import failure for market windows.

- [ ] **Step 3: Implement provider request and deterministic selector**

Provider call must request `interval=1min`, UTC timezone, and a bounded interval around the event; API key comes only from function input/environment and must never be included in returned metadata. Normalize bars to UTC minute start. Define:
- PRE = latest completed bar whose minute start is strictly before event minute;
- `+1m` target = bar starting at event minute + 1 minute;
- `+5m` target = event minute + 5 minutes;
- `+15m` target = event minute + 15 minutes;
- cumulative high/low uses completed bars from event minute through target minute inclusive.

If any target bar is absent, omit that window rather than interpolating.

- [ ] **Step 4: Run market-window and full Python tests**

Run: `python -m unittest tests.python.test_market_windows -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit Task 7**

```bash
git add scripts/event_history/market_windows.py tests/python/test_market_windows.py tests/python/fixtures/twelvedata_m1.json
git commit -m "feat: add deterministic event reaction windows"
```

---

### Task 8: History writer, eligibility, deduplication, quarantine, and recovery state

**Files:**
- Create: `scripts/event_history/history_writer.py`
- Create: `scripts/event_history/state.py`
- Create: `tests/python/test_history_writer.py`
- Create: `tests/python/test_state.py`

**Interfaces:**
- Produces: `sample_id(event_id, symbol, window) -> str`, `build_samples(event, symbol, asset_class, windows, provider_meta) -> list[dict]`, `merge_history(existing, candidates) -> tuple[dict, list[dict]]`, `update_state(state, event_id, symbol, observed_at_utc, completed_windows, missing_windows) -> dict`, `expired(event_time_utc, now_utc, hours=48) -> bool`.
- `merge_history` second return value is conflict/quarantine records; conflicts never replace an eligible verified sample silently.

- [ ] **Step 1: Write dedupe/conflict/recovery tests**

```python
class HistoryWriterTest(unittest.TestCase):
    def test_identical_sample_is_idempotent(self):
        first, q1 = merge_history(EMPTY_HISTORY, [ELIGIBLE_SAMPLE])
        second, q2 = merge_history(first, [ELIGIBLE_SAMPLE])
        self.assertEqual(len(second["samples"]), 1)
        self.assertEqual(q1 + q2, [])

    def test_conflicting_same_sample_id_is_quarantined(self):
        first, _ = merge_history(EMPTY_HISTORY, [ELIGIBLE_SAMPLE])
        conflicting = {**ELIGIBLE_SAMPLE, "after": ELIGIBLE_SAMPLE["after"] + 1}
        second, quarantined = merge_history(first, [conflicting])
        self.assertEqual(second["samples"][0]["after"], ELIGIBLE_SAMPLE["after"])
        self.assertEqual(quarantined[0]["quarantineReason"], "CONFLICTING_MARKET_DATA")
```

```python
class StateTest(unittest.TestCase):
    def test_missing_window_expires_after_48_hours(self):
        self.assertFalse(expired("2026-09-15T12:30:00Z", "2026-09-17T12:29:59Z"))
        self.assertTrue(expired("2026-09-15T12:30:00Z", "2026-09-17T12:30:01Z"))
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_history_writer tests.python.test_state -v`

Expected: imports fail.

- [ ] **Step 3: Implement eligibility/dedupe/state transitions**

Eligibility calls `validate_sample` and additionally requires event `status` in `EVENT_VERIFIED|WAITING_FOR_MARKET_WINDOWS|MARKET_DATA_COMPLETE|PUBLISHED`, official `sourceUrl`, and provider provenance. `surpriseZ` stays null unless already explicitly verified; this task never calculates it.

Operational state per event/symbol uses:

```python
{
    "lastCheckedAtUtc": "...",
    "retryCount": 0,
    "windows": {"+1m":"COMPLETE", "+5m":"PENDING", "+15m":"PENDING"},
    "quarantineReason": None,
}
```

At recovery expiry with missing windows, set `quarantineReason="MISSING_MARKET_WINDOW"`; do not generate missing samples.

- [ ] **Step 4: Run writer/state and full Python suites**

Run: `python -m unittest tests.python.test_history_writer tests.python.test_state -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit Task 8**

```bash
git add scripts/event_history/history_writer.py scripts/event_history/state.py tests/python/test_history_writer.py tests/python/test_state.py
git commit -m "feat: add fail-closed history persistence"
```

---

### Task 9: Event-history collector CLI and safe dry run

**Files:**
- Create: `scripts/update_event_history.py`
- Modify: `tests/python/test_cli_dry_run.py`

**Interfaces:**
- CLI args: `--catalog`, `--history`, `--state`, `--now-utc`, `--dry-run`.
- Environment: `TWELVE_DATA_API_KEY` required only for non-dry-run live market retrieval.
- Select only catalog events with verified official provenance, event time <= now, and age <= 48h unless already complete.

- [ ] **Step 1: Add failing CLI test that proves no writes in dry-run**

```python
def test_history_dry_run_never_mutates_files(self):
    before = self.history.read_text()
    code = update_event_history.main([
        "--catalog", str(self.catalog), "--history", str(self.history),
        "--state", str(self.state), "--now-utc", "2026-09-15T12:50:00Z", "--dry-run"
    ], fetch_bars=lambda *args, **kwargs: FIXTURE_BARS)
    self.assertEqual(code, 0)
    self.assertEqual(self.history.read_text(), before)
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_cli_dry_run -v`

Expected: missing `update_event_history` entry point.

- [ ] **Step 3: Implement CLI orchestration**

Flow:
1. validate catalog/history/state JSON;
2. select eligible recent events;
3. retrieve M1 bars for each supported instrument;
4. call `select_reaction_windows`;
5. build eligible candidates or update pending state;
6. merge history and quarantine conflicts;
7. in dry-run print deterministic summary only;
8. otherwise atomically write history/state only after complete validation.

Return non-zero on malformed existing JSON, missing required API key in live mode, or failed post-write validation.

- [ ] **Step 4: Run all Python tests**

Run: `python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit Task 9**

```bash
git add scripts/update_event_history.py tests/python/test_cli_dry_run.py
git commit -m "feat: add event history collector CLI"
```

---

### Task 10: GitHub Actions schedules, shared writer concurrency, and safe pushes

**Files:**
- Create: `.github/workflows/event-catalog.yml`
- Create: `.github/workflows/event-window-collector.yml`
- Modify: `.github/workflows/xauusd-daily.yml`
- Test: `tests/js/phase31-workflows.test.mjs`

**Interfaces:**
- Catalog workflow: every six hours + manual dispatch; no market API key required for official discovery unless an adapter later needs one.
- Window workflow: every five minutes + manual dispatch; `TWELVE_DATA_API_KEY` in environment only.
- All three generated-data writer workflows use `concurrency.group: macro-data-writers`, `cancel-in-progress: false`.

- [ ] **Step 1: Write failing workflow-contract test**

```javascript
// tests/js/phase31-workflows.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const file of ['event-catalog.yml','event-window-collector.yml','xauusd-daily.yml']) {
  test(`${file} uses shared generated-data writer concurrency`, () => {
    const text = fs.readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.match(text, /group:\s*macro-data-writers/);
    assert.match(text, /cancel-in-progress:\s*false/);
  });
}
```

- [ ] **Step 2: Run Node tests and verify RED**

Run: `node --test tests/js/phase31-workflows.test.mjs`

Expected: missing workflow files and/or old XAU concurrency setting causes failure.

- [ ] **Step 3: Implement workflows**

`event-catalog.yml` executes:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '17 */6 * * *'
permissions:
  contents: write
concurrency:
  group: macro-data-writers
  cancel-in-progress: false
```

`event-window-collector.yml` executes:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '*/5 * * * *'
permissions:
  contents: write
concurrency:
  group: macro-data-writers
  cancel-in-progress: false
```

Both workflows install `requirements.txt`, run their CLI, then before push execute:

```bash
git fetch origin main
git rebase origin/main
python -m unittest discover -s tests/python -p 'test_*.py' -v
node --test tests/js/*.test.mjs
git push origin main
```

They stage only their generated files and workflow-owned metadata. No force push. Update `xauusd-daily.yml` to the same concurrency group and fetch/rebase/validation-before-push pattern.

- [ ] **Step 4: Run workflow-contract and full JS tests**

Run: `node --test tests/js/phase31-workflows.test.mjs && node --test tests/js/*.test.mjs`

Expected: all pass.

- [ ] **Step 5: Commit Task 10**

```bash
git add .github/workflows/event-catalog.yml .github/workflows/event-window-collector.yml .github/workflows/xauusd-daily.yml tests/js/phase31-workflows.test.mjs
git commit -m "ci: schedule official history collectors safely"
```

---

### Task 11: Extend public history schema and support-state gates without weakening Phase 3

**Files:**
- Modify: `macro/history/history-schema.mjs`
- Modify: `macro/adapters/history-adapter.mjs`
- Modify: `macro/history/advance-model.mjs`
- Create: `macro/history/support-state.mjs`
- Create: `tests/js/phase31-history-schema.test.mjs`
- Create: `tests/js/support-state.test.mjs`

**Interfaces:**
- `normalizeHistorySample` preserves Python-produced provenance fields.
- `validateHistorySample` requires provenance for `eligible === true` while remaining backward-compatible with existing empty dataset.
- `supportState(effectiveN) -> 'INSUFFICIENT_DATA'|'EARLY_HISTORY'|'LIMITED'|'DEVELOPING'|'ESTABLISHED'|'MATURE_HISTORY'`.
- Advance model filters exact `eventType`, `symbol`, and `window`; unrelated event types never increase sample support.

- [ ] **Step 1: Write failing provenance/support boundary tests**

```javascript
test('support state boundaries match approved Phase 3.1 bands', () => {
  assert.equal(supportState(4.99), 'INSUFFICIENT_DATA');
  assert.equal(supportState(5), 'EARLY_HISTORY');
  assert.equal(supportState(10), 'LIMITED');
  assert.equal(supportState(20), 'DEVELOPING');
  assert.equal(supportState(40), 'ESTABLISHED');
  assert.equal(supportState(60), 'MATURE_HISTORY');
});

test('eligible sample without provider provenance is rejected', () => {
  const sample = normalizeHistorySample({...BASE, eligible:true, marketProvider:null});
  assert.equal(validateHistorySample(sample).valid, false);
});
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `node --test tests/js/phase31-history-schema.test.mjs tests/js/support-state.test.mjs`

Expected: missing support-state module/new fields.

- [ ] **Step 3: Implement minimal JS schema/support changes**

Add fields without deleting existing ones: `sampleId`, `priceTimestampUtc`, `windowStartUtc`, `windowEndUtc`, `marketProvider`, `providerBoundary`, `sourceUrl`, `eligible`, `quarantineReason`. Preserve `surpriseZ=null` as valid. Advance model must reject ineligible samples and must not pool another event type.

- [ ] **Step 4: Run all JS tests**

Run: `node --test tests/js/*.test.mjs`

Expected: all legacy Phase 1–3 and new Phase 3.1 tests pass.

- [ ] **Step 5: Commit Task 11**

```bash
git add macro/history/history-schema.mjs macro/adapters/history-adapter.mjs macro/history/advance-model.mjs macro/history/support-state.mjs tests/js/phase31-history-schema.test.mjs tests/js/support-state.test.mjs
git commit -m "feat: gate historical model on verified support"
```

---

### Task 12: History Health/provenance UI and verified ADVANCE price context

**Files:**
- Create: `macro/ui/history-health.mjs`
- Modify: `macro/ui/app.mjs`
- Modify: `macro/ui/phase3.css`
- Modify: `macro-preview.html`
- Create: `tests/js/history-health.test.mjs`
- Modify: `tests/js/ui-phase3.test.mjs`

**Interfaces:**
- Produces: `buildHistoryHealth({catalog, history, model, marketFeedState}) -> dict`, `renderHistoryHealthMarkup(health) -> string`.
- `app.mjs` loads `./data/event-catalog.json` with a small fail-closed loader and existing history loader.
- `buildHistoricalBundle` may use `window.MACRO_ADVANCE_CONTEXT.preEventPrice` only when its provenance declares a verified timestamp strictly before the event; it must not silently use the daily XAU snapshot as an event-aligned pre-event reference.

- [ ] **Step 1: Write failing health and no-snapshot-fallback tests**

```javascript
test('history health counts verified, eligible, and quarantined records separately', () => {
  const health = buildHistoryHealth({catalog:CATALOG, history:HISTORY, model:{effectiveN:17.8}, marketFeedState:'SNAPSHOT'});
  assert.equal(health.verifiedEvents, 2);
  assert.equal(health.eligibleSamples, 3);
  assert.equal(health.quarantinedSamples, 1);
  assert.equal(health.supportState, 'LIMITED');
});

test('preview exposes History Health host and provenance labels', () => {
  const html = fs.readFileSync('macro-preview.html','utf8');
  assert.match(html, /id="history-health-host"/);
  assert.match(html, /History Health/i);
});
```

Add a source-regression assertion against `macro/ui/app.mjs` that the old `snapshotPrice` fallback is absent from `buildHistoricalBundle` and verified `MACRO_ADVANCE_CONTEXT` is referenced instead.

- [ ] **Step 2: Run targeted UI tests and verify RED**

Run: `node --test tests/js/history-health.test.mjs tests/js/ui-phase3.test.mjs`

Expected: missing module/host and existing snapshot fallback fail.

- [ ] **Step 3: Implement History Health and verified context gate**

Health fields: `verifiedEvents`, `eligibleSamples`, `quarantinedSamples`, `latestVerifiedEvent`, `oldestEligibleEvent`, `eventTypes`, `marketFeedState`, `timestampQuality`, `rawN`, `effectiveN`, `supportState`.

Render provenance strip exactly as analytical source labels:

```text
EVENT   BLS / DOL / FED • OFFICIAL • HIGH
MARKET  provider • verified M1 windows
HISTORY eligible count • effective sample size
PIVOT   previous completed period • provider boundary
```

For ADVANCE price context, require:

```javascript
const ctx = window.MACRO_ADVANCE_CONTEXT ?? null;
const observedAt = Date.parse(ctx?.observedAtUtc ?? '');
const eventAt = Date.parse(active?.eventTimeUtc ?? '');
const verifiedPrice = Number(ctx?.preEventPrice);
const usable = ctx?.sourceQuality === 'VERIFIED' && Number.isFinite(verifiedPrice) && verifiedPrice > 0 && Number.isFinite(observedAt) && Number.isFinite(eventAt) && observedAt < eventAt;
```

If not usable, return `INSUFFICIENT_DATA / MISSING_VERIFIED_PRE_EVENT_PRICE`. Do not fall back to daily snapshot price.

- [ ] **Step 4: Run all JS tests**

Run: `node --test tests/js/*.test.mjs`

Expected: all pass.

- [ ] **Step 5: Commit Task 12**

```bash
git add macro/ui/history-health.mjs macro/ui/app.mjs macro/ui/phase3.css macro-preview.html tests/js/history-health.test.mjs tests/js/ui-phase3.test.mjs
git commit -m "ui: add Phase 3.1 history health provenance"
```

---

### Task 13: CI, security scans, Pages publication, and production-index protection

**Files:**
- Modify: `.github/workflows/macro-phase3-ci.yml`
- Modify: `.github/workflows/macro-desk-ci.yml`
- Modify: `.github/workflows/pages.yml`
- Create: `tests/js/phase31-publishing.test.mjs`

**Interfaces:**
- CI runs both `python -m unittest discover -s tests/python -p 'test_*.py' -v` and `node --test tests/js/*.test.mjs`.
- CI validates `event-catalog.json`, `event-history.json`, and `event-history-state.json` shapes.
- Pages publishes catalog/history but health/state data only if explicitly intended; operational state is not a required public artifact.
- Safety scan covers `scripts/event_history`, both CLI files, `macro`, `data`, workflows, and preview.

- [ ] **Step 1: Write failing publishing/security contract tests**

```javascript
test('Pages publishes catalog and history but does not require operational state', () => {
  const yml = fs.readFileSync('.github/workflows/pages.yml','utf8');
  assert.match(yml, /event-catalog\.json|cp -R data/);
  assert.match(yml, /event-history\.json|cp -R data/);
});

test('Phase 3 CI runs Python and JS deterministic suites', () => {
  const yml = fs.readFileSync('.github/workflows/macro-phase3-ci.yml','utf8');
  assert.match(yml, /python -m unittest discover -s tests\/python/);
  assert.match(yml, /node --test tests\/js\/\*\.test\.mjs/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/js/phase31-publishing.test.mjs`

Expected: CI lacks Python suite/data validation paths.

- [ ] **Step 3: Extend CI and Pages safely**

Add Python syntax/tests, JSON validation, and secret guards. Secret patterns must include API query/header forms such as:

```bash
! grep -R -E 'apikey=[A-Za-z0-9_-]{8,}|Authorization:[[:space:]]*(Bearer|Basic)[[:space:]]+[A-Za-z0-9._-]{8,}|TWELVE_DATA_API_KEY[[:space:]]*[:=][[:space:]]*[A-Za-z0-9_-]{8,}' scripts/event_history scripts/update_event_catalog.py scripts/update_event_history.py macro data macro-preview.html
```

Retain the existing order-language scan. Add a CI check that the branch's `index.html` blob equals the merge base/main blob during PR validation; implementation must not modify `index.html`.

- [ ] **Step 4: Run complete deterministic verification locally/CI-equivalent**

Run:

```bash
python -m unittest discover -s tests/python -p 'test_*.py' -v
node --test tests/js/*.test.mjs
python -m py_compile scripts/event_history/*.py scripts/update_event_catalog.py scripts/update_event_history.py
node --check macro/history/support-state.mjs
node --check macro/ui/history-health.mjs
```

Expected: zero Python failures, zero Node failures, no syntax errors.

- [ ] **Step 5: Commit Task 13**

```bash
git add .github/workflows/macro-phase3-ci.yml .github/workflows/macro-desk-ci.yml .github/workflows/pages.yml tests/js/phase31-publishing.test.mjs
git commit -m "ci: verify and publish Phase 3.1 collector data"
```

---

### Task 14: Manual dry-run acceptance, workflow verification, and merge gate

**Files:**
- Modify only if verification uncovers a defect: files owned by the failing task.
- No production data backfill file is created from synthetic fixtures.

**Interfaces:**
- Uses the completed CLIs/workflows exactly as production will.
- No merge to `main` until deterministic CI passes and the user explicitly approves the final merge/publish gate.

- [ ] **Step 1: Run deterministic full suite from the feature branch**

```bash
python -m unittest discover -s tests/python -p 'test_*.py' -v
node --test tests/js/*.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run fixture-based catalog dry run**

Run the catalog CLI through its test injection or fixture mode defined in Task 6 so it prints discovered/changed/unchanged counts without writing generated files.

Expected: non-zero discovered fixture events, zero file mutation, no consensus values.

- [ ] **Step 3: Run fixture-based market-history dry run**

Execute `scripts/update_event_history.py --dry-run` with a temporary catalog and fixture M1 provider hook from `tests/python/test_cli_dry_run.py`.

Expected: reports eligible +1m/+5m/+15m candidate counts, does not mutate repository data, and reports no interpolated windows.

- [ ] **Step 4: Trigger feature-branch CI and inspect logs**

Verify both MACRO DESK CI and Phase 3 CI run Python tests, Node tests, JSON validation, syntax checks, and secret/order-language safety scans. Record exact pass/fail counts from workflow logs before making a completion claim.

- [ ] **Step 5: Compare feature branch to main**

Confirm:
- branch is not behind main;
- `index.html` is absent from changed files;
- only intended collector/data/UI/workflow/docs/tests are changed;
- public datasets contain no fixture/synthetic historical market samples.

- [ ] **Step 6: Stop at merge/publish approval gate**

Present the verified branch status and ask the user for explicit permission before merging Phase 3.1 to `main`. Do not merge or enable scheduled production collection before this approval.

---

## Plan Self-Review Result

- **Spec coverage:** Tasks 1–14 cover canonical schemas, official sources, EST/EDT conversion, stable IDs, schedule revisions, deterministic PRE/+1m/+5m/+15m collection, common PRE, high/low excursions, fail-closed missing bars, duplicates/conflicts, 48-hour recovery, quarantine, catalog/history/state persistence, shared concurrency, exact-event matching, effective-sample support states, Pivot provenance preservation, ADVANCE/NOWCAST compatibility, History Health/provenance UI, security, Pages, and production-index protection.
- **Scope:** BEA is intentionally excluded from first-release implementation while retaining an adapter boundary, matching the approved spec.
- **Type consistency:** Python sample/catalog field names match the JavaScript Phase 3.1 schema task; `sampleId`, window timestamps, provider fields, eligibility, and quarantine names are consistent throughout the plan.
- **Fail-closed behavior:** No task introduces synthetic consensus, surprise, interpolated bars, duplicate samples, or silent provider conflicts.
- **Production safety:** The implementation remains on `feature/phase3.1-official-history-collector` until the final explicit merge/publish approval gate.