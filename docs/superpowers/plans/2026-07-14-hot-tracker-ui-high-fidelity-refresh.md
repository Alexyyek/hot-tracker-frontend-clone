# AI Hot Tracker UI High-Fidelity Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the existing AI Hot Tracker frontend so its feed, filters, mobile layout, and daily reader closely match `https://hot.kyangc.net/` while preserving the current AI topics, data, and interactions.

**Architecture:** Keep the current React component boundaries and data flow. Add measurable visual-regression assertions to the existing Playwright audit, make the small behavior changes in `FeedTimeline`, `FilterPanel`, and `FeedPage`, and centralize the remaining visual alignment in `styles.css` so light and dark themes continue to share one hierarchy.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Lucide React, CSS custom properties, Playwright audit script, Node test runner

---

## File Map

- Modify `scripts/acceptance-audit.mjs`: add repeatable screenshot output selection and hard assertions for density, media visibility, overflow, daily typography, mobile navigation, and core interactions.
- Modify `src/components/FeedTimeline.tsx`: hide media until expansion, include media in expansion eligibility, simplify card badges, and keep topic context in the footer.
- Modify `src/components/FilterPanel.tsx`: flatten source rows to icon/name/count, preserve accessible source-kind context, and expose pressed states.
- Modify `src/components/FeedPage.tsx`: hide idle refresh status and move the mobile refresh action into the filter sheet.
- Modify `src/styles.css`: align tokens, shell proportions, filters, cards, daily typography, dark mode, responsive layout, and focus states with the reference.
- Read-only verification against `docs/superpowers/specs/2026-07-14-hot-tracker-ui-refresh-design.md` and the reference URL.

### Task 1: Turn the visual audit into a failing acceptance test

**Files:**
- Modify: `scripts/acceptance-audit.mjs`
- Test: `scripts/acceptance-audit.mjs`

- [ ] **Step 1: Make the audit output directory configurable**

Replace the fixed `outDir` declaration with:

```js
const outDir = path.resolve(
  process.env.AUDIT_OUT_DIR ?? "docs/audits/hot-tracker-ui-refresh-2026-07-14/final"
);
```

- [ ] **Step 2: Add reusable style and overlap helpers**

Add these functions below `capture`:

```js
async function readFontSize(locator) {
  return locator.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
}

async function elementsOverlap(first, second) {
  const [a, b] = await Promise.all([
    first.evaluate((element) => element.getBoundingClientRect().toJSON()),
    second.evaluate((element) => element.getBoundingClientRect().toJSON())
  ]);
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
```

- [ ] **Step 3: Record desktop feed hierarchy metrics**

Replace the local desktop feed capture action with:

```js
results.push(
  await capture("02-local-feed-desktop.png", `${localUrl}/`, desktop, async (page) => {
    const firstExpand = page.locator(".timeline-expand-button").first();
    const firstSourceName = page.locator(".source-filter-row .source-row-name").first();
    const sourceNameEllipsis = await firstSourceName.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.overflow === "hidden" && style.textOverflow === "ellipsis" && style.whiteSpace === "nowrap";
    });
    return {
      cards: await page.locator(".timeline-card").count(),
      expandText: await firstExpand.textContent(),
      collapsedMedia: await page.locator(".timeline-card:not(.is-expanded) .feed-media-grid").count(),
      cardHeaderTopicPills: await page.locator(".timeline-card-head .topic-chip").count(),
      sourceRows: await page.locator(".source-filter-row").count(),
      sourceSecondaryLabels: await page.locator(".source-filter-row small").count(),
      sourceNameEllipsis
    };
  })
);
```

- [ ] **Step 4: Record expansion and sharing behavior without assuming the first card**

Replace the expanded-card capture action with:

```js
results.push(
  await capture("03-local-feed-expanded-share.png", `${localUrl}/`, desktop, async (page) => {
    const expandableCard = page.locator(".timeline-card").filter({ has: page.locator(".timeline-expand-button") }).first();
    await expandableCard.locator(".timeline-expand-button").click();
    await expandableCard.locator(".feed-action-button").click();
    await page.waitForSelector(".share-dialog", { timeout: 5000 });
    return {
      dialogText: await page.locator(".share-dialog").innerText(),
      expanded: await page.locator(".timeline-card.is-expanded").count(),
      expandState: await expandableCard.locator(".timeline-expand-button").getAttribute("aria-expanded")
    };
  })
);
```

- [ ] **Step 5: Record daily typography, report switching, and source-popover behavior**

Replace the local daily desktop capture action with:

```js
results.push(
  await capture("05-local-daily-desktop.png", `${localUrl}/`, desktop, async (page) => {
    await page.getByText("日报").first().click();
    await page.waitForTimeout(800);
    const before = await page.locator(".daily-article h1").textContent();
    await page.locator(".daily-report-button").nth(1).click();
    await page.waitForTimeout(300);
    const after = await page.locator(".daily-article h1").textContent();
    const sourceReference = page.locator(".daily-source-ref").first();
    await sourceReference.focus();
    const popoverVisible = await sourceReference.locator(".daily-source-popover").evaluate((element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.opacity === "1";
    });
    return {
      reportButtons: await page.locator(".daily-report-button").count(),
      sectionBlocks: await page.locator(".daily-section-block").count(),
      dateText: await page.locator(".date-picker strong").textContent(),
      switched: before !== after,
      before,
      after,
      mainlineFontSize: await readFontSize(page.locator(".daily-mainline-panel p").first()),
      storyTitleFontSize: await readFontSize(page.locator(".daily-story h3").first()),
      storyBodyFontSize: await readFontSize(page.locator(".daily-story p").first()),
      popoverVisible,
      popoverLinks: await sourceReference.locator(".daily-source-popover a").count()
    };
  })
);
```

- [ ] **Step 6: Capture the collapsed mobile feed before opening the drawer**

Insert this capture before the mobile drawer capture and renumber later screenshots by one:

```js
results.push(
  await capture("07-local-feed-mobile.png", `${localUrl}/`, mobile, async (page) => {
    const nav = page.locator(".primary-tabs");
    const firstFooter = page.locator(".timeline-card-footer").first();
    return {
      collapsedMedia: await page.locator(".timeline-card:not(.is-expanded) .feed-media-grid").count(),
      filterButtons: await page.locator(".mobile-filter-toggle").count(),
      visibleRefreshButtons: await page.locator(".source-refresh-button:visible").count(),
      navOverlapsFirstFooter: await elementsOverlap(nav, firstFooter)
    };
  })
);
```

Use `08-local-feed-mobile-drawer.png`, `09-local-daily-mobile.png`, and `10-local-share-page.png` for the captures that follow.

- [ ] **Step 7: Add hard acceptance assertions before writing results**

Insert this function above `resolveShareId`:

```js
function assertAcceptance(captures) {
  const byName = new Map(captures.map((result) => [result.name, result]));
  const desktopFeed = byName.get("02-local-feed-desktop.png");
  const expandedFeed = byName.get("03-local-feed-expanded-share.png");
  const daily = byName.get("05-local-daily-desktop.png");
  const mobileFeed = byName.get("07-local-feed-mobile.png");
  const drawer = byName.get("08-local-feed-mobile-drawer.png");
  const mobileDaily = byName.get("09-local-daily-mobile.png");
  const failures = [];

  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };

  for (const result of captures.filter((entry) => entry.url.startsWith(localUrl))) {
    expect(result.metrics.scrollWidth <= result.metrics.innerWidth + 1, `${result.name}: horizontal overflow`);
    expect(result.metrics.wide.length === 0, `${result.name}: elements exceed the viewport`);
    expect(!result.meta.actionError, `${result.name}: ${result.meta.actionError}`);
  }

  expect(desktopFeed?.meta.cards > 0, "desktop feed: no cards rendered");
  expect(desktopFeed?.meta.collapsedMedia === 0, "desktop feed: collapsed media is visible");
  expect(desktopFeed?.meta.cardHeaderTopicPills === 0, "desktop feed: topic pill still competes in the card header");
  expect(desktopFeed?.meta.sourceRows > 0, "desktop feed: no source rows rendered");
  expect(desktopFeed?.meta.sourceSecondaryLabels === 0, "desktop feed: source-kind second line is still visible");
  expect(desktopFeed?.meta.sourceNameEllipsis === true, "desktop feed: source names do not use ellipsis styling");
  expect(expandedFeed?.meta.expanded === 1, "feed expansion did not open exactly one card");
  expect(expandedFeed?.meta.expandState === "true", "feed expansion did not update aria-expanded");
  expect(expandedFeed?.meta.dialogText?.includes("分享"), "share dialog did not open");
  expect(daily?.meta.switched === true, "daily report switching failed");
  expect(daily?.meta.mainlineFontSize >= 15, "daily mainline text is below 15px");
  expect(daily?.meta.storyTitleFontSize >= 15, "daily story title is below 15px");
  expect(daily?.meta.storyBodyFontSize >= 15, "daily story body is below 15px");
  expect(daily?.meta.popoverVisible === true, "daily source popover is not keyboard accessible");
  expect(daily?.meta.popoverLinks > 0, "daily source popover has no links");
  expect(mobileFeed?.meta.collapsedMedia === 0, "mobile feed: collapsed media is visible");
  expect(mobileFeed?.meta.filterButtons === 1, "mobile feed: expected one filter entry");
  expect(mobileFeed?.meta.visibleRefreshButtons === 0, "mobile feed: desktop refresh action remains visible");
  expect(mobileFeed?.meta.navOverlapsFirstFooter === false, "mobile feed: fixed navigation overlaps the first card footer");
  expect(drawer?.meta.drawer === 1, "mobile filter drawer did not open");
  expect(drawer?.meta.sourceRows > 0, "mobile filter drawer has no source rows");
  expect(mobileDaily?.meta.reportButtons > 0, "mobile daily has no report controls");

  if (failures.length > 0) {
    throw new Error(`Acceptance failed:\n- ${failures.join("\n- ")}`);
  }
}
```

Immediately after writing `acceptance-results.json`, call:

```js
assertAcceptance(results);
```

- [ ] **Step 8: Build and run the test against the current UI to prove it fails for the intended reasons**

Run in terminal 1:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
```

Run in terminal 2:

```bash
LOCAL_URL=http://127.0.0.1:4174 \
REFERENCE_URL=https://hot.kyangc.net \
AUDIT_OUT_DIR=docs/audits/hot-tracker-ui-refresh-2026-07-14/red \
npm run acceptance
```

Expected: the build succeeds, then acceptance exits non-zero with failures including collapsed media, source-kind second lines, and daily typography below `15px`.

- [ ] **Step 9: Commit the failing acceptance baseline**

```bash
git add scripts/acceptance-audit.mjs
git commit -m "test(ui): add high-fidelity acceptance checks"
```

### Task 2: Simplify the feed-card hierarchy and gate media behind expansion

**Files:**
- Modify: `src/components/FeedTimeline.tsx`
- Modify: `src/styles.css`
- Test: `scripts/acceptance-audit.mjs`

- [ ] **Step 1: Include known media in expansion eligibility**

Replace the `canExpand` setup inside `FeedCard` with:

```tsx
const [expanded, setExpanded] = useState(false);
const accent = getTopicAccent(topics, item.topicId);
const watchText = item.whyItMatters || item.watchText || item.actionText;
const knownMediaUrls = extractFeedImageUrls(item);
const canExpand = knownMediaUrls.length > 0 || item.summary.length > 180 || (watchText?.length ?? 0) > 120;
```

- [ ] **Step 2: Keep only the score in the card header**

Replace the card badge block with:

```tsx
<div className="timeline-card-badges">
  <span className="score-pill" aria-label={`热度 ${item.importanceScore}`}>
    {item.importanceScore}
  </span>
</div>
```

- [ ] **Step 3: Render media only in the expanded state**

Replace the unconditional media render with:

```tsx
{expanded ? <FeedMedia item={item} /> : null}
```

- [ ] **Step 4: Keep topic context in the footer without duplicating header emphasis**

Replace the footer with:

```tsx
<footer className="timeline-card-footer">
  <div className="timeline-footer-context">
    <span className="topic-chip">{getTopicTitle(topics, item.topicId)}</span>
    <a href={item.sourceUrl} rel="noreferrer" target="_blank">
      {item.sourceName}
    </a>
  </div>
  <button className="feed-action-button" onClick={() => onShare(item)} type="button" title="分享">
    <Share2 size={14} />
    <span>分享</span>
  </button>
</footer>
```

- [ ] **Step 5: Replace the feed-card CSS blocks with the compact reference hierarchy**

Update the corresponding selectors in `src/styles.css` to these values:

```css
.timeline-day-items {
  display: grid;
  gap: 8px;
}

.timeline-card {
  --score-accent: var(--brand);
  display: grid;
  gap: 9px;
  overflow: hidden;
  padding: 13px 14px 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(63 46 35 / 4%);
}

.timeline-card-head,
.timeline-source-line,
.timeline-card-badges,
.timeline-card-footer,
.timeline-footer-context,
.tag-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.timeline-card h3 {
  margin: 1px 0 0;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.48;
  overflow-wrap: anywhere;
}

.feed-summary {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  line-height: 1.68;
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.feed-media-grid {
  display: grid;
  width: min(420px, 100%);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.feed-media-grid.single {
  grid-template-columns: minmax(0, 1fr);
  width: min(380px, 100%);
}

.feed-media-tile,
.feed-media-grid.single .feed-media-tile {
  display: block;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: var(--surface-raised);
}

.timeline-reason {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--mint) 28%, var(--border));
  border-radius: 6px;
  background: color-mix(in srgb, var(--mint) 8%, var(--surface-raised));
}

.topic-chip,
.score-pill,
.tag-chip {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 550;
  line-height: 1;
}

.timeline-card-footer {
  justify-content: space-between;
  min-width: 0;
  margin: 1px -14px 0;
  padding: 9px 14px;
  border-top: 1px solid var(--border-soft);
  color: var(--text-muted);
  font-size: 12px;
}

.timeline-footer-context {
  min-width: 0;
}

.timeline-footer-context .topic-chip {
  flex: 0 0 auto;
  padding: 0 7px;
  color: var(--text-muted);
  background: var(--surface-raised);
}

.timeline-footer-context a {
  min-width: 0;
}
```

- [ ] **Step 6: Run build and acceptance to confirm card assertions pass**

```bash
npm run build
LOCAL_URL=http://127.0.0.1:4174 REFERENCE_URL=https://hot.kyangc.net AUDIT_OUT_DIR=docs/audits/hot-tracker-ui-refresh-2026-07-14/feed npm run acceptance
```

Expected: TypeScript succeeds; acceptance no longer reports collapsed media or card-header topic-pill failures. Source-row and daily-font failures remain until later tasks.

- [ ] **Step 7: Commit the card behavior and styling**

```bash
git add src/components/FeedTimeline.tsx src/styles.css
git commit -m "style(feed): match reference card density"
```

### Task 3: Flatten source filters and tighten topic controls

**Files:**
- Modify: `src/components/FilterPanel.tsx`
- Modify: `src/styles.css`
- Test: `scripts/acceptance-audit.mjs`

- [ ] **Step 1: Expose pressed state on topic buttons**

Add `aria-pressed` to the aggregate and mapped topic buttons:

```tsx
aria-pressed={!query.topicId}
```

```tsx
aria-pressed={query.topicId === topic.id}
```

- [ ] **Step 2: Replace the source-row body with a single accessible line**

Replace each source button body with:

```tsx
<button
  aria-label={`${facet.sourceName}，${sourceKindLabel(facet.sourceKind)}，${facet.count} 条`}
  aria-pressed={query.sourceName === facet.sourceName}
  className={[
    "source-filter-row",
    query.sourceName === facet.sourceName ? "active" : ""
  ].filter(Boolean).join(" ")}
  key={`${facet.sourceKind}-${facet.sourceName}-${facet.sourceHostname ?? ""}`}
  onClick={() =>
    update({
      sourceKind: facet.sourceKind,
      sourceName: facet.sourceName,
      sourceHostname: facet.sourceHostname
    })
  }
  title={`${facet.sourceName} · ${sourceKindLabel(facet.sourceKind)}`}
  type="button"
>
  <SourceIcon
    className="source-row-icon"
    kind={facet.sourceKind}
    sourceName={facet.sourceName}
    sourceAvatarUrl={facet.sourceAvatarUrl}
    sourceHostname={facet.sourceHostname}
    sourceIconHostname={facet.sourceIconHostname}
  />
  <span className="source-row-name">{facet.sourceName}</span>
  <em className="source-row-count">{facet.count}</em>
</button>
```

- [ ] **Step 3: Replace topic and source row dimensions with compact controls**

Update the matching selectors in `src/styles.css`:

```css
.filter-section {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(63 46 35 / 4%);
}

.topic-row {
  display: grid;
  min-height: 42px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  background: var(--surface-raised);
  cursor: pointer;
  text-align: left;
}

.topic-row-count {
  display: inline-flex;
  min-width: 34px;
  height: 23px;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--topic-accent) 28%, var(--border));
  border-radius: 999px;
  color: var(--topic-accent);
  background: var(--surface);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.source-filter-list {
  display: grid;
  gap: 4px;
}

.source-filter-row {
  display: grid;
  min-height: 38px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text);
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.source-filter-row:hover {
  border-color: var(--border);
  background: var(--surface-raised);
}

.source-filter-row.active {
  border-color: color-mix(in srgb, var(--brand) 30%, var(--border));
  background: var(--brand-soft);
}

.source-row-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-size: 12px;
  font-weight: 550;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-row-count {
  display: inline-flex;
  min-width: 30px;
  height: 22px;
  align-items: center;
  justify-content: flex-end;
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
```

Remove the obsolete `.source-dot`, `.source-row-body`, `.source-filter-row strong`, and `.source-filter-row small` blocks after confirming no remaining JSX references them.

- [ ] **Step 4: Verify source filtering still updates the feed**

In the acceptance desktop feed action, add this interaction before returning metrics:

```js
const countBeforeSourceFilter = await page.locator(".timeline-card").count();
await page.locator(".source-filter-row").first().click();
await page.waitForTimeout(250);
const countAfterSourceFilter = await page.locator(".timeline-card").count();
const activeSourceRows = await page.locator(".source-filter-row.active").count();
```

Add these values to the returned object and these assertions to `assertAcceptance`:

```js
expect(desktopFeed?.meta.activeSourceRows === 1, "source filtering did not select exactly one source");
expect(desktopFeed?.meta.countBeforeSourceFilter > 0, "source filtering test started without feed cards");
expect(desktopFeed?.meta.countAfterSourceFilter > 0, "selected source produced no visible feed cards");
expect(
  desktopFeed?.meta.countAfterSourceFilter <= desktopFeed?.meta.countBeforeSourceFilter,
  "source filtering increased the visible result set"
);
```

- [ ] **Step 5: Run build and acceptance**

```bash
npm run build
LOCAL_URL=http://127.0.0.1:4174 REFERENCE_URL=https://hot.kyangc.net AUDIT_OUT_DIR=docs/audits/hot-tracker-ui-refresh-2026-07-14/filters npm run acceptance
```

Expected: source rows have no second line, the first source can be selected, names use ellipsis styling, and only daily typography/mobile refresh assertions remain.

- [ ] **Step 6: Commit filter markup, styles, and its regression check**

```bash
git add src/components/FilterPanel.tsx src/styles.css scripts/acceptance-audit.mjs
git commit -m "style(filters): compact topic and source controls"
```

### Task 4: Align the app shell, refresh states, and mobile controls

**Files:**
- Modify: `src/components/FeedPage.tsx`
- Modify: `src/styles.css`
- Test: `scripts/acceptance-audit.mjs`

- [ ] **Step 1: Hide refresh status whenever no refresh is running**

Replace `RealtimeStatus` with:

```tsx
function RealtimeStatus({
  sourceRefresh
}: {
  sourceRefresh: {
    running: boolean;
    checked: number;
    total: number;
    lastUpdated: string;
  };
}) {
  if (!sourceRefresh.running) return null;

  const label = isStaticDataMode()
    ? "正在读取最新静态快照"
    : `正在逐个刷新信息源：${sourceRefresh.checked}/${sourceRefresh.total}`;

  return <div className="realtime-status active">{label}</div>;
}
```

Remove `formatStatusTime` because it has no remaining caller.

- [ ] **Step 2: Add a mobile-only refresh icon inside the filter sheet**

Replace the filter sheet header with:

```tsx
<div className="filter-sheet-header">
  <strong>筛选</strong>
  <div className="filter-sheet-header-actions">
    <button
      className="icon-button filter-sheet-refresh"
      disabled={sourceRefresh.running}
      onClick={() => void refreshCatalogSources(query)}
      type="button"
      title="刷新全部源"
    >
      <RefreshCw size={17} className={sourceRefresh.running ? "is-spinning" : ""} />
    </button>
    <button className="icon-button" onClick={() => setDrawerOpen(false)} type="button" title="关闭">
      <X size={18} />
    </button>
  </div>
</div>
```

- [ ] **Step 3: Replace the primary light and dark visual tokens**

Use these root values and keep existing topic-color tokens below them:

```css
:root {
  --app-chrome-background: #f7f7f4;
  --bg: #f7f7f4;
  --surface: #fffefa;
  --surface-raised: #fbfaf7;
  --surface-glass: rgb(255 255 255 / 94%);
  --text: #342b25;
  --text-strong: #1c1713;
  --text-muted: #776d65;
  --border: #e5ded5;
  --border-soft: #eee9e2;
  --brand: #d97706;
  --brand-strong: #a33a16;
  --brand-soft: #fff1df;
  --mint: #169b7b;
  --shadow: 0 8px 24px rgb(63 46 35 / 7%);
  color: var(--text);
  background: var(--bg);
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

:root[data-theme="dark"] {
  --app-chrome-background: #171512;
  --bg: #171512;
  --surface: #211e1a;
  --surface-raised: #29251f;
  --surface-glass: rgb(33 30 26 / 94%);
  --text: #ded7cf;
  --text-strong: #fffaf4;
  --text-muted: #a99f95;
  --border: #443d35;
  --border-soft: #37312b;
  --brand: #f59e0b;
  --brand-strong: #f0a36a;
  --brand-soft: #3b2b19;
  --mint: #58c3a8;
  --shadow: 0 8px 24px rgb(0 0 0 / 18%);
  color-scheme: dark;
}
```

- [ ] **Step 4: Match desktop shell dimensions and header restraint**

Update these selectors:

```css
.app-root {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 18px 0 36px;
}

.topbar {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.brand-block {
  gap: 11px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border: 1px solid color-mix(in srgb, var(--brand) 34%, var(--border));
  border-radius: 7px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(63 46 35 / 5%);
}

.brand-block h1 {
  margin: 1px 0 0;
  color: #4b1f12;
  font-size: 24px;
  font-weight: 650;
  line-height: 1.08;
}

.topbar-actions {
  --topbar-control-size: 40px;
  gap: 7px;
}

.primary-tabs {
  --tab-shell-padding: 3px;
  height: var(--topbar-control-size);
  padding: var(--tab-shell-padding);
  border: 1px solid var(--border);
  background: var(--surface-glass);
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
}

.primary-tab-indicator {
  border-color: color-mix(in srgb, var(--brand) 24%, var(--border));
  background: var(--brand-soft);
}

.tab-button {
  min-width: 98px;
  min-height: 33px;
  font-size: 13px;
}

.theme-toggle,
.icon-button {
  border-color: var(--border);
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(63 46 35 / 5%);
}

.workspace-grid,
.feed-layout {
  display: grid;
  grid-template-columns: minmax(220px, 250px) minmax(0, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.content-panel,
.filter-section,
.daily-sidebar,
.daily-article {
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(63 46 35 / 4%);
}

.panel-header {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--border-soft);
}

.source-refresh-button {
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--brand-strong);
  background: var(--surface-raised);
  box-shadow: none;
}

.panel-count {
  min-width: 48px;
  min-height: 34px;
  color: var(--text-muted);
  background: transparent;
}

.status-view {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-muted);
  background: var(--surface);
  box-shadow: none;
}

.inline-warning {
  margin: 12px 18px 0;
  padding: 9px 11px;
  border-radius: 6px;
  font-size: 12px;
}
```

- [ ] **Step 5: Replace the mobile overrides for one compact entry and safe bottom spacing**

Inside `@media (max-width: 760px)`, use:

```css
.app-root {
  width: 100%;
  padding: 12px 11px calc(108px + env(safe-area-inset-bottom));
}

.topbar {
  display: grid;
  min-height: 50px;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding-bottom: 8px;
}

.source-refresh-button {
  display: none;
}

.mobile-filter-toggle {
  display: inline-flex;
  min-width: 40px;
  min-height: 40px;
  justify-content: center;
  padding: 0 10px;
}

.filter-sheet-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-sheet-refresh {
  display: inline-flex;
}

.panel-header {
  min-height: 54px;
  padding: 0 0 10px;
  border-bottom: 0;
}

.timeline-card-head {
  flex-direction: row;
  align-items: center;
}

.timeline-source-line {
  width: auto;
  flex: 1 1 auto;
  flex-wrap: nowrap;
}

.timeline-card-badges {
  flex: 0 0 auto;
}

.primary-tabs {
  bottom: max(14px, env(safe-area-inset-bottom));
  width: min(300px, calc(100vw - 42px));
  min-height: 48px;
}
```

Outside the media query, add:

```css
.filter-sheet-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-sheet-refresh {
  display: none;
}
```

- [ ] **Step 6: Run build and acceptance**

```bash
npm run build
LOCAL_URL=http://127.0.0.1:4174 REFERENCE_URL=https://hot.kyangc.net AUDIT_OUT_DIR=docs/audits/hot-tracker-ui-refresh-2026-07-14/shell npm run acceptance
```

Expected: desktop and mobile have no horizontal overflow, idle status is absent, mobile has one visible filter button and no visible desktop refresh button, and the fixed navigation does not overlap the first card footer.

- [ ] **Step 7: Commit the shell and responsive behavior**

```bash
git add src/components/FeedPage.tsx src/styles.css
git commit -m "style(feed): align desktop and mobile shell"
```

### Task 5: Rebuild the daily reader rhythm around reference typography

**Files:**
- Modify: `src/styles.css`
- Test: `scripts/acceptance-audit.mjs`

- [ ] **Step 1: Tighten the daily sidebar and date control**

Replace the matching blocks with:

```css
.daily-layout {
  margin-top: 14px;
}

.daily-reader-layout {
  display: grid;
  grid-template-columns: minmax(220px, 250px) minmax(0, 1fr);
  gap: 14px;
}

.daily-sidebar {
  align-self: start;
  padding: 14px;
}

.date-picker-control {
  display: grid;
  min-height: 44px;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  background: var(--surface-raised);
}

.daily-report-nav {
  display: grid;
  gap: 7px;
  margin-top: 16px;
}

.daily-report-button {
  display: grid;
  min-height: 76px;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  background: var(--surface-raised);
  cursor: pointer;
  text-align: left;
}
```

- [ ] **Step 2: Replace the article surface and summary typography**

```css
.daily-article {
  --score-accent: var(--brand);
  display: grid;
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--brand-soft) 46%, var(--surface)) 0%, var(--surface) 38%),
    var(--surface);
}

.daily-article-header {
  display: grid;
  gap: 12px;
  padding: 30px 28px 10px;
}

.daily-article-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-family: Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", serif;
  font-size: 36px;
  font-weight: 500;
  line-height: 1.12;
}

.daily-mainline-panel {
  position: relative;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 8px;
  padding: 0 28px 34px;
}

.daily-mainline-panel div {
  padding-left: 18px;
  border-left: 2px solid color-mix(in srgb, var(--mint) 62%, var(--border));
}

.daily-mainline-panel h2 {
  margin: 0 0 8px;
  color: var(--brand-strong);
  font-size: 14px;
  font-weight: 700;
}

.daily-mainline-panel p {
  margin: 0;
  color: var(--text);
  font-family: Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", serif;
  font-size: 16px;
  line-height: 1.9;
}
```

- [ ] **Step 3: Increase section and story readability**

```css
.daily-section-block {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 0;
  padding: 28px 28px 30px;
  border-bottom: 1px solid var(--border-soft);
}

.daily-section-heading span {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--brand) 34%, var(--border));
  border-radius: 999px;
  color: var(--brand-strong);
  background: color-mix(in srgb, var(--brand) 7%, var(--surface));
  font-size: 13px;
  font-weight: 700;
}

.daily-section-heading h2 {
  margin: 5px 0 18px;
  color: var(--text-strong);
  font-family: Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", serif;
  font-size: 21px;
  font-weight: 550;
}

.daily-story-list {
  grid-column: 2;
  display: grid;
  gap: 22px;
}

.daily-story {
  display: grid;
  gap: 8px;
}

.daily-story h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.55;
}

.daily-story p,
.daily-story blockquote {
  margin: 0;
  color: var(--text);
  font-family: Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", serif;
  font-size: 15px;
  line-height: 1.9;
}
```

- [ ] **Step 4: Restrain the source popover and keep long links safe**

```css
.daily-source-popover {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  z-index: 60;
  display: none;
  width: min(560px, calc(100vw - 64px));
  max-width: 560px;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  background: var(--surface);
  box-shadow: var(--shadow);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(5px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.daily-source-popover a span,
.daily-source-placeholder span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 5: Add mobile daily dimensions that preserve the reading scale**

Inside `@media (max-width: 760px)`, replace the daily overrides with:

```css
.daily-layout {
  margin-top: 8px;
}

.daily-reader-layout {
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.daily-sidebar {
  padding: 11px;
}

.daily-report-nav {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  overflow: visible;
  padding-bottom: 0;
}

.daily-report-button {
  min-height: 72px;
  padding: 9px 10px;
}

.daily-article-header {
  padding: 24px 18px 10px;
}

.daily-article-header h1 {
  font-size: 30px;
}

.daily-mainline-panel {
  grid-template-columns: 18px minmax(0, 1fr);
  padding: 0 18px 26px;
}

.daily-mainline-panel div {
  padding-left: 13px;
}

.daily-mainline-panel p {
  font-size: 15px;
  line-height: 1.85;
}

.daily-section-block {
  grid-template-columns: 44px minmax(0, 1fr);
  padding: 22px 17px 24px 14px;
}

.daily-section-heading span {
  width: 34px;
  height: 34px;
}

.daily-section-heading h2 {
  font-size: 19px;
}

.daily-story-list {
  gap: 18px;
}

.daily-story h3 {
  align-items: flex-start;
  flex-wrap: wrap;
  font-size: 15px;
}

.daily-story p,
.daily-story blockquote {
  font-size: 15px;
  line-height: 1.86;
}
```

- [ ] **Step 6: Run build and acceptance until all hard assertions pass**

```bash
npm run build
LOCAL_URL=http://127.0.0.1:4174 REFERENCE_URL=https://hot.kyangc.net AUDIT_OUT_DIR=docs/audits/hot-tracker-ui-refresh-2026-07-14/daily npm run acceptance
```

Expected: exit code `0`; daily mainline, story title, and story body are at least `15px`; date/report switching and keyboard source popover still work; desktop and mobile have no horizontal overflow.

- [ ] **Step 7: Commit the daily reader refresh**

```bash
git add src/styles.css
git commit -m "style(daily): match reference reader typography"
```

### Task 6: Complete regression and side-by-side visual verification

**Files:**
- Verify: `src/components/FeedTimeline.tsx`
- Verify: `src/components/FilterPanel.tsx`
- Verify: `src/components/FeedPage.tsx`
- Verify: `src/styles.css`
- Verify: `scripts/acceptance-audit.mjs`

- [ ] **Step 1: Run the complete local regression suite**

```bash
npm run build
npm run test:collector
```

Expected: `tsc --noEmit` and Vite build succeed; Node reports all collector tests passing.

- [ ] **Step 2: Capture final matching states at both target viewports**

```bash
LOCAL_URL=http://127.0.0.1:4174 \
REFERENCE_URL=https://hot.kyangc.net \
AUDIT_OUT_DIR=docs/audits/hot-tracker-ui-refresh-2026-07-14/final \
npm run acceptance
```

Expected: exit code `0`, `acceptance-results.json` contains no `actionError`, every local capture has `scrollWidth <= innerWidth + 1`, and the screenshot directory contains reference/local desktop feed, expanded feed, desktop daily, mobile feed, mobile drawer, mobile daily, and share-page states.

- [ ] **Step 3: Compare the final pairs side by side**

Inspect these pairs at their native sizes:

```text
01-reference-feed-desktop.png  <->  02-local-feed-desktop.png
04-reference-daily-desktop.png <->  05-local-daily-desktop.png
06-reference-feed-mobile.png   <->  07-local-feed-mobile.png
```

The comparison passes only when all of these are visibly true:

```text
Desktop feed: sidebar/content proportion, header height, card density, and first-screen item count are close to the reference.
Feed cards: no collapsed image, title is primary, score is secondary, recommendation callout is quiet, and footer controls do not overlap.
Filters: topic rows and source rows are compact; source names stay on one line and truncate.
Mobile feed: title and article content appear in the first viewport; one filter entry is visible; fixed navigation covers no content.
Daily desktop: warm article surface is restrained; body type is comfortable; section circles, indentation, and dividers align with the reference rhythm.
Daily mobile: report controls, date control, article copy, source count, and source popover remain inside the viewport.
```

- [ ] **Step 4: Verify keyboard and dark-theme states**

Use the local preview and check this exact sequence:

```text
1. Press Tab through primary tabs, topic rows, source rows, keyword input, score buttons, expand, share, date, report buttons, and a daily source count; each focused control has a visible focus ring.
2. Activate one topic row with Enter, enter a keyword known to occur in the visible feed, choose `60+`, and confirm each action narrows or preserves the result set without producing unrelated results.
3. Use the reset control, then activate one source row with Enter; exactly one source row is selected and the feed remains non-empty.
4. Activate Expand with Enter; aria-expanded becomes true and any media remains bounded to the readable card width.
5. Open and close the share dialog with keyboard controls; then reopen a generated `/share/:id` URL and confirm the shared title renders.
6. Switch to Daily, choose another available date, change the report, focus a source count, and open a source link.
7. Toggle dark mode; surfaces, borders, text, score, recommendation callout, status/empty states, and daily popover remain legible without new bright gradients.
```

Expected: all seven sequences complete without overlap, clipping, unreadable contrast, or broken interaction.

- [ ] **Step 5: Review the final diff for scope control**

```bash
git diff --check
git status --short
git diff --stat HEAD~4..HEAD
```

Expected: no whitespace errors; only the planned frontend/audit files plus this plan/spec are tracked; collector data and unrelated audit screenshots are not staged.

- [ ] **Step 6: Commit any final CSS-only visual corrections found during comparison**

Only when the side-by-side review required a final CSS adjustment:

```bash
git add src/styles.css
git commit -m "style(ui): finish reference visual alignment"
```

If no final CSS adjustment was needed, leave the working tree unchanged after verification.
