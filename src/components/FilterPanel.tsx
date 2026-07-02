import { ChevronDown, Info, Search, SlidersHorizontal } from "lucide-react";
import { getTopicCount, sourceKindLabel, visibleSourceFacets } from "../data";
import type { FeedQuery, SourceFacet, Topic, TopicCount } from "../types";
import { useState } from "react";
import { SourceIcon } from "./SourceIcon";

interface FilterPanelProps {
  keyword: string;
  query: FeedQuery;
  sourceFacets: SourceFacet[];
  topicCounts: TopicCount[];
  topics: Topic[];
  onKeywordChange: (keyword: string) => void;
  onQueryChange: (query: FeedQuery) => void;
  onReset: () => void;
}

const sourceKinds = ["github", "weixin_article", "website", "x", "public_disclosure", "sec_filing"];
const scoreOptions = [0, 80, 60];

export function FilterPanel({
  keyword,
  query,
  sourceFacets,
  topicCounts,
  topics,
  onKeywordChange,
  onQueryChange,
  onReset
}: FilterPanelProps) {
  const [showAllTopics, setShowAllTopics] = useState(false);
  const update = (patch: FeedQuery) => {
    onQueryChange({ ...query, cursor: undefined, ...patch });
  };
  const visibleTopics = showAllTopics ? topics : topics.slice(0, 4);
  const hiddenTopicCount = Math.max(0, topics.length - visibleTopics.length);

  return (
    <aside className="topic-filter" aria-label="热点筛选">
      <section className="filter-section topic-section">
        <div className="section-heading">
          <span>主题</span>
          <strong>{topics.length}</strong>
        </div>
        <button
          className={!query.topicId ? "topic-row active" : "topic-row"}
          onClick={() => update({ topicId: undefined })}
          style={{ "--topic-accent": "var(--topic-all)" } as React.CSSProperties}
          type="button"
        >
          <span className="topic-row-main">
            <span className="topic-source-info" data-tooltip="聚合所有已启用主题的实时热点。">
              <Info size={13} />
            </span>
            <span className="topic-title">全部主题</span>
          </span>
          <span className="topic-row-count">{topicCounts.reduce((sum, item) => sum + item.count, 0)}</span>
        </button>
        {visibleTopics.map((topic) => (
          <button
            className={query.topicId === topic.id ? "topic-row active" : "topic-row"}
            key={topic.id}
            onClick={() => update({ topicId: topic.id })}
            style={{ "--topic-accent": topic.ui?.accent ?? "var(--topic-fallback)" } as React.CSSProperties}
            type="button"
          >
            <span className="topic-row-main">
              <span
                className="topic-source-info"
                data-tooltip={`${topic.title} / ${topic.sourceKind}`}
                onClick={(event) => event.stopPropagation()}
              >
                <Info size={13} />
              </span>
              <span className="topic-title">{topic.title}</span>
            </span>
            <span className="topic-row-count">{getTopicCount(topicCounts, topic.id)}</span>
          </button>
        ))}
        {hiddenTopicCount > 0 || showAllTopics ? (
          <button className="topic-list-footer" onClick={() => setShowAllTopics((value) => !value)} type="button">
            <span>{showAllTopics ? "收起主题" : "更多主题"}</span>
            <small>{showAllTopics ? "显示精简列表" : `还有 ${hiddenTopicCount} 个主题`}</small>
            <ChevronDown size={16} className={showAllTopics ? "is-open" : ""} />
          </button>
        ) : null}
      </section>

      <section className="filter-section filter-controls-section">
        <div className="filter-header">
          <div>
            <p className="section-kicker">Filters</p>
            <h2>筛选</h2>
          </div>
          <button className="icon-button" onClick={onReset} type="button" title="重置筛选">
            <SlidersHorizontal size={17} />
          </button>
        </div>

        <label className="search-box">
          <Search size={17} />
          <input
            placeholder="搜索标题或摘要"
            type="search"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </label>

        <div className="filter-group">
          <span className="filter-label">来源类型</span>
          <div className="filter-chip-row">
            <button
              className={!query.sourceKind ? "filter-chip active" : "filter-chip"}
              onClick={() => update({ sourceKind: undefined, sourceName: undefined, sourceHostname: undefined })}
              type="button"
            >
              全部
            </button>
            {sourceKinds.map((kind) => (
              <button
                className={query.sourceKind === kind ? "filter-chip active" : "filter-chip"}
                key={kind}
                onClick={() => update({ sourceKind: kind, sourceName: undefined, sourceHostname: undefined })}
                type="button"
              >
                <span className="chip-label">{sourceKindLabel(kind)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">最低热度</span>
          <div className="filter-chip-row">
            {scoreOptions.map((score) => (
              <button
                className={(query.minImportance ?? 0) === score ? "filter-chip active" : "filter-chip"}
                key={score}
                onClick={() => update({ minImportance: score === 0 ? undefined : score })}
                type="button"
              >
                {score === 0 ? "全部" : `${score}+`}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">来源</span>
          <div className="source-filter-list">
            {visibleSourceFacets(sourceFacets, query).map((facet) => (
              <button
                className={query.sourceName === facet.sourceName ? "source-filter-row active" : "source-filter-row"}
                key={`${facet.sourceKind}-${facet.sourceName}-${facet.sourceHostname ?? ""}`}
                onClick={() =>
                  update({
                    sourceKind: facet.sourceKind,
                    sourceName: facet.sourceName,
                    sourceHostname: facet.sourceHostname
                  })
                }
                type="button"
              >
                <span className="source-dot" />
                <span className="source-row-body">
                  <strong>
                    <SourceIcon
                      className="source-row-icon"
                      kind={facet.sourceKind}
                      sourceName={facet.sourceName}
                      sourceAvatarUrl={facet.sourceAvatarUrl}
                      sourceHostname={facet.sourceHostname}
                      sourceIconHostname={facet.sourceIconHostname}
                    />
                    <span className="source-row-name">{facet.sourceName}</span>
                  </strong>
                  <small>{sourceKindLabel(facet.sourceKind)}</small>
                </span>
                <em className="source-row-count">{facet.count}</em>
              </button>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}
