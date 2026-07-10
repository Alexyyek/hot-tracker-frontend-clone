# Source Collection Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-source collection health, prevent stale fallback content from entering daily reports, and remove duplicated collection from the Pages workflow.

**Architecture:** Keep the existing single static collector, but add health classification around collected items. Daily report generation receives an eligibility-filtered item list while feed output remains broad enough to show source coverage. GitHub Actions separates collection from deployment.

**Tech Stack:** Node.js ESM collector, React/Vite static public data, GitHub Actions, Node test runner.

---

### Task 1: Add Failing Collector Tests

**Files:**
- Modify: `scripts/test/local-collector.test.mjs`

- [ ] Add a test that reads `public/data/source-health.json`, compares rows against `public/data/sources.json`, and checks health fields.
- [ ] Add a test that reads `public/data/daily/latest.json` and ensures referenced feed items do not use `manual_weixin_seed` or stale cache older than 14 days.
- [ ] Run `npm run test:collector` and expect the source-health test to fail before implementation.

### Task 2: Generate Source Health

**Files:**
- Modify: `scripts/collect-static-data.mjs`
- Create output: `public/data/source-health.json`

- [ ] Track each source's collected items after `collectSource`.
- [ ] Add helpers for item channel, item freshness age, health status, and recommended action.
- [ ] Write `source-health.json` with one row per configured source.
- [ ] Run `npm run collect:data` and inspect health status distribution.

### Task 3: Filter Daily Inputs

**Files:**
- Modify: `scripts/collect-static-data.mjs`

- [ ] Add `isDailyEligibleItem`.
- [ ] Exclude manual WeChat seeds from daily reports.
- [ ] Exclude cache-only items older than 14 days.
- [ ] Keep feed output unchanged so source coverage stays visible.

### Task 4: Remove Duplicate Deploy Collection

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `.github/workflows/update-data.yml`
- Modify: `README.md`

- [ ] Remove `Collect data snapshot` from Deploy workflow.
- [ ] Add `paths-ignore: public/data/**` to Deploy `push` trigger so data-only commits rely on `workflow_run`.
- [ ] Ensure Update workflow commits `source-health.json`.
- [ ] Update README collection health notes.

### Task 5: Verify and Ship

**Files:**
- Generated: `public/data/*.json`, `public/data/daily/*.json`

- [ ] Run `npm run collect:data`.
- [ ] Run `npm run test:collector`.
- [ ] Run `BASE_PATH=/ VITE_DATA_MODE=static npm run build`.
- [ ] Commit and push the implementation.
- [ ] Watch the Pages deployment and verify `https://hot.aiscl.work/data/source-health.json`.
