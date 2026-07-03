# Local Source Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `hot.kyangc.net` data fetching with local collectors that generate the same static data files for GitHub Pages.

**Architecture:** The static data build reads the existing AI topic catalog, builds a local source registry, runs direct collectors for RSS/API/web/WeChat sources, optionally skips X sources unless an official token is configured, then generates feed, source facets, topic counts, and daily reports locally. The collector may reuse `hot.aiscl.work` as a cache fallback, but must not call `hot.kyangc.net`.

**Tech Stack:** Node.js 24, native `fetch`, RSS/Atom XML parsing with existing lightweight helpers, HTML parsing with constrained regex helpers, GitHub Actions static JSON output.

---

### Task 1: Add Guard Tests

**Files:**
- Create: `scripts/test/local-collector.test.mjs`
- Modify: `package.json`

- [x] Add a Node test that asserts `scripts/collect-static-data.mjs` contains no `hot.kyangc.net`, no `/api/feed`/`/api/topics`/`/api/daily` upstream calls, and exports local generation behavior through generated static JSON.
- [x] Add `npm run test:collector`.
- [x] Run `npm run test:collector` and verify it fails before implementation because the current script still references `hot.kyangc.net`.

### Task 2: Build Local Collection Pipeline

**Files:**
- Modify: `scripts/collect-static-data.mjs`

- [x] Replace upstream `collectRequired` calls with local topic/source/feed generation.
- [x] Add direct RSS/Atom collection for mapped RSS and blog sources.
- [x] Extend WeChat fallback to all configured公众号 sources with cache reuse.
- [x] Keep arXiv collection and cache fallback.
- [x] Add optional X API collector guarded by `X_BEARER_TOKEN`; without it, X sources are present with count `0`.

### Task 3: Generate Local Daily Reports

**Files:**
- Modify: `scripts/collect-static-data.mjs`

- [x] Generate `daily/latest.json` and `daily/YYYY-MM-DD.json` from locally collected feed items.
- [x] Include source references so existing daily UI popovers still work.
- [x] Keep report dates aligned to Beijing time.

### Task 4: Verify And Deploy

**Files:**
- Modify: `public/data/*.json`
- Modify: `public/data/daily/*.json`

- [x] Run `npm run test:collector`.
- [x] Run `npm run collect:data`.
- [x] Verify no generated JSON has `sourceBaseUrl: "https://hot.kyangc.net"`.
- [x] Run `BASE_PATH=/ VITE_DATA_MODE=static npm run build`.
- [ ] Commit, push, and verify GitHub Pages deployment.
