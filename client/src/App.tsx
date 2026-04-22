import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Topbar from "@/components/Topbar";
import { DesktopSidebar, MobileBottomNav } from "@/components/Sidebar";
import Overview from "@/pages/Overview";
import Portfolio from "@/pages/Portfolio";
import JapanMarket from "@/pages/JapanMarket";
import NewsFeed from "@/pages/NewsFeed";
import StockDetail from "@/pages/StockDetail";
import XVoices from "@/pages/XVoices";
import Network  from "@/pages/Network";
import Projects from "@/pages/Projects";
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

// ─── Theme context ─────────────────────────────────────────────────────────────

type Theme = "ember" | "liquid";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeCtx>({
  theme: "ember",
  toggle: () => {},
});

export function useTheme() { return useContext(ThemeContext); }

// ─── Mobile hook ───────────────────────────────────────────────────────────────

function useIsMobile() {
  const mq = "(max-width: 767px), (pointer: coarse) and (max-width: 1024px)";
  const [mobile, setMobile] = useState(() => window.matchMedia(mq).matches);
  useEffect(() => {
    const media = window.matchMedia(mq);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  return mobile;
}

// ─── Command Palette ──────────────────────────────────────────────────────────

const NAV_PAGES = [
  { label: "Markets",   href: "/" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Japan Market", href: "/market" },
  { label: "News",      href: "/news" },
  { label: "Voices",    href: "/voices" },
  { label: "Network",   href: "/network" },
  { label: "Projects",  href: "/projects" },
];

const PORTFOLIO_TICKERS = [
  "ONDS", "MMS", "MUFG", "QXO", "TPL", "CRCL", "VOO", "VRT", "NVDA",
];

interface CmdItem {
  type: "page" | "stock" | "action";
  label: string;
  href?: string;
  action?: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (href: string) => void;
  onToggleTheme: () => void;
}

function CommandPalette({ onClose, onNavigate, onToggleTheme }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const allItems: CmdItem[] = [
    ...NAV_PAGES.map((p) => ({ type: "page" as const, label: p.label, href: p.href })),
    ...PORTFOLIO_TICKERS.map((t) => ({ type: "stock" as const, label: t, href: `/stock/${t}` })),
    { type: "action", label: "Toggle Theme (Ember / Liquid)", action: () => { onToggleTheme(); onClose(); } },
    { type: "action", label: "Clear Tasks", action: () => { try { localStorage.removeItem("torii-tasks"); } catch {} onClose(); } },
  ];

  const filtered = query.trim()
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  function handleItemClick(item: CmdItem) {
    if (item.href) {
      onNavigate(item.href);
      onClose();
    } else if (item.action) {
      item.action();
    }
  }

  const typeLabel: Record<string, string> = { page: "Page", stock: "Stock", action: "Action" };

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-box" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--fg-dim))" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, stocks, actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))", flexShrink: 0 }}>ESC</span>
        </div>
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty">No results for "{query}"</div>
          ) : (
            filtered.map((item, i) => (
              <button key={i} className="cmd-item" onClick={() => handleItemClick(item)}>
                <span className={`cmd-type cmd-type-${item.type === "page" ? "page" : item.type === "stock" ? "stock" : ""}`}>
                  {typeLabel[item.type]}
                </span>
                <span className="cmd-label">{item.label}</span>
                {item.href && (
                  <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)", color: "hsl(var(--fg-dim))" }}>
                    ↵
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const isMobile = useIsMobile();
  const { theme, toggle } = useTheme();
  const [, navigate] = useHashLocation();
  const [cmdOpen, setCmdOpen] = useState(false);

  const openCmd = useCallback(() => setCmdOpen(true), []);
  const closeCmd = useCallback(() => setCmdOpen(false), []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <Router hook={useHashLocation}>
      <div className={`app-shell ${isMobile ? "mobile" : ""} ${theme === "liquid" ? "liquid" : ""}`}>
        <Topbar />
        {!isMobile && <DesktopSidebar />}
        <div className="main-scroll">
          <Switch>
            <Route path="/" component={Overview} />
            <Route path="/portfolio" component={Portfolio} />
            <Route path="/market" component={JapanMarket} />
            <Route path="/news" component={NewsFeed} />
            <Route path="/voices" component={XVoices} />
            <Route path="/network" component={Networking} />
            <Route path="/projects" component={Projects} />
            <Route path="/stock/:symbol" component={StockDetail} />
            <Route component={NotFound} />
          </Switch>
        </div>
        {isMobile && <MobileBottomNav />}
      </div>

      {/* Command Palette */}
      {cmdOpen && (
        <CommandPalette
          onClose={closeCmd}
          onNavigate={(href) => navigate(href)}
          onToggleTheme={toggle}
        />
      )}

      {/* ⌘K hint button */}
      <button className="cmd-hint" onClick={openCmd}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>⌘K</span>
      </button>
    </Router>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("torii-theme");
      return saved === "liquid" ? "liquid" : "ember";
    } catch {
      return "ember";
    }
  });

  const toggle = () => {
    setTheme(prev => {
      const next = prev === "ember" ? "liquid" : "ember";
      try { localStorage.setItem("torii-theme", next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "liquid") {
      root.classList.add("liquid");
    } else {
      root.classList.remove("liquid");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppShell />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeContext.Provider>
  );
}

export default App;
