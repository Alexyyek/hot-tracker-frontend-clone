import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const collectorName = "local-source-collector";
const outputRoot = process.env.STATIC_DATA_DIR ?? "public/data";
const dailyHistoryDays = Number(process.env.DAILY_HISTORY_DAYS ?? 14);
const localSourceLimitPerSource = Number(process.env.LOCAL_SOURCE_LIMIT_PER_SOURCE ?? 4);
const weixinLimitPerSource = Number(process.env.WEIXIN_FALLBACK_LIMIT_PER_SOURCE ?? 3);
const weixinDelayMs = Number(process.env.WEIXIN_FALLBACK_DELAY_MS ?? 900);
const weixinQueryTerms = (process.env.WEIXIN_QUERY_TERMS ?? "AI").split(",").map((term) => term.trim()).filter(Boolean);
const staticFeedFallbackUrl = process.env.STATIC_FEED_FALLBACK_URL ?? "https://hot.aiscl.work/data/feed.json";
const xBearerToken = process.env.X_BEARER_TOKEN ?? "";
const beijingTimeZone = "Asia/Shanghai";

const arxivSourceName = "arXiv：Agent Harness / Auto-Research";
const arxivSourceHostname = "arxiv.org";

const rssSourceUrls = {
  "Hugging Face": ["https://huggingface.co/blog/feed.xml"],
  "OpenAI": ["https://openai.com/news/rss.xml"],
  "Anthropic": ["https://www.anthropic.com/news/rss.xml"],
  "Google DeepMind": ["https://deepmind.google/discover/blog/rss.xml", "https://deepmind.google/blog/rss.xml"],
  "xAI": ["https://x.ai/news/rss.xml"],
  "NVIDIA AI Blog": ["https://blogs.nvidia.com/blog/category/deep-learning/feed/"],
  "NVIDIA Technical Blog（开发者技术博客 · RSS）": ["https://developer.nvidia.com/blog/feed/"],
  "The Decoder：AI News（RSS）": ["https://the-decoder.com/feed/"],
  "Nathan Lambert：Interconnects（RSS）": ["https://www.interconnects.ai/feed"],
  "Google Research：Blog（网页）": ["https://research.google/blog/rss/"],
  "X：Microsoft Research (@MSFTResearch)": ["https://www.microsoft.com/en-us/research/feed/"],
  "Artificial Intelligence News（RSS）": ["https://www.artificialintelligence-news.com/feed/"],
  "Thinking Machines Lab：官方博客（RSS）": ["https://thinkingmachines.ai/blog/rss.xml"],
  "HuggingFace Daily Papers（社区热门论文）": ["https://huggingface.co/papers/rss"],
  "Anthropic：Transformer Circuits（可解释性研究）": ["https://transformer-circuits.pub/feed.xml"],
  "Lilian Weng：Lil'Log（RSS）": ["https://lilianweng.github.io/index.xml"],
  "Andrej Karpathy：Blog（网页）": ["https://karpathy.github.io/feed.xml"],
  "CMU：Machine Learning Blog": ["https://blog.ml.cmu.edu/feed/"],
  "BAIR：Berkeley AI Research Blog": ["https://bair.berkeley.edu/blog/feed.xml"],
  "Simon Willison 博客": ["https://simonwillison.net/atom/everything/"],
  "Steve Yegge：Medium（RSS）": ["https://steve-yegge.medium.com/feed"],
  "Google Developers": ["https://developers.googleblog.com/en/search/label/AI/rss.xml"],
  "Google Blog：AI（RSS）": ["https://blog.google/technology/ai/rss/"],
  "Meta Engineering Blog（RSS）": ["https://engineering.fb.com/feed/"],
  "Qwen：Blog Retrieval（API）": ["https://qwenlm.github.io/blog/index.xml"],
  "Qwen：Research（API）": ["https://qwenlm.github.io/blog/index.xml"],
  "Moonshot AI：Kimi Blog（VitePress）": ["https://platform.moonshot.cn/blog/rss.xml"],
  "MiniMax：Blog（网页）": ["https://www.minimax.io/news/rss.xml"],
  "MiniMax：News（网页）": ["https://www.minimax.io/news/rss.xml"],
  "Meta": ["https://ai.meta.com/blog/rss/"]
};

const webpageSourceUrls = {
  "字节 Seed：Research Feed（网页内嵌数据）": ["https://seed.bytedance.com/en/research"],
  "智谱：研究（网页内嵌数据）": ["https://www.z.ai/research"],
  "蚂蚁百灵：Developer Blog（网页）": ["https://bailian.console.aliyun.com/"],
  "NVIDIA Blog：Agentic AI（网页）": ["https://blogs.nvidia.com/blog/tag/agentic-ai/"],
  "NVIDIA Blog：Generative AI（网页）": ["https://blogs.nvidia.com/blog/category/generative-ai/"],
  "OpenRouter": ["https://openrouter.ai/announcements"],
  "Cursor": ["https://cursor.com/changelog"],
  "Claude": ["https://www.anthropic.com/news"],
  "大厂日爆": ["https://www.bilibili.com/", "https://www.infoq.cn/"]
};

const relevanceTerms = [
  "ai",
  "agent",
  "agentic",
  "auto-research",
  "harness",
  "skill",
  "openai",
  "anthropic",
  "claude",
  "deepmind",
  "gemini",
  "qwen",
  "llm",
  "rag",
  "sft",
  "cpt",
  "rl",
  "grpo",
  "benchmark",
  "eval",
  "research",
  "大模型",
  "智能体",
  "机器学习",
  "深度学习",
  "预训练",
  "后训练",
  "微调",
  "推理",
  "评测",
  "工具调用",
  "研发",
  "工程",
  "架构",
  "推荐",
  "排序",
  "地址",
  "轨迹",
  "物流"
];

const lowValueTerms = ["招聘", "内推", "课程", "训练营", "报名", "广告"];

async function readAiConfig() {
  const source = await readFile("src/aiTopics.ts", "utf8");
  const topicsMatch = source.match(/export const aiTopics: Topic\[] = \[([\s\S]*?)\n\];/s);
  const catalogMatch = source.match(/export const aiTopicSourceCatalog = \{([\s\S]*?)\n\} as const/s);
  if (!topicsMatch || !catalogMatch) throw new Error("Unable to locate AI topics or source catalog");

  const topics = Function(`return [${topicsMatch[1]}]`)();
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
  return { topics, byTopic, sourceNames };
}

async function writeJson(relativePath, data) {
  const filePath = path.join(outputRoot, relativePath);
  const tempPath = `${filePath}.tmp`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(withMeta(data), null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

async function cleanDailyDirectory() {
  const dailyDir = path.join(outputRoot, "daily");
  try {
    const entries = await readdir(dailyDir);
    await Promise.all(entries.filter((entry) => entry.endsWith(".json")).map((entry) => rm(path.join(dailyDir, entry))));
  } catch {
    // The directory may not exist on a fresh checkout.
  }
}

function withMeta(data) {
  return {
    ...data,
    generatedAt: new Date().toISOString(),
    collectorName
  };
}

function stableHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 24);
}

function stripHtml(value = "") {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<!--red_beg-->|<!--red_end-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;|&ldquo;|&rdquo;/g, "\"")
    .replace(/&middot;/g, "·")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstXmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

function allXmlValues(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((match) => decodeHtml(match[1]));
}

function hostnameFromUrl(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function inferSourceKind(sourceName) {
  if (sourceName.startsWith("X：")) return "x";
  if (sourceName.startsWith("公众号：")) return "weixin_article";
  if (sourceName.includes("RSS")) return "rss";
  return "website";
}

function includesAny(value, terms) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function isRelevantText(title, summary) {
  const text = `${title} ${summary}`;
  if (includesAny(text, lowValueTerms) && !includesAny(text, ["大模型", "agent", "ai", "研发", "工程"])) return false;
  return includesAny(text, relevanceTerms);
}

function shortenText(value, maxLength) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function buildTags(title, summary, sourceKind) {
  const text = `${title} ${summary}`.toLowerCase();
  const tags = ["AI"];
  if (sourceKind === "weixin_article") tags.push("微信");
  if (/paper|论文|research|研究|arxiv/.test(text)) tags.push("论文/研究");
  if (/agent|智能体|auto-research|harness|skill|工具调用/.test(text)) tags.push("Agent");
  if (/大模型|llm|预训练|后训练|微调|推理|rag|grpo|sft|cpt/.test(text)) tags.push("大模型");
  if (/研发|开发|工程|架构|框架|平台|infrastructure/.test(text)) tags.push("工程实践");
  if (/地址|地理|地图|轨迹|物流|排序|推荐/.test(text)) tags.push("物流/地址");
  return [...new Set(tags)];
}

function buildRecommendation(title, summary, sourceName) {
  const text = `${title} ${summary}`.toLowerCase();
  if (/agent|智能体|auto-research|harness|skill|工具调用/.test(text)) {
    return {
      whyItMatters: `来自${sourceName}的这条内容命中 Agent / Harness / 工具调用方向，可补充团队 AI Native 和自动化研发闭环的外部信号。`,
      actionText: "重点看任务拆分、工具编排、验证闭环和可复用工程抽象，判断能否迁移到 Auto-Research / Agent Coding 链路。"
    };
  }
  if (/大模型|llm|预训练|后训练|微调|推理|rag|grpo|sft|cpt|评测/.test(text)) {
    return {
      whyItMatters: `来自${sourceName}的这条内容命中大模型训练、推理或评测方向，可作为持续提升推理上限的技术雷达信号。`,
      actionText: "关注数据、训练、推理、RAG 或评测设计，评估是否能沉淀到轨迹/地址大模型架构。"
    };
  }
  return {
    whyItMatters: `来自${sourceName}的这条内容命中 AI 技术关键词，可作为当前 OKR 的补充观察点。`,
    actionText: "先快速判断它是否包含可复用方法、架构或工程经验，再决定是否进入日报深读。"
  };
}

function makeFeedItem({ sourceName, sourceKind, title, summary, sourceUrl, publishedAt, imageUrl, raw }) {
  const recommendation = buildRecommendation(title, summary, sourceName);
  const sourceHostname = hostnameFromUrl(sourceUrl);
  return {
    id: `local_${stableHash(`${sourceName}|${sourceUrl || title}|${publishedAt || ""}`)}`,
    topicId: "ai",
    sourceItemIds: [stableHash(sourceUrl || title)],
    documentIds: [],
    sourceKind,
    title: stripHtml(title),
    summary: stripHtml(summary || `来自${sourceName}的本地采集条目。`).slice(0, 900),
    importanceScore: /agent|auto-research|harness|大模型|预训练|后训练|推理|rag|评测/i.test(`${title} ${summary}`) ? 70 : 58,
    whyItMatters: recommendation.whyItMatters,
    actionText: recommendation.actionText,
    watchText: "该条目由 AI Hot Tracker 本地采集器生成；链接不可访问时请以原站搜索结果为准。",
    tags: buildTags(title, summary, sourceKind),
    sourceName,
    sourceUrl,
    sourceHostname,
    sourceIconHostname: sourceKind === "weixin_article" ? "mp.weixin.qq.com" : sourceHostname,
    thumbnailUrl: imageUrl || undefined,
    imageUrl: imageUrl || undefined,
    publishedAt: normalizeDate(publishedAt),
    observedAt: new Date().toISOString(),
    raw: {
      source: collectorName,
      ...(raw ?? {})
    }
  };
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

async function fetchText(url, accept = "application/atom+xml,text/xml,text/html,text/plain") {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      "User-Agent": "AI-Hot-Tracker-Local-Collector/1.0"
    }
  });

  if (!response.ok) throw new Error(`Request failed ${response.status}: ${url}`);
  return response.text();
}

async function fetchJsonUrl(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AI-Hot-Tracker-Local-Collector/1.0",
      ...headers
    }
  });

  if (!response.ok) throw new Error(`Request failed ${response.status}: ${url}`);
  return response.json();
}

function parseFeedXml(xml, sourceName, sourceKind) {
  const rssItems = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    const title = firstXmlValue(item, "title");
    const link = firstXmlValue(item, "link") || firstXmlValue(item, "guid");
    const summary = firstXmlValue(item, "description") || firstXmlValue(item, "content:encoded");
    const publishedAt = firstXmlValue(item, "pubDate") || firstXmlValue(item, "dc:date");
    return { title, link, summary, publishedAt };
  });

  const atomItems = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map((match) => {
    const item = match[1];
    const title = firstXmlValue(item, "title");
    const linkMatch = item.match(/<link\b[^>]*href="([^"]+)"/i);
    const link = decodeHtml(linkMatch?.[1] ?? firstXmlValue(item, "id"));
    const summary = firstXmlValue(item, "summary") || firstXmlValue(item, "content");
    const publishedAt = firstXmlValue(item, "published") || firstXmlValue(item, "updated");
    return { title, link, summary, publishedAt };
  });

  return [...rssItems, ...atomItems]
    .filter((row) => row.title && row.link && isRelevantText(row.title, row.summary))
    .slice(0, localSourceLimitPerSource)
    .map((row) => makeFeedItem({
      sourceName,
      sourceKind,
      title: row.title,
      summary: row.summary,
      sourceUrl: row.link,
      publishedAt: row.publishedAt,
      raw: { parser: "rss_atom" }
    }));
}

async function collectRssSource(sourceName, urls) {
  const sourceKind = inferSourceKind(sourceName);
  const items = [];
  for (const url of urls) {
    try {
      const xml = await fetchText(url);
      items.push(...parseFeedXml(xml, sourceName, sourceKind));
    } catch (error) {
      console.warn(`rss source skipped: ${sourceName} (${error instanceof Error ? error.message : String(error)})`);
    }
    if (items.length >= localSourceLimitPerSource) break;
  }
  return items.slice(0, localSourceLimitPerSource);
}

function parseAnchorsFromHtml(html, baseUrl, sourceName) {
  const rows = [];
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const title = stripHtml(match[2]);
    if (!title || title.length < 8) continue;
    let sourceUrl = href;
    try {
      sourceUrl = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (!isLikelyArticleUrl(sourceUrl, baseUrl)) continue;
    if (!isRelevantText(title, "")) continue;
    rows.push({
      title,
      sourceUrl,
      baseUrl
    });
  }
  return rows;
}

function isLikelyArticleUrl(sourceUrl, baseUrl) {
  try {
    const url = new URL(sourceUrl);
    const base = new URL(baseUrl);
    if (!/^https?:$/.test(url.protocol)) return false;
    if (url.hash && url.pathname === base.pathname) return false;
    if (/\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip)(?:$|\?)/i.test(url.pathname)) return false;
    if (/\/(?:category|tag|author|search|events?|about|contact|careers?)(?:\/|$)/i.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function getHtmlAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[2] ?? match?.[3] ?? match?.[4] ?? "");
}

function firstMetaContent(html, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (getHtmlAttribute(tag, "name") || getHtmlAttribute(tag, "property")).toLowerCase();
    if (!wanted.has(key)) continue;
    const content = getHtmlAttribute(tag, "content");
    if (content) return content;
  }
  return "";
}

function firstJsonLdValue(html, key) {
  const match = html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

function firstTitleValue(html) {
  return firstMetaContent(html, ["og:title", "twitter:title"]) || stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function firstParagraphValue(html) {
  const articleHtml = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? html;
  for (const match of articleHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(match[1]);
    if (text.length >= 80 && !/cookie|privacy|subscribe|copyright/i.test(text)) return text;
  }
  return "";
}

function extractWebpageDetails(html, fallbackTitle) {
  const title = shortenText(firstTitleValue(html).replace(/\s+\|.+$/, "") || fallbackTitle, 180);
  const summary = firstMetaContent(html, ["description", "og:description", "twitter:description"]) || firstJsonLdValue(html, "description") || firstParagraphValue(html);
  const publishedAt = firstMetaContent(html, ["article:published_time", "article:modified_time", "date", "pubdate"]) || firstJsonLdValue(html, "datePublished") || firstJsonLdValue(html, "dateModified");
  const imageUrl = firstMetaContent(html, ["og:image", "twitter:image"]) || firstJsonLdValue(html, "thumbnailUrl");
  return {
    title,
    summary: shortenText(summary, 900),
    publishedAt,
    imageUrl
  };
}

async function buildWebpageItemFromCandidate(sourceName, candidate) {
  try {
    const html = await fetchText(candidate.sourceUrl, "text/html,application/xhtml+xml");
    const details = extractWebpageDetails(html, candidate.title);
    if (!details.summary || details.summary.length < 24) return null;
    return makeFeedItem({
      sourceName,
      sourceKind: inferSourceKind(sourceName),
      title: details.title || candidate.title,
      summary: details.summary,
      sourceUrl: candidate.sourceUrl,
      publishedAt: details.publishedAt || new Date().toISOString(),
      imageUrl: details.imageUrl,
      raw: { parser: "html_detail", baseUrl: candidate.baseUrl, anchorTitle: candidate.title }
    });
  } catch (error) {
    console.warn(`webpage detail skipped: ${sourceName} (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

async function collectWebpageSource(sourceName, urls) {
  const items = [];
  for (const url of urls) {
    try {
      const html = await fetchText(url, "text/html,application/xhtml+xml");
      const candidates = dedupeWebpageCandidates(parseAnchorsFromHtml(html, url, sourceName));
      for (const candidate of candidates.slice(0, localSourceLimitPerSource * 6)) {
        const item = await buildWebpageItemFromCandidate(sourceName, candidate);
        if (!item) continue;
        if (!item.title || !item.sourceUrl || !isRelevantText(item.title, item.summary)) continue;
        items.push(item);
        if (items.length >= localSourceLimitPerSource) break;
      }
    } catch (error) {
      console.warn(`webpage source skipped: ${sourceName} (${error instanceof Error ? error.message : String(error)})`);
    }
    if (items.length >= localSourceLimitPerSource) break;
  }
  return dedupeItems(items).slice(0, localSourceLimitPerSource);
}

function dedupeWebpageCandidates(candidates) {
  const byUrl = new Map();
  for (const candidate of candidates) {
    const key = candidate.sourceUrl.replace(/#.*$/, "");
    if (!byUrl.has(key)) byUrl.set(key, { ...candidate, sourceUrl: key });
  }
  return [...byUrl.values()];
}

function arxivIdFromUrl(url) {
  return url.split("/").pop()?.replace(/v\d+$/i, "") ?? url;
}

function isRelevantArxiv(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  return [
    "agent harness",
    "research harness",
    "auto-research",
    "autonomous research",
    "coding agent",
    "agentic software engineering",
    "long-horizon agent",
    "trajectory",
    "self-improvement",
    "evaluation"
  ].some((term) => text.includes(term));
}

async function collectArxivSource() {
  const terms = [
    "\"agent harness\"",
    "\"research harness\"",
    "\"auto-research\"",
    "\"autonomous research\"",
    "\"coding agent\"",
    "\"long-horizon agent\""
  ];
  const searchQuery = terms.map((term) => `all:${term}`).join("+OR+");
  const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending`;
  try {
    const xml = await fetchText(url, "application/atom+xml,text/xml");
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)]
      .map((match) => {
        const entry = match[1];
        const idUrl = firstXmlValue(entry, "id");
        const title = firstXmlValue(entry, "title");
        const summary = firstXmlValue(entry, "summary");
        const authors = allXmlValues(entry, "name").slice(0, 6);
        return makeFeedItem({
          sourceName: arxivSourceName,
          sourceKind: "website",
          title,
          summary,
          sourceUrl: idUrl,
          publishedAt: firstXmlValue(entry, "published"),
          raw: {
            parser: "arxiv",
            arxivId: arxivIdFromUrl(idUrl),
            authors
          }
        });
      })
      .filter((item) => item.title && item.sourceUrl && isRelevantArxiv(item.title, item.summary))
      .slice(0, localSourceLimitPerSource);
  } catch (error) {
    console.warn(`arxiv source skipped (${error instanceof Error ? error.message : String(error)})`);
    return [];
  }
}

function sourceAccountName(sourceName) {
  return sourceName.replace(/^公众号：/, "");
}

function absoluteSogouUrl(value = "") {
  const decoded = decodeHtml(value);
  if (!decoded) return "";
  if (decoded.startsWith("//")) return `https:${decoded}`;
  if (decoded.startsWith("/")) return `https://weixin.sogou.com${decoded}`;
  return decoded;
}

function parseSogouWeixinResults(html, sourceName, query) {
  if (/验证码|请输入验证码|antispider|用户您好/.test(html)) throw new Error("Sogou anti-spider challenge");

  const accountName = sourceAccountName(sourceName);
  return html.split(/<li id="sogou_vr_11002601_box_\d+"/).slice(1)
    .map((block) => {
      const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i);
      const title = stripHtml(titleMatch?.[2] ?? "");
      const sourceUrl = absoluteSogouUrl(titleMatch?.[1] ?? "");
      const summary = stripHtml(block.match(/<p class="txt-info"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "");
      const resultAccountName = stripHtml(block.match(/<span class="all-time-y2">([\s\S]*?)<\/span>/i)?.[1] ?? "");
      const publishedUnix = Number(block.match(/timeConvert\('([^']+)'\)/)?.[1] ?? 0);
      const imageUrl = absoluteSogouUrl(block.match(/<img[^>]*src="([^"]+)"/i)?.[1] ?? "");
      if (!title || !sourceUrl || resultAccountName !== accountName || !publishedUnix) return null;
      return { title, summary, sourceUrl, imageUrl, accountName: resultAccountName, publishedAt: new Date(publishedUnix * 1000).toISOString(), query };
    })
    .filter(Boolean);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectWeixinSource(sourceName) {
  const byId = new Map();
  const accountName = sourceAccountName(sourceName);

  for (const term of weixinQueryTerms) {
    const query = `${accountName} ${term}`;
    const url = `https://weixin.sogou.com/weixin?type=2&ie=utf8&query=${encodeURIComponent(query)}`;
    try {
      const html = await fetchText(url, "text/html,application/xhtml+xml");
      const rows = parseSogouWeixinResults(html, sourceName, query)
        .filter((row) => isRelevantText(row.title, row.summary))
        .map((row) => makeFeedItem({
          sourceName,
          sourceKind: "weixin_article",
          title: row.title,
          summary: row.summary || `来自${sourceName}的搜狗微信搜索结果，查询词：${query}`,
          sourceUrl: row.sourceUrl,
          publishedAt: row.publishedAt,
          imageUrl: row.imageUrl,
          raw: { parser: "sogou_weixin", accountName: row.accountName, query }
        }));
      for (const item of rows) byId.set(item.id, item);
    } catch (error) {
      console.warn(`weixin source skipped: ${sourceName} (${error instanceof Error ? error.message : String(error)})`);
      break;
    }
    await sleep(weixinDelayMs);
  }

  return [...byId.values()].sort(compareItems).slice(0, weixinLimitPerSource);
}

function xHandleFromSource(sourceName) {
  return sourceName.match(/@([A-Za-z0-9_]+)/)?.[1] ?? "";
}

async function collectXSource(sourceName) {
  if (!xBearerToken) return [];
  const handle = xHandleFromSource(sourceName);
  if (!handle) return [];
  try {
    const user = await fetchJsonUrl(`https://api.twitter.com/2/users/by/username/${handle}`, {
      Authorization: `Bearer ${xBearerToken}`
    });
    const userId = user.data?.id;
    if (!userId) return [];
    const params = new URLSearchParams({
      max_results: "5",
      "tweet.fields": "created_at,entities",
      exclude: "retweets,replies"
    });
    const timeline = await fetchJsonUrl(`https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`, {
      Authorization: `Bearer ${xBearerToken}`
    });
    return (timeline.data ?? [])
      .filter((tweet) => isRelevantText(tweet.text, ""))
      .slice(0, localSourceLimitPerSource)
      .map((tweet) => makeFeedItem({
        sourceName,
        sourceKind: "x",
        title: shortenText(tweet.text, 120),
        summary: tweet.text,
        sourceUrl: `https://x.com/${handle}/status/${tweet.id}`,
        publishedAt: tweet.created_at,
        raw: { parser: "x_api", handle }
      }));
  } catch (error) {
    console.warn(`x source skipped: ${sourceName} (${error instanceof Error ? error.message : String(error)})`);
    return [];
  }
}

let cachedFeedPromise;

async function readCachedFeedItems() {
  if (cachedFeedPromise) return cachedFeedPromise;
  cachedFeedPromise = (async () => {
    try {
      const localFeed = JSON.parse(await readFile(path.join(outputRoot, "feed.json"), "utf8"));
      if ((localFeed.items ?? []).length > 0) return localFeed.items;
    } catch {
      // Fall through to deployed cache.
    }
    try {
      const deployedFeed = await fetchJsonUrl(`${staticFeedFallbackUrl}?cache=${Date.now()}`);
      return deployedFeed.items ?? [];
    } catch (error) {
      console.warn(`cache feed skipped (${error instanceof Error ? error.message : String(error)})`);
      return [];
    }
  })();
  return cachedFeedPromise;
}

async function cachedItemsForSource(sourceName) {
  if (sourceName.startsWith("X：") && !xBearerToken) return [];
  const cachedItems = await readCachedFeedItems();
  return cachedItems
    .filter((item) => item.sourceName === sourceName)
    .filter((item) => !isLowDetailWebpageItem(item))
    .map((item) => ({
      ...item,
      observedAt: new Date().toISOString(),
      raw: { ...(item.raw ?? {}), reusedFromLocalCache: true }
    }));
}

function isLowDetailWebpageItem(item) {
  return item.raw?.parser === "html_anchor" || /相关链接/.test(item.summary ?? "") || /详情页.{0,8}(摘要|访问|线索)/.test(item.summary ?? "");
}

function itemIdentityKey(item) {
  return item.sourceUrl || item.id;
}

async function collectSource(sourceName) {
  let fresh = [];
  if (sourceName === arxivSourceName) fresh = await collectArxivSource();
  else if (sourceName.startsWith("公众号：")) fresh = await collectWeixinSource(sourceName);
  else if (sourceName.startsWith("X：")) fresh = await collectXSource(sourceName);
  else if (rssSourceUrls[sourceName]) fresh = await collectRssSource(sourceName, rssSourceUrls[sourceName]);
  else if (webpageSourceUrls[sourceName]) fresh = await collectWebpageSource(sourceName, webpageSourceUrls[sourceName]);

  const byId = new Map(fresh.map((item) => [itemIdentityKey(item), item]));
  for (const item of await cachedItemsForSource(sourceName)) {
    const key = itemIdentityKey(item);
    if (!byId.has(key)) byId.set(key, item);
  }

  const items = [...byId.values()].sort(compareItems).slice(0, sourceName.startsWith("公众号：") ? weixinLimitPerSource : localSourceLimitPerSource);
  console.log(`source: ${sourceName} -> ${items.length} items${fresh.length > 0 ? ` (${fresh.length} fresh)` : ""}`);
  return items;
}

function compareItems(a, b) {
  return (b.publishedAt ?? b.observedAt ?? "").localeCompare(a.publishedAt ?? a.observedAt ?? "");
}

function dedupeItems(items) {
  const byId = new Map();
  for (const item of items) byId.set(item.id, { ...byId.get(item.id), ...item });
  return [...byId.values()].sort(compareItems);
}

function countItemsBySource(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.sourceName, (counts.get(item.sourceName) ?? 0) + 1);
  return counts;
}

function buildSourceFacets(sourceNames, items) {
  const counts = countItemsBySource(items);
  return [...sourceNames].map((sourceName) => ({
    sourceKind: inferSourceKind(sourceName),
    sourceName,
    sourceIconHostname: sourceName.startsWith("公众号：") ? "mp.weixin.qq.com" : undefined,
    count: counts.get(sourceName) ?? 0
  }));
}

function buildTopicCounts(items, catalogByTopic) {
  const count = (topicId) => items.filter((item) => catalogByTopic.get(topicId)?.has(item.sourceName)).length;
  return {
    items: [
      { topicId: "ai-all", count: items.length },
      { topicId: "ai", count: items.length },
      { topicId: "ai-industry", count: count("ai-industry") },
      { topicId: "ai-papers", count: count("ai-papers") },
      { topicId: "ai-applications", count: count("ai-applications") },
      { topicId: "big-tech-daily", count: count("ai-big-tech") }
    ]
  };
}

function dateInput(daysAgo = 0) {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: beijingTimeZone,
    year: "numeric"
  }).format(date);
}

function itemDate(item) {
  const value = item.publishedAt || item.observedAt || "";
  if (!value) return "";
  return dateInputFromTimestamp(value);
}

function dateInputFromTimestamp(value) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: beijingTimeZone,
    year: "numeric"
  }).format(new Date(value));
}

function sectionForItem(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (/agent|智能体|auto-research|harness|skill|工具调用|coding/.test(text)) return "Agent 与研发提效";
  if (/大模型|llm|预训练|后训练|微调|推理|rag|grpo|sft|cpt|评测|benchmark/.test(text)) return "模型与基础设施";
  if (/地址|地理|地图|轨迹|物流|排序|推荐/.test(text)) return "物流、地址与召排";
  if (/产品|发布|应用|工具|平台|developer|开发者/.test(text)) return "产品与工具";
  return "行业与公司";
}

function buildDailyReport(topicId, reportDate, title, items) {
  const selected = items.slice(0, 24);
  const grouped = new Map();
  for (const item of selected) {
    const section = sectionForItem(item);
    if (!grouped.has(section)) grouped.set(section, []);
    grouped.get(section).push(item);
  }

  const sections = [...grouped.entries()].slice(0, 4).map(([sectionTitle, sectionItems]) => ({
    title: sectionTitle,
    items: sectionItems.slice(0, 5).map((item) => ({
      title: item.title,
      summary: item.whyItMatters ?? item.summary,
      insightLabel: "关注",
      insightText: item.actionText ?? "",
      sourceFeedItemIds: [item.id],
      confidence: item.importanceScore
    }))
  }));

  const topTitles = selected.slice(0, 2).map((item) => `「${item.title}」`).join("、");
  const mainLine = selected.length > 0
    ? `今日筛出 ${selected.length} 条 AI 技术信号，优先看 ${topTitles}。脉络集中在大模型训练/推理、Agent Skill、Auto-Research/Harness 与可复制工程实践。`
    : "今日本地采集器没有筛出足够高相关的 AI 技术信号。";

  return {
    id: `daily_${topicId}_${reportDate}`,
    topicId,
    reportDate,
    title,
    mainLine,
    actionItems: selected.slice(0, 3).map((item) => `评估是否可沉淀到团队 AI Native / Agent 自进化链路：${item.title}`),
    watchItems: selected.slice(0, 5).map((item) => `跟进：${item.title}`),
    sections,
    referencedFeedItemIds: selected.map((item) => item.id),
    generatedAt: new Date().toISOString(),
    model: collectorName,
    raw: { generatedBy: collectorName }
  };
}

function buildDailyReportsForDate(date, items, catalogByTopic) {
  const sameDay = items.filter((item) => itemDate(item) === date);
  const base = sameDay.length > 0 ? sameDay : items.slice(0, 30);
  const bigTechSources = catalogByTopic.get("ai-big-tech") ?? new Set();
  const bigTechItems = base.filter((item) => bigTechSources.has(item.sourceName));
  return {
    items: [
      buildDailyReport("ai", date, "AI日报", base),
      buildDailyReport("big-tech-daily", date, "大厂 AI 日报", bigTechItems.length > 0 ? bigTechItems : base)
    ]
  };
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const { topics, byTopic, sourceNames } = await readAiConfig();
  const allItems = [];

  for (const sourceName of sourceNames) {
    const items = await collectSource(sourceName);
    allItems.push(...items);
  }

  const feedItems = dedupeItems(allItems)
    .filter((item) => item.sourceKind !== "github" && item.importanceScore > 0)
    .sort(compareItems);
  const sourceFacets = buildSourceFacets(sourceNames, feedItems);

  await writeJson("topics.json", { items: topics });
  await writeJson("sources.json", { items: sourceFacets });
  await writeJson("feed.json", { items: feedItems, total: feedItems.length });
  await writeJson("topic-counts.json", buildTopicCounts(feedItems, byTopic));
  console.log(`feed: ${feedItems.length} local items -> feed.json`);

  await cleanDailyDirectory();
  const today = dateInput(0);
  const latest = buildDailyReportsForDate(today, feedItems, byTopic);
  await writeJson("daily/latest.json", latest);
  for (let index = 0; index < dailyHistoryDays; index += 1) {
    const date = dateInput(index);
    await writeJson(`daily/${date}.json`, buildDailyReportsForDate(date, feedItems, byTopic));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
