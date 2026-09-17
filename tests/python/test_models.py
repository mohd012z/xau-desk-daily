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

if __name__ == '__main__':
    unittest.main()
