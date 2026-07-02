# Hot Tracker Clone Comparison Audit

Audit date: 2026-07-01

## Evidence Captured

- `01-original-desktop-feed.png`: original site, desktop feed, 1440x1000.
- `02-local-desktop-feed.png`: local clone, desktop feed, 1440x1000.
- `03-original-mobile-feed.png`: original site, mobile feed, 390x900.
- `04-local-mobile-feed.png`: local clone, mobile feed, 390x900.

The original app bundle also references feature modules for share posters, share pages, whale portfolio panels, GitHub trending panels, PWA pull refresh, and a richer daily page.

## Step List

1. Original desktop feed: healthy, polished, richer timeline and filter behavior.
2. Local desktop feed: functional and visually close, but simplified timeline and missing several actions.
3. Original mobile feed: healthy, dense, tuned for mobile with icons and sticky bottom tabs.
4. Local mobile feed: usable, but less faithful typography, metadata, and card hierarchy.

## Main Differences

### Visual And Layout

- Original brand area is more minimal: logo plus `Hot Tracker`; local clone adds `Private topic feed`, which changes the first-viewport brand signal.
- Original tab labels use icons (`动态`, `日报`) and accessible counts; local clone uses text-only `实时动态`, `每日日报` and shows a daily count chip.
- Original desktop feed uses a real vertical timeline rail with time labels on the left; local clone uses date groups and cards without the time rail.
- Original feed header says `实时流 / 动态`; local clone says `Live Feed / 全部热点`.
- Original card density is higher and card metadata is more balanced. Local clone has larger cards, more padding, and a more generic dashboard feel.
- Original uses source/brand icons, including GitHub icons. Local clone uses one-letter badges.
- Original reason panel is green and labeled `推荐理由`; local clone uses topic-colored reason panels and `为什么重要`.
- Original card footer action is `分享`; local clone action is `原文`.
- Original filter rail has tighter spacing, icon chips, and source rows with real source icons. Local clone is close but less refined.
- Original topic rail shows only a top subset and has a `更多主题` expander. Local clone shows all topics at once.
- Original mobile feed has stronger mobile-specific information hierarchy: source icon, dot-separated time, no duplicated score row at the top. Local clone still looks like a compressed desktop card.

### Functional Gaps

- Share action and share poster dialog are missing.
- `/share/:id` share page is missing.
- PWA install/offline behavior, update prompt, and pull-to-refresh are missing.
- Toasts for refresh/new items are missing.
- Brand click refresh behavior is missing.
- Topic rail `更多主题` collapsed/expanded behavior is missing.
- Topic source-info tooltip is missing.
- Original has `今天 / N 条动态` day header language; local has date-only `7月1日周三`.
- Original supports richer source categories, including `政治人物` and `SEC`; local hardcodes a smaller source-kind list.
- Original filter importance choices are `全部 / 80+ / 60+`; local clone uses `全部 / 50+ / 70+ / 85+`.
- Original source filters support source hostname/name normalization and richer avatar/icon resolution; local clone only does basic source rows.
- Original caches feed/source/topic data in localStorage and keeps stale data on refresh failures; local clone has simpler request state.
- Original has mobile scroll-aware topbar/bottom tab hiding behavior; local clone keeps the bottom tab fixed.
- Original has GitHub Trending special panel/module when the topic is selected; local clone renders GitHub items as generic feed cards.
- Original has Whale Portfolio special panel/module; local clone renders whale portfolio data generically.
- Original daily page is lazy-loaded and appears to use richer daily-specific UI. Local clone has a simpler report card view.
- Original supports feed item detail fetch (`/api/feed/:id?raw=compact`); local clone does not expose item detail.
- Original has update/version freshness checks and service worker update acceptance; local clone does not.
- Original disables iOS zoom gestures for standalone/PWA use; local clone does not.

### Accessibility Risks

- Local clone has fewer icon labels and tooltips than original for source/topic meaning.
- Local clone's theme button title is present, but the visible state is icon-only; a text label may help screen reader and low-vision users.
- Local mobile bottom tabs are visually close, but the audit did not verify keyboard focus or ARIA behavior from screenshots.
- Local filter drawer state was not captured interactively in this run, so focus trapping and close behavior still need a browser interaction audit.

## Evidence Limits

- The audit used Chrome headless screenshots. It did not fully exercise live clicks inside the original SPA.
- Original daily tab, share dialog, filter drawer, load-more, and special topic panels were inferred from visible screenshots plus original bundle module names and API references, not fully captured as screenshots in this run.
- Full accessibility compliance cannot be claimed from screenshots alone.

## Recommended Fix Order

1. Match the feed visual hierarchy first: brand, tab labels/icons, header copy, time rail, `推荐理由`, `分享`, source icons, and card density.
2. Match filter behavior: collapsed topic list with `更多主题`, exact importance chips, full source-kind list, source icon rows, and active filter strip.
3. Add original-specific feed actions: share button, share poster dialog, share page, and item detail fetch.
4. Add special topic panels for GitHub Trending and Whale Portfolio.
5. Improve mobile parity: source/time line, bottom tab icons/counts, scroll-aware hiding, and filter drawer behavior.
6. Add PWA/runtime polish: pull-to-refresh, update prompt, stale cache, refresh toast, and brand refresh.

