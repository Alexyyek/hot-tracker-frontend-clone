# Hot Tracker Parity Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the audited visual and functional gaps between the local Hot Tracker clone and the original site.

**Architecture:** Keep the current React/Vite client-only architecture. Add focused UI components for original-like source branding, timeline cards, share modal/page, special topic panels, runtime cache/toasts, PWA shell behavior, and mobile polish.

**Tech Stack:** React, Vite, TypeScript, lucide-react, browser localStorage, lightweight service worker.

---

## File Structure

- Modify `src/types.ts`: add item detail, share, GitHub trending, and portfolio types.
- Modify `src/api.ts`: add feed item detail and GitHub trending endpoints.
- Modify `src/data.ts`: add source kind labels, icon keys, topic display helpers, today labels, and cache helpers.
- Modify `src/App.tsx`: add share route handling, toasts, brand refresh, PWA update notification.
- Modify `src/components/TopBar.tsx`: match original icon tabs, brand, counts, scroll-hidden mobile behavior.
- Modify `src/components/FilterPanel.tsx`: match original topic collapse, source chips, importance chips, source rows, tooltips.
- Modify `src/components/FeedPage.tsx`: add active filter strip, stale cache, refresh toast, special panels.
- Modify `src/components/FeedTimeline.tsx`: match original time rail, card metadata, recommendation panel, share action, source icons.
- Modify `src/components/DailyPage.tsx`: richer original-like daily cards.
- Create `src/components/ShareDialog.tsx`: share poster-like modal and copy/open actions.
- Create `src/components/SharePage.tsx`: `/share/:id` standalone page.
- Create `src/components/SpecialPanels.tsx`: GitHub trending and whale portfolio summary panels.
- Create `src/components/Toast.tsx`: transient app toast.
- Create `public/sw.js`: lightweight cache shell.
- Modify `index.html`: PWA manifest metadata hooks if needed.
- Modify `src/styles.css`: parity styling and responsive behavior.

## Tasks

### Task 1: Feed Visual Parity

- [ ] Match brand and top tabs to original labels/icons.
- [ ] Convert feed list to original-like time rail with left time labels.
- [ ] Match card density, source icon badges, score chips, topic chips, and `推荐理由` styling.
- [ ] Replace `原文` primary card action with `分享` and keep source link available.
- [ ] Verify desktop/mobile feed screenshots.

### Task 2: Filter Parity

- [ ] Add collapsed topic list with `更多主题`.
- [ ] Add topic source tooltips.
- [ ] Change importance chips to `全部 / 80+ / 60+`.
- [ ] Add richer source kind chips: GitHub, 微信, 网站, X, 政治人物, SEC.
- [ ] Add source rows with icons and active filter strip.

### Task 3: Share And Detail

- [ ] Add `/api/feed/:id?raw=compact` client.
- [ ] Add share modal with poster-like content, copy link, open share page, close actions.
- [ ] Add `/share/:id` local route using feed detail data.
- [ ] Add share action to each card.

### Task 4: Special Topic Panels

- [ ] Add GitHub trending panel using `/api/github/trending` when `github-trending` is selected.
- [ ] Add whale portfolio summary panel from feed raw data when `whale-portfolio` is selected.
- [ ] Keep generic feed list below special panels.

### Task 5: Runtime And Mobile Polish

- [ ] Add localStorage feed/daily cache and stale-data fallback.
- [ ] Add refresh toast and brand click refresh.
- [ ] Add lightweight service worker, update prompt, and PWA status.
- [ ] Add mobile scroll-aware bottom tab hiding and filter drawer polish.
- [ ] Add iOS gesture/viewport guard.

### Task 6: Verification

- [ ] Run `npm run build`.
- [ ] Capture original/local desktop and mobile screenshots.
- [ ] Compare against audit notes and fix visible regressions.
- [ ] Commit final parity work.

