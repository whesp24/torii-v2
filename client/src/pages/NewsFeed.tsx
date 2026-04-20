import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { timeAgo, sourceClass } from "@/lib/utils";

type Importance = "high" | "medium" | "low";
type Article = {
  id: string; title: string; summary: string; url: string;
  source: string; category: string; publishedAt: string;
  tags: string[]; importance: Importance; importanceReasons: string[];
};

const CATEGORIES = ["all", "japan", "markets", "macro", "voices"];
const IMP_COLORS: Record<Importance, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "hsl(var(--fg-dim))",
};

export default function NewsFeed() {
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("all");
  const [importance, setImportance] = useState<Importance | "all">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: articles = [], isLoading, refetch } = useQuery<Article[]>({
    queryKey: ["/api/news", category, refreshKey],
    queryFn: () => {
      const p = new URLSearchParams();
      if (category !== "all" && category !== "voices") p.set("category", category);
      if (refreshKey > 0) p.set("refresh", "1");
      return apiRequest("GET", `/api/news?${p.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    let out = articles;
    if (category === "voices") out = out.filter((a: Article) =>
      a.source.startsWith("@") || a.source.toLowerCase().startsWith("reddit") ||
      ["Calculated Risk", "Abnormal Returns"].includes(a.source)
    );
    if (importance !== "all") out = out.filter((a: Article) => a.importance === importance);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((a: Article) =>
        a.title.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return out;
  }, [articles, category, importance, search]);

  const highCount = articles.filter((a: Article) => a.importance === "high").length;
  const medCount  = articles.filter((a: Article) => a.importance === "medium").length;
  const lowCount  = articles.length - highCount - medCount;

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 className="page-title">News</h1>
          <p className="page-sub">Nikkei · NHK · Reuters · Japan Times · MarketWatch</p>
          {/* Importance summary */}
          {!isLoading && articles.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <span className="badge badge-high">{highCount} HIGH</span>
              <span className="badge badge-medium">{medCount} MED</span>
              <span className="badge badge-low">{lowCount} LOW</span>
            </div>
          )}
        </div>
        <button className="btn btn-ghost" onClick={() => { setRefreshKey(k => k + 1); refetch(); }}
          style={{ padding: "6px 14px", fontSize: 11, flexShrink: 0, marginTop: 4 }}>
          ↻ Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{
          position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
          color: "hsl(var(--fg-dim))", fontSize: 14, pointerEvents: "none",
        }}>⌕</span>
        <input
          className="input"
          type="text"
          placeholder="Search headlines, tickers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "hsl(var(--fg-dim))", cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {/* Importance */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "hsl(var(--fg-dim))", textTransform: "uppercase", minWidth: 72 }}>
            Priority
          </span>
          <div className="filter-strip">
            {(["all", "high", "medium", "low"] as const).map(k => (
              <button key={k} className={`filter-tab ${importance === k ? "active" : ""}`}
                onClick={() => setImportance(k)}>
                {k === "all" ? "All" : k === "high" ? "🔴 High" : k === "medium" ? "🟡 Medium" : "⚪ Low"}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "hsl(var(--fg-dim))", textTransform: "uppercase", minWidth: 72 }}>
            Category
          </span>
          <div className="filter-strip">
            {CATEGORIES.map(c => (
              <button key={c} className={`filter-tab ${category === c ? "active" : ""}`}
                onClick={() => setCategory(c)}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Count */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "hsl(var(--fg-dim))", marginBottom: 12 }}>
        {isLoading ? "Loading…" : `${filtered.length} article${filtered.length !== 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}`}
      </div>

      {/* Articles */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📰</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No articles found</div>
          <div style={{ fontSize: 12, color: "hsl(var(--fg-dim))" }}>
            {search ? "Try different keywords or clear your search." : "Try refreshing or changing filters."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(a => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const imp      = article.importance || "low";
  const impColor = IMP_COLORS[imp];
  const isHigh   = imp === "high";
  const isMed    = imp === "medium";

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`article-card ${isHigh ? "high-priority" : ""}`}
    >
      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, flexWrap: "wrap" }}>
        <span className={`source-badge ${sourceClass(article.source)}`}>{article.source}</span>

        {/* Priority dot */}
        {(isHigh || isMed) && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700,
            padding: "2px 7px", borderRadius: "999px",
            color: impColor, background: `${impColor}18`, border: `1px solid ${impColor}35`,
            letterSpacing: "0.06em",
          }}>
            {isHigh ? "HIGH" : "MED"}
          </span>
        )}

        {/* Ticker tags */}
        {article.tags.slice(0, 3).map(tag => (
          <span key={tag} style={{
            fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px",
            borderRadius: "999px", background: "hsl(350 100% 39% / 0.1)",
            color: "#e05070", fontWeight: 600, letterSpacing: "0.06em",
            border: "1px solid hsl(350 100% 39% / 0.2)",
          }}>{tag}</span>
        ))}

        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "hsl(var(--fg-dim))", flexShrink: 0 }}>
          {timeAgo(article.publishedAt)}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        fontWeight: isHigh ? 600 : 500,
        fontSize: 13,
        lineHeight: 1.45,
        color: "hsl(var(--fg))",
        marginBottom: article.summary ? 6 : 0,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {article.title}
      </div>

      {/* Summary */}
      {article.summary && (
        <div style={{
          fontSize: 12, color: "hsl(var(--fg-dim))", lineHeight: 1.55,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {article.summary}
        </div>
      )}

      {/* Importance reason */}
      {article.importanceReasons?.[0] && isHigh && (
        <div style={{ marginTop: 7, fontSize: 10, fontFamily: "var(--font-mono)", color: impColor, opacity: 0.8 }}>
          ↳ {article.importanceReasons[0]}
        </div>
      )}

      {/* Read link */}
      <div style={{ marginTop: 8, fontSize: 11, color: "hsl(var(--red-hsl))", fontFamily: "var(--font-mono)", opacity: 0.7 }}>
        Read →
      </div>
    </a>
  );
}
