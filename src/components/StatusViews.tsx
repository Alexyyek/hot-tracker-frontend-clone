import { AlertCircle, Loader2, RotateCcw } from "lucide-react";

export function LoadingView({ label = "动态加载中..." }: { label?: string }) {
  return (
    <div className="status-view" aria-live="polite">
      <Loader2 className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="status-view status-view--error" role="alert">
      <AlertCircle size={22} />
      <span>{message}</span>
      {onRetry ? (
        <button className="secondary-button" onClick={onRetry} type="button">
          <RotateCcw size={16} />
          重试
        </button>
      ) : null}
    </div>
  );
}

export function EmptyView({ onReset }: { onReset?: () => void }) {
  return (
    <div className="status-view">
      <span>没有符合条件的热点。</span>
      {onReset ? (
        <button className="secondary-button" onClick={onReset} type="button">
          清空筛选
        </button>
      ) : null}
    </div>
  );
}

export function InlineWarning({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="inline-warning" role="status">
      <AlertCircle size={16} />
      <span>{message}</span>
    </div>
  );
}

export function LoadMoreButton({
  disabled,
  loading,
  onClick
}: {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="load-more-row">
      <button className="primary-button" disabled={disabled || loading} onClick={onClick} type="button">
        {loading ? "加载中..." : "加载更多"}
      </button>
    </div>
  );
}
