# Phase 3.1 Official Event History Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an official-first, fail-closed collector that discovers verified U.S. macro events, captures deterministic PRE/+1m/+5m/+15m M1 market reactions, publishes only eligible samples to Phase 3 history, and exposes collection health/provenance in the MYT-first dashboard.

**Architecture:** Python source adapters normalize BLS, DOL, and Federal Reserve records into a canonical event catalog. A separate M1 market-window collector writes verified reaction samples and operational recovery state; the existing JavaScript Phase 3 model consumes only eligible history through exact-event, exact-window, support-state, anti-leakage, and Pivot provenance gates.

**Tech Stack:** Python 3.13 standard library + `requests>=2.32,<3` + `beautifulsoup4>=4.12,<5`; Node.js 22 ES modules + `node:test`; GitHub Actions; static JSON + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-16-phase3-1-official-event-history-collector-design.md`

## Global Constraints

- Official-first sources for first release: BLS, U.S. DOL/ETA, and Federal Reserve. BEA remains an adapter boundary only.
- UTC is canonical storage/comparison time; official U.S. local times are interpreted with `America/New_York`; UI display uses `Asia/Kuala_Lumpur`.
- Primary reaction windows are `+1m`, `+5m`, and `+15m`; all use one common completed PRE M1 reference.
- M1 reactions are eligible only for minute-aligned official event timestamps (`seconds == 0`). A non-minute-aligned event is quarantined as `NON_MINUTE_ALIGNED_EVENT`; no approximate bar substitution is allowed.
- Missing market bars are never interpolated, copied, or guessed.
- `consensus` and `surpriseZ` remain `null` unless a separately verified source is introduced.
- Sample identity is `eventId + "|" + symbol + "|" + window`.
- Initial instrument universe: `XAU/USD`, `EUR/USD`, `GBP/USD`, `USD/JPY`, `BTC/USD`, `ETH/USD`.
- Recovery horizon: 48 hours.
- All generated-data writer workflows use concurrency group `macro-data-writers`, `cancel-in-progress: false`, and never force-push.
- `data/event-history-state.json` is operational state, not model evidence, and is not required in the public Pages artifact.
- Classic Pivot provenance remains previous completed provider period with provider/timeframe/boundary/open/close UTC metadata.
- Production `index.html` must remain unchanged unless separately approved.
- No automatic order-placement fields or `BUY setup`, `SELL setup`, `Stop loss`, `Take profit` language in Phase 3.1 analytical surfaces.
- Deterministic CI uses fixtures/mocks for external sources. Live-source smoke checks are separate and fail safely.

## File Structure

### Python collector
- `scripts/event_history/__init__.py` — package constants.
- `scripts/event_history/models.py` — event/sample/state normalization and validation.
- `scripts/event_history/time_utils.py` — official Eastern-time conversion and stable IDs.
- `scripts/event_history/official_base.py` — bounded HTTP helper.
- `scripts/event_history/bls_adapter.py` — CPI/PPI/Employment Situation.
- `scripts/event_history/dol_adapter.py` — Initial Jobless Claims.
- `scripts/event_history/fed_adapter.py` — FOMC and Fed speeches.
- `scripts/event_history/catalog.py` — catalog merge/revisions/atomic JSON writes.
- `scripts/event_history/market_windows.py` — Twelve Data M1 retrieval and PRE/+1m/+5m/+15m selection.
- `scripts/event_history/history_writer.py` — eligibility, sample IDs, dedupe/conflict quarantine.
- `scripts/event_history/state.py` — retry/recovery state.
- `scripts/update_event_catalog.py` — catalog CLI.
- `scripts/update_event_history.py` — reaction-history CLI.

### Python tests/fixtures
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
- `data/event-catalog.json`
- `data/event-history.json`
- `data/event-history-state.json`

### Existing Phase 3 consumers
- `macro/history/history-schema.mjs`
- `macro/adapters/history-adapter.mjs`
- `macro/history/advance-model.mjs`
- `macro/history/support-state.mjs` (new)
- `macro/ui/history-health.mjs` (new)
- `macro/ui/app.mjs`
- `macro/ui/phase3.css`
- `macro-preview.html`

### Workflows
- `.github/workflows/event-catalog.yml` (new)
- `.github/workflows/event-window-collector.yml` (new)
- `.github/workflows/xauusd-daily.yml`
- `.github/workflows/macro-phase3-ci.yml`
- `.github/workflows/macro-desk-ci.yml`
- `.github/workflows/pages.yml`

---

### Task 1: Canonical event/sample/state models and empty datasets

**Files:**
- Create: `scripts/event_history/__init__.py`
- Create: `scripts/event_history/models.py`
- Create: `tests/python/test_models.py`
- Create: `data/event-catalog.json`
- Create: `data/event-history-state.json`
- Modify: `data/event-history.json`

**Interfaces:**
- Produces: `normalize_event(raw: dict) -> dict`, `validate_event(event: dict) -> list[str]`, `normalize_sample(raw: dict) -> dict`, `validate_sample(sample: dict) -> list[str]`, `empty_catalog() -> dict`, `empty_history_state() -> dict`.
- Event keys: `eventId`, `eventType`, `agency`, `referencePeriod`, `scheduledAtUtc`, `releasedAtUtc`, `timeSource`, `timeConfidence`, `actual`, `previous`, `consensus`, `sourceUrl`, `sourceQuality`, `status`, `scheduleRevisions`.
- Sample provenance keys: `sampleId`, `eventId`, `eventType`, `eventTimeUtc`, `symbol`, `assetClass`, `window`, `before`, `after`, `high`, `low`, `priceTimestampUtc`, `windowStartUtc`, `windowEndUtc`, `marketProvider`, `providerBoundary`, `sourceUrl`, `sourceQuality`, `eligible`, `quarantineReason`, `surpriseZ`.

- [ ] **Step 1: Write the failing model tests**

```python
# tests/python/test_models.py
import unittest
from scripts.event_history.models import empty_catalog, empty_history_state, normalize_event, normalize_sample, validate_event, validate_sample

class ModelsTest(unittest.TestCase):
    def test_empty_documents_are_non_synthetic(self):
        self.assertEqual(empty_catalog(), {"schemaVersion":"1.0","generatedAt":None,"events":[]})
        self.assertEqual(empty_history_state(), {"schemaVersion":"1.0","generatedAt":None,"events":{}})

    def test_verified_event_requires_official_url(self):
        event = normalize_event({
            "eventId":"BLS-CPI-2026-08","eventType":"CPI","agency":"BLS",
            "scheduledAtUtc":"2026-09-11T12:30:00Z","timeSource":"OFFICIAL_RELEASE_CALENDAR",
            "timeConfidence":"HIGH","sourceQuality":"OFFICIAL","status":"EVENT_VERIFIED","sourceUrl":None,
        })
        self.assertIn("sourceUrl", validate_event(event))

    def test_eligible_sample_requires_market_provenance(self):
        sample = normalize_sample({
            "sampleId":"BLS-CPI-2026-08|XAU/USD|+5m","eventId":"BLS-CPI-2026-08","eventType":"CPI",
            "eventTimeUtc":"2026-09-11T12:30:00Z","symbol":"XAU/USD","assetClass":"metal","window":"+5m",
            "before":2400,"after":2404,"high":2408,"low":2397,"eligible":True,
        })
        errors = validate_sample(sample)
        self.assertIn("priceTimestampUtc", errors)
        self.assertIn("marketProvider", errors)
        self.assertIn("sourceUrl", errors)
```

- [ ] **Step 2: Run the test and verify RED**

Run: `python -m unittest tests.python.test_models -v`

Expected: import failure for `scripts.event_history.models`.

- [ ] **Step 3: Implement the minimal model layer**

```python
# scripts/event_history/models.py
from datetime import datetime, timezone

SCHEMA_VERSION = "1.0"
VALID_EVENT_STATUS = {"SCHEDULED","OFFICIAL_RELEASE_SEEN","EVENT_VERIFIED","WAITING_FOR_MARKET_WINDOWS","MARKET_DATA_COMPLETE","PUBLISHED","QUARANTINED"}
VALID_WINDOWS = {"+1m","+5m","+15m"}
VALID_ASSET_CLASSES = {"fx","metal","digital"}


def iso_utc(value):
    if not value: return None
    try: dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError: return None
    if dt.tzinfo is None: return None
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def empty_catalog(): return {"schemaVersion":SCHEMA_VERSION,"generatedAt":None,"events":[]}
def empty_history_state(): return {"schemaVersion":SCHEMA_VERSION,"generatedAt":None,"events":{}}


def normalize_event(raw):
    return {
        "eventId":str(raw.get("eventId") or "").strip(), "eventType":str(raw.get("eventType") or "").strip().upper(),
        "agency":str(raw.get("agency") or "").strip().upper(), "referencePeriod":raw.get("referencePeriod"),
        "scheduledAtUtc":iso_utc(raw.get("scheduledAtUtc")), "releasedAtUtc":iso_utc(raw.get("releasedAtUtc")),
        "timeSource":raw.get("timeSource") or "UNKNOWN", "timeConfidence":raw.get("timeConfidence") or "UNKNOWN",
        "actual":dict(raw.get("actual") or {}), "previous":dict(raw.get("previous") or {}), "consensus":raw.get("consensus"),
        "sourceUrl":raw.get("sourceUrl"), "sourceQuality":raw.get("sourceQuality") or "UNKNOWN",
        "status":raw.get("status") or "SCHEDULED", "scheduleRevisions":list(raw.get("scheduleRevisions") or []),
    }


def validate_event(event):
    errors=[]
    for key in ("eventId","eventType","agency","scheduledAtUtc"):
        if not event.get(key): errors.append(key)
    if event.get("status") not in VALID_EVENT_STATUS: errors.append("status")
    if event.get("status") in {"EVENT_VERIFIED","WAITING_FOR_MARKET_WINDOWS","MARKET_DATA_COMPLETE","PUBLISHED"} and not event.get("sourceUrl"): errors.append("sourceUrl")
    if event.get("consensus") is not None: errors.append("consensus")
    return sorted(set(errors))


def normalize_sample(raw):
    number=lambda key: float(raw[key]) if raw.get(key) is not None else None
    return {
        "sampleId":str(raw.get("sampleId") or "").strip(), "eventId":str(raw.get("eventId") or "").strip(),
        "eventType":str(raw.get("eventType") or "").strip().upper(), "eventTimeUtc":iso_utc(raw.get("eventTimeUtc")),
        "symbol":str(raw.get("symbol") or "").strip(), "assetClass":raw.get("assetClass"), "window":raw.get("window"),
        "before":number("before"), "after":number("after"), "high":number("high"), "low":number("low"),
        "priceTimestampUtc":iso_utc(raw.get("priceTimestampUtc")), "windowStartUtc":iso_utc(raw.get("windowStartUtc")), "windowEndUtc":iso_utc(raw.get("windowEndUtc")),
        "marketProvider":raw.get("marketProvider"), "providerBoundary":raw.get("providerBoundary"), "sourceUrl":raw.get("sourceUrl"),
        "sourceQuality":raw.get("sourceQuality") or "UNKNOWN", "eligible":bool(raw.get("eligible", False)),
        "quarantineReason":raw.get("quarantineReason"), "surpriseZ":None if raw.get("surpriseZ") is None else float(raw["surpriseZ"]),
    }


def validate_sample(sample):
    errors=[]
    for key in ("sampleId","eventId","eventType","eventTimeUtc","symbol","assetClass","window","before","after"):
        if sample.get(key) in (None, ""): errors.append(key)
    if sample.get("assetClass") not in VALID_ASSET_CLASSES: errors.append("assetClass")
    if sample.get("window") not in VALID_WINDOWS: errors.append("window")
    for key in ("before","after","high","low"):
        if sample.get(key) is not None and sample[key] <= 0: errors.append(key)
    if sample.get("eligible"):
        for key in ("priceTimestampUtc","windowStartUtc","windowEndUtc","marketProvider","providerBoundary","sourceUrl"):
            if not sample.get(key): errors.append(key)
        if sample.get("quarantineReason"): errors.append("quarantineReason")
    return sorted(set(errors))
```

Create exact initial JSON:

```json
{"schemaVersion":"1.0","generatedAt":null,"events":[]}
```

```json
{"schemaVersion":"1.0","generatedAt":null,"events":{}}
```

`data/event-history.json` remains:

```json
{"schemaVersion":"1.0","generatedAt":null,"samples":[]}
```

- [ ] **Step 4: Run and verify GREEN**

Run: `python -m unittest tests.python.test_models -v`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/event_history tests/python/test_models.py data/event-catalog.json data/event-history.json data/event-history-state.json
git commit -m "feat: add Phase 3.1 canonical data models"
```

---

### Task 2: Timezone conversion and stable event IDs

**Files:**
- Create: `scripts/event_history/time_utils.py`
- Create: `tests/python/test_time_utils.py`

**Interfaces:**
- Produces: `eastern_to_utc(date_text, time_text) -> str`, `stable_event_id(agency,event_type,reference_period,scheduled_at_utc) -> str`, `utc_now_iso() -> str`.

- [ ] **Step 1: Write failing DST/ID tests**

```python
import unittest
from scripts.event_history.time_utils import eastern_to_utc, stable_event_id

class TimeUtilsTest(unittest.TestCase):
    def test_est_and_edt(self):
        self.assertEqual(eastern_to_utc("2026-01-15","08:30"), "2026-01-15T13:30:00Z")
        self.assertEqual(eastern_to_utc("2026-07-15","08:30"), "2026-07-15T12:30:00Z")

    def test_reference_period_id(self):
        self.assertEqual(stable_event_id("BLS","CPI","2026-08","2026-09-11T12:30:00Z"), "BLS-CPI-2026-08")

    def test_timestamp_fallback_id(self):
        self.assertEqual(stable_event_id("FED","FED_SPEECH",None,"2026-09-16T14:05:00Z"), "FED-FED_SPEECH-20260916T1405Z")
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_time_utils -v`

Expected: import failure.

- [ ] **Step 3: Implement helpers using IANA timezone data**

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")

def eastern_to_utc(date_text, time_text):
    dt = datetime.strptime(f"{date_text} {time_text}", "%Y-%m-%d %H:%M").replace(tzinfo=NY)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

def stable_event_id(agency,event_type,reference_period,scheduled_at_utc):
    agency=agency.strip().upper(); event_type=event_type.strip().upper().replace(" ","_")
    if reference_period: return f"{agency}-{event_type}-{reference_period}"
    dt=datetime.fromisoformat(scheduled_at_utc.replace("Z","+00:00")).astimezone(timezone.utc)
    return f"{agency}-{event_type}-{dt:%Y%m%dT%H%MZ}"

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
```

- [ ] **Step 4: Run and verify GREEN**

Run: `python -m unittest tests.python.test_time_utils -v`

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/event_history/time_utils.py tests/python/test_time_utils.py
git commit -m "feat: normalize official event timestamps"
```

---

### Task 3: Shared HTTP boundary and BLS adapter

**Files:**
- Create: `scripts/event_history/official_base.py`
- Create: `scripts/event_history/bls_adapter.py`
- Create: `tests/python/test_bls_adapter.py`
- Create: `tests/python/fixtures/bls_schedule.html`
- Create: `tests/python/fixtures/bls_cpi_release.html`

**Interfaces:**
- `OfficialHttp.get_text(url) -> str` uses bounded retries and the project user-agent pattern.
- `parse_bls_schedule(html, source_url) -> list[dict]` supports CPI, PPI, Employment Situation.
- `parse_bls_release(html,event,source_url) -> dict` fills only values explicitly present on the official page; `consensus` remains null.
- Production schedule URLs: `https://www.bls.gov/schedule/news_release/cpi.htm`, `ppi.htm`, `empsit.htm`.

- [ ] **Step 1: Add fixtures and failing tests**

```python
class BlsAdapterTest(unittest.TestCase):
    def test_schedule_normalizes_supported_events(self):
        events=parse_bls_schedule((FIX/"bls_schedule.html").read_text(), "https://www.bls.gov/schedule/2026/")
        self.assertEqual([e["eventType"] for e in events], ["CPI","PPI","EMPLOYMENT"])
        self.assertTrue(all(e["agency"]=="BLS" for e in events))
        self.assertTrue(all(e["timeConfidence"]=="HIGH" for e in events))

    def test_release_never_invents_consensus(self):
        scheduled=parse_bls_schedule((FIX/"bls_schedule.html").read_text(), "https://www.bls.gov/schedule/2026/")[0]
        verified=parse_bls_release((FIX/"bls_cpi_release.html").read_text(), scheduled, "https://www.bls.gov/news.release/cpi.nr0.htm")
        self.assertEqual(verified["status"], "EVENT_VERIFIED")
        self.assertIsNone(verified["consensus"])
        self.assertIn("headlineMom", verified["actual"])
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_bls_adapter -v`

Expected: import failure.

- [ ] **Step 3: Implement HTTP helper and BLS parser**

Use BeautifulSoup and this exact event map:

```python
SUPPORTED_BLS={"Consumer Price Index":"CPI","Producer Price Index":"PPI","Employment Situation":"EMPLOYMENT"}
```

The schedule parser calls `eastern_to_utc`, creates stable IDs, and sets `status="SCHEDULED"`. Release parsing sets `EVENT_VERIFIED` only when `sourceUrl`, official timing, and required release values are present.

- [ ] **Step 4: Run targeted and full Python tests**

Run: `python -m unittest tests.python.test_bls_adapter -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit**

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
- Produces: `parse_dol_claims(html, source_url) -> dict`.
- `eventType="JOBLESS_CLAIMS"`, `agency="DOL"`, `actual.initialClaims`, optional `previous.initialClaims`, optional `actual.fourWeekAverage`, `consensus=None`.
- Production source starts at `https://oui.doleta.gov/unemploy/claims.asp`; parser trusts explicit official release metadata, not a hard-coded Thursday assumption.

- [ ] **Step 1: Write failing test**

```python
class DolAdapterTest(unittest.TestCase):
    def test_claims_release_is_official_and_has_no_consensus(self):
        event=parse_dol_claims(FIX.read_text(), "https://oui.doleta.gov/unemploy/claims.asp")
        self.assertEqual(event["eventType"], "JOBLESS_CLAIMS")
        self.assertEqual(event["agency"], "DOL")
        self.assertEqual(event["sourceQuality"], "OFFICIAL")
        self.assertIsNone(event["consensus"])
        self.assertGreater(event["actual"]["initialClaims"], 0)
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_dol_adapter -v`

Expected: import failure.

- [ ] **Step 3: Implement parser**

Normalize the official reference week, explicit release timestamp, claims values, and source URL. Do not infer a timestamp if the fixture/page does not contain one; such a record cannot reach `EVENT_VERIFIED`.

- [ ] **Step 4: Run tests**

Run: `python -m unittest tests.python.test_dol_adapter -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit**

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
- `parse_fomc_calendar(html, source_url) -> list[dict]`.
- `parse_fed_speeches(html, source_url) -> list[dict]`.
- FOMC: `eventType="FOMC"`; `actual` contains booleans `statement`, `projectionMaterials`, `pressConference` only when explicitly present.
- Speech: `eventType="FED_SPEECH"`; `actual` contains `speaker`, `speakerRole`, `title`; date-only/no-exact-time speech remains non-verified.
- Production sources: `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm` and `https://www.federalreserve.gov/newsevents/{year}-speeches.htm`.

- [ ] **Step 1: Write failing Fed tests**

```python
class FedAdapterTest(unittest.TestCase):
    def test_fomc_flags_are_explicit(self):
        event=parse_fomc_calendar((FIX/"fed_fomc_calendar.html").read_text(), FOMC_URL)[0]
        self.assertEqual(event["eventType"], "FOMC")
        self.assertTrue(event["actual"]["statement"])
        self.assertIsNone(event["consensus"])

    def test_speech_without_exact_time_is_not_verified(self):
        events=parse_fed_speeches((FIX/"fed_speeches.html").read_text(), SPEECH_URL)
        uncertain=next(e for e in events if e["timeConfidence"]!="HIGH")
        self.assertNotEqual(uncertain["status"], "EVENT_VERIFIED")
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_fed_adapter -v`

Expected: import failure.

- [ ] **Step 3: Implement parsers**

Use official page text only. Exact official time is required for `HIGH`. Keep uncertain/date-only records in the catalog for audit but ineligible for M1 history collection.

- [ ] **Step 4: Run tests**

Run: `python -m unittest tests.python.test_fed_adapter -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/event_history/fed_adapter.py tests/python/test_fed_adapter.py tests/python/fixtures/fed_fomc_calendar.html tests/python/fixtures/fed_speeches.html
git commit -m "feat: add official Federal Reserve adapters"
```

---

### Task 6: Catalog merge, schedule revisions, atomic write, catalog CLI

**Files:**
- Create: `scripts/event_history/catalog.py`
- Create: `scripts/update_event_catalog.py`
- Create: `tests/python/test_catalog.py`
- Create: `tests/python/test_cli_dry_run.py`

**Interfaces:**
- `merge_catalog(existing, discovered, observed_at_utc) -> dict`.
- `validate_catalog(payload) -> list[str]`.
- `atomic_write_json(path,payload) -> None`.
- Catalog CLI args: `--catalog`, `--dry-run`, `--now-utc`.

- [ ] **Step 1: Write failing schedule-revision test**

```python
class CatalogTest(unittest.TestCase):
    def test_schedule_change_preserves_revision(self):
        existing={"schemaVersion":"1.0","generatedAt":None,"events":[BASE_EVENT]}
        moved={**BASE_EVENT,"scheduledAtUtc":"2026-09-11T13:30:00Z"}
        merged=merge_catalog(existing,[moved],"2026-09-10T00:00:00Z")
        revision=merged["events"][0]["scheduleRevisions"][0]
        self.assertEqual(revision["previousScheduledAtUtc"], BASE_EVENT["scheduledAtUtc"])
        self.assertEqual(revision["newScheduledAtUtc"], moved["scheduledAtUtc"])
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_catalog tests.python.test_cli_dry_run -v`

Expected: imports fail.

- [ ] **Step 3: Implement catalog merge and CLI**

Rules: dedupe by `eventId`; preserve verified fields when discovery refreshes schedule metadata; append revision only when canonical scheduled UTC changes; sort by `scheduledAtUtc,eventId`; set `generatedAt` only on content change; atomic write via temporary file + JSON re-read + `Path.replace`; dry-run prints deterministic new/changed/unchanged counts and performs no writes.

- [ ] **Step 4: Run tests**

Run: `python -m unittest tests.python.test_catalog tests.python.test_cli_dry_run -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/event_history/catalog.py scripts/update_event_catalog.py tests/python/test_catalog.py tests/python/test_cli_dry_run.py
git commit -m "feat: add revision-aware event catalog"
```

---

### Task 7: Twelve Data M1 retrieval and exact elapsed-window semantics

**Files:**
- Create: `scripts/event_history/market_windows.py`
- Create: `tests/python/test_market_windows.py`
- Create: `tests/python/fixtures/twelvedata_m1.json`

**Interfaces:**
- `fetch_m1_bars(api_key,symbol,start_utc,end_utc,get_json=...) -> list[dict]` calls Twelve Data `time_series` with `interval=1min`, `timezone=UTC`, `start_date`, `end_date`.
- `select_reaction_windows(event_time_utc,bars) -> dict` returns complete windows only.
- Twelve Data `datetime` is treated as bar start time. For an exact `12:30:00Z` event: PRE is the bar starting `12:29`; `+1m` uses the close of bar `12:30` (ends 12:31); `+5m` uses close of bar `12:34` (ends 12:35); `+15m` uses close of bar `12:44` (ends 12:45). This is the corrected elapsed-time definition and avoids a one-bar-late error.

- [ ] **Step 1: Write failing window tests**

```python
class MarketWindowsTest(unittest.TestCase):
    def test_exact_release_uses_correct_elapsed_bar_closes(self):
        windows=select_reaction_windows("2026-09-11T12:30:00Z", BARS)
        self.assertEqual(windows["+1m"]["beforeTimestampUtc"], "2026-09-11T12:29:00Z")
        self.assertEqual(windows["+1m"]["priceTimestampUtc"], "2026-09-11T12:31:00Z")
        self.assertEqual(windows["+5m"]["priceTimestampUtc"], "2026-09-11T12:35:00Z")
        self.assertEqual(windows["+15m"]["priceTimestampUtc"], "2026-09-11T12:45:00Z")
        self.assertEqual(windows["+1m"]["before"], windows["+15m"]["before"])

    def test_missing_target_bar_is_not_interpolated(self):
        missing=[b for b in BARS if b["datetime"]!="2026-09-11 12:34:00"]
        windows=select_reaction_windows("2026-09-11T12:30:00Z", missing)
        self.assertNotIn("+5m", windows)

    def test_non_minute_aligned_event_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "NON_MINUTE_ALIGNED_EVENT"):
            select_reaction_windows("2026-09-11T12:30:35Z", BARS)
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_market_windows -v`

Expected: import failure.

- [ ] **Step 3: Implement M1 retrieval and selector**

Normalize each provider bar to `{startUtc,open,high,low,close}`. For exact-minute event `T`, define:

```python
pre_start = T - timedelta(minutes=1)
target_starts = {"+1m": T, "+5m": T + timedelta(minutes=4), "+15m": T + timedelta(minutes=14)}
```

`priceTimestampUtc` is target bar end (`start + 1 minute`). Cumulative high/low spans bars from `T` through each target-start inclusive. If PRE or a target bar is absent, omit the affected window; never use nearest-neighbor substitution.

- [ ] **Step 4: Run tests**

Run: `python -m unittest tests.python.test_market_windows -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/event_history/market_windows.py tests/python/test_market_windows.py tests/python/fixtures/twelvedata_m1.json
git commit -m "feat: add exact event reaction windows"
```

---

### Task 8: History eligibility, dedupe/conflict quarantine, recovery state

**Files:**
- Create: `scripts/event_history/history_writer.py`
- Create: `scripts/event_history/state.py`
- Create: `tests/python/test_history_writer.py`
- Create: `tests/python/test_state.py`

**Interfaces:**
- `sample_id(event_id,symbol,window) -> str`.
- `build_samples(event,symbol,asset_class,windows,provider_meta) -> list[dict]`.
- `merge_history(existing,candidates) -> tuple[dict,list[dict]]` where second item is quarantined conflicts.
- `expired(event_time_utc,now_utc,hours=48) -> bool`.
- `update_state(...) -> dict` tracks retry count/window completion/quarantine.

- [ ] **Step 1: Write failing idempotence/conflict/recovery tests**

```python
class HistoryWriterTest(unittest.TestCase):
    def test_identical_sample_is_idempotent(self):
        first,q1=merge_history(EMPTY,[SAMPLE]); second,q2=merge_history(first,[SAMPLE])
        self.assertEqual(len(second["samples"]),1); self.assertEqual(q1+q2,[])

    def test_conflict_is_quarantined_without_overwrite(self):
        first,_=merge_history(EMPTY,[SAMPLE]); conflict={**SAMPLE,"after":SAMPLE["after"]+1}
        second,q=merge_history(first,[conflict])
        self.assertEqual(second["samples"][0]["after"],SAMPLE["after"])
        self.assertEqual(q[0]["quarantineReason"],"CONFLICTING_MARKET_DATA")

class StateTest(unittest.TestCase):
    def test_recovery_expires_after_48_hours(self):
        self.assertFalse(expired("2026-09-11T12:30:00Z","2026-09-13T12:29:59Z"))
        self.assertTrue(expired("2026-09-11T12:30:00Z","2026-09-13T12:30:01Z"))
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_history_writer tests.python.test_state -v`

Expected: imports fail.

- [ ] **Step 3: Implement fail-closed persistence**

Eligible sample requires verified official event status, official URL, recognized symbol, complete PRE/target prices, ordered timestamps, provider provenance, and no quarantine reason. `surpriseZ` remains null. Operational state shape:

```python
{"lastCheckedAtUtc":"...","retryCount":0,"windows":{"+1m":"COMPLETE","+5m":"PENDING","+15m":"PENDING"},"quarantineReason":None}
```

At 48-hour expiry with missing windows, set `MISSING_MARKET_WINDOW`; do not synthesize missing samples.

- [ ] **Step 4: Run tests**

Run: `python -m unittest tests.python.test_history_writer tests.python.test_state -v && python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/event_history/history_writer.py scripts/event_history/state.py tests/python/test_history_writer.py tests/python/test_state.py
git commit -m "feat: add fail-closed history persistence"
```

---

### Task 9: Event-history collector CLI and dry-run safety

**Files:**
- Create: `scripts/update_event_history.py`
- Modify: `tests/python/test_cli_dry_run.py`

**Interfaces:**
- Args: `--catalog`, `--history`, `--state`, `--now-utc`, `--dry-run`.
- `TWELVE_DATA_API_KEY` required only for non-dry-run live retrieval.
- Supports injectable `fetch_bars` in tests.

- [ ] **Step 1: Add failing no-write dry-run test**

```python
def test_history_dry_run_never_mutates_files(self):
    before=self.history.read_text()
    code=update_event_history.main([
        "--catalog",str(self.catalog),"--history",str(self.history),"--state",str(self.state),
        "--now-utc","2026-09-11T12:50:00Z","--dry-run"
    ], fetch_bars=lambda *args,**kwargs: FIXTURE_BARS)
    self.assertEqual(code,0)
    self.assertEqual(self.history.read_text(),before)
```

- [ ] **Step 2: Run and verify RED**

Run: `python -m unittest tests.python.test_cli_dry_run -v`

Expected: missing history CLI.

- [ ] **Step 3: Implement orchestration**

Sequence: validate existing JSON → select verified events at/after release and within 48 hours → retrieve M1 bars → select complete windows → build candidates/update pending state → merge history/quarantine conflicts → dry-run prints deterministic counts only → live mode atomically writes validated history/state. Malformed existing data or missing API key in live mode returns non-zero.

- [ ] **Step 4: Run full Python tests**

Run: `python -m unittest discover -s tests/python -p 'test_*.py' -v`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/update_event_history.py tests/python/test_cli_dry_run.py
git commit -m "feat: add event history collector CLI"
```

---

### Task 10: Scheduled workflows and shared generated-data writer lock

**Files:**
- Create: `.github/workflows/event-catalog.yml`
- Create: `.github/workflows/event-window-collector.yml`
- Modify: `.github/workflows/xauusd-daily.yml`
- Create: `tests/js/phase31-workflows.test.mjs`

**Interfaces:**
- Catalog workflow: every six hours + `workflow_dispatch`.
- History workflow: every five minutes + `workflow_dispatch`.
- All data writers: `group: macro-data-writers`, `cancel-in-progress: false`.

- [ ] **Step 1: Write failing workflow contract tests**

```javascript
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
for (const file of ['event-catalog.yml','event-window-collector.yml','xauusd-daily.yml']) {
  test(`${file} uses shared writer lock`,()=>{
    const text=fs.readFileSync(`.github/workflows/${file}`,'utf8');
    assert.match(text,/group:\s*macro-data-writers/);
    assert.match(text,/cancel-in-progress:\s*false/);
  });
}
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/js/phase31-workflows.test.mjs`

Expected: new workflows missing and XAU workflow still uses old group.

- [ ] **Step 3: Implement workflows**

Catalog trigger:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '17 */6 * * *'
```

History trigger:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '*/5 * * * *'
```

Both install `requirements.txt`, run the appropriate CLI, stage only generated files, then before push run:

```bash
git fetch origin main
git rebase origin/main
python -m unittest discover -s tests/python -p 'test_*.py' -v
node --test tests/js/*.test.mjs
git push origin main
```

Update `xauusd-daily.yml` to the same shared group and fetch/rebase/validation-before-push pattern. No force push.

- [ ] **Step 4: Run JS tests**

Run: `node --test tests/js/phase31-workflows.test.mjs && node --test tests/js/*.test.mjs`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/event-catalog.yml .github/workflows/event-window-collector.yml .github/workflows/xauusd-daily.yml tests/js/phase31-workflows.test.mjs
git commit -m "ci: schedule official history collectors safely"
```

---

### Task 11: JavaScript history provenance, canonical window aliases, and support states

**Files:**
- Modify: `macro/history/history-schema.mjs`
- Modify: `macro/adapters/history-adapter.mjs`
- Modify: `macro/history/advance-model.mjs`
- Create: `macro/history/support-state.mjs`
- Create: `tests/js/phase31-history-schema.test.mjs`
- Create: `tests/js/support-state.test.mjs`

**Interfaces:**
- `normalizeHistoryWindow(value)` maps `1m|+1m -> +1m`, `5m|+5m -> +5m`, `15m|+15m -> +15m`; other values return null.
- `supportState(effectiveN)` returns `INSUFFICIENT_DATA`, `EARLY_HISTORY`, `LIMITED`, `DEVELOPING`, `ESTABLISHED`, `MATURE_HISTORY` at 5/10/20/40/60 boundaries.
- Advance model filters exact normalized `eventType`, symbol, and canonical window; ineligible samples never contribute.

- [ ] **Step 1: Write failing support/provenance tests**

```javascript
test('canonical reaction windows accept old 5m alias',()=>{
  assert.equal(normalizeHistoryWindow('5m'),'+5m');
  assert.equal(normalizeHistoryWindow('+15m'),'+15m');
});

test('support boundaries match approved bands',()=>{
  assert.equal(supportState(4.99),'INSUFFICIENT_DATA');
  assert.equal(supportState(5),'EARLY_HISTORY');
  assert.equal(supportState(10),'LIMITED');
  assert.equal(supportState(20),'DEVELOPING');
  assert.equal(supportState(40),'ESTABLISHED');
  assert.equal(supportState(60),'MATURE_HISTORY');
});

test('eligible sample missing provider provenance is rejected',()=>{
  const sample=normalizeHistorySample({...BASE,eligible:true,marketProvider:null});
  assert.equal(validateHistorySample(sample).valid,false);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/js/phase31-history-schema.test.mjs tests/js/support-state.test.mjs`

Expected: missing functions/module/new fields.

- [ ] **Step 3: Implement schema/support changes**

Preserve existing fields and add `sampleId`, canonical `window`, `priceTimestampUtc`, `windowStartUtc`, `windowEndUtc`, `marketProvider`, `providerBoundary`, `sourceUrl`, `eligible`, `quarantineReason`. Keep `surpriseZ=null` valid. Update advance-model default window expectation to canonical `+5m` while accepting old `5m` through normalization.

- [ ] **Step 4: Run full JS tests**

Run: `node --test tests/js/*.test.mjs`

Expected: all Phase 1–3 and Phase 3.1 tests pass.

- [ ] **Step 5: Commit**

```bash
git add macro/history/history-schema.mjs macro/adapters/history-adapter.mjs macro/history/advance-model.mjs macro/history/support-state.mjs tests/js/phase31-history-schema.test.mjs tests/js/support-state.test.mjs
git commit -m "feat: gate history on verified support"
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
- `buildHistoryHealth({catalog,history,model,marketFeedState}) -> object`.
- `renderHistoryHealthMarkup(health) -> string`.
- `app.mjs` loads `./data/event-catalog.json` fail-closed and existing history once.
- ADVANCE model may use only `window.MACRO_ADVANCE_CONTEXT={preEventPrice,observedAtUtc,sourceQuality:'VERIFIED'}` where `observedAtUtc < eventTimeUtc`; daily snapshot price is not silently treated as event-aligned.

- [ ] **Step 1: Write failing UI tests**

```javascript
test('health counts verified eligible and quarantined separately',()=>{
  const h=buildHistoryHealth({catalog:CATALOG,history:HISTORY,model:{effectiveN:17.8},marketFeedState:'SNAPSHOT'});
  assert.equal(h.verifiedEvents,2); assert.equal(h.eligibleSamples,3); assert.equal(h.quarantinedSamples,1);
  assert.equal(h.supportState,'LIMITED');
});

test('preview exposes History Health host',()=>{
  const html=fs.readFileSync('macro-preview.html','utf8');
  assert.match(html,/id="history-health-host"/); assert.match(html,/History Health/i);
});
```

Add source regression assertions that `macro/ui/app.mjs` references `MACRO_ADVANCE_CONTEXT`, defaults history window to `+5m`, and no longer uses `snapshotPrice` as the historical model pre-event fallback.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/js/history-health.test.mjs tests/js/ui-phase3.test.mjs`

Expected: missing health module/host and old fallback still present.

- [ ] **Step 3: Implement health and verified context gate**

Health fields: `verifiedEvents`, `eligibleSamples`, `quarantinedSamples`, `latestVerifiedEvent`, `oldestEligibleEvent`, `eventTypes`, `marketFeedState`, `timestampQuality`, `rawN`, `effectiveN`, `supportState`.

ADVANCE context gate:

```javascript
const ctx=window.MACRO_ADVANCE_CONTEXT ?? null;
const observedAt=Date.parse(ctx?.observedAtUtc ?? '');
const eventAt=Date.parse(active?.eventTimeUtc ?? '');
const price=Number(ctx?.preEventPrice);
const usable=ctx?.sourceQuality==='VERIFIED' && Number.isFinite(price) && price>0 && Number.isFinite(observedAt) && Number.isFinite(eventAt) && observedAt<eventAt;
```

If not usable, render `INSUFFICIENT_DATA / MISSING_VERIFIED_PRE_EVENT_PRICE`. The provenance strip shows event agency/source quality, market provider, eligible/effective history, and Pivot provider boundary.

- [ ] **Step 4: Run full JS tests**

Run: `node --test tests/js/*.test.mjs`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add macro/ui/history-health.mjs macro/ui/app.mjs macro/ui/phase3.css macro-preview.html tests/js/history-health.test.mjs tests/js/ui-phase3.test.mjs
git commit -m "ui: add Phase 3.1 history health"
```

---

### Task 13: CI, public-data validation, Pages, final dry-run and merge gate

**Files:**
- Modify: `.github/workflows/macro-phase3-ci.yml`
- Modify: `.github/workflows/macro-desk-ci.yml`
- Modify: `.github/workflows/pages.yml`
- Create: `tests/js/phase31-publishing.test.mjs`

**Interfaces:**
- CI runs both deterministic Python and Node suites.
- CI validates catalog/history/state JSON schemas and scans new Python/data/workflow surfaces for secrets.
- Pages publishes `event-catalog.json` and `event-history.json`; operational state is not required as a public artifact.

- [ ] **Step 1: Write failing CI/Pages contract tests**

```javascript
test('Phase 3 CI runs Python and Node suites',()=>{
  const yml=fs.readFileSync('.github/workflows/macro-phase3-ci.yml','utf8');
  assert.match(yml,/python -m unittest discover -s tests\/python/);
  assert.match(yml,/node --test tests\/js\/\*\.test\.mjs/);
});

test('Pages publishes catalog and history',()=>{
  const yml=fs.readFileSync('.github/workflows/pages.yml','utf8');
  assert.match(yml,/data/);
  assert.match(yml,/event-catalog|cp -R data/);
  assert.match(yml,/event-history|cp -R data/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/js/phase31-publishing.test.mjs`

Expected: Phase 3 CI lacks Python collector checks.

- [ ] **Step 3: Extend CI/security/Pages**

Add:

```bash
python -m unittest discover -s tests/python -p 'test_*.py' -v
python -m py_compile scripts/event_history/*.py scripts/update_event_catalog.py scripts/update_event_history.py
node --test tests/js/*.test.mjs
```

Validate `event-catalog.json`, `event-history.json`, and `event-history-state.json`. Extend secret scan over `scripts/event_history`, both CLIs, `macro`, `data`, workflow files, and preview; retain order-language scan. Ensure Pages copies catalog/history. Add PR/branch regression check that `index.html` remains identical to `main` unless a later approved task intentionally changes it.

- [ ] **Step 4: Run full deterministic verification**

```bash
python -m unittest discover -s tests/python -p 'test_*.py' -v
node --test tests/js/*.test.mjs
python -m py_compile scripts/event_history/*.py scripts/update_event_catalog.py scripts/update_event_history.py
node --check macro/history/support-state.mjs
node --check macro/ui/history-health.mjs
```

Expected: zero failures and zero syntax errors.

- [ ] **Step 5: Run fixture-based dry runs**

Use the fixture injection paths from Tasks 6 and 9. Catalog dry run must report discovered/changed/unchanged counts without writes. History dry run must report candidate `+1m/+5m/+15m` counts, no interpolation, no repository mutation, and no non-null consensus/surprise values.

- [ ] **Step 6: Trigger feature-branch CI and inspect exact logs**

Confirm MACRO DESK CI and Phase 3 CI both execute Python tests, Node tests, JSON validation, syntax checks, secret scan, and order-language scan. Record exact pass/fail counts before any completion claim.

- [ ] **Step 7: Compare feature branch with `main`**

Confirm branch is not behind `main`, `index.html` is absent from changed files, public history contains no synthetic fixture records, and only intended collector/data/UI/workflow/docs/tests changed.

- [ ] **Step 8: Stop at explicit merge/publish approval gate**

Present verified branch status to the user. Do not merge Phase 3.1 or enable scheduled production collection until the user explicitly approves the final merge/publish action.

---

## Self-Review Result

- **Spec coverage:** Tasks 1–13 cover schemas, BLS/DOL/Fed sources, EST/EDT, stable IDs, schedule revisions, PRE/+1m/+5m/+15m, common PRE, high/low excursions, missing-bar failure, dedupe/conflict quarantine, 48-hour recovery, writer concurrency, exact-event/window matching, support-state thresholds, Pivot provenance preservation, ADVANCE/NOWCAST compatibility, History Health, security, Pages, and production-index protection.
- **Corrected bar semantics:** The plan explicitly treats provider M1 timestamps as bar starts and maps an exact 12:30 release to PRE 12:29, +1m close at 12:31, +5m close at 12:35, +15m close at 12:45. This removes the one-bar-late ambiguity found during self-review.
- **Window compatibility:** Existing `5m` history references are normalized to canonical `+5m`; the new collector emits only canonical `+1m/+5m/+15m` values.
- **Type consistency:** Python and JavaScript use the same sample provenance field names and support-state thresholds.
- **No placeholders:** Each task identifies exact files, interfaces, test commands, expected RED/GREEN behavior, and commit boundaries.
- **Production safety:** Work remains on `feature/phase3.1-official-history-collector` until final explicit merge/publish approval.