import { Copy, ExternalLink, Share2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { copyText, formatTime, sourceKindLabel } from "../data";
import type { FeedItem } from "../types";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ShareDialogProps {
  item: FeedItem | null;
  onClose: () => void;
  onCopied: () => void;
}

export function ShareDialog({ item, onClose, onCopied }: ShareDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const isOpen = item !== null;

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;

    (closeButtonRef.current ?? panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const focusableElements = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !panel.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || !panel.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen]);

  if (!item) return null;
  const sharePath = `${import.meta.env.BASE_URL}share/${encodeURIComponent(item.id)}`;
  const shareUrl = `${window.location.origin}${sharePath}`;

  const copy = async () => {
    await copyText(shareUrl);
    onCopied();
  };

  return (
    <div className="share-dialog" role="dialog" aria-modal="true" aria-label="分享动态">
      <button className="share-dialog-backdrop" onClick={onClose} type="button" aria-label="关闭分享" />
      <div className="share-dialog-panel" ref={panelRef} tabIndex={-1}>
        <header className="share-dialog-header">
          <div>
            <p className="section-kicker">Share</p>
            <h2>分享动态</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            type="button"
            title="关闭"
            aria-label="关闭分享"
            ref={closeButtonRef}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <article className="share-poster-card">
          <div className="share-poster-mark">
            <Share2 size={19} aria-hidden="true" />
            <span>AI Hot Tracker</span>
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
            <Copy size={16} aria-hidden="true" />
            复制链接
          </button>
          <a className="primary-button" href={sharePath} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            打开分享页
          </a>
        </div>
      </div>
    </div>
  );
}
