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

The preview build still depends on the original Hot Tracker API through Vite proxy routes.

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

- The app is frontend-only; it does not reimplement the Hot Tracker backend.
- Live data can change between audit runs, so exact counts and first cards may drift.
- The acceptance audit checks screenshot states and layout overflow. It is not a full screen-reader or keyboard accessibility audit.
