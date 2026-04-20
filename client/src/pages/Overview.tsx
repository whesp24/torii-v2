import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatPct, pctClass, simpleMarkdown, timeAgo, sourceClass } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Link } from "wouter";

// ─── X Accounts ──────────────────────────────────────────────────────────────

const X_ACCOUNTS = [
  { handle: "KevinLMak",       name: "Kevin Mak" },
  { handle: "ContrarianCurse", name: "SuspendedCap" },
  { handle: "dsundheim",       name: "Daniel Sundheim" },
  { handle: "jeff_weinstein",  name: "Jeff Weinstein" },
  { handle: "patrick_oshag",   name: "Patrick O'S" },
  { handle: "HannoLustig",     name: "Hanno Lustig" },
];

// ─── X Voices Feed ───────────────────────────────────────────────────────────

function XVoicesFeed() {
  const [active, setActive] = useState(X_ACCOUNTS[0].handle);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The Twitter embed widget is blocked by CSP on localhost.
  // Instead we open an iframe pointing to nitter.net (public Twitter mirror)
  // which works without login and renders actual tweets.
  const nitterUrl = `https://nitter.net/${active}`;

  return (
    <div className="kpi-card" style={{
      display: "flex", flexDirection: "column",
      height: 560, padding: 0, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px 0",
        borderBottom: "1px solid hsl(var(--border-soft))",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Finance Voices · X</div>
          <a
            href={`https://x.com/${active}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", textDecoration: "none", letterSpacing: "0.06em" }}
          >
            Open ↗
          </a>
        </div>

        {/* Account tabs */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none" }}>
          {X_ACCOUNTS.map(({ handle, name }) => (
            <button
              key={handle}
              onClick={() => setActive(handle)}
              style={{
                padding: "7px 13px",
                fontSize: 11,
                fontWeight: active === handle ? 600 : 400,
                color: active === handle ? "hsl(var(--fg))" : "hsl(var(--fg-muted))",
                background: "transparent",
                border: "none",
                borderBottom: active === handle ? "2px solid var(--red-hex)" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
                fontFamily: "var(--font-sans)",
                marginBottom: -1,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Iframe — nitter renders actual tweets, no login needed */}
      <iframe
        ref={iframeRef}
        key={active}
        src={nitterUrl}
        style={{
          flex: 1,
          border: "none",
          width: "100%",
          minHeight: 0,
          colorScheme: "dark",
        }}
        title={`@${active} on X`}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function JapanKPIs() {
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
    { label: "Nikkei 225", q: getJ("^N225"),    accent: true, decimals: 0 },
    { label: "USD / JPY",  q: getJ("USDJPY=X"), decimals: 3 },
    { label: "EWJ ETF",    q: getJ("EWJ") },
    { label: "S&P 500",    q: getM("^GSPC"),    decimals: 0 },
    { label: "VIX",        q: getM("^VIX"),     invertColor: true },
    { label: "Gold",       q: getM("GC=F"),     decimals: 0 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 }}>
      {kpis.map(({ label, q, accent, decimals, invertColor }: any) => {
        const pct = q?.regularMarketChangePercent;
        const isUp = pct > 0, isDown = pct < 0;
        const color = invertColor
          ? (isDown ? "var(--green-hex)" : isUp ? "#FF6B6B" : "hsl(var(--fg-muted))")
          : (isUp ? "var(--green-hex)" : isDown ? "#FF6B6B" : "hsl(var(--fg-muted))");

        return (
          <div key={label} className="kpi-card" style={{
            borderLeft: accent ? "2px solid var(--red-hex)" : undefined,
            padding: "14px 16px",
          }}>
            <div style={{
              fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))",
              letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8,
            }}>{label}</div>
            {q ? (
              <>
                <div className="tabular" style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "hsl(var(--fg))" }}>
                  {formatPrice(q.regularMarketPrice, decimals ?? (q.regularMarketPrice > 100 ? 2 : 4))}
                </div>
                <div className="tabular" style={{ fontSize: 11, marginTop: 3, color, fontWeight: 500 }}>
                  {formatPct(pct)}
                </div>
              </>
            ) : (
              <>
                <div className="skeleton" style={{ height: 22, width: "70%", borderRadius: 5, marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 13, width: "45%", borderRadius: 4 }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Nikkei Chart ─────────────────────────────────────────────────────────────

function NikkeiChart() {
  const { data } = useQuery({
    queryKey: ["/api/chart/N225", "1mo"],
    queryFn: () => apiRequest("GET", `/api/chart/%5EN225?range=1mo&interval=1d`),
    staleTime: 300_000,
  });

  if (!data?.timestamp?.length) {
    return <div className="skeleton" style={{ height: 100, borderRadius: 8 }} />;
  }

  const chartData = data.timestamp
    .map((t: number, i: number) => ({
      date: new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: data.close?.[i] ?? null,
    }))
    .filter((d: any) => d.price != null);

  const isUp = (chartData.at(-1)?.price ?? 0) >= (chartData[0]?.price ?? 0);
  const strokeColor = isUp ? "var(--green-hex)" : "#FF6B6B";

  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--surface))", border: "1px solid hsl(var(--border-soft))",
            borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
          formatter={(v: any) => [v?.toLocaleString(), "NKY"]}
          labelStyle={{ color: "hsl(var(--fg-muted))" }}
        />
        <Area type="monotone" dataKey="price" stroke={strokeColor} strokeWidth={1.5} fill="url(#chartGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
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
    <div className="kpi-card" style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 2 }}>AI Daily Briefing</div>
          {data?.generatedAt && (
            <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)" }}>
              {timeAgo(new Date(data.generatedAt).toISOString())}{data.cached ? " · cached" : ""}
            </div>
          )}
        </div>
        <button className="btn btn-secondary" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          {refresh.isPending ? "Generating…" : "↻ Refresh"}
        </button>
      </div>

      {isLoading || refresh.isPending ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[80, 100, 90, 70].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 13, width: `${w}%`, borderRadius: 4 }} />
          ))}
        </div>
      ) : (
        <div className="briefing-content" dangerouslySetInnerHTML={{ __html: simpleMarkdown(data?.content || "") }} />
      )}
    </div>
  );
}

// ─── Recent News ─────────────────────────────────────────────────────────────

const VOICE_SOURCES = new Set([
  "@Morgan Housel", "@Collab Fund", "@Josh Brown", "@Rational Walk",
  "@Damodaran", "@Barry Ritholtz", "Reddit Investing", "Reddit Stocks",
  "Reddit WSB", "Reddit Japan Finance", "Calculated Risk", "Abnormal Returns",
]);

function RecentNews() {
  const { data: articles } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => apiRequest("GET", "/api/news"),
    staleTime: 5 * 60 * 1000,
  });

  const items = Array.isArray(articles)
    ? articles.filter((a: any) => !VOICE_SOURCES.has(a.source)).slice(0, 5)
    : [];

  return (
    <div className="kpi-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Latest Headlines</div>
        <Link href="/news">
          <span style={{ fontSize: 11, color: "hsl(var(--fg-muted))", cursor: "pointer" }}>All news →</span>
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.length === 0
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 16, borderRadius: 4, marginBottom: 12 }} />
            ))
          : items.map((a: any, i: number) => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "block", textDecoration: "none", padding: "10px 0",
                  borderBottom: i < items.length - 1 ? "1px solid hsl(var(--border-soft))" : "none",
                }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span className={`source-badge ${sourceClass(a.source)}`} style={{ flexShrink: 0, marginTop: 1 }}>
                    {a.source}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "hsl(var(--fg))", lineHeight: 1.5, fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", marginTop: 3 }}>
                      {timeAgo(a.publishedAt)}
                    </div>
                  </div>
                </div>
              </a>
            ))
        }
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Overview() {
  return (
    <div style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">Japan markets · portfolio · daily briefing</p>
      </div>

      <JapanKPIs />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14, alignItems: "start" }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="kpi-card" style={{ padding: "16px 18px" }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Nikkei 225 · 1 Month</div>
            <NikkeiChart />
          </div>
          <BriefingPanel />
          <RecentNews />
        </div>

        {/* Right — X feed, sticky */}
        <div style={{ position: "sticky", top: 0 }}>
          <XVoicesFeed />
        </div>
      </div>
    </div>
  );
}
