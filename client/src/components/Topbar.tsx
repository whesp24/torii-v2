import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, formatPct, pctClass } from "@/lib/utils";
import { useState, useEffect } from "react";

const TOPBAR_SYMBOLS = [
  { sym: "^N225",    label: "NIKKEI",  src: "japan" },
  { sym: "USDJPY=X", label: "¥/USD",   src: "japan" },
  { sym: "EWJ",      label: "EWJ",     src: "japan" },
  { sym: "^GSPC",    label: "SPX",     src: "macro" },
  { sym: "^VIX",     label: "VIX",     src: "macro" },
  { sym: "GC=F",     label: "GOLD",    src: "macro" },
  { sym: "BTC-USD",  label: "BTC",     src: "macro" },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const jst = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" });
  const et  = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <div style={{ textAlign: "right" }}>
        <div className="tabular" style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--fg))", letterSpacing: "0.04em" }}>{jst}</div>
        <div style={{ fontSize: 9, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>JST</div>
      </div>
      <div style={{ width: 1, height: 24, background: "hsl(var(--border-soft))" }} />
      <div style={{ textAlign: "right" }}>
        <div className="tabular" style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--fg))", letterSpacing: "0.04em" }}>{et}</div>
        <div style={{ fontSize: 9, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>ET</div>
      </div>
    </div>
  );
}

export default function Topbar() {
  const { data: japan } = useQuery({ queryKey: ["/api/market/japan"], queryFn: () => apiRequest("GET", "/api/market/japan"), refetchInterval: 60000 });
  const { data: macro } = useQuery({ queryKey: ["/api/market/macro"], queryFn: () => apiRequest("GET", "/api/market/macro"), refetchInterval: 60000 });

  const getQ = (sym: string, src: "japan" | "macro") => {
    const arr = src === "japan" ? japan : macro;
    return Array.isArray(arr) ? arr.find((q: any) => q.symbol === sym) : null;
  };

  return (
    <header className="topbar">
      {/* Ticker pills — scrollable */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        overflowX: "auto", flex: 1,
        scrollbarWidth: "none",
      }}>
        {TOPBAR_SYMBOLS.map(({ sym, label, src }) => {
          const q = getQ(sym, src as "japan" | "macro");
          const pct = q?.regularMarketChangePercent;
          const isUp = pct > 0;
          const isDown = pct < 0;
          const color = isUp ? "var(--green-hex)" : isDown ? "#FF6B6B" : "hsl(var(--fg-muted))";

          return (
            <div key={sym} className="ticker-pill">
              <span style={{
                fontSize: 9, fontFamily: "var(--font-mono)",
                fontWeight: 600, color: "hsl(var(--fg-dim))",
                letterSpacing: "0.1em",
              }}>{label}</span>
              {q ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span className="tabular" style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--fg))" }}>
                    {sym === "USDJPY=X"
                      ? formatPrice(q.regularMarketPrice, 3)
                      : formatPrice(q.regularMarketPrice, q.regularMarketPrice > 100 ? 2 : 4)}
                  </span>
                  <span className="tabular" style={{ fontSize: 10, color }}>
                    {formatPct(pct)}
                  </span>
                </div>
              ) : (
                <span className="skeleton" style={{ width: 56, height: 13 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Right: live + clock */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, marginLeft: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="live-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, color: "hsl(var(--fg-dim))", letterSpacing: "0.1em" }}>LIVE</span>
        </div>
        <Clock />
      </div>
    </header>
  );
}
