import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const collectorName = "local-source-collector";
const outputRoot = process.env.STATIC_DATA_DIR ?? "public/data";
const dailyHistoryDays = Number(process.env.DAILY_HISTORY_DAYS ?? 14);
const localSourceLimitPerSource = Number(process.env.LOCAL_SOURCE_LIMIT_PER_SOURCE ?? 4);
const weixinLimitPerSource = Number(process.env.WEIXIN_FALLBACK_LIMIT_PER_SOURCE ?? 3);
const weixinDelayMs = Number(process.env.WEIXIN_FALLBACK_DELAY_MS ?? 900);
const weixinQueryTerms = (process.env.WEIXIN_QUERY_TERMS ?? "Agent,大模型,RAG,AI Native,智能体").split(",").map((term) => term.trim()).filter(Boolean);
const weixinSearchLimitPerSource = Number(process.env.WEIXIN_SEARCH_LIMIT_PER_SOURCE ?? 2);
const weixinSearchEnabled = process.env.WEIXIN_SEARCH_DISCOVERY !== "0";
const rsshubBaseUrls = parseBaseUrls(`${process.env.RSSHUB_BASE_URLS ?? ""}\n${process.env.RSSHUB_BASE_URL ?? ""}`);
const weixinFeedSourceUrls = parseSourceUrlConfig(process.env.WEIXIN_FEED_SOURCES_JSON ?? "{}");
const weixinRsshubSourceUrls = parseSourceUrlConfig(process.env.WEIXIN_RSSHUB_SOURCES_JSON ?? "{}", rsshubBaseUrls);
const staticFeedFallbackUrl = process.env.STATIC_FEED_FALLBACK_URL ?? "https://hot.aiscl.work/data/feed.json";
const xBearerToken = process.env.X_BEARER_TOKEN ?? "";
const xRsshubFallbackEnabled = process.env.X_RSSHUB_FALLBACK !== "0";
const dailyCacheFreshnessDays = Number(process.env.DAILY_CACHE_FRESHNESS_DAYS ?? 14);
const sourceHealthStaleHours = Number(process.env.SOURCE_HEALTH_STALE_HOURS ?? 14 * 24);
const beijingTimeZone = "Asia/Shanghai";
const weixinHealthRows = [];

const arxivSourceName = "arXiv：Agent Harness / Auto-Research";
const arxivSourceHostname = "arxiv.org";
const huggingFaceDailyPapersSourceName = "HuggingFace Daily Papers（社区热门论文）";

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
  [huggingFaceDailyPapersSourceName]: ["https://huggingface.co/papers/rss"],
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

const sourceHomeUrls = {
  "Anthropic": ["https://www.anthropic.com/news"],
  "Google DeepMind": ["https://deepmind.google/discover/blog/"],
  "xAI": ["https://x.ai/news"],
  "Thinking Machines Lab：官方博客（RSS）": ["https://thinkingmachines.ai/blog"],
  "Google Developers": ["https://developers.googleblog.com/search/label/AI"],
  "MiniMax：Blog（网页）": ["https://www.minimax.io/news"],
  "MiniMax：News（网页）": ["https://www.minimax.io/news"],
  "Moonshot AI：Kimi Blog（VitePress）": ["https://platform.moonshot.cn/blog"],
  "Meta": ["https://ai.meta.com/blog/"]
};

const relevanceTerms = [
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
  "研发提效",
  "工程实践",
  "系统架构",
  "推荐系统",
  "排序",
  "召回排序",
  "召回模型",
  "召回链路",
  "地址",
  "轨迹",
  "物流"
];

const aiContextTerms = [
  "ai",
  "人工智能",
  "大模型",
  "llm",
  "foundation model",
  "openai",
  "anthropic",
  "claude",
  "deepmind",
  "gemini",
  "qwen",
  "千问",
  "kimi",
  "deepseek",
  "智能体",
  "agent",
  "机器学习",
  "深度学习",
  "多模态",
  "生成式"
];

const highIntentTerms = [
  "agent",
  "agentic",
  "智能体",
  "agent skill",
  "skill",
  "harness",
  "auto-research",
  "autonomous research",
  "agent coding",
  "coding agent",
  "tool calling",
  "tool use",
  "工具调用",
  "mcp",
  "workflow automation",
  "自动化研发",
  "ai native",
  "大模型",
  "llm",
  "foundation model",
  "预训练",
  "后训练",
  "post-training",
  "pretraining",
  "sft",
  "cpt",
  "rag",
  "rl",
  "grpo",
  "reinforcement learning",
  "inference",
  "推理",
  "推理上限",
  "eval",
  "evaluation",
  "benchmark",
  "评测",
  "地址",
  "地址纠错",
  "地址理解",
  "轨迹",
  "物流",
  "召回排序",
  "召回模型",
  "召回链路",
  "排序",
  "推荐系统",
  "geocode",
  "geocoding",
  "ranking",
  "retrieval"
];

const weakGenericTerms = [
  "大会",
  "峰会",
  "conference",
  "summit",
  "报名",
  "课程",
  "训练营",
  "榜单",
  "社区",
  "招聘",
  "内推",
  "广告",
  "发布会"
];

const lowValueTerms = ["招聘", "内推", "课程", "训练营", "报名", "广告", "投资", "股票", "基金", "打新", "美食", "旅游", "酒店"];

const promotionalTerms = ["有奖", "热门活动", "主题征文", "征文", "提pr", "报bug", "写体验", "抽奖", "福利", "门票"];
const hardLowValueTerms = ["招聘", "内推", "校招", "实习", "社招"];

const sourceIconHostnames = {
  "Anthropic": "anthropic.com",
  "大厂日爆": "infoq.cn",
  "Qwen：Blog Retrieval（API）": "qwenlm.github.io",
  "Qwen：Research（API）": "qwenlm.github.io",
  "Claude": "claude.com",
  "Anthropic：Transformer Circuits（可解释性研究）": "transformer-circuits.pub",
  "Andrej Karpathy：Blog（网页）": "karpathy.github.io",
  "智谱：研究（网页内嵌数据）": "z.ai",
  "MiniMax：Blog（网页）": "minimax.io",
  "MiniMax：News（网页）": "minimax.io",
  "Moonshot AI：Kimi Blog（VitePress）": "kimi.com",
  "蚂蚁百灵：Developer Blog（网页）": "developer.ant-ling.com"
};

const weixinManualSeeds = {
  "公众号：阿里云开发者": [
    ["阿里云开发者：大模型应用与 RAG 工程实践入口", "关注阿里云大模型服务、RAG 检索增强、Agent 工具调用和企业级 AI 应用落地，适合作为模型推理、工程架构和多市场复制实践的补充信号。"]
  ],
  "公众号：阿里技术": [
    ["阿里技术：大模型工程与智能体研发实践入口", "关注阿里体系在大模型训练推理、Agent 工程、工具调用、搜索推荐和云原生基础设施上的技术实践，优先筛选可复用架构与评测方法。"]
  ],
  "公众号：美团技术团队": [
    ["美团技术团队：LongCat 与大模型工程实践入口", "关注美团 LongCat、大模型推理效率、Agent 应用和搜索推荐工程实践，适合观察本地生活场景下 AI 技术落地与复杂系统演进。"]
  ],
  "公众号：百度智能云技术": [
    ["百度智能云技术：文心大模型与企业 AI 工程入口", "关注文心大模型、RAG、智能体平台、模型服务化和企业级 AI Native 开发实践，适合补充模型推理和应用架构观察。"]
  ],
  "公众号：快手技术": [
    ["快手技术：多模态大模型与推荐系统工程入口", "关注快手在多模态理解、内容推荐、AIGC、模型推理和大规模在线系统中的工程实践，适合观察推荐排序与 AI 基础设施。"]
  ],
  "公众号：小红书技术": [
    ["小红书技术：搜索推荐与 LLM 应用工程入口", "关注小红书在搜索推荐、内容理解、LLM 应用、Agent 工具链和工程提效上的实践，适合补充推荐排序与 AI Native 开发信号。"]
  ],
  "公众号：携程技术": [
    ["携程技术：AI Agent 与搜索推荐工程入口", "关注携程在旅行场景下的智能客服、搜索推荐、行程规划 Agent 和大模型应用工程，适合观察复杂业务流程的自动化与验证闭环。"]
  ],
  "公众号：vivo互联网技术": [
    ["vivo互联网技术：端侧大模型与 AI 应用工程入口", "关注端侧模型、智能助手、多模态交互、模型推理优化和移动端 AI 应用落地，适合补充推理效率与产品化实践观察。"]
  ],
  "公众号：OPPO数智技术": [
    ["OPPO数智技术：端侧 AI 与智能体应用工程入口", "关注端侧大模型、智能体能力、移动端推理优化、AI 应用平台和工程提效实践，适合作为 AI Native 产品落地参考。"]
  ]
};

function parseBaseUrls(raw = "") {
  return [...new Set(String(raw)
    .split(/[\n,]+/)
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter((url) => /^https?:\/\//.test(url)))];
}

function expandConfiguredUrl(value, baseUrls = []) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  if (/^https?:\/\//.test(raw)) return [raw];
  if (baseUrls.length === 0) return [];
  const route = raw.startsWith("/") ? raw : `/${raw}`;
  return baseUrls.map((baseUrl) => `${baseUrl}${route}`);
}

function parseSourceUrlConfig(raw, baseUrls = []) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed)
      .map(([sourceName, value]) => {
        const urls = [];
        if (Array.isArray(value)) {
          for (const entry of value) urls.push(...expandConfiguredUrl(entry, baseUrls));
        } else if (typeof value === "string") {
          urls.push(...expandConfiguredUrl(value, baseUrls));
        } else if (value && typeof value === "object") {
          const entries = [
            ...(Array.isArray(value.urls) ? value.urls : []),
            ...(Array.isArray(value.routes) ? value.routes : []),
            value.url,
            value.route
          ].filter(Boolean);
          for (const entry of entries) urls.push(...expandConfiguredUrl(entry, baseUrls));
        }
        return [sourceName, [...new Set(urls)]];
      })
      .filter(([, urls]) => urls.length > 0));
  } catch {
    return {};
  }
}

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

function sourceIconHostnameForSource(sourceName, sourceKind, sourceHostname = "") {
  if (sourceKind === "weixin_article" || sourceName.startsWith("公众号：")) return "";
  if (sourceName.startsWith("X：")) return "x.com";
  return sourceIconHostnames[sourceName] ?? sourceHostname;
}

function includesAny(value, terms) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function termHitCount(value, terms) {
  const normalized = value.toLowerCase();
  return terms.reduce((count, term) => count + (normalized.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function isPaperItem(sourceName, title = "") {
  return sourceName === arxivSourceName ||
    /paper|papers|论文|arxiv/i.test(sourceName) ||
    /\barxiv\b|论文|paper/i.test(title);
}

function relevanceScore(title, summary, sourceName = "") {
  const titleText = stripHtml(title);
  const summaryText = stripHtml(summary);
  const text = `${titleText} ${summaryText}`;
  const titleIntentHits = termHitCount(titleText, highIntentTerms);
  const bodyIntentHits = termHitCount(summaryText, highIntentTerms);
  const aiHits = termHitCount(text, aiContextTerms);
  const broadHits = termHitCount(text, relevanceTerms);
  const weakHits = termHitCount(text, weakGenericTerms);
  const lowHits = termHitCount(text, lowValueTerms);
  const promotionalHits = termHitCount(text, promotionalTerms);
  const hasPaperSignal = isPaperItem(sourceName, titleText);
  let score = titleIntentHits * 2 + bodyIntentHits * 4 + aiHits + broadHits;

  if (!summaryText && titleIntentHits === 0 && !hasPaperSignal) score -= 4;
  if (weakHits > 0 && bodyIntentHits === 0) score -= 6;
  if (lowHits > 0 && titleIntentHits + bodyIntentHits < 2) score -= 8;
  if (promotionalHits > 0) score -= bodyIntentHits >= 2 ? 4 : 10;
  if (/qcon|aicon|infoq|大会|峰会|conference/i.test(text) && bodyIntentHits === 0) score -= 5;
  if (/榜单|社区|好用|工具导航/i.test(text) && bodyIntentHits === 0) score -= 4;
  if (sourceName.startsWith("公众号：") && titleIntentHits + bodyIntentHits > 0) score += 2;
  if (hasPaperSignal && (bodyIntentHits > 0 || aiHits > 0)) score += 3;

  return score;
}

function isRelevantText(title, summary, sourceName = "") {
  const text = `${title} ${summary}`;
  if (termHitCount(title, hardLowValueTerms) > 0) return false;
  if (sourceName.startsWith("公众号：") && termHitCount(text, hardLowValueTerms) > 0) return false;
  const score = relevanceScore(title, summary, sourceName);
  const hasIntent = termHitCount(text, highIntentTerms) > 0;
  return score >= 5 && (hasIntent || isPaperItem(sourceName, title));
}

function isCandidateTitleRelevant(title, sourceName = "") {
  const text = stripHtml(title);
  if (termHitCount(text, lowValueTerms) > 0) return false;
  if (termHitCount(text, promotionalTerms) > 0) return false;
  if (termHitCount(text, weakGenericTerms) > 0 && termHitCount(text, highIntentTerms) === 0) return false;
  return termHitCount(text, [...aiContextTerms, ...highIntentTerms]) > 0 || isPaperItem(sourceName, text);
}

function shortenText(value, maxLength) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function isMostlyEnglish(value) {
  const text = stripHtml(value);
  const chinese = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  return letters > 24 && chinese < Math.max(8, letters * 0.12);
}

function focusLabelForText(value) {
  const text = value.toLowerCase();
  if (/agent|agentic|智能体|harness|auto-research|coding agent|tool calling|tool use|工具调用|mcp|skill/.test(text)) {
    return "Agent Skill、Harness、工具调用和自动化研发";
  }
  if (/大模型|llm|foundation model|预训练|后训练|sft|cpt|rag|grpo|reinforcement learning|推理|eval|benchmark|评测/.test(text)) {
    return "大模型训练、推理、RAG、后训练或评测";
  }
  if (/地址|地理|地图|轨迹|物流|召回|排序|推荐系统|geocod|ranking|retrieval/.test(text)) {
    return "物流轨迹、地址理解、召回排序或地理智能";
  }
  if (/workflow|developer|开发者|平台|应用|工具|workbench/.test(text)) {
    return "AI 工具、开发者平台和工程提效";
  }
  return "AI 技术演进和可复用工程实践";
}

function localizeSummaryForDisplay(sourceName, title, summary) {
  const cleanSummary = stripHtml(summary || `来自${sourceName}的本地采集条目。`).slice(0, 900);
  if (isPaperItem(sourceName, title) || !isMostlyEnglish(cleanSummary)) return cleanSummary;
  const focus = focusLabelForText(`${title} ${cleanSummary}`);
  const detail = shortenText(cleanSummary, 220);
  return `这篇内容聚焦「${focus}」。原文摘要显示：${detail}`;
}

function isGeneratedDisplaySummary(value = "") {
  return /发布了「.{0,120}」相关内容，重点可按|这篇内容聚焦「|本地采集条目|搜狗微信搜索结果|建议打开原文查看方法/.test(value);
}

function relevanceSummaryFromItem(item) {
  const rawSummary = item.raw?.originalSummary ?? item.raw?.relevanceSummary;
  if (typeof rawSummary === "string" && rawSummary.trim()) return stripHtml(rawSummary);
  const summary = stripHtml(item.summary ?? "");
  return isGeneratedDisplaySummary(summary) ? "" : summary;
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
  const titleText = shortenText(stripHtml(title), 52);
  const evidence = shortenText(stripHtml(summary), 82);
  const lead = evidence ? `「${titleText}」提到 ${evidence}` : `「${titleText}」来自 ${sourceName}`;
  if (/agent|智能体|auto-research|harness|skill|工具调用/.test(text)) {
    return {
      whyItMatters: `${lead}，重点价值在 Agent / Harness / 工具调用方法，适合对照团队 AI Native 与自动化研发闭环。`,
      actionText: "重点看任务拆分、工具编排、验证闭环和可复用工程抽象，判断能否迁移到 Auto-Research / Agent Coding 链路。"
    };
  }
  if (/大模型|llm|预训练|后训练|微调|推理|rag|grpo|sft|cpt|评测/.test(text)) {
    return {
      whyItMatters: `${lead}，可作为大模型训练、推理、RAG 或评测体系的技术雷达信号。`,
      actionText: "关注数据、训练、推理、RAG 或评测设计，评估是否能沉淀到轨迹/地址大模型架构。"
    };
  }
  if (/地址|地理|地图|轨迹|物流|排序|推荐系统|召回|rank|retrieval|geocod/.test(text)) {
    return {
      whyItMatters: `${lead}，与物流轨迹、地址理解或召回排序链路有交集，值得评估是否能进入多市场复制方案。`,
      actionText: "重点看数据采集、链路诊断、排序指标和线上一致性校验，判断是否可迁移到地址 Agent 自进化架构。"
    };
  }
  if (/conference|summit|大会|qcon|aicon|infoq|实践|架构|工程|developer|开发者/.test(text)) {
    return {
      whyItMatters: `${lead}，更像工程实践/技术大会线索，适合筛选其中的 AI 架构、研发提效或落地案例。`,
      actionText: "优先找可复用的工程范式、组织实践和系统架构细节，低相关议题可直接跳过。"
    };
  }
  if (/产品|发布|应用|工具|平台|workflow|工作流/.test(text)) {
    return {
      whyItMatters: `${lead}，反映 AI 产品或工具形态变化，可作为 Agent Skill 和团队提效工具选型参考。`,
      actionText: "关注它是否降低多步骤任务成本，是否支持工具调用、知识检索、自动验证或跨市场复制。"
    };
  }
  return {
    whyItMatters: `${lead}，可作为当前 OKR 的补充观察点，但需要进一步判断技术含量和可迁移性。`,
    actionText: "先快速判断它是否包含可复用方法、架构或工程经验，再决定是否进入日报深读。"
  };
}

function makeFeedItem({ sourceName, sourceKind, title, summary, sourceUrl, publishedAt, imageUrl, raw }) {
  const cleanTitle = stripHtml(title);
  const originalSummary = stripHtml(summary);
  const displaySummary = localizeSummaryForDisplay(sourceName, cleanTitle, summary);
  const recommendationSummary = originalSummary || displaySummary;
  const recommendation = buildRecommendation(cleanTitle, recommendationSummary, sourceName);
  const sourceHostname = hostnameFromUrl(sourceUrl);
  const score = relevanceScore(cleanTitle, originalSummary, sourceName);
  return {
    id: `local_${stableHash(`${sourceName}|${sourceUrl || title}|${publishedAt || ""}`)}`,
    topicId: "ai",
    sourceItemIds: [stableHash(sourceUrl || title)],
    documentIds: [],
    sourceKind,
    title: cleanTitle,
    summary: displaySummary,
    importanceScore: Math.max(58, Math.min(92, 50 + score * 4)),
    whyItMatters: recommendation.whyItMatters,
    actionText: recommendation.actionText,
    watchText: "该条目由 AI Hot Tracker 本地采集器生成；链接不可访问时请以原站搜索结果为准。",
    tags: buildTags(cleanTitle, `${originalSummary} ${displaySummary}`, sourceKind),
    sourceName,
    sourceUrl,
    sourceHostname,
    sourceIconHostname: sourceIconHostnameForSource(sourceName, sourceKind, sourceHostname),
    thumbnailUrl: imageUrl || undefined,
    imageUrl: imageUrl || undefined,
    publishedAt: normalizeDate(publishedAt),
    observedAt: new Date().toISOString(),
    raw: {
      source: collectorName,
      originalSummary,
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
    .filter((row) => row.title && row.link && isRelevantText(row.title, row.summary, sourceName))
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
  const triedUrls = new Set();
  const collectFeedUrl = async (url, parser = "rss_atom") => {
    if (triedUrls.has(url)) return;
    triedUrls.add(url);
    try {
      const xml = await fetchText(url);
      items.push(...parseFeedXml(xml, sourceName, sourceKind).map((item) => ({
        ...item,
        raw: { ...(item.raw ?? {}), parser, feedUrl: url }
      })));
    } catch (error) {
      console.warn(`rss source skipped: ${sourceName} (${error instanceof Error ? error.message : String(error)})`);
    }
  };

  for (const url of urls) {
    await collectFeedUrl(url);
    if (items.length >= localSourceLimitPerSource) break;
  }

  if (items.length < localSourceLimitPerSource) {
    for (const url of await discoverFeedUrls(sourceName, urls)) {
      await collectFeedUrl(url, "rss_discovery");
      if (items.length >= localSourceLimitPerSource) break;
    }
  }

  if (items.length < localSourceLimitPerSource && sourceHomeUrls[sourceName]) {
    items.push(...await collectWebpageSource(sourceName, sourceHomeUrls[sourceName]));
  }

  return items.slice(0, localSourceLimitPerSource);
}

async function discoverFeedUrls(sourceName, urls) {
  const homes = sourceHomeUrls[sourceName] ?? urls.map((url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}/`;
    } catch {
      return "";
    }
  }).filter(Boolean);
  const discovered = new Set();

  for (const homeUrl of homes) {
    try {
      const html = await fetchText(homeUrl, "text/html,application/xhtml+xml");
      for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
        const tag = match[0];
        const rel = getHtmlAttribute(tag, "rel").toLowerCase();
        const type = getHtmlAttribute(tag, "type").toLowerCase();
        const href = getHtmlAttribute(tag, "href");
        if (!href || !rel.includes("alternate")) continue;
        if (!/rss|atom|xml/.test(type) && !/feed|rss|atom/i.test(href)) continue;
        discovered.add(new URL(href, homeUrl).toString());
      }
    } catch {
      // Discovery is opportunistic; fall through to common feed paths.
    }

    try {
      const parsed = new URL(homeUrl);
      for (const suffix of ["/feed.xml", "/rss.xml", "/atom.xml", "/feed", "/rss"]) {
        discovered.add(`${parsed.origin}${suffix}`);
      }
    } catch {
      // Ignore invalid configured home URLs.
    }
  }

  return [...discovered];
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
    if (!isCandidateTitleRelevant(title, sourceName)) continue;
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
    const title = details.title || candidate.title;
    if (!isRelevantText(title, details.summary, sourceName)) return null;
    return makeFeedItem({
      sourceName,
      sourceKind: inferSourceKind(sourceName),
      title,
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
      const candidates = dedupeWebpageCandidates([
        ...parseAnchorsFromHtml(html, url, sourceName),
        ...await sitemapCandidatesForUrl(url)
      ]);
      for (const candidate of candidates.slice(0, localSourceLimitPerSource * 6)) {
        const item = await buildWebpageItemFromCandidate(sourceName, candidate);
        if (!item) continue;
        if (!item.title || !item.sourceUrl) continue;
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

async function sitemapCandidatesForUrl(baseUrl) {
  const candidates = [];
  const sitemapUrls = sitemapUrlsForBase(baseUrl);
  for (const sitemapUrl of sitemapUrls) {
    try {
      const xml = await fetchText(sitemapUrl, "application/xml,text/xml,text/plain");
      const locs = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1].trim()));
      const articleLocs = locs.filter((loc) => !/\.xml(?:$|\?)/i.test(loc));
      for (const loc of articleLocs) {
        if (!isLikelyArticleUrl(loc, baseUrl)) continue;
        candidates.push({ title: titleFromUrl(loc), sourceUrl: loc, baseUrl });
      }
      if (candidates.length > 0) break;
      for (const nested of locs.filter((loc) => /\.xml(?:$|\?)/i.test(loc)).slice(0, 3)) {
        const nestedXml = await fetchText(nested, "application/xml,text/xml,text/plain");
        for (const match of nestedXml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
          const loc = decodeHtml(match[1].trim());
          if (!isLikelyArticleUrl(loc, baseUrl)) continue;
          candidates.push({ title: titleFromUrl(loc), sourceUrl: loc, baseUrl });
        }
        if (candidates.length > 0) break;
      }
    } catch {
      // Sitemap fallback is best effort.
    }
    if (candidates.length > 0) break;
  }
  return candidates;
}

function sitemapUrlsForBase(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return [
      `${url.origin}/sitemap.xml`,
      `${url.origin}/sitemap_index.xml`,
      `${url.origin}/sitemap-news.xml`
    ];
  } catch {
    return [];
  }
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean).pop() ?? parsed.hostname;
    return segment.replace(/[-_]+/g, " ").replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return url;
  }
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

function huggingFacePaperUrl(id = "") {
  return `https://huggingface.co/papers/${encodeURIComponent(id)}`;
}

function normalizeHuggingFacePaper(row) {
  const paper = row?.paper ?? row;
  const id = paper?.id ?? paper?.paperId ?? paper?.arxivId ?? "";
  const title = paper?.title ?? "";
  const summary = paper?.summary ?? paper?.abstract ?? "";
  if (!id || !title || !summary) return null;
  return {
    id,
    title,
    summary,
    publishedAt: paper?.submittedOnDailyAt ?? paper?.publishedAt ?? row?.publishedAt ?? "",
    authors: (paper?.authors ?? row?.authors ?? [])
      .map((author) => typeof author === "string" ? author : author?.name)
      .filter(Boolean)
      .slice(0, 8)
  };
}

async function collectHuggingFaceDailyPapers() {
  const sourceName = huggingFaceDailyPapersSourceName;
  try {
    const rows = await fetchJsonUrl("https://huggingface.co/api/daily_papers");
    return (Array.isArray(rows) ? rows : [])
      .map(normalizeHuggingFacePaper)
      .filter(Boolean)
      .filter((paper) => isRelevantText(paper.title, paper.summary, sourceName))
      .slice(0, localSourceLimitPerSource)
      .map((paper) => makeFeedItem({
        sourceName,
        sourceKind: "website",
        title: paper.title,
        summary: paper.summary,
        sourceUrl: huggingFacePaperUrl(paper.id),
        publishedAt: paper.publishedAt,
        raw: {
          parser: "huggingface_daily_papers",
          paperId: paper.id,
          authors: paper.authors
        }
      }));
  } catch (error) {
    console.warn(`huggingface papers skipped (${error instanceof Error ? error.message : String(error)})`);
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

function normalizeBingResultUrl(rawHref = "") {
  const decoded = decodeHtml(rawHref);
  if (!decoded) return "";
  try {
    const url = new URL(decoded, "https://www.bing.com");
    const encodedTarget = url.searchParams.get("u");
    if (url.hostname.includes("bing.com") && encodedTarget) {
      const base64 = encodedTarget.replace(/^a\d/, "").replace(/-/g, "+").replace(/_/g, "/");
      const target = Buffer.from(base64, "base64").toString("utf8");
      if (/^https?:\/\//.test(target)) return target;
    }
    return url.toString();
  } catch {
    return "";
  }
}

function parseBingWeixinResults(html) {
  const rows = [];
  const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/gi) ?? [];
  for (const block of blocks) {
    const anchor = block.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const sourceUrl = normalizeBingResultUrl(anchor?.[1] ?? "");
    if (!sourceUrl.includes("mp.weixin.qq.com/")) continue;
    const title = stripHtml(anchor?.[2] ?? "");
    const summary = stripHtml(block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "");
    if (!title || !sourceUrl) continue;
    rows.push({ title, summary, sourceUrl });
  }
  return rows;
}

function decodeJsString(value = "") {
  return decodeHtml(value
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\'/g, "'")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\"));
}

function firstJsStringValue(html, names) {
  for (const name of names) {
    const match = html.match(new RegExp(`(?:var\\s+)?${name}\\s*=\\s*([\"'])([\\s\\S]*?)\\1`, "i"));
    if (match?.[2]) return decodeJsString(match[2]);
  }
  return "";
}

function extractWeixinArticleDetails(html, fallback) {
  const title = stripHtml(firstJsStringValue(html, ["msg_title"]) || firstTitleValue(html) || fallback.title);
  const summary = stripHtml(firstJsStringValue(html, ["msg_desc"]) || firstMetaContent(html, ["description", "og:description"]) || fallback.summary);
  const nickname = stripHtml(firstJsStringValue(html, ["nickname"]) || firstMetaContent(html, ["og:article:author"]));
  const ct = Number(firstJsStringValue(html, ["ct"]) || html.match(/ct\s*=\s*"?(\d{10})"?/)?.[1] || 0);
  const imageUrl = firstJsStringValue(html, ["msg_cdn_url"]) || firstMetaContent(html, ["og:image", "twitter:image"]);
  return {
    title,
    summary,
    accountName: nickname,
    publishedAt: ct > 0 ? new Date(ct * 1000).toISOString() : "",
    imageUrl
  };
}

async function collectConfiguredFeedItems(sourceName, sourceKind, urls, parserName, errors, limit) {
  const items = [];
  for (const url of urls) {
    try {
      const xml = await fetchText(url, "application/atom+xml,text/xml,application/rss+xml");
      const rows = parseFeedXml(xml, sourceName, sourceKind)
        .map((item) => ({
          ...item,
          raw: { ...(item.raw ?? {}), parser: parserName, feedUrl: url }
        }));
      items.push(...rows);
    } catch (error) {
      errors.push(`${parserName}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (items.length >= limit) break;
  }
  return dedupeItems(items).slice(0, limit);
}

async function collectWeixinFeedItems(sourceName, errors) {
  return collectConfiguredFeedItems(sourceName, "weixin_article", weixinFeedSourceUrls[sourceName] ?? [], "weixin_feed", errors, weixinLimitPerSource);
}

async function collectWeixinRsshubItems(sourceName, errors) {
  return collectConfiguredFeedItems(sourceName, "weixin_article", weixinRsshubSourceUrls[sourceName] ?? [], "weixin_rsshub", errors, weixinLimitPerSource);
}

async function collectWeixinSearchItems(sourceName, errors) {
  if (!weixinSearchEnabled || weixinSearchLimitPerSource <= 0) return [];
  const accountName = sourceAccountName(sourceName);
  const byUrl = new Map();
  const terms = weixinQueryTerms.slice(0, weixinSearchLimitPerSource);

  for (const term of terms) {
    const query = `site:mp.weixin.qq.com/s ${accountName} ${term}`;
    const url = `https://www.bing.com/search?count=10&setlang=zh-CN&q=${encodeURIComponent(query)}`;
    try {
      const html = await fetchText(url, "text/html,application/xhtml+xml");
      for (const row of parseBingWeixinResults(html)) {
        const key = row.sourceUrl.replace(/#.*$/, "");
        if (!byUrl.has(key)) byUrl.set(key, { ...row, sourceUrl: key, query });
      }
    } catch (error) {
      errors.push(`search: ${error instanceof Error ? error.message : String(error)}`);
    }
    await sleep(Math.min(weixinDelayMs, 500));
  }

  const items = [];
  for (const row of byUrl.values()) {
    try {
      const html = await fetchText(row.sourceUrl, "text/html,application/xhtml+xml");
      const details = extractWeixinArticleDetails(html, row);
      const title = details.title || row.title;
      const summary = details.summary || row.summary;
      if (!isRelevantText(title, summary, sourceName)) continue;
      items.push(makeFeedItem({
        sourceName,
        sourceKind: "weixin_article",
        title,
        summary,
        sourceUrl: row.sourceUrl,
        publishedAt: details.publishedAt || await cachedPublishedAtForUrl(sourceName, row.sourceUrl) || new Date().toISOString(),
        imageUrl: details.imageUrl,
        raw: {
          parser: "search_weixin",
          accountName: details.accountName || accountName,
          query: row.query
        }
      }));
    } catch (error) {
      errors.push(`article: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (items.length >= weixinLimitPerSource) break;
  }

  return dedupeItems(items).slice(0, weixinLimitPerSource);
}

const cachedPublishedAtBySourceUrl = new Map();

async function cachedPublishedAtForUrl(sourceName, sourceUrl) {
  const key = `${sourceName}|${sourceUrl}`;
  if (cachedPublishedAtBySourceUrl.has(key)) return cachedPublishedAtBySourceUrl.get(key);
  const cachedItems = await readCachedFeedItems();
  for (const item of cachedItems) {
    if (item.sourceName === sourceName && item.sourceUrl === sourceUrl && item.publishedAt) {
      cachedPublishedAtBySourceUrl.set(key, item.publishedAt);
      return item.publishedAt;
    }
  }
  cachedPublishedAtBySourceUrl.set(key, "");
  return "";
}

function weixinItemChannel(item) {
  if (item.raw?.parser === "weixin_feed") return "feed";
  if (item.raw?.parser === "weixin_rsshub") return "rsshub";
  if (item.raw?.parser === "search_weixin") return "search";
  if (item.raw?.parser === "sogou_weixin") return "sogou";
  if (item.raw?.parser === "manual_weixin_seed") return "seed";
  if (item.raw?.reusedFromLocalCache) return "cache";
  return "unknown";
}

function buildWeixinHealthRow(sourceName, items, errors) {
  const counts = { feed: 0, rsshub: 0, search: 0, sogou: 0, cache: 0, seed: 0, unknown: 0 };
  for (const item of items) counts[weixinItemChannel(item)] += 1;
  const realCount = counts.feed + counts.rsshub + counts.search + counts.sogou;
  const latestItem = items.find((item) => weixinItemChannel(item) !== "seed") ?? items[0];
  const latest = latestItem?.publishedAt || latestItem?.observedAt || "";
  let status = "empty";
  if (realCount > 0) status = "fresh";
  else if (counts.cache > 0) status = "cache_only";
  else if (counts.seed > 0) status = "seed_only";
  if (realCount > 0 && counts.seed + counts.cache > 0) status = "partial";
  return {
    sourceName,
    accountName: sourceAccountName(sourceName),
    status,
    latestPublishedAt: latest,
    latestTitle: latestItem?.title ?? "",
    itemCount: items.length,
    channels: Object.entries(counts).filter(([, count]) => count > 0).map(([channel]) => channel),
    counts,
    lastError: errors.at(-1) ?? "",
    generatedAt: new Date().toISOString()
  };
}

function compareWeixinItems(a, b) {
  const aIsSeed = weixinItemChannel(a) === "seed";
  const bIsSeed = weixinItemChannel(b) === "seed";
  if (aIsSeed !== bIsSeed) return aIsSeed ? 1 : -1;
  return compareItems(a, b);
}

async function collectWeixinSource(sourceName) {
  const byId = new Map();
  const accountName = sourceAccountName(sourceName);
  const errors = [];

  for (const item of await collectWeixinFeedItems(sourceName, errors)) {
    byId.set(itemIdentityKey(item), item);
  }

  for (const item of await collectWeixinRsshubItems(sourceName, errors)) {
    byId.set(itemIdentityKey(item), item);
  }

  for (const item of await collectWeixinSearchItems(sourceName, errors)) {
    byId.set(itemIdentityKey(item), item);
  }

  for (const term of weixinQueryTerms) {
    const query = `${accountName} ${term}`;
    const url = `https://weixin.sogou.com/weixin?type=2&ie=utf8&query=${encodeURIComponent(query)}`;
    try {
      const html = await fetchText(url, "text/html,application/xhtml+xml");
      const rows = parseSogouWeixinResults(html, sourceName, query)
        .filter((row) => isRelevantText(row.title, row.summary, sourceName))
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
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`sogou: ${message}`);
      console.warn(`weixin source skipped: ${sourceName} (${message})`);
      break;
    }
    await sleep(weixinDelayMs);
  }

  for (const item of await cachedItemsForSource(sourceName)) {
    const key = itemIdentityKey(item);
    if (!byId.has(key)) byId.set(key, item);
  }

  for (const item of buildManualWeixinSeeds(sourceName)) {
    const key = itemIdentityKey(item);
    if (!byId.has(key)) byId.set(key, item);
  }

  const items = [...byId.values()].sort(compareWeixinItems).slice(0, weixinLimitPerSource);
  weixinHealthRows.push(buildWeixinHealthRow(sourceName, items, errors));
  return items;
}

function buildManualWeixinSeeds(sourceName) {
  const accountName = sourceAccountName(sourceName);
  const seeds = weixinManualSeeds[sourceName] ?? [[
    `${accountName}：AI 技术文章检索入口`,
    `关注 ${accountName} 中与大模型训练推理、RAG、Agent Skill、Harness、Auto-Research、工具调用、搜索推荐、地址/物流智能或 AI Native 工程实践强相关的技术文章。`
  ]];
  const seedPublishedAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  return seeds
    .filter(([title, summary]) => isRelevantText(title, summary, sourceName))
    .map(([title, summary], index) => makeFeedItem({
      sourceName,
      sourceKind: "weixin_article",
      title,
      summary,
      sourceUrl: `https://weixin.sogou.com/weixin?type=2&ie=utf8&query=${encodeURIComponent(`${sourceAccountName(sourceName)} ${weixinQueryTerms.join(" ")}`)}`,
      publishedAt: new Date(new Date(seedPublishedAt).getTime() - index * 60_000).toISOString(),
      raw: { parser: "manual_weixin_seed", accountName: sourceAccountName(sourceName), maintainedBy: "AI Hot Tracker" }
    }));
}

function xHandleFromSource(sourceName) {
  return sourceName.match(/@([A-Za-z0-9_]+)/)?.[1] ?? "";
}

async function collectXApiItems(sourceName, handle) {
  if (!xBearerToken || !handle) return [];
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
      .filter((tweet) => isRelevantText(tweet.text, "", sourceName))
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
    console.warn(`x api source skipped: ${sourceName} (${error instanceof Error ? error.message : String(error)})`);
    return [];
  }
}

async function collectXRsshubItems(sourceName, handle) {
  if (!xRsshubFallbackEnabled || rsshubBaseUrls.length === 0 || !handle) return [];
  const urls = rsshubBaseUrls.map((baseUrl) => `${baseUrl}/twitter/user/${encodeURIComponent(handle)}/count=20&includeRts=0`);
  return collectConfiguredFeedItems(sourceName, "x", urls, "x_rsshub", [], localSourceLimitPerSource);
}

async function collectXSource(sourceName) {
  const handle = xHandleFromSource(sourceName);
  const byId = new Map();
  for (const item of await collectXApiItems(sourceName, handle)) {
    byId.set(itemIdentityKey(item), item);
  }

  if (byId.size < localSourceLimitPerSource) {
    for (const item of await collectXRsshubItems(sourceName, handle)) {
      const key = itemIdentityKey(item);
      if (!byId.has(key)) byId.set(key, item);
    }
  }

  return [...byId.values()].sort(compareItems).slice(0, localSourceLimitPerSource);
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
  if (sourceName.startsWith("X：") && !xBearerToken && (!xRsshubFallbackEnabled || rsshubBaseUrls.length === 0)) return [];
  const cachedItems = await readCachedFeedItems();
  return cachedItems
    .filter((item) => item.sourceName === sourceName)
    .filter((item) => sourceName !== huggingFaceDailyPapersSourceName || item.raw?.parser === "huggingface_daily_papers")
    .filter((item) => item.raw?.parser !== "manual_weixin_seed")
    .filter((item) => !isLowDetailWebpageItem(item))
    .filter((item) => isRelevantText(item.title, relevanceSummaryFromItem(item), item.sourceName))
    .map((item) => normalizeCachedItem(item))
    .filter((item) => isRelevantText(item.title, relevanceSummaryFromItem(item), item.sourceName));
}

function isLowDetailWebpageItem(item) {
  return item.raw?.parser === "html_anchor" || /相关链接/.test(item.summary ?? "") || /详情页.{0,8}(摘要|访问|线索)/.test(item.summary ?? "");
}

function normalizeCachedItem(item) {
  const title = stripHtml(item.title);
  const sourceKind = item.sourceKind || inferSourceKind(item.sourceName);
  const sourceHostname = item.sourceHostname || hostnameFromUrl(item.sourceUrl);
  const originalSummary = relevanceSummaryFromItem(item);
  const summary = localizeSummaryForDisplay(item.sourceName, title, originalSummary || item.summary);
  const recommendation = buildRecommendation(title, originalSummary || summary, item.sourceName);
  const score = relevanceScore(title, originalSummary, item.sourceName);
  return {
    ...item,
    sourceKind,
    title,
    summary,
    importanceScore: Math.max(58, Math.min(92, 50 + score * 4)),
    whyItMatters: recommendation.whyItMatters,
    actionText: recommendation.actionText,
    tags: buildTags(title, `${originalSummary} ${summary}`, sourceKind),
    sourceHostname,
    sourceIconHostname: sourceIconHostnameForSource(item.sourceName, sourceKind, sourceHostname),
    observedAt: new Date().toISOString(),
    raw: { ...(item.raw ?? {}), originalSummary, reusedFromLocalCache: true }
  };
}

function itemIdentityKey(item) {
  return item.sourceUrl || item.id;
}

async function collectSource(sourceName) {
  if (sourceName.startsWith("公众号：")) {
    const items = await collectWeixinSource(sourceName);
    console.log(`source: ${sourceName} -> ${items.length} items`);
    return items;
  }

  let fresh = [];
  if (sourceName === arxivSourceName) fresh = await collectArxivSource();
  else if (sourceName === huggingFaceDailyPapersSourceName) fresh = await collectHuggingFaceDailyPapers();
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
  const bySourceTitle = new Map();
  for (const item of byId.values()) {
    const key = `${item.sourceName}|${stripHtml(item.title).toLowerCase()}`;
    const existing = bySourceTitle.get(key);
    if (!existing || compareItems(item, existing) < 0 || item.importanceScore > existing.importanceScore) {
      bySourceTitle.set(key, item);
    }
  }
  return [...bySourceTitle.values()].sort(compareItems);
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
    sourceIconHostname: sourceIconHostnameForSource(sourceName, inferSourceKind(sourceName)),
    count: counts.get(sourceName) ?? 0
  }));
}

function itemTimestamp(item) {
  const timestamp = Date.parse(item.publishedAt || item.observedAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function itemAgeHours(item) {
  const timestamp = itemTimestamp(item);
  if (!timestamp) return -1;
  return Math.max(0, Math.round((Date.now() - timestamp) / 36_000) / 100);
}

function itemCollectionChannel(item) {
  if (item.raw?.parser === "manual_weixin_seed") return "seed";
  if (item.raw?.reusedFromLocalCache) return "cache";
  return item.raw?.parser || "direct";
}

function isManualSeedItem(item) {
  return item.raw?.parser === "manual_weixin_seed";
}

function isCacheFallbackItem(item) {
  return Boolean(item.raw?.reusedFromLocalCache);
}

function isStaleCacheItem(item) {
  if (!isCacheFallbackItem(item)) return false;
  const timestamp = itemTimestamp(item);
  return timestamp > 0 && Date.now() - timestamp > dailyCacheFreshnessDays * 24 * 60 * 60 * 1000;
}

function isDailyEligibleItem(item) {
  return !isManualSeedItem(item) && !isStaleCacheItem(item);
}

function recommendedActionForSource(sourceName, status) {
  if (status === "fresh") return "保持当前采集通道，持续监控最新时间。";
  if (status === "partial") return "补强主通道或备用 feed，减少对缓存/种子兜底的依赖。";
  if (status === "cache_only") return "补充稳定 RSS/RSSHub/API 或站点专用解析器，避免缓存过期。";
  if (status === "seed_only") return "补充授权 feed/RSSHub/第三方订阅源；种子内容不进入日报。";
  if (status === "stale") return "检查主通道是否失效，并补充 sitemap、RSS discovery 或备用 URL。";
  if (sourceName.startsWith("X：")) return "配置 X_BEARER_TOKEN，或替换为博客、Newsletter、官网/RSS 镜像源。";
  return "补充主通道 URL 或移出活跃信息源列表。";
}

function buildSourceHealthRows(sourceNames, items) {
  const bySource = new Map();
  for (const item of items) {
    const rows = bySource.get(item.sourceName) ?? [];
    rows.push(item);
    bySource.set(item.sourceName, rows);
  }

  return [...sourceNames].map((sourceName) => {
    const sourceItems = (bySource.get(sourceName) ?? []).sort(compareItems);
    const counts = { fresh: 0, cache: 0, seed: 0 };
    const parsers = {};
    const channels = new Set();
    for (const item of sourceItems) {
      const channel = itemCollectionChannel(item);
      channels.add(channel);
      parsers[item.raw?.parser || "unknown"] = (parsers[item.raw?.parser || "unknown"] ?? 0) + 1;
      if (channel === "seed") counts.seed += 1;
      else if (channel === "cache") counts.cache += 1;
      else counts.fresh += 1;
    }

    const latestItem = sourceItems.find((item) => !isManualSeedItem(item)) ?? sourceItems[0];
    const latestAgeHours = latestItem ? itemAgeHours(latestItem) : -1;
    let status = "empty";
    if (sourceItems.length > 0 && counts.seed === sourceItems.length) status = "seed_only";
    else if (sourceItems.length > 0 && counts.fresh === 0 && counts.cache > 0) status = "cache_only";
    else if (counts.fresh > 0 && counts.cache + counts.seed > 0) status = "partial";
    else if (counts.fresh > 0) status = "fresh";
    if (latestAgeHours >= 0 && latestAgeHours > sourceHealthStaleHours && status !== "seed_only" && status !== "empty") {
      status = "stale";
    }

    return {
      sourceName,
      sourceKind: inferSourceKind(sourceName),
      status,
      itemCount: sourceItems.length,
      freshCount: counts.fresh,
      cacheCount: counts.cache,
      seedCount: counts.seed,
      latestPublishedAt: latestItem?.publishedAt || latestItem?.observedAt || "",
      latestTitle: latestItem?.title ?? "",
      latestAgeHours,
      channels: [...channels],
      parsers,
      recommendedAction: recommendedActionForSource(sourceName, status),
      generatedAt: new Date().toISOString()
    };
  });
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
  if (/地址|地理|地图|轨迹|物流|排序|推荐系统|召回|ranking|retrieval|geocod/.test(text)) return "物流、地址与召排";
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
      summary: dailyItemSummary(item),
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

function dailyItemSummary(item) {
  const summary = stripHtml(item.summary ?? "").trim();
  if (summary && !/^来自.+的这条内容命中 AI 技术关键词/u.test(summary)) return shortenText(summary, 280);
  const reason = stripHtml(item.whyItMatters ?? "").trim();
  if (reason && !/^来自.+的这条内容命中 AI 技术关键词/u.test(reason)) return shortenText(reason, 280);
  return `这条信号来自 ${item.sourceName}，可继续打开原文判断是否与模型训练/推理、Agent 工程或多市场复制落地相关。`;
}

function buildDailyReportsForDate(date, items, catalogByTopic) {
  const dailyItems = items.filter(isDailyEligibleItem);
  const sameDay = dailyItems.filter((item) => itemDate(item) === date);
  const base = sameDay.length > 0 ? sameDay : dailyItems.slice(0, 30);
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
  const sourceHealthRows = buildSourceHealthRows(sourceNames, feedItems);

  await writeJson("topics.json", { items: topics });
  await writeJson("sources.json", { items: sourceFacets });
  await writeJson("feed.json", { items: feedItems, total: feedItems.length });
  await writeJson("weixin-health.json", { items: weixinHealthRows.sort((a, b) => a.sourceName.localeCompare(b.sourceName)) });
  await writeJson("source-health.json", { items: sourceHealthRows });
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
