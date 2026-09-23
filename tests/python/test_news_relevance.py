import unittest

from scripts.news_relevance import is_gold_macro_relevant


class NewsRelevanceTest(unittest.TestCase):
    def test_accepts_gold_with_clear_macro_driver(self):
        cases = [
            "Gold rises as dollar weakens ahead of Federal Reserve rate decision",
            "XAUUSD falls as Treasury yields climb after inflation data",
            "Bullion gains on central bank demand and safe-haven flows",
            "Gold steadies before US payrolls as markets price a Fed rate cut",
        ]
        for text in cases:
            with self.subTest(text=text):
                self.assertTrue(is_gold_macro_relevant(text))

    def test_rejects_general_news_returned_by_broad_search(self):
        cases = [
            "Chronological Reading for Tuesday September 22, 2026",
            "Moto Wrap Weekly – SMX Fireworks – MXGP – Rally – Trials",
            "LIC, Axis Bank: analysts explain why they prefer these stocks",
            "Trump inaugurates new White House helipad; networks skip coverage",
            "How much passive income can I earn off an $800,000 superannuation balance?",
        ]
        for text in cases:
            with self.subTest(text=text):
                self.assertFalse(is_gold_macro_relevant(text))

    def test_rejects_gold_content_without_macro_context(self):
        self.assertFalse(
            is_gold_macro_relevant(
                "Gold jewellery retail rates today: check 24K and 22K prices in major cities"
            )
        )

    def test_rejects_macro_content_without_gold_context(self):
        self.assertFalse(
            is_gold_macro_relevant(
                "Federal Reserve officials discuss inflation and Treasury yields"
            )
        )

    def test_handles_empty_or_none_text(self):
        self.assertFalse(is_gold_macro_relevant(""))
        self.assertFalse(is_gold_macro_relevant(None))


if __name__ == "__main__":
    unittest.main()
