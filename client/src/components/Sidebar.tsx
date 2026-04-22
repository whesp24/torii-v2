import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV = [
  { href: "/",          label: "Markets",  icon: "markets"   },
  { href: "/portfolio", label: "Portfolio",icon: "portfolio" },
  { href: "/market",    label: "Japan",    icon: "japan"     },
  { href: "/news",      label: "News",     icon: "news"      },
  { href: "/voices",    label: "Voices",   icon: "voices"    },
  { href: "/network",   label: "Network",  icon: "network"   },
  { href: "/projects",  label: "Projects", icon: "projects"  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function NavIcon({ id, active }: { id: string; active: boolean }) {
  const c = active ? "var(--red-hex)" : "hsl(var(--fg-dim))";
  const s = { width: 18, height: 18 };
  if (id === "markets")   return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
  if (id === "portfolio") return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
  if (id === "japan")     return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M5 6V4h14v2"/><path d="M8 6v12"/><path d="M16 6v12"/><path d="M3 18h18"/></svg>;
  if (id === "news")      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>;
  if (id === "voices")    return <svg {...s} viewBox="0 0 24 24" fill={active ? "var(--red-hex)" : "hsl(var(--fg-dim))"} stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
  if (id === "network")   return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2.5"/><circle cx="4.5" cy="19" r="2"/><circle cx="19.5" cy="19" r="2"/><path d="M12 7.5v4l-5.5 5M12 11.5l5.5 5"/></svg>;
  if (id === "projects")  return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="11" rx="1.5"/><path d="M14 18h7M14 21h4"/></svg>;
  return null;
}

// ─── Torii logo ───────────────────────────────────────────────────────────────

export function ToriiLogo() {
  return (
    <svg viewBox="0 0 28 28" width="20" height="20" fill="none">
      <rect x="3"    y="6"   width="22" height="2.5" rx="1.25" fill="var(--red-hex)" />
      <rect x="5"    y="8.5" width="18" height="1.5" rx="0.75" fill="var(--red-hex)" opacity="0.5" />
      <rect x="7.5"  y="10"  width="2"  height="13"  rx="1"    fill="var(--red-hex)" />
      <rect x="18.5" y="10"  width="2"  height="13"  rx="1"    fill="var(--red-hex)" />
      <rect x="7.5"  y="2"   width="2"  height="7"   rx="1"    fill="var(--red-hex)" />
      <rect x="18.5" y="2"   width="2"  height="7"   rx="1"    fill="var(--red-hex)" />
    </svg>
  );
}

// ─── Holdings list ────────────────────────────────────────────────────────────

export function HoldingsList() {
  const { data: portfolio } = useQuery({
    queryKey: ["/api/portfolio/quotes"],
    queryFn:  () => apiRequest("GET", "/api/portfolio/quotes"),
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
        const pct   = h.changePct;
        const isUp  = pct > 0;
        const isDown = pct < 0;
        const color = isUp ? "var(--green-hex)" : isDown ? "#FF6B6B" : "hsl(var(--fg-muted))";
        return (
          <Link key={h.id} href={`/stock/${h.ticker}`}>
            <div className="nav-item holding-row">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "hsl(var(--fg))", letterSpacing: "0.04em" }}>
                  {h.ticker}
                </div>
                <div style={{ fontSize: 9, color: "hsl(var(--fg-dim))", marginTop: 1 }}>{h.shares} sh</div>
              </div>
              <div style={{ textAlign: "right" }}>
                {h.price != null ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", color }}>${h.price.toFixed(2)}</div>
                    <div style={{ fontSize: 9,  fontWeight: 600, fontFamily: "var(--font-mono)", color }}>{pct >= 0 ? "+" : ""}{pct?.toFixed(2)}%</div>
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

// ─── Task list ────────────────────────────────────────────────────────────────

function TaskList() {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [open,  setOpen]  = useState(true);

  const { data: taskData } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn:  () => apiRequest("GET", "/api/tasks"),
    staleTime: 30000,
  });

  const addMut = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/tasks", { text, priority: "low" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  const tasks = Array.isArray(taskData) ? taskData : [];
  const todoCount = tasks.filter((t: any) => !t.done).length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) { addMut.mutate(input.trim()); setInput(""); }
  }

  return (
    <div className="sidebar-tasks">
      <button className="tasks-header" onClick={() => setOpen(o => !o)}>
        <div className="nav-section-label" style={{ margin: 0 }}>TASKS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          {todoCount > 0 && (
            <span style={{
              background: "var(--red-hex)", color: "#fff",
              fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700,
              padding: "1px 5px", borderRadius: 999,
            }}>{todoCount}</span>
          )}
          <span style={{ fontSize: 9, color: "hsl(var(--fg-dim))" }}>{open ? "▴" : "▾"}</span>
        </div>
      </button>

      {open && (
        <div className="tasks-list">
          {tasks.map((t: any) => (
            <div key={t.id} className={`task-item${t.done ? " done" : ""}`}>
              <button
                className={`task-check${t.done ? " checked" : ""}`}
                onClick={() => toggleMut.mutate({ id: t.id, done: !t.done })}
              >
                {t.done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </button>
              <span className={`task-text${t.priority === "high" ? " task-urgent" : ""}`}>{t.text}</span>
              {t.auto && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 8, color: "hsl(var(--fg-dim))",
                  background: "hsl(var(--surface2))", padding: "1px 4px", borderRadius: 3, flexShrink: 0,
                }}>auto</span>
              )}
              <button
                onClick={() => deleteMut.mutate(t.id)}
                style={{ background: "none", border: "none", color: "hsl(var(--fg-dim))", cursor: "pointer",
                  fontSize: 13, padding: "0 2px", flexShrink: 0, lineHeight: 1, marginLeft: 2 }}
              >×</button>
            </div>
          ))}
          <form onSubmit={handleAdd} className="task-add-form">
            <input
              className="task-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="+ Add task…"
            />
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function DesktopSidebar() {
  const [loc]       = useHashLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("torii-sidebar-collapsed") === "1"; } catch { return false; }
  });

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("torii-sidebar-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      {/* Brand row */}
      <div className="sidebar-logo">
        {!collapsed && (
          <>
            <ToriiLogo />
            <span className="sidebar-logo-text">TORII</span>
          </>
        )}
        <button className="collapse-btn" onClick={toggleCollapse} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          }
        </button>
      </div>

      {/* Nav */}
      <div style={{ padding: "10px 8px 4px" }}>
        {!collapsed && <div className="nav-section-label" style={{ marginBottom: 4 }}>VIEWS</div>}
        {NAV.map(({ href, label, icon }) => {
          const active = loc === href || (href !== "/" && loc.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div className={`nav-item${active ? " active" : ""}`} title={collapsed ? label : undefined}>
                <span className="nav-icon" style={{ display: "flex", alignItems: "center" }}>
                  <NavIcon id={icon} active={active} />
                </span>
                {!collapsed && <span>{label}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="divider" style={{ margin: "10px 0" }} />

      {/* Holdings */}
      {!collapsed && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="nav-section-label" style={{ padding: "0 16px", marginBottom: 6 }}>HOLDINGS</div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <HoldingsList />
          </div>
        </div>
      )}

      <div className="divider" style={{ margin: "8px 0" }} />

      {/* Tasks */}
      {!collapsed && <TaskList />}

      {/* Footer */}
      {!collapsed && (
        <div style={{
          padding: "10px 16px",
          borderTop: "1px solid hsl(var(--border-soft))",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 9, color: "hsl(var(--fg-dim))", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
            Yahoo Finance · real-time
            <br />Nikkei · NHK · Reuters
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const [loc] = useHashLocation();
  // Only show first 5 nav items on mobile
  const mobileNav = NAV.slice(0, 5);

  return (
    <nav className="bottom-nav">
      {mobileNav.map(({ href, label, icon }) => {
        const active = loc === href || (href !== "/" && loc.startsWith(href));
        return (
          <Link key={href} href={href}>
            <div className="bottom-nav-item">
              <div style={{
                width: 44, height: 30, borderRadius: 999,
                background: active ? "hsl(var(--surface))" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 2, transition: "background 0.2s",
              }}>
                <NavIcon id={icon} active={active} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                fontFamily: "var(--font-mono)", letterSpacing: "0.02em",
                color: active ? "var(--red-hex)" : "hsl(var(--fg-dim))",
                transition: "color 0.2s",
              }}>{label}</span>
              {active && (
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--red-hex)", marginTop: 2 }} />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default DesktopSidebar;
