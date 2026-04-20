import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const NAV = [
  { href: "/",          label: "Markets",   icon: "markets"   },
  { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
  { href: "/market",   label: "Japan",     icon: "japan"    },
  { href: "/news",      label: "News",      icon: "news"     },
  { href: "/voices",   label: "Voices",    icon: "voices"   },
];

function NavIcon({ id, active }: { id: string; active: boolean }) {
  const color = active ? "#BC0024" : "hsl(var(--fg-dim))";
  const s = { width: 22, height: 22 };
  if (id === "markets") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
  if (id === "portfolio") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
  if (id === "japan") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M5 6V4h14v2" />
      <path d="M8 6v12" />
      <path d="M16 6v12" />
      <path d="M3 18h18" />
    </svg>
  );
  if (id === "news") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
  if (id === "voices") return (
    <svg {...s} viewBox="0 0 24 24" fill={active ? "#BC0024" : "hsl(var(--fg-dim))"} stroke="none">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
  return null;
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

export function DesktopSidebar() {
  const [loc] = useHashLocation();

  return (
    <aside className="sidebar">
      {/* Nav */}
      <div style={{ padding: "12px 0 0" }}>
        <div className="nav-section-label" style={{ marginBottom: 6 }}>Views</div>
        {NAV.map(({ href, label, icon }) => {
          const active = loc === href || (href !== "/" && loc.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div className={`nav-item ${active ? "active" : ""}`}>
                <span className="nav-icon" style={{ display: "flex", alignItems: "center" }}>
                  <NavIcon id={icon} active={active} />
                </span>
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="divider" style={{ margin: "12px 0" }} />

      {/* Holdings */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="nav-section-label" style={{ padding: "0 18px", marginBottom: 6 }}>Holdings</div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <HoldingsList />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 18px",
        borderTop: "1px solid hsl(var(--border-soft))",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
          <div>Yahoo Finance · real-time</div>
          <div>Nikkei · NHK · Reuters</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const [loc] = useHashLocation();

  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, label, icon }) => {
        const active = loc === href || (href !== "/" && loc.startsWith(href));
        return (
          <Link key={href} href={href}>
            <div className="bottom-nav-item">
              {/* Active pill background behind icon */}
              <div style={{
                width: 44, height: 30,
                borderRadius: 999,
                background: active ? "hsl(var(--surface))" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 2,
                transition: "background 0.2s",
              }}>
                <NavIcon id={icon} active={active} />
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.02em",
                color: active ? "#BC0024" : "hsl(var(--fg-dim))",
                transition: "color 0.2s",
              }}>{label}</span>
              {/* Active dot */}
              {active && (
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: "#BC0024",
                  marginTop: 2,
                }} />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Default export (desktop) ─────────────────────────────────────────────────

export default DesktopSidebar;

// ─── Shared components ────────────────────────────────────────────────────────

export function ToriiLogo() {
  return (
    <svg viewBox="0 0 28 28" width="20" height="20" fill="none">
      <rect x="3" y="6" width="22" height="2.5" rx="1.25" fill="var(--red-hex)"/>
      <rect x="5" y="8.5" width="18" height="1.5" rx="0.75" fill="var(--red-hex)" opacity="0.5"/>
      <rect x="7.5" y="10" width="2" height="13" rx="1" fill="var(--red-hex)"/>
      <rect x="18.5" y="10" width="2" height="13" rx="1" fill="var(--red-hex)"/>
      <rect x="7.5" y="2" width="2" height="7" rx="1" fill="var(--red-hex)"/>
      <rect x="18.5" y="2" width="2" height="7" rx="1" fill="var(--red-hex)"/>
    </svg>
  );
}

export function HoldingsList() {
  const { data: portfolio } = useQuery({
    queryKey: ["/api/portfolio/quotes"],
    queryFn: () => apiRequest("GET", "/api/portfolio/quotes"),
    refetchInterval: 60000,
  });

  if (!Array.isArray(portfolio)) {
    return (
      <div style={{ padding: "0 8px" }}>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8, margin: "3px 0" }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {portfolio.map((h: any) => {
        const pct = h.changePct;
        const isUp = pct > 0;
        const isDown = pct < 0;
        const color = isUp ? "var(--green-hex)" : isDown ? "#FF6B6B" : "hsl(var(--fg-muted))";

        return (
          <Link key={h.id} href={`/stock/${h.ticker}`}>
            <div
              className="nav-item"
              style={{ padding: "8px 14px", justifyContent: "space-between", gap: 0, borderRadius: 8 }}
            >
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  color: "hsl(var(--fg))",
                  letterSpacing: "0.04em",
                }}>{h.ticker}</div>
                <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", marginTop: 1 }}>
                  {h.shares} sh
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {h.price != null ? (
                  <>
                    <div className="tabular" style={{ fontSize: 12, fontWeight: 600, color }}>
                      ${h.price.toFixed(2)}
                    </div>
                    <div className="tabular" style={{ fontSize: 10, color }}>
                      {pct >= 0 ? "+" : ""}{pct?.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <span className="skeleton" style={{ width: 44, height: 14, display: "block" }} />
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
