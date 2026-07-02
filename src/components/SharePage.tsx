import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { getFeedItem } from "../api";
import { formatTime, sourceKindLabel } from "../data";
import type { FeedItem } from "../types";
import { ErrorView, LoadingView } from "./StatusViews";

export function SharePage({ id }: { id: string }) {
  const [item, setItem] = useState<FeedItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const detail = await getFeedItem(id);
        if (!cancelled) setItem(detail);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "分享内容加载失败。");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <ErrorView message={error} />;
  if (!item) return <LoadingView label="分享页加载中..." />;

  return (
    <main className="share-page">
      <a className="secondary-button" href="/">
        <ArrowLeft size={16} />
        返回动态
      </a>
      <article className="share-page-card">
        <p className="section-kicker">Hot Tracker</p>
        <h1>{item.title}</h1>
        <p className="share-page-meta">
          {item.sourceName} · {sourceKindLabel(item.sourceKind)} · {formatTime(item.publishedAt)} · 热度 {item.importanceScore}
        </p>
        <p className="share-page-summary">{item.summary}</p>
        {item.whyItMatters ? (
          <blockquote>
            <strong>推荐理由：</strong>
            {item.whyItMatters}
          </blockquote>
        ) : null}
        <a className="feed-action-button" href={item.sourceUrl} rel="noreferrer" target="_blank">
          查看原文
          <ExternalLink size={15} />
        </a>
      </article>
    </main>
  );
}
