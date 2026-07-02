import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceBaseUrl = process.env.HOT_TRACKER_API_BASE ?? "https://hot.kyangc.net";
const outputRoot = process.env.STATIC_DATA_DIR ?? "public/data";
const feedLimit = Number(process.env.FEED_LIMIT ?? 300);
const dailyHistoryDays = Number(process.env.DAILY_HISTORY_DAYS ?? 14);
const sourceSampleLimit = Number(process.env.SOURCE_SAMPLE_LIMIT ?? 2);
const sourceSampleConcurrency = Number(process.env.SOURCE_SAMPLE_CONCURRENCY ?? 6);
const arxivSourceName = "arXiv：Agent Harness / Auto-Research";
const arxivSourceHostname = "arxiv.org";

async function readAiSourceCatalog() {
  const source = await readFile("src/aiTopics.ts", "utf8");
  const catalogMatch = source.match(/export const aiTopicSourceCatalog = \{([\s\S]*?)\n\} as const/s);
  if (!catalogMatch) throw new Error("Unable to locate aiTopicSourceCatalog in src/aiTopics.ts");
  const byTopic = new Map();
  const sourceNames = new Set();

  for (const match of catalogMatch[1].matchAll(/"([^"]+)": (?:\[\]|\[([\s\S]*?)\n  \])(?:,|\n|$)/g)) {
    const topicId = match[1];
    const topicSources = new Set();
    for (const sourceMatch of (match[2] ?? "").matchAll(/"([^"]+)"/g)) {
      const value = sourceMatch[1];
      if (value.startsWith("ai-") || value === "GitHub AI 热榜") continue;
      topicSources.add(value);
      sourceNames.add(value);
    }
    byTopic.set(topicId, topicSources);
  }

  sourceNames.delete("GitHub AI 热榜");
  return { byTopic, sourceNames };
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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/atom+xml,text/xml,text/plain",
      "User-Agent": "AI-Hot-Tracker-GitHub-Actions/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return response.text();
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

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstXmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1] ?? "");
}

function allXmlValues(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((match) => decodeXml(match[1]));
}

function arxivIdFromUrl(url) {
  return url.split("/").pop()?.replace(/v\d+$/i, "") ?? url;
}

function isRelevantArxivSupplement(title, summary) {
  const titleText = title.toLowerCase();
  const text = `${title} ${summary}`.toLowerCase();
  const strongTitleTerms = [
    "autonomous research",
    "self-improvement",
    "self-correcting",
    "coding agent",
    "computer-use agents",
    "agentic software engineering",
    "multi-turn agentic",
    "research agents",
    "research loop",
    "engineering the loops",
    "experience graphs",
    "scaling the horizon"
  ];
  const domainTerms = [
    "agent",
    "agentic",
    "autonomous research",
    "coding",
    "computer-use",
    "software engineering",
    "research agent"
  ];
  const mechanismTerms = [
    "harness",
    "research loop",
    "autonomous research",
    "self-improvement",
    "self-correcting",
    "failure attribution",
    "trajectory",
    "rollout",
    "long-horizon",
    "multi-turn",
    "experience graph",
    "verification",
    "evaluation",
    "workflow"
  ];
  return (
    strongTitleTerms.some((term) => titleText.includes(term)) &&
    domainTerms.some((term) => text.includes(term)) &&
    mechanismTerms.some((term) => text.includes(term))
  );
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

function countItemsBySource(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.sourceName, (counts.get(item.sourceName) ?? 0) + 1);
  }
  return counts;
}

function countItemsForTopic(items, topicSources) {
  if (!topicSources) return 0;
  return items.filter((item) => topicSources.has(item.sourceName)).length;
}

function rebuildSourceFacets(sources, items, catalogSourceNames) {
  const itemCounts = countItemsBySource(items);
  return {
    ...sources,
    items: (sources.items ?? []).map((source) => {
      if (!catalogSourceNames.has(source.sourceName)) return source;
      return {
        ...source,
        count: itemCounts.get(source.sourceName) ?? 0
      };
    })
  };
}

function buildTopicCounts(items, catalogByTopic) {
  const count = (topicId) => countItemsForTopic(items, catalogByTopic.get(topicId));
  const aiIndustryCount = count("ai-industry");
  const aiPapersCount = count("ai-papers");
  const aiApplicationsCount = count("ai-applications");
  const aiBigTechCount = count("ai-big-tech");

  return {
    items: [
      { topicId: "ai-all", count: items.length },
      { topicId: "ai", count: items.length },
      { topicId: "ai-industry", count: aiIndustryCount },
      { topicId: "ai-papers", count: aiPapersCount },
      { topicId: "ai-applications", count: aiApplicationsCount },
      { topicId: "big-tech-daily", count: aiBigTechCount }
    ]
  };
}

async function collectArxivSupplements() {
  const terms = [
    "\"agent harness\"",
    "\"research harness\"",
    "\"auto-research\"",
    "\"autonomous research\"",
    "\"trajectory rollout\"",
    "\"harness optimization\"",
    "\"self-improvement loop\"",
    "\"long-horizon agent\""
  ];
  const searchQuery = terms.map((term) => `all:${term}`).join("+OR+");
  const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=12&sortBy=submittedDate&sortOrder=descending`;

  try {
    const xml = await fetchText(url);
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => match[1]);
    const items = entries.map((entry) => {
      const idUrl = firstXmlValue(entry, "id");
      const arxivId = arxivIdFromUrl(idUrl);
      const title = firstXmlValue(entry, "title");
      const summary = firstXmlValue(entry, "summary");
      const publishedAt = firstXmlValue(entry, "published");
      const observedAt = new Date().toISOString();
      const authors = allXmlValues(entry, "name").slice(0, 6);

      return {
        id: `arxiv_agent_harness_${arxivId.replace(/[^a-z0-9.]/gi, "_")}`,
        topicId: "ai",
        sourceItemIds: [arxivId],
        documentIds: [],
        sourceKind: "website",
        title,
        summary: summary.slice(0, 900),
        importanceScore: /harness|auto-research|autonomous research|trajectory rollout|self-improvement/i.test(`${title} ${summary}`) ? 86 : 78,
        whyItMatters: "这类论文直接对应 Agent Harness、Auto-Research、长程轨迹、验证闭环和自我改进机制，适合跟进团队 AI Native 与自动研究能力建设。",
        actionText: "评估其中的 harness 设计、轨迹回放、验证闭环和技能沉淀方式，是否能迁移到团队 Auto-Research / Agent 自进化链路。",
        watchText: authors.length > 0 ? `作者：${authors.join(", ")}` : "关注论文版本、代码与后续复现实验。",
        tags: ["Agent", "Auto-Research", "Harness", "论文/研究", "评测/基准"],
        sourceName: arxivSourceName,
        sourceUrl: idUrl,
        sourceHostname: arxivSourceHostname,
        sourceIconHostname: arxivSourceHostname,
        publishedAt,
        observedAt,
        raw: {
          arxivId,
          authors,
          source: "arxiv"
        }
      };
    }).filter((item) => item.title && item.sourceUrl && isRelevantArxivSupplement(item.title, item.summary));
    console.log(`arxiv supplements: ${items.length} items`);
    return { items };
  } catch (error) {
    console.warn(`arxiv supplements skipped (${error instanceof Error ? error.message : String(error)})`);
    return { items: [] };
  }
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
  const catalog = await readAiSourceCatalog();
  const { byTopic: catalogByTopic, sourceNames: catalogSourceNames } = catalog;

  await collectRequired("topics", "/api/topics", "topics.json");
  const feed = await fetchJson(`/api/feed?limit=${feedLimit}&raw=full&total=count`);
  const sources = await collectRequired("sources", "/api/feed/sources", "sources.json");
  const catalogSources = (sources.items ?? []).filter((source) => catalogSourceNames.has(source.sourceName));
  const catalogHostnames = new Set(catalogSources.map((source) => source.sourceHostname).filter(Boolean));
  const sourceSamples = await collectSourceSamples(catalogSources);
  const arxivSupplements = await collectArxivSupplements();
  if (arxivSupplements.items.length > 0) {
    catalogSourceNames.add(arxivSourceName);
    sources.items = [
      ...sources.items,
      {
        sourceKind: "website",
        sourceName: arxivSourceName,
        sourceHostname: arxivSourceHostname,
        sourceIconHostname: arxivSourceHostname,
        count: arxivSupplements.items.length,
        updatedAt: new Date().toISOString()
      }
    ];
  }
  const mergedFeedItems = mergeFeedItems(
    { items: filterCatalogFeedItems(feed.items, catalogSourceNames, catalogHostnames) },
    sourceSamples,
    arxivSupplements
  );
  const rebuiltSources = rebuildSourceFacets(sources, mergedFeedItems, catalogSourceNames);
  await writeJson("sources.json", withMeta(rebuiltSources));
  await writeJson("feed.json", withMeta({ ...feed, items: mergedFeedItems, total: mergedFeedItems.length }));
  console.log(`feed: ${mergedFeedItems.length} merged items -> feed.json`);
  await writeJson("topic-counts.json", withMeta(buildTopicCounts(mergedFeedItems, catalogByTopic)));
  console.log("topic-counts: rebuilt from filtered feed -> topic-counts.json");

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
