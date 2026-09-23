# XAU//DESK — Genuine Daily Gold Dashboard

A static GitHub Pages dashboard whose `xauusd-data.js` snapshot is regenerated automatically every day by GitHub Actions.

## Architecture

`GitHub Actions daily schedule` → `scripts/update_xauusd.py` → external data sources → `xauusd-data.js` → commit to `main` → GitHub Pages redeploy → `index.html` reads newest snapshot.

The browser never receives API keys. Keys exist only as GitHub Actions repository secrets.

The production Pages build also injects `macro/ui/runtime-safety.js` before the legacy renderer. If the verified external snapshot fails to load, that guard replaces the old embedded market content with an explicit `DATA UNAVAILABLE` state rather than presenting stale prices or headlines as current.

## Daily schedule

The updater runs every day at **07:10 Asia/Kuala_Lumpur** and also supports manual runs from the Actions tab.

GitHub scheduled workflows can be delayed occasionally. The dashboard therefore calculates freshness from the generated snapshot timestamp and shows `FRESH`, `AGING`, `STALE`, `DEGRADED`, or `SEED / UNVERIFIED` rather than assuming the schedule succeeded.

## Price semantics

The automated source currently requests **daily XAU/USD OHLC bars**. The latest value is therefore a **daily close snapshot**, not a streaming spot quote. Runtime and MACRO adapters normalize this as `DAILY_CLOSE` while keeping the legacy `spot` field readable for backward compatibility.

The historical high available from the daily provider window is treated as a **rolling high**, not a true all-time high.

## API secrets

Go to **Repository → Settings → Secrets and variables → Actions → New repository secret** and create:

| Secret | Status | Purpose |
|---|---|---|
| `TWELVE_DATA_API_KEY` | **Required** | XAU/USD daily OHLC; updater refuses to publish a fake snapshot if this fails |
| `FRED_API_KEY` | Recommended | Official FRED `DGS10` US 10-year Treasury yield |
| `NEWS_API_KEY` | Optional | Recent gold/macro headlines |

Do **not** paste API keys into `index.html`, `xauusd-data.js`, workflow YAML, commits, issues, or README files.

## First-time setup

1. Create or choose a GitHub repository for the project. The repository name is not hard-coded into the runtime application.
2. Upload the contents of this package to the repository root, preserving the `.github/workflows/` folders.
3. Add the API secrets listed above.
4. Open **Actions → XAUUSD Daily Verified Snapshot → Run workflow** and run it once.
5. Confirm the workflow creates a new commit that updates `xauusd-data.js`.
6. Open **Settings → Pages** and set **Source = GitHub Actions**.
7. Open **Actions → Deploy XAU DESK to GitHub Pages → Run workflow** once if it has not already run from the push.
8. Use the public Pages URL shown in the deployment result as the authoritative site address.

For a project site, the normal Pages form is:

`https://<owner>.github.io/<repository-name>/`

The exact Pages URL shown by GitHub is authoritative.

## Repository rename procedure

The runtime uses relative paths, so a GitHub repository rename does not require changing imports such as `./xauusd-data.js` or `./macro/...`. The **project Pages URL does change with the repository name**, so verify the new deployment after the rename.

Before renaming:

- keep `main` and all feature branches, especially unfinished history-collector work;
- make sure `MACRO DESK CI` is green;
- make sure the latest daily snapshot workflow is green;
- do not create a replacement repository with the old name.

After renaming:

1. Open **Settings → Pages** and confirm GitHub Actions remains the source.
2. Run **XAUUSD Daily Verified Snapshot** manually.
3. Run **Deploy XAU DESK to GitHub Pages** manually.
4. Open the deployment-provided Pages URL and verify `index.html`, `xauusd-data.js`, `macro-preview.html`, and `data/event-history.json` load.
5. Verify the dashboard reports `DAILY_CLOSE`/snapshot semantics and that temporarily blocking `xauusd-data.js` produces `DATA UNAVAILABLE`, not the old embedded snapshot.
6. Update any external bookmarks, mobile wrappers, documentation, or integrations that stored the previous Pages URL.

## What is genuinely updated

### Mandatory
- XAU/USD daily OHLC from Twelve Data.
- Daily price change, day range, rolling month change, current-year change.
- Daily support/resistance derived from previous-day classic pivot calculations plus recent 20-day extremes.
- XAU chart series.

### Optional / best effort
- DXY from Twelve Data only when an appropriate provider symbol can be confirmed.
- Brent from Twelve Data commodity discovery.
- US 10Y from FRED `DGS10` when `FRED_API_KEY` is configured.
- Recent gold/macro news when `NEWS_API_KEY` is configured.
- Federal Reserve official speech listings.

Optional-source failures are shown as degraded/unavailable; they do not silently invent values.

## Source and model separation

Market values and fetched headlines are source data. The pressure gauge is explicitly a mechanical heuristic using sourced daily changes; it is not treated as a measured event impact or guaranteed forecast. The updater does not fabricate percentage impacts for headlines or speeches.

## Files

- `index.html` — public dashboard source.
- `xauusd-data.js` — generated verified snapshot loaded by the dashboard.
- `macro/ui/runtime-safety.js` — fail-closed runtime guard and daily-price semantic normalization.
- `scripts/update_xauusd.py` — daily data updater.
- `.github/workflows/xauusd-daily.yml` — scheduled updater.
- `.github/workflows/pages.yml` — GitHub Pages deployment and runtime-safety injection.
- `.github/workflows/macro-desk-ci.yml` — JS/Python validation, syntax checks, data validation, and source-safety checks.
- `.nojekyll` — serve the site as plain static files.
- `.env.example` — local variable names only; no real secrets.

## Manual update

At any time: **Actions → XAUUSD Daily Verified Snapshot → Run workflow**.

A successful data commit triggers the Pages workflow, so the online site is redeployed automatically.

## Troubleshooting

### Daily workflow fails immediately
Check that `TWELVE_DATA_API_KEY` exists as an Actions repository secret. The updater intentionally stops rather than generating fake XAU/USD data.

### `US 10Y` shows unavailable
Add `FRED_API_KEY`, then run the daily workflow again.

### News is empty
Add `NEWS_API_KEY`, then run the daily workflow again. News is optional.

### Pages workflow fails
Go to **Settings → Pages** and confirm **Source = GitHub Actions**. The deployment workflow needs `pages: write` and `id-token: write`, which are already declared in the included workflow.

### Verified snapshot does not load
The Pages build intentionally fails closed. The dashboard should show `DATA UNAVAILABLE` instead of falling back to the old embedded market values. Check that `xauusd-data.js` exists in the deployed artifact and that the daily workflow completed successfully.

### Data remains stale
Open the latest `XAUUSD Daily Verified Snapshot` workflow run. A successfully loaded but old verified snapshot is marked stale; missing verified data is not replaced with guessed prices.
