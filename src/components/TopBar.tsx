import { Activity, CalendarDays, Monitor, Moon, Sun, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ActiveTab, ThemeMode } from "../types";

interface TopBarProps {
  activeTab: ActiveTab;
  topicsCount: number;
  onBrandRefresh: () => void;
  onTabChange: (tab: ActiveTab) => void;
  onThemeChange: (theme: ThemeMode) => void;
  theme: ThemeMode;
}

export function TopBar({ activeTab, onBrandRefresh, onTabChange, onThemeChange, theme, topicsCount }: TopBarProps) {
  const nextTheme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const [hidden, setHidden] = useState(false);
  const previousScroll = useRef(0);

  useEffect(() => {
    function onScroll() {
      const current = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const isMobile = window.matchMedia("(max-width: 760px)").matches;
      if (!isMobile || current < 40) {
        setHidden(false);
      } else if (current > previousScroll.current + 8) {
        setHidden(true);
      } else if (current < previousScroll.current - 8) {
        setHidden(false);
      }
      previousScroll.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="topbar">
      <a className="brand-block" href="/" aria-label="刷新页面" onClick={(event) => {
        event.preventDefault();
        onBrandRefresh();
      }}>
        <span className="brand-mark" aria-hidden="true">
          <Target size={19} strokeWidth={1.9} />
        </span>
        <span>
          <h1>AI Hot Tracker</h1>
        </span>
      </a>
      <div className="topbar-actions">
        <div className={hidden ? "primary-tabs is-scroll-hidden" : "primary-tabs"} data-active-tab={activeTab} aria-label="主视图">
          <span className="primary-tab-indicator" aria-hidden="true" />
          <button
            className={activeTab === "feed" ? "tab-button active" : "tab-button"}
            onClick={() => onTabChange("feed")}
            type="button"
          >
            <Activity size={16} />
            动态
            <span className="tab-count">{topicsCount} 主题</span>
          </button>
          <button
            className={activeTab === "daily" ? "tab-button active" : "tab-button"}
            onClick={() => onTabChange("daily")}
            type="button"
          >
            <CalendarDays size={16} />
            日报
          </button>
        </div>
        <button className="theme-toggle" onClick={() => onThemeChange(nextTheme)} type="button" title="切换主题">
          <ThemeIcon size={18} strokeWidth={2.1} />
        </button>
      </div>
    </header>
  );
}
