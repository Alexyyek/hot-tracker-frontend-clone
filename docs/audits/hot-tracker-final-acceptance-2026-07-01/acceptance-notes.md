# Hot Tracker Final Acceptance

Date: 2026-07-01

Scope:
- Original: https://hot.kyangc.net/
- Local: production preview, `LOCAL_URL=http://127.0.0.1:4174`
- Viewports: desktop 1440x1000, mobile 390x844

## Captured Evidence

1. `01-original-feed-desktop.png` - original desktop feed.
2. `02-local-feed-desktop.png` - local desktop feed.
3. `03-local-feed-expanded-share.png` - local expanded feed card and share dialog.
4. `04-original-daily-desktop.png` - original desktop daily reader.
5. `05-local-daily-desktop.png` - local desktop daily reader after report switch.
6. `06-original-feed-mobile.png` - original mobile feed.
7. `07-local-feed-mobile-drawer.png` - local mobile filter drawer.
8. `08-local-daily-mobile.png` - local mobile daily reader.
9. `09-local-share-page.png` - local share page.
10. `10-original-daily-mobile.png` - original mobile daily reader.

Raw run output: `acceptance-results.json`.

Production preview was started with:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
LOCAL_URL=http://127.0.0.1:4174 npm run acceptance
```

## Step Findings

1. Desktop feed - Healthy.
   - Original and local both render the two-column feed, topic/filter rail, timeline, topic chips, score chips, and share affordance.
   - Local now loads 11 feed cards on first screen, matching the original first-page density.
   - Source rows and card headers now use real source avatars/favicons when available, with text fallback.

2. Feed expansion and sharing - Healthy.
   - Local card expansion works: first card enters `.is-expanded`.
   - Share dialog opens and includes copy/open-share actions.
   - No desktop horizontal overflow was detected.

3. Desktop daily reader - Healthy.
   - Local daily page now matches the original two-pane pattern: report list on the left, one selected report on the right.
   - Report switching works: `AI日报` changed to `机酒卡日报`.
   - Date text is localized as `2026年7月1日`, matching the original.

4. Mobile feed and filter drawer - Healthy.
   - Original and local mobile feed fit within 390px.
   - Local filter drawer opens and renders source filters without overflow.
   - Source rows keep names truncated and counts aligned.

5. Mobile daily reader - Healthy.
   - Original mobile daily uses a two-column report grid; local now matches that pattern.
   - No horizontal overflow was detected after the grid fix.

6. Share page - Healthy.
   - `/share/feed_bc531bc4dfcee9eb9fe9258b` renders the expected shared item title.
   - No desktop horizontal overflow was detected.

## Fixes Made During Acceptance

- Removed the always-visible fake update banner.
- Removed the visible daily count chip from the top `日报` tab.
- Changed first-page feed limit from 50 to 11 to match original density.
- Added local proxy support for `/source-avatars` and `/feed-images`.
- Added real source avatar/favicon rendering for feed cards and source filters.
- Corrected source-kind filters to use real API values (`weixin_article`, `sec_filing`) while preserving user-facing labels.
- Changed mobile daily report navigation from horizontal carousel to two-column grid.
- Added a reusable acceptance script at `scripts/acceptance-audit.mjs`.

## Limits

- Screenshot audit does not prove full keyboard accessibility or screen-reader behavior.
- Some remote favicon/avatar requests can fail depending on network or third-party availability; local UI falls back to text badges.
- Original live data can change between captures, so exact topic/feed counts may drift over time.
