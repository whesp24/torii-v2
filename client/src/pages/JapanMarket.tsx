import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatPct, formatCompact, pctClass } from "@/lib/utils";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/useMobile";

const SYMBOLS = [
  { sym: "^N225",    name: "Nikkei 225",              type: "INDEX",  currency: "JPY" },
  { sym: "^TOPX",    name: "TOPIX",                   type: "INDEX",  currency: "JPY" },
  { sym: "USDJPY=X", name: "USD / JPY",               type: "FX",     currency: "—" },
  { sym: "JPYUSD=X", name: "JPY / USD",               type: "FX",     currency: "—" },
  { sym: "EWJ",      name: "iShares MSCI Japan ETF",  type: "ETF",    currency: "USD" },
  { sym: "DXJ",      name: "WisdomTree Japan Hedged", type: "ETF",    currency: "USD" },
  { sym: "SCJ",      name: "iShares Japan Small Cap", type: "ETF",    currency: "USD" },
  { sym: "DBJP",     name: "Xtrackers Japan Hedged",  type: "ETF",    currency: "USD" },
  { sym: "MUFG",     name: "Mitsubishi UFJ",          type: "EQUITY", currency: "USD" },
  { sym: "TM",       name: "Toyota Motor",            type: "EQUITY", currency: "USD" },
  { sym: "HMC",      name: "Honda Motor",             type: "EQUITY", currency: "USD" },
  { sym: "NTDOY",    name: "Nintendo",                type: "EQUITY", currency: "USD" },
];

const TYPES = ["ALL", "INDEX", "FX", "ETF", "EQUITY"];

const RANGES = [
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "1Y", range: "1y",  interval: "1d" },
];

function MiniSparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (!data || data.length < 2) return <div style={{ width: 60, height: 24 }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = 24 - ((v - min) / range) * 22;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="60" height="24" style={{ flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── MOBILE LAYOUT ────────────────────────────────────────────────────────────

function MobileJapan() {
  const [filter, setFilter] = useState("ALL");
  const [selectedSym, setSelectedSym] = useState("^N225");
  const [activeRange, setActiveRange] = useState(RANGES[0]);

  const { data: quotes } = useQuery({
    queryKey: ["/api/market/japan"],
    queryFn: () => apiRequest("GET", "/api/market/japan"),
    refetchInterval: 60000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["/api/chart", selectedSym, activeRange.range],
    queryFn: () => apiRequest("GET", `/api/chart/${encodeURIComponent(selectedSym)}?range=${activeRange.range}&interval=${activeRange.interval}`),
    staleTime: 300_000,
  });

  const getQ = (sym: string) => Array.isArray(quotes) ? quotes.find((q: any) => q.symbol === sym) : null;
  const filtered = SYMBOLS.filter(s => filter === "ALL" || s.type === filter);

  const chart = chartData ? (chartData.timestamp || []).map((t: number, i: number) => ({
    date: new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: chartData.close?.[i] || null,
  })).filter((d: any) => d.price) : [];

  const selQ = getQ(selectedSym);
  const selInfo = SYMBOLS.find(s => s.sym === selectedSym);
  const isUp = (selQ?.regularMarketChangePercent ?? 0) >= 0;
  const accentColor = isUp ? "#34c759" : "#ff453a";

  function getSpark(sym: string): number[] {
    const q = getQ(sym);
    if (!q) return [];
    const prev = q.regularMarketPreviousClose || q.regularMarketPrice;
    const cur = q.regularMarketPrice;
    const step = (cur - prev) / 4;
    return [prev, prev + step, prev + step * 2, prev + step * 3, cur];
  }

  const TYPE_LABELS: Record<string, string> = { ALL: "All", INDEX: "Index", FX: "FX", ETF: "ETF", EQUITY: "Equity" };

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Page title */}
      <div style={{ padding: "0 0 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "hsl(var(--fg))", margin: 0 }}>Japan Market</h1>
        <p style={{ fontSize: 12, color: "hsl(var(--fg-dim))", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>
          Indices · FX · ETFs · Equities
        </p>
      </div>

      {/* ── Chart card ── */}
      <div style={{
        background: "hsl(var(--surface))",
        border: "1px solid hsl(var(--border-soft))",
        borderRadius: 18,
        padding: "16px 14px 12px",
        marginBottom: 12,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Red top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor, borderRadius: "18px 18px 0 0" }} />

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "hsl(var(--fg-dim))", textTransform: "uppercase", marginBottom: 4 }}>
              {selInfo?.name || selectedSym}
            </div>
            {selQ ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "hsl(var(--fg))" }}>
                  {formatPrice(selQ.regularMarketPrice, selQ.regularMarketPrice > 100 ? 2 : 4)}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  color: isUp ? "#34c759" : "#ff453a",
                  background: isUp ? "#34c75922" : "#ff453a22",
                  border: `1px solid ${isUp ? "#34c75944" : "#ff453a44"}`,
                  padding: "2px 7px", borderRadius: 999,
                }}>
                  {formatPct(selQ.regularMarketChangePercent)}
                </span>
              </div>
            ) : (
              <div className="skeleton" style={{ width: 140, height: 32, borderRadius: 6 }} />
            )}
          </div>
          {/* Range pills */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setActiveRange(r)}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                  padding: "4px 9px", borderRadius: 8, cursor: "pointer", border: "none",
                  background: activeRange.label === r.label ? "hsl(var(--accent))" : "transparent",
                  color: activeRange.label === r.label ? "hsl(var(--fg))" : "hsl(var(--fg-dim))",
                  transition: "all 0.15s",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {chartLoading || chart.length === 0 ? (
          <div className="skeleton" style={{ height: 140, borderRadius: 8 }} />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chart} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="jg-mobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--fg-dim))" }} tickLine={false} axisLine={false} minTickGap={50} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--fg-dim))" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={58} tickFormatter={v => v.toLocaleString()} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                formatter={(v: any) => [v?.toLocaleString(), "Price"]}
              />
              <Area type="monotone" dataKey="price" stroke={accentColor} strokeWidth={2} fill="url(#jg-mobile)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Symbol selector chips (horizontal scroll) ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "hsl(var(--fg-dim))", textTransform: "uppercase", marginBottom: 7 }}>
          Chart Symbol
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {SYMBOLS.map(s => {
            const q = getQ(s.sym);
            const pct = q?.regularMarketChangePercent ?? 0;
            const active = selectedSym === s.sym;
            return (
              <button
                key={s.sym}
                onClick={() => setSelectedSym(s.sym)}
                style={{
                  flexShrink: 0,
                  minWidth: 90,
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: active ? "1px solid #BC0024" : "1px solid hsl(var(--border-soft))",
                  background: active ? "hsl(350 100% 39% / 0.12)" : "hsl(var(--surface))",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: active ? "#e05070" : "hsl(var(--fg))", marginBottom: 2, letterSpacing: "0.04em" }}>
                  {s.sym.replace("=X", "").replace("^", "")}
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                  color: pct >= 0 ? "#34c759" : "#ff453a",
                }}>
                  {q ? formatPct(pct) : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter type pills ── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch", scrollbarWidth: "none", marginBottom: 12 }}>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer",
              background: filter === t ? "#BC0024" : "hsl(var(--surface))",
              color: filter === t ? "#fff" : "hsl(var(--fg-dim))",
              letterSpacing: "0.08em",
              transition: "all 0.15s",
            }}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Symbol cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(({ sym, name, type }) => {
          const q = getQ(sym);
          const pct = q?.regularMarketChangePercent ?? 0;
          const up = pct >= 0;
          const spark = getSpark(sym);
          const sparUp = (spark.at(-1) || 0) >= (spark[0] || 0);
          const active = selectedSym === sym;

          return (
            <button
              key={sym}
              onClick={() => setSelectedSym(sym)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 14px",
                borderRadius: 14,
                background: "hsl(var(--surface))",
                border: active ? "1px solid #BC0024" : "1px solid hsl(var(--border-soft))",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
              }}
            >
              {/* Left: symbol + name + type badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: active ? "#e05070" : "hsl(var(--fg))", letterSpacing: "0.04em" }}>
                    {sym.replace("=X", "").replace("^", "")}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "1px 5px", borderRadius: 4,
                    background: "hsl(var(--secondary))", color: "hsl(var(--fg-dim))",
                  }}>
                    {type}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "hsl(var(--fg-dim))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {name}
                </div>
              </div>

              {/* Sparkline */}
              <MiniSparkline data={spark} isUp={sparUp} />

              {/* Right: price + pct */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "hsl(var(--fg))", letterSpacing: "-0.01em" }}>
                  {q ? formatPrice(q.regularMarketPrice, q.regularMarketPrice > 100 ? 2 : 4) : "—"}
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  color: up ? "#34c759" : "#ff453a",
                }}>
                  {q ? formatPct(pct) : "—"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── DESKTOP LAYOUT ───────────────────────────────────────────────────────────

function DesktopJapan() {
  const [filter, setFilter] = useState("ALL");
  const [selectedSym, setSelectedSym] = useState("^N225");
  const [activeRange, setActiveRange] = useState(RANGES[0]);

  const { data: quotes } = useQuery({
    queryKey: ["/api/market/japan"],
    queryFn: () => apiRequest("GET", "/api/market/japan"),
    refetchInterval: 60000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["/api/chart", selectedSym, activeRange.range],
    queryFn: () => apiRequest("GET", `/api/chart/${encodeURIComponent(selectedSym)}?range=${activeRange.range}&interval=${activeRange.interval}`),
    staleTime: 300_000,
  });

  const getQ = (sym: string) => Array.isArray(quotes) ? quotes.find((q: any) => q.symbol === sym) : null;

  const filtered = SYMBOLS.filter(s => filter === "ALL" || s.type === filter);

  const chart = chartData ? (chartData.timestamp || []).map((t: number, i: number) => ({
    date: new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: chartData.close?.[i] || null,
  })).filter((d: any) => d.price) : [];

  const selQ = getQ(selectedSym);
  const isUp = selQ?.regularMarketChangePercent >= 0;

  function getSpark(sym: string): number[] {
    const q = getQ(sym);
    if (!q) return [];
    const prev = q.regularMarketPreviousClose || q.regularMarketPrice;
    const cur = q.regularMarketPrice;
    const step = (cur - prev) / 4;
    return [prev, prev + step, prev + step * 2, prev + step * 3, cur];
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Japan Market</h1>
        <p className="page-sub">Indices · FX · ETFs · Japan-linked equities</p>
      </div>

      {/* Chart panel */}
      <div className="kpi-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 2 }}>{SYMBOLS.find(s => s.sym === selectedSym)?.name || selectedSym}</div>
            {selQ && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span className="tabular font-bold" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
                  {formatPrice(selQ.regularMarketPrice, selQ.regularMarketPrice > 100 ? 2 : 4)}
                </span>
                <span className={`tabular font-medium ${pctClass(selQ.regularMarketChangePercent)}`} style={{ fontSize: 14 }}>
                  {formatPct(selQ.regularMarketChangePercent)}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setActiveRange(r)} className={`filter-tab ${activeRange.label === r.label ? "active" : ""}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {chartLoading || chart.length === 0 ? (
          <div className="skeleton" style={{ height: 180, borderRadius: 6 }} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="jg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} domain={["auto","auto"]} width={60} tickFormatter={v => v.toLocaleString()} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }} formatter={(v: any) => [v?.toLocaleString(), "Price"]} />
              <Area type="monotone" dataKey="price" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1.5} fill="url(#jg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`filter-tab ${filter === t ? "active" : ""}`}>{t}</button>
        ))}
      </div>

      {/* Table */}
      <div className="kpi-card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>NAME</th>
                <th>TYPE</th>
                <th style={{ textAlign: "right" }}>PRICE</th>
                <th style={{ textAlign: "right" }}>CHANGE</th>
                <th style={{ textAlign: "right" }}>% CHG</th>
                <th style={{ textAlign: "right" }}>52W RANGE</th>
                <th style={{ textAlign: "right" }}>TREND</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ sym, name, type }) => {
                const q = getQ(sym);
                const pct = q?.regularMarketChangePercent;
                const spark = getSpark(sym);
                const sparUp = (spark.at(-1) || 0) >= (spark[0] || 0);
                return (
                  <tr key={sym} onClick={() => setSelectedSym(sym)} style={{ background: selectedSym === sym ? "hsl(var(--accent))" : undefined }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {selectedSym === sym && <div style={{ width: 3, height: 16, background: "#BC0024", borderRadius: 2 }} />}
                        <span className="tabular font-semibold" style={{ fontSize: 13 }}>{sym}</span>
                      </div>
                    </td>
                    <td style={{ color: "hsl(var(--muted-foreground))" }}>{name}</td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>{type}</span>
                    </td>
                    <td className="tabular" style={{ textAlign: "right" }}>
                      {q ? formatPrice(q.regularMarketPrice, q.regularMarketPrice > 100 ? 2 : 4) : "—"}
                    </td>
                    <td className={`tabular ${pctClass(pct)}`} style={{ textAlign: "right" }}>
                      {q ? (q.regularMarketChange >= 0 ? "+" : "") + formatPrice(q.regularMarketChange) : "—"}
                    </td>
                    <td className={`tabular font-medium ${pctClass(pct)}`} style={{ textAlign: "right" }}>
                      {q ? formatPct(pct) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {q && q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <span className="tabular" style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>{q.fiftyTwoWeekLow?.toFixed(0)}</span>
                          <div style={{ width: 50, height: 4, borderRadius: 2, background: "hsl(var(--border))", overflow: "hidden", position: "relative" }}>
                            {q.regularMarketPrice && (
                              <div style={{
                                position: "absolute",
                                left: `${Math.max(0, Math.min(100, ((q.regularMarketPrice - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100))}%`,
                                top: 0, bottom: 0, width: 4, background: "#BC0024", borderRadius: 2, transform: "translateX(-2px)"
                              }} />
                            )}
                          </div>
                          <span className="tabular" style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>{q.fiftyTwoWeekHigh?.toFixed(0)}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <MiniSparkline data={spark} isUp={sparUp} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export default function JapanMarket() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileJapan /> : <DesktopJapan />;
}
