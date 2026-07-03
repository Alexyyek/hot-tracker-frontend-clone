import type {
  DailyReport,
  DailyReportsResponse,
  FeedItem,
  FeedItemDetailResponse,
  FeedQuery,
  FeedResponse,
  GitHubTrendingResponse,
  SourceFacet,
  Topic,
  TopicCount
} from "./types";

interface StaticDataMeta {
  generatedAt?: string;
  collectorName?: string;
}

interface StaticDataFile<T> extends StaticDataMeta {
  items: T[];
  nextCursor?: string;
  total?: number;
}

const jsonHeaders = {
  Accept: "application/json"
};

const useStaticData = import.meta.env.VITE_DATA_MODE === "static" || import.meta.env.PROD;
const staticDataBase = `${import.meta.env.BASE_URL}data`;
let staticFeedCache: Promise<StaticDataFile<FeedItem>> | null = null;
let staticDataVersion = "";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: jsonHeaders });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
}

function toSearchParams(query: FeedQuery = {}) {
  const params = new URLSearchParams();
  const normalized: FeedQuery = {
    limit: 50,
    raw: "compact",
    total: "none",
    ...query
  };

  for (const [key, value] of Object.entries(normalized)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params;
}

function staticDataPath(path: string) {
  const version = staticDataVersion ? `${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(staticDataVersion)}` : "";
  return `${staticDataBase}/${path.replace(/^\//, "")}${version}`;
}

async function fetchStaticJson<T>(path: string): Promise<T> {
  return fetchJson<T>(staticDataPath(path));
}

async function getStaticFeedData() {
  staticFeedCache ??= fetchStaticJson<StaticDataFile<FeedItem>>("feed.json");
  return staticFeedCache;
}

export function isStaticDataMode() {
  return useStaticData;
}

export function forceRefreshStaticData() {
  staticDataVersion = String(Date.now());
  staticFeedCache = null;
}

function itemTime(item: FeedItem) {
  return item.publishedAt || item.observedAt || "";
}

function matchesStaticFeedQuery(item: FeedItem, query: FeedQuery = {}) {
  if (query.topicId && item.topicId !== query.topicId) return false;
  if (query.sourceKind && item.sourceKind !== query.sourceKind) return false;
  if (query.sourceName || query.sourceHostname) {
    const matchesSourceName = query.sourceName ? item.sourceName === query.sourceName : false;
    const matchesSourceHostname = query.sourceHostname ? item.sourceHostname === query.sourceHostname : false;
    if (!matchesSourceName && !matchesSourceHostname) return false;
  }
  if (query.minImportance && item.importanceScore < query.minImportance) return false;
  if (query.publishedSince && itemTime(item) < query.publishedSince) return false;
  if (query.publishedUntil && itemTime(item) > query.publishedUntil) return false;
  if (query.since && item.observedAt < query.since) return false;
  if (query.until && item.observedAt > query.until) return false;
  return true;
}

function paginateStaticItems(items: FeedItem[], query: FeedQuery = {}): FeedResponse {
  const shouldReturnFullScope = Boolean(query.topicId || query.sourceName || query.sourceHostname || query.sourceKind);
  const limit = shouldReturnFullScope ? items.length : Number(query.limit ?? 50);
  const offset = Number(query.cursor ?? 0);
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems,
    nextCursor: nextOffset < items.length ? String(nextOffset) : undefined,
    total: query.total === "count" ? items.length : undefined
  };
}

export function cleanFeedQuery(query: FeedQuery): FeedQuery {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== "")
  ) as FeedQuery;
}

export async function getTopics(): Promise<Topic[]> {
  if (useStaticData) {
    const data = await fetchStaticJson<StaticDataFile<Topic>>("topics.json");
    return data.items;
  }
  const data = await fetchJson<{ items: Topic[] }>("/api/topics");
  return data.items;
}

export async function getFeed(query: FeedQuery = {}): Promise<FeedResponse> {
  if (useStaticData) {
    const data = await getStaticFeedData();
    const items = data.items
      .filter((item) => matchesStaticFeedQuery(item, query))
      .sort((a, b) => itemTime(b).localeCompare(itemTime(a)));
    return paginateStaticItems(items, query);
  }
  const params = toSearchParams(query);
  return fetchJson<FeedResponse>(`/api/feed?${params.toString()}`);
}

export async function getFeedItem(id: string): Promise<FeedItem> {
  if (useStaticData) {
    const data = await getStaticFeedData();
    const item = data.items.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`Static feed item not found: ${id}`);
    return item;
  }
  const data = await fetchJson<FeedItemDetailResponse>(`/api/feed/${encodeURIComponent(id)}?raw=full`);
  return data.item;
}

export async function getSourceFacets(query: FeedQuery = {}): Promise<SourceFacet[]> {
  if (useStaticData) {
    const data = await fetchStaticJson<StaticDataFile<SourceFacet>>("sources.json");
    return data.items.filter((facet) => {
      if (query.sourceKind && facet.sourceKind !== query.sourceKind) return false;
      return true;
    });
  }
  const params = toSearchParams({
    topicId: query.topicId,
    since: query.since,
    until: query.until,
    minImportance: query.minImportance
  });
  const data = await fetchJson<{ items: SourceFacet[] }>(`/api/feed/sources?${params.toString()}`);
  return data.items;
}

export async function getTopicCounts(query: FeedQuery = {}): Promise<TopicCount[]> {
  if (useStaticData) {
    const data = await fetchStaticJson<StaticDataFile<TopicCount>>("topic-counts.json");
    return data.items;
  }
  const params = toSearchParams({
    since: query.since,
    until: query.until,
    minImportance: query.minImportance
  });
  const data = await fetchJson<{ items: TopicCount[] }>(`/api/feed/topic-counts?${params.toString()}`);
  return data.items;
}

export async function getDailyLatest(): Promise<DailyReport[]> {
  if (useStaticData) {
    const data = await fetchStaticJson<DailyReportsResponse>("daily/latest.json");
    return data.items;
  }
  const data = await fetchJson<DailyReportsResponse>("/api/daily/latest?raw=compact&topItems=none");
  return data.items;
}

export async function getDailyReports(date: string): Promise<DailyReport[]> {
  if (useStaticData) {
    try {
      const data = await fetchStaticJson<DailyReportsResponse>(`daily/${date}.json`);
      return data.items;
    } catch {
      return [];
    }
  }
  const params = new URLSearchParams({
    date,
    raw: "compact",
    topItems: "none"
  });
  const data = await fetchJson<DailyReportsResponse>(`/api/daily?${params.toString()}`);
  return data.items;
}

export async function getGitHubTrending(): Promise<GitHubTrendingResponse> {
  if (useStaticData) return { snapshots: [] };
  return fetchJson<GitHubTrendingResponse>("/api/github/trending");
}
