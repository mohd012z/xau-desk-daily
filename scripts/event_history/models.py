from datetime import datetime, timezone

SCHEMA_VERSION = "1.0"
VALID_EVENT_STATUS = {"SCHEDULED","OFFICIAL_RELEASE_SEEN","EVENT_VERIFIED","WAITING_FOR_MARKET_WINDOWS","MARKET_DATA_COMPLETE","PUBLISHED","QUARANTINED"}
VALID_WINDOWS = {"+1m","+5m","+15m"}
VALID_ASSET_CLASSES = {"fx","metal","digital"}


def iso_utc(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        return None
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def empty_catalog():
    return {"schemaVersion":SCHEMA_VERSION,"generatedAt":None,"events":[]}


def empty_history_state():
    return {"schemaVersion":SCHEMA_VERSION,"generatedAt":None,"events":{}}


def normalize_event(raw):
    return {
        "eventId":str(raw.get("eventId") or "").strip(),
        "eventType":str(raw.get("eventType") or "").strip().upper(),
        "agency":str(raw.get("agency") or "").strip().upper(),
        "referencePeriod":raw.get("referencePeriod"),
        "scheduledAtUtc":iso_utc(raw.get("scheduledAtUtc")),
        "releasedAtUtc":iso_utc(raw.get("releasedAtUtc")),
        "timeSource":raw.get("timeSource") or "UNKNOWN",
        "timeConfidence":raw.get("timeConfidence") or "UNKNOWN",
        "actual":dict(raw.get("actual") or {}),
        "previous":dict(raw.get("previous") or {}),
        "consensus":raw.get("consensus"),
        "sourceUrl":raw.get("sourceUrl"),
        "sourceQuality":raw.get("sourceQuality") or "UNKNOWN",
        "status":raw.get("status") or "SCHEDULED",
        "scheduleRevisions":list(raw.get("scheduleRevisions") or []),
    }


def validate_event(event):
    errors=[]
    for key in ("eventId","eventType","agency","scheduledAtUtc"):
        if not event.get(key):
            errors.append(key)
    if event.get("status") not in VALID_EVENT_STATUS:
        errors.append("status")
    if event.get("status") in {"EVENT_VERIFIED","WAITING_FOR_MARKET_WINDOWS","MARKET_DATA_COMPLETE","PUBLISHED"} and not event.get("sourceUrl"):
        errors.append("sourceUrl")
    if event.get("consensus") is not None:
        errors.append("consensus")
    return sorted(set(errors))


def normalize_sample(raw):
    number=lambda key: float(raw[key]) if raw.get(key) is not None else None
    return {
        "sampleId":str(raw.get("sampleId") or "").strip(),
        "eventId":str(raw.get("eventId") or "").strip(),
        "eventType":str(raw.get("eventType") or "").strip().upper(),
        "eventTimeUtc":iso_utc(raw.get("eventTimeUtc")),
        "symbol":str(raw.get("symbol") or "").strip(),
        "assetClass":raw.get("assetClass"),
        "window":raw.get("window"),
        "before":number("before"),
        "after":number("after"),
        "high":number("high"),
        "low":number("low"),
        "priceTimestampUtc":iso_utc(raw.get("priceTimestampUtc")),
        "windowStartUtc":iso_utc(raw.get("windowStartUtc")),
        "windowEndUtc":iso_utc(raw.get("windowEndUtc")),
        "marketProvider":raw.get("marketProvider"),
        "providerBoundary":raw.get("providerBoundary"),
        "sourceUrl":raw.get("sourceUrl"),
        "sourceQuality":raw.get("sourceQuality") or "UNKNOWN",
        "eligible":bool(raw.get("eligible", False)),
        "quarantineReason":raw.get("quarantineReason"),
        "surpriseZ":None if raw.get("surpriseZ") is None else float(raw["surpriseZ"]),
    }


def validate_sample(sample):
    errors=[]
    for key in ("sampleId","eventId","eventType","eventTimeUtc","symbol","assetClass","window","before","after"):
        if sample.get(key) in (None, ""):
            errors.append(key)
    if sample.get("assetClass") not in VALID_ASSET_CLASSES:
        errors.append("assetClass")
    if sample.get("window") not in VALID_WINDOWS:
        errors.append("window")
    for key in ("before","after","high","low"):
        if sample.get(key) is not None and sample[key] <= 0:
            errors.append(key)
    if sample.get("eligible"):
        for key in ("priceTimestampUtc","windowStartUtc","windowEndUtc","marketProvider","providerBoundary","sourceUrl"):
            if not sample.get(key):
                errors.append(key)
        if sample.get("quarantineReason"):
            errors.append("quarantineReason")
    return sorted(set(errors))
