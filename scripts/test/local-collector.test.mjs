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
