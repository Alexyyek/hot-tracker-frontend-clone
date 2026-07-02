# Hot Tracker Frontend Clone

High-fidelity frontend clone of `https://hot.kyangc.net/`, built with React, TypeScript, and Vite.

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

Local `npm run dev` still depends on the original Hot Tracker API through Vite proxy routes.

## GitHub Pages Deployment

This repository is configured for the custom GitHub Pages domain:

```text
https://hot.aiscl.work/
```

The `public/CNAME` file is included so GitHub Pages publishes the site on that domain.

This repository includes two GitHub Actions workflows:

- `.github/workflows/update-data.yml` runs every 15 minutes and writes the latest API snapshot into `public/data`.
- `.github/workflows/deploy-pages.yml` builds the app and deploys `dist` to GitHub Pages.

Before the first deployment:

1. Push the repository to GitHub.
2. Open repository `Settings -> Pages`.
3. Set `Build and deployment -> Source` to `GitHub Actions`.
4. Add the DNS record for `hot.aiscl.work` at your DNS provider.
5. Run `Deploy GitHub Pages` manually once from the Actions tab.

The deployed app is a static site. It refreshes by reading the latest committed JSON files, so content updates after the scheduled `Update Static Data` workflow completes. GitHub cron jobs can be delayed, so the 15-minute schedule is best-effort rather than exact real time.

Useful environment variables:

```text
HOT_TRACKER_API_BASE=https://hot.kyangc.net
FEED_LIMIT=300
DAILY_HISTORY_DAYS=14
BASE_PATH=/
VITE_DATA_MODE=static
```

## Acceptance Audit

Run the screenshot and interaction audit against a local URL:

```bash
LOCAL_URL=http://127.0.0.1:4174 npm run acceptance
```

The audit captures original and local screenshots, checks key interactions, and writes results to:

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

## API And Asset Proxy

`vite.config.ts` proxies these original-site paths:

```text
/api
/source-avatars
/feed-images
```

This keeps local development visually close to the live site by loading the same data, avatars, favicons, and feed images when available.

## Notes

- GitHub Pages deployment uses scheduled static snapshots instead of a long-running backend service.
- Live data can change between collection runs, so exact counts and first cards may drift.
- The acceptance audit checks screenshot states and layout overflow. It is not a full screen-reader or keyboard accessibility audit.
