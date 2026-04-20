import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatPct, formatCompact, pctClass, sourceClass, timeAgo } from "@/lib/utils";
import { useState } from "react";
import { useParams } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, BarChart, Bar, Cell, ReferenceLine, ComposedChart,
} from "recharts";

const RANGES = [
  { label: "5D",  range: "5d",  interval: "1h" },
  { label: "1M",  range: "1mo", interval: "1d" },
  { label: "3M",  range: "3mo", interval: "1d" },
  { label: "6M",  range: "6mo", interval: "1d" },
  { label: "1Y",  range: "1y",  interval: "1d" },
];

function PriceChart({ symbol }: { symbol: string }) {
  const [active, setActive] = useState(RANGES[1]);
  const { data, isLoading } = useQuery({
    queryKey: ["/api/chart", symbol, active.range, active.interval],
    queryFn: () => apiRequest("GET", `/api/chart/${encodeURIComponent(symbol)}?range=${active.range}&interval=${active.interval}`),
    staleTime: active.range === "5d" ? 60_000 : 300_000,
  });

  const chartData = data ? (data.timestamp || []).map((t: number, i: number) => ({
    date: active.range === "5d"
      ? new Date(t * 1000).toLocaleTimeString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: data.close?.[i] || null,
    volume: data.volume?.[i] || null,
  })).filter((d: any) => d.price) : [];

  const isUp = chartData.length > 1 && (chartData.at(-1)?.price || 0) >= (chartData[0]?.price || 0);
  const color = isUp ? "#22c55e" : "#ef4444";
  const startPrice = chartData[0]?.price;
  const endPrice = chartData.at(-1)?.price;
  const rangePct = startPrice ? ((endPrice - startPrice) / startPrice * 100).toFixed(2) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setActive(r)} className={`filter-tab ${active.label === r.label ? "active" : ""}`}>
              {r.label}
            </button>
          ))}
        </div>
        {rangePct && (
          <span className={`tabular ${isUp ? "up" : "down"}`} style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
            {isUp ? "+" : ""}{rangePct}% this period
          </span>
        )}
      </div>
      {isLoading || chartData.length === 0 ? (
        <div className="skeleton" style={{ height: 180, borderRadius: 6 }} />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis yAxisId="price" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} domain={["auto","auto"]} width={72} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(2)}`} />
            <YAxis yAxisId="vol" orientation="right" hide />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }} formatter={(v: any, name: string) => [name === "volume" ? formatCompact(v) : `$${v?.toLocaleString(undefined, {maximumFractionDigits: 2})}`, name === "volume" ? "Volume" : "Price"]} />
            <Bar yAxisId="vol" dataKey="volume" fill={color} fillOpacity={0.12} />
            <Area yAxisId="price" type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill="url(#cg)" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Technical Signals Panel ────────────────────────────────────────────────────

function TechnicalsPanel({ data }: { data: any }) {
  const t = data?.technicals;
  if (!t) return null;

  const signalColor = (s: string) =>
    s === "Strong Buy" ? "#22c55e" :
    s === "Buy" ? "#4ade80" :
    s === "Strong Sell" ? "#ef4444" :
    s === "Sell" ? "#f87171" : "#d4a94c";

  const rsiColor = t.rsi >= 70 ? "#ef4444" : t.rsi <= 30 ? "#22c55e" : "hsl(var(--foreground))";

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 12 }}>TECHNICAL ANALYSIS</div>

      {/* Overall signal */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "12px 14px", background: "hsl(var(--secondary))", borderRadius: 8, border: "1px solid hsl(var(--border))" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))" }}>SIGNAL</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: signalColor(t.overallSignal), fontFamily: "var(--font-mono)" }}>{t.overallSignal}</div>
        <div style={{ marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))" }}>
          Score: <strong style={{ color: t.signalScore >= 0 ? "#22c55e" : "#ef4444" }}>{t.signalScore > 0 ? "+" : ""}{t.signalScore}</strong>/100
        </div>
      </div>

      {/* Indicators grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {/* RSI */}
        <div style={{ background: "hsl(var(--secondary))", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>RSI (14)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: rsiColor, fontFamily: "var(--font-mono)" }}>{t.rsi}</div>
          <div style={{ fontSize: 10, color: rsiColor, marginTop: 2 }}>{t.rsiLabel}</div>
          {/* RSI bar */}
          <div style={{ marginTop: 6, height: 3, background: "hsl(var(--border))", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${t.rsi}%`, height: "100%", background: rsiColor, borderRadius: 2 }} />
          </div>
        </div>

        {/* MACD */}
        <div style={{ background: "hsl(var(--secondary))", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>MACD</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.macdBullish ? "#22c55e" : "#ef4444", fontFamily: "var(--font-mono)" }}>
            {t.macdBullish ? "▲ Bullish" : "▼ Bearish"}
          </div>
          <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginTop: 2, fontFamily: "var(--font-mono)" }}>
            Hist: {t.macdHistogram > 0 ? "+" : ""}{t.macdHistogram?.toFixed(3)}
          </div>
        </div>

        {/* Trend */}
        <div style={{ background: "hsl(var(--secondary))", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>TREND</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.trend === "up" ? "#22c55e" : t.trend === "down" ? "#ef4444" : "#d4a94c", fontFamily: "var(--font-mono)" }}>
            {t.trend === "up" ? "▲ Uptrend" : t.trend === "down" ? "▼ Downtrend" : "→ Neutral"}
          </div>
          <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
            SMA20 vs SMA50
          </div>
        </div>

        {/* Bollinger Bands */}
        <div style={{ background: "hsl(var(--secondary))", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>BOLLINGER %B</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.bbPctB > 0.8 ? "#ef4444" : t.bbPctB < 0.2 ? "#22c55e" : "#d4a94c", fontFamily: "var(--font-mono)" }}>
            {(t.bbPctB * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
            {t.bbPctB > 0.8 ? "Near upper band" : t.bbPctB < 0.2 ? "Near lower band" : "Mid-range"}
          </div>
          <div style={{ marginTop: 6, height: 3, background: "hsl(var(--border))", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, t.bbPctB * 100)}%`, height: "100%", background: t.bbPctB > 0.8 ? "#ef4444" : t.bbPctB < 0.2 ? "#22c55e" : "#d4a94c", borderRadius: 2 }} />
          </div>
        </div>

        {/* SMA Levels */}
        <div style={{ background: "hsl(var(--secondary))", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>MOVING AVGS</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
            <div>SMA20: <strong>${t.sma20?.toFixed(2)}</strong></div>
            <div style={{ marginTop: 3 }}>SMA50: <strong>${t.sma50?.toFixed(2)}</strong></div>
          </div>
        </div>

        {/* Volatility */}
        <div style={{ background: "hsl(var(--secondary))", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>VOLATILITY</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
            {data.annualizedVol}% <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", fontWeight: 400 }}>hist</span>
          </div>
          <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2, fontFamily: "var(--font-mono)" }}>
            {data.conditionalVol}% cond. (EWMA)
          </div>
        </div>
      </div>

      {/* Key levels */}
      {data.keyLevels?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 8, letterSpacing: "0.08em" }}>KEY PRICE LEVELS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.keyLevels.map((lvl: any) => (
              <div key={lvl.label} style={{
                padding: "4px 10px",
                borderRadius: 5,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                background: lvl.type === "support" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${lvl.type === "support" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                color: lvl.type === "support" ? "#4ade80" : "#f87171",
              }}>
                {lvl.label}: ${lvl.price}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Outlook Section ────────────────────────────────────────────────────────────

function OutlookSection({ symbol }: { symbol: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/stock", symbol, "outlook"],
    queryFn: () => apiRequest("GET", `/api/stock/${encodeURIComponent(symbol)}/outlook`),
    staleTime: 10 * 60_000,
  });

  const [showDist, setShowDist] = useState(false);

  if (isLoading) return (
    <div>
      <div className="section-label" style={{ marginBottom: 10 }}>PRICE OUTLOOK · MONTE CARLO</div>
      <div className="skeleton" style={{ height: 160, borderRadius: 6 }} />
    </div>
  );
  if (!data) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="section-label">PRICE OUTLOOK · MONTE CARLO ({data.simulations?.toLocaleString()} PATHS)</div>
        <button
          onClick={() => setShowDist(v => !v)}
          style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))", padding: "3px 8px", borderRadius: 4, cursor: "pointer" }}
        >
          {showDist ? "Hide" : "Show"} Distribution
        </button>
      </div>

      {/* Sentiment badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "4px 10px", borderRadius: 5, background: "hsl(var(--secondary))", fontSize: 11, fontFamily: "var(--font-mono)" }}>
        <span style={{ color: "hsl(var(--muted-foreground))" }}>Market Sentiment:</span>
        <span style={{ color: data.sentimentScore >= 0.55 ? "#22c55e" : data.sentimentScore <= 0.45 ? "#ef4444" : "#d4a94c", fontWeight: 600 }}>{data.sentimentLabel}</span>
        <span style={{ color: "hsl(var(--muted-foreground))" }}>· Signal: <strong style={{ color: data.technicals?.overallSignal?.includes("Buy") ? "#22c55e" : data.technicals?.overallSignal?.includes("Sell") ? "#ef4444" : "#d4a94c" }}>{data.technicals?.overallSignal}</strong></span>
      </div>

      {/* Probability cone */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data.cone} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="co" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5b9bd5" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#5b9bd5" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="cm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5b9bd5" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#5b9bd5" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => v === 0 ? "Now" : `D${v}`} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} domain={["auto","auto"]} width={72} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(2)}`} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
            formatter={(v: any, name: string) => {
              const labels: Record<string, string> = { p95: "95th pct", p75: "75th pct", p50: "Median", p25: "25th pct", p5: "5th pct" };
              return [`$${v?.toLocaleString(undefined, {maximumFractionDigits: 2})}`, labels[name] || name];
            }}
          />
          <Area type="monotone" dataKey="p95" stroke="transparent" fill="url(#co)" />
          <Area type="monotone" dataKey="p5"  stroke="transparent" fill="white" fillOpacity={0} />
          <Area type="monotone" dataKey="p75" stroke="transparent" fill="url(#cm)" />
          <Area type="monotone" dataKey="p25" stroke="transparent" fill="white" fillOpacity={0} />
          <Line type="monotone" dataKey="p50" stroke="#d4a94c" strokeWidth={2} dot={false} />
          <ReferenceLine y={data.currentPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeWidth={1} label={{ value: "Current", fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Horizon cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
        {(data.horizons || []).map((h: any) => (
          <div key={h.label} style={{ background: "hsl(var(--secondary))", borderRadius: 6, padding: "10px 10px" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>{h.label.toUpperCase()}</div>
            <div style={{ height: 3, borderRadius: 2, background: "hsl(var(--border))", overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: `${h.probAbove}%`, height: "100%", background: h.probAbove >= 50 ? "#22c55e" : "#ef4444", borderRadius: 2 }} />
            </div>
            <div className={`tabular font-bold ${h.probAbove >= 50 ? "up" : "down"}`} style={{ fontSize: 14 }}>
              {h.probAbove}%↑
            </div>
            <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)", marginTop: 3 }}>
              Median: ${h.p50?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 10, marginTop: 2, fontFamily: "var(--font-mono)", color: h.expectedReturn >= 0 ? "#4ade80" : "#f87171" }}>
              Exp: {h.expectedReturn >= 0 ? "+" : ""}{h.expectedReturn}%
            </div>
          </div>
        ))}
      </div>

      {/* Return distribution histogram */}
      {showDist && data.distribution?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginBottom: 8 }}>1-MONTH RETURN DISTRIBUTION</div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data.distribution} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <XAxis dataKey="bucket" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={3} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                formatter={(v: any) => [`${v}%`, "Probability"]}
              />
              <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
                {(data.distribution || []).map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.from >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model notes */}
      {data.modelNotes?.length > 0 && (
        <div style={{ marginTop: 12, padding: "8px 12px", background: "hsl(var(--secondary))", borderRadius: 6, borderLeft: "2px solid hsl(var(--border))" }}>
          {data.modelNotes.map((note: string, i: number) => (
            <div key={i} style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", marginTop: i > 0 ? 3 : 0 }}>
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stock News ────────────────────────────────────────────────────────────────

function StockNews({ symbol }: { symbol: string }) {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["/api/stock", symbol, "news"],
    queryFn: () => apiRequest("GET", `/api/stock/${encodeURIComponent(symbol)}/news`),
    staleTime: 5 * 60_000,
  });

  const items = Array.isArray(articles) ? articles : [];
  const importanceDot = (imp: string) =>
    imp === "high" ? { color: "#ef4444", label: "HIGH" } :
    imp === "medium" ? { color: "#d4a94c", label: "MED" } :
    { color: "hsl(var(--muted-foreground))", label: "LOW" };

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 10 }}>NEWS — {symbol}</div>
      {isLoading
        ? Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 6, marginBottom: 8 }} />)
        : items.length === 0
          ? <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>No recent news found for {symbol}.</p>
          : items.map((a: any) => {
            const imp = importanceDot(a.importance || "low");
            return (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="article-card" style={{ marginBottom: 8, display: "block" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span className={`source-badge ${sourceClass(a.source)}`} style={{ flexShrink: 0, marginTop: 2 }}>{a.source}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", lineHeight: 1.45 }}>{a.title}</div>
                      <span style={{ flexShrink: 0, fontSize: 8, fontFamily: "var(--font-mono)", color: imp.color, fontWeight: 700, padding: "1px 5px", borderRadius: 3, border: `1px solid ${imp.color}40` }}>{imp.label}</span>
                    </div>
                    {a.summary && <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>{a.summary.slice(0, 150)}{a.summary.length > 150 ? "…" : ""}</div>}
                    <div style={{ marginTop: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))" }}>
                      {timeAgo(a.publishedAt)} · {a.source}
                    </div>
                  </div>
                </div>
              </a>
            );
          })
      }
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [activeTab, setActiveTab] = useState<"outlook" | "technicals" | "news">("outlook");

  const { data: portfolio } = useQuery({
    queryKey: ["/api/portfolio/quotes"],
    queryFn: () => apiRequest("GET", "/api/portfolio/quotes"),
    staleTime: 30_000,
  });

  const { data: outlook } = useQuery({
    queryKey: ["/api/stock", symbol, "outlook"],
    queryFn: () => apiRequest("GET", `/api/stock/${encodeURIComponent(symbol)}/outlook`),
    staleTime: 10 * 60_000,
  });

  const holding = Array.isArray(portfolio) ? portfolio.find((h: any) => h.ticker === symbol) : null;
  const price = holding?.price;
  const changePct = holding?.changePct;

  return (
    <div style={{ padding: 0 }}>
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="page-title">{symbol}</h1>
            {price != null && (
              <span className="tabular font-semibold" style={{ fontSize: 22 }}>${formatPrice(price)}</span>
            )}
            {changePct != null && (
              <span className={`tabular font-medium ${pctClass(changePct)}`} style={{ fontSize: 15 }}>
                {formatPct(changePct)}
              </span>
            )}
          </div>
          {holding?.shortName && (
            <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{holding.shortName}</div>
          )}
          {holding && (
            <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4, fontFamily: "var(--font-mono)" }}>
              {holding.shares} shares · Value: {holding.value != null ? `$${formatPrice(holding.value, 0)}` : "—"}
            </div>
          )}
        </div>
        <button
          onClick={() => window.history.back()}
          style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>

      {/* Stats row */}
      {holding && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 20 }}>
          {[
            { label: "DAY HIGH",   value: `$${formatPrice(holding.dayHigh)}` },
            { label: "DAY LOW",    value: `$${formatPrice(holding.dayLow)}` },
            { label: "52W HIGH",   value: `$${formatPrice(holding.week52High)}` },
            { label: "52W LOW",    value: `$${formatPrice(holding.week52Low)}` },
            { label: "VOLUME",     value: formatCompact(holding.volume) },
            { label: "PREV CLOSE", value: `$${formatPrice(holding.prevClose)}` },
          ].map(({ label, value }) => (
            <div key={label} className="kpi-card" style={{ padding: "10px 12px" }}>
              <div className="section-label" style={{ fontSize: 9, marginBottom: 3 }}>{label}</div>
              <div className="tabular font-semibold" style={{ fontSize: 14 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Price Chart */}
      <div className="kpi-card" style={{ marginBottom: 16 }}>
        <PriceChart symbol={symbol} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["outlook", "technicals", "news"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`filter-tab ${activeTab === tab ? "active" : ""}`} style={{ fontSize: 11, padding: "5px 14px" }}>
            {tab === "outlook" ? "Price Outlook" : tab === "technicals" ? "Technicals" : "News"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="kpi-card" style={{ marginBottom: 16 }}>
        {activeTab === "outlook" && <OutlookSection symbol={symbol} />}
        {activeTab === "technicals" && (outlook ? <TechnicalsPanel data={outlook} /> : <div className="skeleton" style={{ height: 200, borderRadius: 6 }} />)}
        {activeTab === "news" && <StockNews symbol={symbol} />}
      </div>
    </div>
    </div>
  );
}
