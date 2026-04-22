import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { ToriiLogo } from "./Sidebar";
import { useTheme } from "@/App";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Quote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

// ─── Ticker config ────────────────────────────────────────────────────────────

const TICKERS = [
  { sym: "^N225",    label: "NKY",  src: "japan", dec: 0 },
  { sym: "USDJPY=X", label: "¥/$",  src: "japan", dec: 2 },
  { sym: "^GSPC",    label: "SPX",  src: "macro", dec: 0 },
  { sym: "^VIX",     label: "VIX",  src: "macro", dec: 2, invert: true },
  { sym: "GC=F",     label: "GOLD", src: "macro", dec: 0 },
  { sym: "BTC-USD",  label: "BTC",  src: "macro", dec: 0 },
  { sym: "CL=F",     label: "OIL",  src: "macro", dec: 2 },
  { sym: "^TNX",     label: "10Y",  src: "macro", dec: 2 },
  { sym: "EWJ",      label: "EWJ",  src: "japan", dec: 2 },
  { sym: "^TOPX",    label: "TOPX", src: "japan", dec: 0 },
  { sym: "^DJI",     label: "DJIA", src: "macro", dec: 0 },
];

function fmt(n: number, dec: number): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const jst = time.toLocaleTimeString("en-US", { timeZone: "Asia/Tokyo",       hour: "2-digit", minute: "2-digit", hour12: false });
  const et  = time.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <div className="clock-stack">
      <div className="clock-time">{jst} <span style={{ color: "hsl(var(--fg-dim))", fontSize: 9 }}>JST</span></div>
      <div className="clock-label">{et} ET</div>
    </div>
  );
}

// ─── Market session badges ────────────────────────────────────────────────────

function Sessions() {
  const now  = new Date();
  const jstH = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo"       })).getHours();
  const nyH  = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getHours();
  const lonH = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London"    })).getHours();

  const sessions = [
    { label: "TYO", open: jstH >= 9 && jstH < 15 },
    { label: "LON", open: lonH >= 8 && lonH < 16  },
    { label: "NYC", open: nyH  >= 9 && nyH  < 16  },
  ];

  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {sessions.map(s => (
        <span key={s.label} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 7px", borderRadius: 999,
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
          letterSpacing: "0.06em",
          background: s.open ? "rgba(34,197,94,0.08)" : "hsl(var(--surface))",
          color:      s.open ? "#22c55e"               : "hsl(var(--fg-dim))",
          border:     `1px solid ${s.open ? "rgba(34,197,94,0.25)" : "hsl(var(--border-soft))"}`,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "currentColor", display: "inline-block",
            animation: s.open ? "sessionPulse 1.8s ease-in-out infinite" : "none",
          }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ─── Notification bell ────────────────────────────────────────────────────────

function NotificationBell() {
  const [status, setStatus] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");

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
      const res = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, subscription: sub.toJSON() }),
      });
      await fetch("/api/push/test", { method: "POST" });
    } catch (e) {
      console.error("Push subscribe failed:", e);
    }
  }

  if (status === "unsupported") return null;

  return (
    <button
      onClick={status !== "granted" ? subscribe : undefined}
      title={status === "granted" ? "Alerts active" : "Enable push alerts"}
      className="topbar-icon-btn"
      style={{ color: status === "granted" ? "var(--red-hex)" : undefined }}
    >
      {status === "granted" ? "🔔" : "🔕"}
    </button>
  );
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLiquid = theme === "liquid";
  return (
    <button onClick={toggle} title={isLiquid ? "Switch to Ember" : "Switch to Liquid"}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 999,
        border: `1px solid ${isLiquid ? "rgba(0,0,0,0.12)" : "hsl(var(--border-soft))"}`,
        background: isLiquid ? "rgba(255,255,255,0.85)" : "hsl(var(--surface))",
        cursor: "pointer", fontSize: 11,
        fontFamily: "var(--font-mono)", fontWeight: 600,
        letterSpacing: "0.04em",
        color: isLiquid ? "#1D1D1F" : "hsl(var(--fg-muted))",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{isLiquid ? "☀︎" : "⛩"}</span>
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

// ─── Topbar ───────────────────────────────────────────────────────────────────

export default function Topbar() {
  const { data: japan } = useQuery<Quote[]>({
    queryKey: ["/api/market/japan"],
    queryFn:  () => apiRequest("GET", "/api/market/japan"),
    refetchInterval: 60000,
    staleTime: 55000,
  });
  const { data: macro } = useQuery<Quote[]>({
    queryKey: ["/api/market/macro"],
    queryFn:  () => apiRequest("GET", "/api/market/macro"),
    refetchInterval: 60000,
    staleTime: 55000,
  });

  const getQuote = (sym: string, src: string) => {
    const pool = src === "japan" ? japan : macro;
    return Array.isArray(pool) ? pool.find((q: Quote) => q.symbol === sym) : null;
  };

  // Build chip list — duplicate for seamless loop
  const chips = TICKERS.map(({ sym, label, src, dec, invert }) => {
    const q    = getQuote(sym, src);
    const pct  = q?.regularMarketChangePercent;
    const up   = invert ? (pct ?? 0) < 0 : (pct ?? 0) >= 0;
    return { label, price: q ? fmt(q.regularMarketPrice, dec) : null, pct, up };
  });

  return (
    <header className="topbar">
      {/* Logo */}
      <div className="topbar-logo">
        <ToriiLogo />
        <span className="topbar-logo-text">TORII</span>
      </div>

      {/* Animated ticker tape */}
      <div className="ticker-track">
        <div className="ticker-inner">
          {[...chips, ...chips].map((c, i) => (
            <span key={i} className="t-chip">
              <span className="t-sym">{c.label}</span>
              {c.price != null ? (
                <>
                  <span className="t-price">{c.price}</span>
                  <span className={`t-pct ${c.up ? "up" : "dn"}`}>
                    {c.pct != null ? `${c.pct >= 0 ? "+" : ""}${c.pct.toFixed(2)}%` : ""}
                  </span>
                </>
              ) : (
                <span className="skeleton" style={{ width: 44, height: 10, borderRadius: 4 }} />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div className="topbar-right">
        <Sessions />
        <ThemeToggle />
        <NotificationBell />
        <Clock />
      </div>
    </header>
  );
}
