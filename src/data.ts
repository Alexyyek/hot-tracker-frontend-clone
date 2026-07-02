import type { AppData, FeedItem, FeedQuery, SourceFacet, Topic, TopicCount } from "./types";

export function sortTopics(topics: Topic[]) {
  return [...topics]
    .filter((topic) => topic.enabled)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title));
}

export function getTopicTitle(topics: Topic[], topicId: string) {
  return topics.find((topic) => topic.id === topicId)?.title ?? topicId;
}

export function getTopicAccent(topics: Topic[], topicId?: string) {
  if (!topicId) return "var(--topic-all)";
  return topics.find((topic) => topic.id === topicId)?.ui?.accent ?? "var(--topic-fallback)";
}

export function getTopicCount(topicCounts: TopicCount[], topicId: string) {
  return topicCounts.find((count) => count.topicId === topicId)?.count ?? 0;
}

export function groupFeedItemsByDay(items: FeedItem[]) {
  const groups = new Map<string, FeedItem[]>();
  for (const item of items) {
    const key = item.publishedAt.slice(0, 10);
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }
  return [...groups.entries()].map(([date, dayItems]) => ({ date, items: dayItems }));
}

export function formatDateLabel(date: string) {
  if (date === formatDateInput()) return "今天";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${date}T00:00:00`));
}

export function formatDayCountLabel(date: string, count: number) {
  return `${formatDateLabel(date)}  ${count} 条动态`;
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatDateInput(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

export function sourceKindLabel(kind: string) {
  const labels: Record<string, string> = {
    github: "GitHub",
    x: "X",
    weixin_article: "微信",
    weixin: "微信",
    public_disclosure: "政治人物",
    sec_filing: "SEC",
    sec: "SEC",
    website: "网站",
    rss: "RSS",
    topic_watcher: "主题"
  };
  return labels[kind] ?? kind;
}

export function sourceKindIconText(kind: string, sourceName = "") {
  if (kind === "github" || sourceName.toLowerCase().includes("github")) return "GH";
  if (kind === "weixin" || kind === "weixin_article" || sourceName.includes("公众号")) return "微";
  if (kind === "x") return "𝕏";
  if (kind === "sec" || kind === "sec_filing") return "SEC";
  if (kind === "public_disclosure") return "政";
  if (kind === "website") return "网";
  return sourceKindLabel(kind).slice(0, 2);
}

export function sourceIconUrl(
  kind: string,
  sourceAvatarUrl?: string,
  sourceHostname?: string,
  sourceIconHostname?: string
) {
  if (sourceAvatarUrl) return sourceAvatarUrl;
  const hostname = sourceIconHostname ?? sourceHostname;
  if (hostname) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  }
  if (kind === "github") return "https://www.google.com/s2/favicons?domain=github.com&sz=64";
  return "";
}

export function sourceKindClass(kind: string) {
  return `source-kind-${kind.replace(/_/g, "-")}`;
}

export function visibleSourceFacets(facets: SourceFacet[], query: FeedQuery) {
  return facets
    .filter((facet) => !query.sourceKind || facet.sourceKind === query.sourceKind)
    .slice(0, 18);
}

export function extractPortfolioName(item: FeedItem) {
  const raw = item.raw;
  const portfolio = raw?.portfolio;
  if (portfolio && typeof portfolio === "object" && !Array.isArray(portfolio)) {
    const candidate = portfolio as Record<string, unknown>;
    return String(candidate.managerName ?? candidate.managerId ?? item.title);
  }
  return item.title;
}

export function readAppCache(): AppData | null {
  try {
    const raw = localStorage.getItem("hot-tracker-cache-v2");
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function writeAppCache(data: AppData) {
  try {
    localStorage.setItem("hot-tracker-cache-v2", JSON.stringify(data));
  } catch {
    // Cache is opportunistic.
  }
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
