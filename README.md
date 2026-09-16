# XAU//DESK — Genuine Daily Gold Dashboard

A static GitHub Pages dashboard whose `xauusd-data.js` snapshot is regenerated automatically every day by GitHub Actions.

## Architecture

`GitHub Actions daily schedule` → `scripts/update_xauusd.py` → external data sources → `xauusd-data.js` → commit to `main` → GitHub Pages redeploy → `index.html` reads newest snapshot.

The browser never receives API keys. Keys exist only as GitHub Actions repository secrets.

## Daily schedule

The updater runs every day at **07:10 Asia/Kuala_Lumpur** and also supports manual runs from the Actions tab.

GitHub scheduled workflows can be delayed occasionally. The dashboard therefore calculates freshness from the generated snapshot timestamp and shows `FRESH`, `AGING`, `STALE`, `DEGRADED`, or `SEED / UNVERIFIED` rather than assuming the schedule succeeded.

## API secrets

Go to **Repository → Settings → Secrets and variables → Actions → New repository secret** and create:

| Secret | Status | Purpose |
|---|---|---|
| `TWELVE_DATA_API_KEY` | **Required** | XAU/USD daily OHLC; updater refuses to publish a fake snapshot if this fails |
| `FRED_API_KEY` | Recommended | Official FRED `DGS10` US 10-year Treasury yield |
| `NEWS_API_KEY` | Optional | Recent gold/macro headlines |

Do **not** paste API keys into `index.html`, `xauusd-data.js`, workflow YAML, commits, issues, or README files.

## First-time setup

1. Create a new GitHub repository, recommended name: `xau-desk-daily`.
2. Upload the contents of this package to the repository root, preserving the `.github/workflows/` folders.
3. Add the API secrets listed above.
4. Open **Actions → XAUUSD Daily Verified Snapshot → Run workflow** and run it once.
5. Confirm the workflow creates a new commit that updates `xauusd-data.js`.
6. Open **Settings → Pages** and set **Source = GitHub Actions**.
7. Open **Actions → Deploy XAU DESK to GitHub Pages → Run workflow** once if it has not already run from the push.
8. GitHub will show the public Pages URL in the deployment result.

For a repository owned by `mohd012z` named `xau-desk-daily`, the normal Pages address will be:

`https://mohd012z.github.io/xau-desk-daily/`

The exact Pages URL shown by GitHub is authoritative.

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

- `index.html` — public dashboard.
- `xauusd-data.js` — generated snapshot loaded by the dashboard.
- `scripts/update_xauusd.py` — daily data updater.
- `.github/workflows/xauusd-daily.yml` — scheduled updater.
- `.github/workflows/pages.yml` — GitHub Pages deployment.
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

### Data remains stale
Open the latest `XAUUSD Daily Verified Snapshot` workflow run. The dashboard intentionally retains the last verified snapshot and marks it stale instead of replacing it with guessed data.
