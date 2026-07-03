# AI Hot Tracker

AI-focused hot tracker built with React, TypeScript, Vite, and a local static data collector.

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Production Preview

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
```

The production build reads static JSON snapshots from `public/data`. Generate a fresh snapshot first when testing the GitHub Pages mode locally:

```bash
npm run collect:data
VITE_DATA_MODE=static npm run build
npm run preview -- --host 127.0.0.1 --port 4174
```

Local `npm run dev` also reads `public/data`, so development and production use the same static snapshot path.

## GitHub Pages Deployment

This repository is configured for the custom GitHub Pages domain:

```text
https://hot.aiscl.work/
```

The `public/CNAME` file is included so GitHub Pages publishes the site on that domain.

This repository includes two GitHub Actions workflows:

- `.github/workflows/update-data.yml` runs every 30 minutes and writes the latest local collector snapshot into `public/data`.
- `.github/workflows/deploy-pages.yml` builds the app and deploys `dist` to GitHub Pages.

Before the first deployment:

1. Push the repository to GitHub.
2. Open repository `Settings -> Pages`.
3. Set `Build and deployment -> Source` to `GitHub Actions`.
4. Add the DNS record for `hot.aiscl.work` at your DNS provider.
5. Run `Deploy GitHub Pages` manually once from the Actions tab.

The deployed app is a static site. It refreshes by reading the latest committed JSON files, so content updates after the scheduled `Update Static Data` workflow completes. GitHub cron jobs can be delayed, so the 30-minute schedule is best-effort rather than exact real time.

Useful environment variables:

```text
DAILY_HISTORY_DAYS=14
LOCAL_SOURCE_LIMIT_PER_SOURCE=4
WEIXIN_FALLBACK_LIMIT_PER_SOURCE=3
WEIXIN_QUERY_TERMS=AI
STATIC_FEED_FALLBACK_URL=https://hot.aiscl.work/data/feed.json
X_BEARER_TOKEN=
BASE_PATH=/
VITE_DATA_MODE=static
```

## Acceptance Audit

Run the screenshot and interaction audit against a local URL:

```bash
LOCAL_URL=http://127.0.0.1:4174 npm run acceptance
```

The audit captures reference and local screenshots, checks key interactions, and writes results to:

```text
docs/audits/hot-tracker-final-acceptance-2026-07-01/
```

Covered states:
- Desktop feed
- Feed card expand and share dialog
- Desktop daily reader and report switching
- Mobile feed filter drawer
- Mobile daily reader
- Share page

## Data Collection

`scripts/collect-static-data.mjs` reads the curated source catalog in `src/aiTopics.ts` and collects directly from RSS feeds, official webpages, arXiv, Sogou WeChat search, and optional X API credentials. It does not call the original Hot Tracker APIs.

When a direct source is temporarily unavailable, the collector may reuse the previous snapshot from `public/data/feed.json` or the deployed `hot.aiscl.work` static JSON as a same-project cache fallback.

## Notes

- GitHub Pages deployment uses scheduled static snapshots instead of a long-running backend service.
- Live data can change between collection runs, so exact counts and first cards may drift.
- The acceptance audit checks screenshot states and layout overflow. It is not a full screen-reader or keyboard accessibility audit.
