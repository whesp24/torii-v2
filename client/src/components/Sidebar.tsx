import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV = [
  { href: "/",          label: "Markets",   icon: "markets"   },
  { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
  { href: "/market",   label: "Japan",     icon: "japan"    },
  { href: "/news",      label: "News",      icon: "news"     },
  { href: "/voices",   label: "Voices",    icon: "voices"   },
  { href: "/network",   label: "Network",   icon: "network"   },
  { href: "/projects",  label: "Projects",  icon: "projects"  },
];

const MOBILE_NAV = NAV.slice(0, 5); // Markets, Portfolio, Japan, News, Voices

// ─── Default tasks ────────────────────────────────────────────────────────────

interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: "high" | "low";
}

const DEFAULT_TASKS: Task[] = [
  { id: 1, text: "Review NVDA position — earnings in 3 days", done: false, priority: "high" },
  { id: 2, text: "USD/JPY approaching 160", done: false, priority: "high" },
  { id: 3, text: "Read BOJ policy meeting notes", done: false, priority: "low" },
];

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem("torii-tasks");
    if (!raw) return DEFAULT_TASKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TASKS;
  } catch {
    return DEFAULT_TASKS;
  }
}

function saveTasks(tasks: Task[]) {
  try { localStorage.setItem("torii-tasks", JSON.stringify(tasks)); } catch {}
}

// ─── Nav Icon ─────────────────────────────────────────────────────────────────

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
  if (id === "network") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5"/>
      <circle cx="4.5" cy="19" r="2"/>
      <circle cx="19.5" cy="19" r="2"/>
      <path d="M12 7.5v4l-5.5 5"/>
      <path d="M12 11.5l5.5 5"/>
    </svg>
  );
  if (id === "projects") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1.5"/>
      <rect x="14" y="3" width="7" height="11" rx="1.5"/>
      <path d="M14 18h7"/>
      <path d="M14 21h4"/>
    </svg>
  );
  return null;
}

// ─── Sidebar Tasks ────────────────────────────────────────────────────────────

function SidebarTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [open, setOpen] = useState(true);
  const [addText, setAddText] = useState("");

  useEffect(() => { saveTasks(tasks); }, [tasks]);

  const pendingCount = tasks.filter((t) => !t.done).length;

  function toggleTask(id: number) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function addTask(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !addText.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      text: addText.trim(),
      done: false,
      priority: "low",
    };
    setTasks((prev) => [...prev, newTask]);
    setAddText("");
  }

  return (
    <div className="sidebar-tasks">
      <div className="divider" style={{ margin: "8px 6px" }} />
      <button className="tasks-header" onClick={() => setOpen((o) => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--fg-dim))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(var(--fg-dim))" }}>
          Tasks
        </span>
        {pendingCount > 0 && (
          <span className="task-badge">{pendingCount}</span>
        )}
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="hsl(var(--fg-dim))" strokeWidth="2" strokeLinecap="round"
          style={{ marginLeft: 2, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "4px 2px" }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`sidebar-task-item ${task.done ? "done" : ""}`}
              onClick={() => toggleTask(task.id)}
              style={{ cursor: "pointer" }}
            >
              <div
                className={`task-check ${task.done ? "checked" : ""}`}
                style={{ width: 12, height: 12 }}
              >
                {task.done && (
                  <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={`sidebar-task-text ${task.priority === "high" && !task.done ? "urgent" : ""}`}>
                {task.text}
              </span>
            </div>
          ))}

          <input
            className="task-add-input"
            placeholder="+ add task..."
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={addTask}
          />
        </div>
      )}
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

export function DesktopSidebar() {
  const [loc] = useHashLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("torii-sidebar-collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("torii-sidebar-collapsed", String(collapsed)); } catch {}
    // Update CSS variable for sidebar width
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? "60px" : "220px");
  }, [collapsed]);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo + collapse */}
      <div className="sidebar-logo" style={{ justifyContent: "space-between" }}>
        {!collapsed && <ToriiLogo />}
        {!collapsed && (
          <span className="sidebar-logo-text">TORII</span>
        )}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ marginLeft: collapsed ? "auto" : undefined }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {collapsed
              ? <><polyline points="9 18 15 12 9 6"/></>
              : <><polyline points="15 18 9 12 15 6"/></>
            }
          </svg>
        </button>
      </div>

      {/* Nav */}
      <div style={{ padding: "12px 0 0" }}>
        {!collapsed && <div className="nav-section-label" style={{ marginBottom: 6 }}>Views</div>}
        {NAV.map(({ href, label, icon }) => {
          const active = loc === href || (href !== "/" && loc.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className={`nav-item ${active ? "active" : ""}`}
                title={collapsed ? label : undefined}
                style={collapsed ? { justifyContent: "center", padding: "8px 0" } : undefined}
              >
                <span className="nav-icon" style={{ display: "flex", alignItems: "center" }}>
                  <NavIcon id={icon} active={active} />
                </span>
                {!collapsed && <span className="nav-label">{label}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="divider" style={{ margin: "12px 0" }} />

      {/* Holdings */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!collapsed && (
          <div className="nav-section-label" style={{ padding: "0 18px", marginBottom: 6 }}>Holdings</div>
        )}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <HoldingsList collapsed={collapsed} />
        </div>
      </div>

      {/* Tasks (only when expanded) */}
      {!collapsed && <SidebarTasks />}

      {/* Footer */}
      {!collapsed && (
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
      )}
    </aside>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const [loc] = useHashLocation();

  return (
    <nav className="bottom-nav">
      {MOBILE_NAV.map(({ href, label, icon }) => {
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

export function HoldingsList({ collapsed = false }: { collapsed?: boolean }) {
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
              title={collapsed ? `${h.ticker} $${h.price?.toFixed(2)}` : undefined}
              style={collapsed
                ? { padding: "6px 0", justifyContent: "center", gap: 0 }
                : { padding: "8px 14px", justifyContent: "space-between", gap: 0, borderRadius: 8 }
              }
            >
              {collapsed ? (
                <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)", color: "hsl(var(--fg))", letterSpacing: "0.04em", textAlign: "center" }}>
                  {h.ticker}
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "hsl(var(--fg))", letterSpacing: "0.04em" }}>{h.ticker}</div>
                    <div style={{ fontSize: 10, color: "hsl(var(--fg-dim))", marginTop: 1 }}>{h.shares} sh</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {h.price != null ? (
                      <>
                        <div className="tabular" style={{ fontSize: 12, fontWeight: 600, color }}>${h.price.toFixed(2)}</div>
                        <div className="tabular" style={{ fontSize: 10, color }}>{pct >= 0 ? "+" : ""}{pct?.toFixed(2)}%</div>
                      </>
                    ) : (
                      <span className="skeleton" style={{ width: 44, height: 14, display: "block" }} />
                    )}
                  </div>
                </>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
