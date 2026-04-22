import { registerTaskRoutes }     from "./task-routes";
import { registerVoicesRoutes }   from "./voices-routes";
import { registerAutoTasksRoute } from "./auto-tasks-route";
import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { fetchQuotesAsync, fetchChartAsync, fetchSummaryAsync } from "./yahoo";
import { fetchAllNews, filterByTicker } from "./news";
import { computeOutlook } from "./outlook";
import { generateBriefing } from "./briefing";
import { insertHoldingSchema } from "@shared/schema";
import { getSentimentBatch } from "./sentiment";
import { registerTaskRoutes } from "./task-routes";

// ── Symbol lists ─────────────────────────────────────────────────────────────

const JAPAN_SYMBOLS = [
  "^N225", "^TOPX", "USDJPY=X", "JPYUSD=X",
  "EWJ", "DXJ", "SCJ", "DBJP",
  "MUFG", "TM", "HMC", "NTDOY", "SNE", "NTT",
];

const MACRO_SYMBOLS = [
  "^VIX", "GC=F", "CL=F", "^TNX", "^FVX",
  "^GSPC", "^DJI", "^IXIC", "BTC-USD",
];

// ── Async-aware cache ─────────────────────────────────────────────────────────
// Stores resolved data (or in-flight Promises to prevent stampedes).

interface CacheEntry { data: any; ts: number }
const cache: Map<string, CacheEntry> = new Map();
const inflight: Map<string, Promise<any>> = new Map();

async function cachedAsync(key: string, ttl: number, fn: () => Promise<any>, force = false): Promise<any> {
  if (!force) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < ttl) return entry.data;
    // Return in-flight promise if one exists (prevents duplicate fetches)
    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const promise = fn().then(data => {
    inflight.delete(key);
    if (data !== null && data !== undefined &&
        !(Array.isArray(data) && data.length === 0)) {
      cache.set(key, { data, ts: Date.now() });
    }
    return data;
  }).catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

export async function registerRoutes(httpServer: ReturnType<typeof createServer>, app: Express) {

  // ── Holdings ──────────────────────────────────────────────────────────────

  app.get("/api/holdings", (_req, res) => {
    res.json(storage.getHoldings());
  });

  app.post("/api/holdings", (req, res) => {
    const parsed = insertHoldingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.addHolding(parsed.data));
  });

  app.patch("/api/holdings/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateHolding(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/holdings/:id", (req, res) => {
    storage.deleteHolding(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ── Portfolio quotes ───────────────────────────────────────────────────────

  app.get("/api/portfolio/quotes", async (req, res) => {
    try {
      const force = req.query.refresh === "1";
      const holdings = storage.getHoldings();
      const tickers = [...new Set(holdings.map(h => h.ticker))];
      const quotes = await cachedAsync("portfolio-quotes", 60_000, () => fetchQuotesAsync(tickers), force);
      const result = holdings.map(h => {
        const q = (quotes as any[]).find((q: any) => q.symbol === h.ticker);
        return {
          ...h,
          price: q?.regularMarketPrice,
          change: q?.regularMarketChange,
          changePct: q?.regularMarketChangePercent,
          prevClose: q?.regularMarketPreviousClose,
          dayHigh: q?.regularMarketDayHigh,
          dayLow: q?.regularMarketDayLow,
          volume: q?.regularMarketVolume,
          week52High: q?.fiftyTwoWeekHigh,
          week52Low: q?.fiftyTwoWeekLow,
          shortName: q?.shortName || h.displayName || h.ticker,
          currency: q?.currency || "USD",
          value: q ? q.regularMarketPrice * h.shares : null,
        };
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Japan market ──────────────────────────────────────────────────────────

  app.get("/api/market/japan", async (_req, res) => {
    try {
      const quotes = await cachedAsync("japan", 60_000, () => fetchQuotesAsync(JAPAN_SYMBOLS));
      res.json(quotes);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/market/macro", async (_req, res) => {
    try {
      const quotes = await cachedAsync("macro", 60_000, () => fetchQuotesAsync(MACRO_SYMBOLS));
      res.json(quotes);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Chart ─────────────────────────────────────────────────────────────────

  app.get("/api/chart/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const range = (req.query.range as string) || "1mo";
      const interval = (req.query.interval as string) || "1d";
      const key = `chart-${symbol}-${range}-${interval}`;
      const ttl = range === "1d" ? 60_000 : 300_000;
      const data = await cachedAsync(key, ttl, () => fetchChartAsync(symbol, range, interval));
      if (!data) return res.status(404).json({ error: "No data" });
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Stock detail ──────────────────────────────────────────────────────────

  app.get("/api/stock/:symbol/summary", async (req, res) => {
    try {
      const data = await cachedAsync(`summary-${req.params.symbol}`, 300_000, () =>
        fetchSummaryAsync(req.params.symbol)
      );
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/stock/:symbol/news", async (req, res) => {
    const articles = await fetchAllNews();
    res.json(filterByTicker(articles, req.params.symbol));
  });

  app.get("/api/stock/:symbol/outlook", (req, res) => {
    const sims = parseInt((req.query.sims as string) || "2000");
    const result = computeOutlook(req.params.symbol, sims);
    if (!result) return res.status(404).json({ error: "Insufficient data" });
    res.json(result);
  });

  // ── News ──────────────────────────────────────────────────────────────────

  app.get("/api/news", async (req, res) => {
    const force = req.query.refresh === "1";
    const articles = await fetchAllNews(force);
    const { q, category, ticker, importance } = req.query as Record<string, string>;
    let filtered = articles;
    if (category && category !== "all") filtered = filtered.filter(a => a.category === category);
    if (ticker) filtered = filtered.filter(a => a.tags.includes(ticker.toUpperCase()));
    if (importance && importance !== "all") filtered = filtered.filter(a => a.importance === importance);
    if (q) {
      const ql = q.toLowerCase();
      filtered = filtered.filter(a => a.title.toLowerCase().includes(ql) || a.summary.toLowerCase().includes(ql));
    }
    res.json(filtered);
  });

  // ── AI Briefing ───────────────────────────────────────────────────────────

  app.get("/api/briefing", async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const force = req.query.force === "1";

    // Return cached briefing if fresh
    if (!force) {
      const existing = storage.getTodayBriefing();
      if (existing) return res.json({ content: existing.content, cached: true, generatedAt: existing.generatedAt });
    }

    // Gather data for the briefing
    try {
      const [japanQuotes, macroQuotes] = await Promise.all([
        cachedAsync("japan", 60_000, () => fetchQuotesAsync(JAPAN_SYMBOLS)),
        cachedAsync("macro", 60_000, () => fetchQuotesAsync(MACRO_SYMBOLS)),
      ]);
      const holdings = storage.getHoldings();
      const tickers = holdings.map(h => h.ticker);
      const portfolioQuotes = await cachedAsync("portfolio-quotes", 60_000, () => fetchQuotesAsync(tickers));
      const portfolioData = holdings.map(h => {
        const q = (portfolioQuotes as any[]).find((q: any) => q.symbol === h.ticker);
        return { ticker: h.ticker, price: q?.regularMarketPrice, changePct: q?.regularMarketChangePercent };
      });

      const articles = await fetchAllNews();
      const headlines = articles.slice(0, 10).map(a => a.title);

      const content = await generateBriefing(
        { japan: japanQuotes, macro: macroQuotes },
        portfolioData,
        headlines
      );

      storage.saveBriefing(today, content);
      res.json({ content, cached: false, generatedAt: Date.now() });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Cache clear ──────────────────────────────────────────────────────────

  app.post("/api/cache/clear", (_req, res) => {
    cache.clear();
    res.json({ ok: true, message: "Cache cleared" });
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  app.get("/api/settings", (_req, res) => {
    res.json({
      apiKey: storage.getSetting("openai_api_key") ? "set" : "unset",
      alertThreshold: storage.getSetting("alert_threshold") || "2",
    });
  });

  app.post("/api/settings", (req, res) => {
    const { openaiApiKey, alertThreshold } = req.body;
    if (openaiApiKey !== undefined) {
      storage.setSetting("openai_api_key", openaiApiKey);
      if (openaiApiKey) process.env.OPENAI_API_KEY = openaiApiKey;
    }
    if (alertThreshold !== undefined) storage.setSetting("alert_threshold", String(alertThreshold));
    res.json({ ok: true });
  });

  // ── Portfolio Sentiment ──────────────────────────────────────────────────

  app.get("/api/sentiment", async (_req, res) => {
    try {
      const holdings = storage.getHoldings();
      const tickers  = [...new Set(holdings.map(h => h.ticker))];
      const data = await cachedAsync("portfolio-sentiment", 30 * 60 * 1000, () => getSentimentBatch(tickers));
      res.json(data);
    } catch (e) {
      console.error("[sentiment]", e);
      res.json([]);
    }
  });

  // ── Per-ticker sentiment ──────────────────────────────────────────────────

  app.get("/api/sentiment/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const data = await cachedAsync(`sentiment-${ticker}`, 30 * 60 * 1000, () =>
        import("./sentiment").then(m => m.getSentiment(ticker))
      );
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });


  // ── Push Notifications ────────────────────────────────────────────────────

  app.get("/api/push/vapid-key", (_req, res) => {
    const { VAPID_PUBLIC } = require("./push");
    res.json({ publicKey: VAPID_PUBLIC });
  });

  app.post("/api/push/subscribe", (req, res) => {
    const { endpoint, subscription } = req.body;
    if (!endpoint || !subscription) return res.status(400).json({ error: "Missing fields" });
    storage.savePushSubscription(endpoint, subscription);
    res.json({ ok: true });
  });

  app.delete("/api/push/subscribe", (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) storage.removePushSubscription(endpoint);
    res.json({ ok: true });
  });

  // Manual test ping
  app.post("/api/push/test", async (_req, res) => {
    const { sendPushToAll } = await import("./push");
    await sendPushToAll({
      title: "🔔 Torii Alerts Active",
      body:  "You'll receive market, portfolio, and news alerts here.",
      url:   "/",
      tag:   "test-ping",
    });
    res.json({ ok: true });
  });

  // ── Voices (Nitter) + Auto-Tasks + Tasks ─────────────────────────────────
  registerTaskRoutes(app);
  registerVoicesRoutes(app);
  registerAutoTasksRoute(app);

  return httpServer;
}

// ── Push notification routes (added for PWA alerts) ──────────────────────────
// These are appended here; the main registerRoutes function above handles all other routes.
