import unittest

from scripts.normalize_snapshot_semantics import normalize_snapshot


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


if __name__ == "__main__":
    unittest.main()
