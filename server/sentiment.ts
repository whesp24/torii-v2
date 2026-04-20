// sentiment.ts — per-stock sentiment scoring
// Combines: news headline analysis + Yahoo analyst recommendations
// Returns score 0-100 (0=bearish, 50=neutral, 100=bullish) + label

import { fetchAllNews } from "./news";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SentimentResult {
  ticker: string;
  score: number;          // 0-100
  label: "BEARISH" | "NEUTRAL" | "BULLISH";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  newsScore: number;      // 0-100 from news
  analystScore: number;   // 0-100 from analyst rec
  signalCount: number;    // number of news signals found
}

// ─── Keyword dictionaries ─────────────────────────────────────────────────────

const BULLISH_WORDS = [
  "beat", "beats", "exceeds", "surges", "jumps", "soars", "rallies", "gains",
  "upgrade", "upgraded", "outperform", "buy", "strong buy", "overweight",
  "record", "growth", "expansion", "profit", "revenue beat", "positive",
  "momentum", "breakout", "high", "bullish", "optimistic", "recovery",
  "rebound", "upside", "opportunity", "partnership", "deal", "contract",
  "innovative", "launch", "milestone", "approved", "approval",
];

const BEARISH_WORDS = [
  "miss", "misses", "falls", "drops", "plunges", "tumbles", "slumps",
  "downgrade", "downgraded", "underperform", "sell", "strong sell", "underweight",
  "loss", "decline", "cuts", "layoffs", "bankruptcy", "debt", "concerns",
  "bearish", "pessimistic", "risk", "warning", "investigation", "lawsuit",
  "recall", "scandal", "fraud", "miss", "shortfall", "guidance cut",
];

// ─── News sentiment scorer ────────────────────────────────────────────────────

function scoreHeadline(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  let hits = 0;

  for (const w of BULLISH_WORDS) {
    if (lower.includes(w)) { score += 1; hits++; }
  }
  for (const w of BEARISH_WORDS) {
    if (lower.includes(w)) { score -= 1; hits++; }
  }

  if (hits === 0) return 50; // neutral
  // Normalize to 0-100
  const normalized = 50 + (score / Math.max(hits, 1)) * 50;
  return Math.max(0, Math.min(100, normalized));
}

function tickerMentioned(text: string, ticker: string): boolean {
  const t = ticker.replace(/[^A-Z]/g, ""); // strip ^, =X etc
  const lower = text.toLowerCase();
  const tl = t.toLowerCase();

  // Common name mappings
  const aliases: Record<string, string[]> = {
    NVDA: ["nvidia", "nvda"],
    AMD:  ["amd", "advanced micro"],
    GOOGL:["google", "alphabet", "googl"],
    MUFG: ["mufg", "mitsubishi ufj", "bank of tokyo"],
    VOO:  ["vanguard", "voo", "s&p 500 etf"],
    VRT:  ["vertiv", "vrt"],
    TPL:  ["texas pacific", "tpl"],
    ONDS: ["onds", "ondas"],
    MMS:  ["maximus", "mms"],
    QXO:  ["qxo"],
    CRCL: ["crcl", "circle"],
  };

  const terms = aliases[t] || [tl];
  return terms.some(term => lower.includes(term));
}

async function getNewsScore(ticker: string): Promise<{ score: number; count: number }> {
  try {
    const articles = await fetchAllNews();
    const relevant = articles.filter(a =>
      tickerMentioned((a.title || "") + " " + (a.description || ""), ticker)
    );

    if (relevant.length === 0) return { score: 50, count: 0 };

    const scores = relevant.map(a => scoreHeadline((a.title || "") + " " + (a.description || "")));
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return { score: avg, count: relevant.length };
  } catch {
    return { score: 50, count: 0 };
  }
}

// ─── Yahoo analyst score ──────────────────────────────────────────────────────

async function getAnalystScore(ticker: string): Promise<number> {
  // Recommendation mapping: Strong Buy=90, Buy=72, Hold=50, Underperform=28, Sell=10
  const ANALYST_MAP: Record<string, number> = {
    "strongBuy": 90, "buy": 72, "hold": 50,
    "underperform": 28, "sell": 10,
  };

  // Known analyst consensus for portfolio holdings (fallback/seed values from Yahoo as of April 2026)
  const STATIC_CONSENSUS: Record<string, number> = {
    NVDA: 85,   // Strong Buy consensus
    AMD:  70,   // Buy
    GOOGL:78,   // Buy
    MUFG: 62,   // Hold/Buy
    VOO:  75,   // implicit Buy (index ETF)
    VRT:  80,   // Buy
    TPL:  72,   // Buy
    ONDS: 55,   // neutral/speculative
    MMS:  60,   // Hold
    QXO:  52,   // Hold
    CRCL: 50,   // insufficient coverage
  };

  try {
    const clean = ticker.replace(/[^A-Z]/g, "");
    
    // Try Yahoo quoteSummary for recommendationKey
    const res = await fetch(
      `https://query2.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=financialData`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const json = await res.json();
      const fd = json?.quoteSummary?.result?.[0]?.financialData;
      const rec = fd?.recommendationKey;
      if (rec && ANALYST_MAP[rec] !== undefined) {
        return ANALYST_MAP[rec];
      }
    }
  } catch { /* fall through */ }

  // Static fallback
  const clean = ticker.replace(/[^A-Z]/g, "");
  return STATIC_CONSENSUS[clean] ?? 50;
}

// ─── Combined scorer ──────────────────────────────────────────────────────────

export async function getSentiment(ticker: string): Promise<SentimentResult> {
  const [{ score: newsScore, count }, analystScore] = await Promise.all([
    getNewsScore(ticker),
    getAnalystScore(ticker),
  ]);

  // Weight: 40% news, 60% analyst (news is noisier)
  const newsWeight     = count > 0 ? 0.4 : 0;
  const analystWeight  = 1 - newsWeight;
  const blended        = newsScore * newsWeight + analystScore * analystWeight;
  const score          = Math.round(blended);

  const label: SentimentResult["label"] =
    score >= 65 ? "BULLISH" : score >= 40 ? "NEUTRAL" : "BEARISH";

  const confidence: SentimentResult["confidence"] =
    count >= 3 ? "HIGH" : count >= 1 ? "MEDIUM" : "LOW";

  return { ticker, score, label, confidence, newsScore: Math.round(newsScore), analystScore, signalCount: count };
}

export async function getSentimentBatch(tickers: string[]): Promise<SentimentResult[]> {
  const results = await Promise.allSettled(tickers.map(getSentiment));
  return results
    .filter(r => r.status === "fulfilled")
    .map(r => (r as PromiseFulfilledResult<SentimentResult>).value);
}
