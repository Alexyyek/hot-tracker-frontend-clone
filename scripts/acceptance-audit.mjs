import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const outDir = path.resolve(
  process.env.AUDIT_OUT_DIR ?? "docs/audits/hot-tracker-ui-refresh-2026-07-14/final"
);
const localUrl = process.env.LOCAL_URL ?? "http://127.0.0.1:5173";
const referenceUrl = process.env.REFERENCE_URL ?? localUrl;
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };
const historicalDate = "2026-07-10";

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});

async function gotoStable(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function capture(name, url, viewport, actions = async () => ({}), fullPage = false) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  try {
    await gotoStable(page, url);
    const meta = await actions(page).catch((error) => ({ actionError: String(error?.message || error) }));
    await page.screenshot({ path: path.join(outDir, name), fullPage });
    const metrics = await page.evaluate(() => {
      const wide = [...document.querySelectorAll("body *")]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            cls: typeof el.className === "string" ? el.className : String(el.className),
            tag: el.tagName,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80)
          };
        })
        .filter((item) => item.left < -1 || item.right > window.innerWidth + 1)
        .slice(0, 8);
      return {
        title: document.title,
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyText: document.body.innerText.slice(0, 700),
        wide
      };
    });
    return { name, url, viewport, meta, metrics };
  } finally {
    await context.close();
  }
}

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

function normalizeHostname(value) {
  if (!value) return "";
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.trim().toLowerCase().replace(/^www\./, "");
  }
}

const results = [];

try {
  const shareId = await resolveShareId(localUrl);

  results.push(
    await capture("01-reference-feed-desktop.png", referenceUrl, desktop, async (page) => ({
      tabs: await page.locator(".tab-button").allTextContents().catch(() => [])
    }))
  );

  results.push(
    await capture("02-local-feed-desktop.png", `${localUrl}/`, desktop, async (page) => {
      const firstExpand = page.locator(".timeline-expand-button").first();
      const timelineCards = page.locator(".timeline-card:visible");
      const sourceRows = page.locator(".source-filter-row");
      const firstSourceRow = sourceRows.first();
      const firstSourceName = firstSourceRow.locator(".source-row-name");
      const sourceNameEllipsis = await firstSourceName.count()
        ? await firstSourceName.evaluate((element) => {
            const style = getComputedStyle(element);
            return style.overflow === "hidden" && style.textOverflow === "ellipsis" && style.whiteSpace === "nowrap";
          })
        : null;
      const countBeforeSourceFilter = await timelineCards.count();
      const sourceRowCount = await sourceRows.count();
      const sourceSecondaryLabels = await page.locator(".source-filter-row small").count();
      return {
        cards: countBeforeSourceFilter,
        expandText: await firstExpand.count() ? await firstExpand.textContent() : null,
        collapsedMedia: await page.locator(".timeline-card:not(.is-expanded) .feed-media-grid").count(),
        cardHeaderTopicPills: await page.locator(".timeline-card-head .topic-chip").count(),
        sourceRows: sourceRowCount,
        sourceSecondaryLabels,
        sourceNameEllipsis,
        countBeforeSourceFilter,
        activeSourceRows: await page.locator(".source-filter-row.active").count()
      };
    })
  );

  results.push(
    await capture("03-local-feed-expanded-share.png", `${localUrl}/`, desktop, async (page) => {
      const expandableCard = page.locator(".timeline-card").filter({ has: page.locator(".timeline-expand-button") }).first();
      if (await expandableCard.count()) {
        const expandButton = expandableCard.locator(".timeline-expand-button");
        await expandButton.click();
        const shareButton = expandableCard.locator(".feed-action-button");
        let focusContained = false;
        let escapeClosed = false;
        let focusRestored = false;
        if (await shareButton.count()) {
          await shareButton.click();
        }
        const shareDialog = page.locator(".share-dialog");
        if (await shareDialog.count()) {
          await shareDialog.waitFor({ state: "visible", timeout: 5000 });
          focusContained = true;
          for (let index = 0; index < 10; index += 1) {
            await page.keyboard.press("Tab");
            focusContained = focusContained && await page.evaluate(() => Boolean(document.activeElement?.closest(".share-dialog")));
          }
          await page.keyboard.press("Escape");
          await shareDialog.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
          escapeClosed = await shareDialog.count() === 0;
          focusRestored = await shareButton.evaluate((button) => document.activeElement === button);
          await shareButton.click();
          await shareDialog.waitFor({ state: "visible", timeout: 5000 });
        }
        return {
          dialogText: await shareDialog.count() ? await shareDialog.innerText() : null,
          expanded: await page.locator(".timeline-card.is-expanded").count(),
          expandState: await expandButton.getAttribute("aria-expanded"),
          escapeClosed,
          focusContained,
          focusRestored
        };
      }
      return {
        dialogText: null,
        expanded: 0,
        expandState: null,
        escapeClosed: false,
        focusContained: false,
        focusRestored: false
      };
    })
  );

  results.push(
    await capture("04-reference-daily-desktop.png", referenceUrl, desktop, async (page) => {
      const dailyTab = page.getByText("日报").first();
      if (await dailyTab.count()) {
        await dailyTab.click();
        await page.waitForTimeout(1200);
      }
      return {
        reportButtons: await page.locator(".daily-report-button").count().catch(() => null),
        text: (await page.locator("body").innerText()).slice(0, 500)
      };
    })
  );

  results.push(
    await capture("05-local-daily-desktop.png", `${localUrl}/`, desktop, async (page) => {
      const dailyTab = page.getByText("日报").first();
      if (await dailyTab.count()) {
        await dailyTab.click();
        await page.waitForTimeout(800);
      }
      const reportButtons = page.locator(".daily-report-button");
      const reportButtonCount = await reportButtons.count();
      const heading = page.locator(".daily-article h1").first();
      const before = await heading.count() ? await heading.textContent() : null;
      if (reportButtonCount > 1) {
        await reportButtons.nth(1).click();
        await page.waitForTimeout(300);
      }
      const after = await heading.count() ? await heading.textContent() : null;
      const sourceReference = page.locator(".daily-source-ref").first();
      let popoverVisible = null;
      let popoverLinks = 0;
      if (await sourceReference.count()) {
        await sourceReference.focus();
        const popover = sourceReference.locator(".daily-source-popover");
        if (await popover.count()) {
          popoverVisible = await popover.evaluate((element) => {
            const style = getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden" && style.opacity === "1";
          });
          await popover.locator("a").first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
          popoverLinks = await popover.locator("a").count();
        }
      }
      const mainline = page.locator(".daily-mainline-panel p").first();
      const storyTitle = page.locator(".daily-story h3").first();
      const storyBody = page.locator(".daily-story p").first();
      const dateText = page.locator(".date-picker strong").first();
      const dateInput = page.locator('.date-picker input[type="date"]');
      await dateInput.fill(historicalDate);
      await page.waitForTimeout(500);
      return {
        reportButtons: reportButtonCount,
        sectionBlocks: await page.locator(".daily-section-block").count(),
        dateText: await dateText.count() ? await dateText.textContent() : null,
        switched: reportButtonCount > 1 && before !== after,
        before,
        after,
        mainlineFontSize: await mainline.count() ? await readFontSize(mainline) : null,
        storyTitleFontSize: await storyTitle.count() ? await readFontSize(storyTitle) : null,
        storyBodyFontSize: await storyBody.count() ? await readFontSize(storyBody) : null,
        popoverVisible,
        popoverLinks,
        historicalDateValue: await dateInput.inputValue(),
        historicalReportButtons: await page.locator(".daily-report-button").count(),
        historicalArticle: await page.locator(".daily-article h1").count()
      };
    })
  );

  results.push(
    await capture("06-reference-feed-mobile.png", referenceUrl, mobile, async (page) => ({
      text: (await page.locator("body").innerText()).slice(0, 500)
    }))
  );

  results.push(
    await capture("07-local-feed-mobile.png", `${localUrl}/`, mobile, async (page) => {
      const nav = page.locator(".primary-tabs").first();
      const firstFooter = page.locator(".timeline-card-footer").first();
      return {
        collapsedMedia: await page.locator(".timeline-card:not(.is-expanded) .feed-media-grid").count(),
        filterButtons: await page.locator(".mobile-filter-toggle").count(),
        expandTargetSizes: await page.locator(".timeline-expand-button").evaluateAll((elements) => elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { height: rect.height, width: rect.width };
        })),
        visibleRefreshButtons: await page.locator(".source-refresh-button:visible").count(),
        navOverlapsFirstFooter: await nav.count() && await firstFooter.count()
          ? await elementsOverlap(nav, firstFooter)
          : null
      };
    })
  );

  results.push(
    await capture("08-local-feed-mobile-drawer.png", `${localUrl}/`, mobile, async (page) => {
      const filterToggle = page.locator(".mobile-filter-toggle").first();
      if (await filterToggle.count()) {
        await filterToggle.click();
      }
      const drawer = page.locator(".filter-drawer");
      if (await drawer.count()) {
        await drawer.waitFor({ state: "visible", timeout: 5000 });
      }
      const filterSheet = page.locator(".filter-sheet");
      if (await filterSheet.count()) {
        await filterSheet.evaluate((el) => {
          el.scrollTop = 500;
        });
      }
      const firstSourceName = page.locator(".filter-drawer .source-row-name").first();
      const sourceNameEllipsis = await firstSourceName.count()
        ? await firstSourceName.evaluate((element) => {
            const style = getComputedStyle(element);
            return style.overflow === "hidden" && style.textOverflow === "ellipsis" && style.whiteSpace === "nowrap";
          })
        : null;
      return {
        drawer: await drawer.count(),
        sourceRows: await page.locator(".filter-drawer .source-filter-row").count(),
        sourceNameEllipsis,
        targetSizes: await page.locator(
          ".filter-drawer .filter-chip, .filter-drawer .source-filter-row, .filter-drawer .topic-list-footer, .filter-drawer .source-list-footer"
        ).evaluateAll((elements) => elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { className: element.className, height: rect.height, width: rect.width };
        }))
      };
    })
  );

  results.push(
    await capture("09-local-daily-mobile.png", `${localUrl}/`, mobile, async (page) => {
      const dailyTab = page.getByText("日报").first();
      if (await dailyTab.count()) {
        await dailyTab.click();
        await page.waitForTimeout(800);
      }
      const dateText = page.locator(".date-picker strong").first();
      return {
        reportButtons: await page.locator(".daily-report-button").count(),
        dateText: await dateText.count() ? await dateText.textContent() : null
      };
    })
  );

  if (shareId) {
    results.push(
      await capture("10-local-share-page.png", `${localUrl}/share/${encodeURIComponent(shareId)}`, desktop, async (page) => {
        const heading = page.locator("h1").first();
        return {
          h1: await heading.count() ? await heading.textContent() : null
        };
      })
    );
  }

  results.push(
    await capture("11-local-feed-source-filtered.png", `${localUrl}/`, desktop, async (page) => {
      const cards = page.locator(".timeline-card:visible");
      const sourceRow = page.locator(".source-filter-row").first();
      const before = await cards.count();
      const sourceName = (await sourceRow.getAttribute("data-source-name"))?.trim() || "";
      const sourceHostname = normalizeHostname(await sourceRow.getAttribute("data-source-hostname"));
      await sourceRow.click();
      await page.waitForTimeout(400);
      const after = await cards.count();
      const matches = after > 0 && Boolean(sourceName) && await cards.evaluateAll((elements, expected) => elements.every((card) => {
        if (card.querySelector(".source-name")?.textContent?.trim() !== expected.sourceName) return false;
        if (!expected.sourceHostname) return true;
        const link = card.querySelector(".timeline-card-context a[href]");
        try {
          return new URL(link?.href || "").hostname.toLowerCase().replace(/^www\./, "") === expected.sourceHostname;
        } catch {
          return false;
        }
      }), { sourceName, sourceHostname });
      return { active: await page.locator(".source-filter-row.active").count(), after, before, matches };
    })
  );

  results.push(
    await capture("12-local-feed-filter-states.png", `${localUrl}/`, desktop, async (page) => {
      const cards = page.locator(".timeline-card:visible");
      const baseline = await cards.count();
      const topicRow = page.locator(".topic-row").nth(1);
      const topicTitle = (await topicRow.locator(".topic-title").textContent())?.trim() || "";
      await topicRow.focus();
      await page.waitForTimeout(180);
      const tooltipVisible = await topicRow.evaluate((row) =>
        document.activeElement === row
          && Number.parseFloat(getComputedStyle(row.querySelector(".topic-source-info"), "::after").opacity) >= 0.9
      );
      await topicRow.click();
      await page.waitForTimeout(350);
      const topicCount = await cards.count();
      const topicMatches = topicCount > 0 && await page.locator(".timeline-card-context .topic-chip").evaluateAll(
        (elements, expected) => elements.every((element) => element.textContent?.trim() === expected),
        topicTitle
      );
      await page.getByTitle("重置筛选").click();

      const firstCard = cards.first();
      const title = (await firstCard.locator("h3").textContent())?.trim() || "";
      const keyword = title.slice(0, Math.min(6, title.length));
      const search = page.locator('.search-box input[type="search"]');
      await search.fill(keyword);
      await page.waitForTimeout(150);
      const keywordCount = await cards.count();
      const keywordMatches = keywordCount > 0 && await cards.evaluateAll((elements, expected) => elements.every((card) =>
        (card.textContent || "").toLowerCase().includes(expected.toLowerCase())
      ), keyword);
      await search.focus();
      const lightFocusRing = await page.locator(".search-box").evaluate((element) => getComputedStyle(element).boxShadow !== "none");
      await page.getByTitle("重置筛选").click();

      await topicRow.focus();
      let reachedSearchByTab = false;
      for (let index = 0; index < 20; index += 1) {
        await page.keyboard.press("Tab");
        if (await search.evaluate((element) => document.activeElement === element)) {
          reachedSearchByTab = true;
          break;
        }
      }

      await page.getByRole("button", { name: "80+" }).click();
      await page.waitForTimeout(350);
      const scoreCount = await cards.count();
      const scoresValid = scoreCount > 0 && await page.locator(".score-pill").evaluateAll((elements) =>
        elements.every((element) => Number(element.textContent?.match(/\d+/)?.[0]) >= 80)
      );

      const hrefsValid = await page.locator(".feed-title-link[href], .timeline-card-context a[href]").evaluateAll((links) => links.every((link) => {
        try {
          const url = new URL(link.getAttribute("href") || "", document.baseURI);
          return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
        } catch {
          return false;
        }
      }));
      return { baseline, hrefsValid, keywordCount, keywordMatches, lightFocusRing, reachedSearchByTab, scoreCount, scoresValid, topicCount, topicMatches, tooltipVisible };
    })
  );

  results.push(
    await capture("13-local-feed-dark.png", `${localUrl}/`, desktop, async (page) => {
      const toggle = page.locator(".theme-toggle");
      for (let index = 0; index < 3 && await page.locator('html[data-theme="dark"]').count() === 0; index += 1) {
        await toggle.click();
      }
      const search = page.locator('.search-box input[type="search"]');
      await search.focus();
      return {
        dark: await page.locator('html[data-theme="dark"]').count() === 1,
        focusRing: await page.locator(".search-box").evaluate((element) => getComputedStyle(element).boxShadow !== "none"),
        cards: await page.locator(".timeline-card").count()
      };
    })
  );

  results.push(
    await capture("14-local-refresh-error.png", `${localUrl}/`, desktop, async (page) => {
      const refresh = page.locator(".source-refresh-button");
      await refresh.click();
      await page.locator(".app-toast").waitFor({ state: "visible", timeout: 5000 });
      const successText = await page.locator(".app-toast").innerText();
      await page.locator(".app-toast").waitFor({ state: "detached", timeout: 5000 });
      await page.route("**/data/**", (route) => route.abort());
      await refresh.click();
      await page.locator(".app-toast--error").waitFor({ state: "visible", timeout: 5000 });
      return { errorText: await page.locator(".app-toast--error").innerText(), successText };
    })
  );

  await fs.writeFile(path.join(outDir, "acceptance-results.json"), JSON.stringify(results, null, 2));

  console.log(
    JSON.stringify(
      results.map((result) => ({
        name: result.name,
        meta: result.meta,
        scrollWidth: result.metrics.scrollWidth,
        innerWidth: result.metrics.innerWidth,
        wideCount: result.metrics.wide.length
      })),
      null,
      2
    )
  );

  assertAcceptance(results);
} finally {
  await browser.close();
}

function assertAcceptance(captures) {
  const byName = new Map(captures.map((result) => [result.name, result]));
  const desktopFeed = byName.get("02-local-feed-desktop.png");
  const expandedFeed = byName.get("03-local-feed-expanded-share.png");
  const daily = byName.get("05-local-daily-desktop.png");
  const mobileFeed = byName.get("07-local-feed-mobile.png");
  const drawer = byName.get("08-local-feed-mobile-drawer.png");
  const mobileDaily = byName.get("09-local-daily-mobile.png");
  const sourceFiltered = byName.get("11-local-feed-source-filtered.png");
  const filterStates = byName.get("12-local-feed-filter-states.png");
  const darkFeed = byName.get("13-local-feed-dark.png");
  const refreshStates = byName.get("14-local-refresh-error.png");
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
  expect(desktopFeed?.meta.activeSourceRows === 0, "desktop feed baseline is unexpectedly source-filtered");
  expect(desktopFeed?.meta.countBeforeSourceFilter > 0, "desktop feed: source filtering started with no cards");
  expect(sourceFiltered?.meta.active === 1, "source filtering did not activate exactly one source row");
  expect(sourceFiltered?.meta.after > 0, "source filtering returned no cards");
  expect(sourceFiltered?.meta.after <= sourceFiltered?.meta.before, "source filtering increased the card count");
  expect(sourceFiltered?.meta.matches === true, "filtered cards do not match the selected source");
  expect(expandedFeed?.meta.expanded === 1, "feed expansion did not open exactly one card");
  expect(expandedFeed?.meta.expandState === "true", "feed expansion did not update aria-expanded");
  expect(expandedFeed?.meta.dialogText?.includes("分享"), "share dialog did not open");
  expect(expandedFeed?.meta.escapeClosed === true, "share dialog did not close on Escape");
  expect(expandedFeed?.meta.focusContained === true, "share dialog did not contain keyboard focus");
  expect(expandedFeed?.meta.focusRestored === true, "share dialog did not restore focus to its trigger");
  expect(daily?.meta.switched === true, "daily report switching failed");
  expect(daily?.meta.mainlineFontSize >= 15, "daily mainline text is below 15px");
  expect(daily?.meta.storyTitleFontSize >= 15, "daily story title is below 15px");
  expect(daily?.meta.storyBodyFontSize >= 15, "daily story body is below 15px");
  expect(daily?.meta.popoverVisible === true, "daily source popover is not keyboard accessible");
  expect(daily?.meta.popoverLinks > 0, "daily source popover has no links");
  expect(daily?.meta.historicalDateValue === historicalDate, "daily historical date did not update");
  expect(daily?.meta.historicalReportButtons > 0, "daily historical date has no reports");
  expect(daily?.meta.historicalArticle === 1, "daily historical report did not render");
  expect(mobileFeed?.meta.collapsedMedia === 0, "mobile feed: collapsed media is visible");
  expect(mobileFeed?.meta.filterButtons === 1, "mobile feed: expected one filter entry");
  expect(mobileFeed?.meta.visibleRefreshButtons === 0, "mobile feed: desktop refresh action remains visible");
  expect(mobileFeed?.meta.navOverlapsFirstFooter === false, "mobile feed: fixed navigation overlaps the first card footer");
  expect(mobileFeed?.meta.expandTargetSizes?.length > 0, "mobile feed: no expand targets to measure");
  expect(mobileFeed?.meta.expandTargetSizes?.every((size) => size.width >= 40 && size.height >= 40), "mobile feed: expand target is below 40x40px");
  expect(drawer?.meta.drawer === 1, "mobile filter drawer did not open");
  expect(drawer?.meta.sourceRows > 0, "mobile filter drawer has no source rows");
  expect(drawer?.meta.sourceNameEllipsis === true, "mobile filter drawer: source names do not use ellipsis styling");
  expect(drawer?.meta.targetSizes?.length > 0, "mobile filter drawer: no targets to measure");
  expect(drawer?.meta.targetSizes?.every((size) => size.width >= 40 && size.height >= 40), "mobile filter drawer: target is below 40x40px");
  expect(mobileDaily?.meta.reportButtons > 0, "mobile daily has no report controls");
  expect(filterStates?.meta.baseline > 0, "filter coverage started with no cards");
  expect(filterStates?.meta.topicCount > 0 && filterStates?.meta.topicMatches === true, "topic filtering failed");
  expect(filterStates?.meta.keywordCount > 0 && filterStates?.meta.keywordMatches === true, "keyword filtering failed");
  expect(filterStates?.meta.scoreCount > 0 && filterStates?.meta.scoresValid === true, "minimum score filtering failed");
  expect(filterStates?.meta.tooltipVisible === true, "topic help tooltip is not visible from keyboard focus");
  expect(filterStates?.meta.lightFocusRing === true, "search focus ring is not visible in light mode");
  expect(filterStates?.meta.reachedSearchByTab === true, "keyboard traversal did not reach search from topic controls");
  expect(filterStates?.meta.hrefsValid === true, "feed contains an invalid source href");
  expect(darkFeed?.meta.dark === true && darkFeed?.meta.cards > 0, "dark mode smoke test failed");
  expect(darkFeed?.meta.focusRing === true, "search focus ring is not visible in dark mode");
  expect(refreshStates?.meta.successText?.includes("已重新读取"), "refresh success state was not observed");
  expect(refreshStates?.meta.errorText?.includes("刷新失败"), "refresh error state was not observed");

  if (failures.length > 0) {
    throw new Error(`Acceptance failed:\n- ${failures.join("\n- ")}`);
  }
}

async function resolveShareId(baseUrl) {
  try {
    const response = await fetch(new URL("/data/feed.json", baseUrl));
    if (response.ok) {
      const data = await response.json();
      const item = data.items?.find((entry) => entry.id);
      if (item?.id) return item.id;
    }
  } catch {
    // Fall back to the local build snapshot below.
  }

  try {
    const data = JSON.parse(await fs.readFile(path.resolve("public/data/feed.json"), "utf8"));
    const item = data.items?.find((entry) => entry.id);
    return item?.id ?? "";
  } catch {
    return "";
  }
}
