import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatPct, simpleMarkdown, timeAgo, sourceClass } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Link } from "wouter";

const X_ACCOUNTS = [
  { handle: "KevinLMak",       name: "Kevin Mak" },
  { handle: "ContrarianCurse", name: "SuspendedCap" },
  { handle: "dsundheim",       name: "D. Sundheim" },
  { handle: "jeff_weinstein",  name: "J. Weinstein" },
  { handle: "patrick_oshag",   name: "P. O'Shag" },
  { handle: "HannoLustig",     name: "H. Lustig" },
];

// ─── Market KPI grid ──────────────────────────────────────────────────────────

function MarketKPIs() {
  const { data: japan } = useQuery({
    queryKey: ["/api/market/japan"],
    queryFn: () => apiRequest("GET", "/api/market/japan"),
    refetchInterval: 60000,
  });
  const { data: macro } = useQuery({
    queryKey: ["/api/market/macro"],
    queryFn: () => apiRequest("GET", "/api/market/macro"),
    refetchInterval: 60000,
  });

  const getJ = (sym: string) => Array.isArray(japan) ? japan.find((q: any) => q.symbol === sym) : null;
  const getM = (sym: string) => Array.isArray(macro) ? macro.find((q: any) => q.symbol === sym) : null;

  const kpis = [
    { label: "Nikkei 225", q: getJ("^N225"),    accent: true, dec: 0 },
    { label: "USD / JPY",  q: getJ("USDJPY=X"), dec: 2 },
    { label: "EWJ ETF",    q: getJ("EWJ"),       dec: 2 },
    { label: "S&P 500",    q: getM("^GSPC"),     dec: 0 },
    { label: "VIX",        q: getM("^VIX"),      dec: 2, invert: true },
    { label: "Gold",       q: getM("GC=F"),      dec: 0 },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 10,
      marginBottom: 20,
    }} className="kpi-grid-6">
      {kpis.map(({ label, q, accent, dec, invert }: any) => {
        const price = q?.regularMarketPrice;
        const pct   = q?.regularMarketChangePercent;
        const isUp  = invert ? pct < 0 : pct > 0;
        const isDown = invert ? pct > 0 : pct < 0;
        const chgClass = isUp ? "up" : isDown ? "down" : "flat";

        return (
          <div key={label} className={`stat-card ${accent ? "accent" : ""}`}>
            <div className="stat-label">{label}</div>
            {price != null ? (
              <>
                <div className="stat-value">{formatPrice(price, dec ?? 2)}</div>
                <div className={`stat-change ${chgClass}`}>
                  {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                </div>
              </>
            ) : (
              <>
                <div className="skeleton" style={{ height: 20, width: "65%", marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 12, width: "40%" }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Nikkei chart ─────────────────────────────────────────────────────────────

function NikkeiChart() {
  const { data } = useQuery({
    queryKey: ["/api/chart/N225", "1mo"],
    queryFn: () => apiRequest("GET", `/api/chart/%5EN225?range=1mo&interval=1d`),
    staleTime: 300_000,
  });

  if (!data?.timestamp?.length) {
    return <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />;
  }

  const chartData = data.timestamp
    .map((t: number, i: number) => ({
      date: new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: data.close?.[i] ?? null,
    }))
    .filter((d: any) => d.price != null);

  const isUp = (chartData.at(-1)?.price ?? 0) >= (chartData[0]?.price ?? 0);
  const color = isUp ? "var(--green-hex)" : "#ff6b6b";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Nikkei 225 · 1 Month</div>
        <div className={`tabular ${isUp ? "up" : "down"}`} style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
          {chartData.at(-1)?.price?.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))",
              borderRadius: 10, fontSize: 11, fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
            formatter={(v: any) => [v?.toLocaleString(), "NKY"]}
            labelStyle={{ color: "hsl(var(--fg-muted))" }}
          />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill="url(#chartGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Portfolio snapshot (mobile only) ─────────────────────────────────────────

function PortfolioSnapshot() {
  const { data: portfolio } = useQuery({
    queryKey: ["/api/portfolio/quotes"],
    queryFn: () => apiRequest("GET", "/api/portfolio/quotes"),
    refetchInterval: 60000,
  });

  const holdings = Array.isArray(portfolio) ? portfolio : [];
  const total    = holdings.reduce((s: number, h: any) => s + (h.value || 0), 0);
  const dayChg   = holdings.reduce((s: number, h: any) => s + ((h.change || 0) * h.shares), 0);
  const dayChgPct = total > 0 ? (dayChg / (total - dayChg)) * 100 : 0;

  return (
    <div className="card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <div className="section-label" style={{ marginBottom: 4 }}>Portfolio</div>
        <div className="tabular" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {total > 0 ? `$${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
        </div>
      </div>
      {total > 0 && (
        <div style={{ textAlign: "right" }}>
          <div className={`tabular ${dayChg >= 0 ? "up" : "down"}`} style={{ fontSize: 14, fontWeight: 600 }}>
            {dayChg >= 0 ? "+" : ""}${Math.abs(dayChg).toFixed(0)} today
          </div>
          <div className={`tabular ${dayChgPct >= 0 ? "up" : "down"}`} style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
            {dayChgPct >= 0 ? "+" : ""}{dayChgPct.toFixed(2)}%
          </div>
        </div>
      )}
      <Link href="/portfolio">
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "hsl(var(--surface2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "hsl(var(--fg-muted))", flexShrink: 0,
        }}>→</div>
      </Link>
    </div>
  );
}

// ─── AI Briefing ─────────────────────────────────────────────────────────────

function BriefingPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/briefing"],
    queryFn: () => apiRequest("GET", "/api/briefing"),
    staleTime: 5 * 60 * 1000,
  });

  const refresh = useMutation({
    mutationFn: () => apiRequest("GET", "/api/briefing?force=1"),
    onSuccess: (d) => qc.setQueryData(["/api/briefing"], d),
  });

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 2 }}>AI Daily Briefing</div>
          {data?.generatedAt && (
            <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>
              {timeAgo(new Date(data.generatedAt).toISOString())}
              {data.cached ? " · cached" : ""}
            </div>
          )}
        </div>
        <button className="btn btn-ghost" onClick={() => refresh.mutate()} disabled={refresh.isPending}
          style={{ padding: "5px 12px", fontSize: 11 }}>
          {refresh.isPending ? "…" : "↻ Refresh"}
        </button>
      </div>

      {isLoading || refresh.isPending ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[90, 100, 85, 70].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 13, width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="briefing-content" dangerouslySetInnerHTML={{ __html: simpleMarkdown(data?.content || "No briefing yet. Click Refresh to generate.") }} />
      )}
    </div>
  );
}

// ─── Recent News ─────────────────────────────────────────────────────────────

function RecentNews() {
  const { data: articles } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => apiRequest("GET", "/api/news"),
    staleTime: 5 * 60 * 1000,
  });

  const items = Array.isArray(articles)
    ? articles.filter((a: any) => a.importance === "high" || a.importance === "medium").slice(0, 6)
    : [];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Top Headlines</div>
        <Link href="/news">
          <span style={{ fontSize: 11, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", cursor: "pointer" }}>
            All news →
          </span>
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.length === 0
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 14, marginBottom: 14 }} />
            ))
          : items.map((a: any, i: number) => {
              const isHigh = a.importance === "high";
              return (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "block", textDecoration: "none",
                    padding: "11px 0",
                    borderBottom: i < items.length - 1 ? "1px solid hsl(var(--border-soft) / 0.5)" : "none",
                  }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    {isHigh && (
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "#ef4444", flexShrink: 0, marginTop: 5,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: "hsl(var(--fg))", lineHeight: 1.45,
                        fontWeight: isHigh ? 600 : 400,
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>
                        {a.title}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                        <span className={`source-badge ${sourceClass(a.source)}`}>{a.source}</span>
                        <span style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>
                          {timeAgo(a.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })
        }
      </div>
    </div>
  );
}

// ─── X Voices feed ───────────────────────────────────────────────────────────

function XVoicesFeed() {
  const [active, setActive] = useState(X_ACCOUNTS[0].handle);

  return (
    <div className="card x-voices-panel" style={{ display: "flex", flexDirection: "column", height: 620, padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 0", borderBottom: "1px solid hsl(var(--border-soft))", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Finance Voices · X</div>
          <a href={`https://x.com/${active}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>
            Open ↗
          </a>
        </div>
        <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none", marginBottom: -1 }}>
          {X_ACCOUNTS.map(({ handle, name }) => (
            <button key={handle} onClick={() => setActive(handle)} style={{
              padding: "7px 12px", fontSize: 11, background: "transparent", border: "none",
              borderBottom: active === handle ? "2px solid var(--red-hex)" : "2px solid transparent",
              color: active === handle ? "hsl(var(--fg))" : "hsl(var(--fg-dim))",
              fontWeight: active === handle ? 600 : 400,
              cursor: "pointer", whiteSpace: "nowrap",
              fontFamily: "var(--font-sans)", transition: "color 0.15s",
            }}>{name}</button>
          ))}
        </div>
      </div>
      <iframe
        key={active}
        src={`https://nitter.net/${active}`}
        style={{ flex: 1, border: "none", width: "100%", minHeight: 0, colorScheme: "dark" }}
        title={`@${active}`}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Overview() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  return (
    <div style={{ maxWidth: 1300 }}>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">Japan markets · portfolio · daily briefing</p>
      </div>

      {/* Portfolio snapshot — mobile only */}
      {isMobile && (
        <div style={{ marginBottom: 16 }}>
          <PortfolioSnapshot />
        </div>
      )}

      {/* Market KPIs */}
      <MarketKPIs />

      {/* Main grid */}
      <div className="overview-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        gap: 14,
        alignItems: "start",
      }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <NikkeiChart />
          </div>
          <BriefingPanel />
          <RecentNews />
        </div>

        {/* Right — X feed, desktop only */}
        {!isMobile && (
          <div style={{ position: "sticky", top: 0 }}>
            <XVoicesFeed />
          </div>
        )}
      </div>
    </div>
  );
}
