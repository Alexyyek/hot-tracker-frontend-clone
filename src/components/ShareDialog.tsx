import { Copy, ExternalLink, Share2, X } from "lucide-react";
import { copyText, formatTime, sourceKindLabel } from "../data";
import type { FeedItem } from "../types";

interface ShareDialogProps {
  item: FeedItem | null;
  onClose: () => void;
  onCopied: () => void;
}

export function ShareDialog({ item, onClose, onCopied }: ShareDialogProps) {
  if (!item) return null;
  const sharePath = `/share/${encodeURIComponent(item.id)}`;
  const shareUrl = `${window.location.origin}${sharePath}`;

  const copy = async () => {
    await copyText(shareUrl);
    onCopied();
  };

  return (
    <div className="share-dialog" role="dialog" aria-modal="true" aria-label="分享动态">
      <button className="share-dialog-backdrop" onClick={onClose} type="button" aria-label="关闭分享" />
      <div className="share-dialog-panel">
        <header className="share-dialog-header">
          <div>
            <p className="section-kicker">Share</p>
            <h2>分享动态</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" title="关闭">
            <X size={18} />
          </button>
        </header>

        <article className="share-poster-card">
          <div className="share-poster-mark">
            <Share2 size={19} />
            <span>Hot Tracker</span>
          </div>
          <p className="share-poster-meta">
            {sourceKindLabel(item.sourceKind)} · {formatTime(item.publishedAt)} · 热度 {item.importanceScore}
          </p>
          <h3>{item.title}</h3>
          <p>{item.summary}</p>
          {item.whyItMatters ? (
            <blockquote>
              <strong>推荐理由：</strong>
              {item.whyItMatters}
            </blockquote>
          ) : null}
        </article>

        <div className="share-dialog-actions">
          <button className="secondary-button" onClick={copy} type="button">
            <Copy size={16} />
            复制链接
          </button>
          <a className="primary-button" href={sharePath} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            打开分享页
          </a>
        </div>
      </div>
    </div>
  );
}
