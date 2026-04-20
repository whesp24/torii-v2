import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, simpleMarkdown, timeAgo, sourceClass } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";

const X_ACCOUNTS = [
  { handle: "KevinLMak",       name: "Kevin Mak" },
  { handle: "ContrarianCurse", name: "SuspendedCap" },
  { handle: "dsundheim",       name: "D. Sundheim" },
  { handle: "jeff_weinstein",  name: "J. Weinstein" },
  { handle: "patrick_oshag",   name: "P. O'Shag" },
  { handle: "HannoLustig",     name: "H. Lustig" },
];

// ─── Data hooks ───────────────────────────────────────────────────────────────
function useJapan() {
  return useQuery({ queryKey: ["/api/market/japan"], queryFn: () => apiRequest("GET", "/api/market/japan"), refetchInterval: 60000 });
}
function useMacro() {
  return useQuery({ queryKey: ["/api/market/macro"], queryFn: () => apiRequest("GET", "/api/market/macro"), refetchInterval: 60000 });
}
function usePortfolioData() {
  return useQuery({ queryKey: ["/api/portfolio/quotes"], queryFn: () => apiRequest("GET", "/api/portfolio/quotes"), refetchInterval: 60000 });
}
function useNikkeiChart() {
  return useQuery({ queryKey: ["/api/chart/N225", "1mo"], queryFn: () => apiRequest("GET", `/api/chart/%5EN225?range=1mo&interval=1d`), staleTime: 300_000 });
}

// ─── Tiny sparkline ───────────────────────────────────────────────────────────
function Spark({ prices, color }: { prices: number[]; color: string }) {
  if (prices.length < 2) return <div style={{ height: 28 }} />;
  const d = prices.map((v, i) => ({ i, v }));
  const id = `sp${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={d} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotoneX" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── MOBILE LAYOUT ────────────────────────────────────────────────────────────

function MobileOverview() {
  const qc = useQueryClient();
  const { data: japan } = useJapan();
  const { data: macro } = useMacro();
  const { data: portfolio } = usePortfolioData();
  const { data: chart } = useNikkeiChart();

  const getJ = (s: string) => Array.isArray(japan) ? japan.find((q: any) => q.symbol === s) : null;
  const getM = (s: string) => Array.isArray(macro) ? macro.find((q: any) => q.symbol === s) : null;

  const nky = getJ("^N225");
  const nkyPct = nky?.regularMarketChangePercent ?? 0;
  const nkyUp = nkyPct >= 0;
  const nkyColor = nkyUp ? "#34c759" : "#ff453a";

  const sparkPrices: number[] = (chart?.close ?? []).filter((v: any) => v != null);
  const chartPts = sparkPrices.map((v: number, i: number) => ({ i, v }));
  const chartDates: number[] = chart?.timestamp ?? [];

  // Portfolio totals
  const holdings = Array.isArray(portfolio) ? portfolio : [];
  const total = holdings.reduce((s: number, h: any) => s + (h.value || 0), 0);
  const dayChg = holdings.reduce((s: number, h: any) => s + ((h.change || 0) * h.shares), 0);
  const dayChgPct = total > 0 ? (dayChg / (total - dayChg)) * 100 : 0;

  // Top movers from holdings
  const movers = [...holdings]
    .filter((h: any) => h.changePct != null)
    .sort((a: any, b: any) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 6);

  // News
  const { data: articles } = useQuery({ queryKey: ["/api/news"], queryFn: () => apiRequest("GET", "/api/news"), staleTime: 300_000 });
  const news = Array.isArray(articles) ? articles.filter((a: any) => a.importance === "high" || a.importance === "medium").slice(0, 5) : [];

  // Briefing
  const { data: briefing, isLoading: bLoad } = useQuery({ queryKey: ["/api/briefing"], queryFn: () => apiRequest("GET", "/api/briefing"), staleTime: 300_000 });
  const refreshBriefing = useMutation({ mutationFn: () => apiRequest("GET", "/api/briefing?force=1"), onSuccess: (d) => qc.setQueryData(["/api/briefing"], d) });

  // Compact metric card helper
  function MetricCard({ label, q, tag, invert, dec = 2 }: any) {
    const price = q?.regularMarketPrice;
    const pct = q?.regularMarketChangePercent;
    const up = invert ? (pct ?? 0) < 0 : (pct ?? 0) >= 0;
    const color = pct == null ? "#8e8e93" : up ? "#34c759" : "#ff453a";
    const tinyPrices = q ? [
      q.regularMarketPreviousClose ?? price,
      ((q.regularMarketPreviousClose ?? price) + price) / 2,
      price,
    ].filter(Boolean) : [];
    return (
      <div style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 14, padding: "12px 14px 8px", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
          {tag && <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", background: "hsl(var(--surface2))", borderRadius: 4, padding: "1px 5px" }}>{tag}</span>}
        </div>
        {price != null
          ? <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{formatPrice(price, dec)}</div>
          : <div className="skeleton" style={{ height: 22, width: "65%", marginTop: 4, borderRadius: 4 }} />}
        {pct != null
          ? <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", color, marginTop: 2 }}>{up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%</div>
          : <div className="skeleton" style={{ height: 11, width: "40%", marginTop: 4, borderRadius: 3 }} />}
        <div style={{ marginTop: 4 }}><Spark prices={tinyPrices} color={color} /></div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Hero Nikkei card ── */}
      <div style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 18, padding: "16px 16px 10px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--red-hex)", borderRadius: "18px 18px 0 0" }} />
        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
          MARKET OVERVIEW
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 2 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", letterSpacing: "0.05em" }}>NIKKEI 225</div>
            {nky?.regularMarketPrice != null
              ? <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--font-mono)", letterSpacing: "-0.04em", lineHeight: 1.05 }}>
                  {nky.regularMarketPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
              : <div className="skeleton" style={{ height: 40, width: 180, marginTop: 4, borderRadius: 6 }} />}
            {nky && (
              <div style={{ fontSize: 12, fontWeight: 700, color: nkyColor, fontFamily: "var(--font-mono)", marginTop: 2 }}>
                {nkyUp ? "▲" : "▼"} {Math.abs(nkyPct).toFixed(2)}% today
                {nky.regularMarketChange != null && (
                  <span style={{ marginLeft: 6, fontWeight: 500, opacity: 0.7 }}>
                    · {nky.regularMarketChange > 0 ? "+" : ""}{nky.regularMarketChange.toFixed(0)} pts
                  </span>
                )}
              </div>
            )}
            {nky && (
              <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", marginTop: 3 }}>
                1M HIGH {nky.fiftyTwoWeekHigh?.toFixed(0)} · 1M LOW {nky.fiftyTwoWeekLow?.toFixed(0)}
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        {chartPts.length > 1 ? (
          <div style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartPts} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={nkyColor} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={nkyColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis hide /><YAxis hide domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)" }}
                  formatter={(v: any) => [v?.toLocaleString("en-US", { maximumFractionDigits: 0 }), "NKY"]} labelFormatter={() => ""} />
                <Area type="monotoneX" dataKey="v" stroke={nkyColor} strokeWidth={2} fill="url(#heroGrad)" dot={false} activeDot={{ r: 4, fill: nkyColor }} />
              </AreaChart>
            </ResponsiveContainer>
            {chartDates.length >= 3 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                {[0, Math.floor(chartDates.length / 2), chartDates.length - 1].map(i => (
                  <span key={i} style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))" }}>
                    {new Date(chartDates[i] * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="skeleton" style={{ height: 80, marginTop: 10, borderRadius: 8 }} />
        )}
      </div>

      {/* ── KEY METRICS 2×2 grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricCard label="USD / JPY" q={getJ("USDJPY=X")} tag="FX" dec={2} />
        <MetricCard label="EWJ ETF" q={getJ("EWJ")} tag="ETF" dec={2} />
        <MetricCard label="S&P 500" q={getM("^GSPC")} tag="INDEX" dec={0} />
        <MetricCard label="VIX" q={getM("^VIX")} tag="VOL" dec={2} invert />
      </div>

      {/* ── Portfolio snapshot ── */}
      <div style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Portfolio</div>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--font-mono)", letterSpacing: "-0.03em" }}>
              {total > 0 ? `$${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {total > 0 && <>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: dayChg >= 0 ? "#34c759" : "#ff453a" }}>
                {dayChg >= 0 ? "+" : ""}${Math.abs(dayChg).toFixed(0)} today
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: dayChgPct >= 0 ? "#34c759" : "#ff453a" }}>
                {dayChgPct >= 0 ? "+" : ""}{dayChgPct.toFixed(2)}%
              </div>
            </>}
            <Link href="/portfolio">
              <span style={{ fontSize: 11, color: "var(--red-hex)", fontFamily: "var(--font-mono)", cursor: "pointer", marginTop: 4, display: "block" }}>View all →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── TOP MOVERS horizontal scroll ── */}
      {movers.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Top Movers</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {movers.map((h: any) => {
              const up = h.changePct >= 0;
              const color = up ? "#34c759" : "#ff453a";
              return (
                <Link key={h.ticker} href={`/stock/${h.ticker}`}>
                  <div style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 12, padding: "10px 12px", minWidth: 90, flexShrink: 0, cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", color: "hsl(var(--fg))", marginBottom: 2 }}>{h.ticker}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{formatPrice(h.price)}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", color, marginTop: 2 }}>
                      {up ? "+" : ""}{h.changePct?.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Briefing ── */}
      <div style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            AI Daily Briefing
            {briefing?.generatedAt && <span style={{ marginLeft: 6 }}>· {timeAgo(new Date(briefing.generatedAt).toISOString())}</span>}
          </div>
          <button className="btn btn-ghost" onClick={() => refreshBriefing.mutate()} disabled={refreshBriefing.isPending} style={{ padding: "3px 10px", fontSize: 10 }}>
            {refreshBriefing.isPending ? "…" : "↻"}
          </button>
        </div>
        {bLoad || refreshBriefing.isPending
          ? [90, 100, 75].map((w, i) => <div key={i} className="skeleton" style={{ height: 12, width: `${w}%`, marginBottom: 7, borderRadius: 3 }} />)
          : <div className="briefing-content" style={{ fontSize: 13, lineHeight: 1.55 }}
              dangerouslySetInnerHTML={{ __html: simpleMarkdown(briefing?.content || "No briefing yet.") }} />}
      </div>

      {/* ── Top Headlines ── */}
      <div style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", textTransform: "uppercase", letterSpacing: "0.07em" }}>Top Headlines</div>
          <Link href="/news"><span style={{ fontSize: 11, color: "var(--red-hex)", fontFamily: "var(--font-mono)", cursor: "pointer" }}>All →</span></Link>
        </div>
        {news.length === 0
          ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 14, marginBottom: 10, borderRadius: 4 }} />)
          : news.map((a: any, i: number) => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", textDecoration: "none", padding: "9px 0", borderBottom: i < news.length - 1 ? "1px solid hsl(var(--border-soft) / 0.4)" : "none" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {a.importance === "high" && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 5 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "hsl(var(--fg))", fontWeight: a.importance === "high" ? 600 : 400, lineHeight: 1.4,
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.title}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                    <span className={`source-badge ${sourceClass(a.source)}`}>{a.source}</span>
                    <span style={{ fontSize: 9, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>{timeAgo(a.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
      </div>
    </div>
  );
}

// ─── DESKTOP LAYOUT ───────────────────────────────────────────────────────────

function DesktopOverview() {
  const qc = useQueryClient();
  const { data: japan } = useJapan();
  const { data: macro } = useMacro();
  const { data: chart } = useNikkeiChart();
  const [activeX, setActiveX] = useState(X_ACCOUNTS[0].handle);

  const getJ = (s: string) => Array.isArray(japan) ? japan.find((q: any) => q.symbol === s) : null;
  const getM = (s: string) => Array.isArray(macro) ? macro.find((q: any) => q.symbol === s) : null;

  const kpis = [
    { label: "Nikkei 225", q: getJ("^N225"), accent: true, dec: 0 },
    { label: "USD / JPY",  q: getJ("USDJPY=X"), dec: 2 },
    { label: "EWJ ETF",    q: getJ("EWJ"), dec: 2 },
    { label: "S&P 500",    q: getM("^GSPC"), dec: 0 },
    { label: "VIX",        q: getM("^VIX"), dec: 2, invert: true },
    { label: "Gold",       q: getM("GC=F"), dec: 0 },
  ];

  const chartData = (chart?.timestamp ?? []).map((t: number, i: number) => ({
    date: new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: chart.close?.[i] ?? null,
  })).filter((d: any) => d.price != null);

  const isUp = (chartData.at(-1)?.price ?? 0) >= (chartData[0]?.price ?? 0);
  const color = isUp ? "#34c759" : "#ff453a";

  const { data: portfolio } = usePortfolioData();
  const holdings = Array.isArray(portfolio) ? portfolio : [];
  const total = holdings.reduce((s: number, h: any) => s + (h.value || 0), 0);
  const dayChg = holdings.reduce((s: number, h: any) => s + ((h.change || 0) * h.shares), 0);
  const dayChgPct = total > 0 ? (dayChg / (total - dayChg)) * 100 : 0;

  const { data: briefing, isLoading: bLoad } = useQuery({ queryKey: ["/api/briefing"], queryFn: () => apiRequest("GET", "/api/briefing"), staleTime: 300_000 });
  const refreshBriefing = useMutation({ mutationFn: () => apiRequest("GET", "/api/briefing?force=1"), onSuccess: (d) => qc.setQueryData(["/api/briefing"], d) });

  const { data: articles } = useQuery({ queryKey: ["/api/news"], queryFn: () => apiRequest("GET", "/api/news"), staleTime: 300_000 });
  const news = Array.isArray(articles) ? articles.filter((a: any) => a.importance === "high" || a.importance === "medium").slice(0, 6) : [];

  return (
    <div style={{ maxWidth: 1300 }}>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">Japan markets · portfolio · daily briefing</p>
      </div>

      {/* KPI row */}
      <div className="kpi-grid-6" style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {kpis.map(({ label, q, accent, dec, invert }: any) => {
          const price = q?.regularMarketPrice;
          const pct   = q?.regularMarketChangePercent;
          const isUp  = invert ? pct < 0 : pct > 0;
          const isDown = invert ? pct > 0 : pct < 0;
          return (
            <div key={label} className={`stat-card ${accent ? "accent" : ""}`}>
              <div className="stat-label">{label}</div>
              {price != null ? (
                <><div className="stat-value">{formatPrice(price, dec ?? 2)}</div>
                <div className={`stat-change ${isUp ? "up" : isDown ? "down" : "flat"}`}>
                  {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                </div></>
              ) : (
                <><div className="skeleton" style={{ height: 20, width: "65%", marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 12, width: "40%" }} /></>
              )}
            </div>
          );
        })}
      </div>

      {/* Main 2-col grid */}
      <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Chart */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Nikkei 225 · 1 Month</div>
              <div className={`tabular ${isUp ? "up" : "down"}`} style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
                {chartData.at(-1)?.price?.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} interval={Math.floor(chartData.length / 4)} />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))", borderRadius: 10, fontSize: 11, fontFamily: "var(--font-mono)" }}
                    formatter={(v: any) => [v?.toLocaleString(), "NKY"]} />
                  <Area type="monotoneX" dataKey="price" stroke={color} strokeWidth={2} fill="url(#deskGrad)" dot={false} activeDot={{ r: 5, fill: color, stroke: "hsl(var(--bg))", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="skeleton" style={{ height: 140, borderRadius: 8 }} />}
          </div>

          {/* Portfolio */}
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
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--surface2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "hsl(var(--fg-muted))", flexShrink: 0 }}>→</div>
            </Link>
          </div>

          {/* Briefing */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>AI Daily Briefing</div>
                {briefing?.generatedAt && <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>{timeAgo(new Date(briefing.generatedAt).toISOString())}{briefing.cached ? " · cached" : ""}</div>}
              </div>
              <button className="btn btn-ghost" onClick={() => refreshBriefing.mutate()} disabled={refreshBriefing.isPending} style={{ padding: "5px 12px", fontSize: 11 }}>
                {refreshBriefing.isPending ? "…" : "↻ Refresh"}
              </button>
            </div>
            {bLoad || refreshBriefing.isPending
              ? [90, 100, 85, 70].map((w, i) => <div key={i} className="skeleton" style={{ height: 13, width: `${w}%`, marginBottom: 8 }} />)
              : <div className="briefing-content" dangerouslySetInnerHTML={{ __html: simpleMarkdown(briefing?.content || "No briefing yet.") }} />}
          </div>

          {/* News */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Top Headlines</div>
              <Link href="/news"><span style={{ fontSize: 11, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", cursor: "pointer" }}>All news →</span></Link>
            </div>
            {news.length === 0 ? Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 14, marginBottom: 14 }} />) :
              news.map((a: any, i: number) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", textDecoration: "none", padding: "11px 0", borderBottom: i < news.length - 1 ? "1px solid hsl(var(--border-soft) / 0.5)" : "none" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {a.importance === "high" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 5 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "hsl(var(--fg))", lineHeight: 1.45, fontWeight: a.importance === "high" ? 600 : 400,
                        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.title}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <span className={`source-badge ${sourceClass(a.source)}`}>{a.source}</span>
                        <span style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>{timeAgo(a.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
          </div>
        </div>

        {/* X feed */}
        <div style={{ position: "sticky", top: 0 }}>
          <div className="card x-voices-panel" style={{ display: "flex", flexDirection: "column", height: 620, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px 0", borderBottom: "1px solid hsl(var(--border-soft))", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="section-label" style={{ marginBottom: 0 }}>Finance Voices · X</div>
                <a href={`https://x.com/${activeX}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>Open ↗</a>
              </div>
              <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", marginBottom: -1 }}>
                {X_ACCOUNTS.map(({ handle, name }) => (
                  <button key={handle} onClick={() => setActiveX(handle)} style={{
                    padding: "7px 12px", fontSize: 11, background: "transparent", border: "none",
                    borderBottom: activeX === handle ? "2px solid var(--red-hex)" : "2px solid transparent",
                    color: activeX === handle ? "hsl(var(--fg))" : "hsl(var(--fg-dim))",
                    fontWeight: activeX === handle ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap",
                    fontFamily: "var(--font-sans)", transition: "color 0.15s",
                  }}>{name}</button>
                ))}
              </div>
            </div>
            <iframe key={activeX} src={`https://nitter.net/${activeX}`}
              style={{ flex: 1, border: "none", width: "100%", minHeight: 0, colorScheme: "dark" }}
              title={`@${activeX}`} sandbox="allow-scripts allow-same-origin allow-popups" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page entry ───────────────────────────────────────────────────────────────
export default function Overview() {
  const isMobile = useIsMobile();
  return isMobile ? (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <div className="page-header" style={{ marginBottom: 14 }}>
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">Japan markets · portfolio · daily briefing</p>
      </div>
      <MobileOverview />
    </div>
  ) : <DesktopOverview />;
}
