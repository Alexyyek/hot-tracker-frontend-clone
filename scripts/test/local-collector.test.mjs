import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const collectorPath = new URL("../collect-static-data.mjs", import.meta.url);

test("static collector does not depend on hot.kyangc.net upstream APIs", async () => {
  const source = await readFile(collectorPath, "utf8");
  const forbidden = [/hot\.kyangc\.net/, /hot\.kyangc\.net\/api\/(?:topics|feed|daily)/];

  for (const token of forbidden) {
    assert.equal(
      token.test(source),
      false,
      `collector still references upstream dependency: ${token}`
    );
  }
});

test("static collector emits local-source metadata instead of upstream sourceBaseUrl", async () => {
  const source = await readFile(collectorPath, "utf8");

  assert.match(source, /collectorName\s*=\s*"local-source-collector"/);
  assert.doesNotMatch(source, /sourceBaseUrl/);
});

test("webpage collector does not publish generic link-placeholder summaries", async () => {
  const source = await readFile(collectorPath, "utf8");
  const feed = JSON.parse(await readFile(new URL("../../public/data/feed.json", import.meta.url), "utf8"));
  const genericSummaryPattern = /官网页面发现的相关链接|详情页暂/;

  assert.doesNotMatch(source, genericSummaryPattern);
  assert.equal(
    feed.items.filter((item) => genericSummaryPattern.test([item.summary, item.whyItMatters].join("\n"))).length,
    0
  );
});

test("source icons are stable per source", async () => {
  const feed = JSON.parse(await readFile(new URL("../../public/data/feed.json", import.meta.url), "utf8"));
  const bySource = new Map();

  for (const item of feed.items) {
    const iconKey = item.sourceAvatarUrl || item.sourceIconHostname || item.sourceKind;
    const keys = bySource.get(item.sourceName) ?? new Set();
    keys.add(iconKey);
    bySource.set(item.sourceName, keys);
  }

  const inconsistent = [...bySource.entries()].filter(([, keys]) => keys.size > 1);
  assert.deepEqual(inconsistent, []);
});

test("static feed excludes weak generic AI-adjacent items", async () => {
  const feed = JSON.parse(await readFile(new URL("../../public/data/feed.json", import.meta.url), "utf8"));
  const weakPattern = /QCon_全球软件开发大会_InfoQ技术大会|AICon_全球人工智能开发与应用大会_InfoQ技术大会|InfoQ大会频道_专家分享|模力工场 - 每天发现好用的 AI 应用|好用的 AI 应用榜单|有奖共建|热门活动|主题征文|被 AI 坑惨|发布了「.{0,120}」相关内容，重点可按/;
  assert.equal(
    feed.items.filter((item) => weakPattern.test([item.title, item.summary].join("\n"))).length,
    0
  );
});

test("all WeChat sources have at least one strict relevant item", async () => {
  const sources = JSON.parse(await readFile(new URL("../../public/data/sources.json", import.meta.url), "utf8"));
  const emptyWeixinSources = sources.items
    .filter((source) => source.sourceKind === "weixin_article" && source.count <= 0)
    .map((source) => source.sourceName);

  assert.deepEqual(emptyWeixinSources, []);
});

test("WeChat collector emits health rows for every WeChat source", async () => {
  const sources = JSON.parse(await readFile(new URL("../../public/data/sources.json", import.meta.url), "utf8"));
  const health = JSON.parse(await readFile(new URL("../../public/data/weixin-health.json", import.meta.url), "utf8"));
  const weixinSources = sources.items
    .filter((source) => source.sourceKind === "weixin_article")
    .map((source) => source.sourceName)
    .sort();
  const healthSources = health.items.map((row) => row.sourceName).sort();

  assert.deepEqual(healthSources, weixinSources);
  for (const row of health.items) {
    assert.match(row.status, /^(fresh|partial|cache_only|seed_only|empty)$/);
    assert.equal(typeof row.latestPublishedAt, "string");
    assert.equal(Array.isArray(row.channels), true);
    assert.equal(typeof row.counts.sogou, "number");
    assert.equal(typeof row.counts.search, "number");
    assert.equal(typeof row.counts.feed, "number");
    assert.equal(typeof row.counts.cache, "number");
    assert.equal(typeof row.counts.seed, "number");
  }
});

test("collector emits health rows for every configured source", async () => {
  const sources = JSON.parse(await readFile(new URL("../../public/data/sources.json", import.meta.url), "utf8"));
  const health = JSON.parse(await readFile(new URL("../../public/data/source-health.json", import.meta.url), "utf8"));
  const sourceNames = sources.items.map((source) => source.sourceName).sort();
  const healthNames = health.items.map((row) => row.sourceName).sort();

  assert.deepEqual(healthNames, sourceNames);
  for (const row of health.items) {
    assert.match(row.status, /^(fresh|partial|cache_only|seed_only|stale|empty)$/);
    assert.equal(row.status === "empty" && row.itemCount > 0, false, `${row.sourceName} has items but is marked empty`);
    assert.equal(typeof row.sourceKind, "string");
    assert.equal(typeof row.itemCount, "number");
    assert.equal(typeof row.freshCount, "number");
    assert.equal(typeof row.cacheCount, "number");
    assert.equal(typeof row.seedCount, "number");
    assert.equal(typeof row.latestAgeHours, "number");
    assert.equal(Array.isArray(row.channels), true);
    assert.equal(typeof row.recommendedAction, "string");
  }
});

test("daily reports exclude manual WeChat seeds and stale cache fallbacks", async () => {
  const feed = JSON.parse(await readFile(new URL("../../public/data/feed.json", import.meta.url), "utf8"));
  const daily = JSON.parse(await readFile(new URL("../../public/data/daily/latest.json", import.meta.url), "utf8"));
  const byId = new Map(feed.items.map((item) => [item.id, item]));
  const referencedItems = daily.items
    .flatMap((report) => report.referencedFeedItemIds)
    .map((id) => byId.get(id))
    .filter(Boolean);
  const now = Date.now();
  const disallowed = referencedItems.filter((item) => {
    if (item.raw?.parser === "manual_weixin_seed") return true;
    if (!item.raw?.reusedFromLocalCache) return false;
    const timestamp = Date.parse(item.publishedAt || item.observedAt || "");
    return Number.isFinite(timestamp) && now - timestamp > 14 * 24 * 60 * 60 * 1000;
  });

  assert.deepEqual(disallowed.map((item) => item.title), []);
});
