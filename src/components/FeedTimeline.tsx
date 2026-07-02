import { ChevronDown, Share2 } from "lucide-react";
import { useState } from "react";
import {
  formatDayCountLabel,
  formatTime,
  getTopicAccent,
  getTopicTitle,
  groupFeedItemsByDay
} from "../data";
import type { FeedItem, Topic } from "../types";
import { SourceIcon } from "./SourceIcon";

interface FeedTimelineProps {
  items: FeedItem[];
  onShare: (item: FeedItem) => void;
  topics: Topic[];
}

export function FeedTimeline({ items, onShare, topics }: FeedTimelineProps) {
  const groups = groupFeedItemsByDay(items);

  return (
    <div className="timeline">
      {groups.map((group) => (
        <section className="timeline-day" key={group.date}>
          <div className="timeline-day-head">
            <span className="timeline-rail-dot" />
            <h3>{formatDayCountLabel(group.date, group.items.length)}</h3>
          </div>
          <div className="timeline-day-items">
            {group.items.map((item) => (
              <div className="timeline-item" key={item.id}>
                <time className="timeline-time">{formatTime(item.publishedAt)}</time>
                <span className="timeline-rail" aria-hidden="true" />
                <FeedCard item={item} onShare={onShare} topics={topics} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FeedCard({ item, onShare, topics }: { item: FeedItem; onShare: (item: FeedItem) => void; topics: Topic[] }) {
  const [expanded, setExpanded] = useState(false);
  const accent = getTopicAccent(topics, item.topicId);
  const watchText = item.whyItMatters || item.watchText || item.actionText;
  const canExpand = item.summary.length > 180 || (watchText?.length ?? 0) > 120;

  return (
    <article
      className={expanded ? "timeline-card is-expanded" : "timeline-card"}
      style={{ "--score-accent": accent } as React.CSSProperties}
    >
      <div className="timeline-card-head">
        <div className="timeline-source-line">
          <SourceIcon
            className="source-icon-badge"
            kind={item.sourceKind}
            sourceName={item.sourceName}
            sourceAvatarUrl={item.sourceAvatarUrl}
            sourceHostname={item.sourceHostname}
            sourceIconHostname={item.sourceIconHostname}
          />
          <strong className="source-name">{item.sourceName}</strong>
          <span className="timeline-source-time">· {formatTime(item.publishedAt)}</span>
        </div>
        <div className="timeline-card-badges">
          <span className="topic-chip">{getTopicTitle(topics, item.topicId)}</span>
          <span className="score-pill">{item.importanceScore}</span>
        </div>
      </div>

      <h3>
        <a className="feed-title-link" href={item.sourceUrl} rel="noreferrer" target="_blank">
          {item.title}
        </a>
      </h3>

      <p className="feed-summary">{item.summary}</p>

      {watchText ? (
        <div className="timeline-reason">
          <span>推荐理由：</span>
          <p>{watchText}</p>
        </div>
      ) : null}

      {canExpand ? (
        <button
          className="timeline-expand-button"
          onClick={() => setExpanded((current) => !current)}
          type="button"
          aria-expanded={expanded}
        >
          {expanded ? "收起" : "展开"}
          <ChevronDown size={15} />
        </button>
      ) : null}

      {item.tags.length > 0 ? (
        <div className="tag-row">
          {item.tags.slice(0, 5).map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="timeline-card-footer">
        <a href={item.sourceUrl} rel="noreferrer" target="_blank">
          {item.sourceName}
        </a>
        <button className="feed-action-button" onClick={() => onShare(item)} type="button">
          分享
          <Share2 size={14} />
        </button>
      </footer>
    </article>
  );
}
