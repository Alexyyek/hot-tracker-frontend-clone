import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import { getDailyReports, getFeedItem } from "../api";
import { filterAiDailyReports } from "../aiTopics";
import { formatDateInput, getTopicTitle } from "../data";
import type { DailyReport, DailyReportItem, FeedItem, Topic } from "../types";
import { EmptyView, ErrorView, InlineWarning, LoadingView } from "./StatusViews";

interface DailyPageProps {
  initialDate: string;
  initialReports: DailyReport[];
  topics: Topic[];
}

export function DailyPage({ initialDate, initialReports, topics }: DailyPageProps) {
  const initialAiReports = filterAiDailyReports(initialReports);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(initialDate || formatDateInput());
  const [reports, setReports] = useState(initialAiReports);
  const [activeReportId, setActiveReportId] = useState(initialAiReports[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const sortedReports = useMemo(() => {
    const topicOrder = new Map(topics.map((topic, index) => [topic.id, index]));
    return [...reports].sort((a, b) => {
      return (topicOrder.get(a.topicId) ?? 999) - (topicOrder.get(b.topicId) ?? 999);
    });
  }, [reports, topics]);

  const activeReport = sortedReports.find((report) => report.id === activeReportId) ?? sortedReports[0];

  useEffect(() => {
    if (sortedReports.length > 0 && !sortedReports.some((report) => report.id === activeReportId)) {
      setActiveReportId(sortedReports[0].id);
    }
  }, [activeReportId, sortedReports]);

  const loadDate = async (nextDate: string) => {
    if (!nextDate || nextDate === date) return;
    setDate(nextDate);
    setLoading(true);
    setWarning("");
    setError("");
    try {
      const nextReports = await getDailyReports(nextDate);
      const nextAiReports = filterAiDailyReports(nextReports);
      setReports(nextAiReports);
      setActiveReportId(nextAiReports[0]?.id ?? "");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "日报加载失败，请稍后重试。";
      if (reports.length > 0) {
        setWarning("日报刷新失败，正在展示上次加载的数据。");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  };

  const handleDateKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDatePicker();
    }
  };

  if (error) {
    return <ErrorView message={error} onRetry={() => void loadDate(date)} />;
  }

  return (
    <main className="daily-layout daily-reader-layout">
      <aside className="daily-sidebar content-panel" aria-label="日报列表">
        <div className="daily-sidebar-header">
          <h2>日报</h2>
          <div
            className="date-picker"
            role="button"
            tabIndex={0}
            onClick={openDatePicker}
            onKeyDown={handleDateKeyDown}
            aria-label={`选择日报日期，当前为 ${formatChineseDate(date)}`}
          >
            <span className="date-picker-label">日期</span>
            <div className="date-picker-control">
              <CalendarDays size={16} />
              <strong>{formatChineseDate(date)}</strong>
            </div>
            <input
              ref={dateInputRef}
              aria-label="选择日报日期"
              max={formatDateInput()}
              onChange={(event) => void loadDate(event.target.value)}
              type="date"
              value={date}
            />
          </div>
        </div>

        <InlineWarning message={warning} />
        {loading && reports.length === 0 ? <LoadingView label="日报加载中..." /> : null}
        {!loading && sortedReports.length === 0 ? <EmptyView /> : null}

        <div className="daily-report-nav">
          <p className="daily-nav-label">报告</p>
          {sortedReports.map((report) => (
            <button
              className={report.id === activeReport?.id ? "daily-report-button active" : "daily-report-button"}
              key={report.id}
              onClick={() => setActiveReportId(report.id)}
              type="button"
            >
              <strong>{report.title}</strong>
              <span>{getTopicTitle(topics, report.topicId)}</span>
              <em>{report.sections.length > 0 ? "已生成日报" : "无显著更新"}</em>
            </button>
          ))}
        </div>
      </aside>

      <section className="daily-main content-panel">
        {activeReport ? <DailyReportArticle report={activeReport} topics={topics} /> : null}
      </section>
    </main>
  );
}

function formatChineseDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function DailyReportArticle({ report, topics }: { report: DailyReport; topics: Topic[] }) {
  const topicTitle = getTopicTitle(topics, report.topicId);

  return (
    <article className="daily-article" style={{ "--score-accent": "var(--brand)" } as React.CSSProperties}>
      <header className="daily-article-header">
        <p className="daily-breadcrumb">
          {topicTitle}
          <span>/</span>
          {report.reportDate}
        </p>
        <h1>{report.title}</h1>
      </header>

      <section className="daily-mainline-panel">
        <span className="daily-quote-mark">“</span>
        <div>
          <h2>主线摘要</h2>
          <p>{report.mainLine}</p>
        </div>
      </section>

      <div className="daily-section-stack">
        {report.sections.length === 0 ? <EmptyView /> : null}
        {report.sections.map((section) => (
          <section className="daily-section-block" key={section.title}>
            <div className="daily-section-heading">
              <span>{String(report.sections.indexOf(section) + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
            </div>
            <div className="daily-story-list">
              {section.items.slice(0, 5).map((item) => (
                <article className="daily-story" key={`${section.title}-${item.title}`}>
                  <h3>
                    <span>›</span>
                    {item.title}
                    <DailySourceBadge item={item} />
                  </h3>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="daily-made-by">
        <span>MADE BY</span>
        <strong>XiaTian</strong>
        <span>WITH</span>
        <strong>Codex</strong>
      </footer>
    </article>
  );
}

function DailySourceBadge({ item }: { item: DailyReportItem }) {
  const ids = item.sourceFeedItemIds ?? [];
  const [sources, setSources] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadSources = () => {
    if (loaded || loading || ids.length === 0) return;
    setLoading(true);
    let cancelled = false;

    Promise.all(ids.slice(0, 8).map((id) => getFeedItem(id).catch(() => null)))
      .then((items) => {
        if (!cancelled) {
          setSources(items.filter(Boolean) as FeedItem[]);
          setLoaded(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  if (ids.length === 0) return null;

  return (
    <span className="daily-source-ref" onFocus={loadSources} onMouseEnter={loadSources} tabIndex={0}>
      <em>{ids.length}</em>
      <span className="daily-source-popover" role="tooltip">
        <strong>信息来源</strong>
        {loading && sources.length === 0 ? <small>加载中...</small> : null}
        {(sources.length > 0 ? sources : ids.slice(0, 4).map((id) => ({ id, title: "来源加载中...", sourceUrl: "" } as FeedItem))).map((source) => (
          source.sourceUrl ? (
            <a href={source.sourceUrl} key={source.id} rel="noreferrer" target="_blank">
              <span>{source.title}</span>
              <ExternalLink size={15} />
            </a>
          ) : (
            <span className="daily-source-placeholder" key={source.id}>
              <span>{source.title}</span>
              <ExternalLink size={15} />
            </span>
          )
        ))}
      </span>
    </span>
  );
}
