export type ThemeMode = "light" | "dark" | "system";
export type ActiveTab = "feed" | "daily";
export type ToastKind = "success" | "error" | "warning";

export interface Topic {
  id: string;
  title: string;
  sourceKind: string;
  sourceTopicId: string;
  enabled: boolean;
  displayOrder: number;
  ui?: {
    icon?: string;
    accent?: string;
    hideFromAllTimeline?: boolean;
  };
}

export interface FeedItem {
  id: string;
  topicId: string;
  sourceItemIds: string[];
  documentIds: string[];
  sourceKind: string;
  title: string;
  summary: string;
  importanceScore: number;
  whyItMatters?: string;
  actionText?: string;
  watchText?: string;
  tags: string[];
  sourceName: string;
  sourceUrl: string;
  sourceAvatarUrl?: string;
  sourceHostname?: string;
  sourceIconHostname?: string;
  publishedAt: string;
  observedAt: string;
  raw?: Record<string, unknown>;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor?: string;
  total?: number;
}

export interface FeedItemDetailResponse {
  item: FeedItem;
}

export interface SourceFacet {
  sourceKind: string;
  sourceName: string;
  sourceHostname?: string;
  sourceIconHostname?: string;
  sourceAvatarUrl?: string;
  count: number;
}

export interface TopicCount {
  topicId: string;
  count: number;
}

export interface FeedQuery {
  topicId?: string;
  since?: string;
  until?: string;
  publishedSince?: string;
  publishedUntil?: string;
  sourceKind?: string;
  sourceName?: string;
  sourceHostname?: string;
  minImportance?: number;
  limit?: number;
  cursor?: string;
  raw?: "compact" | "full";
  total?: "none" | "count";
}

export interface DailyReportItem {
  title: string;
  summary: string;
  insightLabel?: string;
  insightText?: string;
  sourceFeedItemIds: string[];
  confidence?: number;
}

export interface DailyReportSection {
  title: string;
  items: DailyReportItem[];
}

export interface DailyReport {
  id: string;
  topicId: string;
  reportDate: string;
  title: string;
  mainLine: string;
  actionItems: string[];
  watchItems: string[];
  sections: DailyReportSection[];
  referencedFeedItemIds: string[];
  generatedAt: string;
  model?: string;
  raw?: Record<string, unknown>;
}

export interface DailyReportsResponse {
  items: DailyReport[];
}

export interface GitHubTrendingRepository {
  fullName: string;
  language?: string;
  topics?: string[];
  totalStars?: number;
  url: string;
}

export interface GitHubTrendingRanking {
  language?: string;
  period: string;
  rank: number;
  starsPeriod?: number;
  totalStars?: number;
}

export interface GitHubTrendingSnapshot {
  repository?: GitHubTrendingRepository;
  firstSeen?: GitHubTrendingRanking;
  rankings?: Record<string, GitHubTrendingRanking>;
  type?: string;
}

export interface GitHubTrendingResponse {
  snapshots: GitHubTrendingSnapshot[];
}

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface AppData {
  topics: Topic[];
  feed: FeedResponse;
  sourceFacets: SourceFacet[];
  topicCounts: TopicCount[];
  dailyReports: DailyReport[];
}
