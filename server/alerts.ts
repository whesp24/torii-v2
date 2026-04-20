// alerts.ts — monitors market data + news and fires push notifications
import { sendPushToAll } from "./push";
import { fetchQuotesAsync } from "./yahoo";
import { fetchAllNews } from "./news";
import { storage } from "./storage";

// ─── Thresholds ───────────────────────────────────────────────────────────────
const MARKET_THRESHOLD_PCT = 1.5;   // Nikkei / SPX move %
const VIX_SPIKE_THRESHOLD  = 25;    // VIX absolute level
const YEN_MOVE_PCT         = 0.8;   // USD/JPY move %
const PORTFOLIO_THRESHOLD_PCT = 3;  // individual holding move %

const MARKET_SYMBOLS = ["^N225", "USDJPY=X", "^GSPC", "^VIX"];

// ─── State (in-memory, resets on server restart) ─────────────────────────────
const seenNewsIds   = new Set<string>();
let   lastVix       = 0;
let   alertsBooted  = false;

// ─── Main monitor loop ────────────────────────────────────────────────────────
export async function runAlertCheck() {
  try {
    await Promise.all([checkMarkets(), checkPortfolio(), checkNews()]);
  } catch (e) {
    console.error("[alerts] check failed:", e);
  }
}

// ─── Market alerts ────────────────────────────────────────────────────────────
async function checkMarkets() {
  const quotes = await fetchQuotesAsync(MARKET_SYMBOLS);
  if (!quotes.length) return;

  for (const q of quotes) {
    const pct = q.regularMarketChangePercent;
    const sym = q.symbol;

    // Nikkei large move
    if (sym === "^N225" && Math.abs(pct) >= MARKET_THRESHOLD_PCT) {
      const dir  = pct > 0 ? "🟢 Rising" : "🔴 Falling";
      const sign = pct > 0 ? "+" : "";
      await sendPushToAll({
        title: `Nikkei 225 ${dir}`,
        body:  `${sign}${pct.toFixed(2)}% — ${q.regularMarketPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        url:   "/#/market",
        tag:   "alert-nikkei",
        urgency: Math.abs(pct) >= 3 ? "high" : "normal",
      });
    }

    // Yen sharp move
    if (sym === "USDJPY=X" && Math.abs(pct) >= YEN_MOVE_PCT) {
      const dir = pct > 0 ? "weakening ↑" : "strengthening ↓";
      await sendPushToAll({
        title: `Yen ${dir}`,
        body:  `USD/JPY ${q.regularMarketPrice.toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`,
        url:   "/#/market",
        tag:   "alert-yen",
        urgency: "normal",
      });
    }

    // S&P 500 large move
    if (sym === "^GSPC" && Math.abs(pct) >= MARKET_THRESHOLD_PCT) {
      const dir = pct > 0 ? "🟢" : "🔴";
      await sendPushToAll({
        title: `${dir} S&P 500 ${pct > 0 ? "surging" : "selling off"}`,
        body:  `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% — ${q.regularMarketPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        url:   "/#/",
        tag:   "alert-spx",
        urgency: Math.abs(pct) >= 2.5 ? "high" : "normal",
      });
    }

    // VIX spike
    if (sym === "^VIX" && q.regularMarketPrice >= VIX_SPIKE_THRESHOLD && lastVix < VIX_SPIKE_THRESHOLD) {
      await sendPushToAll({
        title: `⚠️ VIX Spiked to ${q.regularMarketPrice.toFixed(1)}`,
        body:  `Fear gauge above ${VIX_SPIKE_THRESHOLD} — elevated market volatility`,
        url:   "/#/",
        tag:   "alert-vix",
        urgency: "high",
      });
    }
    if (sym === "^VIX") lastVix = q.regularMarketPrice;
  }
}

// ─── Portfolio alerts ─────────────────────────────────────────────────────────
async function checkPortfolio() {
  const holdings = storage.getHoldings();
  if (!holdings.length) return;

  const tickers = holdings.map(h => h.ticker);
  const quotes  = await fetchQuotesAsync(tickers);

  for (const q of quotes) {
    const pct = q.regularMarketChangePercent;
    if (Math.abs(pct) >= PORTFOLIO_THRESHOLD_PCT) {
      const dir  = pct > 0 ? "🟢 Up" : "🔴 Down";
      const sign = pct > 0 ? "+" : "";
      await sendPushToAll({
        title: `${q.symbol} ${dir} ${sign}${pct.toFixed(1)}%`,
        body:  `$${q.regularMarketPrice.toFixed(2)} · ${sign}${q.regularMarketChange.toFixed(2)} today`,
        url:   `/#/stock/${q.symbol}`,
        tag:   `alert-holding-${q.symbol}`,
        urgency: Math.abs(pct) >= 5 ? "high" : "normal",
      });
    }
  }
}

// ─── News alerts ──────────────────────────────────────────────────────────────
async function checkNews() {
  const articles = await fetchAllNews();
  const highPrio = articles.filter((a: any) => a.importance === "high");

  for (const article of highPrio) {
    if (seenNewsIds.has(article.id)) continue;
    seenNewsIds.add(article.id);

    // Don't fire on boot (would spam old articles)
    if (!alertsBooted) continue;

    await sendPushToAll({
      title: `📰 ${article.source}`,
      body:  article.title,
      url:   article.url,
      tag:   `alert-news-${article.id}`,
      urgency: "normal",
    });
  }

  alertsBooted = true;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
let alertInterval: ReturnType<typeof setInterval> | null = null;

export function startAlertMonitor() {
  if (alertInterval) return;
  console.log("[alerts] monitor started — checking every 5 min");
  // First check after 30s (let server warm up)
  setTimeout(() => {
    runAlertCheck();
    alertInterval = setInterval(runAlertCheck, 5 * 60 * 1000);
  }, 30_000);
}
