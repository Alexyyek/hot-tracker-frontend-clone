import { Github, Star, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getGitHubTrending } from "../api";
import { extractPortfolioName } from "../data";
import type { FeedItem, GitHubTrendingSnapshot } from "../types";

export function GitHubTrendingPanel({ active }: { active: boolean }) {
  const [snapshots, setSnapshots] = useState<GitHubTrendingSnapshot[]>([]);

  useEffect(() => {
    if (!active || snapshots.length > 0) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await getGitHubTrending();
        if (!cancelled) setSnapshots(data.snapshots ?? []);
      } catch {
        if (!cancelled) setSnapshots([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [active, snapshots.length]);

  if (!active || snapshots.length === 0) return null;

  return (
    <section className="special-panel github-panel">
      <div className="special-panel-head">
        <Github size={18} />
        <div>
          <p className="section-kicker">GitHub Trending</p>
          <h3>趋势仓库</h3>
        </div>
      </div>
      <div className="special-grid">
        {snapshots.slice(0, 6).map((snapshot) => {
          const repo = snapshot.repository;
          if (!repo) return null;
          const ranking = snapshot.firstSeen ?? Object.values(snapshot.rankings ?? {})[0];
          return (
            <a className="special-card" href={repo.url} key={repo.fullName} target="_blank" rel="noreferrer">
              <strong>{repo.fullName}</strong>
              <span>{repo.language || "Repository"}</span>
              <em>
                <Star size={13} />
                {repo.totalStars?.toLocaleString() ?? ranking?.totalStars?.toLocaleString() ?? "new"}
              </em>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function WhalePortfolioPanel({ active, items }: { active: boolean; items: FeedItem[] }) {
  const portfolioItems = useMemo(() => items.filter((item) => item.topicId === "whale-portfolio").slice(0, 6), [items]);
  if (!active || portfolioItems.length === 0) return null;

  return (
    <section className="special-panel whale-panel">
      <div className="special-panel-head">
        <TrendingUp size={18} />
        <div>
          <p className="section-kicker">Whale Portfolio</p>
          <h3>大佬持仓变化</h3>
        </div>
      </div>
      <div className="special-grid">
        {portfolioItems.map((item) => (
          <a className="special-card" href={item.sourceUrl} key={item.id} target="_blank" rel="noreferrer">
            <strong>{extractPortfolioName(item)}</strong>
            <span>{item.summary}</span>
            <em>热度 {item.importanceScore}</em>
          </a>
        ))}
      </div>
    </section>
  );
}
