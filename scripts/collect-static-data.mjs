import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceBaseUrl = process.env.HOT_TRACKER_API_BASE ?? "https://hot.kyangc.net";
const outputRoot = process.env.STATIC_DATA_DIR ?? "public/data";
const feedLimit = Number(process.env.FEED_LIMIT ?? 300);
const dailyHistoryDays = Number(process.env.DAILY_HISTORY_DAYS ?? 14);
const sourceSampleLimit = Number(process.env.SOURCE_SAMPLE_LIMIT ?? 2);
const sourceSampleConcurrency = Number(process.env.SOURCE_SAMPLE_CONCURRENCY ?? 6);

async function readAiSourceCatalog() {
  const source = await readFile("src/aiTopics.ts", "utf8");
  const catalogMatch = source.match(/export const aiTopicSourceCatalog = \{([\s\S]*?)\n\} as const/s);
  if (!catalogMatch) throw new Error("Unable to locate aiTopicSourceCatalog in src/aiTopics.ts");
  const sourceNames = new Set();
  for (const match of catalogMatch[1].matchAll(/"([^"]+)"/g)) {
    const value = match[1];
    if (!value.startsWith("ai-")) sourceNames.add(value);
  }
  sourceNames.delete("GitHub AI 热榜");
  return sourceNames;
}

async function fetchJson(endpoint) {
  const url = new URL(endpoint, sourceBaseUrl);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AI-Hot-Tracker-GitHub-Actions/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url.toString()}`);
  }

  return response.json();
}

async function writeJson(relativePath, data) {
  const filePath = path.join(outputRoot, relativePath);
  const tempPath = `${filePath}.tmp`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

function withMeta(data) {
  return {
    ...data,
    generatedAt: new Date().toISOString(),
    sourceBaseUrl
  };
}

function dateInput(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function collectRequired(name, endpoint, outputPath) {
  const data = await fetchJson(endpoint);
  await writeJson(outputPath, withMeta(data));
  const count = Array.isArray(data.items) ? data.items.length : 0;
  console.log(`${name}: ${count} items -> ${outputPath}`);
  return data;
}

async function collectOptional(name, endpoint, outputPath) {
  try {
    return await collectRequired(name, endpoint, outputPath);
  } catch (error) {
    console.warn(`${name}: skipped (${error instanceof Error ? error.message : String(error)})`);
    return { items: [] };
  }
}

function sourceQuery(facet) {
  const params = new URLSearchParams({
    limit: String(sourceSampleLimit),
    raw: "full",
    total: "none",
    sourceKind: facet.sourceKind
  });

  if (facet.sourceHostname) {
    params.set("sourceHostname", facet.sourceHostname);
  } else {
    params.set("sourceName", facet.sourceName);
  }

  return `/api/feed?${params.toString()}`;
}

function mergeFeedItems(...groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const item of group.items ?? []) {
      byId.set(item.id, { ...byId.get(item.id), ...item });
    }
  }

  return [...byId.values()].sort((a, b) => {
    const bTime = b.publishedAt ?? b.observedAt ?? "";
    const aTime = a.publishedAt ?? a.observedAt ?? "";
    return bTime.localeCompare(aTime);
  });
}

function filterCatalogFeedItems(items, catalogSourceNames, catalogHostnames) {
  return (items ?? []).filter((item) => {
    if (item.sourceKind === "github" || item.sourceName?.toLowerCase().includes("github")) return false;
    return catalogSourceNames.has(item.sourceName) || Boolean(item.sourceHostname && catalogHostnames.has(item.sourceHostname));
  });
}

async function collectSourceSamples(sources) {
  const collected = [];
  let checked = 0;

  async function worker(offset) {
    for (let index = offset; index < sources.length; index += sourceSampleConcurrency) {
      const source = sources[index];
      try {
        const data = await fetchJson(sourceQuery(source));
        collected.push(
          ...(data.items ?? []).map((item) => ({
            ...item,
            raw: {
              ...(item.raw ?? {}),
              sampledSourceName: source.sourceName,
              originalSourceName: item.sourceName
            },
            sourceName: source.sourceName,
            sourceHostname: source.sourceHostname ?? item.sourceHostname,
            sourceIconHostname: source.sourceIconHostname ?? item.sourceIconHostname,
            sourceAvatarUrl: source.sourceAvatarUrl ?? item.sourceAvatarUrl
          }))
        );
      } catch (error) {
        console.warn(`source skipped: ${source.sourceName} (${error instanceof Error ? error.message : String(error)})`);
      } finally {
        checked += 1;
        if (checked % 25 === 0 || checked === sources.length) {
          console.log(`source samples: ${checked}/${sources.length}`);
        }
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(sourceSampleConcurrency, Math.max(1, sources.length)) },
      (_, index) => worker(index)
    )
  );

  return { items: collected };
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const catalogSourceNames = await readAiSourceCatalog();

  await collectRequired("topics", "/api/topics", "topics.json");
  const feed = await fetchJson(`/api/feed?limit=${feedLimit}&raw=full&total=count`);
  const sources = await collectRequired("sources", "/api/feed/sources", "sources.json");
  const catalogSources = (sources.items ?? []).filter((source) => catalogSourceNames.has(source.sourceName));
  const catalogHostnames = new Set(catalogSources.map((source) => source.sourceHostname).filter(Boolean));
  const sourceSamples = await collectSourceSamples(catalogSources);
  const mergedFeedItems = mergeFeedItems(
    { items: filterCatalogFeedItems(feed.items, catalogSourceNames, catalogHostnames) },
    sourceSamples
  );
  await writeJson("feed.json", withMeta({ ...feed, items: mergedFeedItems, total: mergedFeedItems.length }));
  console.log(`feed: ${mergedFeedItems.length} merged items -> feed.json`);
  await collectRequired("topic-counts", "/api/feed/topic-counts", "topic-counts.json");

  const latest = await collectOptional("daily-latest", "/api/daily/latest?raw=compact&topItems=none", "daily/latest.json");
  const dates = new Set((latest.items ?? []).map((report) => report.reportDate).filter(Boolean));
  for (let index = 0; index < dailyHistoryDays; index += 1) {
    dates.add(dateInput(index));
  }

  for (const date of dates) {
    await collectOptional(`daily-${date}`, `/api/daily?date=${date}&raw=compact&topItems=none`, `daily/${date}.json`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
