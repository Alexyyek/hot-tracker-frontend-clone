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
  const page = await browser.newPage({ viewport });
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
    await page.close();
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
      let clickedSourceName = "";
      let clickedSourceHostname = "";
      if (sourceRowCount > 0) {
        clickedSourceName = (await firstSourceRow.getAttribute("data-source-name"))?.trim() || "";
        clickedSourceHostname = normalizeHostname(await firstSourceRow.getAttribute("data-source-hostname"));
        await firstSourceRow.click();
        await page.waitForTimeout(400);
      }
      const countAfterSourceFilter = await timelineCards.count();
      const filteredCardsMatchSource = countAfterSourceFilter > 0 && Boolean(clickedSourceName)
        ? await timelineCards.evaluateAll((cards, expected) => cards.every((card) => {
            const cardSourceName = card.querySelector(".source-name")?.textContent?.trim() || "";
            if (cardSourceName !== expected.sourceName) return false;
            if (!expected.sourceHostname) return true;

            const sourceLink = card.querySelector(".timeline-card-context a[href]");
            if (!sourceLink) return false;
            try {
              const hostname = new URL(sourceLink.href).hostname.toLowerCase().replace(/^www\./, "");
              return hostname === expected.sourceHostname;
            } catch {
              return false;
            }
          }), { sourceName: clickedSourceName, sourceHostname: clickedSourceHostname })
        : false;
      return {
        cards: countBeforeSourceFilter,
        expandText: await firstExpand.count() ? await firstExpand.textContent() : null,
        collapsedMedia: await page.locator(".timeline-card:not(.is-expanded) .feed-media-grid").count(),
        cardHeaderTopicPills: await page.locator(".timeline-card-head .topic-chip").count(),
        sourceRows: sourceRowCount,
        sourceSecondaryLabels,
        sourceNameEllipsis,
        countBeforeSourceFilter,
        countAfterSourceFilter,
        activeSourceRows: await page.locator(".source-filter-row.active").count(),
        filteredCardsMatchSource
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
        if (await shareButton.count()) {
          await shareButton.click();
        }
        const shareDialog = page.locator(".share-dialog");
        if (await shareDialog.count()) {
          await shareDialog.waitFor({ state: "visible", timeout: 5000 });
        }
        return {
          dialogText: await shareDialog.count() ? await shareDialog.innerText() : null,
          expanded: await page.locator(".timeline-card.is-expanded").count(),
          expandState: await expandButton.getAttribute("aria-expanded")
        };
      }
      return {
        dialogText: null,
        expanded: 0,
        expandState: null
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
        popoverLinks
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
        sourceNameEllipsis
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
  expect(desktopFeed?.meta.activeSourceRows === 1, "desktop feed: source filtering did not activate exactly one source row");
  expect(desktopFeed?.meta.countBeforeSourceFilter > 0, "desktop feed: source filtering started with no cards");
  expect(desktopFeed?.meta.countAfterSourceFilter > 0, "desktop feed: source filtering returned no cards");
  expect(
    desktopFeed?.meta.countAfterSourceFilter <= desktopFeed?.meta.countBeforeSourceFilter,
    "desktop feed: source filtering increased the card count"
  );
  expect(desktopFeed?.meta.filteredCardsMatchSource === true, "desktop feed: filtered cards do not match the selected source");
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
  expect(drawer?.meta.sourceNameEllipsis === true, "mobile filter drawer: source names do not use ellipsis styling");
  expect(mobileDaily?.meta.reportButtons > 0, "mobile daily has no report controls");

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
