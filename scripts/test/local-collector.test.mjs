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
