import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const NAV = [
  { href: "/",          label: "Overview",     icon: "▣" },
  { href: "/portfolio", label: "Portfolio",    icon: "◈" },
  { href: "/market",    label: "Japan",        icon: "⛩" },
  { href: "/news",      label: "News",         icon: "◉" },
];

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
                <span className="nav-icon">{icon}</span>
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
            <div className={`bottom-nav-item ${active ? "active" : ""}`}>
              <span className="bottom-nav-icon">{icon}</span>
              <span className="bottom-nav-label">{label}</span>
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
