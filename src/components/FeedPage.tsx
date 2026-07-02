import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter, RefreshCw, X } from "lucide-react";
import { cleanFeedQuery, forceRefreshStaticData, getFeed, getSourceFacets, getTopicCounts, isStaticDataMode } from "../api";
import { getTopicTitle, sourceKindLabel } from "../data";
import {
  filterAiFeedItems,
  filterAiSourceFacets,
  getAiTopicCounts,
  mergeAiCatalogSources,
  toBackendFeedQuery
} from "../aiTopics";
import type { FeedItem, FeedQuery, SourceFacet, ToastMessage, Topic, TopicCount } from "../types";
import { FilterPanel } from "./FilterPanel";
import { EmptyView, ErrorView, InlineWarning, LoadMoreButton, LoadingView } from "./StatusViews";
import { FeedTimeline } from "./FeedTimeline";
import { ShareDialog } from "./ShareDialog";
import { WhalePortfolioPanel } from "./SpecialPanels";

interface FeedPageProps {
  initialItems: FeedItem[];
  initialNextCursor?: string;
  initialSourceFacets: SourceFacet[];
  initialTopicCounts: TopicCount[];
  initialTotal?: number;
  onToast: (kind: ToastMessage["kind"], message: string) => void;
  topics: Topic[];
}

const baseQuery: FeedQuery = {
  limit: 50,
  raw: "compact",
  total: "none"
};

const realtimeRefreshMs = 30 * 60_000;

export function FeedPage({
  initialItems,
  initialNextCursor,
  initialSourceFacets,
  initialTopicCounts,
  initialTotal,
  onToast,
  topics
}: FeedPageProps) {
  const [query, setQuery] = useState<FeedQuery>(baseQuery);
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [total, setTotal] = useState(initialTotal);
  const [sourceFacets, setSourceFacets] = useState(initialSourceFacets);
  const [topicCounts, setTopicCounts] = useState(initialTopicCounts);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [warning, setWarning] = useState("");
  const [fatalError, setFatalError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareItem, setShareItem] = useState<FeedItem | null>(null);
  const [sourceRefresh, setSourceRefresh] = useState({ running: false, checked: 0, total: 0, lastUpdated: "" });
  const requestId = useRef(0);
  const sourceRefreshId = useRef(0);
  const itemsRef = useRef(initialItems);
  const sourceFacetsRef = useRef(initialSourceFacets);
  const queryRef = useRef(baseQuery);

  const title = query.topicId ? getTopicTitle(topics, query.topicId) : "全部 AI";

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    sourceFacetsRef.current = sourceFacets;
  }, [sourceFacets]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const visibleItems = useMemo(() => {
    const aiItems = filterAiFeedItems(items, query.topicId);
    const scopedItems = aiItems.filter((item) => matchesFeedQuery(item, query));
    const sourceFallbackItems = query.sourceName && scopedItems.length === 0
      ? items.filter((item) => matchesFeedQuery(item, query) && item.importanceScore > 0).slice(0, 8)
      : scopedItems;
    if (!keyword.trim()) return sourceFallbackItems;
    const needle = keyword.trim().toLowerCase();
    return sourceFallbackItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(needle) ||
        item.summary.toLowerCase().includes(needle) ||
        item.sourceName.toLowerCase().includes(needle)
      );
    });
  }, [items, keyword, query.minImportance, query.sourceHostname, query.sourceKind, query.sourceName, query.topicId]);

  const refreshAggregate = useCallback(async (nextQuery: FeedQuery, options: { forceStaticRefresh?: boolean; silent?: boolean } = {}) => {
    const id = ++requestId.current;
    if (!options.silent) setLoading(true);
    setWarning("");
    setFatalError("");
    try {
      if (options.forceStaticRefresh) forceRefreshStaticData();
      const cleanQuery = cleanFeedQuery(toBackendFeedQuery({ ...nextQuery, cursor: undefined }));
      const sourceQuery = cleanFeedQuery({ ...baseQuery, minImportance: nextQuery.minImportance });
      const [feed, facets, counts] = await Promise.all([
        getFeed(cleanQuery),
        getSourceFacets(sourceQuery),
        getTopicCounts(cleanQuery)
      ]);
      if (id === requestId.current) {
        setItems((current) => mergeItems(current, feed.items));
        setNextCursor(feed.nextCursor);
        setTotal(feed.total);
        setSourceFacets(facets);
        setTopicCounts(counts);
        if (itemsRef.current.length > 0) {
          const newCount = feed.items.filter((item) => !itemsRef.current.find((old) => old.id === item.id)).length;
          if (newCount > 0) onToast("success", `新增 ${newCount} 条动态`);
        }
      }
    } catch (error) {
      if (id === requestId.current) {
        const message = error instanceof Error ? error.message : "动态加载失败，请稍后查看日志。";
        if (itemsRef.current.length > 0) {
          if (!options.silent) setWarning("刷新失败，正在展示上次加载的数据。");
        } else {
          setFatalError(message);
        }
      }
    } finally {
      if (id === requestId.current && !options.silent) {
        setLoading(false);
      }
    }
  }, [onToast]);

  const refreshCatalogSources = useCallback(async (nextQuery: FeedQuery = queryRef.current) => {
    if (sourceRefresh.running) return;
    if (isStaticDataMode()) {
      setSourceRefresh({ running: true, checked: 0, total: 1, lastUpdated: sourceRefresh.lastUpdated });
      await refreshAggregate(nextQuery, { forceStaticRefresh: true, silent: true });
      setSourceRefresh({
        running: false,
        checked: 1,
        total: 1,
        lastUpdated: new Date().toISOString()
      });
      onToast("success", "已重新读取最新静态快照");
      return;
    }
    const runId = ++sourceRefreshId.current;
    const candidateSources = mergeAiCatalogSources(sourceFacetsRef.current, nextQuery.topicId).filter((source) => {
      if (nextQuery.sourceKind && source.sourceKind !== nextQuery.sourceKind) return false;
      if (nextQuery.sourceName && source.sourceName !== nextQuery.sourceName) return false;
      return true;
    });
    const sources = candidateSources.length > 0 ? candidateSources : sourceFacetsRef.current;
    const totalSources = sources.length;
    let checked = 0;
    const collected: FeedItem[] = [];
    const concurrency = 4;

    setSourceRefresh({ running: true, checked: 0, total: totalSources, lastUpdated: sourceRefresh.lastUpdated });

    async function worker(offset: number) {
      for (let index = offset; index < sources.length; index += concurrency) {
        if (runId !== sourceRefreshId.current) return;
        const source = sources[index];
        try {
          const response = await getFeed(cleanFeedQuery({
            limit: 8,
            raw: "compact",
            total: "none",
            sourceKind: source.sourceKind,
            sourceHostname: source.sourceHostname,
            sourceName: source.sourceHostname ? undefined : source.sourceName,
            minImportance: nextQuery.minImportance
          }));
          collected.push(...response.items);
        } catch {
          // Individual sources can fail without blocking the rest of the refresh.
        } finally {
          checked += 1;
          if (runId === sourceRefreshId.current) {
            setSourceRefresh((current) => ({ ...current, running: true, checked, total: totalSources }));
          }
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, sources.length)) }, (_, index) => worker(index)));

    if (runId === sourceRefreshId.current) {
      setItems((current) => mergeItems(current, collected));
      setSourceRefresh({
        running: false,
        checked: totalSources,
        total: totalSources,
        lastUpdated: new Date().toISOString()
      });
      const newCount = collected.filter((item) => !itemsRef.current.find((old) => old.id === item.id)).length;
      onToast("success", `已刷新 ${totalSources} 个信息源${newCount > 0 ? `，新增 ${newCount} 条` : ""}`);
    }
  }, [onToast, refreshAggregate, sourceRefresh.lastUpdated, sourceRefresh.running]);

  useEffect(() => {
    void refreshAggregate(query);
  }, [query.topicId, query.sourceKind, query.sourceName, query.sourceHostname, query.minImportance, refreshAggregate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshAggregate(queryRef.current, { forceStaticRefresh: isStaticDataMode(), silent: true });
      }
    }, realtimeRefreshMs);
    return () => window.clearInterval(timer);
  }, [refreshAggregate]);

  const handleQueryChange = (nextQuery: FeedQuery) => {
    setQuery(cleanFeedQuery({ ...nextQuery, cursor: undefined }));
    setDrawerOpen(false);
  };

  const handleReset = () => {
    setQuery(baseQuery);
    setKeyword("");
    setDrawerOpen(false);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setWarning("");
    try {
      const feed = await getFeed(toBackendFeedQuery({ ...query, cursor: nextCursor }));
      setItems((current) => mergeItems(current, feed.items));
      setNextCursor(feed.nextCursor);
      setTotal(feed.total ?? total);
    } catch {
      setWarning("更多动态加载失败，请稍后重试。");
    } finally {
      setLoadingMore(false);
    }
  };

  const filters = (
    <FilterPanel
      keyword={keyword}
      onKeywordChange={setKeyword}
      onQueryChange={handleQueryChange}
      onReset={handleReset}
      query={query}
      sourceFacets={filterAiSourceFacets(sourceFacets, query.topicId)}
      topicCounts={getAiTopicCounts(items, sourceFacets, topicCounts)}
      topics={topics}
    />
  );

  if (fatalError) {
    return <ErrorView message={fatalError} onRetry={handleReset} />;
  }

  return (
    <main className="feed-layout">
      <div className="desktop-filter">{filters}</div>
      <section className="feed-main content-panel">
        <div className="panel-header">
          <div className="feed-panel-title-block">
            <p className="section-kicker">实时流</p>
            <h2>{query.topicId ? title : "AI 动态"}</h2>
          </div>
          <div className="panel-header-actions">
            <button
              className="source-refresh-button"
              disabled={sourceRefresh.running}
              onClick={() => void refreshCatalogSources(query)}
              type="button"
              title={isStaticDataMode() ? "重新读取 GitHub Pages 最新静态快照" : "逐个信息源抓取最新内容"}
            >
              <RefreshCw size={15} className={sourceRefresh.running ? "is-spinning" : ""} />
              {sourceRefresh.running ? `${sourceRefresh.checked}/${sourceRefresh.total}` : isStaticDataMode() ? "刷新快照" : "刷新全部源"}
            </button>
            <button className="mobile-filter-toggle" onClick={() => setDrawerOpen(true)} type="button">
              <Filter size={16} />
              筛选
            </button>
            <span className="panel-count">{visibleItems.length} 条</span>
          </div>
        </div>

        <InlineWarning message={warning} />
        <RealtimeStatus sourceRefresh={sourceRefresh} />
        <ActiveFilterStrip keyword={keyword} query={query} topics={topics} onReset={handleReset} />
        {loading && items.length === 0 ? <LoadingView /> : null}
        {!loading && visibleItems.length === 0 ? <EmptyView onReset={handleReset} /> : null}
        <WhalePortfolioPanel active={query.topicId === "whale-portfolio"} items={items} />
        {visibleItems.length > 0 ? <FeedTimeline items={visibleItems} onShare={setShareItem} topics={topics} /> : null}
        {nextCursor && visibleItems.length > 0 ? (
          <LoadMoreButton disabled={loading} loading={loadingMore} onClick={loadMore} />
        ) : null}
      </section>

      {drawerOpen ? (
        <div className="filter-drawer">
          <button className="filter-drawer-backdrop" onClick={() => setDrawerOpen(false)} type="button" aria-label="关闭筛选" />
          <div className="filter-sheet">
            <div className="filter-sheet-header">
              <strong>筛选</strong>
              <button className="icon-button" onClick={() => setDrawerOpen(false)} type="button" title="关闭">
                <X size={18} />
              </button>
            </div>
            {filters}
          </div>
        </div>
      ) : null}
      <ShareDialog item={shareItem} onClose={() => setShareItem(null)} onCopied={() => onToast("success", "分享链接已复制")} />
    </main>
  );
}

function ActiveFilterStrip({
  keyword,
  onReset,
  query,
  topics
}: {
  keyword: string;
  onReset: () => void;
  query: FeedQuery;
  topics: Topic[];
}) {
  const active = [
    query.topicId ? getTopicTitle(topics, query.topicId) : "",
    query.sourceKind ? sourceKindLabel(query.sourceKind) : "",
    query.sourceName ?? "",
    query.minImportance ? `${query.minImportance}+` : "",
    keyword.trim()
  ].filter(Boolean);

  if (active.length === 0) return null;

  return (
    <div className="active-tag-strip">
      {active.map((item) => (
        <span className="active-tag" key={item}>
          {item}
        </span>
      ))}
      <button onClick={onReset} type="button">
        清空
      </button>
    </div>
  );
}

function RealtimeStatus({
  sourceRefresh
}: {
  sourceRefresh: {
    running: boolean;
    checked: number;
    total: number;
    lastUpdated: string;
  };
}) {
  if (!sourceRefresh.running && !sourceRefresh.lastUpdated) {
    return (
      <div className="realtime-status">
        {isStaticDataMode()
          ? "静态站点由 GitHub Actions 定时采集，页面每 30 分钟自动读取最新快照。"
          : "实时更新已开启，每 30 分钟自动拉取最新动态。"}
      </div>
    );
  }

  const label = sourceRefresh.running
    ? isStaticDataMode()
      ? "正在读取最新静态快照"
      : `正在逐个刷新信息源：${sourceRefresh.checked}/${sourceRefresh.total}`
    : isStaticDataMode()
      ? `上次读取快照：${formatStatusTime(sourceRefresh.lastUpdated)}`
      : `上次逐源刷新：${formatStatusTime(sourceRefresh.lastUpdated)}`;

  return <div className={sourceRefresh.running ? "realtime-status active" : "realtime-status"}>{label}</div>;
}

function formatStatusTime(value: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Shanghai",
    hour12: false
  }).format(new Date(value));
}

function matchesFeedQuery(item: FeedItem, query: FeedQuery) {
  if (query.sourceKind && item.sourceKind !== query.sourceKind) return false;
  if (query.sourceHostname && getFeedItemHostname(item) !== query.sourceHostname) return false;
  if (!query.sourceHostname && query.sourceName && item.sourceName !== query.sourceName) return false;
  if (query.minImportance && item.importanceScore < query.minImportance) return false;
  return true;
}

function getFeedItemHostname(item: FeedItem) {
  if (item.sourceHostname) return item.sourceHostname;
  if (!item.sourceUrl) return "";
  try {
    return new URL(item.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function mergeItems(current: FeedItem[], next: FeedItem[]) {
  const merged = new Map<string, FeedItem>();
  for (const item of current) merged.set(item.id, item);
  for (const item of next) merged.set(item.id, item);
  return [...merged.values()].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) ||
      b.observedAt.localeCompare(a.observedAt) ||
      b.importanceScore - a.importanceScore
  );
}
