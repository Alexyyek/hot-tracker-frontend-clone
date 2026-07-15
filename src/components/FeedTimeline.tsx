import { ChevronDown, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getFeedItem } from "../api";
import {
  extractFeedImageUrls,
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
  const knownMediaUrls = extractFeedImageUrls(item);
  const canExpand = knownMediaUrls.length > 0 || item.summary.length > 180 || (watchText?.length ?? 0) > 120;

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
          <span className="score-pill" aria-label={`热度 ${item.importanceScore}`}>
            {item.importanceScore}
          </span>
        </div>
      </div>

      <h3>
        <a className="feed-title-link" href={item.sourceUrl} rel="noreferrer" target="_blank">
          {item.title}
        </a>
      </h3>

      <p className="feed-summary">{item.summary}</p>

      {expanded ? <FeedMedia item={item} /> : null}

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
        <div className="timeline-card-context">
          <span className="topic-chip">{getTopicTitle(topics, item.topicId)}</span>
          <a href={item.sourceUrl} rel="noreferrer" target="_blank">
            {item.sourceName}
          </a>
        </div>
        <button className="feed-action-button" onClick={() => onShare(item)} title="分享" type="button">
          <Share2 size={14} />
          分享
        </button>
      </footer>
    </article>
  );
}

export function FeedMedia({ item }: { item: FeedItem }) {
  const initialUrls = extractFeedImageUrls(item);
  const [urls, setUrls] = useState(initialUrls);
  const [hiddenUrls, setHiddenUrls] = useState<string[]>([]);
  const [loadedUrls, setLoadedUrls] = useState<string[]>([]);

  useEffect(() => {
    setUrls(initialUrls);
    setHiddenUrls([]);
    setLoadedUrls([]);

    if (initialUrls.length > 0) return;

    let cancelled = false;
    async function loadDetailMedia() {
      try {
        const detail = await getFeedItem(item.id);
        const detailUrls = extractFeedImageUrls(detail);
        if (!cancelled) setUrls(detailUrls);
      } catch {
        if (!cancelled) setUrls([]);
      }
    }

    void loadDetailMedia();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  useEffect(() => {
    setLoadedUrls([]);
    if (urls.length === 0) return;

    let cancelled = false;
    const loaded = new Set<string>();
    const cleanups = urls.map((url) => {
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        loaded.add(url);
        setLoadedUrls([...loaded]);
      };
      image.onerror = () => {
        if (cancelled) return;
        setHiddenUrls((current) => (current.includes(url) ? current : [...current, url]));
      };
      image.src = url;
      return () => {
        image.onload = null;
        image.onerror = null;
      };
    });

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [urls]);

  const visibleUrls = urls.filter((url) => loadedUrls.includes(url) && !hiddenUrls.includes(url));
  if (visibleUrls.length === 0) return null;

  return (
    <div className={visibleUrls.length === 1 ? "feed-media-grid single" : "feed-media-grid"} aria-label="动态图片">
      {visibleUrls.map((url, index) => (
        <a className="feed-media-tile" href={url} key={url} rel="noreferrer" target="_blank">
          <img
            alt={`${item.title} 图片 ${index + 1}`}
            loading="lazy"
            src={url}
            onError={() => setHiddenUrls((current) => (current.includes(url) ? current : [...current, url]))}
          />
        </a>
      ))}
    </div>
  );
}
