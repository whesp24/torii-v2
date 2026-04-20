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
import { useEffect, useState } from "react";

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

function AppShell() {
  const isMobile = useIsMobile();

  return (
    <Router hook={useHashLocation}>
      <div className={`app-shell ${isMobile ? "mobile" : ""}`}>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppShell />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
