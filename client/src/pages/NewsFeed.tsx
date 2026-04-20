import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { timeAgo, sourceClass } from "@/lib/utils";

type Importance = "high" | "medium" | "low";

type Article = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  publishedMs: number;
  tags: string[];
  importance: Importance;
  importanceScore: number;
  importanceReasons: string[];
};

const CATEGORIES = ["all", "japan", "markets", "macro", "voices"];
const IMPORTANCE_LEVELS: { key: Importance | "all"; label: string; color: string }[] = [
  { key: "all",    label: "All",    color: "hsl(var(--muted-foreground))" },
  { key: "high",   label: "🔴 High",   color: "#ef4444" },
  { key: "medium", label: "🟡 Medium", color: "#d4a94c" },
  { key: "low",    label: "⚪ Low",    color: "hsl(var(--muted-foreground))" },
];

const IMP_COLORS: Record<Importance, string> = {
  high: "#ef4444",
  medium: "#d4a94c",
  low: "hsl(var(--muted-foreground))",
};
const IMP_LABELS: Record<Importance, string> = { high: "HIGH", medium: "MED", low: "LOW" };

export default function NewsFeed() {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("all");
  const [importance, setImportance] = useState<Importance | "all">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: articles = [], isLoading, refetch } = useQuery<Article[]>({
    queryKey: ["/api/news", category, refreshKey],
    queryFn: () => {
      const p = new URLSearchParams();
      // "voices" is a frontend-only filter — don't pass to backend
      if (category !== "all" && category !== "voices") p.set("category", category);
      if (refreshKey > 0) p.set("refresh", "1");
      return apiRequest("GET", `/api/news?${p.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    let out = articles;
    // "voices" = finance blogs, Reddit, thought leaders
    if (category === "voices") out = out.filter(a => a.source.startsWith("@") || a.source.toLowerCase().startsWith("reddit") || ["Calculated Risk", "Abnormal Returns", "@Collab Fund"].includes(a.source));
    if (importance !== "all") out = out.filter(a => a.importance === importance);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return out;
  }, [articles, category, importance, search]);

  // Stats
  const highCount   = articles.filter(a => a.importance === "high").length;
  const medCount    = articles.filter(a => a.importance === "medium").length;

  function handleRefresh() {
    setRefreshKey(k => k + 1);
    refetch();
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div className="page-title">News Feed</div>
          <div className="page-sub">Nikkei Asia · NHK · Reuters · Japan Times · MarketWatch · Seeking Alpha</div>
          {/* Importance summary pills */}
          {!isLoading && articles.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                {highCount} HIGH
              </span>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 4, background: "rgba(212,169,76,0.1)", color: "#d4a94c", border: "1px solid rgba(212,169,76,0.3)" }}>
                {medCount} MEDIUM
              </span>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 4, background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
                {articles.length - highCount - medCount} LOW
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 6, border: "1px solid hsl(var(--border))",
            background: "hsl(var(--secondary))", color: "hsl(var(--foreground))",
            fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))", fontSize: 14, pointerEvents: "none" }}>⌕</span>
        <input
          type="text"
          placeholder="Search headlines, summaries, tickers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "9px 12px 9px 34px", borderRadius: 7,
            border: "1px solid hsl(var(--border))", background: "hsl(var(--card))",
            color: "hsl(var(--foreground))", fontSize: 13, fontFamily: "var(--font-sans)", outline: "none",
            boxSizing: "border-box",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "hsl(var(--muted-foreground))", cursor: "pointer", fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {/* Importance filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4, minWidth: 70 }}>IMPORTANCE</span>
          {IMPORTANCE_LEVELS.map(({ key, label, color }) => (
            <button
              key={key}
              className={`filter-tab${importance === key ? " active" : ""}`}
              onClick={() => setImportance(key as any)}
              style={importance === key && key !== "all" ? { borderColor: color, color } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4, minWidth: 70 }}>CATEGORY</span>
          {CATEGORIES.map(c => (
            <button key={c} className={`filter-tab${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "hsl(var(--muted-foreground))", marginBottom: 14 }}>
        {isLoading ? "Loading articles…" : `${filtered.length} article${filtered.length !== 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}${importance !== "all" ? ` · ${importance} importance` : ""}`}
      </div>

      {/* Article list */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="article-card" style={{ cursor: "default" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span className="skeleton" style={{ width: 70, height: 16 }} />
                <span className="skeleton" style={{ width: 50, height: 16 }} />
              </div>
              <span className="skeleton" style={{ width: "80%", height: 15, display: "block", marginBottom: 6 }} />
              <span className="skeleton" style={{ width: "60%", height: 13, display: "block" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="kpi-card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📰</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No articles found</div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            {search ? `Try different keywords, or clear your search.` : "No articles for this filter. Try refreshing."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const sc = sourceClass(article.source);
  const imp = article.importance || "low";
  const impColor = IMP_COLORS[imp];
  const impLabel = IMP_LABELS[imp];
  const isHigh = imp === "high";

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="article-card"
      style={isHigh ? { borderLeft: `3px solid ${impColor}` } : {}}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span className={`source-badge ${sc}`}>{article.source}</span>

        {/* Importance badge */}
        <span style={{
          fontSize: 8, fontFamily: "var(--font-mono)", fontWeight: 700,
          padding: "2px 6px", borderRadius: 3,
          color: impColor,
          background: `${impColor}18`,
          border: `1px solid ${impColor}40`,
          letterSpacing: "0.06em",
        }}>{impLabel}</span>

        {/* Ticker tags */}
        {article.tags.slice(0, 3).map(tag => (
          <span key={tag} style={{
            fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", borderRadius: 3,
            background: "hsl(0 75% 37% / 0.12)", color: "#e05070", fontWeight: 600, letterSpacing: "0.06em",
          }}>{tag}</span>
        ))}

        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
          {timeAgo(article.publishedAt)}
        </span>
      </div>

      <div style={{ fontWeight: isHigh ? 600 : 500, fontSize: 13, lineHeight: 1.4, marginBottom: 5, color: "hsl(var(--foreground))" }}>
        {article.title}
      </div>

      {article.summary && (
        <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
          {article.summary.length > 200 ? article.summary.slice(0, 200) + "…" : article.summary}
        </div>
      )}

      {/* Importance reason */}
      {article.importanceReasons?.[0] && imp !== "low" && (
        <div style={{ marginTop: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: impColor, opacity: 0.75 }}>
          ↳ {article.importanceReasons[0]}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 11, color: "hsl(0 75% 37% / 0.7)", fontFamily: "var(--font-mono)" }}>
        Read full article ↗
      </div>
    </a>
  );
}
