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

const jsonHeaders = {
  Accept: "application/json"
};

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

export function cleanFeedQuery(query: FeedQuery): FeedQuery {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== "")
  ) as FeedQuery;
}

export async function getTopics(): Promise<Topic[]> {
  const data = await fetchJson<{ items: Topic[] }>("/api/topics");
  return data.items;
}

export async function getFeed(query: FeedQuery = {}): Promise<FeedResponse> {
  const params = toSearchParams(query);
  return fetchJson<FeedResponse>(`/api/feed?${params.toString()}`);
}

export async function getFeedItem(id: string): Promise<FeedItem> {
  const data = await fetchJson<FeedItemDetailResponse>(`/api/feed/${encodeURIComponent(id)}?raw=compact`);
  return data.item;
}

export async function getSourceFacets(query: FeedQuery = {}): Promise<SourceFacet[]> {
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
  const params = toSearchParams({
    since: query.since,
    until: query.until,
    minImportance: query.minImportance
  });
  const data = await fetchJson<{ items: TopicCount[] }>(`/api/feed/topic-counts?${params.toString()}`);
  return data.items;
}

export async function getDailyLatest(): Promise<DailyReport[]> {
  const data = await fetchJson<DailyReportsResponse>("/api/daily/latest?raw=compact&topItems=none");
  return data.items;
}

export async function getDailyReports(date: string): Promise<DailyReport[]> {
  const params = new URLSearchParams({
    date,
    raw: "compact",
    topItems: "none"
  });
  const data = await fetchJson<DailyReportsResponse>(`/api/daily?${params.toString()}`);
  return data.items;
}

export async function getGitHubTrending(): Promise<GitHubTrendingResponse> {
  return fetchJson<GitHubTrendingResponse>("/api/github/trending");
}
