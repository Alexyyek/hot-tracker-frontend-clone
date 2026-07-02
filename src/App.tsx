import { useEffect, useMemo, useState } from "react";
import { getDailyLatest, getFeed, getSourceFacets, getTopicCounts, getTopics } from "./api";
import { formatDateInput, readAppCache, sortTopics, writeAppCache } from "./data";
import { TopBar } from "./components/TopBar";
import { ErrorView, LoadingView } from "./components/StatusViews";
import { FeedPage } from "./components/FeedPage";
import { DailyPage } from "./components/DailyPage";
import { SharePage } from "./components/SharePage";
import { Toast } from "./components/Toast";
import { aiTopics } from "./aiTopics";
import type { ActiveTab, AppData, FeedQuery, ThemeMode, ToastMessage } from "./types";

const initialQuery: FeedQuery = {
  limit: 500,
  raw: "compact",
  total: "none"
};

function getAppPath() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!base || base === ".") return window.location.pathname;
  return window.location.pathname.startsWith(base)
    ? window.location.pathname.slice(base.length) || "/"
    : window.location.pathname;
}

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem("hot-tracker-theme");
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function App() {
  const shareMatch = /^\/share\/([^/]+)$/u.exec(getAppPath());
  const [activeTab, setActiveTab] = useState<ActiveTab>("feed");
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [data, setData] = useState<AppData | null>(() => {
    const cached = readAppCache();
    return cached ? { ...cached, topics: sortTopics(aiTopics) } : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (kind: ToastMessage["kind"], message: string) => {
    const next = { id: Date.now(), kind, message };
    setToast(next);
    window.setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, 2600);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hot-tracker-theme", theme);
  }, [theme]);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.hostname !== "localhost") {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
    }
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    viewport?.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [, feed, sourceFacets, topicCounts, dailyReports] = await Promise.all([
          getTopics(),
          getFeed(initialQuery),
          getSourceFacets(initialQuery),
          getTopicCounts(initialQuery),
          getDailyLatest()
        ]);
        if (!cancelled) {
          const nextData = { topics: sortTopics(aiTopics), feed, sourceFacets, topicCounts, dailyReports };
          setData(nextData);
          writeAppCache(nextData);
          if (data?.feed.items.length && feed.items.some((item) => !data.feed.items.find((old) => old.id === item.id))) {
            showToast("success", "新增动态已载入");
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          if (data) {
            showToast("warning", "刷新失败，正在展示缓存数据。");
          } else {
            setError(loadError instanceof Error ? loadError.message : "动态加载失败，请稍后重试。");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const latestDate = useMemo(() => {
    return data?.dailyReports[0]?.reportDate ?? formatDateInput();
  }, [data]);

  if (shareMatch?.[1]) {
    return (
      <div className="app-root share-root">
        <SharePage id={decodeURIComponent(shareMatch[1])} />
      </div>
    );
  }

  return (
    <div className={activeTab === "daily" ? "app-root daily-mode" : "app-root"}>
      <Toast toast={toast} />
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onThemeChange={setTheme}
        onBrandRefresh={() => {
          showToast("success", "正在刷新动态");
          window.location.reload();
        }}
        theme={theme}
        topicsCount={data?.topics.length ?? 0}
      />
      {loading ? <LoadingView /> : null}
      {!loading && error ? <ErrorView message={error} onRetry={() => window.location.reload()} /> : null}
      {!loading && data ? (
        activeTab === "feed" ? (
          <FeedPage
            initialItems={data.feed.items}
            initialNextCursor={data.feed.nextCursor}
            initialSourceFacets={data.sourceFacets}
            initialTopicCounts={data.topicCounts}
            initialTotal={data.feed.total}
            onToast={showToast}
            topics={data.topics}
          />
        ) : (
          <DailyPage initialDate={latestDate} initialReports={data.dailyReports} topics={data.topics} />
        )
      ) : null}
    </div>
  );
}
