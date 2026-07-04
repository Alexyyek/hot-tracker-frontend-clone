import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const outDir = path.resolve("docs/audits/hot-tracker-final-acceptance-2026-07-01");
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
  await page.close();
  return { name, url, viewport, meta, metrics };
}

const results = [];
const shareId = await resolveShareId(localUrl);

results.push(
  await capture("01-reference-feed-desktop.png", referenceUrl, desktop, async (page) => ({
    tabs: await page.locator(".tab-button").allTextContents().catch(() => [])
  }))
);

results.push(
  await capture("02-local-feed-desktop.png", `${localUrl}/`, desktop, async (page) => {
    const firstExpand = page.locator(".timeline-expand-button").first();
    const hasExpand = await firstExpand.count();
    return {
      cards: await page.locator(".timeline-card").count(),
      expandText: hasExpand ? await firstExpand.textContent() : null,
      sourceRows: await page.locator(".source-filter-row").count()
    };
  })
);

results.push(
  await capture("03-local-feed-expanded-share.png", `${localUrl}/`, desktop, async (page) => {
    await page.locator(".timeline-expand-button").first().click();
    await page.locator(".feed-action-button").first().click();
    await page.waitForSelector(".share-dialog", { timeout: 5000 });
    return {
      dialogText: await page.locator(".share-dialog").innerText(),
      expanded: await page.locator(".timeline-card.is-expanded").count()
    };
  })
);

results.push(
  await capture("04-reference-daily-desktop.png", referenceUrl, desktop, async (page) => {
    await page.getByText("日报").first().click();
    await page.waitForTimeout(1200);
    return {
      reportButtons: await page.locator(".daily-report-button").count().catch(() => null),
      text: (await page.locator("body").innerText()).slice(0, 500)
    };
  })
);

results.push(
  await capture("05-local-daily-desktop.png", `${localUrl}/`, desktop, async (page) => {
    await page.getByText("日报").first().click();
    await page.waitForTimeout(800);
    const before = await page.locator(".daily-article h1").textContent();
    await page.locator(".daily-report-button").nth(1).click();
    await page.waitForTimeout(300);
    const after = await page.locator(".daily-article h1").textContent();
    return {
      reportButtons: await page.locator(".daily-report-button").count(),
      sectionBlocks: await page.locator(".daily-section-block").count(),
      dateText: await page.locator(".date-picker strong").textContent(),
      switched: before !== after,
      before,
      after
    };
  })
);

results.push(
  await capture("06-reference-feed-mobile.png", referenceUrl, mobile, async (page) => ({
    text: (await page.locator("body").innerText()).slice(0, 500)
  }))
);

results.push(
  await capture("07-local-feed-mobile-drawer.png", `${localUrl}/`, mobile, async (page) => {
    await page.locator(".mobile-filter-toggle").click();
    await page.waitForSelector(".filter-drawer", { timeout: 5000 });
    await page.locator(".filter-sheet").evaluate((el) => {
      el.scrollTop = 500;
    });
    return {
      drawer: await page.locator(".filter-drawer").count(),
      sourceRows: await page.locator(".filter-drawer .source-filter-row").count()
    };
  })
);

results.push(
  await capture("08-local-daily-mobile.png", `${localUrl}/`, mobile, async (page) => {
    await page.getByText("日报").first().click();
    await page.waitForTimeout(800);
    return {
      reportButtons: await page.locator(".daily-report-button").count(),
      dateText: await page.locator(".date-picker strong").textContent()
    };
  })
);

if (shareId) {
  results.push(
    await capture("09-local-share-page.png", `${localUrl}/share/${encodeURIComponent(shareId)}`, desktop, async (page) => ({
      h1: await page.locator("h1").first().textContent()
    }))
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

await browser.close();

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
