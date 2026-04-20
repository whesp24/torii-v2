import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { ToriiLogo } from "./Sidebar";
import { useTheme } from "@/App";

function formatNum(n: number, dec = 2) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const TICKERS = [
  { sym: "^N225",   label: "NKY",     src: "japan",  dec: 0 },
  { sym: "USDJPY=X",label: "¥/$",     src: "japan",  dec: 2 },
  { sym: "^GSPC",   label: "SPX",     src: "macro",  dec: 0 },
  { sym: "^VIX",    label: "VIX",     src: "macro",  dec: 2, invert: true },
  { sym: "GC=F",    label: "GOLD",    src: "macro",  dec: 0 },
  { sym: "BTC-USD", label: "BTC",     src: "macro",  dec: 0 },
  { sym: "CL=F",    label: "OIL",     src: "macro",  dec: 2 },
  { sym: "^TNX",    label: "10Y",     src: "macro",  dec: 2 },
  { sym: "EWJ",     label: "EWJ",     src: "japan",  dec: 2 },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(t); }, []);

  const jst = time.toLocaleTimeString("en-US", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
  const et  = time.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="clock-stack">
      <div className="clock-time">{jst} <span style={{ color: "hsl(var(--fg-dim))", fontSize: 9 }}>JST</span></div>
      <div className="clock-label">{et} ET</div>
    </div>
  );
}


// ─── Push notification bell ───────────────────────────────────────────────────
function NotificationBell() {
  const [status, setStatus] = useState<"unknown"|"granted"|"denied"|"unsupported">("unknown");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported"); return;
    }
    setStatus(Notification.permission as any);
  }, []);

  async function subscribe() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }
      setStatus("granted");

      const reg = await navigator.serviceWorker.ready;
      // Get VAPID public key from server
      const res  = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      const sub  = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      // Send subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, subscription: sub.toJSON() }),
      });
      // Send a test ping
      await fetch("/api/push/test", { method: "POST" });
    } catch (e) {
      console.error("Push subscribe failed:", e);
    }
  }

  if (status === "unsupported") return null;
  if (status === "granted") {
    return (
      <div title="Alerts active" style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "hsl(var(--red-hsl) / 0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, cursor: "default", flexShrink: 0,
      }}>🔔</div>
    );
  }
  return (
    <button onClick={subscribe} title="Enable push alerts" style={{
      width: 28, height: 28, borderRadius: "50%",
      background: "hsl(var(--surface2))",
      border: "1px solid hsl(var(--border-soft))",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, cursor: "pointer", flexShrink: 0,
      color: "hsl(var(--fg-dim))",
    }}>🔕</button>
  );
}

// ─── Theme toggle ────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLiquid = theme === "liquid";

  return (
    <button
      onClick={toggle}
      title={isLiquid ? "Switch to Ember (dark)" : "Switch to Liquid (light)"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        border: isLiquid
          ? "1px solid rgba(0,0,0,0.12)"
          : "1px solid hsl(var(--border-soft))",
        background: isLiquid
          ? "rgba(255,255,255,0.85)"
          : "hsl(var(--surface))",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: isLiquid ? "#1D1D1F" : "hsl(var(--fg-muted))",
        flexShrink: 0,
        transition: "all 0.25s ease",
        boxShadow: isLiquid ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>
        {isLiquid ? "☀︎" : "⛩"}
      </span>
      <span className="theme-toggle-label">{isLiquid ? "LIQUID" : "EMBER"}</span>
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function Topbar() {
  const { data: japan } = useQuery({
    queryKey: ["/api/market/japan"],
    queryFn: () => apiRequest("GET", "/api/market/japan"),
    refetchInterval: 60000,
    staleTime: 55000,
  });
  const { data: macro } = useQuery({
    queryKey: ["/api/market/macro"],
    queryFn: () => apiRequest("GET", "/api/market/macro"),
    refetchInterval: 60000,
    staleTime: 55000,
  });

  const getQuote = (sym: string, src: string) => {
    const pool = src === "japan" ? japan : macro;
    return Array.isArray(pool) ? pool.find((q: any) => q.symbol === sym) : null;
  };

  return (
    <header className="topbar">
      {/* Logo — shown on mobile since sidebar is hidden */}
      <div className="topbar-logo">
        <ToriiLogo />
        <span className="topbar-logo-text">Torii</span>
      </div>

      {/* Ticker strip */}
      <div className="ticker-strip">
        {TICKERS.map(({ sym, label, src, dec, invert }) => {
          const q = getQuote(sym, src);
          const price = q?.regularMarketPrice;
          const pct   = q?.regularMarketChangePercent;
          const isUp  = invert ? pct < 0 : pct > 0;
          const isDown = invert ? pct > 0 : pct < 0;
          const chgClass = isUp ? "up" : isDown ? "down" : "";

          return (
            <div key={sym} className="ticker-chip">
              <span className="ticker-sym">{label}</span>
              {price != null ? (
                <>
                  <span className="ticker-price">{formatNum(price, dec)}</span>
                  <span className={`ticker-chg ${chgClass}`}>
                    {pct >= 0 ? "+" : ""}{pct?.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="skeleton" style={{ width: 44, height: 10, borderRadius: 4 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="topbar-right">
        <ThemeToggle />
        <NotificationBell />
        <Clock />
      </div>
    </header>
  );
}
