import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const collectorPath = new URL("../collect-static-data.mjs", import.meta.url);

test("static collector does not depend on hot.kyangc.net upstream APIs", async () => {
  const source = await readFile(collectorPath, "utf8");
  const forbidden = [
    "hot.kyangc.net",
    "/api/topics",
    "/api/feed",
    "/api/daily"
  ];

  for (const token of forbidden) {
    assert.equal(
      source.includes(token),
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
