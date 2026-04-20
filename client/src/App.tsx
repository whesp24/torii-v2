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
import { createContext, useContext, useEffect, useState } from "react";

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
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

// ─── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const isMobile = useIsMobile();
  const { theme } = useTheme();

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
            <Route path="/stock/:symbol" component={StockDetail} />
            <Route component={NotFound} />
          </Switch>
        </div>
        {isMobile && <MobileBottomNav />}
      </div>
    </Router>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

function App() {
  // Seed from localStorage — key stored as "torii-theme"
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

  // Apply class to document root so CSS variables work app-wide
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
