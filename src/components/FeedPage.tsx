import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, X } from "lucide-react";
import { cleanFeedQuery, getFeed, getSourceFacets, getTopicCounts } from "../api";
import { getTopicTitle, sourceKindLabel } from "../data";
import type { FeedItem, FeedQuery, SourceFacet, ToastMessage, Topic, TopicCount } from "../types";
import { FilterPanel } from "./FilterPanel";
import { EmptyView, ErrorView, InlineWarning, LoadMoreButton, LoadingView } from "./StatusViews";
import { FeedTimeline } from "./FeedTimeline";
import { ShareDialog } from "./ShareDialog";
import { GitHubTrendingPanel, WhalePortfolioPanel } from "./SpecialPanels";

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
  limit: 11,
  raw: "compact",
  total: "none"
};

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
  const requestId = useRef(0);

  const title = query.topicId ? getTopicTitle(topics, query.topicId) : "全部热点";

  const visibleItems = useMemo(() => {
    if (!keyword.trim()) return items;
    const needle = keyword.trim().toLowerCase();
    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(needle) ||
        item.summary.toLowerCase().includes(needle) ||
        item.sourceName.toLowerCase().includes(needle)
      );
    });
  }, [items, keyword]);

  useEffect(() => {
    let cancelled = false;
    const id = ++requestId.current;

    async function refresh() {
      setLoading(true);
      setWarning("");
      setFatalError("");
      try {
        const cleanQuery = cleanFeedQuery({ ...query, cursor: undefined });
        const [feed, facets, counts] = await Promise.all([
          getFeed(cleanQuery),
          getSourceFacets(cleanQuery),
          getTopicCounts(cleanQuery)
        ]);
        if (!cancelled && id === requestId.current) {
          setItems(feed.items);
          setNextCursor(feed.nextCursor);
          setTotal(feed.total);
          setSourceFacets(facets);
          setTopicCounts(counts);
          if (items.length > 0) {
            const newCount = feed.items.filter((item) => !items.find((old) => old.id === item.id)).length;
            if (newCount > 0) onToast("success", `新增 ${newCount} 条动态`);
          }
        }
      } catch (error) {
        if (!cancelled && id === requestId.current) {
          const message = error instanceof Error ? error.message : "动态加载失败，请稍后查看日志。";
          if (items.length > 0) {
            setWarning("刷新失败，正在展示上次加载的数据。");
          } else {
            setFatalError(message);
          }
        }
      } finally {
        if (!cancelled && id === requestId.current) {
          setLoading(false);
        }
      }
    }

    void refresh();

    return () => {
      cancelled = true;
    };
  }, [query.topicId, query.sourceKind, query.sourceName, query.sourceHostname, query.minImportance]);

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
      const feed = await getFeed({ ...query, cursor: nextCursor });
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
      sourceFacets={sourceFacets}
      topicCounts={topicCounts}
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
            <h2>{query.topicId ? title : "动态"}</h2>
          </div>
          <div className="panel-header-actions">
            <button className="mobile-filter-toggle" onClick={() => setDrawerOpen(true)} type="button">
              <Filter size={16} />
              筛选
            </button>
            <span className="panel-count">{total ?? visibleItems.length} 条</span>
          </div>
        </div>

        <InlineWarning message={warning} />
        <ActiveFilterStrip keyword={keyword} query={query} topics={topics} onReset={handleReset} />
        {loading && items.length === 0 ? <LoadingView /> : null}
        {!loading && visibleItems.length === 0 ? <EmptyView onReset={handleReset} /> : null}
        <GitHubTrendingPanel active={query.topicId === "github-trending"} />
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
