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
const staticFeedFallbackUrl = process.env.STATIC_FEED_FALLBACK_URL ?? "http://hot.aiscl.work/data/feed.json";

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

async function fetchAbsoluteJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AI-Hot-Tracker-GitHub-Actions/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
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

function shortenText(value, maxLength) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function buildArxivRecommendation(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes("multi-hypothesis failure attribution") || text.includes("self-correcting autonomous research")) {
    return {
      whyItMatters: "这篇把 Auto-Research 的失败诊断从单次 reflection 推进到多假设归因，更贴近复杂问题研究里“定位失败原因再迭代”的闭环。",
      actionText: "重点看它如何记录失败轨迹、归因假设和修正步骤，评估能否迁移到团队 Auto-Research 的问题诊断与效果验证链路。"
    };
  }
  if (text.includes("computer-use agents") || text.includes("inference-time self-improvement")) {
    return {
      whyItMatters: "这篇关注 Computer-Use Agent 在推理阶段从失败中自我改进，对跨市场自动走查、网页操作和异常复盘很有参考价值。",
      actionText: "抽取它的失败样本组织方式和在线改进策略，对照现有 Agent Harness 是否能沉淀为可复用的回放与修正模块。"
    };
  }
  if (text.includes("swe-router") || text.includes("multi-turn agentic software engineering")) {
    return {
      whyItMatters: "这篇讨论多轮 Agentic 软件工程任务的路由问题，直接对应 Agent Coding 从“单模型完成”走向“按任务分派最合适执行器”。",
      actionText: "关注它的任务特征、路由决策和评测方式，评估是否可用于跨区域 Agent Coding 的模型/工具选择策略。"
    };
  }
  if (text.includes("scaling the horizon") || text.includes("trillion-parameter performance")) {
    return {
      whyItMatters: "这篇强调扩展 agent 的 horizon 而不是单纯堆参数，和长程轨迹理解、复杂任务 rollout、持续推理上限提升高度相关。",
      actionText: "重点拆解它如何定义 horizon、规划深度和执行预算，作为轨迹大模型长链路推理评测的候选参考。"
    };
  }
  if (text.includes("clarus") || text.includes("web-scale scientific collaboration")) {
    return {
      whyItMatters: "这篇把 autonomous research 放到多智能体科研协作场景里，关注角色分工、证据汇总和大规模研究协同，而不是单 agent demo。",
      actionText: "评估它的协作协议和证据聚合方式，是否能用于 Auto-Research 横向覆盖多市场时的任务拆分与结论校验。"
    };
  }
  if (text.includes("experience graphs")) {
    return {
      whyItMatters: "这篇把 Experience Graphs 作为自改进 Agent 的数据底座，正好对应轨迹、操作记录和反馈信号如何长期沉淀为可学习经验。",
      actionText: "重点看图结构如何组织任务状态、动作和结果，映射到团队的轨迹回放、问题定位和 Agent 自进化数据资产。"
    };
  }
  if (text.includes("autonomous llm research loop") || text.includes("crystal graph")) {
    return {
      whyItMatters: "这篇用 autonomous LLM research loop 优化专家设计模型，价值在于展示“提出假设、实验验证、再优化”的闭环如何落到科研任务。",
      actionText: "关注实验循环、评价指标和人机边界设计，判断能否复用到地址/轨迹模型的自动优化探索。"
    };
  }
  if (text.includes("engineering the loops") || text.includes("stop hand-holding your coding agent")) {
    return {
      whyItMatters: "这篇把重点从一步步提示 agent 转向工程化 loop，本质是在讲如何把人工驱动开发升级为可重复执行的 Agent Harness。",
      actionText: "提炼其中的 loop 设计原则，沉淀到需求迁移、代码开发、验证上线和问题诊断的自动化闭环里。"
    };
  }

  return {
    whyItMatters: `这篇聚焦「${shortenText(title, 42)}」，摘要里讨论的 agent 机制可作为 Auto-Research / Harness 能力建设的补充信号。`,
    actionText: `结合摘要中的「${shortenText(summary, 54)}」做一次小样本复盘，判断是否值得进入团队技术雷达。`
  };
}

function refreshArxivSupplementItem(item) {
  const recommendation = buildArxivRecommendation(item.title ?? "", item.summary ?? "");
  return {
    ...item,
    topicId: "ai",
    sourceKind: "website",
    sourceName: arxivSourceName,
    sourceHostname: arxivSourceHostname,
    sourceIconHostname: arxivSourceHostname,
    whyItMatters: recommendation.whyItMatters,
    actionText: recommendation.actionText,
    tags: [...new Set([...(item.tags ?? []), "Agent", "Auto-Research", "Harness", "论文/研究", "评测/基准"])]
  };
}

async function readCachedArxivItemsFromLocalFeed() {
  try {
    const localFeed = JSON.parse(await readFile(path.join(outputRoot, "feed.json"), "utf8"));
    return (localFeed.items ?? []).filter((item) => item.sourceName === arxivSourceName);
  } catch {
    return [];
  }
}

async function readCachedArxivItemsFromDeployedFeed() {
  try {
    const deployedFeed = await fetchAbsoluteJson(`${staticFeedFallbackUrl}?fallback=${Date.now()}`);
    return (deployedFeed.items ?? []).filter((item) => item.sourceName === arxivSourceName);
  } catch (error) {
    console.warn(`arxiv deployed fallback skipped (${error instanceof Error ? error.message : String(error)})`);
    return [];
  }
}

async function collectCachedArxivSupplements(reason) {
  const localItems = await readCachedArxivItemsFromLocalFeed();
  const deployedItems = localItems.length > 0 ? [] : await readCachedArxivItemsFromDeployedFeed();
  const items = (localItems.length > 0 ? localItems : deployedItems).map(refreshArxivSupplementItem);
  if (items.length > 0) {
    console.warn(`arxiv supplements: reused ${items.length} cached items (${reason})`);
    return { items };
  }
  return { items: [] };
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
      const recommendation = buildArxivRecommendation(title, summary);

      return {
        id: `arxiv_agent_harness_${arxivId.replace(/[^a-z0-9.]/gi, "_")}`,
        topicId: "ai",
        sourceItemIds: [arxivId],
        documentIds: [],
        sourceKind: "website",
        title,
        summary: summary.slice(0, 900),
        importanceScore: /harness|auto-research|autonomous research|trajectory rollout|self-improvement/i.test(`${title} ${summary}`) ? 86 : 78,
        whyItMatters: recommendation.whyItMatters,
        actionText: recommendation.actionText,
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
    if (items.length === 0) return collectCachedArxivSupplements("current query returned no relevant items");
    console.log(`arxiv supplements: ${items.length} items`);
    return { items };
  } catch (error) {
    return collectCachedArxivSupplements(error instanceof Error ? error.message : String(error));
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
