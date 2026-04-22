// ──────────────────────────────────────────────────────────────────────────────
// Auto-tasks endpoint
//
// Wire up in server/index.ts:
//
//   import { registerAutoTasksRoute } from "./auto-tasks-route";
//   registerAutoTasksRoute(app);
//
// Replace the `buildSnapshot()` stub below with calls to your existing quote /
// FX / news services. Everything else just works.
// ──────────────────────────────────────────────────────────────────────────────

import type { Express } from "express";
import { syncAutoTasks, type MarketSnapshot } from "./auto-tasks";

// ─── TODO: replace with your real services ────────────────────────────────────
import { fetchQuotesAsync } from "./yahoo";
import { fetchAllNews }     from "./news";
import { storage }          from "./storage";

async function buildSnapshot(): Promise<MarketSnapshot> {
  const holdings = storage.getHoldings();
  const tickers  = [...new Set(holdings.map(h => h.ticker))];

  const portQuotes = await fetchQuotesAsync(tickers);
  const quotes = (portQuotes as any[]).map(q => ({
    ticker:    q.symbol,
    price:     q.regularMarketPrice ?? 0,
    changePct: q.regularMarketChangePercent ?? 0,
  }));

  const macro = await fetchQuotesAsync(["USDJPY=X", "^N225", "^VIX"]);
  const usdjpy = (macro as any[]).find(q => q.symbol === "USDJPY=X");
  const n225   = (macro as any[]).find(q => q.symbol === "^N225");
  const vix    = (macro as any[]).find(q => q.symbol === "^VIX");

  const fx      = usdjpy ? [{ pair: "USDJPY", rate: usdjpy.regularMarketPrice, changePct: usdjpy.regularMarketChangePercent }] : [];
  const indices = n225 ? [{
    symbol:     "N225",
    last:       n225.regularMarketPrice,
    pct52wHigh: n225.fiftyTwoWeekHigh ? n225.regularMarketPrice / n225.fiftyTwoWeekHigh : 0,
  }] : [];
  const vixSnap = vix
    ? { last: vix.regularMarketPrice, changePct: vix.regularMarketChangePercent }
    : { last: 0, changePct: 0 };

  const articles = await fetchAllNews();
  const news = articles.slice(0, 20).map(a => ({
    id:         a.id || a.url || a.title,
    headline:   a.title,
    importance: a.importance === "high" ? 9 : a.importance === "medium" ? 6 : 3,
  }));

  const earnings: { ticker: string; date: string }[] = [];
  return { quotes, fx, indices, vix: vixSnap, earnings, news };
}
// ──────────────────────────────────────────────────────────────────────────────

export function registerAutoTasksRoute(app: Express) {

  // Regenerates auto-tasks against a fresh snapshot and returns the full task list
  // (auto + manual) with [key] markers stripped.
  app.post("/api/tasks/sync-auto", async (_req, res) => {
    try {
      const snap  = await buildSnapshot();
      const tasks = syncAutoTasks(snap);
      res.json({ tasks, at: Date.now() });
    } catch (e: any) {
      console.error("[/api/tasks/sync-auto]", e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });
}
