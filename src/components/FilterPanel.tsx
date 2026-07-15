import { ChevronDown, Info, Search, SlidersHorizontal } from "lucide-react";
import { getTopicCount, sourceKindLabel } from "../data";
import { AI_ALL_TOPIC_ID, getAiSourceCatalogTotal, getAiTopicTooltip, mergeAiCatalogSources } from "../aiTopics";
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

const sourceKinds = ["website", "x", "weixin_article"];
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
  const [showAllSources, setShowAllSources] = useState(false);
  const update = (patch: FeedQuery) => {
    onQueryChange({ ...query, cursor: undefined, ...patch });
  };
  const visibleTopics = showAllTopics ? topics : topics.slice(0, 5);
  const hiddenTopicCount = Math.max(0, topics.length - visibleTopics.length);
  const mergedSources = mergeAiCatalogSources(sourceFacets, query.topicId).filter(
    (facet) => facet.count > 0 && (!query.sourceKind || facet.sourceKind === query.sourceKind)
  );
  const visibleSources = showAllSources ? mergedSources : mergedSources.slice(0, 18);
  const catalogTotal = mergedSources.length || getAiSourceCatalogTotal(query.topicId);
  const activeSourceCount = mergedSources.filter((facet) => facet.count > 0).length;

  return (
    <aside className="topic-filter" aria-label="热点筛选">
      <section className="filter-section topic-section">
        <div className="section-heading">
          <span>主题</span>
          <strong>{topics.length}</strong>
        </div>
        <button
          aria-pressed={!query.topicId}
          className={!query.topicId ? "topic-row active" : "topic-row"}
          onClick={() => update({ topicId: undefined })}
          style={{ "--topic-accent": "var(--topic-all)" } as React.CSSProperties}
          type="button"
        >
          <span className="topic-row-main">
            <span className="topic-source-info" data-tooltip="聚合 AI 行业、论文、应用和大厂日报。">
              <Info size={13} />
            </span>
            <span className="topic-title">全部 AI</span>
          </span>
          <span className="topic-row-count">{getTopicCount(topicCounts, AI_ALL_TOPIC_ID)}</span>
        </button>
        {visibleTopics.map((topic) => (
          <button
            aria-pressed={query.topicId === topic.id}
            className={query.topicId === topic.id ? "topic-row active" : "topic-row"}
            key={topic.id}
            onClick={() => update({ topicId: topic.id })}
            style={{ "--topic-accent": topic.ui?.accent ?? "var(--topic-fallback)" } as React.CSSProperties}
            type="button"
          >
            <span className="topic-row-main">
              <span
                className="topic-source-info"
                data-tooltip={getAiTopicTooltip(topic)}
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
          <button
            aria-expanded={showAllTopics}
            className="topic-list-footer"
            onClick={() => setShowAllTopics((value) => !value)}
            type="button"
          >
            <span>{showAllTopics ? "收起主题" : "更多主题"}</span>
            <small>{showAllTopics ? "显示精简列表" : `还有 ${hiddenTopicCount} 个主题`}</small>
            <ChevronDown size={16} className={showAllTopics ? "is-open" : ""} />
          </button>
        ) : null}
      </section>

      <section className="filter-section filter-controls-section">
        <div className="filter-header">
          <div>
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
              aria-pressed={!query.sourceKind}
              className={!query.sourceKind ? "filter-chip active" : "filter-chip"}
              onClick={() => update({ sourceKind: undefined, sourceName: undefined, sourceHostname: undefined })}
              type="button"
            >
              全部
            </button>
            {sourceKinds.map((kind) => (
              <button
                aria-pressed={query.sourceKind === kind}
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
                aria-pressed={(query.minImportance ?? 0) === score}
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
          <div className="source-filter-heading">
            <span className="filter-label">来源</span>
            <em>
              {visibleSources.length}/{catalogTotal}
              <small>{activeSourceCount} 有更新</small>
            </em>
          </div>
          <div className="source-filter-list">
            {visibleSources.map((facet) => {
              const kindLabel = sourceKindLabel(facet.sourceKind);
              const sourceHostname = facet.sourceHostname || undefined;
              const isActive = query.sourceKind === facet.sourceKind
                && query.sourceName === facet.sourceName
                && (query.sourceHostname || undefined) === sourceHostname;

              return (
                <button
                  aria-label={`${facet.sourceName}，${kindLabel}，${facet.count} 条`}
                  aria-pressed={isActive}
                  className={isActive ? "source-filter-row active" : "source-filter-row"}
                  data-source-hostname={sourceHostname}
                  data-source-name={facet.sourceName}
                  key={`${facet.sourceKind}-${facet.sourceName}-${sourceHostname ?? ""}`}
                  onClick={() =>
                    update({
                      sourceKind: facet.sourceKind,
                      sourceName: facet.sourceName,
                      sourceHostname
                    })
                  }
                  title={`${facet.sourceName} · ${kindLabel}`}
                  type="button"
                >
                  <SourceIcon
                    className="source-row-icon"
                    kind={facet.sourceKind}
                    sourceName={facet.sourceName}
                    sourceAvatarUrl={facet.sourceAvatarUrl}
                    sourceHostname={sourceHostname}
                    sourceIconHostname={facet.sourceIconHostname}
                  />
                  <span className="source-row-name">{facet.sourceName}</span>
                  <em className="source-row-count">{facet.count}</em>
                </button>
              );
            })}
          </div>
          {mergedSources.length > 18 ? (
            <button
              aria-expanded={showAllSources}
              className="source-list-footer"
              onClick={() => setShowAllSources((value) => !value)}
              type="button"
            >
              <span>{showAllSources ? "收起来源" : "展开全部来源"}</span>
              <small>{showAllSources ? "显示前 18 个" : `还有 ${mergedSources.length - visibleSources.length} 个来源`}</small>
              <ChevronDown size={16} className={showAllSources ? "is-open" : ""} />
            </button>
          ) : null}
        </div>
      </section>
    </aside>
  );
}
