# Hot Tracker Frontend Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local React/Vite frontend clone of Hot Tracker that reads the original public API and reproduces the core feed and daily briefing experience.

**Architecture:** Use a client-only React app with a small API client, normalized query state, and focused presentation components. Vite proxies `/api/*` requests to `https://hot.kyangc.net` during local development so the browser uses same-origin API calls.

**Tech Stack:** React, Vite, TypeScript, CSS modules via plain CSS, lucide-react icons.

---

## File Structure

- `package.json`: Scripts and dependencies.
- `index.html`: Vite HTML entry.
- `vite.config.ts`: React plugin and API proxy.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript configuration.
- `src/main.tsx`: React entry point.
- `src/App.tsx`: App shell, theme, tabs, and initial orchestration.
- `src/api.ts`: API fetch helpers, query serialization, and response types.
- `src/types.ts`: Shared topic, feed, daily report, and UI types.
- `src/data.ts`: Formatting, grouping, filtering helpers.
- `src/components/TopBar.tsx`: Brand, tab switcher, and theme control.
- `src/components/FilterPanel.tsx`: Topic/source/score/search filters.
- `src/components/FeedPage.tsx`: Feed query state, loading, pagination, and layout.
- `src/components/FeedTimeline.tsx`: Date grouping and feed card rendering.
- `src/components/DailyPage.tsx`: Daily report loading and rendering.
- `src/components/StatusViews.tsx`: Loading, empty, error, and warning UI.
- `src/styles.css`: App-wide visual system and responsive rules.

## Tasks

### Task 1: Scaffold The App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create Vite/React project files**

Create the app with React, TypeScript, and lucide-react dependencies. Add `dev`, `build`, and `preview` scripts.

- [ ] **Step 2: Add minimal app shell**

Render a basic Hot Tracker shell with `src/main.tsx`, `src/App.tsx`, and `src/styles.css`.

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 4: Build smoke test**

Run: `npm run build`
Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 5: Commit scaffold**

Run: `git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json src docs/superpowers/plans/2026-07-01-hot-tracker-frontend-clone.md && git commit -m "feat: scaffold hot tracker clone"`

### Task 2: Add API Client And Data Helpers

**Files:**
- Create: `src/types.ts`
- Create: `src/api.ts`
- Create: `src/data.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Define shared types**

Add TypeScript types for topics, feed items, source facets, topic counts, daily reports, feed queries, and theme modes.

- [ ] **Step 2: Implement API client**

Add fetch helpers for `getTopics`, `getFeed`, `getSourceFacets`, `getTopicCounts`, `getDailyLatest`, and `getDailyReports`.

- [ ] **Step 3: Implement data helpers**

Add date formatting, relative time, day grouping, topic lookup, and query cleanup helpers.

- [ ] **Step 4: Wire initial load**

Load topics, first feed page, source facets, topic counts, and latest daily reports in `App`.

- [ ] **Step 5: Build smoke test**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit API layer**

Run: `git add src && git commit -m "feat: add hot tracker api client"`

### Task 3: Build App Shell And Filters

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/FilterPanel.tsx`
- Create: `src/components/StatusViews.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement `TopBar`**

Add brand mark, app title, segmented `实时动态` / `每日日报` tabs, and light/dark/system theme control.

- [ ] **Step 2: Implement status components**

Add reusable loading, error, empty, inline warning, and load-more button components.

- [ ] **Step 3: Implement `FilterPanel`**

Render topic buttons, search field, source kind chips, source rows, and minimum importance controls.

- [ ] **Step 4: Add responsive app shell CSS**

Add desktop two-column layout, warm light theme, dark theme variables, and mobile bottom tab behavior.

- [ ] **Step 5: Build smoke test**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit shell and filters**

Run: `git add src && git commit -m "feat: add hot tracker shell and filters"`

### Task 4: Build Feed Experience

**Files:**
- Create: `src/components/FeedPage.tsx`
- Create: `src/components/FeedTimeline.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement `FeedPage`**

Own feed query state, update filters, reset pagination on query changes, keep existing content when refresh fails, and support `nextCursor` loading.

- [ ] **Step 2: Implement `FeedTimeline`**

Group items by published day and render timeline cards with score, source, title, summary, tags, why-it-matters text, and source links.

- [ ] **Step 3: Add feed card styling**

Style cards, source badges, score pills, tags, timeline day headers, and mobile layout.

- [ ] **Step 4: Build smoke test**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit feed experience**

Run: `git add src && git commit -m "feat: build hot tracker feed"`

### Task 5: Build Daily Briefing Experience

**Files:**
- Create: `src/components/DailyPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement `DailyPage`**

Render latest report date, date picker, topic report cards, main lines, watch items, and grouped sections.

- [ ] **Step 2: Add daily API refresh**

When the date changes, call `/api/daily?date=YYYY-MM-DD` and show an isolated daily loading/error state.

- [ ] **Step 3: Style report cards**

Add report headers, section groups, confidence pills, watch item panels, and mobile spacing.

- [ ] **Step 4: Build smoke test**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit daily view**

Run: `git add src && git commit -m "feat: add daily briefing view"`

### Task 6: Verify In Browser

**Files:**
- Modify: files found during verification only if fixes are needed.

- [ ] **Step 1: Start local dev server**

Run: `npm run dev -- --host 127.0.0.1`
Expected: Vite prints a local URL.

- [ ] **Step 2: Desktop browser check**

Open the local URL at 1440px width. Verify initial feed loads, filters render, theme switch works, cards have no text overlap, and "load more" appends items.

- [ ] **Step 3: Mobile browser check**

Open the local URL at 390px width. Verify bottom tabs, feed card layout, filter drawer, and daily view fit without overlap.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Final commit if fixes were needed**

Run: `git add src package.json package-lock.json vite.config.ts && git commit -m "fix: polish hot tracker clone verification"`

## Self-Review

- Spec coverage: The plan covers the React/Vite app, public API proxy, feed, daily view, filters, themes, responsive layouts, loading/error/empty states, and browser verification.
- Scope: Backend crawling, accounts, PWA offline behavior, and share posters remain out of scope.
- Placeholder scan: No task contains deferred implementation placeholders.
- Type consistency: Types are introduced before API and component tasks that consume them.

