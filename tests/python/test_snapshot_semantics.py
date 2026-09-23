import unittest
from pathlib import Path

from scripts.normalize_snapshot_semantics import normalize_snapshot


ROOT = Path(__file__).resolve().parents[2]


class SnapshotSemanticsTest(unittest.TestCase):
    def test_daily_snapshot_gets_explicit_close_and_rolling_high_fields(self):
        snapshot = {
            "meta": {"cadence": "daily", "verified": True},
            "price": {
                "spot": 4327.23,
                "ath": 4500.50,
                "note": "Latest provider daily bar: 2026-09-23; rolling history used: 370 bars",
            },
        }

        out = normalize_snapshot(snapshot)
        price = out["price"]

        self.assertEqual(price["latestDailyClose"], 4327.23)
        self.assertEqual(price["priceType"], "DAILY_CLOSE")
        self.assertEqual(price["rollingHigh"], 4500.50)
        self.assertEqual(price["rollingWindowBars"], 370)
        self.assertEqual(price["providerBarTime"], "2026-09-23")
        self.assertIsNone(price["ath"])

    def test_non_daily_snapshot_is_not_relabelled_as_daily_close(self):
        snapshot = {"meta": {"cadence": "streaming"}, "price": {"spot": 4327.23}}
        out = normalize_snapshot(snapshot)
        self.assertNotIn("latestDailyClose", out["price"])
        self.assertNotIn("priceType", out["price"])

    def test_normalization_does_not_mutate_original_payload(self):
        snapshot = {"meta": {"cadence": "daily"}, "price": {"spot": 100.0, "ath": 110.0}}
        normalize_snapshot(snapshot)
        self.assertEqual(snapshot["price"]["ath"], 110.0)
        self.assertNotIn("latestDailyClose", snapshot["price"])

    def test_daily_workflow_normalizes_before_public_redaction(self):
        workflow = (ROOT / ".github/workflows/xauusd-daily.yml").read_text(encoding="utf-8")
        normalize_cmd = "python scripts/normalize_snapshot_semantics.py"
        redact_cmd = "python scripts/redact_public_data.py"
        self.assertIn(normalize_cmd, workflow)
        self.assertIn(redact_cmd, workflow)
        self.assertLess(workflow.index(normalize_cmd), workflow.index(redact_cmd))

    def test_daily_workflow_refreshes_when_trusted_pipeline_changes(self):
        workflow = (ROOT / ".github/workflows/xauusd-daily.yml").read_text(encoding="utf-8")
        self.assertIn("push:", workflow)
        self.assertIn("branches: [main]", workflow)
        for path in (
            "scripts/update_xauusd.py",
            "scripts/normalize_snapshot_semantics.py",
            "scripts/redact_public_data.py",
            "requirements.txt",
            ".github/workflows/xauusd-daily.yml",
        ):
            self.assertIn(path, workflow)

        # Snapshot commits must not trigger the updater again and create a loop.
        self.assertNotIn("- 'xauusd-data.js'", workflow)


if __name__ == "__main__":
    unittest.main()
